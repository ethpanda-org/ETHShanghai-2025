export interface Session {
  startTs: bigint;
  lastHeartbeatTs: bigint;
  depositWei: bigint;
  targetMinutes: number;
  isActive: boolean;
  watchdogClosed: boolean;
}

export interface ContractConfig {
  usdc: `0x${string}`;
  focus: `0x${string}`;
  rewardTreasury: `0x${string}`;
  baseFeeUsdc: bigint;
  baseFeeFocus: bigint;
  minCompleteMinutes: number;
  heartbeatGraceSecs: number;
  watchdogSlashBps: number;
}

export interface FeeCalculation {
  fee: bigint;
  feeToken: `0x${string}`;
  elapsedMinutes: number;
  feeMultiplier: number;
}

export interface TransactionRequest {
  to: `0x${string}`;
  data: `0x${string}`;
  value?: bigint;
}

export type FeeToken = 'usdc' | 'focus';

export interface StartSessionParams {
  targetMinutes: number;
  depositWei: bigint;
}

export interface BreakSessionParams {
  feeToken: FeeToken;
  maxFee: bigint;
  permitData?: {
    deadline: bigint;
    v: number;
    r: `0x${string}`;
    s: `0x${string}`;
  };
}
