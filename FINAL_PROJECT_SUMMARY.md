# Final Project Summary & University Submission Document

## University Event Management and Attendance Verification System

---

### 1. Project Title
**University Event Management and Attendance Verification System**

---

### 2. Problem Statement
Traditional university event attendance tracking relies heavily on manual paper sign-in sheets or unverified Google Forms. These legacy methods suffer from critical vulnerabilities:
- High vulnerability to attendance fraud ("proxy signing" for absent peers).
- Lack of verified physical presence proof during check-in and check-out.
- Slow manual data entry and error-prone record consolidation.
- Absence of real-time attendance statistics for event organizers.
- Fragmented student communication channels.

---

### 3. System Objectives
1. **Automate Attendance Verification**: Replace paper sign-in sheets with a mobile-first LINE/LIFF QR scanning system.
2. **Ensure Authentic Presence**: Require photo proof of presence during check-in and check-out windows.
3. **Provide Persistent Venue QRs**: Utilize static persistent QR codes on venue projectors that do not expire or regenerate dynamically.
4. **Enforce Server-Authoritative Windows**: Restrict check-in/out window validity strictly on the backend server clock.
5. **Protect Student Data**: Secure photo proofs in private object storage accessible only by authenticated administrators.

---

### 4. Target Users
- **University Students**: Scan venue QR codes, authenticate via LINE, and submit attendance proof.
- **Event Organizers & Staff**: Monitor projector screens, manage event schedules, and audit student attendance.
- **University Administrators**: Manage events, inspect attendance records, verify photo proofs, and export reports.

---

### 5. System Roles
1. **Student Role**: Access public event listings, authenticate via LIFF, submit photo proof and feedback for active sessions.
2. **Administrator Role**: Authenticate via admin portal, manage events (CRUD), access projector displays, inspect records, and view photo proofs.
3. **Projector / Display System**: Venue screen display presenting persistent QR codes and time-synced status banners.

---

### 6. Main Features
- **Public Student Event Portal**: Browse event information, target groups, locations, and schedules.
- **LINE LIFF Single-Sign-On**: Instant authentication using LINE account credentials via `@line/liff`.
- **Read-Only Student Identity**: Auto-fills and locks student profile fields (`studentId`, `faculty`, `major`, `year`) to prevent identity tampering.
- **Persistent Dual-QR Architecture**: Static Check-In and Check-Out QR codes stored permanently in the database per event.
- **Photo Proof Upload**: Mandatory submission of JPEG/PNG/WebP photo proof of presence.
- **Admin Event & Attendance Console**: Full event CRUD, real-time attendance management, and protected photo proof streaming.

---

### 7. Technology Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: NestJS 10, TypeScript, RxJS, Passport.js, JWT
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Authentication**: LINE LIFF SDK v2 + Bearer JWT + bcrypt for Admin
- **Storage**: Cloudflare R2 (S3-compatible SDK integration)
- **Messaging**: LINE Official Account & Messaging API Push Client
- **Hosting**: Vercel (Frontend), Render (Backend API)

---

### 8. System Architecture
The system follows a modern decoupled architecture:
- **Frontend Layer**: Next.js App Router deployed on Vercel handling public student views, admin console, and projector screens.
- **API Services Layer**: NestJS REST API deployed on Render handling authentication, business logic, storage abstraction, and LINE messaging.
- **Persistence Layer**: Managed PostgreSQL database on Supabase managed via Prisma ORM.
- **Cloud Storage Layer**: Cloudflare R2 private bucket for encrypted proof photo storage.
- **External Integration Layer**: LINE Official Account Messaging API and LINE Login / LIFF v2.

---

### 9. Database Overview
Prisma schema defines 5 relational models:
- `Student`: `id`, `studentId` (unique), `fullName`, `year`, `faculty`, `major`, `lineUserId` (unique).
- `Admin`: `id`, `username` (unique), `passwordHash`, `name`.
- `Event`: `id`, `title`, `description`, `date`, `startTime`, `endTime`, `location`, `targetGroup`, `imageUrl`, `createdById`.
- `AttendanceSession`: `id`, `eventId`, `sessionType` (`CHECK_IN` | `CHECK_OUT`), `token` (unique), `startTime`, `endTime`.
- `Attendance`: `id`, `studentId`, `eventId`, `checkInTime`, `checkInProofUrl`, `checkOutTime`, `checkOutProofUrl`, `feedback`, `status` (`INCOMPLETE` | `COMPLETED`).
  - Constraint: `@@unique([studentId, eventId])` enforces 1 attendance record per student per event.

