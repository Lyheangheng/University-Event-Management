import { IsNotEmpty, IsString, IsDateString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title cannot exceed 200 characters' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters' })
  description!: string;

  @IsDateString({}, { message: 'Date must be a valid ISO 8601 date string' })
  @IsNotEmpty({ message: 'Date is required' })
  date!: string;

  @IsDateString({}, { message: 'Start time must be a valid ISO 8601 date-time string' })
  @IsNotEmpty({ message: 'Start time is required' })
  startTime!: string;

  @IsDateString({}, { message: 'End time must be a valid ISO 8601 date-time string' })
  @IsNotEmpty({ message: 'End time is required' })
  endTime!: string;

  @IsString()
  @IsNotEmpty({ message: 'Location is required' })
  @MaxLength(200, { message: 'Location cannot exceed 200 characters' })
  location!: string;

  @IsString()
  @IsNotEmpty({ message: 'Target group is required' })
  @MaxLength(100, { message: 'Target group cannot exceed 100 characters' })
  targetGroup!: string;

  @IsOptional()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  imageUrl?: string;
}

