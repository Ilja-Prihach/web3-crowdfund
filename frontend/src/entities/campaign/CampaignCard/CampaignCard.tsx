import Link from "next/link";
import type { CSSProperties } from "react";

import { addressHue, shortenAddress } from "@/shared/lib/address";

import { CampaignArtwork } from "../CampaignArtwork/CampaignArtwork";
import { CampaignProgress } from "../CampaignProgress/CampaignProgress";
import { CampaignStatus } from "../CampaignStatus/CampaignStatus";
import { formatTimeLeft } from "../lib/deadline";
import { fundingModeLabels, type Campaign } from "../model/campaign";
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

// Подсказка перед подвалом: что дальше происходит со средствами.
function getFundsNote({ status, totalRaised }: Campaign) {
  if (status === "successful") return { text: "Цель собрана · ждёт вывода", isAlert: false };
  if (status === "withdrawn") return { text: "Средства выведены", isAlert: false };
  if ((status === "failed" || status === "cancelled") && totalRaised > 0n) {
    return { text: "Можно вернуть вклад", isAlert: true };
  }
  if (status === "failed" || status === "cancelled") return { text: "Сбор завершён", isAlert: false };
  return { text: "Условия записаны в контракте", isAlert: false };
}

export function CampaignCard({ campaign, nowSeconds }: CampaignCardProps) {
  const termLabel = getTermLabel(campaign, nowSeconds);
  const fundsNote = getFundsNote(campaign);
  const isClosedWithoutSuccess = campaign.status === "failed" || campaign.status === "cancelled";

  return (
    <article className={styles.card}>
      <CampaignArtwork fundingMode={campaign.fundingMode} id={campaign.id} muted={isClosedWithoutSuccess}>
        <CampaignStatus className={styles.status} status={campaign.status} />
        {termLabel ? <span className={styles.term}>{termLabel}</span> : null}
      </CampaignArtwork>

      <div className={styles.body}>
        <p className={styles.mode}>{fundingModeLabels[campaign.fundingMode]}</p>
        <h3 className={styles.title}>
          {/* Ссылка растягивается на всю карточку через ::after, но в дереве доступности остаётся одной. */}
          <Link className={styles.link} href={`/campaigns/${campaign.id}`}>
            {campaign.title}
          </Link>
        </h3>
        <p className={styles.description}>{campaign.description}</p>

        <div className={styles.money}>
          <CampaignProgress goal={campaign.goal} status={campaign.status} totalRaised={campaign.totalRaised} />
        </div>

        <p className={[styles.fundsNote, fundsNote.isAlert ? styles.alert : undefined].filter(Boolean).join(" ")}>
          {fundsNote.text}
        </p>

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
          {/* Визуальная подсказка: ссылкой служит вся карточка, поэтому скринридеру текст не нужен. */}
          <span aria-hidden="true" className={styles.more}>
            Подробнее <span className={styles.arrow}>→</span>
          </span>
        </footer>
      </div>
    </article>
  );
}
