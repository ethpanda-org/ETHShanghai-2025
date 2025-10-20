import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto-js for testing
vi.mock('crypto-js', () => ({
  AES: {
    encrypt: (data: string) => ({
      toString: () => `encrypted_${data}`
    }),
    decrypt: (encryptedData: string) => ({
      toString: () => encryptedData.replace('encrypted_', '')
    })
  },
  enc: {
    Utf8: 'utf8'
  }
}));

// Mock ObfuscationUtils
const mockObfuscationUtils = {
  generateId: (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  shortenId: (id: string) => id.substring(0, 8),
  obfuscateId: (id: string) => `0x${id.substring(0, 8)}`,
  blurValue: (value: string | number, level: string) => value.toString(),
  randomDelay: () => Promise.resolve(),
  privateTimestamp: () => 'Just now',
  encrypt: (data: string) => `encrypted_${data}`,
  decrypt: (data: string) => data.replace('encrypted_', ''),
  toQualitative: () => 'medium' as const,
  asteriskRepresentation: () => '***',
  maskAddress: (address: string) => `${address.substring(0, 6)}...${address.substring(address.length - 4)}`,
  formatPrivatePercentage: (value: number) => `+${value.toFixed(1)}%`,
  generateRandomPriority: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
  shuffleArray: <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5)
};

// Mock DelayUtils
const mockDelayUtils = {
  randomDelay: () => Promise.resolve()
};

// Mock the utils
vi.mock('../utils/index.js', () => ({
  ObfuscationUtils: mockObfuscationUtils,
  DelayUtils: mockDelayUtils
}));

// Mock environment variables
vi.mock('../utils/obfuscation.ts', () => ({
  ObfuscationUtils: {
    ...mockObfuscationUtils,
    ENCRYPTION_KEY: 'test-key'
  }
}));