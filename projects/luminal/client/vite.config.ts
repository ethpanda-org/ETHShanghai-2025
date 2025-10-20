import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { injectEnvToHtml } from "./vite-plugin-inject-env";

export default defineConfig({
  plugins: [react(), injectEnvToHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  server: {
    port: 5173,
    host: true
  }
});
