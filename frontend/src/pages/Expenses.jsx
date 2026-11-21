import { useState } from 'react';
import { Download, Pencil, Plus, Repeat, Tags as TagsIcon, Trash2, Wallet } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor, useOptions, useProjectOptions } from '../hooks/useCrud';
import { downloadUrl } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import Modal from '../components/ui/Modal';
import Menu from '../components/ui/Menu';
import DataTable from '../components/ui/DataTable';
import { BarChart, DoughnutChart, useThemeTokens } from '../components/ui/Charts';
import { Select } from '../components/ui/Fields';
import { Badge, EmptyState, ErrorState, MiniStat, PageHeader, SearchInput, SkeletonCards, Toolbar } from '../components/ui/Misc';
import { CURRENCIES } from '../lib/constants';
import { formatDate, formatMoney, serverNow, todayISO } from '../lib/format';

const CATEGORY_COLORS = ['#3987E5', '#D95926', '#199E70', '#C98500', '#D55181', '#0CA30C', '#9085E9', '#8A8A8A'];
const UNCATEGORIZED = '#6B6B6B';
const catColor = (c, i) => c.color || (c.name === 'Uncategorized' ? UNCATEGORIZED : CATEGORY_COLORS[i % CATEGORY_COLORS.length]);

const fields = (projects, categories) => [
  { name: 'title', label: 'Title', required: true, span: 2, placeholder: 'Hetzner VPS' },
  { name: 'amount', label: 'Amount', type: 'number', required: true, min: 0.01, step: '0.01' },
  { name: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, required: true, default: 'USD' },
  { name: 'spent_at', label: 'Date', type: 'date', required: true, default: todayISO() },
  { name: 'vendor', label: 'Vendor', placeholder: 'Hetzner, GitHub…' },
  { name: 'category_id', label: 'Category', type: 'select', options: categories, placeholder: 'Uncategorized' },
  { name: 'project_id', label: 'Project', type: 'select', options: projects, placeholder: 'None' },
  { name: 'is_recurring', label: 'Recurring', type: 'switch', switchLabel: 'This is a recurring expense', span: 2 },
  { name: 'recurrence', label: 'Repeats', type: 'select', options: [{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }], default: 'monthly', show: (v) => v.is_recurring, hint: 'Future entries are created automatically on the same day.' },
  { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 2 },
];

