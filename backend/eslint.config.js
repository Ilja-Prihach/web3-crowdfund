import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  // Правила с информацией о типах: ловят забытый await и промисы там, где их никто не ждёт.
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      // describe/it/test из node:test возвращают промисы, которые раннер ждёт сам.
      "@typescript-eslint/no-floating-promises": [
        "error",
        { allowForKnownSafeCalls: [{ from: "package", package: "node:test", name: ["describe", "it", "test"] }] },
      ],
    },
  },
  { ignores: ["node_modules/", "eslint.config.js"] },
);
