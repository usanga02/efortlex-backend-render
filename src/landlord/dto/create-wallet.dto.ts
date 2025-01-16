import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateWalletDto {
  @ApiProperty({ example: '001000133' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: 'Me and you' })
  @IsString()
  accountName: string;

  @ApiProperty({ example: 'Wema' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '123' })
  @IsString()
  pin: string;
}
