// Shared placeholder types and constants for University Event Management System
export const SYSTEM_NAME = 'University Event Management System';

export interface BaseResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}
