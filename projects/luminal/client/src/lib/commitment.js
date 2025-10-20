import { poseidon as Poseidon } from "@iden3/js-crypto";
const FIELD_PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const toField = (value) => {
    const mod = value % FIELD_PRIME;
    return mod >= 0n ? mod : mod + FIELD_PRIME;
};
export async function poseidonHash(inputs) {
    const normalized = inputs.map(toField);
    const result = Poseidon.hash(normalized);
    const raw = BigInt(Poseidon.F.toString(result));
    return toField(raw);
}
export async function commitmentFromState(state) {
    return poseidonHash([
        state.reserve0,
        state.reserve1,
        state.nonce,
        state.feeBps
    ]);
}
export const hexFromBigInt = (value) => {
    const hex = value.toString(16).padStart(64, "0");
    return `0x${hex}`;
};
