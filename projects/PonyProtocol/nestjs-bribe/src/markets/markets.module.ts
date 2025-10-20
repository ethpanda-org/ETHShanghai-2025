import { Module } from '@nestjs/common';
import { MarketsController, BribesController } from './markets.controller';
import { MarketsService } from './markets.service';

@Module({
  controllers: [MarketsController, BribesController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
