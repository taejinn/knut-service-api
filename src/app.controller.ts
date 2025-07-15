import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  Home() {
    // return this.appService.getHello();
    return {
      version: '0.0.1',
      message: 'KNUT SERVICE API',
    };
  }
}

