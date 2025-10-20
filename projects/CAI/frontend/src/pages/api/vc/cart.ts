import type { NextApiRequest, NextApiResponse } from 'next';
import Joi from 'joi';
import { vcIssuerService } from '@server/services/vcIssuer';
import { validateSchema, ValidationError } from '@server/middleware/validation';
import { logger } from '@server/utils/logger';

const cartSchema = Joi.object({
  subject: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  cartHash: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
  items: Joi.array().items(Joi.object()).required(),
  totalAmount: Joi.string().required(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = validateSchema(cartSchema, req.body);
    const { vc, vcHash, signature } = await vcIssuerService.createCartVC(payload);
    return res.status(200).json({ vc, vcHash, signature });
  } catch (error: unknown) {
    logger.error('Failed to create Cart VC', { error });

    if (error instanceof ValidationError) {
      return res.status(error.status).json({
        error: error.message,
        details: error.details,
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
