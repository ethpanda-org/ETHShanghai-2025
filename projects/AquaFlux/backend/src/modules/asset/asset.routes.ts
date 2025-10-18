import { Router } from 'express';
import { container } from 'tsyringe';
import { AssetController } from './asset.controller';
import { catchAsync } from '@/utils/catchAsync';
import { validate } from '@/middlewares/validate.middleware';
import {
  getAssetsQuerySchema,
} from './asset.schema';

export const configureAssetRoutes = (router: Router): void => {
  const assetController = container.resolve(AssetController);

  // Public routes (no authentication required)
  router.get(
    '/',
    validate(getAssetsQuerySchema),
    catchAsync(assetController.getAssets.bind(assetController))
  );
};