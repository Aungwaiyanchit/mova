import { readFile } from "node:fs/promises";
import { fail, warn } from "./log";

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export async function loadEnv(path: string): Promise<Record<string, string> | null> {
  const text = await readFile(path, "utf8").catch(() => null);
  return text === null ? null : parseEnv(text);
}

export interface KeyCheck {
  key: string;
  required: boolean;
  placeholderHints: string[];
}

const PLACEHOLDERS = ["your_", "here", "changeme", "xxx", "placeholder"];

export function isPlaceholder(value: string): boolean {
  const lower = value.toLowerCase();
  return value === "" || PLACEHOLDERS.some((hint) => lower.includes(hint));
}

export interface EnvIssue {
  key: string;
  severity: "error" | "warning";
  message: string;
}

export async function checkEnvFile(opts: {
  label: string;
  envFile: string;
  requiredKeys: KeyCheck[];
  treatMissingFileAs: "error" | "warning";
}): Promise<EnvIssue[]> {
  const issues: EnvIssue[] = [];
  const env = await loadEnv(opts.envFile);

  if (!env) {
    issues.push({
      key: ".env",
      severity: opts.treatMissingFileAs,
      message: `${opts.label}: ${opts.envFile} not found (copy from .env.example)`,
    });
    return issues;
  }

  for (const { key, required, placeholderHints } of opts.requiredKeys) {
    const value = env[key];
    if (value === undefined) {
      issues.push({
        key,
        severity: required ? "error" : "warning",
        message: `${opts.label}: ${key} is not set`,
      });
      continue;
    }
    const hints = [...placeholderHints, ...PLACEHOLDERS];
    if (hints.some((hint) => value.toLowerCase().includes(hint))) {
      issues.push({
        key,
        severity: required ? "error" : "warning",
        message: `${opts.label}: ${key} still looks like a placeholder`,
      });
    }
  }

  return issues;
}

export function reportIssues(issues: EnvIssue[]): number {
  const errors = issues.filter((i) => i.severity === "error");
  for (const issue of issues) {
    if (issue.severity === "error") {
      fail(issue.message);
    } else {
      warn(issue.message);
    }
  }
  return errors.length;
}

export async function apiKeySummary(envFile: string): Promise<string> {
  const env = await loadEnv(envFile);
  if (!env) return "no .env";
  const key = env.TMDB_API_KEY ?? env.TMDB_ACCESS_TOKEN;
  if (!key) return "TMDB key missing";
  if (isPlaceholder(key)) return "TMDB key is a placeholder";
  return `TMDB key set (${key.length} chars)`;
}
