export interface EventCreator {
  id: string;
  username: string;
  name: string;
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
