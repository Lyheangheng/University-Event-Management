import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { StorageService } from '../storage/storage.service';
import { StorageFile } from '../storage/storage.interface';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser('userId') adminId: string,
  ) {
    return this.eventsService.createEvent(dto, adminId);
  }

  @Post('upload-banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadStandaloneBanner(@UploadedFile() file: StorageFile) {
    return this.eventsService.uploadStandaloneBanner(file);
  }

  @Post(':id/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBanner(
    @Param('id') id: string,
    @UploadedFile() file: StorageFile,
  ) {
    return this.eventsService.uploadBanner(id, file);
  }

  @Delete(':id/banner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteBanner(@Param('id') id: string) {
    return this.eventsService.deleteBanner(id);
  }

  @Get('uploads/banners/:filename')
  async getBannerImage(@Param('filename') filename: string, @Res() res: Response) {
    const { stream, mimetype, contentLength } = await this.storageService.getFileStream(
      filename,
      'banners',
    );

    res.setHeader('Content-Type', mimetype);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (contentLength) {
      res.setHeader('Content-Length', contentLength.toString());
    }

    return stream.pipe(res);
  }

  @Get()
  async findAll() {
    return this.eventsService.findAllEvents();
  }

  @Get(':eventId/attendance')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getEventAttendance(@Param('eventId') eventId: string) {
    return this.eventsService.getEventAttendanceForAdmin(eventId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.eventsService.findEventById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.eventsService.deleteEvent(id);
  }
}
