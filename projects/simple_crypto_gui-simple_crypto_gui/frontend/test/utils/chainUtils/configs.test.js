import { defaultChains, getCustomChains, saveCustomChains, isProduction } from '../../../src/utils/chainUtils/configs';

describe('chainUtils/configs', () => {
  test('should export isProduction as false', () => {
    expect(isProduction).toBe(false);
  });

  test('should have default chains defined', () => {
    expect(Array.isArray(defaultChains)).toBe(true);
    expect(defaultChains.length).toBeGreaterThan(0);
  });

  test('should export getCustomChains function', () => {
    expect(typeof getCustomChains).toBe('function');
  });

  test('should export saveCustomChains function', () => {
    expect(typeof saveCustomChains).toBe('function');
  });
});