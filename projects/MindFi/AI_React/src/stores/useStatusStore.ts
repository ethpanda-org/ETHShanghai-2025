import { create } from "zustand";

interface StatusState {
    statusInfo: {
        used?: number;
        daily_limit?: number;
    } | null;
    setStatusInfo: (info: { used?: number; daily_limit?: number } | null) => void;
}

export const useStatusStore = create<StatusState>((set) => ({
    statusInfo: null,
    setStatusInfo: (info) => set({ statusInfo: info }),
}));