function Categories({ open, onClose, onChange }) {
  const { data, reload } = useApi('/expense-categories', undefined, { enabled: open });
  const editor = useEditor();
  const { save, remove } = useCrud('/expense-categories', { entity: 'category', onChange: () => { reload({ silent: true }); onChange(); } });
  return (
    <Modal open={open} onClose={onClose} title="Expense categories" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add category</Button></>}>
      <div className="related-list">
        {(data || []).map((c) => (
          <div key={c.id} className="related-item">
            <i className="dot" style={{ background: c.color || 'var(--faint)' }} />
            <span className="grow">{c.name}</span>
            <span className="muted small">{c.expenses_count}</span>
            <button type="button" className="icon-btn sm" onClick={() => editor.edit(c)} aria-label={`Edit ${c.name}`}><Pencil size={13} /></button>
            <button type="button" className="icon-btn sm" onClick={() => remove(c, c.name)} aria-label={`Delete ${c.name}`}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'New category' : 'Edit category'} size="sm"
        fields={[{ name: 'name', label: 'Name', required: true, span: 2 }, { name: 'color', label: 'Color', type: 'color', colors: CATEGORY_COLORS, span: 2 }]}
        initial={editor.editing} onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
    </Modal>
  );
}

export default function Expenses() {
  const { settings } = useAuth();
  const t = useThemeTokens();
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [currency, setCurrency] = useState('');
  const [period, setPeriod] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const dq = useDebounce(q);

  const now = serverNow();
  const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const periods = {
    this_month: { from: `${ym(now)}-01`, to: todayISO() },
    last_month: (() => { const d = new Date(now.getFullYear(), now.getMonth() - 1, 1); const e = new Date(now.getFullYear(), now.getMonth(), 0); return { from: `${ym(d)}-01`, to: `${ym(e)}-${String(e.getDate()).padStart(2, '0')}` }; })(),
    this_year: { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` },
  };
  const filters = { q: dq, category_id: categoryId, project_id: projectId, currency, sort: 'date', ...(periods[period] || {}) };
  const { data, loading, error, reload } = useApi('/expenses', filters);
  const stats = useApi('/expenses/stats');
  const projects = useProjectOptions();
  const [catKey, setCatKey] = useState(0);
  const categories = useOptions('/expense-categories', (c) => ({ value: String(c.id), label: c.name, color: c.color }), catKey);
  const editor = useEditor();
  const refresh = () => { reload({ silent: true }); stats.reload({ silent: true }); };
  const { save, remove } = useCrud('/expenses', { entity: 'expense', onChange: refresh });

  const s = stats.data;
  const cur = s?.currency || settings?.currency || 'USD';
  const money = (v) => formatMoney(v, cur, { compact: true });
  const delta = s && s.last_month > 0 ? Math.round(((s.this_month - s.last_month) / s.last_month) * 100) : null;
  const total = data ? data.length : 0;

  const columns = [
    { key: 'title', label: 'Expense', mobile: 'title', render: (e) => (
      <div><div className="cell-title row" style={{ gap: 6 }}>{e.title}{e.is_recurring && <Repeat size={12} className="ink" aria-label="Recurring" />}</div><div className="cell-sub">{e.vendor || '—'}</div></div>
    ) },
    { key: 'amount', label: 'Amount', mobile: 'sub', render: (e) => <strong className="nowrap">{formatMoney(e.amount, e.currency)}</strong> },
    { key: 'spent_at', label: 'Date', render: (e) => <span className="nowrap">{formatDate(e.spent_at)}</span> },
    { key: 'category', label: 'Category', render: (e) => (e.category_name ? <span className="cat-chip"><i style={{ background: e.category_color || 'var(--faint)' }} />{e.category_name}</span> : <span className="faint">—</span>) },
    { key: 'project', label: 'Project', render: (e) => e.project_name || <span className="faint">—</span> },
    { key: 'recurring', label: 'Type', render: (e) => (e.is_recurring ? <Badge tone="accent">{e.recurrence}</Badge> : e.parent_id ? <Badge tone="muted">auto</Badge> : <Badge tone="neutral">one-time</Badge>) },
  ];

  return (
    <>
      <PageHeader title="Expenses" subtitle={`Track spending across UZS, USD and EUR — totals converted to ${cur} with your exchange rates.`}
        actions={(
          <>
            <Button icon={TagsIcon} onClick={() => setCatOpen(true)}>Categories</Button>
            <a className="btn btn-secondary btn-md" href={downloadUrl('/expenses/export', filters)} download><Download size={17} /><span>Export CSV</span></a>
            <Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add expense</Button>
          </>
        )} />

      {s && (
        <div className="mini-stats">
          <MiniStat label="This month" value={money(s.this_month)} tone="accent" sub={delta !== null ? `${delta >= 0 ? '+' : ''}${delta}% vs last month` : 'No data last month'} />
          <MiniStat label="Last month" value={money(s.last_month)} sub="Converted total" />
          <MiniStat label="Last 12 months" value={money(s.year_total)} sub={`avg ${money(s.year_total / 12)}/month`} />
          <MiniStat label="Recurring / month" value={money(s.recurring_monthly)} tone="orange" sub={`${s.recurring_count} recurring subscriptions`} />
        </div>
      )}

      {s && (
        <div className="expense-charts">
          <section className="card">
            <div className="card-head"><h3><Wallet size={16} />Monthly spending</h3><span className="card-sub">in {cur}</span></div>
            <BarChart labels={s.monthly.map((m) => new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' }))}
              titles={s.monthly.map((m) => new Date(`${m.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }))}
              values={s.monthly.map((m) => m.total)} colors={s.monthly.map((_, i) => (i === s.monthly.length - 1 ? t.accent : t.orange))}
              label="Spent" format={(v) => formatMoney(v, cur, { compact: true })} height={230} />
            <div className="chart-legend"><span><i style={{ background: t.accent }} />Current month</span><span><i style={{ background: t.orange }} />Previous months</span></div>
          </section>
          <section className="card">
            <div className="card-head"><h3>By category</h3><span className="card-sub">12 months</span></div>
            {s.by_category.length === 0 ? <p className="muted small">No expenses yet.</p> : (
              <div className="donut-wrap">
                <DoughnutChart labels={s.by_category.map((c) => c.name)} values={s.by_category.map((c) => c.total)}
                  colors={s.by_category.map(catColor)} format={(v) => formatMoney(v, cur)} height={160} />
                <ul className="legend-list">
                  {s.by_category.slice(0, 7).map((c, i) => (
                    <li key={c.name}><i style={{ background: catColor(c, i) }} /><span>{c.name}</span><strong>{money(c.total)}</strong></li>
                  ))}
                </ul>
              </div>
            )}
            {s.this_month_by_currency.length > 0 && (
              <div className="row-wrap" style={{ marginTop: 14 }}>
                <span className="muted small">This month raw:</span>
                {s.this_month_by_currency.map((c) => <Badge key={c.currency} tone="neutral">{formatMoney(c.total, c.currency, { compact: true })}</Badge>)}
              </div>
            )}
          </section>
        </div>
      )}

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Search expenses, vendors…" />
        <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={[{ value: 'this_month', label: 'This month' }, { value: 'last_month', label: 'Last month' }, { value: 'this_year', label: 'This year' }]} placeholder="All time" aria-label="Period" />
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={categories} placeholder="All categories" aria-label="Category" />
        <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} options={projects} placeholder="All projects" aria-label="Project" />
        <Select value={currency} onChange={(e) => setCurrency(e.target.value)} options={CURRENCIES.map((c) => ({ value: c.value, label: c.value }))} placeholder="Any currency" aria-label="Currency" />
      </Toolbar>

      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={3} h={70} /> : total === 0 ? (
        <EmptyState icon={Wallet} title="No expenses" text="Nothing matches these filters yet." action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>Add expense</Button>} />
      ) : (
        <DataTable columns={columns} rows={data} onRowClick={editor.edit}
          actions={(e) => <Menu items={[{ label: 'Edit', icon: Pencil, onClick: () => editor.edit(e) }, { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(e, e.title) }]} />} />
      )}

      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'Add expense' : 'Edit expense'} fields={fields(projects, categories)} initial={editor.editing}
        onSubmit={(v) => save(v, editor.isNew ? null : editor.editing.id)} />
      <Categories open={catOpen} onClose={() => setCatOpen(false)} onChange={() => { setCatKey((k) => k + 1); refresh(); }} />
    </>
  );
}
