import { join } from "node:path";
import { ok, paint, warn } from "../lib/log";
import { fetchAlive, spawnStreamed, type StreamedProc } from "../lib/proc";
import { API_DIR, WEB_DIR, type AppPaths } from "../lib/paths";

export interface DevOptions {
  apps: AppPaths[];
  apiPort: number;
  webPort: number;
  verbose: boolean;
}

const GRACE_PERIOD_MS = 3000;
const READY_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 500;

function portFor(app: AppPaths, opts: DevOptions): number {
  return app.id === "api" ? opts.apiPort : opts.webPort;
}

function specFor(app: AppPaths, opts: DevOptions) {
  if (app.id === "api") {
    return {
      cmd: [join(API_DIR, "node_modules/.bin/nest"), "start", "--watch"],
      cwd: app.dir,
      label: app.label,
      color: "magenta" as const,
      env: { PORT: String(opts.apiPort) },
      quiet: !opts.verbose,
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
    quiet: !opts.verbose,
  };
}

function watchReady(procs: StreamedProc[], opts: DevOptions): void {
  for (const p of procs) {
    const app = opts.apps.find((a) => a.label === p.label);
    if (!app) continue;
    const url = app.healthUrl(portFor(app, opts));
    void (async () => {
      const deadline = Date.now() + READY_TIMEOUT_MS;
      while (Date.now() < deadline) {
        if (await fetchAlive(url, 1500)) {
          ok(`${app.label} ready  ${paint("gray", url)}`);
          return;
        }
        await new Promise((r) => setTimeout(r, READY_POLL_MS));
      }
      warn(`${app.label} not ready after ${READY_TIMEOUT_MS / 1000}s  (${url})`);
    })();
  }
}

export async function devCommand(opts: DevOptions): Promise<number> {
  const running = opts.apps.map((a) => a.label).join(" + ");
  const webApp = opts.apps.find((a) => a.id === "web");

  if (webApp) {
    console.log(paint("bold", `Starting ${running}`));
    console.log(`${paint("bold", "Movie page:")} ${paint("cyan", `http://localhost:${opts.webPort}`)}`);
  } else {
    console.log(paint("bold", `Starting ${running}`));
    console.log(`${paint("bold", "Backend API:")} ${paint("cyan", `http://localhost:${opts.apiPort}`)}`);
  }
  console.log(paint("gray", "Press Ctrl-C to stop."));

  const procs: StreamedProc[] = opts.apps.map((app) => spawnStreamed(specFor(app, opts)));

  if (!opts.verbose) watchReady(procs, opts);

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
