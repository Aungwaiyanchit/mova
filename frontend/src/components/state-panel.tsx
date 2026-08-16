import { AlertTriangle, Clapperboard } from "lucide-react";

interface StatePanelProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  kind?: "empty" | "error";
}

export function StatePanel({
  title,
  message,
  actionLabel,
  onAction,
  kind = "empty",
}: StatePanelProps) {
  const Icon = kind === "error" ? AlertTriangle : Clapperboard;
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-line bg-page-raised px-6 py-12 text-center">
      <div className="max-w-md">
        <Icon className="mx-auto mb-5 size-9 text-accent-bright" aria-hidden="true" />
        <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        {actionLabel && onAction ? (
          <button
            className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-white transition hover:bg-accent-bright hover:text-page"
            type="button"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
