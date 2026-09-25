export interface EventCreator {
  id: string;
  username: string;
  name: string;
}

export interface EventImageItem {
  id: string;
  eventId: string;
  storageKey: string;
  imageUrl: string;
  sortOrder: number;
  createdAt: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  targetGroup: string;
  imageUrl?: string | null;
  images?: EventImageItem[];
  createdById?: string | null;
  createdBy?: EventCreator | null;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'UPCOMING' | 'ONGOING' | 'ENDED';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
