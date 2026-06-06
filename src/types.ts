export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'technician';
}

export interface Vehicle {
  id: number;
  registrationNumber: string;
  vin?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  bulkNumber?: string | null;
  omc?: string | null;
  expirationDate?: string | null;
  nominalCapacity?: string | null;
  lastCalibrationDate: string | null;
  imageUrl?: string | null;
  ownerName?: string | null;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
}

export interface CalibrationReport {
  id: number;
  vehicle: Vehicle;
  technician: User;
  admin?: User;
  adminId?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  adminComment?: string | null;
  createdAt: string;
  reportData: {
    results: {
      name: string;
      measured: number;
      standard: number;
      range: string;
      unit: string;
      status: 'PASS' | 'FAIL';
    }[];
    overallStatus: string;
  };
  reportDataJson?: string;
  certificate?: {
    certificateNumber: string;
    generatedAt: string;
  };
}

export interface AuditLog {
  id: number;
  userId?: number | null;
  userEmail?: string | null;
  action: string;
  details?: string | null;
  timestamp: string;
}
