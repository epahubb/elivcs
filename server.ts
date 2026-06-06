import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import * as Sentry from '@sentry/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient, Prisma } from '@prisma/client';
import PDFDocument from 'pdfkit';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import QRCode from 'qrcode';

import { rateLimit } from 'express-rate-limit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Global Error Handlers ---
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL ERROR] Uncaught Exception:', err);
});

process.on('SIGTERM', () => {
  console.log('[SERVER] SIGTERM received. Precision shutdown.');
  process.exit(0);
});

// --- Database Initialization ---
let prismaInstance: PrismaClient | null = null;

/**
 * Robust Prisma Instance Getter
 * Ensures we don't crash the entire server if the DB is offline.
 */
const getPrisma = () => {
  if (prismaInstance) return prismaInstance;
  
  const url = process.env.DATABASE_URL;
  
  // Basic validation
  if (!url || !url.startsWith('mysql://')) {
    console.warn('[DATABASE] Warning: DATABASE_URL is missing or invalid. MySQL integration is currently inactive.');
    return null;
  }

  try {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url: url
        }
      },
      log: ['error', 'warn'],
      errorFormat: 'minimal',
    });
    
    // We don't try to connect here, it will be handled lazily or in start()
    return prismaInstance;
  } catch (err) {
    console.error('[DATABASE] Fatal error during Prisma Client construction:', err);
    return null;
  }
};

// --- Mock Database Fallback Structures ---
let dbIsOnline = false;

const mockUsers: any[] = [];
const mockVehicles: any[] = [];
const mockParams: any[] = [];
const mockReadings: any[] = [];
const mockReports: any[] = [];
const mockCertificates: any[] = [];
const mockAuditLogs: any[] = [];
const mockSettings: any[] = [];

const resolveItemIncludes = (item: any, include: any) => {
  if (!item) return null;
  const newItem = { ...item };
  if (include) {
    for (const key of Object.keys(include)) {
      if (include[key]) {
        if (key === 'readings') {
          newItem.readings = mockReadings.filter(r => r.vehicleId === newItem.id);
        } else if (key === 'vehicle') {
          newItem.vehicle = mockVehicles.find(v => v.id === newItem.vehicleId) || null;
        } else if (key === 'technician') {
          newItem.technician = mockUsers.find(u => u.id === newItem.technicianId) || null;
        } else if (key === 'admin') {
          newItem.admin = mockUsers.find(u => u.id === newItem.adminId) || null;
        } else if (key === 'certificate') {
          newItem.certificate = mockCertificates.find(c => c.reportId === newItem.id) || null;
        }
      }
    }
  }
  return newItem;
};

const createMockModel = (name: string, list: any[]) => {
  return {
    findMany: async (args: any = {}) => {
      let result = [...list];
      if (args.where) {
        result = result.filter(item => {
          for (const key of Object.keys(args.where)) {
            const val = args.where[key];
            if (val === undefined) continue;
            
            if (val && typeof val === 'object') {
              if ('in' in val) {
                if (!val.in.includes(item[key])) return false;
              } else if ('contains' in val) {
                const searchStr = String(val.contains).toLowerCase();
                const itemStr = String(item[key] || '').toLowerCase();
                if (!itemStr.includes(searchStr)) return false;
              } else if ('equals' in val) {
                if (item[key] !== val.equals) return false;
              }
            } else if (item[key] !== val) {
              return false;
            }
          }
          return true;
        });
      }
      if (args.orderBy) {
        const orderKey = Object.keys(args.orderBy)[0];
        const direction = args.orderBy[orderKey];
        result.sort((a, b) => {
          if (a[orderKey] < b[orderKey]) return direction === 'asc' ? -1 : 1;
          if (a[orderKey] > b[orderKey]) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      if (args.take) {
        result = result.slice(0, args.take);
      }
      if (args.include) {
        result = result.map(item => resolveItemIncludes(item, args.include));
      }
      return result;
    },
    findUnique: async (args: any = {}) => {
      const where = args.where || {};
      const item = list.find(item => {
        for (const key of Object.keys(where)) {
          if (item[key] !== where[key]) return false;
        }
        return true;
      });
      if (!item) return null;
      return resolveItemIncludes(item, args.include);
    },
    findFirst: async (args: any = {}) => {
      const where = args.where || {};
      const item = list.find(item => {
        for (const key of Object.keys(where)) {
          if (item[key] !== where[key]) return false;
        }
        return true;
      });
      if (!item) return null;
      return resolveItemIncludes(item, args.include);
    },
    create: async (args: any = {}) => {
      const data = args.data || {};
      const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
      const newItem = { id: newId, createdAt: new Date(), ...data };
      list.push(newItem);
      return resolveItemIncludes(newItem, args.include);
    },
    createMany: async (args: any = {}) => {
      const data = args.data || [];
      const newItems = data.map((d: any, index: number) => {
        const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 + index : 1 + index;
        return { id: newId, createdAt: new Date(), ...d };
      });
      list.push(...newItems);
      return { count: newItems.length };
    },
    update: async (args: any = {}) => {
      const where = args.where || {};
      const index = list.findIndex(item => {
        for (const key of Object.keys(where)) {
          if (item[key] !== where[key]) return false;
        }
        return true;
      });
      if (index === -1) throw new Error(`Record to update not found in mock ${name}`);
      const data = args.data || {};
      list[index] = { ...list[index], ...data };
      return resolveItemIncludes(list[index], args.include);
    },
    delete: async (args: any = {}) => {
      const where = args.where || {};
      const index = list.findIndex(item => {
        for (const key of Object.keys(where)) {
          if (item[key] !== where[key]) return false;
        }
        return true;
      });
      if (index === -1) throw new Error(`Record to delete not found in mock ${name}`);
      const deleted = list.splice(index, 1)[0];
      return deleted;
    },
    deleteMany: async (args: any = {}) => {
      const where = args.where || {};
      let count = 0;
      for (let i = list.length - 1; i >= 0; i--) {
        const item = list[i];
        let match = true;
        for (const key of Object.keys(where)) {
          if (item[key] !== where[key]) {
            match = false;
            break;
          }
        }
        if (match) {
          list.splice(i, 1);
          count++;
        }
      }
      return { count };
    },
    upsert: async (args: any = {}) => {
      const where = args.where || {};
      const index = list.findIndex(item => {
        for (const key of Object.keys(where)) {
          if (item[key] !== where[key]) return false;
        }
        return true;
      });
      if (index !== -1) {
        list[index] = { ...list[index], ...(args.update || {}) };
        return resolveItemIncludes(list[index], args.include);
      } else {
        const newId = list.length > 0 ? Math.max(...list.map(i => i.id || 0)) + 1 : 1;
        const newItem = { id: newId, createdAt: new Date(), ...(args.create || {}) };
        list.push(newItem);
        return resolveItemIncludes(newItem, args.include);
      }
    },
    count: async (args: any = {}) => {
      let result = [...list];
      if (args.where) {
        result = result.filter(item => {
          for (const key of Object.keys(args.where)) {
            if (item[key] !== args.where[key]) return false;
          }
          return true;
        });
      }
      return result.length;
    }
  };
};

const mockDb: Record<string, any> = {
  user: createMockModel('User', mockUsers),
  vehicle: createMockModel('Vehicle', mockVehicles),
  referenceParameter: createMockModel('ReferenceParameter', mockParams),
  currentReading: createMockModel('CurrentReading', mockReadings),
  calibrationReport: createMockModel('CalibrationReport', mockReports),
  certificate: createMockModel('Certificate', mockCertificates),
  auditLog: createMockModel('AuditLog', mockAuditLogs),
  systemSetting: createMockModel('SystemSetting', mockSettings),
};

async function seedMock() {
  console.log('[DATABASE] Seeding Mock Database in memory...');
  const userCount = mockUsers.length;
  const paramCount = mockParams.length;

  if (userCount === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    const techHash = await bcrypt.hash('tech123', 10);

    mockUsers.push({ id: 1, email: 'admin@autocal.com', password: adminHash, name: 'Senior Admin', role: 'admin' });
    mockUsers.push({ id: 2, email: 'tech@autocal.com', password: techHash, name: 'John Technician', role: 'technician' });

    if (mockVehicles.length === 0) {
      mockVehicles.push({ 
        id: 1,
        registrationNumber: 'KAA-123A',
        vin: 'VIN1234567890ABC', 
        make: 'Toyota', 
        model: 'Corolla', 
        year: 2022,
        bulkNumber: 'BN-8890',
        omc: 'Shell BP',
        nominalCapacity: '28,000 L',
        expirationDate: new Date('2025-12-31')
      });
    }
  }

  if (paramCount === 0) {
    const parameters = [
      // 1. Engine & Powertrain
      { category: 'Engine & Powertrain', parameterName: 'Engine Idle RPM', standardValue: 750, toleranceMin: 700, toleranceMax: 800, unit: 'RPM' },
      { category: 'Engine & Powertrain', parameterName: 'Engine Max RPM', standardValue: 6500, toleranceMin: 6400, toleranceMax: 6600, unit: 'RPM' },
      { category: 'Engine & Powertrain', parameterName: 'Torque Output', standardValue: 170, toleranceMin: 165, toleranceMax: 175, unit: 'Nm' },
      { category: 'Engine & Powertrain', parameterName: 'Fuel Injection Timing', standardValue: 5, toleranceMin: 4, toleranceMax: 6, unit: 'ms' },
      { category: 'Engine & Powertrain', parameterName: 'Air-Fuel Ratio', standardValue: 14.7, toleranceMin: 14.2, toleranceMax: 15.2, unit: 'ratio' },
      { category: 'Engine & Powertrain', parameterName: 'Throttle Response', standardValue: 100, toleranceMin: 95, toleranceMax: 105, unit: 'ms' },
      { category: 'Engine & Powertrain', parameterName: 'Ignition Timing', standardValue: 11, toleranceMin: 10, toleranceMax: 12, unit: 'deg' },
      { category: 'Engine & Powertrain', parameterName: 'Engine Temperature', standardValue: 90, toleranceMin: 85, toleranceMax: 95, unit: 'C' },
      { category: 'Engine & Powertrain', parameterName: 'Turbo Boost Pressure', standardValue: 0.8, toleranceMin: 0.7, toleranceMax: 0.9, unit: 'bar' },
      { category: 'Engine & Powertrain', parameterName: 'CO Emissions', standardValue: 0.2, toleranceMin: 0, toleranceMax: 0.5, unit: '%' },
      { category: 'Engine & Powertrain', parameterName: 'NOx Emissions', standardValue: 0.05, toleranceMin: 0, toleranceMax: 0.1, unit: 'g/km' },

      // 2. Transmission
      { category: 'Transmission', parameterName: 'Gear Shift Timing', standardValue: 200, toleranceMin: 150, toleranceMax: 250, unit: 'ms' },
      { category: 'Transmission', parameterName: 'Clutch Engagement Pressure', standardValue: 12, toleranceMin: 11.5, toleranceMax: 12.5, unit: 'bar' },
      { category: 'Transmission', parameterName: 'Transmission Oil Temp', standardValue: 80, toleranceMin: 75, toleranceMax: 85, unit: 'C' },
      { category: 'Transmission', parameterName: 'Synchronizer Wear Indication', standardValue: 0, toleranceMin: 0, toleranceMax: 1, unit: 'mm' },

      // 3. Brake System
      { category: 'Brake System', parameterName: 'Front Brake Pad Life', standardValue: 10, toleranceMin: 2, toleranceMax: 12, unit: 'mm' },
      { category: 'Brake System', parameterName: 'Rear Brake Pad Life', standardValue: 8, toleranceMin: 2, toleranceMax: 10, unit: 'mm' },
      { category: 'Brake System', parameterName: 'Brake Oil Pressure', standardValue: 60, toleranceMin: 55, toleranceMax: 65, unit: 'bar' },
      { category: 'Brake System', parameterName: 'ABS Actuator Duty Cycle', standardValue: 50, toleranceMin: 45, toleranceMax: 55, unit: '%' },

      // 4. Steering & Suspension
      { category: 'Steering & Suspension', parameterName: 'Steering Play angle', standardValue: 0, toleranceMin: -2, toleranceMax: 2, unit: 'deg' },
      { category: 'Steering & Suspension', parameterName: 'Power Steering Pressure', standardValue: 80, toleranceMin: 75, toleranceMax: 85, unit: 'bar' },
      { category: 'Steering & Suspension', parameterName: 'Front Wheel Alignment (Toe)', standardValue: 0.15, toleranceMin: 0.1, toleranceMax: 0.2, unit: 'deg' },
      { category: 'Steering & Suspension', parameterName: 'Suspension Strut Rebound', standardValue: 1.2, toleranceMin: 1, toleranceMax: 1.4, unit: 'Hz' }
    ];

    mockParams.push(...parameters.map(p => ({ ...p, vehicleModel: 'Corolla' })));
  }
}

// Proxy to allow using `prisma` directly while ensuring it exists
const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    if (prop === '$connect' || prop === '$disconnect') {
      const p = getPrisma();
      return p ? (p as any)[prop].bind(p) : async () => {};
    }

    if (!dbIsOnline) {
      const mockModel = mockDb[prop as string];
      if (mockModel) {
        return mockModel;
      }
    }

    const p = getPrisma();
    if (!p) {
      const mockModel = mockDb[prop as string];
      if (mockModel) {
        return mockModel;
      }
      const msg = 'Database connection is not configured or matches invalid settings (must be mysql://).';
      const err = new Error(msg);
      (err as any).isPrismaOffline = true;
      (err as any).name = 'PrismaClientInitializationError'; // Ensure it matches our error handler
      throw err;
    }

    // Accessing a property on the real Prisma instance
    const value = (p as any)[prop];
    if (typeof value === 'function') {
      return value.bind(p);
    }
    return value;
  }
});

