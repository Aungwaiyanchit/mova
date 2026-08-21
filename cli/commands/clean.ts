import { rm } from "node:fs/promises";
import { cleanTargets } from "../lib/paths";
import { dirSize, formatBytes, ok, plain, step, paint } from "../lib/log";
import { pathExists } from "../lib/log";

export interface CleanOptions {
  all: boolean;
  dry: boolean;
}

export async function cleanCommand(opts: CleanOptions): Promise<number> {
  const targets = cleanTargets().filter((t) => opts.all || !t.aggressive);

  step(opts.dry ? "Clean (dry run)" : "Clean");

  let freed = 0;
  let removed = 0;

  for (const target of targets) {
    if (!(await pathExists(target.path))) continue;
    const size = await dirSize(target.path);
    freed += size;
    removed += 1;
    const rel = target.path.replace(`${process.cwd()}/`, "");
    if (opts.dry) {
      plain(` ${paint("gray", "would remove")} ${rel}  ${paint("gray", `(${formatBytes(size)})`)}`);
    } else {
      await rm(target.path, { recursive: true, force: true });
      plain(` ${paint("gray", "removed")} ${rel}  ${paint("gray", `(${formatBytes(size)})`)}`);
    }
  }

  plain("");
  if (removed === 0) {
    ok("Nothing to clean");
    return 0;
  }

  if (opts.dry) {
    ok(`${removed} target(s), ${formatBytes(freed)} reclaimable — rerun without --dry to delete`);
  } else {
    ok(`Removed ${removed} target(s), freed ${formatBytes(freed)}`);
  }
  if (!opts.all) plain(paint("gray", "Tip: use --all to also remove node_modules and build outputs"));
  return 0;
}
