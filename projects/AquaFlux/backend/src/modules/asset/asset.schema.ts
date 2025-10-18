import { z } from 'zod';

// Asset query schema
export const getAssetsQuerySchema = z.object({
  query: z.object({
    page: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1)).optional(),
    limit: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).optional(),
    sort: z.enum(['name', 'tvl', 'vol24h', 'pApy', 'cApr', 'maturity', 'createdAt']).optional(),
    order: z.enum(['asc', 'desc']).optional(),
    search: z.string().optional(),
    type: z.string().optional(),
    rating: z.string().optional(),
    chain: z.string().optional(),
    isActive: z.string().transform(val => val === 'true').optional()
  })
});

// Asset ID parameter schema
export const assetIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Asset ID is required')
  })
});

// Inferred types (matching Controller imports)
export type GetAssetsQueryInput = z.infer<typeof getAssetsQuerySchema>['query'];
export type AssetIdInput = z.infer<typeof assetIdSchema>['params'];