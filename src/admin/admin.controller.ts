import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { OptionalParseIntPipe } from '../utils';
import { ROLE } from '@prisma/client';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AuthGuard } from '../auth/guard';
import { AdminGuard } from './guard';
import { MaintenanceRequestsDto } from '../maintenance-requests/dto/maintenance-requests.dto';

@ApiTags('Admin')
@SkipThrottle()
@UseGuards(AuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  findUsers(
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('role', new ParseEnumPipe(ROLE)) role: ROLE,
    @Query('search') search: string,
  ) {
    return this.adminService.findAllUsers({ offset, limit, role, search });
  }

  @Get('user-by-id/:id')
  findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Get('/landlord-overview/:id')
  findLandlordOverview(@Param('id') id: string) {
    return this.adminService.findLandlordOverview(id);
  }

  @Get('/upcoming-for-landlord/:id')
  findLandlordUpcomingPayments(
    @Param('id') id: string,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.adminService.findLandlordUpcomingPayments(id, offset, limit);
  }

  @Get('/maintenance-overview/:id')
  findMaintenanceOverview(@Param('id') id: string) {
    return this.adminService.findMaintenanceOverview(id);
  }

  @Get('/apartment-by-id/:id')
  findLandlordApartments(
    @Param('id') id: string,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.adminService.findLandlordApartments(id, offset, limit);
  }

  @Get('/tenants')
  findAllTenants(
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('search') search: string,
  ) {
    return this.adminService.findAllTenants(offset, limit, search);
  }

  @Get('/tenants/:id')
  findTenant(@Param('id') id: string) {
    return this.adminService.findTenant(id);
  }
  @Get('/tenants-overview/:id')
  findTenantOverview(@Param('id') id: string) {
    return this.adminService.findTenantOverview(id);
  }

  @Get('/tenants/apartments/:id')
  findManyByTenant(
    @Param('id') id: string,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.adminService.findManyByTenant(id, offset, limit);
  }

  @ApiOkResponse({ type: MaintenanceRequestsDto })
  @Get('/tenants/maintenance-request/:id')
  findTenantMaintenanceRequest(
    @Param('id') id: string,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('search') search: string,
    @Query('status') status: string,
    @Query('date') date: string,
  ) {
    return this.adminService.findTenantMaintenanceRequest(
      id,
      offset,
      limit,
      search,
      status,
      date,
    );
  }

  @Get('/wallet/history')
  fetchWithdrawalHistory(
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('status') status: string,
    @Query('date') date: string,
  ) {
    return this.adminService.fetchWithdrawalHistory(
      offset,
      limit,
      status,
      date,
    );
  }

  @Get('/wallet/balance')
  fetchLandlordWalletBalance() {
    return this.adminService.fetchWalletBalance();
  }

  @Get('/apartment-requests')
  fetchAllApartmentRequest(
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('search') search: string,
  ) {
    return this.adminService.fetchAllApartmentRequest(offset, limit, search);
  }

  @Get('find-total-apartments-unit')
  findTotalApartmentsUnit() {
    return this.adminService.findTotalApartmentsUnit();
  }
}
