import { forwardRef, useState } from 'react';
import { Eye, EyeOff, LoaderCircle, Sparkles, TriangleAlert, X } from 'lucide-react';
import { describeError } from '../../utils/errors';

// Mobile keeps the same letterspaced, uppercase voice as desktop, just tighter,
// so a two-word label never wraps onto a second line inside a grid card.
const BUTTON_CAPS = 'uppercase tracking-[0.06em] sm:tracking-[0.12em]';

export function Button({
  as = 'button',
  children,
  variant = 'primary',
  className = '',
  loading = false,
  icon: Icon,
  ...props
}) {
  const Tag = as;
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
    <Tag
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[11px] font-medium leading-none transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:gap-2 sm:px-5 sm:py-3 sm:text-[13px] ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="h-3.5 w-3.5 animate-spin sm:h-4 sm:w-4" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      ) : null}
      {children}
    </Tag>
  );
}

// `as` exists so a page can promote its own heading to the single <h1> a
// document is supposed to have, without changing how it looks — the size lives
// in the class, not in the tag.
// `compact` is the admin size: one short line, so the work starts near the top.
// On a phone the admin top bar already names the page, so the eyebrow goes.
export function SectionHeading({ eyebrow, title, description, action, as = 'h2', compact = false }) {
  const Heading = as;

  return (
    <div className={`flex flex-col gap-3 md:flex-row md:items-end md:justify-between ${compact ? 'mb-1 sm:mb-2' : 'mb-5 sm:mb-8 sm:gap-4'}`}>
      <div className="max-w-2xl">
        {eyebrow ? <p className={`lux-label mb-2 text-[11px] sm:mb-3 sm:text-xs ${compact ? 'max-lg:hidden' : ''}`}>{eyebrow}</p> : null}
        <Heading className={`lux-heading ${compact ? 'text-2xl sm:text-3xl' : 'text-2xl sm:text-4xl md:text-6xl'}`}>{title}</Heading>
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

/**
 * Phone-first modal sheet on a native <dialog>: focus trap, Escape and an inert
 * page for free. Open it with `ref.current.showModal()`. A tap on the backdrop
 * lands on the dialog element itself, which closes it.
 */
export function BottomSheet({ sheetRef, title, children, footer }) {
  return (
    <dialog
      ref={sheetRef}
      aria-label={title}
      onClick={(event) => event.target === event.currentTarget && event.currentTarget.close()}
      className="bottom-sheet mx-0 mb-0 mt-auto max-h-[88svh] w-full max-w-none flex-col border-t border-[var(--color-accent)]/40 bg-[var(--color-surface)] p-0 text-[var(--color-text)] backdrop:bg-[var(--scrim-veil)] open:flex sm:m-auto sm:max-w-lg sm:border"
    >
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] pl-4 pr-1">
        <p className="truncate font-serif text-xl text-[var(--color-primary)]">{title}</p>
        <button
          type="button"
          onClick={() => sheetRef.current?.close()}
          aria-label="Close"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">{children}</div>
      {footer ? <div className="safe-bottom-pad shrink-0 border-t border-[var(--color-border)] px-4 pt-3">{footer}</div> : null}
    </dialog>
  );
}

export function Panel({ children, className = '' }) {
  return <div className={`lux-panel p-3 sm:p-6 ${className}`}>{children}</div>;
}

export function StatCard({ label, title, value, caption, detail }) {
  const heading = label ?? title;
  const subtext = caption ?? detail;

  return (
    <Panel className="min-h-[104px] sm:min-h-[140px]">
      <p className="lux-label mb-2.5 text-[11px] sm:mb-5 sm:text-xs">{heading}</p>
      <p className="text-3xl font-semibold leading-none text-[var(--color-primary)] sm:text-[2.75rem]">{value}</p>
      {subtext ? <p className="mt-2.5 text-xs text-[var(--color-text-muted)] sm:mt-4 sm:text-sm">{subtext}</p> : null}
    </Panel>
  );
}

// Four tones from the brand palette, loudest where there is work to do: gold is
// waiting on someone, a crimson tint is under way, plain is done (the usual state
// of a product or buyer, so it stays quiet), and dashed muted has stopped.
const STATUS_TONES = {
  waiting: 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-text)]',
  moving: 'border-[var(--color-primary)]/25 bg-[var(--color-surface-alt)] text-[var(--color-primary)]',
  done: 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]',
  stopped: 'border-dashed border-[var(--color-border)] bg-transparent text-[var(--color-text-muted)]',
};

const STATUS_TONE = {
  Pending: 'waiting',
  Open: 'waiting',
  Reviewed: 'moving',
  Approved: 'moving',
  Processing: 'moving',
  Shipped: 'moving',
  Fulfilled: 'done',
  Resolved: 'done',
  Active: 'done',
  Inactive: 'stopped',
  Cancelled: 'stopped',
  Rejected: 'stopped',
  Disapproved: 'stopped',
};

// `tone` lets a status this map doesn't know (a blog post's "Needs review")
// borrow one of the four tones.
export function StatusBadge({ status, tone = STATUS_TONE[status] }) {
  const classes = STATUS_TONES[tone] ?? STATUS_TONES.moving;
  return (
    <span className={`inline-flex items-center whitespace-nowrap border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${classes}`}>
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
        className={`min-h-10 border border-[var(--color-border)] bg-transparent px-3 py-2 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] sm:px-4 sm:py-3 ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-[var(--color-primary)] sm:text-xs">{error}</span> : null}
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
          className={`min-h-10 w-full border border-[var(--color-border)] bg-transparent px-3 py-2 pr-11 text-[var(--color-text)] outline-none transition placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-border-active)] sm:px-4 sm:py-3 sm:pr-12 ${className}`}
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
      {error ? <span className="text-xs text-[var(--color-primary)] sm:text-xs">{error}</span> : null}
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

// What failed, in plain words, with the technical line underneath for support.
export function ErrorState({ error, onRetry, retrying = false }) {
  const { title, description, detail } = describeError(error);

  return (
    <Panel className="flex min-h-[180px] flex-col items-center justify-center text-center sm:min-h-[240px]">
      <div role="alert" className="flex flex-col items-center">
        <TriangleAlert className="mb-3 h-6 w-6 text-[var(--color-primary)] sm:mb-4 sm:h-8 sm:w-8" aria-hidden />
        <h3 className="lux-heading text-xl sm:text-3xl">{title}</h3>
        <p className="mt-2 max-w-md text-[13px] text-[var(--color-text-muted)] sm:mt-3 sm:text-sm">{description}</p>
      </div>
      <p className="mt-3 max-w-lg break-all font-mono text-[12px] text-[var(--color-text-muted)] sm:text-xs">{detail}</p>
      {onRetry ? (
        <div className="mt-4 sm:mt-6">
          <Button onClick={onRetry} loading={retrying}>Try again</Button>
        </div>
      ) : null}
    </Panel>
  );
}

// ErrorState as a whole page's content.
export function PageError(props) {
  return (
    <section className="page-shell section-gap">
      <ErrorState {...props} />
    </section>
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

