type BrandMarkProps = {
  className?: string;
  // "light" sits on paper backgrounds, "dark" is the inverted mark for dark surfaces.
  tone?: "light" | "dark";
};

const palette = {
  light: { tile: "#174c3c", ring: "#a8c7b8" },
  dark: { tile: "#a8c7b8", ring: "#174c3c" },
};

// OpenFund mark: a vault tile with a half-open ring door and the cinnabar contract diamond.
export function BrandMark({ className, tone = "light" }: BrandMarkProps) {
  const colors = palette[tone];

  return (
    <svg aria-hidden="true" className={className} focusable="false" viewBox="0 0 48 48">
      <rect fill={colors.tile} height="44" rx="13" width="44" x="2" y="2" />
      <path
        d="M34.24 16.83 A12.5 12.5 0 1 1 22.91 11.55"
        fill="none"
        stroke={colors.ring}
        strokeLinecap="round"
        strokeWidth="3.6"
      />
      <rect fill="#e45b3f" height="10" rx="1.4" transform="rotate(45 24 24)" width="10" x="19" y="19" />
    </svg>
  );
}
