import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { del, get, post, put } from '../api/client';
import { useUI } from '../context/UIContext';
import { t } from '../i18n';

/** Shared create / update / delete helpers with toasts + confirmation. */
export function useCrud(base, { entity = 'item', onChange } = {}) {
  const { toast, confirm } = useUI();

  const save = useCallback(async (values, id) => {
    const res = id ? await put(`${base}/${id}`, values) : await post(base, values);
    toast(id ? t(`${cap(entity)} updated`) : t(`${cap(entity)} created`));
    onChange?.();
    return res.data;
  }, [base, entity, onChange, toast]);

  const remove = useCallback(async (row, label) => {
    const ok = await confirm({
      title: t(`Delete ${entity}?`),
      message: t('“{label}” will be permanently deleted. This can’t be undone.', { label }),
      confirmLabel: t('Delete'),
      danger: true,
    });
    if (!ok) return false;
    try {
      await del(`${base}/${row.id}`);
      toast(t(`${cap(entity)} deleted`));
      onChange?.();
      return true;
    } catch (e) {
      toast(e.message, 'error');
      return false;
    }
  }, [base, entity, onChange, confirm, toast]);

  return { save, remove };
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Modal state for create/edit, auto-opening when the URL contains ?new=1 (Quick add). */
export function useEditor() {
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null); // null = closed, {} = new, row = edit
  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing({});
      params.delete('new');
      setParams(params, { replace: true });
    }
  }, [params, setParams]);
  return {
    editing,
    open: !!editing,
    create: (defaults = {}) => setEditing({ ...defaults, __new: true }),
    edit: (row) => setEditing(row),
    close: () => setEditing(null),
    isNew: !!editing && (editing.__new || !editing.id),
  };
}

/** Cached option lists for project / server / category selects. */
const cache = {};
export function useOptions(path, map, refreshKey = 0) {
  const [opts, setOpts] = useState(cache[path] || []);
  useEffect(() => {
    let alive = true;
    get(path).then((r) => {
      const o = r.data.map(map);
      cache[path] = o;
      if (alive) setOpts(o);
    }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, refreshKey]);
  return opts;
}

export const useProjectOptions = () => useOptions('/projects', (p) => ({ value: String(p.id), label: p.name, color: p.color }));
