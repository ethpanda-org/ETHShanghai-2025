export type PoolState = {
  reserve0: bigint;
  reserve1: bigint;
  nonce: bigint;
  feeBps: bigint;
};

export type SwapComputation = {
  amountIn: bigint;
  amountOut: bigint;
  amountInAfterFee: bigint;
  commitmentOld: bigint;
  commitmentNew: bigint;
  stateOld: PoolState;
  stateNew: PoolState;
};

export type SwapPreview = {
  amountOut: bigint;
  priceImpactBps: number;
  minimumOut: bigint;
};

export type Groth16Proof = {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  protocol: string;
  curve: string;
};

export type SwapProof = {
  proof: Groth16Proof;
  publicSignals: [string, string];
};

export type SwapCircuitInput = {
  commitmentOld: string;
  reserveOld0: string;
  reserveOld1: string;
  nonceOld: string;
  feeOld: string;
  feeNew: string;
  amountIn: string;
  amountOut: string;
};
