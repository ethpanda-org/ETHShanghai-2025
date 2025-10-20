import { RingSignatureGenerator } from '@/utils/ring-signature';
import { ethers } from 'ethers';
import type { RingMember } from '@/types/ringvrm';

describe('RingSignatureGenerator', () => {
  let generator: RingSignatureGenerator;
  let testWallet: ethers.Wallet;
  let ringMembers: RingMember[];

  beforeEach(() => {
    generator = new RingSignatureGenerator();
    testWallet = ethers.Wallet.createRandom();

    // Create test ring members
    ringMembers = [
      {
        address: testWallet.address,
        publicKey: testWallet.publicKey
      },
      ...Array.from({ length: 5 }, () => {
        const wallet = ethers.Wallet.createRandom();
        return {
          address: wallet.address,
          publicKey: wallet.publicKey
        };
      })
    ];
  });

  describe('generateRingSignature', () => {
    it('should generate a valid ring signature', async () => {
      const message = 'Test message for ring signature';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      expect(signature).toHaveProperty('ringSize', ringMembers.length);
      expect(signature).toHaveProperty('messageHash');
      expect(signature).toHaveProperty('c0');
      expect(signature).toHaveProperty('s');
      expect(signature).toHaveProperty('keyImage');
      expect(signature).toHaveProperty('ringMembers');
      expect(signature.s).toHaveLength(ringMembers.length);
    });

    it('should generate different signatures for different messages', async () => {
      const message1 = 'First message';
      const message2 = 'Second message';
      const signerIndex = 0;

      const sig1 = await generator.generateRingSignature(
        message1,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      const sig2 = await generator.generateRingSignature(
        message2,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      expect(sig1.messageHash).not.toBe(sig2.messageHash);
      expect(sig1.c0).not.toBe(sig2.c0);
    });

    it('should work with different signer positions', async () => {
      const message = 'Test message';
      const signerIndex = 2;

      // Put test wallet at position 2
      const modifiedRingMembers = [...ringMembers];
      modifiedRingMembers[2] = {
        address: testWallet.address,
        publicKey: testWallet.publicKey
      };

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        modifiedRingMembers,
        signerIndex
      );

      expect(signature.ringSize).toBe(modifiedRingMembers.length);
      expect(signature.s).toHaveLength(modifiedRingMembers.length);
    });
  });

  describe('verifyRingSignature', () => {
    it('should verify a valid ring signature', async () => {
      const message = 'Test message';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      const isValid = await generator.verifyRingSignature(signature, message);
      expect(isValid).toBe(true);
    });

    it('should reject signature with wrong message', async () => {
      const message = 'Original message';
      const wrongMessage = 'Wrong message';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      const isValid = await generator.verifyRingSignature(signature, wrongMessage);
      expect(isValid).toBe(false);
    });

    it('should reject signature with wrong ring size', async () => {
      const message = 'Test message';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      // Modify ring size
      signature.ringSize = 999;

      const isValid = await generator.verifyRingSignature(signature, message);
      expect(isValid).toBe(false);
    });
  });

  describe('selectDecoys', () => {
    it('should select the correct number of decoys', async () => {
      const count = 10;
      const excludeAddress = testWallet.address;
      const asset = 'ETH';

      const decoys = await generator.selectDecoys(count, excludeAddress, asset);

      expect(decoys).toHaveLength(count);
      decoys.forEach(decoy => {
        expect(decoy).toHaveProperty('address');
        expect(decoy).toHaveProperty('publicKey');
        expect(decoy.address).not.toBe(excludeAddress);
      });
    });

    it('should generate unique decoys', async () => {
      const count = 10;
      const excludeAddress = testWallet.address;
      const asset = 'ETH';

      const decoys = await generator.selectDecoys(count, excludeAddress, asset);
      const addresses = decoys.map(d => d.address);
      const uniqueAddresses = new Set(addresses);

      expect(uniqueAddresses.size).toBe(count);
    });
  });

  describe('calculateAnonymitySet', () => {
    it('should calculate correct anonymity set sizes', () => {
      expect(generator.calculateAnonymitySet(0)).toBe(8);
      expect(generator.calculateAnonymitySet(1)).toBe(16);
      expect(generator.calculateAnonymitySet(2)).toBe(32);
      expect(generator.calculateAnonymitySet(3)).toBe(64);
      expect(generator.calculateAnonymitySet(4)).toBe(100); // Max limit
    });

    it('should not exceed maximum anonymity set', () => {
      const result = generator.calculateAnonymitySet(10);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe('generateRingProof', () => {
    it('should generate a valid ring proof', async () => {
      const message = 'Test message';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        ringMembers,
        signerIndex
      );

      const proof = generator.generateRingProof(signature);

      expect(proof).toBeDefined();
      expect(typeof proof).toBe('string');
      expect(proof.startsWith('0x')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle minimum ring size', async () => {
      const minRing = ringMembers.slice(0, 3);
      const message = 'Test message';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        minRing,
        signerIndex
      );

      expect(signature.ringSize).toBe(3);
      expect(signature.s).toHaveLength(3);
    });

    it('should handle large ring sizes', async () => {
      const largeRing = Array.from({ length: 20 }, () => {
        const wallet = ethers.Wallet.createRandom();
        return {
          address: wallet.address,
          publicKey: wallet.publicKey
        };
      });
      largeRing[0] = {
        address: testWallet.address,
        publicKey: testWallet.publicKey
      };

      const message = 'Test message';
      const signerIndex = 0;

      const signature = await generator.generateRingSignature(
        message,
        testWallet.privateKey,
        largeRing,
        signerIndex
      );

      expect(signature.ringSize).toBe(20);
      expect(signature.s).toHaveLength(20);
    });
  });
});