import type { NextApiRequest, NextApiResponse } from 'next';
import { ahinChainService } from '@server/services/ahinChain';
import { startAHINAnchorService } from '@server/services/ahinAnchor';
import { logger } from '@server/utils/logger';

startAHINAnchorService();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const txId = ahinChainService.addTransaction(req.body || {});
    return res.status(200).json({ txId, status: 'queued' });
  } catch (error: unknown) {
    logger.error('Failed to queue AHIN transaction', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
