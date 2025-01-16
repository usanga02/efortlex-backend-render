import { ApiProperty } from '@nestjs/swagger';
import { ApartmentDto } from '../../apartments/dto/apartment.dto';

export class ApartmentBookingDto {
  @ApiProperty({ example: '161797b4-8e6a-5dbf-849a-138638b534d2' })
  id: string;

  @ApiProperty({ example: '161797b4-8e6a-5dbf-849a-138638b534d2' })
  apartmentId: string;

  @ApiProperty({ example: '161797b4-8e6a-5dbf-849a-138638b534d2' })
  userId: string;

  @ApiProperty({ example: 'UNAVAILABLE' })
  status: 'UNAVAILABLE' | 'PENDING' | 'SCHEDULED';

  @ApiProperty({
    example: 'Sun Jun 11 2023 04:22:19 GMT+0100 (West Africa Standard Time)',
  })
  inspectionDate: Date;

  @ApiProperty({ type: ApartmentDto })
  aparyment: ApartmentDto;

  @ApiProperty({
    example: 'Thu Jun 22 2023 21:56:11 GMT+0100 (West Africa Standard Time)',
  })
  createdAt: Date;

  @ApiProperty({
    example: 'Thu Jun 22 2023 21:56:11 GMT+0100 (West Africa Standard Time)',
  })
  updatedAt: Date;
}

export class ApartmentBookingsDto {
  @ApiProperty({ example: 10 })
  totalItems: number;

  @ApiProperty({ type: [ApartmentBookingDto] })
  results: ApartmentBookingDto[];
}
