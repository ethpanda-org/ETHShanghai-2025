import i18n from "i18next";
import { create } from "zustand";
import { persist } from "zustand/middleware";
// import { changeLanguage } from "@/language";  // 用你已经导出的

interface SystemState {
    language: "zh" | "en";
    setLanguage: (lang: "zh" | "en") => void;
    theme: "light" | "dark";
    toggleTheme: () => void;
    toggleLanguage: () => void;
}


export const useSystemStore = create<SystemState>()(
    persist(
        (set, get) => ({
            language: (i18n.language as "zh" | "en") || "en", // 默认中文
            theme: "light",  // 默认主题为浅色
            setLanguage: (lang) => {
                i18n.changeLanguage(lang);   // 调用 i18n 的 changeLanguage
                set({ language: lang });
            },
            toggleLanguage: () => {
                const newLang = get().language === "zh" ? "en" : "zh";
                i18n.changeLanguage(newLang);
                set({ language: newLang });
            },

            toggleTheme: () =>
                set((state) => {
                    const newTheme = state.theme === "light" ? "dark" : "light";
                    document.documentElement.classList.toggle("dark", newTheme === "dark");
                    return { theme: newTheme };
                }),
        }),
        {
            name: "system-settings", // localStorage key
        }
    )
);
