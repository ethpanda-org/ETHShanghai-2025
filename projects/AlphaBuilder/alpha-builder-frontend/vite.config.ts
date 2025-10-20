import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Polyfill Node's `events` module so browser bundles keep EventEmitter working.
      events: "events",
    },
  },
  optimizeDeps: {
    include: ["events"],
  },
  server: {
    proxy: {
      "/api/stability": {
        target: "https://alpha123.uk",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/data": {
        target: "https://alpha123.uk",
        changeOrigin: true,
        headers: {
          Origin: "https://alpha123.uk",
          Referer: "https://alpha123.uk/zh/",
          ...(process.env.ALPHA_BUILDER_AIRDROP_COOKIE
            ? { Cookie: process.env.ALPHA_BUILDER_AIRDROP_COOKIE }
            : {}),
        },
      },
      "/api/historydata": {
        target: "https://alpha123.uk",
        changeOrigin: true,
        headers: {
          Origin: "https://alpha123.uk",
          Referer: "https://alpha123.uk/zh/history.html",
          ...(process.env.ALPHA_BUILDER_AIRDROP_COOKIE
            ? { Cookie: process.env.ALPHA_BUILDER_AIRDROP_COOKIE }
            : {}),
        },
      },
    },
  },
});
