const normalizeAddress = (value) => {
    if (!value)
        return undefined;
    const trimmed = value.trim();
    if (!trimmed)
        return undefined;
    if (!trimmed.startsWith("0x") || trimmed.length !== 42) {
        console.warn(`Invalid contract address provided: ${trimmed}`);
        return undefined;
    }
    return trimmed;
};
export const appConfig = {
    ammAddress: normalizeAddress(import.meta.env.VITE_AMM_CONTRACT_ADDRESS),
    vaultAddress: normalizeAddress(import.meta.env.VITE_VAULT_CONTRACT_ADDRESS),
    viewingKey: import.meta.env.VITE_VIEWING_KEY ??
        "public-development-viewing-key-not-for-production",
    stateServiceUrl: import.meta.env.VITE_STATE_SERVICE_URL ?? undefined
};
