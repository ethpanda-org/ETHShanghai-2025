import type { NextApiRequest, NextApiResponse } from 'next';
import { ahinAnchorService, startAHINAnchorService } from '@server/services/ahinAnchor';
import { logger } from '@server/utils/logger';

startAHINAnchorService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await ahinAnchorService.getStats();
    return res.status(200).json(stats);
  } catch (error: unknown) {
    logger.error('Failed to fetch AHIN stats', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
