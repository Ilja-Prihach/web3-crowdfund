import styles from "./HeroSection.module.scss";

// Code-built cover scene: ETH flows from a wallet into the contract vault,
// then on to the author on success or back to backers on refund.
export function HeroArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 560 540"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="hv-bg" cx="50%" cy="44%" r="65%">
          <stop offset="0" stopColor="#235f4b" />
          <stop offset=".5" stopColor="#152620" />
          <stop offset="1" stopColor="#0e1512" />
        </radialGradient>
        <linearGradient id="hv-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hv-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a41" />
          <stop offset=".5" stopColor="#1d2722" />
          <stop offset="1" stopColor="#0e1411" />
        </linearGradient>
        <linearGradient id="hv-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".6" />
          <stop offset=".45" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <linearGradient id="hv-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55685e" />
          <stop offset=".45" stopColor="#28352e" />
          <stop offset="1" stopColor="#111915" />
        </linearGradient>
        <linearGradient id="hv-plate" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2c3a33" />
          <stop offset="1" stopColor="#0f1613" />
        </linearGradient>
        <radialGradient id="hv-dial" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#3a8f71" />
          <stop offset=".55" stopColor="#174c3c" />
          <stop offset="1" stopColor="#0a241c" />
        </radialGradient>
        <linearGradient id="hv-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f2" />
          <stop offset=".5" stopColor="#a9bab0" />
          <stop offset="1" stopColor="#55665c" />
        </linearGradient>
        <filter id="hv-shadow" x="-40%" y="-30%" width="180%" height="190%">
          <feDropShadow
            dx="0"
            dy="28"
            stdDeviation="24"
            floodColor="#000"
            floodOpacity=".6"
          />
        </filter>
        <filter id="hv-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="hv-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>

        <radialGradient id="hb-bg" cx="55%" cy="45%" r="75%">
          <stop offset="0" stopColor="#2b6e57" />
          <stop offset=".5" stopColor="#163a2e" />
          <stop offset="1" stopColor="#0c1612" />
        </radialGradient>
        <linearGradient id="hb-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hp-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".55" />
          <stop offset=".45" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <filter id="hp-shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow
            dx="0"
            dy="14"
            stdDeviation="12"
            floodColor="#000"
            floodOpacity=".55"
          />
        </filter>
        <radialGradient id="hb-dial" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#3a8f71" />
          <stop offset=".55" stopColor="#174c3c" />
          <stop offset="1" stopColor="#0a241c" />
        </radialGradient>
      </defs>
      <rect width="560" height="540" fill="url(#hb-bg)" />
      <path d="M250 -10 L380 -10 L470 550 L150 550Z" fill="url(#hb-ray)" />
      <path
        d="M120 -10 L142 -10 L40 550 L6 550Z"
        fill="url(#hb-ray)"
        opacity=".7"
      />
      <path
        d="M470 -10 L488 -10 L560 300 L540 300Z"
        fill="url(#hb-ray)"
        opacity=".5"
      />
      <g stroke="#cfe2d8" strokeOpacity=".06">
        <path d="M0 470 H560" />
        <path d="M0 500 H560" />
        <path d="M0 530 H560" />
        <path d="M300 430 L60 540" />
        <path d="M300 430 L180 540" />
        <path d="M300 430 L300 540" />
        <path d="M300 430 L420 540" />
        <path d="M300 430 L540 540" />
      </g>
      <g fill="#cfe2d8">
        <circle cx="44" cy="40" r="1.4" opacity=".6" />
        <circle cx="520" cy="60" r="1.2" opacity=".5" />
        <circle cx="530" cy="300" r="1.6" opacity=".45" />
        <circle cx="210" cy="30" r="1" opacity=".5" />
        <circle cx="380" cy="500" r="1.3" opacity=".4" />
      </g>
      <g transform="translate(34 26) scale(.87)">
        <ellipse
          cx="300"
          cy="420"
          rx="140"
          ry="20"
          fill="#000"
          opacity=".55"
          filter="url(#hv-soft)"
        />
        <circle
          cx="300"
          cy="262"
          r="150"
          fill="#2f8a68"
          opacity=".2"
          filter="url(#hv-soft)"
        />
        <path
          d="M136 168 C 200 120, 190 250, 214 262"
          fill="none"
          stroke="#a8c7b8"
          strokeWidth="8"
          opacity=".3"
          filter="url(#hv-glow)"
        />
        <path
          d="M136 168 C 200 120, 190 250, 214 262"
          fill="none"
          stroke="#cfe2d8"
          strokeWidth="2"
          strokeDasharray="3 7"
          strokeLinecap="round"
        />
        <g fill="#ef6d50">
          <rect
            x="160"
            y="148"
            width="8"
            height="8"
            rx="1.3"
            transform="rotate(45 164 152)"
          />
          <rect
            x="183"
            y="185"
            width="11"
            height="11"
            rx="1.8"
            transform="rotate(45 188.5 190.5)"
          />
          <rect
            x="196"
            y="228"
            width="8"
            height="8"
            rx="1.3"
            transform="rotate(45 200 232)"
          />
        </g>
        <circle
          cx="188.5"
          cy="190.5"
          r="11"
          fill="#e45b3f"
          opacity=".5"
          filter="url(#hv-glow)"
        />
        <path
          d="M396 236 C 440 236, 444 140, 488 132"
          fill="none"
          stroke="#6fdc9e"
          strokeWidth="8"
          opacity=".35"
          filter="url(#hv-glow)"
        />
        <path
          d="M396 236 C 440 236, 444 140, 488 132"
          fill="none"
          stroke="#6fdc9e"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M380 336 C 420 380, 440 400, 482 404"
          fill="none"
          stroke="#ef6d50"
          strokeWidth="8"
          opacity=".3"
          filter="url(#hv-glow)"
        />
        <path
          d="M380 336 C 420 380, 440 400, 482 404"
          fill="none"
          stroke="#ef6d50"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="6 6"
        />
        <g transform="translate(144 81) scale(.78)">
          <g filter="url(#hv-shadow)">
            <rect
              x="72"
              y="104"
              width="256"
              height="256"
              rx="46"
              fill="url(#hv-body)"
            />
          </g>
          <rect
            x="72.75"
            y="104.75"
            width="254.5"
            height="254.5"
            rx="45.25"
            fill="none"
            stroke="url(#hv-edge)"
            strokeWidth="1.5"
          />
          <rect
            x="88"
            y="120"
            width="224"
            height="224"
            rx="34"
            fill="none"
            stroke="#000"
            strokeOpacity=".35"
            strokeWidth="2"
          />
          <g fill="url(#hv-metal)" opacity=".85">
            <circle cx="102" cy="134" r="4.5" />
            <circle cx="102" cy="330" r="4.5" />
            <circle cx="298" cy="330" r="4.5" />
          </g>
          <circle
            cx="298"
            cy="134"
            r="9"
            fill="#3fa66f"
            opacity=".45"
            filter="url(#hv-glow)"
          />
          <circle cx="298" cy="134" r="4.5" fill="#6fdc9e" />
          <rect
            x="314"
            y="196"
            width="18"
            height="72"
            rx="7"
            fill="url(#hv-metal)"
            opacity=".8"
          />
          <circle cx="200" cy="232" r="100" fill="#000" opacity=".35" />
          <circle cx="200" cy="230" r="98" fill="url(#hv-door)" />
          <circle
            cx="200"
            cy="230"
            r="97.25"
            fill="none"
            stroke="url(#hv-edge)"
            strokeWidth="1.5"
          />
          <circle
            cx="200"
            cy="230"
            r="84"
            fill="none"
            stroke="#0a0f0c"
            strokeOpacity=".7"
            strokeWidth="7"
          />
          <circle
            cx="200"
            cy="230"
            r="80"
            fill="none"
            stroke="#cfe2d8"
            strokeOpacity=".14"
          />
          <g fill="url(#hv-metal)">
            <circle cx="274" cy="230" r="6.5" />
            <circle cx="252.3" cy="282.3" r="6.5" />
            <circle cx="200" cy="304" r="6.5" />
            <circle cx="147.7" cy="282.3" r="6.5" />
            <circle cx="126" cy="230" r="6.5" />
            <circle cx="147.7" cy="177.7" r="6.5" />
            <circle cx="200" cy="156" r="6.5" />
            <circle cx="252.3" cy="177.7" r="6.5" />
          </g>
          <circle cx="200" cy="230" r="60" fill="url(#hv-plate)" />
          <circle
            cx="200"
            cy="230"
            r="59.25"
            fill="none"
            stroke="#cfe2d8"
            strokeOpacity=".12"
            strokeWidth="1.5"
          />
          <g stroke="url(#hv-metal)" strokeWidth="9" strokeLinecap="round">
            <path d="M200 230 L200 176" />
            <path d="M200 230 L246.8 257" />
            <path d="M200 230 L153.2 257" />
          </g>
          <g fill="url(#hv-metal)">
            <circle cx="200" cy="174" r="9" />
            <circle cx="248.5" cy="258" r="9" />
            <circle cx="151.5" cy="258" r="9" />
          </g>
          <circle cx="200" cy="230" r="33" fill="#000" opacity=".4" />
          <circle cx="200" cy="229" r="31" fill="url(#hv-dial)" />
          <circle
            cx="200"
            cy="229"
            r="30.25"
            fill="none"
            stroke="#cfe2d8"
            strokeOpacity=".35"
            strokeWidth="1.5"
          />
          <g
            stroke="#cfe2d8"
            strokeOpacity=".35"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <path d="M200 202v5" />
            <path d="M227 229h-5" />
            <path d="M200 256v-5" />
            <path d="M173 229h5" />
          </g>
          <rect
            x="186"
            y="215"
            width="28"
            height="28"
            rx="4"
            fill="#e45b3f"
            transform="rotate(45 200 229)"
            filter="url(#hv-glow)"
            opacity=".9"
          />
          <rect
            x="190"
            y="219"
            width="20"
            height="20"
            rx="3"
            fill="#ef6d50"
            transform="rotate(45 200 229)"
          />
          <path
            d="M193 222 L200 215 L207 222"
            fill="none"
            stroke="#fff"
            strokeOpacity=".45"
            strokeWidth="1.5"
            strokeLinecap="round"
            transform="rotate(0 200 229)"
          />
        </g>
        <g transform="translate(-10 62) scale(.9)">
          <g filter="url(#hp-shadow)">
            <rect
              x="52"
              y="40"
              width="92"
              height="164"
              rx="20"
              fill="#17201b"
            />
          </g>
          <rect
            x="52.75"
            y="40.75"
            width="90.5"
            height="162.5"
            rx="19.25"
            fill="none"
            stroke="url(#hp-edge)"
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
        </g>
        <circle
          cx="508"
          cy="128"
          r="34"
          fill="#3fa66f"
          opacity=".35"
          filter="url(#hv-glow)"
        />
        <circle
          cx="508"
          cy="128"
          r="25"
          fill="url(#hb-dial)"
          stroke="#a8c7b8"
          strokeOpacity=".6"
          strokeWidth="1.5"
        />
        <path
          d="M497 128.5l7 7 14-14.5"
          fill="none"
          stroke="#fffdf7"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text
          x="508"
          y="174"
          fill="#a8c7b8"
          fontSize="11"
          fontWeight="800"
          textAnchor="middle"
        >
          Автору
        </text>
        <circle
          cx="508"
          cy="404"
          r="38"
          fill="#e45b3f"
          opacity=".22"
          filter="url(#hv-glow)"
        />
        <g stroke="#152620" strokeWidth="2.5">
          <circle cx="488" cy="404" r="14" fill="#a8c7b8" />
          <circle cx="508" cy="404" r="14" fill="#f4d4ca" />
          <circle cx="528" cy="404" r="14" fill="#c98a1b" />
        </g>
        <g fill="#152620" opacity=".55">
          <circle cx="488" cy="400" r="4.5" />
          <circle cx="508" cy="400" r="4.5" />
          <circle cx="528" cy="400" r="4.5" />
        </g>
        <text
          x="508"
          y="444"
          fill="#f4b6a6"
          fontSize="11"
          fontWeight="800"
          textAnchor="middle"
        >
          Участникам
        </text>
      </g>
    </svg>
  );
}
