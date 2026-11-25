import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ErrorState } from "./ErrorState";
const meta = { title: "UI/ErrorState", component: ErrorState, args: { title: "Не удалось загрузить кампании", description: "Попробуйте ещё раз." }, tags: ["autodocs"] } satisfies Meta<typeof ErrorState>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
