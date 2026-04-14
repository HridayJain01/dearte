import { forwardRef } from 'react';
import { LoaderCircle, Sparkles } from 'lucide-react';

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
      'bg-[var(--color-deep-ruby)] text-[var(--color-inner-bg)] hover:bg-[var(--color-rich-crimson)] uppercase tracking-[0.12em]',
    secondary:
      'bg-[var(--color-rose-petal)] text-[var(--color-heading)] hover:bg-[var(--color-dusty-rose)] uppercase tracking-[0.12em]',
    ghost: 'bg-[var(--color-primary-bg)] border border-[var(--color-border)] text-[var(--color-deep-ruby)] hover:bg-[var(--color-card-bg)] uppercase tracking-[0.12em]',
    link: 'text-[var(--color-rose-petal)] hover:underline uppercase tracking-[0.12em] p-0 bg-transparent',
    danger: 'bg-red-500/90 text-white hover:bg-red-400',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-medium transition duration-300 ${variants[variant]} ${className}`}
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
        <h2 className="lux-heading text-4xl md:text-6xl">{title}</h2>
        {description ? <p className="mt-3 text-sm text-[var(--color-muted)] md:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <div className={`lux-panel p-6 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-[var(--color-alt-bg)] text-[var(--color-body)]',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    accent: 'bg-[var(--color-card-bg)] text-[var(--color-deep-ruby)] border border-[var(--color-border)]',
    lab: 'bg-[var(--color-sage-bg)] text-[var(--color-sage)]',
  };

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, caption }) {
  return (
    <Panel className="min-h-[140px]">
      <p className="lux-label mb-6">{label}</p>
      <p className="text-4xl font-semibold">{value}</p>
      {caption ? <p className="mt-4 text-sm text-[var(--color-muted)]">{caption}</p> : null}
    </Panel>
  );
}

export const Input = forwardRef(function Input(
  { label, error, as = 'input', className = '', ...props },
  ref,
) {
  const Tag = as;

  return (
    <label className="flex flex-col gap-2 text-sm">
      {label ? <span className="text-[var(--color-muted)]">{label}</span> : null}
      <Tag
        ref={ref}
        className={`rounded-3xl border border-[var(--color-border)] bg-transparent px-4 py-3 text-[var(--color-heading)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-rose-petal)] ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-rose-200">{error}</span> : null}
    </label>
  );
});

export function EmptyState({ title, description, action }) {
  return (
    <Panel className="flex min-h-[240px] flex-col items-center justify-center text-center">
      <Sparkles className="mb-4 h-8 w-8 text-[var(--color-rose-petal)]" />
      <h3 className="lux-heading text-3xl">{title}</h3>
      <p className="mt-3 max-w-md text-sm text-[var(--color-muted)]">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </Panel>
  );
}

export function LoadingBlock({ label = 'Loading DeArte experience...' }) {
  return (
    <Panel className="flex min-h-[240px] items-center justify-center gap-3 text-[var(--color-muted)]">
      <LoaderCircle className="h-5 w-5 animate-spin" />
      <span>{label}</span>
    </Panel>
  );
}
