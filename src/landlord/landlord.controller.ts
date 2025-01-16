import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { LandlordService } from './landlord.service';
import { AuthGuard } from '../auth/guard';
import { RoleGuard } from '../apartments/guard';
import { OptionalParseIntPipe } from '../utils';
import {
  AddBankDetailsDto,
  CreateWalletDto,
  CreateWithdrawalRequestDto,
  VerifyWalletPinDto,
} from './dto';

@ApiTags('Landlord')
@SkipThrottle()
@Controller('landlord')
@UseGuards(AuthGuard, RoleGuard)
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  @Get('/overview')
  overview(@Request() req) {
    return this.landlordService.getOverview(req.user.id);
  }

  @Get('/maintenance/overview')
  maintenanceOverview(@Request() req) {
    return this.landlordService.fetchMaintenanceOverview(req.user.id);
  }

  @Get('/tenants')
  tenants(
    @Request() req,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('search') search: string,
  ) {
    return this.landlordService.fetchTenants(
      req.user.id,
      offset,
      limit,
      search,
    );
  }

  @Get('/maintenance')
  findAllMaintenance(
    @Request() req,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('status') status: string,
    @Query('urgency') urgency: string,
  ) {
    return this.landlordService.findAllMaintenance(
      req.user.id,
      offset,
      limit,
      status,
      urgency,
    );
  }

  @Get('/maintenance/overview')
  fetchMaintenanceOverview(@Request() req) {
    return this.landlordService.fetchMaintenanceOverview(req.user.id);
  }

  @Post('/maintenance/approve/:id')
  approveMaintenanceRequest(@Param('id') id: string) {
    return this.landlordService.approveMaintenanceRequest(id);
  }
  @Post('/maintenance/cancel/:id')
  cancelMaintenanceRequest(@Param('id') id: string) {
    return this.landlordService.cancelMaintenanceRequest(id);
  }

  @Get('/wallet/overview')
  walletOverview(@Request() req) {
    return this.landlordService.walletOverview(req.user.id);
  }

  @Get('/wallet')
  fetchWallet(@Request() req) {
    return this.landlordService.fetchWallet(req.user.id);
  }

  @Get('/wallet/history')
  fetchWithdrawalHistory(
    @Request() req,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('status') status: string,
    @Query('date') date: string,
  ) {
    return this.landlordService.fetchWithdrawalHistory(
      req.user.id,
      offset,
      limit,
      status,
      date,
    );
  }

  @Post('/wallet/create')
  createWallet(@Request() req, @Body() args: CreateWalletDto) {
    return this.landlordService.createWallet(req.user.id, args);
  }

  @Post('/wallet/add-bank-details')
  addBankDetails(@Request() req, @Body() args: AddBankDetailsDto) {
    return this.landlordService.addBankDetails(req.user.id, args);
  }
  @Delete('/wallet/remove-bank-details/:walletId/:bankId')
  removeBankDetails(
    @Request() req,
    @Param('walletId') walletId: string,
    @Param('bankId') bankId: string,
  ) {
    return this.landlordService.removeBankDetails(
      req.user.id,
      walletId,
      bankId,
    );
  }

  @Post('/wallet/verify-pin')
  verifyWalletPin(@Request() req, @Body() args: VerifyWalletPinDto) {
    return this.landlordService.verifyWalletPin(req.user.id, args.pin);
  }

  @Post('/wallet/request')
  createWithdrawalRequest(
    @Request() req,
    @Body() dto: CreateWithdrawalRequestDto,
  ) {
    return this.landlordService.createWithdrawalRequest(req.user.id, dto);
  }

  @Post('/apartment/archive/:id')
  archiveApartment(@Request() req, @Param('id') id: string) {
    return this.landlordService.archiveApartment(id);
  }

  @Delete('/apartment/delete/:id')
  deleteApartment(@Request() req, @Param('id') id: string) {
    return this.landlordService.deleteApartment(id);
  }
}
