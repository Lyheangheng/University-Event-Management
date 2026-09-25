/**
 * Helper to convert relative or stored R2 image URLs into absolute public HTTPS URLs
 * suitable for LINE Messaging API Flex Messages and external renderers.
 */
export function buildPublicImageUrl(
  rawUrl: string | null | undefined,
  subfolder: 'banners' | 'event-images' = 'banners',
  backendBaseUrl?: string,
): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Resolve base URL: custom backendBaseUrl -> process.env.BACKEND_URL / API_BASE_URL / RENDER_EXTERNAL_URL -> default fallback
  let baseUrl =
    backendBaseUrl ||
    process.env.BACKEND_URL ||
    process.env.API_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    'https://university-event-api.onrender.com';

  baseUrl = baseUrl.replace(/\/+$/, '');

  // If URL starts with http:// or https://
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it's a Cloudflare R2 direct URL (contains r2.cloudflarestorage.com), redirect through safe streaming backend route
    if (trimmed.includes('r2.cloudflarestorage.com')) {
      try {
        const parsed = new URL(trimmed);
        const pathParts = parsed.pathname.split('/').filter(Boolean);
        const filename = pathParts[pathParts.length - 1];
        let targetSubfolder = subfolder;
        if (pathParts.includes('event-images')) targetSubfolder = 'event-images';
        if (pathParts.includes('banners')) targetSubfolder = 'banners';
        return `${baseUrl}/api/events/uploads/${targetSubfolder}/${filename}`;
      } catch {
        // Fallback below if parsing fails
      }
    }
    return trimmed;
  }

  // If path starts with /api/
  if (trimmed.startsWith('/api/')) {
    return `${baseUrl}${trimmed}`;
  }

  // If path starts with /
  if (trimmed.startsWith('/')) {
    return `${baseUrl}${trimmed}`;
  }

  // Otherwise assume it's a filename
  return `${baseUrl}/api/events/uploads/${subfolder}/${trimmed}`;
}
