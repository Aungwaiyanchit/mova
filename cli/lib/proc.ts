import { paint, type Color } from "./log";

export interface StreamSpec {
  cmd: string[];
  cwd: string;
  label: string;
  color: Color;
  env?: Record<string, string>;
}

export interface StreamedProc {
  label: string;
  proc: Bun.Subprocess;
  exited: Promise<number>;
}

function printPrefixed(label: string, color: Color, text: string): void {
  for (const part of text.split("\n")) {
    process.stdout.write(`${paint(color, `[${label}]`)} ${part}\n`);
  }
}

async function pipeStream(stream: ReadableStream<Uint8Array>, label: string, color: Color): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const takeLines = (): string[] => {
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    return lines;
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (const l of takeLines()) printPrefixed(label, color, l);
  }
  buffer += decoder.decode();
  if (buffer) printPrefixed(label, color, buffer);
}

export function spawnStreamed(spec: StreamSpec): StreamedProc {
  const proc = Bun.spawn(spec.cmd, {
    cwd: spec.cwd,
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FORCE_COLOR: "1", ...spec.env },
  });

  const exited = new Promise<number>((resolve) => {
    proc.exited
      .then((code) => {
        resolve(typeof code === "number" ? code : 1);
      })
      .catch(() => resolve(1));
  });

  if (proc.stdout) void pipeStream(proc.stdout as ReadableStream<Uint8Array>, spec.label, spec.color);
  if (proc.stderr) void pipeStream(proc.stderr as ReadableStream<Uint8Array>, spec.label, spec.color);

  return { label: spec.label, proc, exited };
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
