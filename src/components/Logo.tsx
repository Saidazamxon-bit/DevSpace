export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden className="shrink-0">
      <rect width="48" height="48" rx="14" fill="rgb(var(--hero-bg))" />
      <circle cx="38" cy="8" r="20" fill="rgb(var(--accent))" opacity=".55" />
      <rect x="11" y="15" width="26" height="19" rx="5" fill="none" stroke="#fff" strokeWidth="2.6" />
      <path d="M11 21h26" stroke="#fff" strokeWidth="2.6" />
      <circle cx="31" cy="28" r="2.2" fill="#fff" />
    </svg>
  );
}
