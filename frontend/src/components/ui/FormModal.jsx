import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { ChipSelect, ColorPicker, Field, Input, Select, Switch, Textarea } from './Fields';
import { useUI } from '../../context/UIContext';
import { t } from '../../i18n';

/**
 * Generic create/edit form driven by a field schema:
 *  { name, label, type: text|textarea|select|date|time|number|url|email|password|color|switch|chips|code,
 *    required, options, span, placeholder, hint, min, max, step, show(values) }
 */
function clientValidate(fields, values) {
  const errors = {};
  for (const f of fields) {
    if (f.show && !f.show(values)) continue;
    const v = values[f.name];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (f.required && empty) { errors[f.name] = t('{label} is required.', { label: f.label }); continue; }
    if (empty) continue;
    if (f.type === 'url' && !/^https?:\/\/[^\s.]+\.[^\s]+/i.test(v) && !/^https?:\/\/(localhost|\d+\.\d+\.\d+\.\d+)/i.test(v)) errors[f.name] = t('Enter a valid URL starting with http:// or https://');
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[f.name] = t('Enter a valid email address.');
    if (f.type === 'number' && (Number.isNaN(Number(v)) || (f.min !== undefined && Number(v) < f.min))) errors[f.name] = f.min !== undefined ? t('Must be a number ≥ {min}.', { min: f.min }) : t('Must be a number.');
    if (f.maxLength && String(v).length > f.maxLength) errors[f.name] = t('Maximum {n} characters.', { n: f.maxLength });
    if (f.validate) { const msg = f.validate(v, values); if (msg) errors[f.name] = msg; }
  }
  return errors;
}

export default function FormModal({ open, onClose, title, subtitle, fields, initial, onSubmit, submitLabel = t('Save'), size = 'md' }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const { toast } = useUI();

  useEffect(() => {
    if (!open) return;
    const v = {};
    fields.forEach((f) => {
      const raw = initial?.[f.name];
      v[f.name] = raw ?? f.default ?? (f.type === 'switch' ? false : f.type === 'chips' ? [] : '');
      if (typeof v[f.name] === 'number' && f.type === 'select') v[f.name] = String(v[f.name]);
    });
    setValues(v);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (name, value) => {
    setValues((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((e) => ({ ...e, [name]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = clientValidate(fields, values);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {};
      fields.forEach((f) => {
        if (f.show && !f.show(values)) { payload[f.name] = f.type === 'switch' ? false : null; return; }
        let v = values[f.name];
        if (v === '') v = null;
        if (f.type === 'number' && v !== null) v = Number(v);
        payload[f.name] = v;
      });
      await onSubmit(payload);
      onClose();
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const render = (f) => {
    const common = { id: `f-${f.name}`, name: f.name, value: values[f.name] ?? '', placeholder: f.placeholder, onChange: (e) => set(f.name, e.target.value) };
    switch (f.type) {
      case 'textarea': return <Textarea rows={f.rows || 3} {...common} />;
      case 'code': return <Textarea rows={f.rows || 12} mono spellCheck={false} {...common} />;
      case 'select': return <Select options={f.options} placeholder={f.placeholder ?? (f.required ? undefined : '—')} {...common} />;
      case 'switch': return <Switch id={common.id} checked={values[f.name]} onChange={(v) => set(f.name, v)} label={f.switchLabel} />;
      case 'color': return <ColorPicker value={values[f.name]} onChange={(v) => set(f.name, v)} colors={f.colors} />;
      case 'chips': return <ChipSelect options={f.options} value={values[f.name] || []} onChange={(v) => set(f.name, v)} />;
      case 'number': return <Input type="number" inputMode="decimal" step={f.step ?? 'any'} min={f.min} {...common} />;
      default: return <Input type={f.type || 'text'} autoComplete={f.type === 'password' ? 'new-password' : 'off'} {...common} />;
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} subtitle={subtitle} size={size}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose}>{t('Cancel')}</Button>
          <Button variant="primary" type="submit" form="resource-form" loading={saving}>{submitLabel}</Button>
        </>
      )}>
      <form id="resource-form" className="form-grid" onSubmit={submit} noValidate>
        {fields.filter((f) => !f.show || f.show(values)).map((f) => (
          <Field key={f.name} label={f.type === 'switch' && f.switchLabel ? null : f.label} htmlFor={`f-${f.name}`} error={errors[f.name]} hint={f.hint} span={f.span} required={f.required}>
            {render(f)}
          </Field>
        ))}
      </form>
    </Modal>
  );
}
