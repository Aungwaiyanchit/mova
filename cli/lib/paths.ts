import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..", "..");
export const API_DIR = join(ROOT, "backend");
export const WEB_DIR = join(ROOT, "frontend");

export const API_DEFAULT_PORT = 3000;
export const WEB_DEFAULT_PORT = 5173;

export interface AppPaths {
  id: "api" | "web";
  label: string;
  dir: string;
  envFile: string;
  defaultPort: number;
  healthUrl: (port: number) => string;
}

export const APPS: AppPaths[] = [
  {
    id: "api",
    label: "backend",
    dir: API_DIR,
    envFile: join(API_DIR, ".env"),
    defaultPort: API_DEFAULT_PORT,
    healthUrl: (port) => `http://127.0.0.1:${port}/api/docs`,
  },
  {
    id: "web",
    label: "frontend",
    dir: WEB_DIR,
    envFile: join(WEB_DIR, ".env"),
    defaultPort: WEB_DEFAULT_PORT,
    // Vite binds IPv6 localhost (::1) only, so probe "localhost" rather than 127.0.0.1.
    healthUrl: (port) => `http://localhost:${port}/`,
  },
];

export function appById(id: "api" | "web"): AppPaths {
  const app = APPS.find((a) => a.id === id);
  if (!app) throw new Error(`Unknown app: ${id}`);
  return app;
}

export interface CleanTarget {
  app: "api" | "web";
  path: string;
  description: string;
  aggressive: boolean;
}

export function cleanTargets(): CleanTarget[] {
  return [
    { app: "web", path: join(WEB_DIR, "node_modules/.vite"), description: "vite dev cache", aggressive: false },
    { app: "web", path: join(WEB_DIR, "node_modules/.vitest"), description: "vitest cache", aggressive: false },
    { app: "web", path: join(WEB_DIR, "node_modules/.cache"), description: "web tooling cache", aggressive: false },
    { app: "api", path: join(API_DIR, "node_modules/.cache"), description: "api tooling cache", aggressive: false },
    { app: "api", path: join(API_DIR, "dist"), description: "api build output", aggressive: false },
    { app: "web", path: join(WEB_DIR, "dist"), description: "web build output", aggressive: true },
    { app: "web", path: join(WEB_DIR, "node_modules"), description: "web dependencies", aggressive: true },
    { app: "api", path: join(API_DIR, "node_modules"), description: "api dependencies", aggressive: true },
  ];
}
