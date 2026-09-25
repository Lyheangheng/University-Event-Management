# Final University Project Demonstration Guide

## University Event Management and Attendance Verification System

This guide outlines the step-by-step sequence for demonstrating the production system to the course professor and evaluation committee.

---

## Live Production URLs

- **Frontend App**: `https://university-event-management-web-phi.vercel.app`
- **Backend API**: `https://university-event-api.onrender.com`
- **LINE LIFF App**: `https://liff.line.me/2011689671-SKaMIQlb`

---

## 22-Step Demonstration Sequence

```text
Step  1: Open Public Student Portal
         Navigate to https://university-event-management-web-phi.vercel.app/events.
         Show public upcoming event cards.

Step  2: View Event Details Page
         Click an event (e.g. "University Orientation 2026").
         Show event information (title, date, time, location, target group, banner).
         Note that no admin controls appear on the public student view.

Step  3: Open Admin Login Page
         Navigate to https://university-event-management-web-phi.vercel.app/admin/login.
         Show secure login form.

Step  4: Demonstrate Authentication Security
         Enter invalid credentials (e.g., username "admin", password "wrongpass").
         Show "Invalid credentials" rejection banner.

Step  5: Execute Successful Admin Login
         Enter valid administrator credentials.
         Submit form -> Redirect to `/admin` Event Console.

Step  6: Showcase Admin Dashboard
         Show event list overview with action buttons ("+ Create Event", "✏️ Edit", "📋 Manage Attendance", "📺 Check-In Display", "📺 Check-Out Display").

Step  7: Demonstrate Event Creation
         Click "+ Create Event" (`/admin/events/new`).
         Fill out test event details and submit.
         Show new event appearing in the admin console.

Step  8: Launch Venue CHECK_IN Projector Display
         Click "📺 Check-In Display" (`/admin/events/[id]/projector/check-in`).
         Show full-screen venue display with live status banner and persistent CHECK_IN QR code.

Step  9: Explain Persistent Dual-QR Architecture
         Explain to professor that QR code token is static and persistent in DB (`attendance_sessions`).
         Point out that the QR URL embeds the LIFF container: https://liff.line.me/2011689671-SKaMIQlb?token={TOKEN}.

Step 10: Scan CHECK_IN QR Code
         Scan the on-screen QR code using mobile phone camera or LINE App scanner.

Step 11: Demonstrate LINE / LIFF Authentication
         Show mobile screen launching LINE App / LIFF container.
         Show automatic authentication and student linkage (`lineUserId`).

Step 12: Showcase Read-Only Student Identity Form
         Show mobile form loading student profile details (Student ID: 66010001, Full Name: Somchai Jaidee, Engineering).
         Highlight the "Read-Only Identity" banner explaining that student fields cannot be edited.

Step 13: Upload Photo Proof & Optional Feedback
         Tap photo upload button -> Capture live camera photo or select test photo.
         Type optional recommendation/feedback.

Step 14: Submit CHECK_IN Attendance
         Tap "Submit Check-In" button.
         Show immediate on-screen green success confirmation with recorded UTC timestamp.

Step 15: Demonstrate Duplicate Check-In Protection
         Attempt to re-scan/re-submit Check-In for the same event.
         Show backend rejection message: "Check-in has already been recorded for this event".

Step 16: Launch Venue CHECK_OUT Projector Display
         Return to admin dashboard and click "📺 Check-Out Display" (`/admin/events/[id]/projector/check-out`).
         Show persistent CHECK_OUT QR code (confirming check-out token is distinct from check-in token).

Step 17: Scan CHECK_OUT QR Code & Submit
         Scan CHECK_OUT QR on mobile device.
         Upload photo proof and tap "Submit Check-Out".
         Show success screen indicating attendance status updated to COMPLETED.

Step 18: Open Admin Attendance Management Page
         In admin dashboard, click "📋 Manage Attendance" (`/admin/events/[id]/attendance`).

Step 19: Inspect Attendance Records
         Show student record row displaying Student ID, Name, Check-In Time, Check-Out Time, and Status (COMPLETED).

Step 20: Verify Student Feedback & Photo Proof
         Click "View Feedback" to display student recommendation text.
         Click "View Proof Image" to stream photo proof photo.

Step 21: Demonstrate R2 Storage & Proxy Security
         Explain that proof photo is stored in private Cloudflare R2 bucket (`proofs/` subfolder).
         Show that image URL goes through backend proxy (`/api/attendance/uploads/proofs/...`) protected by Admin JWT.
         Show unauthenticated attempt to open proof URL returning HTTP 401 Unauthorized.

Step 22: Conclude Demonstration
         Summarize system readiness: Live production URLs, NestJS backend on Render, Next.js frontend on Vercel, Supabase PostgreSQL, Cloudflare R2, LINE OA / LIFF v2 integration, 100% test pass rate.
```
