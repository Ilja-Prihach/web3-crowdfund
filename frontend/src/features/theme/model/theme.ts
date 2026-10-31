export const themeStorageKey = "openfund-theme";
export const themeChangeEvent = "openfund:theme-change";

export type Theme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function getNextTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

// Выполняется до гидратации, чтобы сохранённая тема не появлялась со светлой вспышкой.
export const themeInitScript = `(() => {
  const key = "${themeStorageKey}";
  let stored = null;

  try {
    stored = window.localStorage.getItem(key);
  } catch {}

  const theme = stored === "light" || stored === "dark"
    ? stored
    : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  document.documentElement.dataset.theme = theme;
})();`;