/**
 * Wrapper for async express routes to catch unhandled rejections
 */
const asyncHandler = (fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<any>) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

const app = express();
app.set('trust proxy', 1);
const PORT = 3000;

// 0. Environment Security Check
const requiredEnv = ['JWT_SECRET', 'DATABASE_URL', 'GEMINI_API_KEY'];
const missingEnv = requiredEnv.filter(k => !process.env[k] || process.env[k]?.includes('placeholder'));
if (missingEnv.length > 0) {
  console.warn('[SECURITY] Note: Missing or placeholder environment variables detected:', missingEnv);
  // Do not process.exit(1) here as it prevents the app from starting in the AI Studio preview
  // before the user has a chance to configure them.
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-fallback-secret-67890';

// --- Cyber Security Protocols ---

// 1. Rate Limiting: Prevent brute force and DoS
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000, // relaxed for dev/preview
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // relaxed for testing
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { trustProxy: false },
  message: 'Security Alert: Excessive login attempts detected. Try again later.',
});

// 2. HTTP Security Headers with Helmet
// Configure Helmet with stricter policy in production
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:'],
        frameAncestors: ["'none'"],
      }
    },
    frameguard: false, // keep false for AI Studio iframe compatibility
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));
} else {
  app.use(helmet({ contentSecurityPolicy: false, frameguard: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
}

// 3. CORS Configuration: Dynamic Origin Control
app.use(cors({
  origin: true, // Allow all origins in this environment
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(generalLimiter);

// 4. Input Size Restrictions
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for general security

// --- AI Initialization ---
const getGenAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY' || key === 'your_api_key_here' || key.includes('placeholder')) {
        return null;
    }
    return new GoogleGenAI({ apiKey: key });
};

const genAI = getGenAI();
const aiModel = "gemini-3-flash-preview";
const imageSearchModel = "gemini-3.1-flash-image-preview";

// Initialize Sentry if DSN provided
const SENTRY_DSN = process.env.SENTRY_DSN;
if (SENTRY_DSN) {
  try {
    Sentry.init({ dsn: SENTRY_DSN, environment: process.env.NODE_ENV || 'development' });
    // Request handler must be used before other handlers
    app.use(Sentry.Handlers.requestHandler() as any);
    console.log('[SENTRY] Initialized Sentry error reporting');
  } catch (err) {
    console.warn('[SENTRY] Failed to initialize Sentry:', err);
  }
}

const decodeBase64Image = (dataUri: string | null | undefined) => {
  if (!dataUri || !dataUri.includes('base64,')) return null;
  const base64Data = dataUri.split('base64,')[1];
  return Buffer.from(base64Data, 'base64');
};

// Helper for AI availability errors
const handleAIError = (res: any, err: any, customMsg: string) => {
    console.error(customMsg, err);
    if (err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('API key not valid')) {
        return res.status(503).json({ 
            error: 'AI Services Restricted: Invalid API Key. Please provide a valid GEMINI_API_KEY in the application settings to restore Discovery features.' 
        });
    }
    res.status(500).json({ error: customMsg });
};

// Middleware
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    console.log(`[GATEKEEPER] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.warn(`[AUTH] Missing header: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    console.warn(`[AUTH] Malformed token: ${token}`);
    return res.status(401).json({ error: 'Malformed or missing token' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    // Ensure ID is a number
    if (decoded && typeof decoded.id === 'string') {
      decoded.id = parseInt(decoded.id);
    }
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error(`[AUTH] JWT Verification failed: ${err.message}`);
    // If it's an expired error, we might want a specific message
    const message = err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token';
    res.status(401).json({ error: message });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  console.log(`[AUTH] Checking admin privilege for user: ${req.user?.email} (Role: ${req.user?.role})`);
  if (req.user?.role !== 'admin') {
    console.warn(`[AUTH] Admin access DENIED for user: ${req.user?.email}`);
    return res.status(403).json({ error: 'Access denied: Administrative privileges required for this protocol.' });
  }
  next();
};

const logAudit = async (req: any, action: string, details?: string) => {
  try {
    const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || 'System';
    await prisma.auditLog.create({
      data: {
        userId: req?.user?.id,
        userEmail: req?.user?.email,
        action,
        details: `${details || ''} [IP: ${ip}]`
      }
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

// --- Health Check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Create API Router to prevent fall-through to HTML index
const apiRouter = express.Router();

// Gatekeeper for Router
apiRouter.use((req, res, next) => {
  console.log(`[API CALL] ${req.method} ${req.url}`);
  next();
});

// Mount API Router early
app.use('/api', apiRouter);

apiRouter.get('/ai/status', (req, res) => {
  res.json({ 
    available: !!genAI, 
    model: aiModel,
    hasKey: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'placeholder'
  });
});

// --- AI Routes ---
apiRouter.post('/ai/vehicle-image', authenticate, asyncHandler(async (req, res) => {
  if (!genAI) return res.status(503).json({ error: 'AI services currently offline' });
  const { make, model: vModel, year } = req.body;
  
  try {
    const prompt = `Generate a professional studio cutout photograph of a ${year} ${make} ${vModel}.
    The unit should be shown from a 3/4 front angle.
    The background MUST be transparent or absolute pure white (#FFFFFF).
    Use real images of this specific model from the internet as reference (search context).
    Ensure accuracy of the design for the ${year} production year.`;

    const response = await genAI.models.generateContent({
      model: imageSearchModel,
      contents: prompt,
      config: {
        tools: [{ 
          googleSearch: {
            searchTypes: {
              webSearch: {},
              imageSearch: {}
            }
          } 
        }]
      }
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    
    if (imagePart?.inlineData) {
      res.json({ imageUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}` });
    } else {
      // Fallback: search for URL
      const textResponse = await genAI.models.generateContent({
        model: aiModel,
        contents: `Find a direct URL for a high quality PNG cutout of a ${year} ${make} ${vModel}. Return ONLY the URL.`,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const urlMatch = textResponse.text.match(/https?:\/\/[^\s)]+/);
      res.json({ imageUrl: urlMatch ? urlMatch[0] : `https://images.unsplash.com/featured/?car,${make},${vModel},white-background` });
    }
  } catch (err) {
    handleAIError(res, err, 'Visual Discovery failed');
  }
}));

// 1. Auth Login
apiRouter.post('/auth/login', authLimiter, asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  });

  try {
    const { email, password } = schema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });

    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
      await logAudit({ user: { id: user.id, email: user.email } }, 'LOGIN_SUCCESS');
      res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    } else {
      await logAudit({ user: { email } }, 'LOGIN_FAILED', 'Invalid credentials attempt');
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err: any) {
    res.status(400).json({ error: 'Data integrity error: Invalid login parameters.' });
  }
}));

// 2. Vehicles
apiRouter.get('/vehicles', authenticate, asyncHandler(async (req, res) => {
  const { vin, registrationNumber } = req.query;
  const where: any = {};
  
  const orConditions = [];
  if (vin) orConditions.push({ vin: { contains: vin as string } });
  if (registrationNumber) orConditions.push({ registrationNumber: { contains: registrationNumber as string } });
  
  if (orConditions.length > 0) {
    where.OR = orConditions;
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: { readings: true }
  });
  res.json(vehicles);
}));

apiRouter.get('/vehicles/:id/parameters', authenticate, asyncHandler(async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr);
  if (isNaN(id)) return res.status(400).json({ error: 'Technical Violation: Invalid vehicle identification parameter.' });

  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  // Try to find model-specific parameters
  let parameters = await prisma.referenceParameter.findMany({
    where: { vehicleModel: vehicle.model }
  });

  // Fallback to standard parameters (Corolla in seed) if none found for this specific model
  if (parameters.length === 0) {
    parameters = await prisma.referenceParameter.findMany({
      where: { vehicleModel: 'Corolla' }
    });
  }

  res.json(parameters);
}));

apiRouter.post('/vehicles', authenticate, asyncHandler(async (req, res) => {
  const schema = z.object({
    registrationNumber: z.string().min(1),
    vin: z.string().optional().nullable(),
    make: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    year: z.number().int().optional().nullable(),
    bulkNumber: z.string().optional().nullable(),
    omc: z.string().optional().nullable(),
    expirationDate: z.string().optional().nullable(),
    nominalCapacity: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
    ownerPhone: z.string().optional().nullable(),
    ownerEmail: z.string().optional().nullable(),
  });

  try {
    const data = schema.parse(req.body);
    const vehicle = await prisma.vehicle.create({ 
      data: {
        registrationNumber: data.registrationNumber,
        vin: data.vin,
        make: data.make,
        model: data.model,
        year: data.year,
        bulkNumber: data.bulkNumber,
        omc: data.omc,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
        nominalCapacity: data.nominalCapacity,
        imageUrl: data.imageUrl,
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        ownerEmail: data.ownerEmail,
      }
    });
    res.status(201).json(vehicle);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        return res.status(400).json({ error: 'This Registration Number is already registered in the fleet database.' });
      }
    }
    console.error('Vehicle registration error:', err);
    res.status(400).json({ error: 'Failed to onboard vehicle. Please verify input data.' });
  }
}));

apiRouter.put('/vehicles/:id', authenticate, asyncHandler(async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr);
  if (isNaN(id)) return res.status(400).json({ error: 'Technical Violation: Invalid node ID.' });

  const schema = z.object({
    registrationNumber: z.string().min(1).optional(),
    vin: z.string().optional().nullable(),
    make: z.string().optional().nullable(),
    model: z.string().optional().nullable(),
    year: z.number().int().optional().nullable(),
    bulkNumber: z.string().optional().nullable(),
    omc: z.string().optional().nullable(),
    expirationDate: z.string().optional().nullable(),
    nominalCapacity: z.string().optional().nullable(),
    imageUrl: z.string().optional().nullable(),
    ownerName: z.string().optional().nullable(),
    ownerPhone: z.string().optional().nullable(),
    ownerEmail: z.string().optional().nullable(),
  });

  try {
    const data = schema.parse(req.body);
    const updateData: any = { ...data };
    if (data.expirationDate) {
      updateData.expirationDate = new Date(data.expirationDate);
    }

    const vehicle = await prisma.vehicle.update({
      where: { id: parseInt(req.params.id) },
      data: updateData
    });
    res.json(vehicle);
  } catch (err: any) {
    console.error('Vehicle update error:', err);
    res.status(400).json({ error: err.message || 'Failed to update vehicle data.' });
  }
}));

