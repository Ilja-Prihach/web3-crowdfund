import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Field } from "./Field";

const meta = { title: "UI/Field", component: Field, args: { id: "goal", label: "Цель сбора, ETH", placeholder: "0,05" }, tags: ["autodocs"] } satisfies Meta<typeof Field>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { hint: "Укажите цель сбора" } };
export const Required: Story = { args: { required: true } };
export const Error: Story = { args: { error: "Укажите сумму больше нуля", defaultValue: "0" } };
export const Disabled: Story = { args: { disabled: true } };
