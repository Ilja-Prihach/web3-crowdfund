import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { parseEther } from "viem";
import type { Campaign } from "../model/campaign";
import { CampaignCard } from "./CampaignCard";

const nowSeconds = 1_800_000_000;
const campaign: Campaign = {
  id: 1n,
  creator: "0x1111111111111111111111111111111111111111",
  title: "Городская мастерская",
  description: "Открываем мастерскую, где соседи смогут чинить вещи и учиться друг у друга.",
  goal: parseEther("1"),
  totalRaised: parseEther("0.4"),
  deadline: BigInt(nowSeconds + 30 * 86400),
  fundingMode: "fixedDeadline",
  status: "active",
  donors: 12,
  category: "community",
  coverUrl: null,
};

const meta = {
  title: "Campaign/CampaignCard",
  component: CampaignCard,
  args: { campaign, nowSeconds },
  argTypes: { campaign: { control: false } },
  decorators: [(Story) => <div style={{ width: 380, maxWidth: "100%" }}><Story /></div>],
  tags: ["autodocs"],
} satisfies Meta<typeof CampaignCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const WithCover: Story = { args: { campaign: { ...campaign, coverUrl: "/storybook-covers/workshop.webp" } } };
export const Successful: Story = { args: { campaign: { ...campaign, status: "successful", totalRaised: parseEther("1") } } };
export const Failed: Story = { args: { campaign: { ...campaign, status: "failed" } } };
export const Withdrawn: Story = { args: { campaign: { ...campaign, status: "withdrawn", totalRaised: parseEther("1") } } };
export const Cancelled: Story = { args: { campaign: { ...campaign, status: "cancelled" } } };
export const LongDescription: Story = { args: { campaign: { ...campaign, description: "Мы создаём доступную мастерскую для жителей района. ".repeat(8) } } };
export const Overfunded: Story = { args: { campaign: { ...campaign, status: "successful", totalRaised: parseEther("1.5") } } };
