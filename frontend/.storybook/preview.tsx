import type { Preview } from "@storybook/nextjs-vite";
import { Manrope, PT_Serif } from "next/font/google";

import "../src/app/globals.scss";

const interfaceFont = Manrope({
  display: "swap",
  subsets: ["cyrillic", "latin"],
  variable: "--font-interface",
});
const editorialFont = PT_Serif({
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["cyrillic", "latin"],
  variable: "--font-editorial",
  weight: ["400", "700"],
});

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Цветовая тема OpenFund",
      toolbar: { title: "Тема", icon: "circlehollow", items: ["light", "dark"], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "light", viewport: { value: "desktop", isRotated: false } },
  parameters: {
    layout: "centered",
    a11y: { test: "error" },
    viewport: {
      options: {
        mobile: { name: "Mobile 390", styles: { width: "390px", height: "844px" }, type: "mobile" },
        desktop: { name: "Desktop 1440", styles: { width: "1440px", height: "900px" }, type: "desktop" },
      },
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = context.globals.theme;
      document.documentElement.classList.add(interfaceFont.variable, editorialFont.variable);
      return <Story />;
    },
  ],
};

export default preview;
