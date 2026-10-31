import type { ReactNode } from "react";

import type { FundingMode } from "../model/campaign";
import styles from "./CampaignArtwork.module.scss";

// У кампаний в контракте нет изображений, поэтому обложка — абстрактный узор,
// выбранный по ID: одна и та же кампания всегда выглядит одинаково.
const patterns: { tone: string; art: ReactNode }[] = [
  {
    tone: styles.mint,
    art: (
      <>
        <g fill="none" stroke="rgb(23 76 60 / 35%)" strokeWidth="2">
          <path d="M-10 60 Q100 20 200 60 T410 60" />
          <path d="M-10 95 Q100 55 200 95 T410 95" />
          <path d="M-10 130 Q100 90 200 130 T410 130" />
          <path d="M-10 165 Q100 125 200 165 T410 165" />
          <path d="M-10 200 Q100 160 200 200 T410 200" />
        </g>
        <circle cx="300" cy="80" r="26" fill="#174c3c" />
      </>
    ),
  },
  {
    tone: styles.cinnabar,
    art: (
      <g fill="rgb(255 253 247 / 22%)">
        <rect x="40" y="40" width="80" height="80" rx="40" />
        <rect x="140" y="40" width="80" height="80" rx="8" />
        <rect x="240" y="40" width="80" height="80" rx="40" />
        <rect x="40" y="140" width="80" height="80" rx="8" />
        <rect x="140" y="140" width="80" height="80" rx="40" />
        <rect x="240" y="140" width="80" height="80" rx="8" />
      </g>
    ),
  },
  {
    tone: styles.sand,
    art: (
      <>
        <rect x="0" y="150" width="400" height="75" fill="rgb(23 32 27 / 12%)" />
        <g fill="#174c3c">
          <rect x="60" y="80" width="40" height="70" rx="4" />
          <rect x="110" y="60" width="40" height="90" rx="4" />
          <rect x="160" y="100" width="40" height="50" rx="4" />
        </g>
        <circle cx="310" cy="70" r="30" fill="#e45b3f" />
      </>
    ),
  },
  {
    tone: styles.ink,
    art: (
      <>
        <g fill="rgb(168 199 184 / 30%)">
          {[50, 90, 130, 170].flatMap((y, row) =>
            [60, 100, 140, 180].slice(0, 4 - row).map((x) => <circle cx={x} cy={y} key={`${x}-${y}`} r="3" />),
          )}
        </g>
        <path d="M220 190 L330 60 L370 190Z" fill="#e45b3f" />
        <path d="M170 190 L250 100 L300 190Z" fill="rgb(168 199 184 / 55%)" />
      </>
    ),
  },
  {
    tone: styles.amber,
    art: (
      <g fill="none" stroke="rgb(23 32 27 / 25%)" strokeWidth="18">
        <circle cx="200" cy="230" r="70" />
        <circle cx="200" cy="230" r="120" />
        <circle cx="200" cy="230" r="170" />
      </g>
    ),
  },
  {
    tone: styles.forest,
    art: (
      <>
        <circle cx="330" cy="40" r="120" fill="rgb(168 199 184 / 18%)" />
        <path d="M-10 200 Q120 150 240 190 T410 180 V235 H-10Z" fill="rgb(15 57 45 / 80%)" />
        <rect x="150" y="70" width="64" height="64" rx="8" fill="#e45b3f" transform="rotate(45 182 102)" />
      </>
    ),
  },
];

type CampaignArtworkProps = {
  fundingMode: FundingMode;
  id: bigint;
  muted?: boolean;
  children?: ReactNode;
};

export function CampaignArtwork({ children, fundingMode, id, muted = false }: CampaignArtworkProps) {
  const pattern = patterns[Number(id % BigInt(patterns.length))];

  return (
    <div className={styles.artwork}>
      <div className={[styles.canvas, pattern.tone, muted ? styles.muted : undefined].filter(Boolean).join(" ")}>
        <svg aria-hidden="true" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 225">
          {fundingMode === "fixedDeadline" ? (
            <g className={styles.fixedMotif}>
              <circle cx="326" cy="58" r="34" />
              <path d="M326 38v22l15 10" />
            </g>
          ) : (
            <g className={styles.openMotif}>
              <path d="M38 188 C105 118 168 214 236 142 S338 94 386 58" />
              <circle cx="386" cy="58" r="6" />
            </g>
          )}
          {pattern.art}
        </svg>
      </div>
      {children}
    </div>
  );
}
