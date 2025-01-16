import {
  Controller,
  Post,
  Body,
  Request,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/users.type';
import { AuthGuard } from '../auth/guard';
import { OptionalParseIntPipe } from '../utils';
import { SkipThrottle } from '@nestjs/throttler';
import { AdminGuard } from '../admin/guard';

@SkipThrottle()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('/')
  @UseGuards(AuthGuard)
  fetchUserPayments(
    @CurrentUser() user: User,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('date') date: string,
  ) {
    return this.paymentsService.fetchUserPayments(user.id, offset, limit, date);
  }

  @Get('/for-landlord')
  @UseGuards(AuthGuard)
  fetchPaymentsForLandlord(
    @CurrentUser() user: User,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.paymentsService.fetchPaymentsForLandlord(
      user.id,
      offset,
      limit,
    );
  }

  @Get('/for-admin')
  @UseGuards(AuthGuard, AdminGuard)
  fetchPaymentsForAdmin(
    @CurrentUser() user: User,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.paymentsService.fetchPaymentsForLandlord(
      user.id,
      offset,
      limit,
      true,
    );
  }

  @Get('/stats/for-landlord')
  @UseGuards(AuthGuard)
  fetchPaymentStatsForLandlord(
    @CurrentUser() user: User,
    @Query('period') period: 'monthly' | 'yearly' = 'monthly',
  ) {
    return this.paymentsService.fetchPaymentStatsForLandlord(user.id, period);
  }

  @Get('/stats/for-admin')
  @UseGuards(AuthGuard)
  fetchPaymentStatsForAdmin(
    @CurrentUser() user: User,
    @Query('period') period: 'monthly' | 'yearly' = 'monthly',
  ) {
    return this.paymentsService.fetchPaymentStatsForLandlord(
      user.id,
      period,
      true,
    );
  }

  @Get('/status/for-admin')
  @UseGuards(AuthGuard)
  fetchPaymentStatusForAdmin(@CurrentUser() user: User) {
    return this.paymentsService.fetchPaymentStatusForAdmin(user.id);
  }

  @Get('/upcoming-for-landlord')
  @UseGuards(AuthGuard)
  fetchUpcomingPayments(
    @CurrentUser() user: User,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.paymentsService.fetchUpcomingPayments(user.id, offset, limit);
  }

  @Get('/upcoming-for-admin')
  @UseGuards(AuthGuard, AdminGuard)
  fetchUpcomingPaymentsForAdmin(
    @CurrentUser() user: User,
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
  ) {
    return this.paymentsService.fetchUpcomingPayments(
      user.id,
      offset,
      limit,
      true,
    );
  }

  @Get('/landlord-wallet-balance')
  @UseGuards(AuthGuard)
  fetchLandlordWalletBalance(@CurrentUser() user: User) {
    return this.paymentsService.fetchLandlordWalletBalance(user.id);
  }

  @Get('/create-rent-payment')
  @UseGuards(AuthGuard)
  createRentPayment(
    @CurrentUser() user: User,
    @Query('apartmentId') apartmentId: string,
    @Query('bookingId') bookingId: string,
    @Query('type') type: 'rent' | 'renewal',
  ) {
    return this.paymentsService.createRentPayment(
      user,
      apartmentId,
      bookingId,
      type,
    );
  }

  @Post('/webhook')
  webhook(@Request() req, @Body() body) {
    return this.paymentsService.webhook(body);
  }
}
