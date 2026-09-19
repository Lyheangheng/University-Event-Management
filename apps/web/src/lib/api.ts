import { EventItem, ApiResponse } from '../types/event';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
