import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Query,
  Body,
  Patch,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { AuthGuard } from '../auth/guard';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ApartmentBookingDto,
  ApartmentBookingsDto,
} from './dto/apartment-bookings.dto';
import { OkResponseData } from '../common/ok-response-data';
import { User } from '../users/users.type';
import { CurrentUser } from '../auth/current-user.decorator';
import { OptionalParseIntPipe } from '../utils';
import { CreateBookingDto, EditBookingDto } from './dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiHeader({
  name: 'x-access-token',
  required: true,
  example: 'Bearer .....',
})
@ApiTags('Bookings')
@SkipThrottle()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'Booking created',
      },
    }),
  })
  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() args: CreateBookingDto) {
    return this.bookingsService.create(user.id, args);
  }

  @ApiOkResponse({ type: ApartmentBookingsDto })
  @Get()
  @UseGuards(AuthGuard)
  findAll(
    @Query('offset', OptionalParseIntPipe) offset: number = 0,
    @Query('limit', OptionalParseIntPipe) limit: number = 10,
    @Query('search') search: string,
    @Query('status') status: string,
    @Query('date') date: string,
    @CurrentUser() user: User,
  ) {
    return this.bookingsService.findAll(
      user.id,
      offset,
      limit,
      status,
      search,
      date,
    );
  }

  @ApiOkResponse({ type: ApartmentBookingDto || null })
  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.findOne(user.id, id);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'Apartment Booking with id #${id} deleted successfully',
      },
    }),
  })
  @Patch(':id')
  @UseGuards(AuthGuard)
  edit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() args: EditBookingDto,
  ) {
    return this.bookingsService.edit(user.id, id, args);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'Apartment Booking with id #${id} deleted successfully',
      },
    }),
  })
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.bookingsService.remove(user.id, id);
  }
}
