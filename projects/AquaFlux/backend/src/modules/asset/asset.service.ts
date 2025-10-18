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
            { id: { contains: search, mode: 'insensitive' } }
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
                priceHistory: true,
                portfolioPositions: true
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
   * 根据ID获取单个资产
   * @param id - 资产ID
   * @returns Promise<资产详情>
   * @throws AppError 当资产不存在时抛出404错误
   */
  public async findById(id: string) {
    try {
      const asset = await this.prisma.asset.findUnique({
        where: { id, isActive: true },
        include: {
          priceHistory: {
            orderBy: { timestamp: 'desc' },
            take: 1 // 获取最新价格
          },
          _count: {
            select: {
              portfolioPositions: true,
              swapTransactions: true,
              structureOperations: true
            }
          }
        }
      });

      if (!asset) {
        throw new AppError(`Asset with ID ${id} not found`, 404);
      }

      return this.formatAssetResponse(asset);
    } catch (error) {
      if (error instanceof AppError) throw error;
      this.logger.error('Error in AssetService.findById:', error);
      throw new AppError('Failed to fetch asset', 500);
    }
  }
}