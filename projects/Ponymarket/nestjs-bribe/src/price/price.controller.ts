import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { PriceService } from './price.service';

/**
 * 价格控制器
 *
 * 提供 HTTP API 访问价格功能
 * 只包含真实的业务接口，不暴露测试接口
 */
@ApiTags('price')
@Controller('price')
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get()
  @ApiOperation({ summary: '获取单个资产价格' })
  @ApiQuery({
    name: 'symbol',
    description: '资产符号',
    example: 'BTC',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '成功返回价格',
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number', example: 65000 },
      },
    },
  })
  async getPrice(@Query('symbol') symbol: string): Promise<{ price: number }> {
    const price = await this.priceService.getPrice(symbol);
    return { price };
  }

  @Get('multiple')
  @ApiOperation({ summary: '获取多个资产价格' })
  @ApiQuery({
    name: 'symbols',
    description: '逗号分隔的资产符号',
    example: 'BTC,ETH,SOL',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: '返回资产价格字典',
    schema: {
      type: 'object',
      example: { BTC: 65000, ETH: 3500, SOL: 150 },
    },
  })
  async getPrices(
    @Query('symbols') symbols: string,
  ): Promise<Record<string, number>> {
    const symbolArray = symbols.split(',').map((s) => s.trim());
    return this.priceService.getPrices(symbolArray);
  }

  @Post('portfolio')
  @ApiOperation({ summary: '计算投资组合总价值' })
  @ApiBody({
    description: '持仓数据',
    schema: {
      type: 'object',
      example: { BTC: 2, ETH: 10 },
    },
  })
  @ApiResponse({
    status: 201,
    description: '返回投资组合总价值',
    schema: {
      type: 'object',
      properties: {
        totalValue: { type: 'number', example: 165000 },
      },
    },
  })
  async calculatePortfolio(
    @Body() holdings: Record<string, number>,
  ): Promise<{ totalValue: number }> {
    const totalValue =
      await this.priceService.calculatePortfolioValue(holdings);
    return { totalValue };
  }
}
