import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service.js';
import { createMessageSchema, type CreateMessageDto } from './app.schema.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('messages')
  createMessage(
    @Body({ schema: createMessageSchema }) body: CreateMessageDto,
  ): CreateMessageDto {
    return body;
  }
}
