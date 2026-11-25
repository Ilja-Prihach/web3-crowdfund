import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BrandMark } from "./BrandMark";
const meta = { title: "UI/BrandMark", component: BrandMark, decorators: [(Story) => <div style={{ width: 64 }}><Story /></div>], tags: ["autodocs"] } satisfies Meta<typeof BrandMark>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Light: Story = { args: { tone: "light" } };
export const Dark: Story = { args: { tone: "dark" }, globals: { theme: "dark" } };
