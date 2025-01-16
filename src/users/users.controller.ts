import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthGuard } from '../auth/guard';
import { OkResponseData } from '../common/ok-response-data';
import {
  NextofkinDto,
  UpdateDocumentDto,
  UpdateEmploymentDto,
  UpdateNotificationDto,
  UpdateUserDto,
} from './dto';
import { OverviewDto } from './dto/overview.dto';
import { UserDto } from './dto/user.dto';
import { UsersService } from './users.service';
import { User } from './users.type';

@ApiHeader({
  name: 'x-access-token',
  required: true,
  example: 'Bearer .....',
})
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @SkipThrottle()
  @ApiOkResponse({ type: UserDto })
  @UseGuards(AuthGuard)
  @Get()
  find(@CurrentUser() user: User) {
    return user;
  }

  @ApiOkResponse({ type: OverviewDto })
  @SkipThrottle()
  @UseGuards(AuthGuard)
  @Get('/overview')
  getOverview(@CurrentUser() user: User) {
    return this.usersService.getOverview(user);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'User updated successfully',
      },
    }),
  })
  @UseGuards(AuthGuard)
  @Put()
  update(@CurrentUser() user: User, @Body() args: UpdateUserDto) {
    return this.usersService.update(user, args);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'User employment updated successfully',
      },
    }),
  })
  @UseGuards(AuthGuard)
  @Put('/update-employment')
  updateEmployment(
    @CurrentUser() user: User,
    @Body() args: UpdateEmploymentDto,
  ) {
    return this.usersService.updateEmployment(user, args);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'User Next of kin updated successfully',
      },
    }),
  })
  @UseGuards(AuthGuard)
  @Put('/update-next-of-kin')
  updateNextOfKin(@CurrentUser() user: User, @Body() args: NextofkinDto) {
    return this.usersService.updateNextOfKin(user, args);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'User notification updated successfully',
      },
    }),
  })
  @UseGuards(AuthGuard)
  @Put('/update-document')
  updateDocument(@CurrentUser() user: User, @Body() args: UpdateDocumentDto) {
    return this.usersService.updateDocument(user, args);
  }

  @ApiOkResponse({
    content: OkResponseData({
      message: {
        type: 'string',
        example: 'User document updated successfully',
      },
    }),
  })
  @UseGuards(AuthGuard)
  @Put('/update-notification')
  updateNotification(
    @CurrentUser() user: User,
    @Body() args: UpdateNotificationDto,
  ) {
    return this.usersService.updateNotification(user, args);
  }
}
