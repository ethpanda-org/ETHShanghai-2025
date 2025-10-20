import { OpenAPI } from "@/openapi";

const FALLBACK_BACKEND_BASE = "http://localhost:8000";

function normalizeBase(base: string | undefined): string {
  if (!base) return FALLBACK_BACKEND_BASE;
  const trimmed = base.trim();
  if (!trimmed) return FALLBACK_BACKEND_BASE;
  if (trimmed.length > 1 && trimmed.endsWith("/")) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

const resolvedBase = normalizeBase(process.env.NEXT_PUBLIC_BACKEND_URL);

if (!OpenAPI.BASE || OpenAPI.BASE !== resolvedBase) {
  OpenAPI.BASE = resolvedBase;
}

export const BACKEND_BASE_URL = resolvedBase;
