# University Event Management and Attendance Verification System

A modern monorepo setup for the University Event Management and Attendance Verification System foundation.

## Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend**: NestJS, TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Monorepo**: npm workspaces

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
├── prisma/           # Prisma schema & database configuration
│
├── .env.example      # Template environment variables
├── .gitignore        # Git ignore directives
├── docker-compose.yml# PostgreSQL Docker compose service
├── package.json      # Monorepo root configuration & scripts
└── README.md         # Project documentation
```

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (v9 or higher recommended)
- Docker Desktop / Docker Engine

## Setup & Installation

1. **Clone the repository and navigate to the project directory**:
   ```bash
   cd university-event-system
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Start PostgreSQL Database**:
   ```bash
   docker compose up -d
   ```

## Development

- **Start Backend API (`apps/api`)**:
  ```bash
  npm run dev:api
  ```
  The NestJS API will start on `http://localhost:3001`.

- **Start Frontend Web (`apps/web`)**:
  ```bash
  npm run dev:web
  ```
  The Next.js Web app will start on `http://localhost:3000`.

- **Check API Health Endpoint**:
  ```bash
  curl http://localhost:3001/health
  ```
  Expected response:
  ```json
  {
    "status": "ok"
  }
  ```

- **Prisma Schema Commands**:
  ```bash
  npm run prisma:validate
  npm run prisma:generate
  ```

## File & Image Storage Handling

- **Storage Abstraction**: The backend uses `StorageService` with a flexible provider interface.
- **Local Storage Provider**: Set `STORAGE_PROVIDER=local` in `.env`. Uploaded files are stored in `apps/api/uploads/proofs/` (ignored by Git).
- **Supported File Types**: JPEG (`.jpg`, `.jpeg`), PNG (`.png`), WebP (`.webp`).
- **Maximum File Size**: 5 MB (`5 * 1024 * 1024` bytes).
- **Security Protections**: Server-generated random filenames, client filename stripping, path traversal defense, and exact Content-Type headers.
- **Testing Storage Handling**: Run `node test_storage_unit.js` to execute unit/isolated storage tests.
- **Production Reminder**: For multi-server or serverless production deployments, configure object storage (e.g., S3-compatible or Cloudinary) via a custom `StorageProvider` implementation.

