import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { parseEther } from "viem";
import { CampaignProgress } from "./CampaignProgress";
const meta = {
  title: "Campaign/CampaignProgress",
  component: CampaignProgress,
  args: { goal: parseEther("1"), totalRaised: parseEther("0.4"), status: "active" },
  argTypes: { goal: { control: false }, totalRaised: { control: false } },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
  tags: ["autodocs"],
} satisfies Meta<typeof CampaignProgress>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Empty: Story = { args: { totalRaised: 0n } };
export const Overfunded: Story = { args: { totalRaised: parseEther("1.2"), status: "successful" } };
