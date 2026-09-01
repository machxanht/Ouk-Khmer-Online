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

/** Authentic Angkor Wat 5-tower monument silhouette vector used for low-opacity background atmosphere */
export function AngkorSilhouette({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 280"
      aria-hidden="true"
      className={className}
      fill="currentColor"
      preserveAspectRatio="xMidYMax meet"
    >
      {/* 5 Iconic Angkor Wat Lotus Towers and Gallery Silhouettes */}
      <path d="M0 280h800v-20H720v-24h-40v-16h-30v-30h-16v-28h-14v-22h-10v-30h-8v-32h-6v-24h-4v-16h-4v16h-6v24h-8v32h-10v30h-14v22h-16v28h-30v30h-40v16h-36v-38h-18v-30h-16v-26h-12v-34h-10v-40h-8v-30h-6v-20h-4v-20h-4v20h-6v20h-8v30h-10v40h-12v34h-16v26h-18v30h-36v38h-24v-48h-20v-36h-18v-30h-14v-38h-12v-44h-10v-36h-8v-28h-6v-22h-6v22h-8v28h-10v36h-12v44h-14v38h-18v30h-20v36h-24v48h-36v-38h-18v-30h-16v-26h-12v-34h-10v-40h-8v-30h-6v-20h-4v-20h-4v20h-6v20h-8v30h-10v40h-12v34h-16v26h-18v30h-36v38h-40v-16h-30v-30h-16v-28h-14v-22h-10v-30h-8v-32h-6v-24h-4v-16h-4v16h-6v24h-8v32h-10v30h-14v22h-16v28h-30v30h-40v16H80v24H0v20z" />
    </svg>
  );
}