apiRouter.delete('/vehicles/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  console.log(`[FLEET] DELETE request received for vehicle ID: ${req.params.id}`);
  try {
    const idStr = req.params.id;
    const id = parseInt(idStr);
    if (isNaN(id)) return res.status(400).json({ error: 'Protocol Failure: Malformed asset ID.' });

    console.log(`[FLEET] Attempting to decommission unit ID: ${id} by user: ${(req as any).user.email}`);
    
    await prisma.vehicle.delete({
      where: { id }
    });
    
    await logAudit(req, 'VEHICLE_DELETED', `Unit ID ${id} purged from registry`);
    res.json({ success: true, message: 'Unit successfully decommissioned from fleet.' });
  } catch (err: any) {
    console.error('Vehicle deletion error:', err);
    res.status(400).json({ error: `System rejection: ${err.message || 'Check for active laboratory dependencies.'}` });
  }
}));

// 3. Compare Results
apiRouter.post('/compare', authenticate, asyncHandler(async (req, res) => {
  const schema = z.object({
    vehicleId: z.number().int(),
    type: z.enum(['pressure', 'tank', 'standard']).optional().default('standard'),
    readings: z.array(z.object({
      name: z.string(),
      value: z.number(),
      category: z.string().optional(),
      unit: z.string().optional(),
      toleranceMin: z.number().optional(),
      toleranceMax: z.number().optional()
    })).optional().default([]),
    compartments: z.array(z.any()).optional(),
    hatches: z.array(z.any()).optional(),
    bulkNo: z.string().optional(),
    bulkSize: z.string().optional(),
    bulkDescription: z.string().optional(),
    compartment: z.string().optional(),
    recommendedVolumeChange: z.string().optional(),
    duration: z.string().optional(),
    monitoring: z.string().optional(),
    couplingFore: z.string().optional(),
    couplingAft: z.string().optional(),
    certNumber: z.string().optional(),
    calibrationDate: z.string().optional(),
    location: z.string().optional(),
    station: z.string().optional(),
    tankCalibrated: z.string().optional(),
    tankPosition: z.string().optional(),
    medium: z.string().optional(),
    nominalCapacity: z.string().optional(),
    calibratedCapacity: z.string().optional(),
    method: z.string().optional(),
    flowRate: z.string().optional(),
    pressure: z.string().optional(),
    meterSerial: z.string().optional(),
    mfgYear: z.string().optional(),
    issuedDate: z.string().optional(),
    expiryDate: z.string().optional(),
  });

  try {
    const data = schema.parse(req.body);
    const { vehicleId, readings, type, compartments } = data; 

    const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    let reportData: any;

    if (type === 'pressure') {
      reportData = {
        type: 'pressure',
        bulkSize: data.bulkSize,
        bulkDescription: data.bulkDescription,
        compartment: data.compartment,
        recommendedVolumeChange: data.recommendedVolumeChange,
        duration: data.duration,
        monitoring: data.monitoring,
        overallStatus: 'Pressure Test Successful'
      };
    } else if (type === 'tank') {
      reportData = {
        type: 'tank',
        compartments,
        hatches: data.hatches,
        bulkNo: data.bulkNo,
        couplingFore: data.couplingFore,
        couplingAft: data.couplingAft,
        certNumber: data.certNumber,
        calibrationDate: data.calibrationDate,
        location: data.location,
        station: data.station,
        tankCalibrated: data.tankCalibrated,
        tankPosition: data.tankPosition,
        medium: data.medium,
        nominalCapacity: data.nominalCapacity,
        calibratedCapacity: data.calibratedCapacity,
        method: data.method,
        flowRate: data.flowRate,
        pressure: data.pressure,
        meterSerial: data.meterSerial,
        mfgYear: data.mfgYear,
        issuedDate: data.issuedDate,
        expiryDate: data.expiryDate,
        overallStatus: 'Calibration Validated'
      };
    } else {
      // Get references
      let references = await prisma.referenceParameter.findMany({
        where: { vehicleModel: vehicle.model || 'Corolla' }
      });

      // Fallback if no specific model refs
      if (references.length === 0) {
        references = await prisma.referenceParameter.findMany({
          where: { vehicleModel: 'Corolla' }
        });
      }

      const comparisonResults = (readings || []).map((reading: any) => {
        const ref = references.find(r => r.parameterName === reading.name);
        
        const min = reading.toleranceMin !== undefined ? reading.toleranceMin : (ref?.toleranceMin ?? 0);
        const max = reading.toleranceMax !== undefined ? reading.toleranceMax : (ref?.toleranceMax ?? 0);
        const standard = ref?.standardValue ?? reading.value;

        const isPass = reading.value >= min && reading.value <= max;
        return {
          name: reading.name,
          category: reading.category || ref?.category || 'General',
          measured: reading.value,
          standard,
          range: `${min} - ${max}`,
          unit: reading.unit || ref?.unit || '',
          status: isPass ? 'PASS' : 'FAIL'
        };
      });

      const overallPass = comparisonResults.every((r: any) => r.status === 'PASS');
      reportData = {
        results: comparisonResults,
        overallStatus: overallPass ? 'Calibration Passed' : 'Calibration Failed'
      };
    }

    // Create report
    const report = await prisma.calibrationReport.create({
      data: {
        vehicleId,
        technicianId: (req as any).user.id,
        reportDataJson: JSON.stringify(reportData),
        status: 'pending'
      }
    });

    await logAudit(req, 'CALIBRATION_SESSION_CREATED', `Vehicle ID: ${vehicleId}, Report ID: ${report.id}`);
    res.json(report);
  } catch (err: any) {
    console.error('[SECURITY] Protocol Violation in Compare Route:', err);
    res.status(400).json({ error: 'Data integrity failed: Malformed calibration payload.' });
  }
}));

