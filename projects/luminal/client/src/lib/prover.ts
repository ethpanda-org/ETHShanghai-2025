import { groth16 } from "snarkjs";
import type { SwapCircuitInput, SwapProof } from "./types";

const CIRCUIT_WASM_PATH = "/circuits/swap_circuit.wasm";
const CIRCUIT_ZKEY_PATH = "/circuits/swap_circuit_final.zkey";

export const generateSwapProof = async (
  input: SwapCircuitInput
): Promise<SwapProof> => {
  const { proof, publicSignals } = await groth16.fullProve(
    input,
    CIRCUIT_WASM_PATH,
    CIRCUIT_ZKEY_PATH
  );

  return {
    proof,
    publicSignals: publicSignals as [string, string]
  };
};

export type SolidityProofArgs = {
  pA: [bigint, bigint];
  pB: [[bigint, bigint], [bigint, bigint]];
  pC: [bigint, bigint];
  publicSignals: [bigint, bigint];
};

export const packProofForContract = async (
  proof: SwapProof
): Promise<SolidityProofArgs> => {
  const calldata = await groth16.exportSolidityCallData(
    proof.proof,
    proof.publicSignals
  );
  const args = calldata
    .replace(/["[\]\s]/g, "")
    .split(",")
    .map((x) => BigInt(x));

  return {
    pA: [args[0], args[1]],
    pB: [
      [args[2], args[3]],
      [args[4], args[5]]
    ],
    pC: [args[6], args[7]],
    publicSignals: [args[8], args[9]]
  };
};
