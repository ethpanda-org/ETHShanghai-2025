import type { NextApiRequest, NextApiResponse } from 'next';
import Joi from 'joi';
import { vcIssuerService } from '@server/services/vcIssuer';
import { validateSchema, ValidationError } from '@server/middleware/validation';
import { logger } from '@server/utils/logger';

const mandateSchema = Joi.object({
  subject: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  agent: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  budget: Joi.string().required(),
  expiry: Joi.number().positive().required(),
  whitelist: Joi.array().items(Joi.string()).default([]),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = validateSchema(mandateSchema, req.body);
    const { vc, vcHash, signature } = await vcIssuerService.createMandateVC(payload);

    const issueOnChain = req.query.onchain === 'true';

    if (issueOnChain) {
      const expiresAt = Math.floor(Date.now() / 1000) + payload.expiry;
      const receipt = await vcIssuerService.issueVCOnChain(
        payload.subject,
        vcHash,
        'MandateVC',
        expiresAt
      );

      return res.status(200).json({
        vc,
        vcHash,
        signature,
        ...receipt,
      });
    }

    return res.status(200).json({ vc, vcHash, signature });
  } catch (error: unknown) {
    logger.error('Failed to create Mandate VC', { error });

    if (error instanceof ValidationError) {
      return res.status(error.status).json({
        error: error.message,
        details: error.details,
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
