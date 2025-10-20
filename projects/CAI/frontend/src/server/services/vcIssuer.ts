import { ethers } from 'ethers';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { wallet, getContract } from '../utils/ethereum';

const CAI_REGISTRY_ABI = [
  'function issueCredential(address subject, bytes32 credentialHash, string credentialType, uint256 expiresAt) external',
  'function verifyCredential(bytes32 credentialHash) view returns (bool)',
] as const;

interface CreateVCInput {
  subject: string;
  credentialType?: string;
  claims: Record<string, unknown>;
  expiresAt: number;
}

interface MandateVCInput {
  subject: string;
  agent: string;
  budget: string;
  expiry: number;
  whitelist?: string[];
}

interface CartVCInput {
  subject: string;
  cartHash: string;
  items: Array<Record<string, unknown>>;
  totalAmount: string;
}

export interface VCResult {
  vc: VerifiableCredential;
  vcHash: string;
  signature: string;
}

interface VerifiableCredential {
  '@context': string[];
  id: string;
  type: string[];
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    signatureValue: string;
  };
}

class VCIssuerService {
  private registry;

  constructor() {
    const registryAddress =
      process.env.CAI_REGISTRY_ADDRESS || process.env.NEXT_PUBLIC_CAI_REGISTRY;

    if (!registryAddress) {
      throw new Error(
        'CAI_REGISTRY_ADDRESS is not configured. Set it in your environment variables.'
      );
    }

    this.registry = getContract(registryAddress, CAI_REGISTRY_ABI);
  }

  async createVC(data: CreateVCInput): Promise<VCResult> {
    const { subject, credentialType = 'MandateVC', claims, expiresAt } = data;

    const vc: VerifiableCredential = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', credentialType],
      issuer: wallet.address,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(expiresAt * 1000).toISOString(),
      credentialSubject: {
        id: subject,
        ...claims,
      },
    };

    const vcString = JSON.stringify(vc);
    const vcHash = ethers.keccak256(ethers.toUtf8Bytes(vcString));
    const signature = await wallet.signMessage(ethers.getBytes(vcHash));

    vc.proof = {
      type: 'EcdsaSecp256k1Signature2019',
      created: new Date().toISOString(),
      verificationMethod: wallet.address,
      proofPurpose: 'assertionMethod',
      signatureValue: signature,
    };

    logger.info('VC created', { vcId: vc.id, subject, credentialType });

    return { vc, vcHash, signature };
  }

  async issueVCOnChain(
    subject: string,
    vcHash: string,
    credentialType: string,
    expiresAt: number
  ) {
    try {
      const tx = await this.registry.issueCredential(
        subject,
        vcHash,
        credentialType,
        expiresAt
      );

      logger.info('Issuing VC on-chain', { txHash: tx.hash });

      const receipt = await tx.wait();

      logger.info('VC issued successfully', {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error) {
      logger.error('Failed to issue VC on-chain', { error });
      throw error;
    }
  }

  async verifyVC(vcHash: string): Promise<boolean> {
    try {
      const isValid = await this.registry.verifyCredential(vcHash);
      logger.info('VC verification', { vcHash, isValid });
      return isValid;
    } catch (error) {
      logger.error('Failed to verify VC', { error });
      throw error;
    }
  }

  async createMandateVC(data: MandateVCInput) {
    const { subject, agent, budget, expiry, whitelist = [] } = data;
    const expiresAt = Math.floor(Date.now() / 1000) + expiry;

    return this.createVC({
      subject,
      credentialType: 'MandateVC',
      claims: { agent, budget, expiry, whitelist },
      expiresAt,
    });
  }

  async createCartVC(data: CartVCInput) {
    const { subject, cartHash, items, totalAmount } = data;
    const expiresAt = Math.floor(Date.now() / 1000) + 3600;

    return this.createVC({
      subject,
      credentialType: 'CartVC',
      claims: { cartHash, items, totalAmount },
      expiresAt,
    });
  }
}

export const vcIssuerService = new VCIssuerService();
