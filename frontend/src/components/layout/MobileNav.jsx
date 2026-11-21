import { NavLink } from 'react-router-dom';
import { Menu as MenuIcon } from 'lucide-react';
import { MOBILE_NAV, NAV } from './nav';

export default function MobileNav({ onMore }) {
  const items = NAV.filter((n) => MOBILE_NAV.includes(n.to));
  return (
    <nav className="mobile-nav" aria-label="Quick navigation">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className="mobile-nav-item">
          <span className="mobile-nav-icon"><Icon size={20} /></span>
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className="mobile-nav-item" onClick={onMore}>
        <span className="mobile-nav-icon"><MenuIcon size={20} /></span>
        <span>More</span>
      </button>
    </nav>
  );
}
