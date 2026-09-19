import { IsNotEmpty, IsString, IsDateString, IsOptional, IsUrl } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Description is required' })
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
  location!: string;

  @IsString()
  @IsNotEmpty({ message: 'Target group is required' })
  targetGroup!: string;

  @IsOptional()
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  imageUrl?: string;
}
