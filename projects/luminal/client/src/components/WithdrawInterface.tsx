import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { TokenInput } from "./TokenInput";
import { parseAmount, formatBigint } from "../lib/math";
import { useWithdraw, type WithdrawToken } from "../hooks/useWithdraw";
import { usePoolState } from "../hooks/usePoolState";

const TOKEN_LABEL: Record<WithdrawToken, { symbol: string; decimals: number }> =
  {
    WETH: { symbol: "ETH", decimals: 18 },
    USDC: { symbol: "USDC", decimals: 6 }
  };

const sanitizeInput = (value: string) => {
  const normalized = value.replace(/,/g, ".");
  if (normalized === ".") return "0.";
  return normalized.replace(/[^0-9.]/g, "");
};

export function WithdrawInterface() {
  const { isConnected, address } = useAccount();
  const { merkleRoot } = usePoolState();
  const withdraw = useWithdraw();

  const [token, setToken] = useState<WithdrawToken>("USDC");
  const [amountRaw, setAmountRaw] = useState("0.0");

  useEffect(() => {
    setAmountRaw("0.0");
  }, [token]);

  const decimals = TOKEN_LABEL[token].decimals;
  const amount = useMemo(
    () => parseAmount(amountRaw || "0", decimals),
    [amountRaw, decimals]
  );

  const buttonLabel = useMemo(() => {
    if (!isConnected) return "Connect wallet";
    switch (withdraw.phase) {
      case "preparing":
        return "Preparing withdrawal";
      case "awaitingSignature":
        return "Confirm in wallet";
      case "pending":
        return "Awaiting confirmation";
      case "confirmed":
        return "Withdrawal complete";
      case "error":
        return "Retry withdrawal";
      default:
        return "Withdraw";
    }
  }, [withdraw.phase, isConnected]);

  const availableBalance = withdraw.balances[token] ?? 0n;
  const formattedAvailable = formatBigint(availableBalance, decimals, 6);

  const buttonDisabled =
    !isConnected ||
    amount <= 0n ||
    amount > availableBalance ||
    ["preparing", "awaitingSignature", "pending"].includes(withdraw.phase);

  const formatForInput = (value: bigint, tokenDecimals: number) => {
    const scale = 10n ** BigInt(tokenDecimals);
    const integer = value / scale;
    const fraction = value % scale;
    if (fraction === 0n) return integer.toString();
    return `${integer.toString()}.${fraction
      .toString()
      .padStart(tokenDecimals, "0")
      .replace(/0+$/, "")}`;
  };

  const handleMax = () => {
    setAmountRaw(formatForInput(availableBalance, decimals));
  };

  const caption =
    amount > 0n
      ? `~ ${formatBigint(amount, decimals, 4)} ${TOKEN_LABEL[token].symbol}`
      : undefined;

  const handleWithdraw = async () => {
    if (buttonDisabled) return;
    try {
      await withdraw.executeWithdraw({
        token,
        amount,
        merkleRoot
      });
    } catch (error) {
      // errors are handled in hook state
      console.error("Withdraw failed", error);
    }
  };

  return (
    <section className="w-full max-w-3xl rounded-3xl bg-surface/90 p-8 backdrop-blur-xl shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">
            Unshield · Withdraw
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">
            Exit back to your public wallet.
          </h2>
          <p className="mt-2 text-sm text-neutral-400">
            Generate a nullifier and request tokens from the vault. Proof
            verification is simplified for the hackathon demo.
          </p>
        </header>

        <div className="space-y-5">
          <div className="flex gap-3">
            {(["USDC", "WETH"] as WithdrawToken[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setToken(option)}
                className={`flex-1 rounded-xl border border-transparent px-4 py-3 text-sm font-medium transition ${
                  token === option
                    ? "bg-primary text-white shadow-[0_12px_30px_rgba(255,0,122,0.25)]"
                    : "bg-surfaceMuted text-neutral-300 hover:bg-surfaceHighlight"
                }`}
              >
                {TOKEN_LABEL[option].symbol}
              </button>
            ))}
          </div>

          <TokenInput
            label="Withdraw amount"
            value={amountRaw}
            onChange={(next) => setAmountRaw(sanitizeInput(next))}
            tokenSymbol={TOKEN_LABEL[token].symbol}
            tokenLabel="Public"
            placeholder="0.0"
            caption={caption}
          />

          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>
              Available:{" "}
              <span className="text-neutral-300">
                {formattedAvailable} {TOKEN_LABEL[token].symbol}
              </span>
            </span>
            <button
              type="button"
              onClick={handleMax}
              className="text-primary transition hover:underline"
            >
              Max
            </button>
          </div>

          <button
            type="button"
            onClick={handleWithdraw}
            disabled={buttonDisabled}
            className={`w-full rounded-2xl py-4 text-lg font-semibold transition ${
              buttonDisabled
                ? "cursor-not-allowed bg-neutral-700 text-neutral-500"
                : "bg-primary text-white shadow-[0_18px_40px_rgba(255,0,122,0.35)] hover:brightness-110"
            }`}
          >
            {buttonLabel}
          </button>

          {withdraw.error ? (
            <p className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {withdraw.error}
            </p>
          ) : null}

          {withdraw.txHash ? (
            <p className="break-all text-xs text-neutral-500">
              Tx: {withdraw.txHash}
            </p>
          ) : null}

          {!withdraw.error && withdraw.phase === "confirmed" ? (
            <p className="rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Withdrawal succeeded. Check your wallet balance for{" "}
              {TOKEN_LABEL[token].symbol}.
            </p>
          ) : null}

          {!address ? (
            <p className="text-xs text-neutral-500">
              Connect a wallet to withdraw assets.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
