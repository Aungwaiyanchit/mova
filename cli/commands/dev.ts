import { join } from "node:path";
import { paint } from "../lib/log";
import { spawnStreamed, type StreamedProc } from "../lib/proc";
import { API_DIR, WEB_DIR, type AppPaths } from "../lib/paths";

export interface DevOptions {
  apps: AppPaths[];
  apiPort: number;
  webPort: number;
}

const GRACE_PERIOD_MS = 3000;

function specFor(app: AppPaths, opts: DevOptions) {
  if (app.id === "api") {
    return {
      cmd: [join(API_DIR, "node_modules/.bin/nest"), "start", "--watch"],
      cwd: app.dir,
      label: app.label,
      color: "magenta" as const,
      env: { PORT: String(opts.apiPort) },
    };
  }
  const cmd = [join(WEB_DIR, "node_modules/.bin/vite"), "--clearScreen", "false"];
  if (opts.webPort !== 5173) cmd.push("--port", String(opts.webPort));
  return {
    cmd,
    cwd: app.dir,
    label: app.label,
    color: "cyan" as const,
    env: undefined as Record<string, string> | undefined,
  };
}

export async function devCommand(opts: DevOptions): Promise<number> {
  const urls = opts.apps
    .map((app) => (app.id === "api" ? `http://localhost:${opts.apiPort}` : `http://localhost:${opts.webPort}`))
    .join("  ");
  console.log(paint("bold", `Starting ${opts.apps.map((a) => a.label).join(" + ")}  ${paint("gray", urls)}`));
  console.log(paint("gray", "Press Ctrl-C to stop both."));

  const procs: StreamedProc[] = opts.apps.map((app) => spawnStreamed(specFor(app, opts)));

  let shuttingDown = false;
  let exitCode = 0;

  const killAll = async (signal: "SIGTERM" | "SIGKILL") => {
    for (const p of procs) {
      try {
        p.proc.kill(signal === "SIGTERM" ? "SIGTERM" : "SIGKILL");
      } catch {
        /* already gone */
      }
    }
  };

  const shutdown = async (code: number) => {
    if (shuttingDown) {
      await killAll("SIGKILL");
      process.exit(code);
    }
    shuttingDown = true;
    console.log(paint("gray", "\nStopping…"));
    await killAll("SIGTERM");
    const timer = new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS));
    await Promise.race([timer, Promise.all(procs.map((p) => p.exited))]);
    await killAll("SIGKILL");
    process.exit(code);
  };

  process.on("SIGINT", () => void shutdown(0));
  process.on("SIGTERM", () => void shutdown(0));

  const first = await Promise.race(procs.map((p) => p.exited.then((code) => ({ label: p.label, code }))));

  // A child exited on its own: tear the rest down and propagate its exit code.
  if (!shuttingDown) {
    if (first.code !== 0) {
      console.log(paint("red", `\n[${first.label}] exited with code ${first.code}`));
      exitCode = first.code || 1;
    } else {
      console.log(paint("gray", `\n[${first.label}] exited.`));
    }
    await killAll("SIGTERM");
    const timer = new Promise((resolve) => setTimeout(resolve, GRACE_PERIOD_MS));
    await Promise.race([timer, Promise.all(procs.map((p) => p.exited))]);
    await killAll("SIGKILL");
  }

  return exitCode;
}
