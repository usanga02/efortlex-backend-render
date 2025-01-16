import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString } from 'class-validator';

export class CreateWithdrawalRequestDto {
  @ApiProperty({ example: '001000133' })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 'My money to you' })
  @IsString()
  description: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  pin: string;
}
