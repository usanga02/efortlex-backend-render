import { IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  message: string;

  @IsString()
  subject: string;

  sendTo: 'Landlords' | 'Tenants' | string[];
}
