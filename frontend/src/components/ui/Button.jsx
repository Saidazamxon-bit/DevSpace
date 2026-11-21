import { Loader2 } from 'lucide-react';

export default function Button({ variant = 'secondary', size = 'md', icon: Icon, loading, children, className = '', iconOnly: iconOnlyProp, ...rest }) {
  const iconOnly = iconOnlyProp ?? (!children && !!Icon);
  const cls = ['btn', `btn-${variant}`, `btn-${size}`, iconOnly && 'btn-icon', className].filter(Boolean).join(' ');
  return (
    <button type="button" className={cls} disabled={loading || rest.disabled} {...rest}>
      {loading ? <Loader2 size={16} className="spin" /> : Icon ? <Icon size={size === 'sm' ? 15 : 17} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}
