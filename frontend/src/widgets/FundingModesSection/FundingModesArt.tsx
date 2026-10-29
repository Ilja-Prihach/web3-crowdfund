import styles from "./FundingModesSection.module.scss";

// Code-built vector scenes that give each funding mode its own palette.

// FixedDeadline: a countdown dial next to the deadline calendar page.
export function FixedDeadlineArt() {
  return (
    <svg
      className={styles.modeArt}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="fx-bg" cx="42%" cy="42%" r="80%">
          <stop offset="0" stopColor="#2b6e57" />
          <stop offset=".5" stopColor="#163a2e" />
          <stop offset="1" stopColor="#0d1814" />
        </radialGradient>
        <linearGradient id="fx-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fx-arc" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a8c7b8" />
          <stop offset="1" stopColor="#6fdc9e" />
        </linearGradient>
        <radialGradient id="fx-disc" cx="40%" cy="35%" r="75%">
          <stop offset="0" stopColor="#22332b" />
          <stop offset="1" stopColor="#0c1411" />
        </radialGradient>
        <linearGradient id="fx-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".5" />
          <stop offset=".5" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <filter id="fx-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="fx-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
        <filter id="fx-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="10"
            floodColor="#000"
            floodOpacity=".5"
          />
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#fx-bg)" />
      <path d="M120 -10 L210 -10 L270 230 L60 230Z" fill="url(#fx-ray)" />
      <path
        d="M330 -10 L344 -10 L398 230 L372 230Z"
        fill="url(#fx-ray)"
        opacity=".7"
      />
      <g fill="#cfe2d8">
        <circle cx="30" cy="30" r="1.3" opacity=".6" />
        <circle cx="380" cy="22" r="1.1" opacity=".5" />
        <circle cx="24" cy="190" r="1.4" opacity=".45" />
        <circle cx="250" cy="200" r="1" opacity=".5" />
      </g>
      <ellipse
        cx="168"
        cy="204"
        rx="80"
        ry="9"
        fill="#000"
        opacity=".5"
        filter="url(#fx-soft)"
      />
      <circle
        cx="168"
        cy="114"
        r="86"
        fill="#000"
        opacity=".25"
        filter="url(#fx-soft)"
      />
      <circle cx="168" cy="114" r="84" fill="url(#fx-disc)" />
      <circle
        cx="168"
        cy="114"
        r="83.25"
        fill="none"
        stroke="url(#fx-edge)"
        strokeWidth="1.5"
      />
      <g
        stroke="#cfe2d8"
        strokeOpacity=".35"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M168.0 42.0L168.0 34.0" />
        <path d="M187.4 41.6L188.4 37.7" />
        <path d="M205.5 49.0L207.5 45.6" />
        <path d="M221.0 61.0L223.9 58.1" />
        <path d="M233.0 76.5L236.4 74.5" />
        <path d="M240.4 94.6L244.3 93.6" />
        <path d="M240.0 114.0L248.0 114.0" />
        <path d="M240.4 133.4L244.3 134.4" />
        <path d="M233.0 151.5L236.4 153.5" />
        <path d="M221.0 167.0L223.9 169.9" />
        <path d="M205.5 179.0L207.5 182.4" />
        <path d="M187.4 186.4L188.4 190.3" />
        <path d="M168.0 186.0L168.0 194.0" />
        <path d="M148.6 186.4L147.6 190.3" />
        <path d="M130.5 179.0L128.5 182.4" />
        <path d="M115.0 167.0L112.1 169.9" />
        <path d="M103.0 151.5L99.6 153.5" />
        <path d="M95.6 133.4L91.7 134.4" />
        <path d="M96.0 114.0L88.0 114.0" />
        <path d="M95.6 94.6L91.7 93.6" />
        <path d="M103.0 76.5L99.6 74.5" />
        <path d="M115.0 61.0L112.1 58.1" />
        <path d="M130.5 49.0L128.5 45.6" />
        <path d="M148.6 41.6L147.6 37.7" />
      </g>
      <circle
        cx="168"
        cy="114"
        r="58"
        fill="none"
        stroke="#fffdf7"
        strokeOpacity=".08"
        strokeWidth="12"
      />
      <circle
        cx="168"
        cy="114"
        r="58"
        fill="none"
        stroke="#6fdc9e"
        strokeOpacity=".45"
        strokeWidth="16"
        strokeDasharray="225.9 364.4"
        transform="rotate(-90 168 114)"
        filter="url(#fx-glow)"
      />
      <circle
        cx="168"
        cy="114"
        r="58"
        fill="none"
        stroke="url(#fx-arc)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray="225.9 364.4"
        transform="rotate(-90 168 114)"
      />
      <circle cx="128.3" cy="156.3" r="7" fill="#fffdf7" />
      <circle cx="168" cy="56" r="6" fill="#e45b3f" />
      <circle
        cx="168"
        cy="56"
        r="11"
        fill="#e45b3f"
        opacity=".5"
        filter="url(#fx-glow)"
      />
      <text
        x="168"
        y="120"
        fill="#fffdf7"
        fontSize="28"
        fontWeight="700"
        textAnchor="middle"
        className={styles.serifText}
      >
        62%
      </text>
      <text
        x="168"
        y="138"
        fill="#a8c7b8"
        fontSize="9"
        fontWeight="700"
        textAnchor="middle"
      >
        срока прошло
      </text>
      <g transform="rotate(7 314 100)" filter="url(#fx-shadow)">
        <rect x="268" y="46" width="92" height="108" rx="14" fill="#fffdf7" />
        <path
          d="M268 60a14 14 0 0 1 14-14h64a14 14 0 0 1 14 14v14h-92z"
          fill="#e45b3f"
        />
        <circle cx="292" cy="46" r="4" fill="#17201b" />
        <circle cx="336" cy="46" r="4" fill="#17201b" />
        <text
          x="314"
          y="66"
          fill="#fffdf7"
          fontSize="9"
          fontWeight="800"
          textAnchor="middle"
          letterSpacing=".08em"
        >
          ДЕДЛАЙН
        </text>
        <text
          x="314"
          y="122"
          fill="#17201b"
          fontSize="40"
          fontWeight="700"
          textAnchor="middle"
          className={styles.serifText}
        >
          16
        </text>
        <text
          x="314"
          y="142"
          fill="#56625b"
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
        >
          ноября
        </text>
      </g>
    </svg>
  );
}

