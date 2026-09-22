import { IsNotEmpty, IsString } from 'class-validator';

export class LineVerifyTokenDto {
  @IsString({ message: 'LINE ID Token must be a string' })
  @IsNotEmpty({ message: 'LINE ID Token is required' })
  idToken!: string;
}
