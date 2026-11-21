import { Link } from 'react-router-dom';
import { t, tr } from '../i18n';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p className="muted">{t('This page doesn’t exist.')}</p>
      <p style={{ marginTop: 16 }}><Link to="/" className="btn btn-primary btn-md">{t('Back to overview')}</Link></p>
    </div>
  );
}
