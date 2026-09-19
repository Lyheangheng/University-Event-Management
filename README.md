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
