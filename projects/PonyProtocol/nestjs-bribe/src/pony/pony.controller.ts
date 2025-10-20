import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PonyService } from './pony.service';

@Controller('pony')
export class PonyController {
  constructor(private readonly ponyService: PonyService) {}

  /**
   * Manually trigger harvest for a specific position
   */
  @Post('harvest')
  async harvest(@Body() body: { conditionId: string; outcome: number }) {
    const result = await this.ponyService.manualHarvest(body.conditionId, body.outcome);
    return {
      success: result.success,
      amount: result.amount.toString(),
      message: result.success 
        ? `Harvested ${result.amount} rewards` 
        : 'No rewards to harvest',
    };
  }

  /**
   * Trigger full auto-harvest cycle
   */
  @Post('harvest-all')
  async harvestAll() {
    await this.ponyService.autoHarvest();
    return { message: 'Harvest cycle triggered' };
  }
}
