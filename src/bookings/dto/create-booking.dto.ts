import { ApiProperty } from '@nestjs/swagger';
import { INSPECTION_TYPE } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'e40a6c07-80aa-5f20-becd-1c8d66205477' })
  @IsString()
  @IsUUID()
  apartmentId: string;

  @ApiProperty({ example: '', required: false })
  @IsEnum(INSPECTION_TYPE)
  @IsOptional()
  inspectionType: INSPECTION_TYPE;

  @ApiProperty({
    example: 'Wed Apr 12 2023 05:21:40 GMT+0100 (West Africa Standard Time)',
  })
  @IsDateString()
  inspectionDate: Date;
}
