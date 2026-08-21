import { checkEnvFile, reportIssues, type EnvIssue } from "../lib/env";
import { ok, fail, plain, step, paint } from "../lib/log";
import { fetchAlive } from "../lib/proc";
import { APPS } from "../lib/paths";

export interface HealthOptions {
  apiPort: number;
  webPort: number;
  waitSeconds: number;
}

const POLL_INTERVAL_MS = 500;

async function waitForService(url: string, label: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  process.stdout.write(` → waiting for ${label}…`);
  while (Date.now() < deadline) {
    if (await fetchAlive(url, 2000)) {
      process.stdout.write("\n");
      return true;
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  process.stdout.write("\n");
  return false;
}

export async function healthCommand(opts: HealthOptions): Promise<number> {
  let failures = 0;

  step("Environment");
  const apiIssues: EnvIssue[] = await checkEnvFile({
    label: "backend",
    envFile: APPS[0].envFile,
    requiredKeys: [{ key: "TMDB_API_KEY", required: true, placeholderHints: [] }],
    treatMissingFileAs: "error",
  });
  const webIssues: EnvIssue[] = await checkEnvFile({
    label: "frontend",
    envFile: APPS[1].envFile,
    requiredKeys: [],
    treatMissingFileAs: "warning",
  });
  failures += reportIssues(apiIssues) + reportIssues(webIssues);
  if (apiIssues.length === 0 && webIssues.length === 0) ok("Environment files look good");

  step("Services");
  const checks = [
    { label: "backend", url: APPS[0].healthUrl(opts.apiPort) },
    { label: "frontend", url: APPS[1].healthUrl(opts.webPort) },
  ];

  for (const { label, url } of checks) {
    let alive = false;
    if (opts.waitSeconds > 0 && label === "backend") {
      alive = await waitForService(url, label, opts.waitSeconds * 1000);
    } else {
      alive = await fetchAlive(url, 2000);
    }
    if (alive) {
      ok(`${label} is up  ${paint("gray", url)}`);
    } else {
      fail(`${label} is down  (${url})`);
      failures += 1;
    }
  }

  plain("");
  if (failures > 0) {
    fail(`${failures} check(s) failed`);
    return 1;
  }
  ok("All health checks passed");
  return 0;
}
