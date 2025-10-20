export type ShieldedToken = "WETH" | "USDC";

type StoredBalances = Record<ShieldedToken, string>;

const STORAGE_KEY = "luminial.shielded-balances.v1";
const EVENT_NAME = "shielded-balances:update";

const DEFAULT_BALANCES: StoredBalances = {
  WETH: "0",
  USDC: "0"
};

const readBalances = (): StoredBalances => {
  if (typeof window === "undefined") return { ...DEFAULT_BALANCES };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BALANCES };
    const data = JSON.parse(raw) as Partial<StoredBalances>;
    return {
      WETH: data.WETH ?? DEFAULT_BALANCES.WETH,
      USDC: data.USDC ?? DEFAULT_BALANCES.USDC
    };
  } catch (error) {
    console.warn("Failed to read shielded balances", error);
    return { ...DEFAULT_BALANCES };
  }
};

const writeBalances = (balances: StoredBalances) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(balances));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch (error) {
    console.warn("Failed to write shielded balances", error);
  }
};

export const getShieldedBalance = (token: ShieldedToken): bigint => {
  const balances = readBalances();
  return BigInt(balances[token] ?? "0");
};

export const setShieldedBalance = (
  token: ShieldedToken,
  amount: bigint
): void => {
  const balances = readBalances();
  balances[token] = amount < 0n ? "0" : amount.toString();
  writeBalances(balances);
};

export const addShieldedBalance = (
  token: ShieldedToken,
  amount: bigint
): void => {
  if (amount === 0n) return;
  const current = getShieldedBalance(token);
  setShieldedBalance(token, current + amount);
};

export const subtractShieldedBalance = (
  token: ShieldedToken,
  amount: bigint
): void => {
  if (amount === 0n) return;
  const current = getShieldedBalance(token);
  const next = current - amount;
  if (next < 0n) {
    throw new Error("Insufficient shielded balance");
  }
  setShieldedBalance(token, next);
};

export const subscribeShieldedBalances = (
  callback: () => void
): (() => void) => {
  const handler = () => callback();
  if (typeof window !== "undefined") {
    window.addEventListener(EVENT_NAME, handler);
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(EVENT_NAME, handler);
    }
  };
};

export const __internal = {
  EVENT_NAME,
  STORAGE_KEY
};
