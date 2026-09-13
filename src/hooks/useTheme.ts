import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

/**
 * The document theme, and the control that flips it.
 *
 * Dark is the default and light is a deliberate second palette, not an
 * inversion — see styles/tokens.css. A reader who has never touched the toggle
 * follows their system, and that path needs no JavaScript at all: tokens.css
 * carries a `prefers-color-scheme` block keyed on the *absence* of an explicit
 * choice. So this hook leaves `data-theme` off the document until there is a
 * choice to record, rather than stamping the system's current answer and
 * silently pinning the page to it.
 *
 * The recorded choice is applied before the first paint by the inline script in
 * index.html; doing it from the effect below would render the default theme for
 * a frame first, which is the flash that script exists to avoid.
 */
export type Theme = "dark" | "light";

/** Shared with the pre-paint script in index.html — change both together. */
const STORAGE_KEY = "lelantos-theme";

const isTheme = (v: unknown): v is Theme => v === "dark" || v === "light";

/** Storage can throw rather than return null — Safari's private mode, and any
 *  browser set to block site data — so neither read nor write is bare. */
function readChoice(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

function writeChoice(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The toggle still works for this page load; it just will not be
    // remembered, which is a better outcome than a thrown render.
  }
}

const LIGHT_QUERY = "(prefers-color-scheme: light)";

const systemTheme = (): Theme => (window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark");
// A server render has no media to query, and dark is what the CSS defaults to.
const getServerTheme = (): Theme => "dark";

function subscribeSystem(onChange: () => void) {
  const mq = window.matchMedia(LIGHT_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export interface ThemeControl {
  /** What is on screen right now, whether chosen or inherited. */
  theme: Theme;
  /** Record the opposite of `theme` as an explicit choice. */
  toggle: () => void;
}

export function useTheme(): ThemeControl {
  // `null` is "follow the system", which is the state a first visit is in.
  const [choice, setChoice] = useState<Theme | null>(() =>
    typeof window === "undefined" ? null : readChoice(),
  );
  const system = useSyncExternalStore(subscribeSystem, systemTheme, getServerTheme);
  const theme = choice ?? system;

  useEffect(() => {
    const root = document.documentElement;
    // Removed rather than set to the system's answer: the attribute *is* the
    // record of a choice, and leaving it off is what lets the page keep
    // following the OS after it changes.
    if (choice) root.setAttribute("data-theme", choice);
    else root.removeAttribute("data-theme");
  }, [choice]);

  const toggle = useCallback(() => {
    setChoice((prev) => {
      const next: Theme = (prev ?? systemTheme()) === "dark" ? "light" : "dark";
      writeChoice(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
