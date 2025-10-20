"use client";

import { OpenAPI } from "@/openapi";
import { toast } from "@/components/toast";
import axios from "axios";

function extractErrorMessage(body: unknown): string | undefined {
  try {
    if (!body) return undefined;
    if (typeof body === "string") return body;
    const anyBody = body as any;
    return (
      anyBody?.detail ?? anyBody?.message ?? anyBody?.error ?? anyBody?.cause
    );
  } catch (_) {
    return undefined;
  }
}

export function setupApiInterceptors() {
  if (typeof window === "undefined") return; // client-only
  const base = (OpenAPI.BASE || "").replace(/\/$/, "");
  if (!base) return;

  axios.interceptors.response.use(
    (res) => res,
    async (error) => {
      try {
        const { response } = error || {};
        if (response && typeof response?.status === "number") {
          const data = response.data;
          const message = extractErrorMessage(data) || `Request failed (${response.status})`;
          toast({ type: "error", description: String(message) });
        }
      } catch (_) {}
      return Promise.reject(error);
    }
  );
}
