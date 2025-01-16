import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
  Patch,
} from '@nestjs/common';
import { MaintenanceRequestsService } from './maintenance-requests.service';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/users.type';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { OkResponseData } from '../common/ok-response-data';
import { AuthGuard } from '../auth/guard';
import {
  MaintenanceRequestDto,
  MaintenanceRequestsDto,
} from './dto/maintenance-requests.dto';
import { OptionalParseIntPipe } from '../utils';
import { SkipThrottle } from '@nestjs/throttler';
import { EditMaintenanceRequestDto } from './dto/edit-maintenance-request.dto';

@ApiTags('Maintenance request')
@SkipThrottle()
@Controller('maintenance_requests')
export class MaintenanceRequestsController {
  constructor(
    private readonly maintenanceRequestsService: MaintenanceRequestsService,
  ) {}

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'Maintenance request created',
      },
    }),
  })
  @Post()
  @UseGuards(AuthGuard)
  create(@CurrentUser() user: User, @Body() args: CreateMaintenanceRequestDto) {
    return this.maintenanceRequestsService.create(user.id, args);
  }

  @ApiOkResponse({ type: MaintenanceRequestsDto })
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
    return this.maintenanceRequestsService.findAll(
      user.id,
      offset,
      limit,
      search,
      status,
      date,
    );
  }

  @ApiOkResponse({ type: MaintenanceRequestDto || null })
  @Get(':id')
  @UseGuards(AuthGuard)
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.maintenanceRequestsService.findOne(user.id, id);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'Maintainance Request with id #${id} deleted successfully',
      },
    }),
  })
  @Patch(':id')
  @UseGuards(AuthGuard)
  edit(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() args: EditMaintenanceRequestDto,
  ) {
    return this.maintenanceRequestsService.edit(user.id, id, args);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'Maintainance Request with id #${id} deleted successfully',
      },
    }),
  })
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.maintenanceRequestsService.remove(user.id, id);
  }
}
