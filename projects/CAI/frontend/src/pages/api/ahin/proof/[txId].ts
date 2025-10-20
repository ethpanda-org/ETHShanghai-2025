import type { NextApiRequest, NextApiResponse } from 'next';
import { ahinChainService } from '@server/services/ahinChain';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { txId } = req.query;

  if (typeof txId !== 'string') {
    return res.status(400).json({ error: 'Invalid transaction id' });
  }

  const proof = ahinChainService.generateMerkleProof(txId);

  if (!proof) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  return res.status(200).json({ txId, proof });
}
