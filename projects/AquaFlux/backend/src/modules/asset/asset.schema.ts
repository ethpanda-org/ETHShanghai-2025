import { z } from 'zod';

// Asset query schema
export const getAssetsQuerySchema = z.object({
  query: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
    sort: z.enum(['name', 'tvl', 'vol24h', 'pApr', 'cApr', 'maturity', 'createdAt']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    type: z.string().optional(),
    rating: z.string().optional(),
    chain: z.string().optional(),
    isActive: z.string().transform(val => val === 'true').optional()
  })
});

// Price history query schema
export const priceHistoryQuerySchema = z.object({
  query: z.object({
    period: z.enum(['1d', '7d', '30d', '90d', '1y']).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(1000)).optional()
  }),
  params: z.object({
    id: z.string().min(1, 'Asset ID is required')
  })
});

// Trending assets query schema
export const trendingAssetsQuerySchema = z.object({
  query: z.object({
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(50)).optional()
  })
});

// Near maturity query schema
export const nearMaturityQuerySchema = z.object({
  query: z.object({
    days: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(365)).optional()
  })
});

// Asset ID parameter schema
export const assetIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Asset ID is required')
  })
});

// Inferred types
export type GetAssetsQueryInput = z.infer<typeof getAssetsQuerySchema>['query'];
export type PriceHistoryQueryInput = z.infer<typeof priceHistoryQuerySchema>['query'];
export type TrendingAssetsQueryInput = z.infer<typeof trendingAssetsQuerySchema>['query'];
export type NearMaturityQueryInput = z.infer<typeof nearMaturityQuerySchema>['query'];
export type AssetIdInput = z.infer<typeof assetIdSchema>['params'];