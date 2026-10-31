"use client";

import { useSyncExternalStore } from "react";

import {
  getNextTheme,
  isTheme,
  type Theme,
  themeChangeEvent,
  themeStorageKey,
} from "../../model/theme";
import styles from "./ThemeToggle.module.scss";

type ThemeToggleProps = {
  showLabel?: boolean;
};

function getAppliedTheme(): Theme {
  const appliedTheme = document.documentElement.dataset.theme;
  return isTheme(appliedTheme)
    ? appliedTheme
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

function getStoredTheme() {
  try {
    return window.localStorage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

function subscribeToTheme(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const followSystemTheme = (event: MediaQueryListEvent) => {
    if (isTheme(getStoredTheme())) return;

    applyTheme(event.matches ? "dark" : "light");
    onStoreChange();
  };

  media.addEventListener("change", followSystemTheme);
  window.addEventListener(themeChangeEvent, onStoreChange);
  queueMicrotask(onStoreChange);

  return () => {
    media.removeEventListener("change", followSystemTheme);
    window.removeEventListener(themeChangeEvent, onStoreChange);
  };
}

export function ThemeToggle({ showLabel = false }: ThemeToggleProps) {
  const theme = useSyncExternalStore<Theme>(subscribeToTheme, getAppliedTheme, () => "light");
  const nextTheme = getNextTheme(theme);
  const actionLabel = nextTheme === "dark" ? "Включить тёмную тему" : "Включить светлую тему";

  const toggleTheme = () => {
    const selectedTheme = getNextTheme(theme);

    try {
      window.localStorage.setItem(themeStorageKey, selectedTheme);
    } catch {}

    applyTheme(selectedTheme);
    window.dispatchEvent(new CustomEvent<Theme>(themeChangeEvent, { detail: selectedTheme }));
  };

  return (
    <button
      aria-label={actionLabel}
      className={styles.toggle}
      data-labeled={showLabel || undefined}
      onClick={toggleTheme}
      title={showLabel ? undefined : actionLabel}
      type="button"
    >
      <span aria-hidden="true" className={styles.icon}>
        <svg className={styles.aperture} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 0 0 16Z" />
        </svg>
      </span>
      {showLabel ? <span className={styles.label}>{actionLabel}</span> : null}
    </button>
  );
}
