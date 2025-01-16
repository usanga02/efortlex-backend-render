import { Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/reset-database')
  resetDatabase() {
    return this.appService.resetDatabase();
  }
}