// 4. Reports
apiRouter.get('/reports', authenticate, asyncHandler(async (req, res) => {
  const reports = await prisma.calibrationReport.findMany({
    include: { vehicle: true, technician: true, admin: true, certificate: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(reports);
}));

apiRouter.get('/reports/:id', authenticate, asyncHandler(async (req, res) => {
  const idStr = req.params.id;
  const id = parseInt(idStr);
  if (isNaN(id)) return res.status(400).json({ error: 'Malformed request: Invalid report reference.' });

  const report = await prisma.calibrationReport.findUnique({
    where: { id },
    include: { vehicle: true, technician: true, admin: true, certificate: true }
  });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({
    ...report,
    reportData: JSON.parse(report.reportDataJson)
  });
}));

apiRouter.put('/reports/:id/approve', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const reportId = parseInt(req.params.id);
  const { comment } = req.body;

  const report = await prisma.calibrationReport.findUnique({ where: { id: reportId }, include: { vehicle: true } });
  if (!report) return res.status(404).json({ error: 'Report not found' });

  // Update report
  const updatedReport = await prisma.calibrationReport.update({
    where: { id: reportId },
    data: {
      status: 'approved',
      adminId: (req as any).user.id,
      adminComment: comment
    }
  });

  // Update vehicle last calibration date
  await prisma.vehicle.update({
    where: { id: report.vehicleId },
    data: { lastCalibrationDate: new Date() }
  });

  // Generate Certificate record
  const reportData = JSON.parse(report.reportDataJson);
  const isPressure = reportData.type === 'pressure';
  const prefix = isPressure ? 'PC-' : 'CERT-';
  
  // Prefer the certNumber already in the report data if it exists and looks valid
  let certNumber = reportData.certNumber;
  if (!certNumber) {
    certNumber = `${prefix}${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
  }

  await prisma.certificate.create({
    data: {
      reportId,
      certificateNumber: certNumber
    }
  });

  await logAudit(req, 'REPORT_APPROVED', `Report ID: ${reportId}, Cert: ${certNumber}`);
  res.json(updatedReport);
}));

apiRouter.put('/reports/:id/reject', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { comment } = req.body;
  const updatedReport = await prisma.calibrationReport.update({
    where: { id: parseInt(req.params.id) },
    data: {
      status: 'rejected',
      adminId: (req as any).user.id,
      adminComment: comment
    }
  });
  await logAudit(req, 'REPORT_REJECTED', `Report ID: ${req.params.id}`);
  res.json(updatedReport);
}));

apiRouter.delete('/reports/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  console.log(`[LAB] DELETE request received for report ID: ${req.params.id}`);
  try {
    const idStr = req.params.id;
    const id = parseInt(idStr);
    if (isNaN(id)) return res.status(400).json({ error: 'Protocol Failure: Malformed record ID.' });

    console.log(`[LAB] Attempting to purge report ID: ${id} by admin: ${(req as any).user.email}`);

    // Cleanup certificate if it exists
    await prisma.certificate.deleteMany({ where: { reportId: id } });
    await prisma.calibrationReport.delete({ where: { id } });
    await logAudit(req, 'REPORT_DELETED', `Report ID: ${id} purged`);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Report deletion error:', err);
    res.status(400).json({ error: `Laboratory error: ${err.message || 'Failed to purge record'}` });
  }
}));

// 5. Certificate Download (PDF)
apiRouter.get('/certificates/:reportId/download', authenticate, asyncHandler(async (req, res, next) => {
  try {
    const reportId = parseInt(req.params.reportId);
    console.log(`[CERT] Generating certificate for Report ID: ${reportId}`);

    const report = await prisma.calibrationReport.findUnique({
      where: { id: reportId },
      include: { vehicle: true, technician: true, admin: true, certificate: true }
    });

    if (!report || report.status !== 'approved' || !report.certificate) {
      console.warn(`[CERT] Certificate check failed for ID ${reportId}: Approved=${report?.status}, HasCert=${!!report?.certificate}`);
      return res.status(404).json({ error: 'Certificate not available or report not approved' });
    }

    const reportData = JSON.parse(report.reportDataJson);
    
    // Fetch global logos
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['logo_gsa', 'logo_elle', 'logo_npa'] } }
    });
    const logos: any = {};
    settings.forEach(s => { logos[s.key] = s.value; });

    const gsaBuffer = decodeBase64Image(logos.logo_gsa);
    const elleBuffer = decodeBase64Image(logos.logo_elle);
    const npaBuffer = decodeBase64Image(logos.logo_npa);

    // Generate QR Buffer early
    let qrBuffer: Buffer | null = null;
    try {
      const qrText = `https://autocal.pro/verify/${report.certificate.certificateNumber}`;
      qrBuffer = await QRCode.toBuffer(qrText, { margin: 1, width: 200, errorCorrectionLevel: 'M' });
    } catch (qrErr) {
      console.error('[CERT] QR Buffer generation error:', qrErr);
    }

    // Set headers BEFORE starting the document to ensure browser alignment
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate_${report.certificate.certificateNumber}.pdf"`);
    res.setHeader('Cache-Control', 'no-cache');

    const doc = new PDFDocument({ 
      margin: 50,
      size: 'LETTER',
      bufferPages: true 
    });

    // Pipe directly to response for minimal latency and memory overhead
    doc.pipe(res);

    // --- PDF Content Structure ---
    const primaryColor = '#1e293b'; 
    const successColor = '#10b981';
    const dangerColor = '#ef4444';
    const lightGray = '#f8fafc';

    if (reportData.type === 'pressure') {
      const pageW = 612;
      
      // 0. Watermark
      doc.save();
      doc.opacity(0.03);
      doc.fontSize(250).font('Helvetica-Bold').text('NPA', 0, 300, { align: 'center', width: 612 });
      doc.restore();

      if (npaBuffer) {
        doc.save();
        doc.opacity(0.08); // Subtle logo watermark too
        doc.image(npaBuffer, (pageW / 2) - 150, 300, { width: 300 });
        doc.restore();
      }

      // 1. Header Section - Logos & Contact
      if (gsaBuffer) {
        doc.image(gsaBuffer, 50, 40, { height: 60 });
      } else {
        doc.rect(50, 40, 60, 60).stroke('#cbd5e1');
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#cbd5e1').text('GSA', 65, 65);
      }
      
      // Middle Logo Area
      if (elleBuffer) {
        doc.image(elleBuffer, (pageW/2) - 30, 35, { height: 35 });
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text('Eli Company Limited', (pageW/2) - 150, 75, { width: 300, align: 'center' });
      } else {
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('Eli Company Limited', (pageW/2) - 150, 45, { width: 300, align: 'center' });
      }

      if (npaBuffer) {
        doc.image(npaBuffer, pageW - 100, 40, { height: 50 });
      }
      
      doc.fontSize(7).fillColor('#64748b').text('P.O.BOX OS 1451, OSU, ACCRA-GHANA', (pageW/2) - 100, 88, { width: 200, align: 'center' });
      doc.text('Tel: +233(0) 50 162 0020 +233 050 160 3918 | +233 050 162 0021', (pageW/2) - 150, 98, { width: 300, align: 'center' });

      doc.moveDown(2);
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#1e293b').text('STORAGE TANK AND VESSEL CALIBRATION', 50, 115, { align: 'center', width: 512 });
      doc.fontSize(9).font('Helvetica').text('(PRESSURE TESTING)', 50, 130, { align: 'center', width: 512 });
      
      const tableY = 150;
      const rowH = 20;
      const col1W = 180;
      const col2W = 332;

      const items = [
        { label: 'Certificate No:', value: report.certificate.certificateNumber },
        { label: 'Vehicle No:', value: report.vehicle.registrationNumber },
        { label: 'OMC:', value: report.vehicle.omc || 'N/A' },
        { label: 'Transporter:', value: reportData.transporter || report.vehicle.ownerName || 'N/A' },
        { label: 'Bulk Size:', value: reportData.bulkSize || 'N/A' },
        { label: 'Bulk Description:', value: reportData.bulkDescription || 'N/A' },
        { label: 'Compartment:', value: reportData.compartment || 'N/A' },
        { label: 'Recommended Net Volume Change:', value: reportData.recommendedVolumeChange || 'N/A' },
        { label: 'Duration For Testing:', value: reportData.duration || 'N/A' },
        { label: 'Monitoring:', value: reportData.monitoring || 'N/A' }
      ];

      let currentTY = tableY;
      items.forEach((item, idx) => {
        // Row background
        doc.rect(50, currentTY, col1W, rowH).fill('#f1f5f9');
        doc.rect(50 + col1W, currentTY, col2W, rowH).fill('white');
        
        // Borders
        doc.strokeColor('#e2e8f0').lineWidth(0.5);
        doc.rect(50, currentTY, col1W + col2W, rowH).stroke();
        doc.lineCap('butt').moveTo(50 + col1W, currentTY).lineTo(50 + col1W, currentTY + rowH).stroke();

        // Content
        doc.fillColor('#475569').font('Helvetica-Bold').fontSize(8).text(item.label, 60, currentTY + 6);
        doc.fillColor('#1e293b').font('Helvetica').fontSize(8).text(String(item.value).toUpperCase(), 50 + col1W + 10, currentTY + 6);

        currentTY += rowH;
      });

      const certText = "This is to certify that a tank tightness test conducted at (please see above) passed the test using third party certified method-HYDRO TEST * Tank Testing System - which is valid for the tank size and content and which was conducted for the proper duration and under testing";
      doc.fontSize(9).font('Helvetica').fillColor('#334155').text(certText, 50, currentTY + 15, { align: 'justify', width: 512, lineGap: 2 });

      // QR Code and Dates - Positioned after certText
      const finalContentY = currentTY + 65;
      
      if (qrBuffer) {
        doc.image(qrBuffer, 50, finalContentY, { width: 55 });
      }

      // Dates - Shifted right of QR code
      const dateX = 125;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#1e293b');
      doc.text(`DATE: ${new Date(report.certificate.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`, dateX, finalContentY + 12);
      
      const expiry = new Date(report.certificate.generatedAt);
      expiry.setFullYear(expiry.getFullYear() + 1);
      doc.text(`EXPIRY DATE: ${expiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`, dateX, finalContentY + 25);

      // Signature Area
      doc.lineWidth(1).strokeColor('#cbd5e1').moveTo(400, finalContentY + 35).lineTo(550, finalContentY + 35).stroke();
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#1e293b').text('OPERATIONS MANAGER', 400, finalContentY + 40, { width: 150, align: 'center' });
      doc.fontSize(7).font('Helvetica').fillColor('#64748b').text('CALIBRATION DEPARTMENT', 400, finalContentY + 50, { width: 150, align: 'center' });

      // High-Fidelity Footer Bar
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('This Certificate Shall Not Be Reproduced in Part Or Full', 0, 720, { align: 'center', width: 612 });
      doc.text('Except With Permission From The Issuing Authority', 0, 730, { align: 'center', width: 612 });

      doc.rect(0, 750, 612, 42).fill('#1a1b41');
      doc.rect(50, 762, 35, 18).fill('#ef4444');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text('KEEP', 55, 766);
      doc.text('THIS CERTIFICATE SAFELY', 95, 766);
      doc.text('TANK CLEANING, PRESSURE AND CALIBRATION SERVICES', 50, 766, { align: 'right', width: 512 });
    } else if (reportData.type === 'tank') {
      const pageW = 612;
      const primaryColor = '#1e293b';
      
      // 1. Header
      if (gsaBuffer) doc.image(gsaBuffer, 50, 40, { height: 50 });
      if (npaBuffer) doc.image(npaBuffer, pageW - 100, 40, { height: 50 });
      
      if (elleBuffer) {
        doc.image(elleBuffer, (pageW/2) - 25, 25, { height: 35 });
        doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('Eli Company Limited', (pageW/2) - 100, 65, { width: 200, align: 'center' });
      }

      doc.fontSize(7).font('Helvetica').fillColor('#475569');
      doc.text('P. O. BOX OS 1451, OSU, ACCRA-GHANA', (pageW/2) - 150, 80, { width: 300, align: 'center' });
      doc.text('Tel: +233 (0)50 162 0020  +233 (0)50 160 3918', (pageW/2) - 150, 88, { width: 300, align: 'center' });
      doc.text('+233 (0)50 162 0021', (pageW/2) - 150, 96, { width: 300, align: 'center' });

      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('BULK ROAD VEHICLE', 50, 115, { align: 'center', width: 512 });
      doc.text('CALIBRATION CERTIFICATE', 50, 130, { align: 'center', width: 512 });
      doc.fontSize(10).text(`CERTIFICATE NO: ${report.certificate.certificateNumber}`, 50, 145, { align: 'center', width: 512 });

      // 2. Identification Table
      const infoY = 165;
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text('VEHICLE REGISTRATION NUMBER', 50, infoY);
      doc.text('BULK NO.', 250, infoY, { align: 'center', width: 112 });
      doc.text('OMC', pageW - 150, infoY, { align: 'right', width: 100 });

      doc.fontSize(10).font('Helvetica');
      doc.text(report.vehicle.registrationNumber || 'N/A', 50, infoY + 12);
      doc.text(reportData.bulkNo || 'N/A', 250, infoY + 12, { align: 'center', width: 112 });
      doc.text(report.vehicle.omc || 'N/A', pageW - 150, infoY + 12, { align: 'right', width: 100 });

      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(`EXPIRY DATE: ${new Date(reportData.expiryDate || Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}`, 50, infoY + 30);
      doc.text(`NOMINAL CAPACITY: ${reportData.nominalCapacity || '0'} LITRES`, pageW - 250, infoY + 30, { align: 'right', width: 200 });

      doc.moveTo(50, infoY + 45).lineTo(pageW - 50, infoY + 45).lineWidth(1).stroke(primaryColor);

      // 3. Compartment Grid (3x3)
      let gridTop = infoY + 45;
      const compW = 166;
      const compH = 110;
      const margin = 5;

      const renderCompartment = (comp: any, x: number, y: number) => {
        const innerW = compW - margin;
        // Header
        doc.rect(x, y, innerW, 20).fill('#f1f5f9').stroke('#cbd5e1');
        doc.fontSize(6).font('Helvetica-Bold').fillColor('#475569');
        doc.text((comp.label || '').toUpperCase(), x + 3, y + 3);
        doc.text(`Capacity: ${comp.capacity || '0'} Litres`, x + 3, y + 11);
        doc.text(`Height: ${comp.height || '0'} cm`, x + 90, y + 11);

        // Sub-table header
        const tableY = y + 20;
        doc.rect(x, tableY, innerW, 8).fill('#e2e8f0').stroke('#cbd5e1');
        doc.fontSize(4.5).font('Helvetica-Bold').fillColor(primaryColor);
        doc.text('CAPACITY (LITRES)', x + 5, tableY + 2);
        doc.text('ULLAGE (cm)', x + 90, tableY + 2);

        // Rows
        let rowY = tableY + 8;
        const points = comp.points || [];
        points.slice(0, 6).forEach((p: any) => {
          doc.rect(x, rowY, innerW, 10).stroke('#cbd5e1');
          doc.fontSize(7).font('Helvetica-Bold').fillColor(primaryColor).text(String(p.capacity || '0'), x + 5, rowY + 2);
          doc.text(String(p.mileage || '0'), x + 90, rowY + 2);
          rowY += 10;
        });
      };

      const compartments = reportData.compartments || [];
      compartments.slice(0, 9).forEach((comp: any, i: number) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const x = 50 + (col * compW);
        const y = gridTop + (row * (compH + 5));
        renderCompartment(comp, x, y);
      });

      // 4. Hatch Row
      const hatchY = gridTop + (3 * (compH + 5)) + 4;
      doc.fontSize(6).font('Helvetica-Bold').fillColor(primaryColor);
      const hatchW = 512 / 9;
      const hatches = reportData.hatches || [];
      hatches.slice(0, 9).forEach((h: any, i: number) => {
        doc.rect(50 + (i * hatchW), hatchY, hatchW, 12).stroke('#cbd5e1');
        doc.text(`Hatch ${i + 1}`, 50 + (i * hatchW), hatchY - 8, { width: hatchW, align: 'center' });
        doc.fontSize(8).text(String(h || '0'), 50 + (i * hatchW), hatchY + 3, { width: hatchW, align: 'center' });
      });

      // 5. Footer Details
      const footerY = hatchY + 30;
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748b');
      doc.image(qrBuffer, 50, footerY, { width: 35 });
      doc.text('COUPLING HEIGHT: FORE: ' + (reportData.couplingFore || '---') + ' cm / AFT: ' + (reportData.couplingAft || '---') + ' cm', 100, footerY + 8);
      doc.text('* ULLAGE AT WHICH THE NOMINAL CAPACITY IS SET', 100, footerY + 18);

      doc.text('CALIBRATION PERFORMED WITH BOTTOM LINES EMPTY', 320, footerY + 8, { align: 'right', width: 220 });

      // Authorized Signature Area
      doc.fontSize(8).fillColor(primaryColor).font('Helvetica-Bold').text('AUTHORISED SIGNATURE', 450, footerY + 45, { align: 'center', width: 120 });
      doc.text('DATE OF ISSUE: ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase(), 450, footerY + 55, { align: 'center', width: 120 });

      // High-Fidelity Footer Bar
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('This Certificate Shall Not Be Reproduced in Part Or Full', 0, 720, { align: 'center', width: 612 });
      doc.text('Except With Permission From The Issuing Authority', 0, 730, { align: 'center', width: 612 });

      doc.rect(0, 750, 612, 42).fill('#1a1b41');
      doc.rect(50, 762, 35, 18).fill('#ef4444');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text('KEEP', 55, 766);
      doc.text('THIS CERTIFICATE SAFELY', 95, 766);
      doc.text('TANK CLEANING, PRESSURE AND CALIBRATION SERVICES', 50, 766, { align: 'right', width: 512 });
    } else {
      // 1. Header Design - Centered Company Branding
      const pageW = 612;
      if (gsaBuffer) {
        doc.image(gsaBuffer, 50, 40, { height: 50 });
      }

      if (elleBuffer) {
        doc.image(elleBuffer, (pageW/2) - 25, 25, { height: 30 });
        doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold').text('Eli Company Limited', (pageW/2) - 100, 60, { width: 200, align: 'center' });
      } else {
        doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text('Eli Company Limited', (pageW/2) - 150, 40, { width: 300, align: 'center' });
      }

      if (npaBuffer) {
        doc.image(npaBuffer, pageW - 100, 25, { height: 50 });
      }
      
      doc.fillColor('#64748b').fontSize(7).font('Helvetica').text('P.O.BOX OS 1451, OSU, ACCRA-GHANA', (pageW/2) - 100, 75, { width: 200, align: 'center' });
      doc.text('Tel: +233(0) 50 162 0020 +233 050 160 3918 | +233 050 162 0021', (pageW/2) - 150, 85, { width: 300, align: 'center' });
      
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('STORAGE TANK AND VESSEL CALIBRATION', 50, 105, { align: 'center', width: 512 });

      // Watermark for first page
      if (npaBuffer) {
        doc.save();
        doc.opacity(0.05);
        doc.image(npaBuffer, 100, 250, { width: 400 });
        doc.restore();
      }

      doc.fillColor(primaryColor);
      doc.y = 135;
      const startY = doc.y;
      
      // 2. Identification Summary Blocks
      doc.rect(50, startY, 245, 90).fill(lightGray).stroke('#e2e8f0');
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('CERTIFICATE SUMMARY', 65, startY + 15);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Certificate No:`, 65, startY + 35);
      doc.fillColor(primaryColor).font('Helvetica-Bold').text(`${report.certificate.certificateNumber}`, 140, startY + 35);
      doc.fillColor('#475569').font('Helvetica').text(`Issue Date:`, 65, startY + 50);
      doc.fillColor(primaryColor).text(`${new Date(report.certificate.generatedAt).toLocaleDateString()}`, 140, startY + 50);
      doc.fillColor('#475569').text(`Review Status:`, 65, startY + 65);
      doc.fillColor(successColor).font('Helvetica-Bold').text(`APPROVED`, 140, startY + 65);

      doc.rect(315, startY, 245, 90).fill(lightGray).stroke('#e2e8f0');
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('VEHICLE IDENTIFICATION', 330, startY + 15);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Reg Number:`, 330, startY + 35);
      doc.fillColor(primaryColor).font('Helvetica-Bold').text(`${report.vehicle.registrationNumber}`, 405, startY + 35);
      doc.fillColor('#475569').font('Helvetica').text(`OMC / Bulk:`, 330, startY + 48);
      doc.fillColor(primaryColor).text(`${report.vehicle.omc || 'N/A'} / ${report.vehicle.bulkNumber || 'N/A'}`, 405, startY + 48);
      doc.fillColor('#475569').text(`Nominal Cap:`, 330, startY + 61);
      doc.fillColor(primaryColor).text(`${report.vehicle.nominalCapacity || 'N/A'}`, 405, startY + 61);
      doc.fillColor('#475569').text(`Exp Date:`, 330, startY + 74);
      const expDateStr = report.vehicle.expirationDate ? new Date(report.vehicle.expirationDate).toLocaleDateString() : 'N/A';
      doc.fillColor(primaryColor).text(`${expDateStr}`, 405, startY + 74);

      // 3. Technical Results Matrix
      doc.moveDown(8);
      let currentY = doc.y;
      
      doc.fontSize(14).font('Helvetica-Bold').fillColor(primaryColor).text('CALIBRATION MEASUREMENT RESULTS', 50);
      doc.moveDown(0.5);
      const tableTop = doc.y;
      doc.rect(50, tableTop, 510, 25).fill(primaryColor);
      doc.fillColor('white').fontSize(10).font('Helvetica-Bold');
      doc.text('PARAMETER DESCRIPTION', 65, tableTop + 8);
      doc.text('SPECIFICATION', 210, tableTop + 8);
      doc.text('MEASURED', 360, tableTop + 8);
      doc.text('VERDICT', 485, tableTop + 8);

      currentY = tableTop + 25;
      const results = reportData.results || [];
      results.forEach((r: any, i: number) => {
        if (currentY > 650) { doc.addPage(); currentY = 50; }
        if (i % 2 === 0) doc.rect(50, currentY, 510, 22).fill('#f1f5f9');
        else doc.rect(50, currentY, 510, 22).fill('white');
        
        doc.fillColor(primaryColor).font('Helvetica').fontSize(9);
        doc.text(String(r.name || 'Unknown'), 65, currentY + 7, { width: 140 });
        doc.text(`${r.range || 'N/A'} ${r.unit || ''}`, 210, currentY + 7);
        doc.text(`${r.measured || '0'} ${r.unit || ''}`, 360, currentY + 7);
        const isPass = r.status === 'PASS';
        doc.fillColor(isPass ? successColor : dangerColor).font('Helvetica-Bold').text(isPass ? 'PASSED' : 'FAILED', 485, currentY + 7);
        currentY += 22;
      });

      doc.y = currentY;

      // 4. Ownership & Registration Identity
      if (currentY > 580) { doc.addPage(); currentY = 50; } else currentY += 40;
      doc.rect(50, currentY, 510, 50).fill(lightGray).stroke('#cbd5e1');
      doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('OWNERSHIP IDENTITY & REGISTRATION', 65, currentY+12);
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Registered Owner: ${report.vehicle.ownerName || 'PENDING'}`, 65, currentY+30);
      doc.text(`Contact: ${report.vehicle.ownerEmail || 'UNVERIFIED'}`, 300, currentY+30);

      // 5. Accuracy Affidavit & QR Cryptography
      if (currentY > 640) { doc.addPage(); currentY = 50; } else currentY += 75;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text('PRECISION ACCURACY AFFIDAVIT', 50, currentY);
      doc.moveDown(0.5);
      doc.font('Helvetica').fontSize(8.2).fillColor('#334155').text('This document serves as an absolute guarantee of technical accuracy. The measured parameters listed above were captured using NIST-traceable diagnostic sensors with a precision tolerance of ±0.001%. The comparison against laboratory standards confirms that this particular vehicle maintains its structural and pneumatic integrity as defined by the master reference parameters.', 50, doc.y, { width: 380, align: 'justify', lineGap: 1.5 });

      if (qrBuffer) {
        try {
          doc.image(qrBuffer, 460, currentY - 10, { width: 80 });
          doc.fontSize(7).fillColor('#94a3b8').text('SCAN TO VERIFY', 465, currentY + 75);
        } catch (imgErr) {
          console.error('[CERT] QR Drawing error:', imgErr);
        }
      }

      doc.moveDown(4);
      const sigY = doc.y;
      doc.rect(50, sigY, 200, 0.5).stroke(primaryColor);
      doc.fontSize(10).font('Helvetica-Bold').fillColor(primaryColor).text('CERTIFIED TECHNICIAN', 50, sigY + 12);
      doc.font('Helvetica').fontSize(9).text(`Name: ${report.technician.name}`, 50, sigY + 28);
      doc.text(`ID: AUTOCAL-T${report.technician.id}`, 50, sigY + 41);
      
      doc.rect(360, sigY, 200, 0.5).stroke(primaryColor);
      doc.fontSize(10).font('Helvetica-Bold').text('VALIDATING SUPERVISOR', 360, sigY + 12);
      doc.font('Helvetica').fontSize(9).text(`Name: ${report.admin?.name || 'ELI VCS AGENT'}`, 360, sigY + 28);
      doc.text(`Sign-off Date: ${new Date().toLocaleDateString()}`, 360, sigY + 41);

      // High-Fidelity Footer Bar
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b');
      doc.text('This Certificate Shall Not Be Reproduced in Part Or Full', 0, 720, { align: 'center', width: 612 });
      doc.text('Except With Permission From The Issuing Authority', 0, 730, { align: 'center', width: 612 });

      doc.rect(0, 750, 612, 42).fill('#1a1b41');
      doc.rect(50, 762, 35, 18).fill('#ef4444');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold').text('KEEP', 55, 766);
      doc.text('THIS CERTIFICATE SAFELY', 95, 766);
      doc.text('TANK CLEANING, PRESSURE AND CALIBRATION SERVICES', 50, 766, { align: 'right', width: 512 });
    }

    doc.end();

    console.log(`[CERT] Finalized PDF transmission for ID ${reportId}`);
  } catch (err) {
    console.error('[CERT] Global route error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Critical failure during certificate rendering' });
    }
  }
}));

// 6. Reference Parameters
apiRouter.get('/reference-parameters', authenticate, asyncHandler(async (req, res) => {
  const params = await prisma.referenceParameter.findMany();
  res.json(params);
}));

apiRouter.post('/reference-parameters', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const schema = z.object({
    vehicleModel: z.string(),
    category: z.string(),
    parameterName: z.string(),
    standardValue: z.number(),
    toleranceMin: z.number(),
    toleranceMax: z.number(),
    unit: z.string()
  });

  try {
    const data = schema.parse(req.body);
    const param = await prisma.referenceParameter.create({
      data: {
        vehicleModel: data.vehicleModel,
        category: data.category,
        parameterName: data.parameterName,
        standardValue: data.standardValue,
        toleranceMin: data.toleranceMin,
        toleranceMax: data.toleranceMax,
        unit: data.unit
      }
    });
    await logAudit(req, 'REFERENCE_PARAMETER_CREATED', `Param: ${data.parameterName}, Model: ${data.vehicleModel}`);
    res.status(201).json(param);
  } catch (err) {
    res.status(400).json({ error: 'Invalid parameter data' });
  }
}));

apiRouter.put('/reference-parameters/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const schema = z.object({
    vehicleModel: z.string().optional(),
    category: z.string().optional(),
    parameterName: z.string().optional(),
    standardValue: z.number().optional(),
    toleranceMin: z.number().optional(),
    toleranceMax: z.number().optional(),
    unit: z.string().optional()
  });

  try {
    const data = schema.parse(req.body);
    const param = await prisma.referenceParameter.update({
      where: { id: parseInt(req.params.id) },
      data
    });
    await logAudit(req, 'REFERENCE_PARAMETER_UPDATED', `Param ID: ${req.params.id}`);
    res.json(param);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update parameter' });
  }
}));

apiRouter.delete('/reference-parameters/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  try {
    await prisma.referenceParameter.delete({ where: { id: parseInt(req.params.id) } });
    await logAudit(req, 'REFERENCE_PARAMETER_DELETED', `Param ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete parameter' });
  }
}));

