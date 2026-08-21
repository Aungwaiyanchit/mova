import { APPS } from "../lib/paths";
import { fail, ok, paint, plain, step } from "../lib/log";
import { runInherit } from "../lib/proc";

export type TaskName = "install" | "build" | "check" | "test";

export interface TaskOptions {
  task: TaskName;
  only?: "api" | "web";
}

const TASK_LABELS: Record<TaskName, string> = {
  install: "Installing dependencies",
  build: "Building",
  check: "Checking (lint + format)",
  test: "Running tests",
};

function cmdFor(task: TaskName): string[] {
  if (task === "install") return ["bun", "install"];
  return ["bun", "run", task];
}

export async function taskCommand(opts: TaskOptions): Promise<number> {
  const apps = opts.only ? APPS.filter((a) => a.id === opts.only) : APPS;

  step(`${TASK_LABELS[opts.task]} — ${apps.map((a) => a.label).join(", ")}`);

  const results: { label: string; code: number }[] = [];

  for (const app of apps) {
    const cmd = cmdFor(opts.task);
    plain(paint("bold", `▸ ${app.label}  ${paint("gray", cmd.join(" "))}`));
    const code = await runInherit(cmd, app.dir);
    results.push({ label: app.label, code });
    if (code !== 0) {
      plain("");
      fail(`${app.label} ${opts.task} failed with exit code ${code} — stopping`);
      break;
    }
  }

  plain("");
  console.log(paint("bold", "Summary"));
  let failed = false;
  for (const r of results) {
    if (r.code === 0) ok(`${r.label}: ${opts.task} passed`);
    else {
      failed = true;
      fail(`${r.label}: ${opts.task} failed (${r.code})`);
    }
  }

  return failed ? 1 : 0;
}
