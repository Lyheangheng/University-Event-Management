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
