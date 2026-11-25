import { beforeAll } from "vitest";
import { setProjectAnnotations } from "@storybook/nextjs-vite";
import * as a11yAnnotations from "@storybook/addon-a11y/preview";

import preview from "./preview";

const annotations = setProjectAnnotations([preview, a11yAnnotations]);
beforeAll(annotations.beforeAll);
