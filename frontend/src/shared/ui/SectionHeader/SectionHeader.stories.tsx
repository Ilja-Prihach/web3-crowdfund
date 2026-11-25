import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SectionHeader } from "./SectionHeader";
const meta = { title: "UI/SectionHeader", component: SectionHeader, args: { eyebrow: "Открытое финансирование", title: "Кампании", titleId: "campaigns" }, tags: ["autodocs"] } satisfies Meta<typeof SectionHeader>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
