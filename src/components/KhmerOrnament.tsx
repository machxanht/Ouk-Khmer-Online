/** Decorative Khmer kbach motifs rendered as inline SVG (currentColor based). */

export function KbachDivider({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 24"
      aria-hidden="true"
      className={`h-6 w-full text-gold ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    >
      <path d="M4 12h74" opacity="0.55" />
      <path d="M162 12h74" opacity="0.55" />
      <path d="M120 3c6 4 9 6 9 9s-3 5-9 9c-6-4-9-6-9-9s3-5 9-9Z" />
      <path d="M92 12c6-6 12-6 16 0-4 6-10 6-16 0Z" />
      <path d="M148 12c-6-6-12-6-16 0 4 6 10 6 16 0Z" />
      <circle cx="120" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function KbachCorner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={`h-10 w-10 text-gold ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <path d="M4 60V22C4 12 12 4 22 4h38" opacity="0.5" />
      <path d="M14 60V26c0-7 5-12 12-12h34" opacity="0.8" />
      <path d="M26 42c0-9 7-16 16-16-3 9-7 13-16 16Z" />
      <circle cx="24" cy="46" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Slow-rotating lotus mandala used as an ambient background flourish. */
export function LotusMandala({ className = "" }: { className?: string }) {
  const petals = Array.from({ length: 12 });
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      className={`text-gold ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      {petals.map((_, i) => (
        <ellipse
          key={i}
          cx="100"
          cy="52"
          rx="13"
          ry="42"
          transform={`rotate(${i * 30} 100 100)`}
          opacity="0.6"
        />
      ))}
      <circle cx="100" cy="100" r="20" />
      <circle cx="100" cy="100" r="8" />
    </svg>
  );
}
