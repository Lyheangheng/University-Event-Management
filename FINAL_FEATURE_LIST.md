# Final Feature List Specification

## University Event Management and Attendance Verification System

This document provides a comprehensive inventory of all functional features implemented, verified, and active in the production environment, followed by an explicit list of excluded features.

---

## 1. Student Features

| Feature Name | Description | Status |
| :--- | :--- | :---: |
| **Browse Upcoming Events** | View list of published university events with titles, dates, times, locations, and descriptions. | ACTIVE |
| **View Event Details** | Inspect detailed information for a specific event including target group and event banners. | ACTIVE |
| **Scan Persistent Venue QR** | Scan static check-in and check-out QR codes displayed on venue projectors using mobile camera or LINE app. | ACTIVE |
| **LINE / LIFF Authentication** | Single-click authentication using LINE account credentials via LIFF SDK v2. | ACTIVE |
| **Student Account Linking** | Automatic resolution and linkage of student record (`studentId`, `faculty`, `major`, `year`) with `lineUserId`. | ACTIVE |
| **Read-Only Identity Banner** | Renders student profile details in an uneditable format to prevent identity spoofing during attendance submission. | ACTIVE |
| **CHECK_IN Attendance** | Submit check-in verification within the active time window (`startTime` → `startTime + 30 mins`). | ACTIVE |
| **CHECK_OUT Attendance** | Submit check-out verification within the active time window (`endTime - 30 mins` → `endTime + 30 mins`). | ACTIVE |
| **Photo Proof Upload** | Capture/upload live photo proof of presence (JPEG, PNG, WebP format, up to 5MB limit). | ACTIVE |
| **Feedback / Recommendation** | Optional submission of text feedback or recommendation (up to 1000 characters). | ACTIVE |
| **Attendance Confirmation** | View immediate on-screen confirmation of recorded attendance timestamp and status. | ACTIVE |
| **Friendly Error & Loading UX** | Human-readable error messages for closed windows, expired tokens, or unauthenticated sessions. | ACTIVE |

---

## 2. Administrator Features

| Feature Name | Description | Status |
| :--- | :--- | :---: |
| **Admin Authentication** | Secure username/password login returning signed JWT access token (`/admin/login`). | ACTIVE |
| **Create Event** | Create new university events with title, description, date, start/end times, location, target group, and image URL. | ACTIVE |
| **Edit Event** | Update existing event details and schedules with immediate system-wide persistence. | ACTIVE |
| **Delete Event** | Remove events along with associated sessions while preserving database integrity. | ACTIVE |
| **View Event List** | Administrative console overview (`/admin`) displaying all events with action shortcuts. | ACTIVE |
| **Attendance Dashboard** | Dedicated attendance inspection view (`/admin/events/[id]/attendance`) listing student records. | ACTIVE |
| **View Student Identity** | Inspect student ID, full name, faculty, major, and academic year for every attendee. | ACTIVE |
| **View Attendance Timestamps** | Review exact UTC check-in and check-out timestamps for verified student attendances. | ACTIVE |
| **View Student Feedback** | Read optional student feedback and event recommendations submitted during attendance. | ACTIVE |
| **View Photo Proof Images** | Stream and inspect student photo proof uploads securely via protected admin proxy route. | ACTIVE |
| **CHECK_IN Projector Display** | Launch full-screen projector view (`/admin/events/[id]/projector/check-in`) displaying persistent Check-In QR. | ACTIVE |
| **CHECK_OUT Projector Display** | Launch full-screen projector view (`/admin/events/[id]/projector/check-out`) displaying persistent Check-Out QR. | ACTIVE |

---

## 3. System & Infrastructure Features

| Feature Name | Description | Status |
| :--- | :--- | :---: |
| **Persistent Dual-QR Model** | Each event possesses distinct, static `CHECK_IN` and `CHECK_OUT` QR session tokens stored in DB. | ACTIVE |
| **Server-Authoritative Timing** | Server clock enforces timing bounds (`serverNow >= windowStart && serverNow <= windowEnd`). | ACTIVE |
| **LINE Push Notifications** | Automated push messages sent via LINE Messaging API for event announcements and submission receipts. | ACTIVE |
| **JWT Authorization** | Stateless Bearer JWT authentication for student API requests and admin role guards. | ACTIVE |
| **Role-Based Guards** | `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles('ADMIN')` protecting administrative endpoints. | ACTIVE |
| **Cloudflare R2 Object Storage** | S3-compatible cloud object storage for storing photo proof files in private bucket storage. | ACTIVE |
| **Protected Proof Streaming** | Admin-only image streaming proxy (`GET /api/attendance/uploads/proofs/:filename`) preventing direct access. | ACTIVE |
| **Production Dev Guard** | Hardened configuration disabling `x-dev-student-id` header bypass in production (`isDev=false`). | ACTIVE |
| **Duplicate Submission Guard** | Unique database key `@@unique([studentId, eventId])` preventing double check-in or check-out. | ACTIVE |

---

## 4. Explicitly Excluded Features

The following features were **explicitly out of scope** and are **NOT** included in the system:

1. ❌ **AI / Machine Learning Processing**: No automated image classification or AI content checking.
2. ❌ **Facial Recognition**: No facial detection or biometric matching on uploaded proof photos.
3. ❌ **GPS / Geofencing Verification**: No device location tracking or geographic boundary checks.
4. ❌ **Student-Specific Personal QR Codes**: QR codes belong to the *event/venue*, not individual students.
5. ❌ **National ID / Citizen ID Verification**: Identity is managed strictly via Student ID and LINE account.
6. ❌ **Unique One-Time Attendance Codes**: Session tokens are persistent per event venue display.
7. ❌ **Mandatory / Optional Event Classification**: Events do not enforce mandatory attendance rules.
8. ❌ **Automatic Eligibility Enforcement**: Target groups are informational strings, not programmatic blocks.
