import { Check, Palette } from "lucide-react";
import { themes } from "../lib/themes";
import { useTheme } from "../providers/theme-provider";

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <details className="group relative">
      <summary className="grid size-10 list-none place-items-center rounded-full border border-line bg-page-raised text-muted transition hover:border-accent hover:text-ink [&::-webkit-details-marker]:hidden">
        <Palette className="size-[18px]" aria-hidden="true" />
        <span className="sr-only">Choose color theme</span>
      </summary>
      <div className="absolute right-0 z-50 mt-3 w-56 rounded-xl border border-line bg-page-raised p-2 shadow-2xl shadow-black/40">
        <p className="px-3 pb-2 pt-1 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-faint">
          Screening room
        </p>
        {themes.map((option) => (
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-muted transition hover:bg-surface hover:text-ink"
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
          >
            <span className="flex -space-x-1" aria-hidden="true">
              {option.swatches.map((swatch) => (
                <span
                  className="size-4 rounded-full border border-white/20"
                  key={swatch}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </span>
            <span className="flex-1">{option.name}</span>
            {theme === option.id ? <Check className="size-4 text-accent-bright" /> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
