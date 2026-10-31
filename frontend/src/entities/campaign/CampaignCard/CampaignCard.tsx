import type { CSSProperties } from "react";

import { addressHue, shortenAddress } from "@/shared/lib/address";

import { CampaignArtwork } from "../CampaignArtwork/CampaignArtwork";
import { CampaignProgress } from "../CampaignProgress/CampaignProgress";
import { CampaignStatus } from "../CampaignStatus/CampaignStatus";
import { formatTimeLeft } from "../lib/deadline";
import type { Campaign } from "../model/campaign";
import styles from "./CampaignCard.module.scss";

type CampaignCardProps = {
  campaign: Campaign;
  nowSeconds: number;
};

// Метка в правом углу обложки: срок есть только у активной кампании с дедлайном.
function getTermLabel({ deadline, fundingMode, status }: Campaign, nowSeconds: number) {
  if (fundingMode === "openEnded") return "Без срока";
  if (status !== "active") return null;
  return formatTimeLeft(deadline, nowSeconds);
}

// Подсказка в подвале: что дальше происходит со средствами.
function getFundsNote({ id, status, totalRaised }: Campaign) {
  if (status === "successful") return { text: "Ждёт вывода", isAlert: false };
  if ((status === "failed" || status === "cancelled") && totalRaised > 0n) {
    return { text: "Доступен возврат", isAlert: true };
  }
  return { text: `Кампания №${id}`, isAlert: false };
}

export function CampaignCard({ campaign, nowSeconds }: CampaignCardProps) {
  const termLabel = getTermLabel(campaign, nowSeconds);
  const fundsNote = getFundsNote(campaign);
  const isClosedWithoutSuccess = campaign.status === "failed" || campaign.status === "cancelled";

  return (
    <article className={styles.card}>
      <CampaignArtwork id={campaign.id} muted={isClosedWithoutSuccess}>
        <CampaignStatus className={styles.status} status={campaign.status} />
        {termLabel ? <span className={styles.term}>{termLabel}</span> : null}
      </CampaignArtwork>

      <div className={styles.body}>
        <h3 className={styles.title}>{campaign.title}</h3>
        <p className={styles.description}>{campaign.description}</p>

        <div className={styles.money}>
          <CampaignProgress goal={campaign.goal} status={campaign.status} totalRaised={campaign.totalRaised} />
        </div>

        <footer className={styles.footer}>
          <span className={styles.creator} title={campaign.creator}>
            <span
              aria-hidden="true"
              className={styles.avatar}
              style={{ "--avatar-hue": addressHue(campaign.creator) } as CSSProperties}
            />
            <span className={styles.visuallyHidden}>Автор </span>
            <span className={styles.address}>{shortenAddress(campaign.creator)}</span>
          </span>
          <span className={fundsNote.isAlert ? styles.alert : undefined}>{fundsNote.text}</span>
        </footer>
      </div>
    </article>
  );
}
