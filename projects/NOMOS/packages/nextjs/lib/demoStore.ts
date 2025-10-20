import { create } from "zustand";

export type ProofType = "PoP" | "PoC" | "PoE";

export interface NOMOSProfile {
  address: string;
  level: "Poor" | "Good" | "Excellent";
  score: number;
  lastActive: string;
  weeklyUbi: number;
}

interface State {
  demoMode: boolean;
  profile: NOMOSProfile | null;
  proofs: { type: ProofType; note: string; at: string }[];
  setDemoMode(d: boolean): void;
  setProfile(p: NOMOSProfile | null): void;
  addProof(p: { type: ProofType; note: string }): void;
  decayTick(): void;
  claimUBI(): number;
}

export const useDemo = create<State>((set, get) => ({
  demoMode: true,
  profile: null,
  proofs: [],
  setDemoMode: d => set({ demoMode: d }),
  setProfile: p => set({ profile: p }),
  addProof: p => set(s => ({ proofs: [...s.proofs, { ...p, at: new Date().toISOString() }] })),
  decayTick: () =>
    set(s => {
      if (!s.profile) return s;
      const decay = s.profile.score > 0 ? Math.max(1, Math.round(s.profile.score * 0.01)) : 0;
      return { profile: { ...s.profile, score: Math.max(0, s.profile.score - decay) } };
    }),
  claimUBI: () => {
    const s = get();
    if (!s.profile) return 0;
    const amount = Math.round((s.profile.score / 100) * 10);
    set({ profile: { ...s.profile, weeklyUbi: 0 } });
    return amount;
  },
}));
