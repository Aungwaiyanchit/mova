const isTTY = process.stdout.isTTY === true;

const CODES = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

export type Color = keyof typeof CODES;

export function paint(color: Color, text: string): string {
  return isTTY ? `${CODES[color]}${text}${CODES.reset}` : text;
}

export function line(prefix: string, color: Color, text: string): void {
  process.stdout.write(`${paint(color, prefix)} ${text}\n`);
}

export const ok = (msg: string) => line(" ✓", "green", msg);
export const warn = (msg: string) => line(" !", "yellow", msg);
export const fail = (msg: string) => line(" ✗", "red", msg);
export const info = (msg: string) => line(" →", "blue", msg);
export const plain = (msg: string) => console.log(msg);

export function step(msg: string): void {
  console.log();
  console.log(paint("bold", msg));
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exp;
  return `${value >= 100 || exp === 0 ? Math.round(value) : value.toFixed(1)} ${units[exp]}`;
}

export function parsePort(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined) return fallback;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid ${name}: "${value}" (expected 1-65535)`);
  }
  return port;
}

export async function dirSize(path: string): Promise<number> {
  const { readdir, stat } = await import("node:fs/promises");
  let total = 0;
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => null);
    if (!entries) return;
    for (const entry of entries) {
      const full = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const s = await stat(full).catch(() => null);
        if (s) total += s.size;
      }
    }
  };
  await walk(path);
  return total;
}

export async function pathExists(path: string): Promise<boolean> {
  const { access } = await import("node:fs/promises");
  return access(path)
    .then(() => true)
    .catch(() => false);
}
