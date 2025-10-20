import clsx from "clsx";
import type { SwapPhase } from "../hooks/useSwap";

const STEP_ORDER: SwapPhase[] = [
  "calculating",
  "proving",
  "awaitingSignature",
  "pending",
  "confirmed"
];

const STEPS: Array<{
  phase: SwapPhase;
  label: string;
  description: string;
}> = [
  {
    phase: "calculating",
    label: "Compute state delta",
    description: "Apply AMM formula off-chain"
  },
  {
    phase: "proving",
    label: "Generate zkSNARK",
    description: "Poseidon commitment & Groth16 proof"
  },
  {
    phase: "awaitingSignature",
    label: "Wallet confirmation",
    description: "Sign & submit swap transaction"
  },
  {
    phase: "pending",
    label: "Proof verification",
    description: "Groth16 verifier checks calldata"
  },
  {
    phase: "confirmed",
    label: "State updated",
    description: "Vault commitment replaced on-chain"
  }
];

const getStepIndex = (phase: SwapPhase) => STEP_ORDER.indexOf(phase);

const resolveState = (currentPhase: SwapPhase, stepPhase: SwapPhase) => {
  if (currentPhase === "idle") return "upcoming";
  if (currentPhase === "error") {
    return getStepIndex(stepPhase) <= getStepIndex("pending")
      ? "error"
      : "upcoming";
  }

  const currentIndex = getStepIndex(currentPhase);
  const stepIndex = getStepIndex(stepPhase);

  if (currentIndex === -1 || stepIndex === -1) return "upcoming";
  if (currentIndex > stepIndex) return "completed";
  if (currentIndex === stepIndex) return "active";
  return "upcoming";
};

type Props = {
  phase: SwapPhase;
};

export function StatusTimeline({ phase }: Props) {
  return (
    <ol className="space-y-4">
      {STEPS.map((step) => {
        const state = resolveState(phase, step.phase);
        return (
          <li
            key={step.phase}
            className="flex items-start gap-3 rounded-2xl bg-surfaceMuted px-4 py-3"
          >
            <span
              className={clsx(
                "mt-1 h-3 w-3 rounded-full",
                state === "completed" && "bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]",
                state === "active" && "bg-primary shadow-[0_0_0_4px_rgba(255,0,122,0.15)] animate-pulse",
                state === "upcoming" && "bg-neutral-700",
                state === "error" && "bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.25)]"
              )}
            />
            <div>
              <p className="text-sm font-medium text-neutral-100">{step.label}</p>
              <p className="text-xs text-neutral-500">{step.description}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
