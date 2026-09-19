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

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
