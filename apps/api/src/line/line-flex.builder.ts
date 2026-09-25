import { buildPublicImageUrl } from '../storage/image-url.helper';

export interface EventNotificationPayload {
  id: string;
  title: string;
  description?: string | null;
  location: string;
  date: Date | string;
  startTime: Date | string;
  endTime: Date | string;
  imageUrl?: string | null;
  images?: Array<{ id?: string; imageUrl: string; sortOrder?: number }>;
}

export interface FlexMessageBuildResult {
  altText: string;
  messages: any[];
}

/**
 * Formats a Date object or ISO string into human-readable date format (e.g. "10 October 2026")
 */
function formatDateString(val: Date | string): string {
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return String(val);
  }
}

/**
 * Formats start and end time into "09:00 – 12:00"
 */
function formatTimeRangeString(startVal: Date | string, endVal: Date | string): string {
  try {
    const start = new Date(startVal);
    const end = new Date(endVal);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return `${startVal} – ${endVal}`;
    }
    const fmt = (d: Date) =>
      d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    return `${fmt(start)} – ${fmt(end)}`;
  } catch {
    return `${startVal} – ${endVal}`;
  }
}

/**
 * Safely truncates long description text for mobile LINE preview
 */
function truncateDescription(desc?: string | null, maxLength = 120): string | null {
  if (!desc || typeof desc !== 'string') return null;
  const trimmed = desc.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.substring(0, maxLength).trim()}...`;
}

/**
 * Builds LINE Flex Messages for an event announcement post.
 */
export function buildEventAnnouncementFlexMessages(
  event: EventNotificationPayload,
  frontendBaseUrl: string,
  backendBaseUrl?: string,
): FlexMessageBuildResult {
  const cleanFrontendBaseUrl = (frontendBaseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  const eventUrl = `${cleanFrontendBaseUrl}/events/${event.id}`;

  const dateStr = formatDateString(event.date);
  const timeStr = formatTimeRangeString(event.startTime, event.endTime);
  const shortDesc = truncateDescription(event.description);

  // Determine Primary Image Priority:
  // 1. Optional event banner (event.imageUrl)
  // 2. First gallery image (event.images[0].imageUrl)
  // 3. Fallback UI (no image hero)
  let rawPrimaryImage: string | null = null;
  if (event.imageUrl && typeof event.imageUrl === 'string' && event.imageUrl.trim()) {
    rawPrimaryImage = event.imageUrl;
  } else if (event.images && Array.isArray(event.images) && event.images.length > 0) {
    const firstImg = event.images[0]?.imageUrl;
    if (firstImg && typeof firstImg === 'string' && firstImg.trim()) {
      rawPrimaryImage = firstImg;
    }
  }

  const primaryImageUrl = rawPrimaryImage
    ? buildPublicImageUrl(rawPrimaryImage, 'banners', backendBaseUrl)
    : null;

  // Useful altText for notification banner
  const altText = `🎓 ${event.title}\n📅 ${dateStr}\n🕘 ${timeStr}\n📍 ${event.location}\n\nTap to view event details.`;

  // Build Hero component if primary image exists
  const heroComponent = primaryImageUrl
    ? {
        type: 'image',
        url: primaryImageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover',
        action: {
          type: 'uri',
          label: 'View Event',
          uri: eventUrl,
        },
      }
    : undefined;

  // Build Main Event Announcement Bubble
  const mainBubbleContents: any[] = [];

  // Fallback visual header if no image exists
  if (!primaryImageUrl) {
    mainBubbleContents.push({
      type: 'box',
      layout: 'vertical',
      backgroundColor: '#06C755',
      cornerRadius: 'md',
      paddingAll: 'sm',
      marginBottom: 'md',
      contents: [
        {
          type: 'text',
          text: '🎓 UNIVERSITY EVENT',
          color: '#FFFFFF',
          weight: 'bold',
          size: 'xs',
          align: 'center',
        },
      ],
    });
  }

  // Event Title
  mainBubbleContents.push({
    type: 'text',
    text: event.title,
    weight: 'bold',
    size: 'xl',
    wrap: true,
    color: '#111111',
  });

  // Event Metadata Details (Date, Time, Location)
  mainBubbleContents.push({
    type: 'box',
    layout: 'vertical',
    margin: 'lg',
    spacing: 'sm',
    contents: [
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '📅', size: 'sm', flex: 1 },
          { type: 'text', text: dateStr, size: 'sm', color: '#555555', flex: 9, wrap: true },
        ],
      },
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '🕘', size: 'sm', flex: 1 },
          { type: 'text', text: timeStr, size: 'sm', color: '#555555', flex: 9, wrap: true },
        ],
      },
      {
        type: 'box',
        layout: 'baseline',
        spacing: 'sm',
        contents: [
          { type: 'text', text: '📍', size: 'sm', flex: 1 },
          { type: 'text', text: event.location, size: 'sm', color: '#555555', flex: 9, wrap: true },
        ],
      },
    ],
  });

  // Truncated Description Preview
  if (shortDesc) {
    mainBubbleContents.push({
      type: 'text',
      text: shortDesc,
      margin: 'lg',
      size: 'sm',
      color: '#666666',
      wrap: true,
    });
  }

  const mainFlexMessage: any = {
    type: 'flex',
    altText,
    contents: {
      type: 'bubble',
      size: 'mega',
      ...(heroComponent ? { hero: heroComponent } : {}),
      body: {
        type: 'box',
        layout: 'vertical',
        contents: mainBubbleContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            height: 'sm',
            color: '#06C755',
            action: {
              type: 'uri',
              label: 'View Event',
              uri: eventUrl,
            },
          },
        ],
        flex: 0,
      },
    },
  };

  const messages: any[] = [mainFlexMessage];

  // Build Activities / Photos Carousel if gallery images exist
  if (event.images && Array.isArray(event.images) && event.images.length > 0) {
    const validGalleryUrls: string[] = [];
    for (const imgObj of event.images) {
      if (imgObj?.imageUrl) {
        const resolved = buildPublicImageUrl(imgObj.imageUrl, 'event-images', backendBaseUrl);
        if (resolved) validGalleryUrls.push(resolved);
      }
    }

    if (validGalleryUrls.length > 0) {
      // LINE Flex Carousel supports max 12 bubbles
      const MAX_CAROUSEL_BUBBLES = 12;
      const photoBubbles: any[] = [];

      const showMoreCard = validGalleryUrls.length > MAX_CAROUSEL_BUBBLES;
      const photoDisplayLimit = showMoreCard ? MAX_CAROUSEL_BUBBLES - 1 : Math.min(validGalleryUrls.length, MAX_CAROUSEL_BUBBLES);

      for (let i = 0; i < photoDisplayLimit; i++) {
        photoBubbles.push({
          type: 'bubble',
          size: 'micro',
          hero: {
            type: 'image',
            url: validGalleryUrls[i],
            size: 'full',
            aspectRatio: '4:3',
            aspectMode: 'cover',
            action: {
              type: 'uri',
              label: 'View Photo',
              uri: eventUrl,
            },
          },
        });
      }

      if (showMoreCard) {
        photoBubbles.push({
          type: 'bubble',
          size: 'micro',
          body: {
            type: 'box',
            layout: 'vertical',
            justifyContent: 'center',
            alignItems: 'center',
            contents: [
              {
                type: 'text',
                text: `+${validGalleryUrls.length - photoDisplayLimit} More`,
                weight: 'bold',
                size: 'sm',
                color: '#06C755',
                align: 'center',
              },
              {
                type: 'text',
                text: 'View All Photos',
                size: 'xs',
                color: '#888888',
                align: 'center',
                margin: 'xs',
              },
            ],
            action: {
              type: 'uri',
              label: 'View All',
              uri: eventUrl,
            },
          },
        });
      }

      const activitiesCarouselMessage = {
        type: 'flex',
        altText: `📸 Activities - ${event.title}`,
        contents: {
          type: 'carousel',
          contents: photoBubbles,
        },
      };

      messages.push(activitiesCarouselMessage);
    }
  }

  return { altText, messages };
}
