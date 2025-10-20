import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    name: 'CAI Framework API',
    version: '1.0.0',
    status: 'healthy',
    endpoints: {
      vc: '/api/vc',
      ahin: '/api/ahin',
      audit: '/api/audit',
    },
  });
}
