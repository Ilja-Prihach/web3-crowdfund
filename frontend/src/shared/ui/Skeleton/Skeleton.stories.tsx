import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "./Skeleton";
const meta = { title: "UI/Skeleton", component: Skeleton, tags: ["autodocs"] } satisfies Meta<typeof Skeleton>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Line: Story = { args: { variant: "line" } };
export const Title: Story = { args: { variant: "title" } };
export const Control: Story = { args: { variant: "control" } };
export const Panel: Story = { args: { variant: "panel" } };
