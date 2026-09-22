import { IsNotEmpty, IsString } from 'class-validator';

export class LineLinkStudentDto {
  @IsString({ message: 'LINE ID Token must be a string' })
  @IsNotEmpty({ message: 'LINE ID Token is required' })
  idToken!: string;

  @IsString({ message: 'Student ID must be a string' })
  @IsNotEmpty({ message: 'Student ID is required' })
  studentId!: string;
}
