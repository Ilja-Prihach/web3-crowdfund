import { formatEth, formatEthValue, getProgressPercent } from "../lib/money";
import type { CampaignStatus } from "../model/campaign";
import styles from "./CampaignProgress.module.scss";

type CampaignProgressProps = {
  totalRaised: bigint;
  goal: bigint;
  status: CampaignStatus;
};

export function CampaignProgress({ goal, status, totalRaised }: CampaignProgressProps) {
  const percent = getProgressPercent(totalRaised, goal);

  return (
    <div className={styles.progress}>
      <p className={styles.amounts}>
        <strong>
          {formatEthValue(totalRaised)} / {formatEth(goal)}
        </strong>
        <span>{percent}%</span>
      </p>
      {/* Полоса дублирует процент из текста выше, поэтому скрыта от скринридеров. */}
      <div aria-hidden="true" className={[styles.track, styles[status]].join(" ")}>
        <span style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}
