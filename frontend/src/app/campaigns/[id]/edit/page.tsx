import type { Metadata } from "next";

import { parseCampaignId } from "@/entities/campaign/lib/campaignId";
import { CampaignEditor } from "@/widgets/CampaignEditor/CampaignEditor";

type CampaignEditPageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = {
  title: "Управление страницей кампании",
  description: "Обложка, категория, история, бюджет, план и риски кампании OpenFund.",
};

export default async function CampaignEditPage({ params }: CampaignEditPageProps) {
  const id = parseCampaignId((await params).id);

  return (
    <main id="main-content" tabIndex={-1}>
      <CampaignEditor id={id} />
    </main>
  );
}
