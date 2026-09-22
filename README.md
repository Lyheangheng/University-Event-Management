# University Event Management and Attendance Verification System

A modern monorepo setup for the University Event Management and Attendance Verification System.

## Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT Bearer Authentication & Admin Role Guards
- **Integration**: LINE Messaging API + LINE Login + LIFF Integration
- **Storage**: Flexible StorageService Abstraction (`LocalStorageProvider` for development, `S3StorageProvider` for production cloud object storage)
- **Monorepo**: npm workspaces

---

## Repository Structure

```text
university-event-system/
│
├── apps/
│   ├── web/          # Next.js Frontend Application
│   └── api/          # NestJS Backend API
│
├── packages/
│   └── shared/       # Shared TypeScript package
│
├── prisma/           # Prisma schema & database migrations
│
├── .env.example      # Production & Development environment template
├── .gitignore        # Git ignore directives
├── docker-compose.yml# PostgreSQL Docker compose service
├── package.json      # Monorepo root configuration & scripts
└── README.md         # Project documentation
```

---

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL database (Local Docker or Managed Cloud Database)

---

## Local Development Setup

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Start Local PostgreSQL Database**:
   ```bash
   docker compose up -d
   ```

4. **Run Database Migrations & Seed Data**:
   ```bash
   npm run prisma:generate
   npm run prisma:seed
   ```

5. **Start Development Servers**:
   - **Backend API (`apps/api`)**: `npm run dev:api` (Runs on `http://localhost:3001`)
   - **Frontend Web (`apps/web`)**: `npm run dev:web` (Runs on `http://localhost:3000`)

6. **Check API Health Endpoint**:
   ```bash
   curl http://localhost:3001/api/health
   ```
   Expected response:
   ```json
   {
     "success": true,
     "data": {
       "status": "ok",
       "database": "connected"
     }
   }
   ```

---

## Production Deployment Guide

### 1. Architecture Overview
- **Backend Service**: Hosted NestJS Node.js web server.
- **Frontend Service**: Hosted Next.js App Router application (Vercel / AWS Amplify / Docker).
- **Database**: Managed PostgreSQL instance (Supabase / AWS RDS / Neon / Railway).
- **Object Storage**: S3-compatible cloud storage bucket (AWS S3 / Cloudflare R2 / DigitalOcean Spaces).

### 2. Environment Variables Configuration

#### Backend API (`apps/api`) Production Environment:
```env
DATABASE_URL="postgresql://<user>:<password>@<db-host>:5432/<dbname>?schema=public"
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://<your-production-frontend-domain>"

STORAGE_PROVIDER=s3
S3_BUCKET="<your-s3-bucket-name>"
S3_REGION="<your-s3-region>"
S3_ACCESS_KEY_ID="<your-s3-access-key>"
S3_SECRET_ACCESS_KEY="<your-s3-secret-key>"
S3_ENDPOINT="" # Optional S3 API endpoint if using Cloudflare R2 / MinIO

ADMIN_INIT_USERNAME="<your-production-admin-username>"
ADMIN_INIT_PASSWORD="<your-secure-production-admin-password>"

JWT_SECRET="<generate-secure-random-64-char-string>"
JWT_EXPIRES_IN="1d"

LINE_CHANNEL_ID="<your-line-channel-id>"
LINE_CHANNEL_SECRET="<your-line-channel-secret>"
LINE_CHANNEL_ACCESS_TOKEN="<your-line-channel-access-token>"
```

#### Frontend Web (`apps/web`) Production Environment:
```env
NEXT_PUBLIC_API_URL="https://<your-production-backend-domain>"
NEXT_PUBLIC_LIFF_ID="<your-production-liff-id>"
```

> [!CAUTION]
> **Secret Protection**: Never expose `JWT_SECRET`, `LINE_CHANNEL_SECRET`, `DATABASE_URL`, or `S3_SECRET_ACCESS_KEY` to client builds. Only client-intended variables starting with `NEXT_PUBLIC_` may be defined in the web environment.

### 3. Database Migration & Deployment Procedure
Deploy Prisma schema migrations to production without resetting the database:
```bash
npx prisma migrate deploy
```

### 4. LINE Official Account & Webhook Setup
1. Log into [LINE Developers Console](https://developers.line.biz/).
2. Under Messaging API Channel, configure the Webhook URL:
   ```text
   https://<your-production-backend-domain>/api/line/webhook
   ```
3. Enable "Use Webhook" and verify HMAC signature validation remains active.

### 5. LIFF Endpoint Configuration
1. Under LIFF Channel, create/configure your LIFF Application.
2. Set Endpoint URL to:
   ```text
   https://<your-production-frontend-domain>/attendance/session/
   ```
3. Set Scopes to `profile`, `openid`.

---

## File & Image Storage Handling

- **Storage Abstraction**: The backend uses `StorageService` with a flexible provider pattern (`LocalStorageProvider` and `S3StorageProvider`).
- **Validation**: Enforces JPEG/PNG/WebP image formats, 5MB file size limit, random UUID filenames, and strict path traversal protections across all environments.
- **Unit Testing**: Execute `node test_storage_unit.js` to run isolated storage provider verification tests.
