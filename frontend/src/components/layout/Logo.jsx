import { t } from '../../i18n';

export function LogoMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo-mark">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <path d="M9 11l5 5-5 5" fill="none" stroke="#0A0A0A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="16" y="19.6" width="7.5" height="2.8" rx="1.4" fill="#0A0A0A" className="logo-cursor" />
    </svg>
  );
}

export default function Logo({ collapsed }) {
  return (
    <div className="logo">
      <LogoMark />
      {!collapsed && (
        <div className="logo-text">
          <strong>DEVSPACE</strong>
          <span>{t('Developer Command Center')}</span>
        </div>
      )}
    </div>
  );
}
