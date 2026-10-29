import styles from "./HowItWorksSection.module.scss";

// Code-built vector scenes in the same style as the trust vault; no raster downloads.

// Step 1: the author fills the campaign rules and seals them.
export function RulesArt() {
  return (
    <svg
      className={styles.stepArt}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hw1-bg" cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#235f4b" />
          <stop offset=".55" stopColor="#152620" />
          <stop offset="1" stopColor="#0e1512" />
        </radialGradient>
        <linearGradient id="hw1-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hw1-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f2" />
          <stop offset=".5" stopColor="#a9bab0" />
          <stop offset="1" stopColor="#55665c" />
        </linearGradient>
        <linearGradient id="hw1-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a41" />
          <stop offset=".5" stopColor="#1d2722" />
          <stop offset="1" stopColor="#0e1411" />
        </linearGradient>
        <linearGradient id="hw1-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55685e" />
          <stop offset=".45" stopColor="#28352e" />
          <stop offset="1" stopColor="#111915" />
        </linearGradient>
        <linearGradient id="hw1-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".55" />
          <stop offset=".45" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id="hw1-dial" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#3a8f71" />
          <stop offset=".55" stopColor="#174c3c" />
          <stop offset="1" stopColor="#0a241c" />
        </radialGradient>
        <filter id="hw1-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="12"
            floodColor="#000"
            floodOpacity=".55"
          />
        </filter>
        <filter id="hw1-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="hw1-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#hw1-bg)" />
      <path d="M150 -10 L250 -10 L320 250 L80 250Z" fill="url(#hw1-ray)" />
      <path
        d="M60 -10 L76 -10 L20 250 L0 250Z"
        fill="url(#hw1-ray)"
        opacity=".7"
      />
      <g fill="#cfe2d8">
        <circle cx="34" cy="40" r="1.4" opacity=".6" />
        <circle cx="372" cy="30" r="1.2" opacity=".5" />
        <circle cx="360" cy="210" r="1.6" opacity=".45" />
        <circle cx="24" cy="200" r="1.1" opacity=".4" />
        <circle cx="300" cy="18" r="1" opacity=".5" />
      </g>
      <ellipse
        cx="200"
        cy="222"
        rx="110"
        ry="12"
        fill="#000"
        opacity=".5"
        filter="url(#hw1-soft)"
      />
      <rect
        x="122"
        y="34"
        width="168"
        height="178"
        rx="16"
        fill="#cfe2d8"
        opacity=".18"
        transform="rotate(-11 206 123)"
      />
      <g transform="rotate(-4 200 122)">
        <g filter="url(#hw1-shadow)">
          <rect
            x="112"
            y="28"
            width="176"
            height="186"
            rx="16"
            fill="#fffdf7"
          />
        </g>
        <rect
          x="130"
          y="47"
          width="78"
          height="9"
          rx="4.5"
          fill="#17201b"
          opacity=".85"
        />
        <rect x="130" y="63" width="122" height="6" rx="3" fill="#ddd6c6" />
        <text x="130" y="90" fill="#56625b" fontSize="9" fontWeight="700">
          Цель
        </text>
        <rect
          x="130"
          y="95"
          width="140"
          height="24"
          rx="7"
          fill="#f3efe4"
          stroke="#ddd6c6"
        />
        <path
          d="M140 101v12"
          stroke="#174c3c"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <text
          x="260"
          y="111"
          fill="#3b4640"
          fontSize="9"
          fontWeight="800"
          textAnchor="end"
        >
          ETH
        </text>
        <rect x="130" y="129" width="140" height="24" rx="12" fill="#ebe6d8" />
        <rect x="132" y="131" width="68" height="20" rx="10" fill="#174c3c" />
        <text
          x="166"
          y="144.5"
          fill="#fffdf7"
          fontSize="8.5"
          fontWeight="800"
          textAnchor="middle"
        >
          Срок
        </text>
        <text
          x="235"
          y="144.5"
          fill="#3b4640"
          fontSize="8.5"
          fontWeight="700"
          textAnchor="middle"
        >
          Без срока
        </text>
        <rect x="130" y="170" width="140" height="5" rx="2.5" fill="#ebe6d8" />
        <rect x="130" y="170" width="58" height="5" rx="2.5" fill="#174c3c" />
        <circle
          cx="188"
          cy="172.5"
          r="7"
          fill="#fffdf7"
          stroke="#174c3c"
          strokeWidth="2"
        />
        <rect x="130" y="188" width="54" height="6" rx="3" fill="#ddd6c6" />
      </g>
      <circle
        cx="282"
        cy="196"
        r="24"
        fill="#e45b3f"
        opacity=".55"
        filter="url(#hw1-glow)"
      />
      <rect
        x="266"
        y="180"
        width="32"
        height="32"
        rx="5"
        fill="#e45b3f"
        transform="rotate(45 282 196)"
      />
      <rect
        x="272"
        y="186"
        width="20"
        height="20"
        rx="3"
        fill="none"
        stroke="#fffdf7"
        strokeOpacity=".55"
        strokeWidth="1.5"
        transform="rotate(45 282 196)"
      />
      <path
        d="M276 196.5l4 4 8-8.5"
        fill="none"
        stroke="#fffdf7"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Step 2: ETH travels from the backer's wallet into the contract vault.
export function TransferArt() {
  return (
    <svg
      className={styles.stepArt}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hw2-bg" cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#235f4b" />
          <stop offset=".55" stopColor="#152620" />
          <stop offset="1" stopColor="#0e1512" />
        </radialGradient>
        <linearGradient id="hw2-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hw2-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f2" />
          <stop offset=".5" stopColor="#a9bab0" />
          <stop offset="1" stopColor="#55665c" />
        </linearGradient>
        <linearGradient id="hw2-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a41" />
          <stop offset=".5" stopColor="#1d2722" />
          <stop offset="1" stopColor="#0e1411" />
        </linearGradient>
        <linearGradient id="hw2-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55685e" />
          <stop offset=".45" stopColor="#28352e" />
          <stop offset="1" stopColor="#111915" />
        </linearGradient>
        <linearGradient id="hw2-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".55" />
          <stop offset=".45" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id="hw2-dial" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#3a8f71" />
          <stop offset=".55" stopColor="#174c3c" />
          <stop offset="1" stopColor="#0a241c" />
        </radialGradient>
        <filter id="hw2-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="12"
            floodColor="#000"
            floodOpacity=".55"
          />
        </filter>
        <filter id="hw2-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="hw2-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#hw2-bg)" />
      <path d="M150 -10 L250 -10 L320 250 L80 250Z" fill="url(#hw2-ray)" />
      <path
        d="M60 -10 L76 -10 L20 250 L0 250Z"
        fill="url(#hw2-ray)"
        opacity=".7"
      />
      <g fill="#cfe2d8">
        <circle cx="34" cy="40" r="1.4" opacity=".6" />
        <circle cx="372" cy="30" r="1.2" opacity=".5" />
        <circle cx="360" cy="210" r="1.6" opacity=".45" />
        <circle cx="24" cy="200" r="1.1" opacity=".4" />
        <circle cx="300" cy="18" r="1" opacity=".5" />
      </g>
      <ellipse
        cx="98"
        cy="214"
        rx="56"
        ry="9"
        fill="#000"
        opacity=".5"
        filter="url(#hw2-soft)"
      />
      <ellipse
        cx="326"
        cy="182"
        rx="56"
        ry="9"
        fill="#000"
        opacity=".5"
        filter="url(#hw2-soft)"
      />
      <g filter="url(#hw2-shadow)">
        <rect x="52" y="40" width="92" height="164" rx="20" fill="#17201b" />
      </g>
      <rect
        x="52.75"
        y="40.75"
        width="90.5"
        height="162.5"
        rx="19.25"
        fill="none"
        stroke="url(#hw2-edge)"
        strokeWidth="1.5"
      />
      <rect x="61" y="52" width="74" height="140" rx="13" fill="#1f2a24" />
      <rect
        x="86"
        y="46"
        width="24"
        height="3"
        rx="1.5"
        fill="#000"
        opacity=".5"
      />
      <text x="70" y="72" fill="#a8c7b8" fontSize="8" fontWeight="700">
        Кошелёк
      </text>
      <text
        x="70"
        y="98"
        fill="#fffdf7"
        opacity=".6"
        fontSize="7.5"
        fontWeight="600"
      >
        Вклад
      </text>
      <text
        x="70"
        y="118"
        fill="#fffdf7"
        fontSize="17"
        fontWeight="700"
        className={styles.serifText}
      >
        ETH
      </text>
      <rect x="70" y="128" width="56" height="4" rx="2" fill="#2f3d36" />
      <rect x="70" y="128" width="34" height="4" rx="2" fill="#a8c7b8" />
      <rect x="68" y="160" width="60" height="20" rx="10" fill="#e45b3f" />
      <text
        x="98"
        y="173"
        fill="#fffdf7"
        fontSize="7"
        fontWeight="800"
        textAnchor="middle"
      >
        Подтвердить
      </text>
      <path
        d="M148 112 C 200 48, 238 184, 284 120"
        fill="none"
        stroke="#a8c7b8"
        strokeWidth="6"
        opacity=".35"
        filter="url(#hw2-glow)"
      />
      <path
        d="M148 112 C 200 48, 238 184, 284 120"
        fill="none"
        stroke="#cfe2d8"
        strokeWidth="1.6"
        strokeDasharray="3 6"
        strokeLinecap="round"
      />
      <g fill="#ef6d50">
        <rect
          x="178"
          y="80"
          width="7"
          height="7"
          rx="1.2"
          transform="rotate(45 181.5 83.5)"
        />
        <rect
          x="210"
          y="112"
          width="10"
          height="10"
          rx="1.6"
          transform="rotate(45 215 117)"
        />
        <rect
          x="247"
          y="140"
          width="7"
          height="7"
          rx="1.2"
          transform="rotate(45 250.5 143.5)"
        />
      </g>
      <circle
        cx="215"
        cy="117"
        r="10"
        fill="#e45b3f"
        opacity=".5"
        filter="url(#hw2-glow)"
      />
      <g filter="url(#hw2-shadow)">
        <rect
          x="284"
          y="78"
          width="86"
          height="86"
          rx="22"
          fill="url(#hw2-body)"
        />
      </g>
      <rect
        x="284.75"
        y="78.75"
        width="84.5"
        height="84.5"
        rx="21.25"
        fill="none"
        stroke="url(#hw2-edge)"
        strokeWidth="1.5"
      />
      <circle cx="327" cy="121" r="31" fill="url(#hw2-door)" />
      <circle
        cx="327"
        cy="121"
        r="26"
        fill="none"
        stroke="#0a0f0c"
        strokeOpacity=".7"
        strokeWidth="3"
      />
      <g fill="url(#hw2-metal)">
        <circle cx="327" cy="98" r="3" />
        <circle cx="350" cy="121" r="3" />
        <circle cx="327" cy="144" r="3" />
        <circle cx="304" cy="121" r="3" />
      </g>
      <circle cx="327" cy="121" r="13" fill="url(#hw2-dial)" />
      <rect
        x="321"
        y="115"
        width="12"
        height="12"
        rx="2"
        fill="#e45b3f"
        opacity=".8"
        filter="url(#hw2-glow)"
        transform="rotate(45 327 121)"
      />
      <rect
        x="322.5"
        y="116.5"
        width="9"
        height="9"
        rx="1.5"
        fill="#ef6d50"
        transform="rotate(45 327 121)"
      />
      <circle
        cx="358"
        cy="90"
        r="5"
        fill="#3fa66f"
        opacity=".5"
        filter="url(#hw2-glow)"
      />
      <circle cx="358" cy="90" r="2.6" fill="#6fdc9e" />
    </svg>
  );
}

// Step 3: the contract routes funds to the author or back to backers.
export function OutcomeArt() {
  return (
    <svg
      className={styles.stepArt}
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hw3-bg" cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#235f4b" />
          <stop offset=".55" stopColor="#152620" />
          <stop offset="1" stopColor="#0e1512" />
        </radialGradient>
        <linearGradient id="hw3-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hw3-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f2" />
          <stop offset=".5" stopColor="#a9bab0" />
          <stop offset="1" stopColor="#55665c" />
        </linearGradient>
        <linearGradient id="hw3-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a41" />
          <stop offset=".5" stopColor="#1d2722" />
          <stop offset="1" stopColor="#0e1411" />
        </linearGradient>
        <linearGradient id="hw3-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55685e" />
          <stop offset=".45" stopColor="#28352e" />
          <stop offset="1" stopColor="#111915" />
        </linearGradient>
        <linearGradient id="hw3-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".55" />
          <stop offset=".45" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <radialGradient id="hw3-dial" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#3a8f71" />
          <stop offset=".55" stopColor="#174c3c" />
          <stop offset="1" stopColor="#0a241c" />
        </radialGradient>
        <filter id="hw3-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="12"
            floodColor="#000"
            floodOpacity=".55"
          />
        </filter>
        <filter id="hw3-glow" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="hw3-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>
      <rect width="400" height="240" fill="url(#hw3-bg)" />
      <path d="M150 -10 L250 -10 L320 250 L80 250Z" fill="url(#hw3-ray)" />
      <path
        d="M60 -10 L76 -10 L20 250 L0 250Z"
        fill="url(#hw3-ray)"
        opacity=".7"
      />
      <g fill="#cfe2d8">
        <circle cx="34" cy="40" r="1.4" opacity=".6" />
        <circle cx="372" cy="30" r="1.2" opacity=".5" />
        <circle cx="360" cy="210" r="1.6" opacity=".45" />
        <circle cx="24" cy="200" r="1.1" opacity=".4" />
        <circle cx="300" cy="18" r="1" opacity=".5" />
      </g>
      <ellipse
        cx="98"
        cy="176"
        rx="56"
        ry="9"
        fill="#000"
        opacity=".5"
        filter="url(#hw3-soft)"
      />
      <path
        d="M142 116 C 210 116, 214 62, 292 62"
        fill="none"
        stroke="#6fdc9e"
        strokeWidth="7"
        opacity=".35"
        filter="url(#hw3-glow)"
      />
      <path
        d="M142 116 C 210 116, 214 62, 292 62"
        fill="none"
        stroke="#6fdc9e"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M142 116 C 210 116, 214 172, 286 172"
        fill="none"
        stroke="#ef6d50"
        strokeWidth="7"
        opacity=".35"
        filter="url(#hw3-glow)"
      />
      <path
        d="M142 116 C 210 116, 214 172, 286 172"
        fill="none"
        stroke="#ef6d50"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="5 5"
      />
      <circle cx="214" cy="88" r="3.2" fill="#e3ece5" />
      <circle cx="214" cy="145" r="3.2" fill="#fbe3dc" />
      <g filter="url(#hw3-shadow)">
        <rect
          x="56"
          y="74"
          width="86"
          height="86"
          rx="22"
          fill="url(#hw3-body)"
        />
      </g>
      <rect
        x="56.75"
        y="74.75"
        width="84.5"
        height="84.5"
        rx="21.25"
        fill="none"
        stroke="url(#hw3-edge)"
        strokeWidth="1.5"
      />
      <circle cx="99" cy="117" r="31" fill="url(#hw3-door)" />
      <circle
        cx="99"
        cy="117"
        r="26"
        fill="none"
        stroke="#0a0f0c"
        strokeOpacity=".7"
        strokeWidth="3"
      />
      <g fill="url(#hw3-metal)">
        <circle cx="99" cy="94" r="3" />
        <circle cx="122" cy="117" r="3" />
        <circle cx="99" cy="140" r="3" />
        <circle cx="76" cy="117" r="3" />
      </g>
      <circle cx="99" cy="117" r="13" fill="url(#hw3-dial)" />
      <rect
        x="93"
        y="111"
        width="12"
        height="12"
        rx="2"
        fill="#e45b3f"
        opacity=".8"
        filter="url(#hw3-glow)"
        transform="rotate(45 99 117)"
      />
      <rect
        x="94.5"
        y="112.5"
        width="9"
        height="9"
        rx="1.5"
        fill="#ef6d50"
        transform="rotate(45 99 117)"
      />
      <circle
        cx="318"
        cy="62"
        r="30"
        fill="#3fa66f"
        opacity=".35"
        filter="url(#hw3-glow)"
      />
      <circle
        cx="318"
        cy="62"
        r="23"
        fill="url(#hw3-dial)"
        stroke="#a8c7b8"
        strokeOpacity=".6"
        strokeWidth="1.5"
      />
      <path
        d="M308 62.5l6.5 6.5 13-13.5"
        fill="none"
        stroke="#fffdf7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <text
        x="318"
        y="104"
        fill="#a8c7b8"
        fontSize="9"
        fontWeight="800"
        textAnchor="middle"
      >
        Автору
      </text>
      <circle
        cx="318"
        cy="172"
        r="34"
        fill="#e45b3f"
        opacity=".22"
        filter="url(#hw3-glow)"
      />
      <g stroke="#152620" strokeWidth="2.5">
        <circle cx="300" cy="172" r="13" fill="#a8c7b8" />
        <circle cx="318" cy="172" r="13" fill="#f4d4ca" />
        <circle cx="336" cy="172" r="13" fill="#c98a1b" />
      </g>
      <g fill="#152620" opacity=".55">
        <circle cx="300" cy="168" r="4" />
        <circle cx="318" cy="168" r="4" />
        <circle cx="336" cy="168" r="4" />
      </g>
      <text
        x="318"
        y="208"
        fill="#f4b6a6"
        fontSize="9"
        fontWeight="800"
        textAnchor="middle"
      >
        Участникам
      </text>
    </svg>
  );
}
