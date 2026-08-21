import { join } from "node:path";
import { checkEnvFile, type EnvIssue } from "../lib/env";
import { dirSize, formatBytes, fail, ok, warn, plain, step } from "../lib/log";
import { capture, portInUse } from "../lib/proc";
import { API_DIR, APPS, WEB_DIR, cleanTargets } from "../lib/paths";
import { pathExists } from "../lib/log";

export interface DoctorOptions {
  apiPort: number;
  webPort: number;
}

let errors = 0;

function report(condition: boolean, message: string, warningOnly = false): void {
  if (condition) {
    ok(message);
  } else if (warningOnly) {
    warn(message);
  } else {
    errors += 1;
    fail(message);
  }
}

async function checkTool(name: string, cmd: string[]): Promise<void> {
  const version = await capture(cmd);
  report(version !== null, `${name}: ${version ?? "not found"}`);
}

async function checkEnv(): Promise<void> {
  const apiIssues: EnvIssue[] = await checkEnvFile({
    label: "backend",
    envFile: APPS[0].envFile,
    requiredKeys: [{ key: "TMDB_API_KEY", required: true, placeholderHints: [] }],
    treatMissingFileAs: "error",
  });
  for (const issue of apiIssues) {
    if (issue.severity === "error") errors += 1;
    (issue.severity === "error" ? fail : warn)(issue.message);
  }
  if (apiIssues.length === 0) ok("backend .env present with TMDB_API_KEY set");

  const webEnv = await pathExists(APPS[1].envFile);
  if (webEnv) {
    ok("frontend .env present");
  } else {
    warn("frontend .env not found (optional — VITE_API_URL falls back to http://localhost:3000/api)");
  }
}

async function checkPorts(opts: DoctorOptions): Promise<void> {
  const apiBusy = await portInUse(opts.apiPort);
  const webBusy = await portInUse(opts.webPort);
  if (apiBusy) {
    warn(`port ${opts.apiPort} is in use (backend may already be running)`);
  } else {
    ok(`port ${opts.apiPort} is free (backend)`);
  }
  if (webBusy) {
    warn(`port ${opts.webPort} is in use (frontend may already be running)`);
  } else {
    ok(`port ${opts.webPort} is free (frontend)`);
  }
}

async function checkLockfiles(): Promise<void> {
  const apiPnpm = await pathExists(join(API_DIR, "pnpm-lock.yaml"));
  const apiBun = await pathExists(join(API_DIR, "bun.lock"));
  if (apiPnpm && apiBun) {
    warn("backend has both pnpm-lock.yaml and bun.lock — pick one to avoid drift");
  } else {
    ok("lockfiles consistent");
  }

  const apiModules = await pathExists(join(API_DIR, "node_modules"));
  const webModules = await pathExists(join(WEB_DIR, "node_modules"));
  report(apiModules, "backend node_modules installed");
  report(webModules, "frontend node_modules installed");
}

async function checkCaches(): Promise<void> {
  let total = 0;
  for (const target of cleanTargets()) {
    if (await pathExists(target.path)) total += await dirSize(target.path);
  }
  ok(`caches + build outputs currently use ${formatBytes(total)} (mova clean)`);
}

export async function doctorCommand(opts: DoctorOptions): Promise<number> {
  errors = 0;

  step("Toolchain");
  await checkTool("bun", ["bun", "--version"]);
  await checkTool("node", ["node", "--version"]);

  step("Environment");
  await checkEnv();

  step("Ports");
  await checkPorts(opts);

  step("Workspace");
  await checkLockfiles();
  await checkCaches();

  plain("");
  if (errors > 0) {
    fail(`${errors} issue(s) found`);
    return 1;
  }
  ok("No blocking issues found");
  return 0;
}
