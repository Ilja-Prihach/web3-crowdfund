import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EmptyState } from "./EmptyState";
const meta = { title: "UI/EmptyState", component: EmptyState, args: { title: "Кампаний пока нет", description: "Попробуйте изменить фильтры." }, tags: ["autodocs"] } satisfies Meta<typeof EmptyState>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