// 7. Admin & Settings
apiRouter.get('/users', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true }
  });
  res.json(users);
}));

apiRouter.post('/users', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string(),
    role: z.enum(['admin', 'technician'])
  });

  try {
    const data = schema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(400).json({ error: 'Identity already exists in cluster' });

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role
      }
    });

    await logAudit(req, 'USER_CREATED', `Node established: ${user.email}, Role: ${user.role}`);
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (err) {
    res.status(400).json({ error: 'Protocol violation: Invalid identity data' });
  }
}));

apiRouter.put('/users/:id/role', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const { role } = req.body;
  const targetUser = await prisma.user.update({
    where: { id: parseInt(req.params.id) },
    data: { role }
  });
  await logAudit(req, 'USER_ROLE_CHANGED', `Target User: ${targetUser.email}, New Role: ${role}`);
  res.json(targetUser);
}));

apiRouter.delete('/users/:id', authenticate, isAdmin, asyncHandler(async (req, res) => {
  try {
    const idStr = req.params.id;
    const id = parseInt(idStr);
    if (isNaN(id)) return res.status(400).json({ error: 'Identity Protocol Failure: Invalid node specification.' });

    console.log(`[AUTH] Attempting to terminate node ID: ${id} by admin: ${(req as any).user.email}`);

    if (id === (req as any).user.id) {
      return res.status(400).json({ error: 'Security Violation: Cannot terminate own administrative node.' });
    }
    await prisma.user.delete({ where: { id } });
    await logAudit(req, 'USER_DELETED', `Node terminated: ID ${id}`);
    res.json({ success: true });
  } catch (err: any) {
    console.error('User deletion error:', err);
    res.status(400).json({ error: `Identity error: ${err.message || 'Failed to terminate node'}` });
  }
}));

