import { OpenAPI, DefaultService } from "@/openapi";

// Configure base once at app bootstrap/import time
OpenAPI.BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

// Re-export generated client as the app API
export const Api = DefaultService;
export { OpenAPI } from "@/openapi";
