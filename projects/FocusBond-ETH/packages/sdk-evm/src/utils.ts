import { type FeeCalculation, type FeeToken } from './types';

/**
 * Calculate break fee using the same formula as the contract
 * fee = base * (100 + 20 * floor(elapsedMin / 10)) / 100
 */
export function calculateBreakFee(
  elapsedMinutes: number,
  baseFeeUsdc: bigint,
  baseFeeFocus: bigint,
  feeToken: FeeToken
): FeeCalculation {
  const feeStepMin = 10;
  const feeMultiplier = 100 + (20 * Math.floor(elapsedMinutes / feeStepMin));
  
  let fee: bigint;
  let tokenAddress: `0x${string}`;
  
  if (feeToken === 'usdc') {
    fee = (baseFeeUsdc * BigInt(feeMultiplier)) / 100n;
    tokenAddress = '0x0' as `0x${string}`; // Will be set by caller
  } else {
    fee = (baseFeeFocus * BigInt(feeMultiplier)) / 100n;
    tokenAddress = '0x0' as `0x${string}`; // Will be set by caller
  }
  
  return {
    fee,
    feeToken: tokenAddress,
    elapsedMinutes,
    feeMultiplier
  };
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;
  
  if (remainder === 0n) {
    return whole.toString();
  }
  
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const trimmedRemainder = remainderStr.replace(/0+$/, '');
  
  return trimmedRemainder ? `${whole}.${trimmedRemainder}` : whole.toString();
}

/**
 * Parse token amount from string
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole) * (10n ** BigInt(decimals)) + BigInt(paddedFraction || '0');
}

/**
 * Format time duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Calculate elapsed time in minutes from timestamp
 */
export function getElapsedMinutes(startTs: bigint): number {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const elapsed = now - startTs;
  return Number(elapsed / 60n);
}

/**
 * Check if session is within heartbeat grace period
 */
export function isWithinGracePeriod(
  lastHeartbeatTs: bigint,
  heartbeatGraceSecs: number
): boolean {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const gracePeriod = BigInt(heartbeatGraceSecs);
  return now <= lastHeartbeatTs + gracePeriod;
}

/**
 * Calculate watchdog slash amount
 */
export function calculateWatchdogSlash(
  depositWei: bigint,
  watchdogSlashBps: number
): { slashedAmount: bigint; returnAmount: bigint } {
  const slashedAmount = (depositWei * BigInt(watchdogSlashBps)) / 10000n;
  const returnAmount = depositWei - slashedAmount;
  
  return { slashedAmount, returnAmount };
}

/**
 * Validate Ethereum address
 */
export function isValidAddress(address: string): address is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Add slippage to fee calculation (for maxFee parameter)
 */
export function addSlippage(amount: bigint, slippageBps: number = 100): bigint {
  return amount + (amount * BigInt(slippageBps)) / 10000n;
}
