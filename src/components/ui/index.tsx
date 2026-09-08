import { type ChangeEvent, type ReactNode } from 'react';

export function GlassCard({
  children,
  className = '',
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <div className={`${strong ? 'glass-strong' : 'glass'} glass-sheen ${className}`}>{children}</div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
      <h3 className="text-[13px] font-semibold tracking-wide uppercase" style={{ color: 'var(--text-secondary)' }}>
        {children}
      </h3>
      {right}
    </div>
  );
}

export function Button({
  children,
  onClick,
  active = false,
  tone = 'neutral',
  className = '',
  title,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  tone?: 'neutral' | 'accent' | 'danger';
  className?: string;
  title?: string;
  disabled?: boolean;
}) {
  const toneVar = tone === 'danger' ? '--danger' : '--accent';
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`press glass-sheen rounded-xl px-3 py-1.5 text-[13px] font-medium disabled:opacity-40 ${className}`}
      style={{
        background: active ? `var(${toneVar}-soft)` : 'var(--glass-bg)',
        border: `1px solid ${active ? `var(${toneVar})` : 'var(--glass-border-soft)'}`,
        color: active ? `var(${toneVar})` : 'var(--text-primary)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5 text-[13px]">
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="press relative h-[22px] w-[38px] shrink-0 rounded-full"
        style={{
          background: checked ? 'var(--accent)' : 'var(--glass-border)',
          border: '1px solid var(--glass-border-soft)',
        }}
      >
        <span
          className="absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm"
          style={{
            left: checked ? '19px' : '3px',
            transition: 'left 200ms cubic-bezier(0.2,0.8,0.2,1)',
          }}
        />
      </button>
    </label>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  unit,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  hint?: string;
}) {
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    const n = Number(e.target.value);
    if (!Number.isNaN(n)) onChange(n);
  };
  return (
    <label className="block py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        {unit && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      <input className="field tabular" type="number" value={value} step={step} min={min} max={max} onChange={handle} />
      {hint && (
        <p className="mt-1 text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
    </label>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  unit,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  unit?: string;
}) {
  return (
    <label className="block py-1.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        {unit && (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
      <select
        className="field"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const match = options.find((o) => String(o.value) === raw);
          if (match) onChange(match.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 block text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
      <input className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';
}) {
  const map = {
    neutral: ['var(--glass-bg-strong)', 'var(--text-secondary)'],
    ok: ['var(--ok-soft)', 'var(--ok)'],
    warn: ['var(--warn-soft)', 'var(--warn)'],
    danger: ['var(--danger-soft)', 'var(--danger)'],
    accent: ['var(--accent-soft)', 'var(--accent)'],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[11px] font-semibold whitespace-nowrap"
      style={{ background: bg, color: fg }}
    >
      {children}
    </span>
  );
}

/** One "description / value / unit / remark" row - the layout used all over the workbook. */
export function StatRow({
  label,
  value,
  unit,
  remark,
  emphasis = false,
  tone,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  remark?: string;
  emphasis?: boolean;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const color = tone ? `var(--${tone})` : emphasis ? 'var(--accent)' : 'var(--text-primary)';
  return (
    <div
      className="flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0"
      style={{ borderColor: 'var(--glass-border-soft)' }}
    >
      <div className="min-w-0">
        <div className={`text-[12.5px] ${emphasis ? 'font-semibold' : ''}`} style={{ color: 'var(--text-secondary)' }}>
          {label}
        </div>
        {remark && (
          <div className="text-[11px] leading-snug" style={{ color: 'var(--text-muted)' }}>
            {remark}
          </div>
        )}
      </div>
      <div className={`tabular shrink-0 text-right ${emphasis ? 'text-[15px] font-bold' : 'text-[13px] font-semibold'}`} style={{ color }}>
        {value}
        {unit && (
          <span className="ml-1 text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function NoteList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
      {items.map((n, i) => (
        <li key={i} className="flex gap-2">
          <span style={{ color: 'var(--accent)' }}>&#8226;</span>
          <span>{n}</span>
        </li>
      ))}
    </ul>
  );
}
