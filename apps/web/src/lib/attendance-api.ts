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
  existingAttendance?: {
    id: string;
    checkInTime?: string | null;
    checkInProofUrl?: string | null;
    checkOutTime?: string | null;
    checkOutProofUrl?: string | null;
    feedback?: string | null;
    status: 'INCOMPLETE' | 'COMPLETED';
  } | null;
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
 * Helper to construct authentication headers (Authorization Bearer JWT & x-dev-student-id)
 */
function getAuthHeader(devStudentId?: string, studentToken?: string): Record<string, string> {
  const headers: Record<string, string> = {};

  const token = studentToken || (typeof window !== 'undefined' ? localStorage.getItem('student_access_token') : null);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (devStudentId) {
    headers['x-dev-student-id'] = devStudentId;
  }

  return headers;
}

/**
 * Fetch persistent session for an event (used by Projector display)
 */
export async function fetchProjectorSession(eventId: string, type: 'CHECK_IN' | 'CHECK_OUT', token: string): Promise<ActiveSessionData | null> {
  const res = await fetch(`${API_BASE_URL}/api/attendance/events/${eventId}/projector/${type}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch projector session: ${res.statusText}`);
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
export async function fetchSessionByToken(
  token: string,
  devStudentId?: string,
  studentToken?: string,
): Promise<SessionValidationData> {
  const headers = getAuthHeader(devStudentId, studentToken);

  const res = await fetch(`${API_BASE_URL}/api/attendance/sessions/${token}`, {
    headers,
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
export async function fetchStudentProfile(
  devStudentId?: string,
  studentToken?: string,
): Promise<StudentProfileResult> {
  const headers = getAuthHeader(devStudentId, studentToken);

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
  studentToken?: string,
): Promise<AttendanceSubmissionResult> {
  const formData = new FormData();
  formData.append('photo', photo);
  if (feedback && feedback.trim()) {
    formData.append('feedback', feedback.trim());
  }

  const headers = getAuthHeader(devStudentId, studentToken);

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

export interface AdminAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  year: number;
  faculty: string;
  major: string;
  checkInTime?: string | null;
  checkInProofUrl?: string | null;
  checkOutTime?: string | null;
  checkOutProofUrl?: string | null;
  feedback?: string | null;
  status: 'INCOMPLETE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface AdminAttendanceResponse {
  event: {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    targetGroup: string;
  };
  summary: {
    totalRecords: number;
    completedCount: number;
    incompleteCount: number;
    checkedInCount: number;
    checkedOutCount: number;
  };
  records: AdminAttendanceRecord[];
}

/**
 * Admin Login Helper
 */
export async function adminLogin(username: string, password: string): Promise<{ accessToken: string; admin: any }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(json?.message || 'Admin authentication failed');
  }

  if (json && json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid login response from backend API');
}

/**
 * Fetch Admin Attendance list and summary for an event (Admin Protected)
 */
export async function fetchAdminEventAttendance(eventId: string, token: string): Promise<AdminAttendanceResponse> {
  const res = await fetch(`${API_BASE_URL}/api/events/${eventId}/attendance`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (res.status === 404) {
    throw new Error('EVENT_NOT_FOUND');
  }

  if (!res.ok) {
    const errorJson = await res.json().catch(() => null);
    throw new Error(errorJson?.message || `Failed to fetch attendance: ${res.statusText}`);
  }

  const json: ApiResponse<AdminAttendanceResponse> = await res.json();
  if (json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response payload from admin attendance endpoint');
}

export interface LineVerifyResponse {
  status?: 'LINKED' | 'UNLINKED';
  linked: boolean;
  student: StudentProfile | null;
  lineUserId: string;
  displayName?: string;
  pictureUrl?: string;
  accessToken?: string | null;
}

/**
 * Verify LIFF ID token with backend API
 */
export async function verifyLineToken(idToken: string): Promise<LineVerifyResponse> {
  const res = await fetch(`${API_BASE_URL}/api/line/verify-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to verify LINE token');
  }

  if (json && json.success && json.data) {
    const data = json.data;
    return {
      status: data.status,
      linked: data.status === 'LINKED' || Boolean(data.student),
      student: data.student || null,
      lineUserId: data.lineUserId,
      displayName: data.lineDisplayName || data.displayName,
      pictureUrl: data.linePictureUrl || data.pictureUrl,
      accessToken: data.accessToken || null,
    };
  }

  throw new Error('Invalid response structure from LINE token verification endpoint');
}

/**
 * Link LINE account with Student ID using verified LIFF ID token
 */
export async function linkStudentAccount(
  idToken: string,
  studentId: string,
): Promise<{ linked: boolean; student: StudentProfile; accessToken?: string | null }> {
  const res = await fetch(`${API_BASE_URL}/api/line/link-student`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, studentId }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to link LINE account');
  }

  if (json && json.success && json.data) {
    const data = json.data;
    return {
      linked: data.status === 'LINKED' || Boolean(data.student),
      student: data.student,
      accessToken: data.accessToken || null,
    };
  }

  throw new Error('Invalid response structure from LINE student linking endpoint');
}
