import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Code2, Copy, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { useApi, useDebounce } from '../hooks/useApi';
import { useCrud, useEditor } from '../hooks/useCrud';
import { post } from '../api/client';
import { useUI } from '../context/UIContext';
import Button from '../components/ui/Button';
import FormModal from '../components/ui/FormModal';
import { Select } from '../components/ui/Fields';
import { EmptyState, ErrorState, PageHeader, SearchInput, Segmented, SkeletonCards, Tags, Toolbar } from '../components/ui/Misc';
import { LANGUAGES } from '../lib/constants';
import { splitList, timeAgo } from '../lib/format';
import { highlight } from '../lib/highlight';

const langLabel = (v) => LANGUAGES.find((l) => l.value === v)?.label || v;

const fields = (categories) => [
  { name: 'title', label: 'Title', required: true, placeholder: 'PDO connection helper' },
  { name: 'language', label: 'Language', type: 'select', options: LANGUAGES, required: true, default: 'php' },
  { name: 'category', label: 'Category', placeholder: 'Database, DevOps…', hint: categories.length ? `Existing: ${categories.slice(0, 5).join(', ')}` : undefined },
  { name: 'tags', label: 'Tags', placeholder: 'pdo, mysql', hint: 'Comma-separated' },
  { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 2 },
  { name: 'code', label: 'Code', type: 'code', required: true, span: 2, rows: 14, placeholder: '// paste your code here' },
  { name: 'is_favorite', label: 'Favorite', type: 'switch', switchLabel: 'Pin to favorites', span: 2 },
];

function Viewer({ s, onBack, onEdit, onDelete, onFavorite }) {
  const { toast } = useUI();
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(s.code, s.language), [s.code, s.language]);
  const copy = async () => {
    try { await navigator.clipboard.writeText(s.code); setCopied(true); toast('Copied to clipboard'); setTimeout(() => setCopied(false), 1600); } catch { toast('Clipboard unavailable', 'error'); }
  };
  return (
    <section className="card snippet-view">
      <button type="button" className="back-link link-btn snippet-back" onClick={onBack} style={{ color: 'var(--muted)' }}><ArrowLeft size={15} />All snippets</button>
      <div className="card-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: 17 }}>{s.title}</h2>
          <div className="row-wrap" style={{ marginTop: 6 }}>
            <span className="lang-badge">{langLabel(s.language)}</span>
            {s.category && <span className="tag">{s.category}</span>}
            <span className="muted small">{s.lines} lines · updated {timeAgo(s.updated_at)}</span>
          </div>
        </div>
        <div className="snippet-actions">
          <Button size="sm" variant="primary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
          <Button size="sm" iconOnly icon={Star} className={s.is_favorite ? 'fav-on' : ''} onClick={() => onFavorite(s)} aria-label={s.is_favorite ? 'Remove from favorites' : 'Add to favorites'} />
          <Button size="sm" iconOnly icon={Pencil} onClick={() => onEdit(s)} aria-label="Edit snippet" />
          <Button size="sm" iconOnly icon={Trash2} onClick={() => onDelete(s)} aria-label="Delete snippet" />
        </div>
      </div>
      {s.description && <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>{s.description}</p>}
      <div className="code-block"><pre><code className="hljs" dangerouslySetInnerHTML={{ __html: html }} /></pre></div>
      <div style={{ marginTop: 12 }}><Tags items={splitList(s.tags)} max={12} /></div>
    </section>
  );
}

export default function Snippets() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState('');
  const [language, setLanguage] = useState('');
  const [category, setCategory] = useState('');
  const [fav, setFav] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const dq = useDebounce(q);
  const { data, meta, setData, loading, error, reload } = useApi('/snippets', { q: dq, language, category, favorite: fav === 'fav' ? '1' : undefined, sort: 'updated' });
  const editor = useEditor();
  const { toast } = useUI();
  const { save, remove } = useCrud('/snippets', { entity: 'snippet', onChange: () => reload({ silent: true }) });

  useEffect(() => {
    const open = params.get('open');
    if (open) { setSelectedId(Number(open)); params.delete('open'); setParams(params, { replace: true }); }
  }, [params, setParams]);

  const isDesktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 900px)').matches;
  useEffect(() => {
    if (isDesktop && data?.length && !data.find((x) => x.id === selectedId)) setSelectedId(data[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const selected = data?.find((x) => x.id === selectedId) || null;
  const favorite = async (s) => {
    try { const r = await post(`/snippets/${s.id}/favorite`); setData((all) => all.map((x) => (x.id === s.id ? r.data : x))); toast(r.data.is_favorite ? 'Added to favorites' : 'Removed from favorites'); } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (s) => { if (await remove(s, s.title)) setSelectedId(null); };
  const languages = (meta?.meta?.languages || meta?.languages || []).map((l) => ({ value: l.language, label: `${langLabel(l.language)} (${l.n})` }));
  const categories = meta?.meta?.categories || meta?.categories || [];

  return (
    <>
      <PageHeader title="Code Library" subtitle="Reusable snippets with syntax highlighting — search, tag and copy in one click."
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>New snippet</Button>} />
      <Toolbar>
        <Segmented options={[{ value: 'all', label: 'All' }, { value: 'fav', label: 'Favorites', icon: Star }]} value={fav} onChange={setFav} />
        <SearchInput value={q} onChange={setQ} placeholder="Search title, tags, code…" />
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} options={languages} placeholder="All languages" aria-label="Language" />
        {categories.length > 0 && <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} placeholder="All categories" aria-label="Category" />}
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={2} h={300} /> : data.length === 0 ? (
        <EmptyState icon={Code2} title="No snippets" text={q || language || fav !== 'all' ? 'Nothing matches these filters.' : 'Save commands, configs and code you reuse.'} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>New snippet</Button>} />
      ) : (
        <div className={`snippet-layout${selected ? ' has-selection' : ''}`}>
          <div className="snippet-list snippet-list-col">
            {data.map((s) => (
              <button key={s.id} type="button" className={`snippet-item${s.id === selectedId ? ' active' : ''}`} onClick={() => setSelectedId(s.id)}>
                <div className="snippet-item-head"><strong>{s.title}</strong>{s.is_favorite && <Star size={13} className="fav" />}</div>
                <div className="row-wrap"><span className="lang-badge">{langLabel(s.language)}</span>{s.category && <small>{s.category}</small>}<small>· {s.lines} lines</small></div>
              </button>
            ))}
          </div>
          {selected ? <Viewer s={selected} onBack={() => setSelectedId(null)} onEdit={editor.edit} onDelete={del} onFavorite={favorite} /> : <div className="snippet-view" />}
        </div>
      )}
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? 'New snippet' : 'Edit snippet'} fields={fields(categories)} initial={editor.editing} size="lg"
        onSubmit={async (v) => { const row = await save(v, editor.isNew ? null : editor.editing.id); if (row) setSelectedId(row.id); }} />
    </>
  );
}
