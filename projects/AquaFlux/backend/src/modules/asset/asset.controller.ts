import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { Logger } from 'pino';
import { RequestWithUser } from '@/types/express';
import { AssetService } from './asset.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  GetAssetsQueryInput,
  AssetIdInput
} from './asset.schema';

@singleton()
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    @inject('Logger') private readonly logger: Logger
  ) {}

  /**
   * 获取所有资产
   * GET /api/v1/assets
   */
  public async getAssets(req: Request, res: Response): Promise<void> {
    this.logger.info({ query: req.query }, 'Assets retrieval request received');
    const queryData = req.query as GetAssetsQueryInput;
    const result = await this.assetService.findAll(queryData);

    this.logger.info({ count: result.assets.length }, 'Assets retrieved successfully');
    res.status(200).json({
      status: 'success',
      data: result,
      message: `Retrieved ${result.assets.length} assets`
    });
  }

  /**
   * 根据ID获取单个资产
   * GET /api/v1/assets/:id
   */
  public async getAsset(req: Request, res: Response): Promise<void> {
    this.logger.info({ assetId: req.params.id }, 'Asset retrieval request received');
    const { id } = req.params as AssetIdInput;
    const asset = await this.assetService.findById(id);

    this.logger.info({ assetId: id }, 'Asset retrieved successfully');
    res.status(200).json({
      status: 'success',
      data: asset,
      message: 'Asset retrieved successfully'
    });
  }
}