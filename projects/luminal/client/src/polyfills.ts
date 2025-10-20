import { Buffer } from "buffer";

if (typeof globalThis !== "undefined" && !("Buffer" in globalThis)) {
  // Provide Node.js Buffer implementation for browser bundles (required by circomlibjs).
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}

if (typeof globalThis.global === "undefined") {
  // Some dependencies expect a Node-like global alias.
  (globalThis as typeof globalThis & { global: typeof globalThis }).global = globalThis;
}

if (typeof globalThis.process === "undefined") {
  // Minimal process shim for packages that inspect process.env.
  (globalThis as typeof globalThis & { process: { env: Record<string, string | undefined> } })
    .process = { env: {} };
}