---

### 10. Authentication Flow
- **Student**: Scan QR -> Open LIFF -> Send LINE `idToken` to `/api/line/liff-auth` -> Resolve/Link `Student` -> Receive signed Bearer JWT -> Attach `Authorization: Bearer <JWT>` to attendance submissions.
- **Admin**: Enter credentials at `/admin/login` -> POST `/api/auth/admin/login` -> Verify bcrypt password hash -> Receive signed Admin JWT -> Attach Bearer token to admin API calls.

---

### 11. Attendance Flow
1. **CHECK_IN**: Student scans Check-In QR -> Opens LIFF form -> Uploads photo proof -> Backend checks `serverNow >= event.startTime && serverNow <= event.startTime + 30 mins` -> Uploads photo to R2 -> Saves `checkInTime` and proof URL.
2. **CHECK_OUT**: Student scans Check-Out QR -> Opens LIFF form -> Uploads photo proof -> Backend checks `serverNow >= event.endTime - 30 mins && serverNow <= event.endTime + 30 mins` -> Uploads photo to R2 -> Saves `checkOutTime` and updates status to `COMPLETED`.

---

### 12. QR Architecture
- **Persistent Dual-QR**: Check-In and Check-Out QR codes remain identical throughout the lifetime of the event.
- **Token Persistence**: Cryptographically secure 256-bit hex tokens generated on event creation and saved to `attendance_sessions`.
- **LIFF Handoff URL**: `https://liff.line.me/2011689671-SKaMIQlb?token={SESSION_TOKEN}`.

---

### 13. LINE / LIFF Integration
- **LINE LIFF App ID**: `2011689671-SKaMIQlb`.
- **LINE Messaging API**: Pushes broadcast event announcements on event creation and targeted confirmation push messages upon attendance check-in/out.

---

### 14. Cloudflare R2 Proof Storage
- **Private Storage**: Student photo proofs uploaded to private R2 bucket (`proofs/` subfolder).
- **Protected Admin Streaming Proxy**: `GET /api/attendance/uploads/proofs/:filename` requires Admin Bearer JWT. Direct unauthenticated HTTP access is blocked.

---

### 15. Security Measures
- Stateless Bearer JWT authentication for student and admin routes.
- Role-based authorization (`@Roles('ADMIN')`) for administrative endpoints.
- Production guard disabling development header bypass (`x-dev-student-id`) when `NODE_ENV=production`.
- Path traversal protection (`..%2F`) and file MIME type validation (JPEG, PNG, WebP).
- Server-authoritative time-window enforcement preventing client clock tampering.

---

### 16. Deployment Architecture
- **Frontend**: Vercel Serverless Edge Network (`university-event-management-web-phi.vercel.app`).
- **Backend API**: Render Web Service (`university-event-api.onrender.com`).
- **Database**: Supabase Managed PostgreSQL Cluster.
- **Object Storage**: Cloudflare R2 Object Storage.

---

### 17. Testing Summary
- **Regression Suite**: `npm test` executed on `apps/api` -> **14 / 14 Passed** (100% pass rate).
- **API Build**: `npm run build` on `apps/api` -> **PASSED** (0 errors).
- **Web Build**: `npm run build` on `apps/web` -> **PASSED** (0 errors).
- **Production Audit**: Verified health endpoints, CORS, admin auth, LIFF auth, R2 security, and time window bounds on live production URLs.

---

### 18. Known Limitations
1. **In-Memory LINE Notification Deduplication**: The process-level deduplication cache for LINE push notifications is stored in memory and resets upon backend server restart. Database session lookups prevent duplicate DB creation.
2. **Free-Tier Render Cold Starts**: Initial cold start requests on Render free tier may experience up to 50 seconds latency before spinning up server instances.

---

### 19. Future Improvements
- Migration of LINE notification deduplication state to Redis cache.
- Export of attendance records to PDF and Excel format.
- Multi-channel notification support (Email / SMS integration).