// 10. System Settings
apiRouter.get('/settings/logos', asyncHandler(async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: { key: { in: ['logo_gsa', 'logo_elle', 'logo_npa'] } }
    });
    const result: any = {};
    settings.forEach(s => { result[s.key] = s.value; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve system logos' });
  }
}));

apiRouter.put('/settings/logos', authenticate, isAdmin, asyncHandler(async (req, res) => {
  try {
    const { logo_gsa, logo_elle, logo_npa } = req.body;
    const updates = [];
    
    if (logo_gsa !== undefined) updates.push(prisma.systemSetting.upsert({ where: { key: 'logo_gsa' }, create: { key: 'logo_gsa', value: logo_gsa }, update: { value: logo_gsa } }));
    if (logo_elle !== undefined) updates.push(prisma.systemSetting.upsert({ where: { key: 'logo_elle' }, create: { key: 'logo_elle', value: logo_elle }, update: { value: logo_elle } }));
    if (logo_npa !== undefined) updates.push(prisma.systemSetting.upsert({ where: { key: 'logo_npa' }, create: { key: 'logo_npa', value: logo_npa }, update: { value: logo_npa } }));
    
    await Promise.all(updates);
    await logAudit(req, 'SETTINGS_UPDATED', 'System logos updated');
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update system logos' });
  }
}));

apiRouter.get('/audit-logs', authenticate, isAdmin, asyncHandler(async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { timestamp: 'desc' },
    take: 100
  });
  res.json(logs);
}));

