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
import { t, tr } from '../i18n';

const langLabel = (v) => LANGUAGES.find((l) => l.value === v)?.label || v;

const fields = (categories) => [
  { name: 'title', label: t('Title'), required: true, placeholder: t('PDO connection helper') },
  { name: 'language', label: t('Language'), type: 'select', options: LANGUAGES, required: true, default: 'php' },
  { name: 'category', label: t('Category'), placeholder: t('Database, DevOps…'), hint: categories.length ? t('Existing: {list}', { list: categories.slice(0, 5).join(', ') }) : undefined },
  { name: 'tags', label: t('Tags'), placeholder: t('pdo, mysql'), hint: t('Comma-separated') },
  { name: 'description', label: t('Description'), type: 'textarea', span: 2, rows: 2 },
  { name: 'code', label: t('Code'), type: 'code', required: true, span: 2, rows: 14, placeholder: '// paste your code here' },
  { name: 'is_favorite', label: t('Favorite'), type: 'switch', switchLabel: t('Pin to favorites'), span: 2 },
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
      <button type="button" className="back-link link-btn snippet-back" onClick={onBack} style={{ color: 'var(--muted)' }}><ArrowLeft size={15} />{t('All snippets')}</button>
      <div className="card-head">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: 17 }}>{s.title}</h2>
          <div className="row-wrap" style={{ marginTop: 6 }}>
            <span className="lang-badge">{langLabel(s.language)}</span>
            {s.category && <span className="tag">{s.category}</span>}
            <span className="muted small">{t('{n} lines · updated {when}', { n: s.lines, when: timeAgo(s.updated_at) })}</span>
          </div>
        </div>
        <div className="snippet-actions">
          <Button size="sm" variant="primary" icon={copied ? Check : Copy} onClick={copy}>{copied ? t('Copied') : t('Copy')}</Button>
          <Button size="sm" iconOnly icon={Star} className={s.is_favorite ? 'fav-on' : ''} onClick={() => onFavorite(s)} aria-label={s.is_favorite ? t('Remove from favorites') : t('Add to favorites')} />
          <Button size="sm" iconOnly icon={Pencil} onClick={() => onEdit(s)} aria-label={t('Edit snippet')} />
          <Button size="sm" iconOnly icon={Trash2} onClick={() => onDelete(s)} aria-label={t('Delete snippet')} />
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
    try { const r = await post(`/snippets/${s.id}/favorite`); setData((all) => all.map((x) => (x.id === s.id ? r.data : x))); toast(r.data.is_favorite ? t('Added to favorites') : t('Removed from favorites')); } catch (e) { toast(e.message, 'error'); }
  };
  const del = async (s) => { if (await remove(s, s.title)) setSelectedId(null); };
  const languages = (meta?.meta?.languages || meta?.languages || []).map((l) => ({ value: l.language, label: `${langLabel(l.language)} (${l.n})` }));
  const categories = meta?.meta?.categories || meta?.categories || [];

  return (
    <>
      <PageHeader title={t('Code Library')} subtitle={t('Reusable snippets with syntax highlighting — search, tag and copy in one click.')}
        actions={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New snippet')}</Button>} />
      <Toolbar>
        <Segmented options={[{ value: 'all', label: t('All') }, { value: 'fav', label: t('Favorites'), icon: Star }]} value={fav} onChange={setFav} />
        <SearchInput value={q} onChange={setQ} placeholder={t('Search title, tags, code…')} />
        <Select value={language} onChange={(e) => setLanguage(e.target.value)} options={languages} placeholder={t('All languages')} aria-label={t('Language')} />
        {categories.length > 0 && <Select value={category} onChange={(e) => setCategory(e.target.value)} options={categories.map((c) => ({ value: c, label: c }))} placeholder={t('All categories')} aria-label={t('Category')} />}
      </Toolbar>
      {error ? <ErrorState error={error} onRetry={reload} /> : loading && !data ? <SkeletonCards count={2} h={300} /> : data.length === 0 ? (
        <EmptyState icon={Code2} title={t('No snippets')} text={q || language || fav !== 'all' ? t('Nothing matches these filters.') : t('Save commands, configs and code you reuse.')} action={<Button variant="primary" icon={Plus} onClick={() => editor.create()}>{t('New snippet')}</Button>} />
      ) : (
        <div className={`snippet-layout${selected ? ' has-selection' : ''}`}>
          <div className="snippet-list snippet-list-col">
            {data.map((s) => (
              <button key={s.id} type="button" className={`snippet-item${s.id === selectedId ? ' active' : ''}`} onClick={() => setSelectedId(s.id)}>
                <div className="snippet-item-head"><strong>{s.title}</strong>{s.is_favorite && <Star size={13} className="fav" />}</div>
                <div className="row-wrap"><span className="lang-badge">{langLabel(s.language)}</span>{s.category && <small>{s.category}</small>}<small>· {t('{n} lines', { n: s.lines })}</small></div>
              </button>
            ))}
          </div>
          {selected ? <Viewer s={selected} onBack={() => setSelectedId(null)} onEdit={editor.edit} onDelete={del} onFavorite={favorite} /> : <div className="snippet-view" />}
        </div>
      )}
      <FormModal open={editor.open} onClose={editor.close} title={editor.isNew ? t('New snippet') : t('Edit snippet')} fields={fields(categories)} initial={editor.editing} size="lg"
        onSubmit={async (v) => { const row = await save(v, editor.isNew ? null : editor.editing.id); if (row) setSelectedId(row.id); }} />
    </>
  );
}
