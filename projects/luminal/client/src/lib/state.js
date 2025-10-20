import { appConfig } from "./config";
import { commitmentFromState, hexFromBigInt } from "./commitment";
const STORAGE_KEY = "luminal.pool-state-cache.v1";
// 硬编码的默认 fallback 值（当链上也读取失败时使用）
const DEFAULT_FALLBACK_STATE = {
    reserve0: 10n * 10n ** 18n,
    reserve1: 20000n * 10n ** 6n,
    nonce: 0n,
    feeBps: 0n
};
const readCache = () => {
    if (typeof window === "undefined")
        return {};
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw)
            return {};
        return JSON.parse(raw);
    }
    catch (error) {
        console.warn("Failed to read state cache", error);
        return {};
    }
};
const writeCache = (data) => {
    if (typeof window === "undefined")
        return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
    catch (error) {
        console.warn("Failed to write state cache", error);
    }
};
const deserializeState = (data) => ({
    reserve0: BigInt(data.reserve0),
    reserve1: BigInt(data.reserve1),
    nonce: BigInt(data.nonce),
    feeBps: BigInt(data.feeBps)
});
export const cachePoolState = (commitment, state) => {
    const cache = readCache();
    cache[hexFromBigInt(commitment)] = {
        reserve0: state.reserve0.toString(),
        reserve1: state.reserve1.toString(),
        nonce: state.nonce.toString(),
        feeBps: state.feeBps.toString()
    };
    writeCache(cache);
};
const fetchFromCache = (commitmentHex) => {
    const cache = readCache();
    const entry = cache[commitmentHex];
    return entry ? deserializeState(entry) : null;
};
const fetchFromService = async (commitmentHex) => {
    if (!appConfig.stateServiceUrl)
        return null;
    try {
        const response = await fetch(`${appConfig.stateServiceUrl}/pool-state/${commitmentHex}?viewKey=${appConfig.viewingKey}`);
        if (!response.ok) {
            console.warn("State service responded with", response.status);
            return null;
        }
        const data = (await response.json());
        const state = deserializeState(data);
        cachePoolState(BigInt(commitmentHex), state);
        return state;
    }
    catch (error) {
        console.warn("Failed to fetch state from service", error);
        return null;
    }
};
const fetchFallbackState = async (commitmentHex) => {
    try {
        const commitment = await commitmentFromState(DEFAULT_FALLBACK_STATE);
        const fallbackHex = hexFromBigInt(commitment).toLowerCase();
        if (fallbackHex === commitmentHex.toLowerCase()) {
            cachePoolState(commitment, DEFAULT_FALLBACK_STATE);
            return DEFAULT_FALLBACK_STATE;
        }
    }
    catch (e) {
        console.error('[State] Fallback failed:', e);
    }
    return null;
};
export const getPoolState = async (commitmentHex) => {
    const cached = fetchFromCache(commitmentHex);
    if (cached)
        return cached;
    const fromService = await fetchFromService(commitmentHex);
    if (fromService)
        return fromService;
    const fallback = await fetchFallbackState(commitmentHex);
    if (fallback)
        return fallback;
    // 总是返回默认状态
    if (appConfig.initialCommitment) {
        cachePoolState(BigInt(appConfig.initialCommitment), DEFAULT_FALLBACK_STATE);
    }
    return DEFAULT_FALLBACK_STATE;
};
export const listCachedCommitments = () => Object.keys(readCache());
export const clearStateCache = () => writeCache({});
