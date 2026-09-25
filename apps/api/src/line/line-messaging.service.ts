import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  EventNotificationPayload,
  buildEventAnnouncementFlexMessages,
} from './line-flex.builder';

export { EventNotificationPayload };

@Injectable()
export class LineMessagingService {
  private readonly logger = new Logger(LineMessagingService.name);
  private readonly sentNotifications = new Set<string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to send push message via LINE Messaging API to a specific linked LINE user ID
   */
  async sendPushMessage(toLineUserId: string, messages: any[]): Promise<boolean> {
    const accessToken =
      this.configService.get<string>('line.channelAccessToken') ||
      this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN') ||
      process.env.LINE_CHANNEL_ACCESS_TOKEN;

    if (!accessToken || !accessToken.trim()) {
      this.logger.debug(
        `LINE Channel Access Token unconfigured. Suppressing push message to '${toLineUserId}'.`,
      );
      return false;
    }

    try {
      const res = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.trim()}`,
        },
        body: JSON.stringify({
          to: toLineUserId,
          messages,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        this.logger.warn(
          `LINE push message failed (${res.status}): ${errJson?.message || res.statusText}`,
        );
        return false;
      }

      this.logger.log(`Push message delivered successfully to LINE user '${toLineUserId}'.`);
      return true;
    } catch (err: any) {
      this.logger.error(`Error delivering LINE push message: ${err.message}`);
      return false;
    }
  }

  /**
   * Send LINE notification to all linked students when a new event is published
   */
  async notifyEventAnnouncement(event: EventNotificationPayload): Promise<number> {
    const notificationKey = `event_announcement_${event.id}`;
    if (this.sentNotifications.has(notificationKey)) {
      this.logger.log(`Suppressed duplicate event announcement notification for event '${event.id}'.`);
      return 0; // Idempotency check: already notified
    }
    this.sentNotifications.add(notificationKey);

    const linkedStudents = await this.prisma.student.findMany({
      where: { lineUserId: { not: null } },
      select: { lineUserId: true },
    });

    if (linkedStudents.length === 0) {
      return 0;
    }

    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';

    const backendBaseUrl =
      this.configService.get<string>('BACKEND_URL') ||
      this.configService.get<string>('API_BASE_URL') ||
      process.env.BACKEND_URL;

    const { messages } = buildEventAnnouncementFlexMessages(
      event,
      frontendBaseUrl,
      backendBaseUrl,
    );

    let deliveredCount = 0;
    for (const student of linkedStudents) {
      if (student.lineUserId) {
        const success = await this.sendPushMessage(student.lineUserId, messages);
        if (success) deliveredCount++;
      }
    }

    return deliveredCount;
  }

  /**
   * Send LINE notification to all linked students when check-in window opens for an event
   */
  async notifyCheckInOpened(event: EventNotificationPayload, sessionToken: string): Promise<number> {
    const notificationKey = `check_in_open_${event.id}`;
    if (this.sentNotifications.has(notificationKey)) {
      this.logger.log(`Suppressed duplicate CHECK_IN notification for event '${event.id}'.`);
      return 0; // Idempotency check: already notified
    }
    this.sentNotifications.add(notificationKey);

    const linkedStudents = await this.prisma.student.findMany({
      where: { lineUserId: { not: null } },
      select: { lineUserId: true },
    });

    if (linkedStudents.length === 0) {
      return 0;
    }

    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
    const attendanceUrl = `${frontendBaseUrl}/attendance/session/${sessionToken}`;

    const textMessage = {
      type: 'text',
      text: `🔔 Check-In Window Open!\n\nEvent: ${event.title}\nStatus: Check-in attendance is now active.\n\n📍 Please scan the Check-In QR code displayed at the venue or open your form:\n🔗 ${attendanceUrl}`,
    };

    let deliveredCount = 0;
    for (const student of linkedStudents) {
      if (student.lineUserId) {
        const success = await this.sendPushMessage(student.lineUserId, [textMessage]);
        if (success) deliveredCount++;
      }
    }

    return deliveredCount;
  }

  /**
   * Send LINE notification to all linked students when check-out window opens for an event
   */
  async notifyCheckOutOpened(event: EventNotificationPayload, sessionToken: string): Promise<number> {
    const notificationKey = `check_out_open_${event.id}`;
    if (this.sentNotifications.has(notificationKey)) {
      this.logger.log(`Suppressed duplicate CHECK_OUT notification for event '${event.id}'.`);
      return 0; // Idempotency check: already notified
    }
    this.sentNotifications.add(notificationKey);

    const linkedStudents = await this.prisma.student.findMany({
      where: { lineUserId: { not: null } },
      select: { lineUserId: true },
    });

    if (linkedStudents.length === 0) {
      return 0;
    }

    const frontendBaseUrl =
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      'http://localhost:3000';
    const attendanceUrl = `${frontendBaseUrl}/attendance/session/${sessionToken}`;

    const textMessage = {
      type: 'text',
      text: `🏁 Check-Out Window Open!\n\nEvent: ${event.title}\nStatus: Check-out attendance is now active.\n\n📍 Please scan the Check-Out QR code displayed at the venue to complete your attendance:\n🔗 ${attendanceUrl}`,
    };

    let deliveredCount = 0;
    for (const student of linkedStudents) {
      if (student.lineUserId) {
        const success = await this.sendPushMessage(student.lineUserId, [textMessage]);
        if (success) deliveredCount++;
      }
    }

    return deliveredCount;
  }
}
