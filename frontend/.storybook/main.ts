import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/nextjs-vite";

const root = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  staticDirs: [{ from: "../../docker/demo/covers", to: "/storybook-covers" }],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest", "@storybook/addon-mcp"],
  framework: "@storybook/nextjs-vite",
  features: { componentsManifest: true },
  async viteFinal(config) {
    config.resolve ??= {};
    config.resolve.alias = { ...config.resolve.alias, "@": path.resolve(root, "../src") };
    return config;
  },
};

export default config;
