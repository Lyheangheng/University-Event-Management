# University Event Management and Attendance Verification System

A modern LINE OA / LIFF-integrated event management and verification platform built with Next.js, NestJS, Prisma, Supabase PostgreSQL, and Cloudflare R2 object storage.

---

## Production Deployment

- **Frontend Application**: [https://university-event-management-web-phi.vercel.app](https://university-event-management-web-phi.vercel.app)
- **Backend API**: [https://university-event-api.onrender.com](https://university-event-api.onrender.com)
- **API Health Endpoint**: `https://university-event-api.onrender.com/api/health`
- **LINE LIFF Application ID**: `2011689671-SKaMIQlb`

---

## Purpose

This system replaces traditional manual attendance sign-in sheets and unverified Google Forms with a secure, automated LINE/LIFF-based event attendance solution. Using persistent dual QR codes (Check-In & Check-Out) displayed on event venue projectors, students can seamlessly scan, authenticate via LINE, submit photo proof of attendance, and receive automated notifications while administrators gain real-time attendance tracking and proof verification capabilities.

---

## Main Roles

1. **Student**: Scans persistent venue QR codes, authenticates via LINE/LIFF, submits photo proof and feedback during active time windows, and views attendance status.
2. **Administrator**: Manages university events, controls persistent venue projector displays, oversees student attendance records, verifies proof photos, and manages event life-cycles.
3. **Event Projector / Operator**: Venue display system showing live, time-synced persistent venue QR codes and event status to students.

---

## Student Flow

```text
Event Venue Projector (Persistent QR)
  │
  ├── 1. Student scans QR with mobile phone camera / LINE scanner
  │
  ├── 2. Opens LINE Official Account / LIFF Container
  │
  ├── 3. LINE Authentication verifies ID Token & resolves Student Record
  │
  ├── 4. System issues application JWT & renders Read-Only Identity Form
  │
  ├── 5. Student uploads photo proof of presence (+ optional feedback)
  │
  └── 6. Backend records CHECK_IN / CHECK_OUT timestamp & sends confirmation
```

---

## Admin Flow

```text
Administrator Dashboard (`/admin`)
  │
  ├── 1. Admin Login (Username & Password -> Signed JWT)
  │
  ├── 2. Event Management (Create, Edit, Delete, View Events)
  │
  ├── 3. Venue Projector Display (`/admin/events/[id]/projector/check-in` & `check-out`)
  │
  ├── 4. Attendance Dashboard (`/admin/events/[id]/attendance`)
  │
  └── 5. Secure Proof Inspection (Stream photo proofs via protected proxy route)
```

---

## Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: NestJS 10, TypeScript, RxJS, Passport.js, JWT
- **Database**: Supabase PostgreSQL + Prisma ORM (TIMESTAMPTZ support)
- **Authentication**: LINE Login (LIFF SDK v2) + Application Bearer JWT + bcrypt for Admin credentials
- **Object Storage**: Cloudflare R2 / AWS S3 SDK integration (`S3StorageProvider` & `LocalStorageProvider`)
- **Messaging**: LINE Official Account & Messaging API Push Client
- **Hosting / Deployment**: Vercel (Frontend), Render (Backend API), Supabase (Database), Cloudflare (R2 Storage)

---

## QR Architecture

Each event possesses **two separate persistent QR codes** that remain identical for the entire lifetime of the event:

- **CHECK_IN QR**:
  - **Window**: `event.startTime` → `event.startTime + 30 minutes`
  - **URL**: `https://liff.line.me/2011689671-SKaMIQlb?token={CHECK_IN_SESSION_TOKEN}`

- **CHECK_OUT QR**:
  - **Window**: `event.endTime - 30 minutes` → `event.endTime + 30 minutes`
  - **URL**: `https://liff.line.me/2011689671-SKaMIQlb?token={CHECK_OUT_SESSION_TOKEN}`

Both QR codes are persistent, stored permanently in the `attendance_sessions` database table, and do not regenerate every time a window opens. The backend server clock is the sole authority enforcing window validity (`serverNow >= windowStart && serverNow <= windowEnd`).

---

## Security Architecture

- **JWT Authentication**: Application Bearer JWT protects all student submission and profile endpoints.
- **Role-Based Authorization**: `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')` protect all admin endpoints.
- **Production Guard**: Development header fallback (`x-dev-student-id`) is strictly disabled in production (`isDev=false`).
- **Private Object Storage**: Cloudflare R2 bucket is private. Photo proof images are streamed strictly via an authenticated admin proxy endpoint (`GET /api/attendance/uploads/proofs/:filename`).
- **Sanitization & Traversal Guards**: Path traversal attempts (`..%2F..%2F.env`) and unsupported file MIME types are rejected.
- **Server-Authoritative Timing**: Attendance windows are computed server-side; client clocks cannot bypass bounds.
- **Duplicate Protection**: Unique composite keys (`@@unique([studentId, eventId])`) enforce single check-in / check-out records per student per event.

---

## Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Copy `.env.example` to `.env`.

3. **Database Migration & Seed**:
   ```bash
   npm run prisma:generate
   npm run prisma:seed
   ```

4. **Start Development Servers**:
   - Backend API: `npm run dev:api` (Runs on `http://localhost:3001`)
   - Frontend Web: `npm run dev:web` (Runs on `http://localhost:3000`)

5. **Run Regression Tests**:
   ```bash
   npm test --workspace=apps/api
   ```

---

## Repository Structure

```text
University-Event-Management/
├── apps/
│   ├── web/                     # Next.js Frontend Application
│   └── api/                     # NestJS Backend API Service
├── packages/
│   └── shared/                  # Shared TypeScript types
├── prisma/                      # Database Schema & Seed scripts
├── FINAL_SYSTEM_ARCHITECTURE.md # System architecture documentation
├── FINAL_FEATURE_LIST.md        # Feature list breakdown
├── FINAL_DEMO_GUIDE.md          # Step-by-step presentation demo guide
├── FINAL_PROJECT_SUMMARY.md     # Final university report summary
└── PHASE_16.22_REPORT.txt       # Final Phase 16.22 report
```
