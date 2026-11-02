import type { Metadata } from "next";

import { CampaignCreate } from "@/widgets/CampaignCreate/CampaignCreate";

export const metadata: Metadata = {
  title: "Новый сбор",
  description: "Создайте кампанию в контракте OpenFund V2: название, описание, цель и правила возврата.",
};

export default function NewCampaignPage() {
  return (
    <main id="main-content" tabIndex={-1}>
      <CampaignCreate />
    </main>
  );
}
