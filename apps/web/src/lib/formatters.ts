import { EventStatus } from '../types/event';

/**
 * Format ISO date string into human-readable university format (e.g. "19 September 2026")
 */
export function formatEventDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Format start time and end time strings into "09:00 – 12:00"
 */
export function formatTimeRange(startTimeString: string, endTimeString: string): string {
  try {
    const start = new Date(startTimeString);
    const end = new Date(endTimeString);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startTimeString} – ${endTimeString}`;
    }

    const formatTime = (d: Date) =>
      d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

    return `${formatTime(start)} – ${formatTime(end)}`;
  } catch (e) {
    return `${startTimeString} – ${endTimeString}`;
  }
}

/**
 * Calculate event status (UPCOMING | ONGOING | ENDED) based on current timestamp comparison
 */
export function calculateEventStatus(startTimeString: string, endTimeString: string): EventStatus {
  try {
    const now = new Date();
    const start = new Date(startTimeString);
    const end = new Date(endTimeString);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'UPCOMING';
    }

    if (now < start) {
      return 'UPCOMING';
    } else if (now >= start && now < end) {
      return 'ONGOING';
    } else {
      return 'ENDED';
    }
  } catch (e) {
    return 'UPCOMING';
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Resolves event image URL to usable HTTP/S URL for web browser <img src>
 */
export function getEventImageUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Relative API route -> prepend API_BASE_URL
  if (trimmed.startsWith('/api/')) {
    return `${API_BASE_URL}${trimmed}`;
  }

  // Cloudflare R2 raw S3 endpoint -> route through safe public streaming backend endpoint
  if (trimmed.includes('r2.cloudflarestorage.com')) {
    try {
      const parsed = new URL(trimmed);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      const filename = pathParts[pathParts.length - 1];
      let subfolder = 'banners';
      if (pathParts.includes('event-images')) subfolder = 'event-images';
      return `${API_BASE_URL}/api/events/uploads/${subfolder}/${filename}`;
    } catch {
      // Fallback
    }
  }

  return trimmed;
}
