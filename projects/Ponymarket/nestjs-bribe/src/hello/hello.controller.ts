import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HelloService } from './hello.service';

@ApiTags('hello')
@Controller()
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  @ApiOperation({ summary: '获取 Hello World 消息' })
  getHello(): string {
    return this.helloService.getHello();
  }
}
