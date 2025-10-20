import { poseidon as Poseidon } from "@iden3/js-crypto";
import type { PoolState } from "./types";

const FIELD_PRIME =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

const toField = (value: bigint) => {
  const mod = value % FIELD_PRIME;
  return mod >= 0n ? mod : mod + FIELD_PRIME;
};

export async function poseidonHash(inputs: readonly bigint[]) {
  const normalized = inputs.map(toField) as bigint[];
  const result = Poseidon.hash(normalized);
  return BigInt(Poseidon.F.toString(result));
}

export async function commitmentFromState(state: PoolState) {
  return poseidonHash([
    state.reserve0,
    state.reserve1,
    state.nonce,
    state.feeBps
  ]);
}

export const hexFromBigInt = (value: bigint): `0x${string}` => {
  const hex = value.toString(16).padStart(64, "0");
  return `0x${hex}` as const;
};
