#!/usr/bin/env bun
import { parseArgs } from "node:util";
import { paint, parsePort } from "./lib/log";
import { APPS } from "./lib/paths";
import { devCommand } from "./commands/dev";
import { healthCommand } from "./commands/health";
import { cleanCommand } from "./commands/clean";
import { doctorCommand } from "./commands/doctor";
import { taskCommand, type TaskName } from "./commands/tasks";

const USAGE = `
${paint("bold", "mova")} — dev CLI for the mova workspace

${paint("bold", "Usage")}:
  mova <command> [options]

${paint("bold", "Commands")}:
  dev         Run backend + frontend concurrently with prefixed logs
                --api            run backend only
                --web            run frontend only
                --api-port <n>   backend port (default 3000)
                --web-port <n>   frontend port (default 5173)
  health      Check env config and running services
                --wait <secs>    poll until backend is up (default 0)
                --api-port <n> / --web-port <n>
  clean       Remove build outputs and dev caches
                --all            also remove node_modules
                --dry            preview without deleting
  doctor      Diagnose toolchain, env, ports, lockfiles, caches
                --api-port <n> / --web-port <n>
  install     Install dependencies for all apps (bun install)
  build       Build all apps (backend then frontend)
  check       Run biome checks for all apps
  test        Run tests for all apps
                --only <api|web>  limit any task command to one app
  help        Show this help

${paint("bold", "Examples")}:
  bun run mova dev
  bun run mova dev --api
  bun run mova health --wait 15
  bun run mova clean --all --dry
`;

function failWithUsage(message: string): never {
  console.error(`${paint("red", "error:")} ${message}\n`);
  console.error(USAGE);
  process.exit(1);
}

type OptionDef = { type: "boolean" } | { type: "string" };
type Values = Record<string, string | boolean | undefined>;

function parse(args: string[], options: Record<string, OptionDef>): Values {
  try {
    return parseArgs({ args, options, strict: true }).values;
  } catch (err) {
    failWithUsage(err instanceof Error ? err.message : String(err));
  }
}

function stringArg(values: Values, key: string): string | undefined {
  const value = values[key];
  return typeof value === "string" ? value : undefined;
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(USAGE);
    return 0;
  }

  if (command === "dev") {
    const values = parse(rest, {
      api: { type: "boolean" },
      web: { type: "boolean" },
      "api-port": { type: "string" },
      "web-port": { type: "string" },
    });
    const apiPort = parsePort(stringArg(values, "api-port"), 3000, "--api-port");
    const webPort = parsePort(stringArg(values, "web-port"), 5173, "--web-port");
    const wantsApi = values.api === true || values.web !== true;
    const wantsWeb = values.web === true || values.api !== true;
    const apps = APPS.filter((a) => (a.id === "api" ? wantsApi : wantsWeb));
    if (apps.length === 0) failWithUsage("dev: nothing to run");
    return devCommand({ apps, apiPort, webPort });
  }

  if (command === "health") {
    const values = parse(rest, {
      wait: { type: "string" },
      "api-port": { type: "string" },
      "web-port": { type: "string" },
    });
    const waitRaw = stringArg(values, "wait") ?? "0";
    const wait = Number(waitRaw);
    if (!Number.isFinite(wait) || wait < 0) failWithUsage(`health: invalid --wait "${waitRaw}"`);
    const apiPort = parsePort(stringArg(values, "api-port"), 3000, "--api-port");
    const webPort = parsePort(stringArg(values, "web-port"), 5173, "--web-port");
    return healthCommand({ apiPort, webPort, waitSeconds: wait });
  }

  if (command === "clean") {
    const values = parse(rest, {
      all: { type: "boolean" },
      dry: { type: "boolean" },
    });
    return cleanCommand({ all: values.all === true, dry: values.dry === true });
  }

  if (command === "doctor") {
    const values = parse(rest, {
      "api-port": { type: "string" },
      "web-port": { type: "string" },
    });
    const apiPort = parsePort(stringArg(values, "api-port"), 3000, "--api-port");
    const webPort = parsePort(stringArg(values, "web-port"), 5173, "--web-port");
    return doctorCommand({ apiPort, webPort });
  }

  const tasks: TaskName[] = ["install", "build", "check", "test"];
  if ((tasks as string[]).includes(command)) {
    const values = parse(rest, {
      only: { type: "string" },
    });
    const only = stringArg(values, "only");
    if (only !== undefined && only !== "api" && only !== "web") {
      failWithUsage(`${command}: --only must be "api" or "web"`);
    }
    return taskCommand({ task: command as TaskName, only: only as "api" | "web" | undefined });
  }

  failWithUsage(`unknown command "${command}"`);
}

process.exit(await main());
