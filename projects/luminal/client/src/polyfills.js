import { Buffer } from "buffer";
if (typeof globalThis !== "undefined" && !("Buffer" in globalThis)) {
    // Provide Node.js Buffer implementation for browser bundles (required by circomlibjs).
    globalThis.Buffer = Buffer;
}
if (typeof globalThis.global === "undefined") {
    // Some dependencies expect a Node-like global alias.
    globalThis.global = globalThis;
}
if (typeof globalThis.process === "undefined") {
    // Minimal process shim for packages that inspect process.env.
    globalThis
        .process = { env: {} };
}
