import { Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Logo } from "./logo";
import { SearchBox } from "./search-box";
import { ThemePicker } from "./theme-picker";

const navItems = [
  { to: "/", label: "Discover", end: true },
  { to: "/movies", label: "Movies", end: false },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  function navClass({ isActive }: { isActive: boolean }) {
    return `relative py-2 text-sm font-semibold transition ${
      isActive ? "text-ink" : "text-muted hover:text-ink"
    } after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:bg-accent-bright after:transition-transform ${
      isActive ? "after:scale-x-100" : "after:scale-x-0"
    }`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-xl">
      <div className="page-shell flex h-[4.5rem] items-center gap-5">
        <Logo />
        <nav className="ml-3 hidden items-center gap-7 md:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink className={navClass} end={item.end} key={item.to} to={item.to}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto hidden flex-1 justify-end md:flex">
          <SearchBox />
        </div>
        <ThemePicker />
        <button
          className="grid size-10 place-items-center rounded-full border border-line text-muted md:hidden"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {menuOpen ? (
        <div className="page-shell pb-5 md:hidden" id="mobile-navigation">
          <SearchBox compact />
          <nav className="mt-4 grid grid-cols-2 gap-2" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg border px-4 py-3 text-center text-sm font-semibold ${
                    isActive ? "border-accent bg-accent/15 text-ink" : "border-line text-muted"
                  }`
                }
                end={item.end}
                key={`${location.key}-${item.to}`}
                to={item.to}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
