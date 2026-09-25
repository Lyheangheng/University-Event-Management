import { EventItem, ApiResponse } from '../types/event';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface EventInput {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  targetGroup: string;
  imageUrl?: string | null;
}

/**
 * Fetch all events from GET /api/events
 */
export async function fetchEvents(): Promise<EventItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/events`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.statusText}`);
  }

  const json: ApiResponse<EventItem[]> = await res.json();
  if (json.success && Array.isArray(json.data)) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}

/**
 * Fetch single event details from GET /api/events/:id
 */
export async function fetchEventById(id: string): Promise<EventItem> {
  const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    throw new Error('EVENT_NOT_FOUND');
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch event details: ${res.statusText}`);
  }

  const json: ApiResponse<EventItem> = await res.json();
  if (json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}

/**
 * Create new event via POST /api/events (Admin Protected)
 */
export async function createEvent(payload: EventInput, token: string): Promise<EventItem> {
  const res = await fetch(`${API_BASE_URL}/api/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const message = Array.isArray(json?.message)
      ? json.message.join(', ')
      : json?.message || 'Failed to create event';
    throw new Error(message);
  }

  if (json && json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}

/**
 * Update existing event via PATCH /api/events/:id (Admin Protected)
 */
export async function updateEvent(id: string, payload: Partial<EventInput>, token: string): Promise<EventItem> {
  const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (res.status === 404) {
    throw new Error('EVENT_NOT_FOUND');
  }

  if (!res.ok) {
    const message = Array.isArray(json?.message)
      ? json.message.join(', ')
      : json?.message || 'Failed to update event';
    throw new Error(message);
  }

  if (json && json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}

/**
 * Delete event via DELETE /api/events/:id (Admin Protected)
 */
export async function deleteEvent(id: string, token: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/api/events/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.message || 'Failed to delete event');
  }

  return true;
}

/**
 * Upload event banner image file via POST /api/events/upload-banner (Admin Protected)
 */
export async function uploadEventBanner(file: File, token: string): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE_URL}/api/events/upload-banner`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const message = Array.isArray(json?.message)
      ? json.message.join(', ')
      : json?.message || 'Failed to upload event banner';
    throw new Error(message);
  }

  if (json && json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}

/**
 * Remove event banner image via DELETE /api/events/:id/banner (Admin Protected)
 */
export async function deleteEventBanner(id: string, token: string): Promise<EventItem> {
  const res = await fetch(`${API_BASE_URL}/api/events/${id}/banner`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json().catch(() => null);

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const message = json?.message || 'Failed to remove event banner';
    throw new Error(message);
  }

  if (json && json.success && json.data) {
    return json.data;
  }

  throw new Error('Invalid response structure from backend API');
}
