"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";

type Preference = "light" | "dark" | "system";
const CHANGE_EVENT = "vortix-theme-change";
const options = [
  { value: "light" as const, label: "Light", Icon: Sun },
  { value: "dark" as const, label: "Dark", Icon: Moon },
  { value: "system" as const, label: "System", Icon: Monitor },
];

function readPreference(): Preference {
  if (typeof window === "undefined") return "system";
  const value = window.localStorage.getItem("vortix-theme");
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

function resolved(preference: Preference) {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(preference: Preference) {
  const root = document.documentElement;
  root.dataset.themePreference = preference;
  root.dataset.theme = resolved(preference);
  root.style.colorScheme = root.dataset.theme;
}

export function ThemeSwitcher() {
  const preference = useSyncExternalStore(subscribe, readPreference, () => "system");

  useEffect(() => {
    apply(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (preference === "system") apply("system");
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [preference]);

  function choose(next: Preference) {
    window.localStorage.setItem("vortix-theme", next);
    apply(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <div className="theme-switcher" role="group" aria-label="Colour theme">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={`Use ${label.toLowerCase()} theme`}
          aria-pressed={preference === value}
          onClick={() => choose(value)}
          title={`${label} theme`}
        >
          <Icon className="size-4" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