// OpenEnded: a road running past the horizon towards the goal flag.
export function OpenEndedArt() {
  return (
    <svg
      className={styles.modeArt}
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="op-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a1a14" />
          <stop offset=".45" stopColor="#b8452e" />
          <stop offset=".75" stopColor="#ef8a4f" />
          <stop offset="1" stopColor="#f7c46b" />
        </linearGradient>
        <radialGradient id="op-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset=".6" stopColor="#ffd98f" />
          <stop offset="1" stopColor="#ffd98f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="op-road" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#f7ead0" />
          <stop offset="1" stopColor="#f7ead0" stopOpacity=".55" />
        </linearGradient>
        <filter id="op-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="op-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>
      <rect width="400" height="220" fill="url(#op-sky)" />
      <circle
        cx="288"
        cy="128"
        r="70"
        fill="#ffd98f"
        opacity=".45"
        filter="url(#op-soft)"
      />
      <circle cx="288" cy="128" r="36" fill="url(#op-sun)" />
      <g fill="#fff3d6">
        <circle cx="40" cy="28" r="1.3" opacity=".7" />
        <circle cx="96" cy="16" r="1" opacity=".6" />
        <circle cx="356" cy="36" r="1.2" opacity=".6" />
        <circle cx="160" cy="40" r="1" opacity=".5" />
      </g>
      <path
        d="M0 150 C 60 128, 120 140, 180 132 S 300 126, 400 138 V220 H0Z"
        fill="#8f3524"
      />
      <path
        d="M0 168 C 80 150, 160 166, 240 152 S 340 150, 400 160 V220 H0Z"
        fill="#5c2117"
      />
      <path
        d="M0 192 C 90 178, 200 196, 300 182 S 380 184, 400 188 V220 H0Z"
        fill="#3a140e"
      />
      <path
        d="M84 220 C 150 190, 210 170, 262 146 C 272 141, 282 136, 290 132 L294 133 C 288 138, 280 144, 272 150 C 236 176, 196 200, 172 220Z"
        fill="url(#op-road)"
      />
      <path
        d="M128 220 C 176 194, 222 172, 266 148 C 276 142, 284 137, 292 133"
        fill="none"
        stroke="#c98a1b"
        strokeWidth="2"
        strokeDasharray="6 7"
        strokeLinecap="round"
      />
      <path
        d="M316 140 L316 100"
        stroke="#f1f5f2"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path d="M317 101 L340 108 L317 116Z" fill="#174c3c" />
      <circle cx="316" cy="140" r="3" fill="#3a140e" />
      <text
        x="66"
        y="92"
        fill="#fff3d6"
        fontSize="44"
        fontWeight="700"
        textAnchor="middle"
        className={styles.serifText}
        opacity=".5"
        filter="url(#op-glow)"
      >
        ∞
      </text>
      <text
        x="66"
        y="92"
        fill="#fff3d6"
        fontSize="44"
        fontWeight="700"
        textAnchor="middle"
        className={styles.serifText}
      >
        ∞
      </text>
      <text
        x="328"
        y="94"
        fill="#fff3d6"
        fontSize="9"
        fontWeight="800"
        textAnchor="middle"
      >
        цель
      </text>
    </svg>
  );
}
