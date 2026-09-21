import { ApiResponse } from '../types/event';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ActiveSessionData {
  id: string;
  eventId: string;
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
  token: string;
  startsAt: string;
  endsAt: string;
  startTime: string;
  endTime: string;
  attendanceUrl: string;
}

export interface SessionValidationData {
  id: string;
  eventId: string;
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
  token: string;
  startsAt: string;
  endsAt: string;
  startTime: string;
  endTime: string;
  attendanceUrl: string;
  isValid: boolean;
  event: {
    id: string;
    title: string;
    description: string;
    location: string;
    targetGroup: string;
    date: string;
    startTime: string;
    endTime: string;
    imageUrl?: string | null;
  };
}

export interface StudentProfile {
  id: string;
  studentId: string;
  fullName: string;
  year: number;
  faculty: string;
  major: string;
}

export interface StudentProfileResult {
  currentStudent: StudentProfile;
  availableStudents: StudentProfile[];
}

export interface AttendanceSubmissionResult {
  message: string;
  sessionType: 'CHECK_IN' | 'CHECK_OUT';
  recordedAt: string;
  eventTitle: string;
  studentName: string;
  studentId: string;
  attendanceId: string;
  status: 'INCOMPLETE' | 'COMPLETED';
}

/**
 * Fetch current active session for an event (used by Projector display)
 */
export async function fetchActiveSession(eventId: string): Promise<ActiveSessionData | null> {
  const res = await fetch(`${API_BASE_URL}/api/attendance/events/${eventId}/session`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch active session: ${res.statusText}`);
  }

  const json: ApiResponse<ActiveSessionData | null> = await res.json();
  if (json.success) {
    return json.data;
  }

  return null;
}

/**
 * Fetch and validate attendance session details by token (used by Student Scan entry page)
 */
export async function fetchSessionByToken(token: string): Promise<SessionValidationData> {
  const res = await fetch(`${API_BASE_URL}/api/attendance/sessions/${token}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    throw new Error('SESSION_NOT_FOUND');
  }

  if (res.status === 400 || res.status === 410) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.message || 'SESSION_EXPIRED');
  }

  if (!res.ok) {
    throw new Error(`Failed to validate session token: ${res.statusText}`);
  }

  const json: ApiResponse<SessionValidationData> = await res.json();
  if (json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}

/**
 * Fetch authenticated student profile and dev test student list
 */
export async function fetchStudentProfile(devStudentId?: string): Promise<StudentProfileResult> {
  const headers: Record<string, string> = {};
  if (devStudentId) {
    headers['x-dev-student-id'] = devStudentId;
  }

  const res = await fetch(`${API_BASE_URL}/api/attendance/me`, {
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch student profile');
  }

  const json: ApiResponse<StudentProfileResult> = await res.json();
  if (json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure when fetching student profile');
}

/**
 * Submit student attendance with photo proof and optional recommendation/feedback
 */
export async function submitAttendance(
  token: string,
  photo: File,
  feedback?: string,
  devStudentId?: string,
): Promise<AttendanceSubmissionResult> {
  const formData = new FormData();
  formData.append('photo', photo);
  if (feedback && feedback.trim()) {
    formData.append('feedback', feedback.trim());
  }

  const headers: Record<string, string> = {};
  if (devStudentId) {
    headers['x-dev-student-id'] = devStudentId;
  }

  const res = await fetch(`${API_BASE_URL}/api/attendance/sessions/${token}/submit`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = json?.message || `Submission failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  if (json && json.success && json.data) {
    return json.data;
  }

  throw new Error('Unexpected response structure from attendance submission endpoint');
}
