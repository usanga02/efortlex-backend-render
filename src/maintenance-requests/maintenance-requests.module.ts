import { Module } from '@nestjs/common';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { MaintenanceRequestsController } from './maintenance-requests.controller';
import { ApartmentsService } from '../apartments/apartments.service';

@Module({
  controllers: [MaintenanceRequestsController],
  providers: [MaintenanceRequestsService, ApartmentsService],
})
export class MaintenanceRequestsModule {}
