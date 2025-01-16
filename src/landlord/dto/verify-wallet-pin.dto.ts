import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyWalletPinDto {
  @ApiProperty({ example: '001000133' })
  @IsString()
  pin: string;
}
