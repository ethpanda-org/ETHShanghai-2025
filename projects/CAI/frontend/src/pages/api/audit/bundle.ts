import type { NextApiRequest, NextApiResponse } from 'next';
import Joi from 'joi';
import { ethers } from 'ethers';
import { wallet } from '@server/utils/ethereum';
import { validateSchema, ValidationError } from '@server/middleware/validation';
import { logger } from '@server/utils/logger';

const bundleSchema = Joi.object({
  transactionId: Joi.string().required(),
  mandateVC: Joi.object().required(),
  cartHash: Joi.string().required(),
  receiptHash: Joi.string().required(),
}).required();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = validateSchema(bundleSchema, req.body);

    const bundle = {
      bundle_id: ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(payload))),
      timestamp: Date.now(),
      transactionId: payload.transactionId,
      mandateVC: payload.mandateVC,
      cartHash: payload.cartHash,
      receiptHash: payload.receiptHash,
      agent: wallet.address,
    };

    const signature = await wallet.signMessage(
      ethers.toUtf8Bytes(JSON.stringify(bundle))
    );

    return res.status(200).json({
      ...bundle,
      signature,
    });
  } catch (error: unknown) {
    logger.error('Failed to generate audit bundle', { error });

    if (error instanceof ValidationError) {
      return res.status(error.status).json({
        error: error.message,
        details: error.details,
      });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
}
