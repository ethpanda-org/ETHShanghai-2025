'use client';
import { create } from 'zustand';
import type { ProposalDraft } from '../types';

type DraftState = {
  draft: ProposalDraft | null;
  setDraft: (d: ProposalDraft | null) => void;
  mergeDraft: (patch: Partial<ProposalDraft>) => void;
  reset: () => void;
};

export const useDraftStore = create<DraftState>((set, get) => ({
  draft: null,
  setDraft: (d) => set({ draft: d }),
  mergeDraft: (patch) => set({ draft: { ...(get().draft ?? { title:'', description:'', fundAmountWei:'0', target:'' }), ...patch } as ProposalDraft }),
  reset: () => set({ draft: null })
}));
