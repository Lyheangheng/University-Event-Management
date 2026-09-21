import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface EventNotificationPayload {
  id: string;
  title: string;
  location: string;
  date: Date;
  startTime: Date;
  endTime: Date;
}

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
    const accessToken = this.configService.get<string>('line.channelAccessToken');

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
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const eventUrl = `${frontendBaseUrl}/events/${event.id}`;

    const dateStr = new Date(event.date).toLocaleDateString('en-GB');
    const timeStr = `${new Date(event.startTime).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })} - ${new Date(event.endTime).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

    const textMessage = {
      type: 'text',
      text: `📢 New University Event Announced!\n\n📌 Title: ${event.title}\n📅 Date: ${dateStr}\n⏰ Time: ${timeStr}\n📍 Location: ${event.location}\n\n🔗 View details: ${eventUrl}`,
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
   * Send LINE notification to all linked students when check-in window opens for an event
   */
  async notifyCheckInOpened(event: EventNotificationPayload, sessionToken: string): Promise<number> {
    const notificationKey = `check_in_open_${event.id}_${sessionToken}`;
    if (this.sentNotifications.has(notificationKey)) {
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
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
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
    const notificationKey = `check_out_open_${event.id}_${sessionToken}`;
    if (this.sentNotifications.has(notificationKey)) {
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
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
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
