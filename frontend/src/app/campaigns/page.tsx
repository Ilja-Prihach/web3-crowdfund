import type { Metadata } from "next";

import { CampaignCatalog } from "@/widgets/CampaignCatalog/CampaignCatalog";

export const metadata: Metadata = {
  title: "Кампании",
  description: "Сборы из контракта OpenFund V2 в Ethereum Sepolia: статус, цель и собранная сумма.",
};

export default function CampaignsPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <CampaignCatalog />
    </main>
  );
}
