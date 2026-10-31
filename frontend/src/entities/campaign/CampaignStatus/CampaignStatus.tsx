import { campaignStatusLabels, type CampaignStatus as Status } from "../model/campaign";
import styles from "./CampaignStatus.module.scss";

type CampaignStatusProps = {
  status: Status;
  className?: string;
};

export function CampaignStatus({ className, status }: CampaignStatusProps) {
  return (
    <span className={[styles.status, styles[status], className].filter(Boolean).join(" ")}>
      {status === "active" ? <span aria-hidden="true" className={styles.dot} /> : null}
      {campaignStatusLabels[status]}
    </span>
  );
}
