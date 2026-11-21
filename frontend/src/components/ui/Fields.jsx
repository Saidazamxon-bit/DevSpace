import { Check, ChevronDown } from 'lucide-react';

export function Field({ label, error, hint, children, span, required, htmlFor }) {
  return (
    <div className={`field${span === 2 ? ' span-2' : ''}${error ? ' has-error' : ''}`}>
      {label && <label htmlFor={htmlFor}>{label}{required && <span className="req">*</span>}</label>}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function Input(props) {
  return <input className="input" {...props} />;
}

export function Textarea({ mono, ...props }) {
  return <textarea className={`input textarea${mono ? ' mono' : ''}`} {...props} />;
}

export function Select({ options = [], placeholder, className = '', ...props }) {
  return (
    <div className={`select-wrap ${className}`}>
      <select className="input select" {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={16} className="select-caret" />
    </div>
  );
}

export function Switch({ checked, onChange, label, id }) {
  return (
    <label className="switch" htmlFor={id}>
      <input id={id} type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track"><span className="switch-thumb" /></span>
      {label && <span className="switch-label">{label}</span>}
    </label>
  );
}

export function ColorPicker({ value, onChange, colors }) {
  return (
    <div className="swatches">
      {colors.map((c) => (
        <button type="button" key={c} className={`swatch${value === c ? ' active' : ''}`} style={{ background: c }} onClick={() => onChange(value === c ? '' : c)} aria-label={`Color ${c}`}>
          {value === c && <Check size={14} />}
        </button>
      ))}
    </div>
  );
}

export function ChipSelect({ options, value = [], onChange }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  if (!options.length) return <p className="field-hint">Nothing to select yet.</p>;
  return (
    <div className="chip-select">
      {options.map((o) => (
        <button type="button" key={o.value} className={`chip${value.includes(o.value) ? ' active' : ''}`} onClick={() => toggle(o.value)}>
          {value.includes(o.value) && <Check size={13} />}{o.label}
        </button>
      ))}
    </div>
  );
}
