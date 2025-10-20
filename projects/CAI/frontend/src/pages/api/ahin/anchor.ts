import type { NextApiRequest, NextApiResponse } from 'next';
import { ahinAnchorService, startAHINAnchorService } from '@server/services/ahinAnchor';
import { logger } from '@server/utils/logger';

startAHINAnchorService();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = await ahinAnchorService.anchorPendingBlocks();
    return res.status(200).json(result ?? { message: 'No pending blocks' });
  } catch (error: unknown) {
    logger.error('Failed to anchor AHIN block', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
