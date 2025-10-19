import { inject, singleton } from 'tsyringe';
import { PrismaClient, Asset, Prisma } from '@prisma/client';
import { Logger } from 'pino';
import AppError from '@/utils/appError';

// 资产查询选项接口
interface AssetQueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  type?: string;
  rating?: string;
  chain?: string;
  isActive?: boolean;
}

// 价格历史查询选项
interface PriceHistoryOptions {
  period?: '1d' | '7d' | '30d' | '90d' | '1y';
  limit?: number;
}

// 资产统计接口
interface AssetStatistics {
  totalAssets: number;
  totalTVL: number;
  averageAPY: number;
  assetsByType: Record<string, number>;
  assetsByRating: Record<string, number>;
  assetsByChain: Record<string, number>;
}

@singleton()
export class AssetService {
  constructor(
    @inject('PrismaClient') private readonly prisma: PrismaClient,
    @inject('Logger') private readonly logger: Logger
  ) {}

  /**
   * 获取所有资产（支持过滤、排序、分页）
   * @param options - 查询选项，包含分页、排序和过滤条件
   * @returns Promise<分页的资产列表>
   */
  public async findAll(options: AssetQueryOptions = {}) {
    const {
      page = 1,
      limit = 10,
      sort = 'createdAt',
      order = 'desc',
      search = '',
      type,
      rating,
      chain,
      isActive = true
    } = options;

    try {
      // 构建查询条件
      const where: Prisma.AssetWhereInput = {
        isActive,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { issuer: { contains: search, mode: 'insensitive' } },
            { assetId: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(type && { type }),
        ...(rating && { rating }),
        ...(chain && { chain })
      };

      // 计算分页
      const skip = (page - 1) * limit;

      // 执行查询
      const [assets, totalCount] = await Promise.all([
        this.prisma.asset.findMany({
          where,
          orderBy: { [sort]: order },
          skip,
          take: limit,
          include: {
            _count: {
              select: {
                priceHistory: true
                // portfolioPositions removed - using Multicall2 for real-time data
              }
            }
          }
        }),
        this.prisma.asset.count({ where })
      ]);

      // 计算分页信息
      const totalPages = Math.ceil(totalCount / limit);

      return {
        assets: assets.map(asset => this.formatAssetResponse(asset)),
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      this.logger.error('Error in AssetService.findAll:', error);
      throw new AppError('Failed to fetch assets', 500);
    }
  }

  /**
   * 根据assetId获取单个资产
   * @param assetId - 资产ID (区块链上的资产唯一标识符)
   * @returns Promise<资产详情>
   * @throws AppError 当资产不存在时抛出404错误
   */
  public async findById(assetId: string) {
    try {
      this.logger.info(`Attempting to find asset with assetId: ${assetId}`);

      const asset = await this.prisma.asset.findUnique({
        where: { assetId, isActive: true },
        include: {
          _count: {
            select: {
              priceHistory: true
              // portfolioPositions removed - using Multicall2 for real-time data
            }
          }
        }
      });

      if (!asset) {
        throw new AppError(`Asset with assetId ${assetId} not found`, 404);
      }

      return this.formatAssetResponse(asset);
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('Error in AssetService.findById:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        assetId
      });
      throw new AppError('Failed to fetch asset', 500);
    }
  }

  /**
   * 获取资产详细介绍
   * @param assetId - 资产ID
   * @returns Promise<资产富文本详细介绍>
   * @throws AppError 当资产不存在时抛出404错误
   */
  public async getAssetDetail(assetId: string) {
    try {
      this.logger.info(`Attempting to find asset detail for assetId: ${assetId}`);

      // 先检查资产是否存在
      const asset = await this.prisma.asset.findUnique({
        where: { assetId, isActive: true }
      });

      if (!asset) {
        throw new AppError(`Asset with assetId ${assetId} not found`, 404);
      }

      // 查询资产详细介绍
      const assetDetail = await this.prisma.assetDetail.findUnique({
        where: { assetId }
      });

      if (!assetDetail) {
        throw new AppError(`Asset detail for assetId ${assetId} not found`, 404);
      }

      return {
        assetId: assetDetail.assetId,
        richTextContent: assetDetail.richTextContent,
        contentType: assetDetail.contentType,
        createdAt: assetDetail.createdAt,
        updatedAt: assetDetail.updatedAt
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('Error in AssetService.getAssetDetail:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        assetId
      });
      throw new AppError('Failed to fetch asset detail', 500);
    }
  }

  /**
   * 格式化资产响应数据
   * @param asset - 原始资产数据，包含关联关系
   * @returns 格式化后的资产响应对象
   */
  private formatAssetResponse(asset: any) {
    return {
      assetId: asset.assetId,
      name: asset.name,
      issuer: asset.issuer,
      type: asset.type,
      rating: asset.rating,
      chain: asset.chain,
      maturity: asset.maturity,
      duration: Number(asset.duration),
      // 区块链合约地址信息
      rwaToken: asset.rwaTokenAddress,
      aqToken: asset.aqTokenAddress,
      pTokenAddress: asset.pTokenAddress,
      cTokenAddress: asset.cTokenAddress,
      sTokenAddress: asset.sTokenAddress,
      // 市场数据
      tvl: Number(asset.tvl),
      vol24h: Number(asset.vol24h),
      pApr: Number(asset.pApr),
      cApr: Number(asset.cApr),
      sApr: Number(asset.sApr),
      sAprRange: asset.sAprRange,
      lcr: Number(asset.lcr),
      nav: Number(asset.nav),
      discountP: Number(asset.discountP),
      rewards: asset.rewards,
      isNew: asset.isNew,
      isActive: asset.isActive,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      // 计算的字段
      daysToMaturity: asset.maturity ? 
        Math.ceil((new Date(asset.maturity).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
        null,
      riskScore: this.calculateRiskScore(asset.rating),
      // 统计信息
      ...(asset._count && {
        priceHistoryCount: asset._count.priceHistory,
        // portfolioPositionsCount removed - no longer tracked in database (using Multicall2)
        structureOperationsCount: asset._count.structureOperations
      }),
      // 最新价格（如果有）
      ...(asset.priceHistory && asset.priceHistory.length > 0 && {
        latestPrice: {
          nav: Number(asset.priceHistory[0].nav),
          discountP: Number(asset.priceHistory[0].discountP),
          pPrice: asset.priceHistory[0].pPrice ? Number(asset.priceHistory[0].pPrice) : null,
          cPrice: asset.priceHistory[0].cPrice ? Number(asset.priceHistory[0].cPrice) : null,
          sPrice: asset.priceHistory[0].sPrice ? Number(asset.priceHistory[0].sPrice) : null,
          timestamp: asset.priceHistory[0].timestamp
        }
      })
    };
  }

  /**
   * 计算风险评分
   * @param rating - 信用评级（可选）
   * @returns 风险评分（1-20），评级越高分数越低
   */
  private calculateRiskScore(rating?: string | null): number {
    if (!rating) return 10; // 默认风险评分

    const ratingMap: Record<string, number> = {
      'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4,
      'A+': 5, 'A': 6, 'A-': 7,
      'BBB+': 8, 'BBB': 9, 'BBB-': 10,
      'BB+': 11, 'BB': 12, 'BB-': 13,
      'B+': 14, 'B': 15, 'B-': 16,
      'CCC': 17, 'CC': 18, 'C': 19, 'D': 20
    };

    return ratingMap[rating] || 10;
  }
}