import { EventItem } from '../types/event';

export type ProjectorState =
  | 'BEFORE_EVENT'
  | 'CHECK_IN_WINDOW'
  | 'BETWEEN_CHECK_IN_AND_CHECKOUT'
  | 'CHECK_OUT_WINDOW'
  | 'ENDED';

export interface TimeBoundaries {
  start: Date;
  checkInEnd: Date;
  checkOutStart: Date;
  end: Date;
}

/**
 * Parse event timestamps into exact JavaScript Date boundaries
 */
export function getEventTimeBoundaries(event: EventItem): TimeBoundaries {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  // Check-in window is start -> start + 10 minutes
  const checkInEnd = new Date(start.getTime() + 10 * 60 * 1000);

  // Check-out window is end - 15 minutes -> end
  const checkOutStart = new Date(end.getTime() - 15 * 60 * 1000);

  return {
    start,
    checkInEnd,
    checkOutStart,
    end,
  };
}

/**
 * Calculate the current Projector Display State based on current time
 */
export function getEventDisplayState(event: EventItem, now: Date = new Date()): ProjectorState {
  const { start, checkInEnd, checkOutStart, end } = getEventTimeBoundaries(event);
  const currentTime = now.getTime();

  if (currentTime < start.getTime()) {
    return 'BEFORE_EVENT';
  } else if (currentTime >= start.getTime() && currentTime < checkInEnd.getTime()) {
    return 'CHECK_IN_WINDOW';
  } else if (currentTime >= checkInEnd.getTime() && currentTime < checkOutStart.getTime()) {
    return 'BETWEEN_CHECK_IN_AND_CHECKOUT';
  } else if (currentTime >= checkOutStart.getTime() && currentTime < end.getTime()) {
    return 'CHECK_OUT_WINDOW';
  } else {
    return 'ENDED';
  }
}

/**
 * Get the target Date for the countdown timer for the current state
 */
export function getCountdownTarget(event: EventItem, state: ProjectorState): Date | null {
  const { start, checkInEnd, checkOutStart, end } = getEventTimeBoundaries(event);

  switch (state) {
    case 'BEFORE_EVENT':
      return start;
    case 'CHECK_IN_WINDOW':
      return checkInEnd;
    case 'BETWEEN_CHECK_IN_AND_CHECKOUT':
      return checkOutStart;
    case 'CHECK_OUT_WINDOW':
      return end;
    case 'ENDED':
    default:
      return null;
  }
}

/**
 * Format remaining milliseconds into formatted hours, minutes, and seconds strings
 */
export function formatCountdownMs(ms: number) {
  if (ms <= 0) {
    return { hours: '00', minutes: '00', seconds: '00', totalSeconds: 0 };
  }

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');

  return {
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    totalSeconds,
  };
}
