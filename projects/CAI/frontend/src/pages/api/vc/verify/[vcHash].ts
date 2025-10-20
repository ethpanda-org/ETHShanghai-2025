import type { NextApiRequest, NextApiResponse } from 'next';
import { vcIssuerService } from '@server/services/vcIssuer';
import { isValidHash } from '@server/utils/ethereum';
import { logger } from '@server/utils/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { vcHash } = req.query;

  if (typeof vcHash !== 'string' || !isValidHash(vcHash)) {
    return res.status(400).json({ error: 'Invalid credential hash' });
  }

  try {
    const isValid = await vcIssuerService.verifyVC(vcHash);
    return res.status(200).json({ vcHash, isValid });
  } catch (error: unknown) {
    logger.error('Failed to verify VC', { error });
    return res.status(500).json({ error: 'Internal server error' });
  }
}
