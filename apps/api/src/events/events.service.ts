import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from '@prisma/client';
import { LineMessagingService } from '../line/line-messaging.service';
import { StorageService } from '../storage/storage.service';
import { StorageFile, extractAndSanitizeFilename } from '../storage/storage.interface';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lineMessagingService: LineMessagingService,
    private readonly storageService?: StorageService,
  ) {}

  /**
   * Create a new university event
   */
  async createEvent(dto: CreateEventDto, adminId: string): Promise<Event> {
    const eventDate = new Date(dto.date);
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (isNaN(eventDate.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid date or time format supplied');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('Event start time must be earlier than end time');
    }

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: eventDate,
        startTime: startTime,
        endTime: endTime,
        location: dto.location,
        targetGroup: dto.targetGroup,
        imageUrl: dto.imageUrl || null,
        createdById: adminId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Admin '${adminId}' created event '${event.title}' (ID: ${event.id})`);

    // Trigger LINE Official Account event announcement notification asynchronously
    try {
      await this.lineMessagingService.notifyEventAnnouncement(event);
    } catch (err: any) {
      this.logger.error(
        `Failed to deliver LINE event announcement notification for event '${event.id}': ${err?.message || err}`,
      );
    }

    return event;
  }


  /**
   * Retrieve all university events
   */
  async findAllEvents(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: {
        date: 'desc',
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve single event details by ID
   */
  async findEventById(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${id}' not found`);
    }

    return event;
  }

  /**
   * Update existing event details
   */
  async updateEvent(id: string, dto: UpdateEventDto): Promise<Event> {
    const existingEvent = await this.findEventById(id);

    const eventDate = dto.date ? new Date(dto.date) : existingEvent.date;
    const startTime = dto.startTime ? new Date(dto.startTime) : existingEvent.startTime;
    const endTime = dto.endTime ? new Date(dto.endTime) : existingEvent.endTime;

    if (isNaN(eventDate.getTime()) || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new BadRequestException('Invalid date or time format supplied');
    }

    if (startTime >= endTime) {
      throw new BadRequestException('Event start time must be earlier than end time');
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.date !== undefined && { date: eventDate }),
        ...(dto.startTime !== undefined && { startTime }),
        ...(dto.endTime !== undefined && { endTime }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.targetGroup !== undefined && { targetGroup: dto.targetGroup }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Event '${updatedEvent.title}' (ID: ${id}) updated successfully`);
    return updatedEvent;
  }

  /**
   * Remove event
   */
  async deleteEvent(id: string): Promise<{ id: string; deleted: boolean }> {
    await this.findEventById(id);

    await this.prisma.event.delete({
      where: { id },
    });

    this.logger.log(`Event with ID '${id}' deleted successfully`);
    return { id, deleted: true };
  }

  /**
   * Retrieve attendance records and summary metrics for an event (Admin Only)
   */
  async getEventAttendanceForAdmin(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID '${eventId}' not found`);
    }

    const attendances = await this.prisma.attendance.findMany({
      where: { eventId },
      include: {
        student: {
          select: {
            id: true,
            studentId: true,
            fullName: true,
            year: true,
            faculty: true,
            major: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalRecords = attendances.length;
    const completedCount = attendances.filter((a) => a.status === 'COMPLETED').length;
    const incompleteCount = attendances.filter((a) => a.status === 'INCOMPLETE').length;
    const checkedInCount = attendances.filter((a) => a.checkInTime !== null).length;
    const checkedOutCount = attendances.filter((a) => a.checkOutTime !== null).length;

    return {
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        targetGroup: event.targetGroup,
      },
      summary: {
        totalRecords,
        completedCount,
        incompleteCount,
        checkedInCount,
        checkedOutCount,
      },
      records: attendances.map((a) => ({
        id: a.id,
        studentId: a.student.studentId,
        studentName: a.student.fullName,
        year: a.student.year,
        faculty: a.student.faculty,
        major: a.student.major,
        checkInTime: a.checkInTime,
        checkInProofUrl: a.checkInProofUrl,
        checkOutTime: a.checkOutTime,
        checkOutProofUrl: a.checkOutProofUrl,
        feedback: a.feedback,
        status: a.status,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
    };
  }

  /**
   * Helper to extract banner filename from image URL if it belongs to storage banners
   */
  private extractBannerFilename(imageUrl: string | null | undefined): string | null {
    if (!imageUrl || typeof imageUrl !== 'string') return null;
    if (!imageUrl.includes('banners')) return null;
    try {
      return extractAndSanitizeFilename(imageUrl);
    } catch {
      return null;
    }
  }

  /**
   * Upload standalone event banner image file to R2/Local storage
   */
  async uploadStandaloneBanner(file: StorageFile): Promise<{ url: string; filename: string }> {
    if (!this.storageService) {
      throw new BadRequestException('Storage service is not configured');
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Event banner image file is required');
    }

    const saved = await this.storageService.saveFile(file, {
      subfolder: 'banners',
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      maxSizeBytes: 5 * 1024 * 1024,
    });

    this.logger.log(`Uploaded event banner '${saved.filename}' (${saved.size} bytes)`);
    return {
      url: saved.url,
      filename: saved.filename,
    };
  }

  /**
   * Upload and attach banner image to an existing event
   */
  async uploadBanner(eventId: string, file: StorageFile): Promise<Event> {
    const existingEvent = await this.findEventById(eventId);

    const uploaded = await this.uploadStandaloneBanner(file);

    const oldFilename = this.extractBannerFilename(existingEvent.imageUrl);
    if (oldFilename && this.storageService) {
      await this.storageService.deleteFile(oldFilename, 'banners').catch((err) => {
        this.logger.warn(`Failed to clean up old banner '${oldFilename}': ${err?.message || err}`);
      });
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        imageUrl: uploaded.url,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Updated banner image for event '${eventId}'`);
    return updatedEvent;
  }

  /**
   * Delete banner image from an existing event
   */
  async deleteBanner(eventId: string): Promise<Event> {
    const existingEvent = await this.findEventById(eventId);

    const oldFilename = this.extractBannerFilename(existingEvent.imageUrl);
    if (oldFilename && this.storageService) {
      await this.storageService.deleteFile(oldFilename, 'banners').catch((err) => {
        this.logger.warn(`Failed to delete banner object '${oldFilename}': ${err?.message || err}`);
      });
    }

    const updatedEvent = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        imageUrl: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Removed banner image from event '${eventId}'`);
    return updatedEvent;
  }
}
