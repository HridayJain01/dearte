import { forwardRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Sparkles } from 'lucide-react';

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  icon: Icon,
  ...props
}) {
  const variants = {
    primary:
      'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] uppercase tracking-[0.12em]',
    secondary:
      'bg-[var(--color-surface-alt)] text-[var(--color-primary)] hover:bg-[var(--color-border)] uppercase tracking-[0.12em]',
    ghost: 'bg-transparent border border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] uppercase tracking-[0.12em]',
    link: 'text-[var(--color-primary)] hover:underline uppercase tracking-[0.12em] p-0 bg-transparent',
    danger: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  };

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2.5 text-[12px] font-medium transition duration-300 sm:px-5 sm:py-3 sm:text-[13px] ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="lux-label mb-3">{eyebrow}</p> : null}
        <h2 className="lux-heading text-3xl sm:text-4xl md:text-6xl">{title}</h2>
        {description ? <p className="mt-3 text-sm text-[var(--color-text-muted)] md:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <div className={`lux-panel p-4 sm:p-6 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-[var(--color-surface-alt)] text-[var(--color-text)]',
    success: 'bg-[var(--color-surface-alt)] text-[var(--color-primary)]',
    warning: 'bg-[var(--color-surface-alt)] text-[var(--color-accent)]',
    accent: 'bg-[var(--color-surface)] text-[var(--color-primary)] border border-[var(--color-border)]',
    lab: 'bg-[var(--color-surface-alt)] text-[var(--color-accent)]',
  };

  return (
    <span className={`inline-flex px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, title, value, caption, detail }) {
  const heading = label ?? title;
  const subtext = caption ?? detail;

  return (
    <Panel className="min-h-[140px]">
      <p className="lux-label mb-5">{heading}</p>
      <p className="text-[2.75rem] font-semibold leading-none text-[var(--color-primary)]">{value}</p>
      {subtext ? <p className="mt-4 text-sm text-[var(--color-text-muted)]">{subtext}</p> : null}
    </Panel>
  );
}

export function StatusBadge({ status }) {
  const map = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive: 'bg-gray-50 text-gray-500 border-gray-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    Reviewed: 'bg-sky-50 text-sky-700 border-sky-200',
    Approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Processing: 'bg-blue-50 text-blue-700 border-blue-200',
    Shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    Fulfilled: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  const classes = map[status] ?? 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)]';
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${classes}`}>
      {status}
    </span>
  );
}

export const Input = forwardRef(function Input(
  { label, error, as = 'input', className = '', ...props },
  ref,
) {
  const Tag = as;

  return (
    <label className="flex flex-col gap-2 text-sm">
      {label ? <span className="text-[var(--color-text-muted)]">{label}</span> : null}
      <Tag
        ref={ref}
        className={`border border-[var(--color-border)] bg-transparent px-4 py-3 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--color-primary)]">{error}</span> : null}
    </label>
  );
});

// Password field with a show/hide eye toggle. Forwards the ref to the <input>
// so it works with react-hook-form's register().
export const PasswordInput = forwardRef(function PasswordInput(
  { label, error, className = '', ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="flex flex-col gap-2 text-sm">
      {label ? <span className="text-[var(--color-text-muted)]">{label}</span> : null}
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`w-full border border-[var(--color-border)] bg-transparent px-4 py-3 pr-12 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] ${className}`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-[var(--color-text-muted)] transition hover:text-[var(--color-text)]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <span className="text-xs text-[var(--color-primary)]">{error}</span> : null}
    </label>
  );
});

export function EmptyState({ title, description, action }) {
  return (
    <Panel className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <Sparkles className="mb-4 h-8 w-8 text-[var(--color-accent)]" />
      <h3 className="lux-heading text-3xl">{title}</h3>
      <p className="mt-3 max-w-md text-sm text-[var(--color-text-muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Panel>
  );
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <Panel className="flex min-h-[240px] items-center justify-center gap-3 text-[var(--color-text-muted)]">
      <LoaderCircle className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </Panel>
  );
}
