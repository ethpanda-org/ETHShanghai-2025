import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { MarketsService, type Market } from './markets.service';

@ApiTags('markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all prediction markets' })
  async getAllMarkets(): Promise<Market[]> {
    return this.marketsService.getAllMarkets();
  }

  @Get(':conditionId')
  @ApiOperation({ summary: 'Get market by condition ID' })
  async getMarket(@Param('conditionId') conditionId: string): Promise<Market | null> {
    return this.marketsService.getMarket(conditionId);
  }
}

@ApiTags('bribes')
@Controller('bribes')
export class BribesController {
  constructor(private readonly marketsService: MarketsService) {}

  @Get(':conditionId/:outcome')
  @ApiOperation({ summary: 'Get bribe pools for a market outcome' })
  async getBribes(
    @Param('conditionId') conditionId: string,
    @Param('outcome') outcome: string,
  ) {
    return this.marketsService.getBribes(conditionId, parseInt(outcome));
  }
}
