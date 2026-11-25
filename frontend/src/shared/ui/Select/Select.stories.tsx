import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Select } from "./Select";

const meta = {
  title: "UI/Select",
  component: Select,
  args: {
    ariaLabel: "Статус",
    options: [{ value: "all", label: "Все" }, { value: "active", label: "Идёт сбор" }],
    value: "all",
    onChange: () => {},
  },
  render: function Controlled(args) {
    const [value, setValue] = useState(args.value);
    return <Select {...args} value={value} onChange={setValue} />;
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("combobox", { name: /статус/i });
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await expect(trigger).toHaveTextContent("Идёт сбор");
  },
};

export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("combobox", { name: /статус/i }));
    await expect(canvas.getByRole("listbox", { name: "Статус" })).toBeVisible();
  },
};
