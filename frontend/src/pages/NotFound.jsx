import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <p className="muted">This page doesn’t exist.</p>
      <p style={{ marginTop: 16 }}><Link to="/" className="btn btn-primary btn-md">Back to overview</Link></p>
    </div>
  );
}
