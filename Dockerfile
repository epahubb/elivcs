### Multi-stage Dockerfile for production
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including dev for build tools)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build frontend
COPY . .
RUN npm run build

# Remove dev deps to reduce final image size
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy production artifacts and dependencies from builder
COPY --from=builder /app .

EXPOSE 3000

# Start the server using tsx (included in dependencies)
CMD ["npx", "tsx", "server.ts"]
