import { forwardRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Sparkles } from 'lucide-react';

// Mobile keeps the same letterspaced, uppercase voice as desktop, just tighter,
// so a two-word label never wraps onto a second line inside a grid card.
const BUTTON_CAPS = 'uppercase tracking-[0.06em] sm:tracking-[0.12em]';

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
      `bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] ${BUTTON_CAPS}`,
    secondary:
      `bg-[var(--color-surface-alt)] text-[var(--color-primary)] hover:bg-[var(--color-border)] ${BUTTON_CAPS}`,
    ghost: `bg-transparent border border-[var(--color-border)] text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] ${BUTTON_CAPS}`,
    link: `text-[var(--color-primary)] hover:underline p-0 bg-transparent ${BUTTON_CAPS}`,
    danger: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]',
  };

  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] font-medium leading-none transition duration-300 sm:min-h-11 sm:gap-2 sm:px-5 sm:py-3 sm:text-[13px] ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      ) : null}
      {children}
    </button>
  );
}

// `as` exists so a page can promote its own heading to the single <h1> a
// document is supposed to have, without changing how it looks — the size lives
// in the class, not in the tag.
export function SectionHeading({ eyebrow, title, description, action, as = 'h2' }) {
  const Heading = as;

  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="lux-label mb-2 text-[10px] sm:mb-3 sm:text-xs">{eyebrow}</p> : null}
        <Heading className="lux-heading text-2xl sm:text-4xl md:text-6xl">{title}</Heading>
        {description ? (
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-text-muted)] sm:mt-3 sm:text-sm md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ children, className = '' }) {
  return <div className={`lux-panel p-3 sm:p-6 ${className}`}>{children}</div>;
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
    <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold sm:px-3 sm:py-1 sm:text-xs ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, title, value, caption, detail }) {
  const heading = label ?? title;
  const subtext = caption ?? detail;

  return (
    <Panel className="min-h-[104px] sm:min-h-[140px]">
      <p className="lux-label mb-2.5 text-[10px] sm:mb-5 sm:text-xs">{heading}</p>
      <p className="text-3xl font-semibold leading-none text-[var(--color-primary)] sm:text-[2.75rem]">{value}</p>
      {subtext ? <p className="mt-2.5 text-xs text-[var(--color-text-muted)] sm:mt-4 sm:text-sm">{subtext}</p> : null}
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
    <label className="flex flex-col gap-1.5 text-[13px] sm:gap-2 sm:text-sm">
      {label ? <span className="text-[var(--color-text-muted)]">{label}</span> : null}
      <Tag
        ref={ref}
        className={`border border-[var(--color-border)] bg-transparent px-3 py-2 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] sm:px-4 sm:py-3 ${className}`}
        {...props}
      />
      {error ? <span className="text-[11px] text-[var(--color-primary)] sm:text-xs">{error}</span> : null}
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
    <label className="flex flex-col gap-1.5 text-[13px] sm:gap-2 sm:text-sm">
      {label ? <span className="text-[var(--color-text-muted)]">{label}</span> : null}
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={`w-full border border-[var(--color-border)] bg-transparent px-3 py-2 pr-11 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] sm:px-4 sm:py-3 sm:pr-12 ${className}`}
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
      {error ? <span className="text-[11px] text-[var(--color-primary)] sm:text-xs">{error}</span> : null}
    </label>
  );
});

export function EmptyState({ title, description, action }) {
  return (
    <Panel className="flex min-h-[180px] flex-col items-center justify-center text-center sm:min-h-[240px]">
      <Sparkles className="mb-3 h-6 w-6 text-[var(--color-accent)] sm:mb-4 sm:h-8 sm:w-8" />
      <h3 className="lux-heading text-xl sm:text-3xl">{title}</h3>
      <p className="mt-2 max-w-md text-[13px] text-[var(--color-text-muted)] sm:mt-3 sm:text-sm">{description}</p>
      {action ? <div className="mt-4 sm:mt-6">{action}</div> : null}
    </Panel>
  );
}

export function LoadingBlock({ label = 'Loading...' }) {
  return (
    <Panel className="flex min-h-[160px] items-center justify-center gap-3 text-[13px] text-[var(--color-text-muted)] sm:min-h-[240px] sm:text-base">
      <LoaderCircle className="h-4 w-4 animate-spin sm:h-5 sm:w-5" />
      <span>{label}</span>
    </Panel>
  );
}

export { WeightDisclaimerTrigger } from './WeightDisclaimerTrigger';

