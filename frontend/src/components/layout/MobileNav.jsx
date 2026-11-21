import { NavLink } from 'react-router-dom';
import { Menu as MenuIcon } from 'lucide-react';
import { MOBILE_NAV, NAV } from './nav';
import { t } from '../../i18n';

export default function MobileNav({ onMore }) {
  const items = NAV.filter((n) => MOBILE_NAV.includes(n.to));
  return (
    <nav className="mobile-nav" aria-label={t('Quick navigation')}>
      {items.map(({ to, label, short, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="mobile-nav-item">
          <span className="mobile-nav-icon"><Icon size={20} /></span>
          <span>{short || label}</span>
        </NavLink>
      ))}
      <button type="button" className="mobile-nav-item" onClick={onMore}>
        <span className="mobile-nav-icon"><MenuIcon size={20} /></span>
        <span>{t('More')}</span>
      </button>
    </nav>
  );
}
