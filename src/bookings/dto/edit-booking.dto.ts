import { ApiProperty } from '@nestjs/swagger';
import { INSPECTION_TYPE } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class EditBookingDto {
  @ApiProperty({ example: '', required: false })
  @IsEnum(INSPECTION_TYPE)
  @IsOptional()
  inspectionType?: INSPECTION_TYPE;

  @ApiProperty({
    example: 'Wed Apr 12 2023 05:21:40 GMT+0100 (West Africa Standard Time)',
  })
  @IsDateString()
  @IsOptional()
  inspectionDate?: Date;
}
