import type { Metadata } from "next";

import { parseCampaignId } from "@/entities/campaign/lib/campaignId";
import { CampaignDetails } from "@/widgets/CampaignDetails/CampaignDetails";

type CampaignPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const id = parseCampaignId((await params).id);
  return { title: id === null ? "Неверный адрес кампании" : `Кампания №${id}` };
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const id = parseCampaignId((await params).id);

  return (
    <main id="main-content" tabIndex={-1}>
      <CampaignDetails id={id} />
    </main>
  );
}