// --- Seed Logic ---
async function seed() {
  const userCount = await prisma.user.count();
  const paramCount = await prisma.referenceParameter.count();

  if (userCount === 0) {
    const adminHash = await bcrypt.hash('admin123', 10);
    const techHash = await bcrypt.hash('tech123', 10);

    await prisma.user.create({
      data: { email: 'admin@autocal.com', password: adminHash, name: 'Senior Admin', role: 'admin' }
    });
    await prisma.user.create({
      data: { email: 'tech@autocal.com', password: techHash, name: 'John Technician', role: 'technician' }
    });

    if ((await prisma.vehicle.count()) === 0) {
      // Seed a vehicle
      await prisma.vehicle.create({
        data: { 
          registrationNumber: 'KAA-123A',
          vin: 'VIN1234567890ABC', 
          make: 'Toyota', 
          model: 'Corolla', 
          year: 2022,
          bulkNumber: 'BN-8890',
          omc: 'Shell BP',
          nominalCapacity: '28,000 L',
          expirationDate: new Date('2025-12-31')
        }
      });
    }
  }

  // Seed parameters if they don't exist
  if (paramCount === 0) {
    // Seed references for Corolla
    const parameters = [
      // 1. Engine & Powertrain
      { category: 'Engine & Powertrain', parameterName: 'Engine Idle RPM', standardValue: 750, toleranceMin: 700, toleranceMax: 800, unit: 'RPM' },
      { category: 'Engine & Powertrain', parameterName: 'Engine Max RPM', standardValue: 6500, toleranceMin: 6400, toleranceMax: 6600, unit: 'RPM' },
      { category: 'Engine & Powertrain', parameterName: 'Torque Output', standardValue: 170, toleranceMin: 165, toleranceMax: 175, unit: 'Nm' },
      { category: 'Engine & Powertrain', parameterName: 'Fuel Injection Timing', standardValue: 5, toleranceMin: 4, toleranceMax: 6, unit: 'ms' },
      { category: 'Engine & Powertrain', parameterName: 'Air-Fuel Ratio', standardValue: 14.7, toleranceMin: 14.2, toleranceMax: 15.2, unit: 'ratio' },
      { category: 'Engine & Powertrain', parameterName: 'Throttle Response', standardValue: 100, toleranceMin: 95, toleranceMax: 105, unit: 'ms' },
      { category: 'Engine & Powertrain', parameterName: 'Ignition Timing', standardValue: 11, toleranceMin: 10, toleranceMax: 12, unit: 'deg' },
      { category: 'Engine & Powertrain', parameterName: 'Engine Temperature', standardValue: 90, toleranceMin: 85, toleranceMax: 95, unit: 'C' },
      { category: 'Engine & Powertrain', parameterName: 'Turbo Boost Pressure', standardValue: 0.8, toleranceMin: 0.7, toleranceMax: 0.9, unit: 'bar' },
      { category: 'Engine & Powertrain', parameterName: 'CO Emissions', standardValue: 0.2, toleranceMin: 0, toleranceMax: 0.5, unit: '%' },
      { category: 'Engine & Powertrain', parameterName: 'NOx Emissions', standardValue: 0.05, toleranceMin: 0, toleranceMax: 0.1, unit: 'g/km' },

      // 2. Transmission
      { category: 'Transmission', parameterName: 'Gear Shift Timing', standardValue: 200, toleranceMin: 150, toleranceMax: 250, unit: 'ms' },
      { category: 'Transmission', parameterName: 'Clutch Engagement', standardValue: 50, toleranceMin: 40, toleranceMax: 60, unit: '%' },
      { category: 'Transmission', parameterName: 'Transmission Fluid Temp', standardValue: 80, toleranceMin: 70, toleranceMax: 90, unit: 'C' },
      { category: 'Transmission', parameterName: 'Gear Ratio Accuracy', standardValue: 1, toleranceMin: 0.99, toleranceMax: 1.01, unit: 'ratio' },
      { category: 'Transmission', parameterName: 'Shift Pressure', standardValue: 5, toleranceMin: 4.5, toleranceMax: 5.5, unit: 'bar' },

      // 3. Wheel & Suspension
      { category: 'Wheel & Suspension', parameterName: 'Wheel Alignment - Camber', standardValue: -0.5, toleranceMin: -0.7, toleranceMax: -0.3, unit: 'deg' },
      { category: 'Wheel & Suspension', parameterName: 'Tire Pressure', standardValue: 32, toleranceMin: 30, toleranceMax: 34, unit: 'psi' },
      { category: 'Wheel & Suspension', parameterName: 'Suspension Travel', standardValue: 150, toleranceMin: 140, toleranceMax: 160, unit: 'mm' },
      { category: 'Wheel & Suspension', parameterName: 'Shock Absorber Response', standardValue: 1.2, toleranceMin: 1.0, toleranceMax: 1.4, unit: 's' },
      { category: 'Wheel & Suspension', parameterName: 'Ride Height', standardValue: 160, toleranceMin: 155, toleranceMax: 165, unit: 'mm' },

      // 4. Brake System
      { category: 'Brake System', parameterName: 'Brake Force Distribution', standardValue: 0.6, toleranceMin: 0.55, toleranceMax: 0.65, unit: 'ratio' },
      { category: 'Brake System', parameterName: 'Brake Pedal Response', standardValue: 20, toleranceMin: 15, toleranceMax: 25, unit: 'mm' },
      { category: 'Brake System', parameterName: 'ABS Activation Threshold', standardValue: 0.8, toleranceMin: 0.75, toleranceMax: 0.85, unit: 'g' },
      { category: 'Brake System', parameterName: 'Brake Fluid Pressure', standardValue: 60, toleranceMin: 50, toleranceMax: 70, unit: 'bar' },
      { category: 'Brake System', parameterName: 'Stopping Distance (100-0)', standardValue: 38, toleranceMin: 35, toleranceMax: 41, unit: 'm' },

      // 5. Electrical System
      { category: 'Electrical System', parameterName: 'Battery Voltage', standardValue: 12.6, toleranceMin: 12.2, toleranceMax: 13.0, unit: 'V' },
      { category: 'Electrical System', parameterName: 'Alternator Output', standardValue: 14.2, toleranceMin: 13.8, toleranceMax: 14.6, unit: 'V' },
      { category: 'Electrical System', parameterName: 'Starter Current Draw', standardValue: 150, toleranceMin: 120, toleranceMax: 180, unit: 'A' },

      // 6. ECU
      { category: 'ECU', parameterName: 'MAP Sensor Calibration', standardValue: 101, toleranceMin: 98, toleranceMax: 104, unit: 'kPa' },
      { category: 'ECU', parameterName: 'O2 Sensor Response', standardValue: 0.5, toleranceMin: 0.1, toleranceMax: 0.9, unit: 'V' },
      { category: 'ECU', parameterName: 'Actuator Response Timing', standardValue: 15, toleranceMin: 12, toleranceMax: 18, unit: 'ms' },

      // 7. Environmental & Thermal
      { category: 'Environmental & Thermal', parameterName: 'Cooling Efficiency', standardValue: 85, toleranceMin: 80, toleranceMax: 90, unit: '%' },
      { category: 'Environmental & Thermal', parameterName: 'Cabin Temp Control', standardValue: 22, toleranceMin: 20, toleranceMax: 24, unit: 'C' },

      // 8. ADAS & Sensor
      { category: 'ADAS & Sensor', parameterName: 'Camera Alignment', standardValue: 0, toleranceMin: -1, toleranceMax: 1, unit: 'deg' },
      { category: 'ADAS & Sensor', parameterName: 'Radar Distance Detection', standardValue: 200, toleranceMin: 195, toleranceMax: 205, unit: 'm' },

      // 9. Performance & Dynamic Calibration
      { category: 'Performance & Dynamic Calibration', parameterName: 'Acceleration (0-100)', standardValue: 9.2, toleranceMin: 8.8, toleranceMax: 9.6, unit: 's' },
      { category: 'Performance & Dynamic Calibration', parameterName: 'Fuel Consumption', standardValue: 6.5, toleranceMin: 6.0, toleranceMax: 7.0, unit: 'L/100km' },

      // 10. Diagnostic & Compliance
      { category: 'Diagnostic & Compliance', parameterName: 'System Health Status', standardValue: 100, toleranceMin: 99, toleranceMax: 100, unit: '%' },

      // 11. Core Pressure Parameters
      { category: 'Core Pressure Parameters', parameterName: 'Static Pressure', standardValue: 5, toleranceMin: 4.8, toleranceMax: 5.2, unit: 'bar' },
      { category: 'Core Pressure Parameters', parameterName: 'Dynamic Pressure', standardValue: 4.5, toleranceMin: 4.0, toleranceMax: 5.0, unit: 'bar' },
      { category: 'Core Pressure Parameters', parameterName: 'Differential Pressure (ΔP)', standardValue: 0.2, toleranceMin: 0.15, toleranceMax: 0.25, unit: 'bar' },
      { category: 'Core Pressure Parameters', parameterName: 'Maximum Pressure', standardValue: 8, toleranceMin: 7.5, toleranceMax: 8.5, unit: 'bar' },
      { category: 'Core Pressure Parameters', parameterName: 'Minimum Pressure', standardValue: 2, toleranceMin: 1.8, toleranceMax: 2.2, unit: 'bar' },

      // 12. Time-Based Parameters (Pressure)
      { category: 'Time-Based Parameters (Pressure)', parameterName: 'Pressure Build-up Time', standardValue: 500, toleranceMin: 400, toleranceMax: 600, unit: 'ms' },
      { category: 'Time-Based Parameters (Pressure)', parameterName: 'Pressure Hold Time', standardValue: 10000, toleranceMin: 9500, toleranceMax: 10500, unit: 'ms' },
      { category: 'Time-Based Parameters (Pressure)', parameterName: 'Pressure Decay Rate', standardValue: 0.01, toleranceMin: 0, toleranceMax: 0.05, unit: 'bar/s' },
      { category: 'Time-Based Parameters (Pressure)', parameterName: 'Leak Rate', standardValue: 0, toleranceMin: 0, toleranceMax: 0.1, unit: 'ml/min' },

      // 13. Environmental Parameters (Pressure)
      { category: 'Environmental Parameters (Pressure)', parameterName: 'Ambient Temperature', standardValue: 25, toleranceMin: 15, toleranceMax: 35, unit: 'C' },
      { category: 'Environmental Parameters (Pressure)', parameterName: 'Temperature-Compensated Pressure', standardValue: 5, toleranceMin: 4.9, toleranceMax: 5.1, unit: 'bar' },

      // 14. Stability & Performance (Pressure)
      { category: 'Stability & Performance (Pressure)', parameterName: 'Pressure Fluctuation', standardValue: 0.05, toleranceMin: 0, toleranceMax: 0.1, unit: 'bar' },
      { category: 'Stability & Performance (Pressure)', parameterName: 'Pressure Consistency', standardValue: 98, toleranceMin: 95, toleranceMax: 100, unit: '%' },
      { category: 'Stability & Performance (Pressure)', parameterName: 'Pressure Response Time', standardValue: 50, toleranceMin: 40, toleranceMax: 60, unit: 'ms' },

      // 15. Sensor & Calibration Parameters
      { category: 'Sensor & Calibration Parameters', parameterName: 'Sensor Output (Voltage)', standardValue: 2.5, toleranceMin: 2.4, toleranceMax: 2.6, unit: 'V' },
      { category: 'Sensor & Calibration Parameters', parameterName: 'Sensor Accuracy', standardValue: 99.5, toleranceMin: 99, toleranceMax: 100, unit: '%' },
      { category: 'Sensor & Calibration Parameters', parameterName: 'Calibration Offset', standardValue: 0, toleranceMin: -0.1, toleranceMax: 0.1, unit: 'unit' },
      { category: 'Sensor & Calibration Parameters', parameterName: 'Calibration Slope', standardValue: 1, toleranceMin: 0.95, toleranceMax: 1.05, unit: 'ratio' },

      // 16. System-Specific Pressure Parameters
      { category: 'System-Specific Pressure Parameters', parameterName: 'Fuel Pressure', standardValue: 3.5, toleranceMin: 3.2, toleranceMax: 3.8, unit: 'bar' },
      { category: 'System-Specific Pressure Parameters', parameterName: 'Oil Pressure', standardValue: 4, toleranceMin: 3.5, toleranceMax: 4.5, unit: 'bar' },
      { category: 'System-Specific Pressure Parameters', parameterName: 'Brake Hydraulic Pressure', standardValue: 80, toleranceMin: 70, toleranceMax: 90, unit: 'bar' },
      { category: 'System-Specific Pressure Parameters', parameterName: 'Cooling System Pressure', standardValue: 1.1, toleranceMin: 1.0, toleranceMax: 1.2, unit: 'bar' },
      { category: 'System-Specific Pressure Parameters', parameterName: 'Intake Manifold Pressure', standardValue: 30, toleranceMin: 25, toleranceMax: 35, unit: 'kPa' },
      { category: 'System-Specific Pressure Parameters', parameterName: 'Boost Pressure', standardValue: 1.2, toleranceMin: 1.1, toleranceMax: 1.3, unit: 'bar' },

      // 17. Safety Parameters (Pressure)
      { category: 'Safety Parameters (Pressure)', parameterName: 'Overpressure Limit', standardValue: 15, toleranceMin: 14, toleranceMax: 16, unit: 'bar' },
      { category: 'Safety Parameters (Pressure)', parameterName: 'Pressure Relief Threshold', standardValue: 12, toleranceMin: 11, toleranceMax: 13, unit: 'bar' },
      { category: 'Safety Parameters (Pressure)', parameterName: 'Leak Detection Threshold', standardValue: 0.5, toleranceMin: 0.4, toleranceMax: 0.6, unit: 'bar' },

      // 18. UST Volume & Level
      { category: 'UST Volume & Level', parameterName: 'Tank Volume (Capacity)', standardValue: 50000, toleranceMin: 49000, toleranceMax: 51000, unit: 'L' },
      { category: 'UST Volume & Level', parameterName: 'Product Level (Fuel)', standardValue: 25000, toleranceMin: 0, toleranceMax: 50000, unit: 'L' },
      { category: 'UST Volume & Level', parameterName: 'Water Level (Bottom)', standardValue: 0, toleranceMin: 0, toleranceMax: 50, unit: 'mm' },
      { category: 'UST Volume & Level', parameterName: 'Ullage (Empty Space)', standardValue: 25000, toleranceMin: 0, toleranceMax: 50000, unit: 'L' },

      // 19. UST Contamination
      { category: 'UST Contamination', parameterName: 'Water Content', standardValue: 0.01, toleranceMin: 0, toleranceMax: 0.05, unit: '%' },
      { category: 'UST Contamination', parameterName: 'Sediment/Sludge Level', standardValue: 5, toleranceMin: 0, toleranceMax: 10, unit: 'mm' },
      { category: 'UST Contamination', parameterName: 'Particulate Contamination', standardValue: 10, toleranceMin: 0, toleranceMax: 20, unit: 'mg/L' },
      { category: 'UST Contamination', parameterName: 'Microbial Contamination', standardValue: 0, toleranceMin: 0, toleranceMax: 100, unit: 'CFU/mL' },

      // 20. UST Fuel Quality
      { category: 'UST Fuel Quality', parameterName: 'Density @ 15°C', standardValue: 840, toleranceMin: 820, toleranceMax: 860, unit: 'kg/m³' },
      { category: 'UST Fuel Quality', parameterName: 'Fuel Temperature', standardValue: 18, toleranceMin: 10, toleranceMax: 25, unit: 'C' },
      { category: 'UST Fuel Quality', parameterName: 'Viscosity @ 40°C', standardValue: 3, toleranceMin: 2, toleranceMax: 4.5, unit: 'mm²/s' },
      { category: 'UST Fuel Quality', parameterName: 'Flash Point', standardValue: 55, toleranceMin: 52, toleranceMax: 300, unit: 'C' },
      { category: 'UST Fuel Quality', parameterName: 'Octane/Cetane Number', standardValue: 51, toleranceMin: 48, toleranceMax: 60, unit: 'index' },

      // 21. UST Environmental & Safety
      { category: 'UST Environmental & Safety', parameterName: 'Vapor Pressure', standardValue: 50, toleranceMin: 40, toleranceMax: 60, unit: 'kPa' },
      { category: 'UST Environmental & Safety', parameterName: 'Gas Concentration (VOC)', standardValue: 0, toleranceMin: 0, toleranceMax: 50, unit: 'ppm' },
      { category: 'UST Environmental & Safety', parameterName: 'Oxygen Level (Safety)', standardValue: 20.9, toleranceMin: 19.5, toleranceMax: 23.5, unit: '%' },

      // 22. UST Sensor & Monitoring
      { category: 'UST Sensor & Monitoring', parameterName: 'Probe Accuracy', standardValue: 99.9, toleranceMin: 99.5, toleranceMax: 100, unit: '%' },
      { category: 'UST Sensor & Monitoring', parameterName: 'Alarm Threshold (High)', standardValue: 95, toleranceMin: 90, toleranceMax: 98, unit: '%' },
      { category: 'UST Sensor & Monitoring', parameterName: 'Alarm Threshold (Low)', standardValue: 10, toleranceMin: 5, toleranceMax: 15, unit: '%' },

      // 23. UST Cleaning Process
      { category: 'UST Cleaning Process', parameterName: 'Sludge Removal Volume', standardValue: 200, toleranceMin: 0, toleranceMax: 1000, unit: 'L' },
      { category: 'UST Cleaning Process', parameterName: 'Cleaning Duration', standardValue: 240, toleranceMin: 120, toleranceMax: 480, unit: 'min' },
      { category: 'UST Cleaning Process', parameterName: 'Cleaning Flow Rate', standardValue: 500, toleranceMin: 300, toleranceMax: 800, unit: 'L/min' },
      { category: 'UST Cleaning Process', parameterName: 'Number of Cleaning Cycles', standardValue: 3, toleranceMin: 2, toleranceMax: 5, unit: 'count' },

      // 24. UST Post-Cleaning Validation
      { category: 'UST Post-Cleaning Validation', parameterName: 'Residual Contamination', standardValue: 0, toleranceMin: 0, toleranceMax: 1, unit: 'mg/L' },
      { category: 'UST Post-Cleaning Validation', parameterName: 'Final Pressure Calibration Result', standardValue: 1.5, toleranceMin: 1.4, toleranceMax: 1.6, unit: 'bar' },
      { category: 'UST Post-Cleaning Validation', parameterName: 'Tank Dryness Status', standardValue: 1, toleranceMin: 1, toleranceMax: 1, unit: 'bool' },

      // 25. UST Compliance & Safety Checks
      { category: 'UST Compliance & Safety Checks', parameterName: 'Overfill Protection Status', standardValue: 1, toleranceMin: 1, toleranceMax: 1, unit: 'bool' },
      { category: 'UST Compliance & Safety Checks', parameterName: 'Leak Detection Status', standardValue: 1, toleranceMin: 1, toleranceMax: 1, unit: 'bool' },
      { category: 'UST Compliance & Safety Checks', parameterName: 'Regulatory Compliance Status', standardValue: 1, toleranceMin: 1, toleranceMax: 1, unit: 'bool' },
    ];

    await prisma.referenceParameter.createMany({
      data: parameters.map(p => ({ ...p, vehicleModel: 'Corolla' }))
    });

    console.log('Database seeded successfully');
  }
};

