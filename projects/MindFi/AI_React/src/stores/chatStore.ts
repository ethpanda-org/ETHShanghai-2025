import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nanoid } from "nanoid";
import {t} from '@/language'

export type Message = { id: string; role: "user" | "assistant"; content: string };

export type ChatSession = {
    id: string;
    title: string;
    messages: Message[];
};

// chatStore.ts
export interface ChatState {
    sessions: ChatSession[];
    activeId: string | null;

    newSession: () => void;
    switchSession: (id: string) => void;
    renameSession: (id: string, title: string) => void; // ✅ 新增
    addMessage: (role: "user" | "assistant", content: string) => void;
    clearMessages: (id: string) => void;
    removeSession: (id: string) => void;
    clearAll: () => void;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set) => ({
            sessions: [
                { id: nanoid(), title: `${t("sidebar.newChat")}`, messages: [] }
            ],
            activeId: null,

            newSession: () => {
                const id = nanoid();
                set((state) => ({
                    sessions: [...state.sessions, { id, title: `${t("sidebar.newChat")} ${state.sessions.length + 1}`, messages: [] }],
                    activeId: id
                }));
            },

            switchSession: (id) => set({ activeId: id }),

            // ✅ 重命名
            renameSession: (id, title) =>
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === id ? { ...s, title } : s
                    ),
                })),
            removeSession: (id: string) =>
                set((state) => ({
                    sessions: state.sessions.filter((session) => session.id !== id),
                })),
            addMessage: (role, content) =>
                set((state) => {
                    const id = state.activeId ?? state.sessions[0].id;
                    return {
                        sessions: state.sessions.map((s) =>
                            s.id === id ? { ...s, messages: [...s.messages, { id: nanoid(), role, content }] } : s
                        ),
                    };
                }),

            clearMessages: (id) =>
                set((state) => ({
                    sessions: state.sessions.map((s) =>
                        s.id === id ? { ...s, messages: [] } : s
                    ),
                })),
            clearAll: () =>
                set(() => ({
                    sessions: [
                        { id: nanoid(), title: `${t("sidebar.defaultChat")}`, messages: [] }
                    ]
                })),
        }),
        { name: "chat-sessions" }
    )
);
