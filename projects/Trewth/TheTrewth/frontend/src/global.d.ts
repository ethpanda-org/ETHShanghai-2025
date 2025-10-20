// src/global.d.ts
export {};

declare global {
    interface Window {
        ethereum?: any; // 或者用 Eip1193Provider 类型更严格
    }
}