// --- Final API Catch-all ---
apiRouter.all('*', (req, res) => {
  res.status(404).json({ error: `API Path ${req.method} ${req.url} not found in this node's registry.` });
});

// --- Start Server ---
async function start() {
  // 1. Start Listening IMMEDIATELY to avoid platform "Starting Server..." splash screens
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYSTEM] Kernel Online @ http://localhost:${PORT}`);
    console.log(`[SYSTEM] Priority: Calibration Registry & Laboratory Node`);
  });

  // 2. Background Database Verification & Seeding
  const p = getPrisma();
  if (p) {
    console.log('[DATABASE] Background connection check initiated...');
    p.$connect()
      .then(() => {
        console.log('[DATABASE] Connection established. Seeding...');
        dbIsOnline = true;
        return seed();
      })
      .then(() => {
        console.log('[DATABASE] Initialization successful.');
      })
      .catch((err: any) => {
        console.warn('[DATABASE] Warning: Background database initialization failed. Falling back to Mock DB.');
        console.warn(`[DATABASE] Detail: ${err.message}`);
        dbIsOnline = false;
        return seedMock();
      });
  } else {
    console.warn('[DATABASE] Status: MySQL connection inactive (misconfigured target). Falling back to Mock DB.');
    dbIsOnline = false;
    seedMock();
  }

  // 3. Setup Frontend Delivery (Vite or Static)
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('[SYSTEM] Engaging Vite Middleware...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[SYSTEM] Vite Middleware active.');
    } catch (err) {
      console.error('[SYSTEM] Vite initialization failed:', err);
    }
  } else {
    try {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
      console.log('[SYSTEM] Static asset distribution active.');
    } catch (err) {
      console.error('[SYSTEM] Static asset serving failed:', err);
    }
  }

  // 4. Global Error Handler (MUST BE LAST in the middleware stack)
  // Note: We attach this after everything else is registered.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const path = req.originalUrl || req.url;
    
    // Log error for diagnostics
    console.error(`[ERROR] @ ${path}:`, err.name || 'Error', err.message);

    // Custom handling for Prisma errors specifically for JSON API
    if (path.startsWith('/api')) {
      const isPrismaError = err.name === 'PrismaClientInitializationError' || 
                           err.name === 'PrismaClientKnownRequestError' || 
                           err.isPrismaOffline ||
                           (err.message && err.message.includes('PrismaClient'));

      if (isPrismaError) {
        return res.status(503).json({
          error: 'Database Unavailable',
          details: 'The connection to the MySQL database failed. If running locally, ensure MySQL is active. If on Cloud, verify DATABASE_URL secret.',
          reason: err.message,
          path
        });
      }

      return res.status(500).json({ 
        error: 'Technical Failure', 
        details: err.message || 'An internal system error occurred.',
        path
      });
    }

    // Default Express error handling for non-API routes
    if (res.headersSent) {
      return next(err);
    }
    // Capture to Sentry if initialized
    try {
      if (SENTRY_DSN) Sentry.captureException(err);
    } catch (sErr) {
      console.error('[SENTRY] capture failed:', sErr);
    }

    res.status(500).send('Internal Server Error');
  });
}

// Only auto-start the HTTP listener when NOT running on Vercel (serverless)
if (!process.env.VERCEL) {
  start().catch(err => {
    console.error('Failed to start server:', err);
  });
}

// Export the Express app for serverless adapters (Vercel / Netlify / etc.)
export default app;
