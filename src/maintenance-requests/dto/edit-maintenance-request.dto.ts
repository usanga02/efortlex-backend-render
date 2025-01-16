import { ApiProperty } from '@nestjs/swagger';
import { MAINTENANCE_URGENCY } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class EditMaintenanceRequestDto {
  @ApiProperty({ example: 'Bathroom door key broken' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: ['http://icilod.nc/bonruwal'] })
  @IsString({ each: true })
  @IsArray()
  @IsOptional()
  attachments?: string[];

  @ApiProperty({ example: 'HIGH' })
  @IsEnum(MAINTENANCE_URGENCY)
  @IsOptional()
  urgency?: MAINTENANCE_URGENCY;

  @ApiProperty({
    example: 'Wed Feb 07 2024 16:37:08 GMT+0100 (West Africa Standard Time)',
  })
  @IsDateString()
  @IsOptional()
  preferredDate?: Date;
}
