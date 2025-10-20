export * from './client';
export * from './types';
export * from './abi';
export * from './utils';

// Re-export commonly used types and functions
export { FocusBondClient } from './client';
export type { 
  Session, 
  ContractConfig, 
  FeeCalculation, 
  FeeToken,
  StartSessionParams,
  BreakSessionParams,
  TransactionRequest 
} from './types';
export { 
  calculateBreakFee, 
  formatTokenAmount, 
  parseTokenAmount, 
  formatDuration,
  getElapsedMinutes,
  addSlippage 
} from './utils';
