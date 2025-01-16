import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ApartmentsService } from '../apartments/apartments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, ApartmentsService],
})
export class PaymentsModule {}
