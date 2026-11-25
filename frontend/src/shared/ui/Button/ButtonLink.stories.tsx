import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ButtonLink } from "./ButtonLink";

const meta = { title: "UI/ButtonLink", component: ButtonLink, args: { href: "#campaigns", children: "Смотреть кампании" }, tags: ["autodocs"] } satisfies Meta<typeof ButtonLink>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
