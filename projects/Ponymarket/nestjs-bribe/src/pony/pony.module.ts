import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PonyService } from './pony.service';
import { PonyController } from './pony.controller';
import { MarketsModule } from '../markets/markets.module';

@Module({
  imports: [ScheduleModule.forRoot(), MarketsModule],
  controllers: [PonyController],
  providers: [PonyService],
  exports: [PonyService],
})
export class PonyModule {}
