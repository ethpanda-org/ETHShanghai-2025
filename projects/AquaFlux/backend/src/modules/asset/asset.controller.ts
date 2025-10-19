import { Request, Response } from 'express';
import { inject, singleton } from 'tsyringe';
import { Logger } from 'pino';
import { AssetService } from './asset.service';
import {
  GetAssetsQueryInput,
  PriceHistoryQueryInput,
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

  /**
   * 获取资产详细介绍（富文本内容）
   * GET /api/v1/assets/:id/detail
   */
  public async getAssetDetail(req: Request, res: Response): Promise<void> {
    this.logger.info({ assetId: req.params.id }, 'Asset detail request received');
    const { id } = req.params as AssetIdInput;
    const assetDetail = await this.assetService.getAssetDetail(id);

    this.logger.info({ assetId: id }, 'Asset detail retrieved successfully');
    res.status(200).json({
      status: 'success',
      data: assetDetail,
      message: 'Asset detail retrieved successfully'
    });
  }
}