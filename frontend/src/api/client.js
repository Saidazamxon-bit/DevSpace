// Thin fetch wrapper: same-origin session cookie + CSRF header on every mutating request.

const meta = document.querySelector('meta[name="app-base"]');
export const BASE = meta ? meta.getAttribute('content') : '';

let csrfToken = null;
export const setCsrf = (t) => { csrfToken = t; };

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const listeners = new Set();
/** Subscribe to 401s (session expired) so the app can return to the login screen. */
export const onUnauthorized = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

export async function api(path, { method = 'GET', body, query } = {}) {
  let url = `${BASE}/api${path}`;
  if (query) {
    const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all'));
    if ([...qs].length) url += `?${qs}`;
  }
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrfToken) headers['X-CSRF-Token'] = csrfToken;

  let res;
  try {
    res = await fetch(url, { method, headers, credentials: 'same-origin', body: body !== undefined ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, 'Network error — check your connection.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401) listeners.forEach((fn) => fn());
    throw new ApiError(res.status, data?.error?.message || `Request failed (${res.status})`, data?.error?.fields || {});
  }
  if (data && data.csrf) setCsrf(data.csrf);
  return data;
}

export const get = (path, query) => api(path, { query });
export const post = (path, body = {}) => api(path, { method: 'POST', body });
export const put = (path, body) => api(path, { method: 'PUT', body });
export const patch = (path, body) => api(path, { method: 'PATCH', body });
export const del = (path) => api(path, { method: 'DELETE' });

/** Absolute URL for file downloads (CSV / JSON / backups). */
export const downloadUrl = (path, query) => {
  const qs = query ? new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '' && v !== 'all')) : null;
  return `${BASE}/api${path}${qs && [...qs].length ? `?${qs}` : ''}`;
};
