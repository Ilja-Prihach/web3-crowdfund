import styles from "./TrustSection.module.scss";

// Hand-drawn vector vault: code-built so it needs no raster download.
export function TrustVaultArt() {
  return (
    <svg
      className={styles.art}
      viewBox="0 0 400 520"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="tv-bg" cx="50%" cy="44%" r="65%">
          <stop offset="0" stopColor="#235f4b" />
          <stop offset=".5" stopColor="#152620" />
          <stop offset="1" stopColor="#0e1512" />
        </radialGradient>
        <linearGradient id="tv-ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2d8" stopOpacity=".16" />
          <stop offset="1" stopColor="#cfe2d8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="tv-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3a4a41" />
          <stop offset=".5" stopColor="#1d2722" />
          <stop offset="1" stopColor="#0e1411" />
        </linearGradient>
        <linearGradient id="tv-edge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e3ece5" stopOpacity=".6" />
          <stop offset=".45" stopColor="#e3ece5" stopOpacity=".04" />
          <stop offset="1" stopColor="#000" stopOpacity=".4" />
        </linearGradient>
        <linearGradient id="tv-door" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#55685e" />
          <stop offset=".45" stopColor="#28352e" />
          <stop offset="1" stopColor="#111915" />
        </linearGradient>
        <linearGradient id="tv-plate" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#2c3a33" />
          <stop offset="1" stopColor="#0f1613" />
        </linearGradient>
        <radialGradient id="tv-dial" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#3a8f71" />
          <stop offset=".55" stopColor="#174c3c" />
          <stop offset="1" stopColor="#0a241c" />
        </radialGradient>
        <linearGradient id="tv-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f2" />
          <stop offset=".5" stopColor="#a9bab0" />
          <stop offset="1" stopColor="#55665c" />
        </linearGradient>
        <filter id="tv-shadow" x="-40%" y="-30%" width="180%" height="190%">
          <feDropShadow
            dx="0"
            dy="28"
            stdDeviation="24"
            floodColor="#000"
            floodOpacity=".6"
          />
        </filter>
        <filter id="tv-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="16" />
        </filter>
        <filter id="tv-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <rect width="400" height="520" fill="url(#tv-bg)" />
      <path d="M150 -10 L250 -10 L345 520 L55 520Z" fill="url(#tv-ray)" />
      <path
        d="M96 -10 L118 -10 L40 520 L8 520Z"
        fill="url(#tv-ray)"
        opacity=".7"
      />
      <path
        d="M290 -10 L306 -10 L398 520 L370 520Z"
        fill="url(#tv-ray)"
        opacity=".6"
      />
      <ellipse
        cx="200"
        cy="408"
        rx="150"
        ry="24"
        fill="#000"
        opacity=".55"
        filter="url(#tv-soft)"
      />
      <circle
        cx="200"
        cy="232"
        r="150"
        fill="#2f8a68"
        opacity=".18"
        filter="url(#tv-soft)"
      />
      <g filter="url(#tv-shadow)">
        <rect
          x="72"
          y="104"
          width="256"
          height="256"
          rx="46"
          fill="url(#tv-body)"
        />
      </g>
      <rect
        x="72.75"
        y="104.75"
        width="254.5"
        height="254.5"
        rx="45.25"
        fill="none"
        stroke="url(#tv-edge)"
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
      <g fill="url(#tv-metal)" opacity=".85">
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
        filter="url(#tv-glow)"
      />
      <circle cx="298" cy="134" r="4.5" fill="#6fdc9e" />
      <rect
        x="314"
        y="196"
        width="18"
        height="72"
        rx="7"
        fill="url(#tv-metal)"
        opacity=".8"
      />
      <circle cx="200" cy="232" r="100" fill="#000" opacity=".35" />
      <circle cx="200" cy="230" r="98" fill="url(#tv-door)" />
      <circle
        cx="200"
        cy="230"
        r="97.25"
        fill="none"
        stroke="url(#tv-edge)"
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
      <g fill="url(#tv-metal)">
        <circle cx="274" cy="230" r="6.5" />
        <circle cx="252.3" cy="282.3" r="6.5" />
        <circle cx="200" cy="304" r="6.5" />
        <circle cx="147.7" cy="282.3" r="6.5" />
        <circle cx="126" cy="230" r="6.5" />
        <circle cx="147.7" cy="177.7" r="6.5" />
        <circle cx="200" cy="156" r="6.5" />
        <circle cx="252.3" cy="177.7" r="6.5" />
      </g>
      <circle cx="200" cy="230" r="60" fill="url(#tv-plate)" />
      <circle
        cx="200"
        cy="230"
        r="59.25"
        fill="none"
        stroke="#cfe2d8"
        strokeOpacity=".12"
        strokeWidth="1.5"
      />
      <g stroke="url(#tv-metal)" strokeWidth="9" strokeLinecap="round">
        <path d="M200 230 L200 176" />
        <path d="M200 230 L246.8 257" />
        <path d="M200 230 L153.2 257" />
      </g>
      <g fill="url(#tv-metal)">
        <circle cx="200" cy="174" r="9" />
        <circle cx="248.5" cy="258" r="9" />
        <circle cx="151.5" cy="258" r="9" />
      </g>
      <circle cx="200" cy="230" r="33" fill="#000" opacity=".4" />
      <circle cx="200" cy="229" r="31" fill="url(#tv-dial)" />
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
        filter="url(#tv-glow)"
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
      <g fill="#cfe2d8">
        <circle cx="58" cy="96" r="1.6" opacity=".6" />
        <circle cx="340" cy="70" r="1.2" opacity=".5" />
        <circle cx="352" cy="300" r="1.8" opacity=".5" />
        <circle cx="44" cy="300" r="1.2" opacity=".4" />
        <circle cx="120" cy="44" r="1" opacity=".5" />
        <circle cx="270" cy="460" r="1.4" opacity=".4" />
      </g>
      <circle cx="330" cy="420" r="3" fill="#e45b3f" opacity=".8" />
    </svg>
  );
}
