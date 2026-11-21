/**
 * Responsive data view: a real table on wide screens, stacked cards on phones.
 * columns: [{ key, label, render(row), className, mobile: 'title'|'sub'|'meta'|'hide', align }]
 */
export default function DataTable({ columns, rows, onRowClick, actions, rowKey = 'id' }) {
  const title = columns.find((c) => c.mobile === 'title') || columns[0];
  const subs = columns.filter((c) => c.mobile === 'sub');
  const metas = columns.filter((c) => c !== title && c.mobile !== 'hide' && c.mobile !== 'sub');
  const cell = (c, r) => (c.render ? c.render(r) : (r[c.key] ?? '—'));

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              {columns.map((c) => <th key={c.key} className={c.className} style={{ textAlign: c.align }}>{c.label}</th>)}
              {actions && <th className="col-actions" aria-label="Actions" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined} className={onRowClick ? 'clickable' : ''}>
                {columns.map((c) => <td key={c.key} className={c.className} style={{ textAlign: c.align }}>{cell(c, r)}</td>)}
                {actions && <td className="col-actions" onClick={(e) => e.stopPropagation()}>{actions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card-list">
        {rows.map((r) => (
          <div key={r[rowKey]} className={`list-card${onRowClick ? ' clickable' : ''}`} onClick={onRowClick ? () => onRowClick(r) : undefined}>
            <div className="list-card-head">
              <div className="list-card-title">
                {cell(title, r)}
                {subs.map((s) => <div key={s.key} className="list-card-sub">{cell(s, r)}</div>)}
              </div>
              {actions && <div onClick={(e) => e.stopPropagation()}>{actions(r)}</div>}
            </div>
            {metas.length > 0 && (
              <dl className="list-card-meta">
                {metas.map((c) => (
                  <div key={c.key}><dt>{c.label}</dt><dd>{cell(c, r)}</dd></div>
                ))}
              </dl>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
