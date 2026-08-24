import { paint, type Color } from "./log";

export interface StreamSpec {
  cmd: string[];
  cwd: string;
  label: string;
  color: Color;
  env?: Record<string, string>;
  /** When true, hide normal output; only error-looking lines stream, and the tail is dumped on a non-zero exit. */
  quiet?: boolean;
}

export interface StreamedProc {
  label: string;
  color: Color;
  proc: Bun.Subprocess;
  exited: Promise<number>;
  recentLines: () => string[];
}

const RECENT_MAX = 40;

const ERROR_PATTERNS = [
  /\berror\b/i,
  /\berr!?$/i,
  /failed/i,
  /exception/i,
  /eaddrinuse/i,
  /econnrefused/i,
  /cannot find module/i,
];

function isErrorLine(line: string): boolean {
  return ERROR_PATTERNS.some((re) => re.test(line)) || /^\s*at\s+\S+\s+\(/.test(line);
}

function printPrefixed(label: string, color: Color, text: string): void {
  for (const part of text.split("\n")) {
    process.stdout.write(`${paint(color, `[${label}]`)} ${part}\n`);
  }
}

async function pipeStream(
  stream: ReadableStream<Uint8Array>,
  spec: { label: string; color: Color; quiet?: boolean },
  recent: string[],
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const takeLines = (): string[] => {
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    return lines;
  };
  const handle = (line: string) => {
    recent.push(line);
    if (recent.length > RECENT_MAX) recent.splice(0, recent.length - RECENT_MAX);
    if (!spec.quiet || isErrorLine(line)) printPrefixed(spec.label, spec.color, line);
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (const l of takeLines()) handle(l);
  }
  buffer += decoder.decode();
  if (buffer) handle(buffer);
}

export function spawnStreamed(spec: StreamSpec): StreamedProc {
  const proc = Bun.spawn(spec.cmd, {
    cwd: spec.cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FORCE_COLOR: "1", ...spec.env },
  });

  const recent: string[] = [];

  const exited = new Promise<number>((resolve) => {
    proc.exited
      .then(async (code) => {
        const numeric = typeof code === "number" ? code : 1;
        if (spec.quiet && numeric !== 0) {
          const tail = recent.slice(-RECENT_MAX);
          printPrefixed(spec.label, spec.color, `process exited with code ${numeric}; last output:`);
          for (const line of tail) printPrefixed(spec.label, spec.color, line);
        }
        resolve(numeric);
      })
      .catch(() => resolve(1));
  });

  if (proc.stdout) void pipeStream(proc.stdout as ReadableStream<Uint8Array>, spec, recent);
  if (proc.stderr) void pipeStream(proc.stderr as ReadableStream<Uint8Array>, spec, recent);

  return { label: spec.label, color: spec.color, proc, exited, recentLines: () => [...recent] };
}

export async function runInherit(cmd: string[], cwd: string): Promise<number> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  const code = await proc.exited;
  return typeof code === "number" ? code : 1;
}

export async function capture(cmd: string[], cwd?: string): Promise<string | null> {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
  });
  const text = await new Response(proc.stdout).text();
  const code = await proc.exited;
  return code === 0 ? text.trim() : null;
}

export async function fetchAlive(url: string, timeoutMs: number): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
    return true;
  } catch {
    return false;
  }
}

export async function portInUse(port: number, host = "127.0.0.1"): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        data() {},
        close() {},
        error() {},
      },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}
