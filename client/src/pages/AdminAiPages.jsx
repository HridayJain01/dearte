import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, Play, Plus, RefreshCw, Sparkles, Trash2, X } from 'lucide-react';
import { Button, ErrorState, LoadingBlock, Panel, SectionHeading } from '../components/ui/Primitives';
import { aiErrorMessage, aiService } from '../services/aiService';
import { adminService } from '../services/adminService';
import { cdnImage } from '../utils/formatters';

// Kept local rather than imported from AdminPages.jsx: that module carries the
// spreadsheet importer (xlsx), which this page has no use for.
const inputClass =
  'w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-active)]';

function Field({ label, hint, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      {children}
      {hint ? <span className="text-xs text-[var(--color-text-muted)]">{hint}</span> : null}
    </label>
  );
}

function Check({ label, hint, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="font-medium text-[var(--color-text)]">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">{hint}</span> : null}
      </span>
    </label>
  );
}

function Pill({ ok, children }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] ${ok
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}
    >
      {ok ? '✓' : '—'} {children}
    </span>
  );
}

function SimpleTable({ columns, rows, empty = 'Nothing yet.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="py-2.5 pl-2 pr-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-sm text-[var(--color-text-muted)]">{empty}</td>
            </tr>
          ) : rows.map((row, index) => (
            <tr key={row.id || row._id || index} className="border-b border-[var(--color-border)] align-top">
              {columns.map((column) => (
                <td key={column.key} className="py-3 pl-2 pr-4">
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const formatWhen = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const FEATURES = [
  {
    key: 'smartSearch',
    label: 'Plain-language search',
    detail: 'A ✨ button on the products page turns a sentence like “rose gold bridal sets under 8 g” into filters.',
  },
  {
    key: 'photoSearch',
    label: 'Shop by photo',
    detail: 'A camera button on the products page. Signed-in buyers upload a photo and see the closest styles. Works best once the photo index below has run.',
  },
  {
    key: 'restock',
    label: 'Restock suggestions',
    detail: 'A “Time to restock” panel on the buyer’s account page, worked out from their own orders. Needs no AI key.',
  },
  {
    key: 'catalogueBuilder',
    label: 'AI catalogue builder',
    detail: 'On the Catalogues page: a buyer describes a lookbook, edits the picks and downloads a PDF.',
  },
];

const MODES = [
  { value: 'off', label: 'Off' },
  { value: 'staff', label: 'Staff preview (admin + sales)' },
  { value: 'everyone', label: 'Everyone' },
];

const SETUP = [
  { key: 'text', label: 'AI key + text model' },
  { key: 'vision', label: 'Vision model' },
  { key: 'pexels', label: 'Pexels key' },
  { key: 'deployHook', label: 'Deploy hook' },
  { key: 'cron', label: 'Cron secret' },
  { key: 'email', label: 'Email' },
];

function BannerCopyPanel({ enabled }) {
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [creating, setCreating] = useState(-1);

  const generate = async () => {
    setBusy(true);
    try {
      setResult(await aiService.bannerCopy(goal));
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not write copy right now.'));
    } finally {
      setBusy(false);
    }
  };

  // Always inactive: it needs an image, and going live stays a human decision.
  const create = async (banner, index) => {
    setCreating(index);
    try {
      await adminService.createBanner({ ...banner, active: false });
      toast.success('Created as an inactive banner. Add an image in Promotions, then switch it on.');
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not create the banner.'));
    } finally {
      setCreating(-1);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied. Paste it into Configuration → Announcement bar.');
    } catch {
      toast.error('Could not copy; select the text instead.');
    }
  };

  return (
    <Panel className="space-y-4">
      <p className="lux-label">Banner and announcement copy</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Brief (optional)" hint="Numbers and dates only appear if they are in the brief.">
            <input className={inputClass} value={goal} maxLength={300} placeholder="e.g. Diwali trade orders close 15 October; focus on earrings" onChange={(event) => setGoal(event.target.value)} />
          </Field>
        </div>
        <Button icon={Sparkles} loading={busy} disabled={!enabled} onClick={generate}>Write copy</Button>
      </div>
      {result ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {result.banners.length ? result.banners.map((banner, index) => (
              <div key={index} className="border border-[var(--color-border)] p-3">
                <p className="font-medium text-[var(--color-primary)]">{banner.title}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{banner.subtitle}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Button: {banner.ctaLabel} → {banner.ctaLink}</p>
                <Button variant="ghost" className="mt-2" loading={creating === index} onClick={() => create(banner, index)}>Create as inactive banner</Button>
              </div>
            )) : <p className="text-sm text-[var(--color-text-muted)]">No banner passed the checks. Try again or change the brief.</p>}
          </div>
          <div className="space-y-2">
            {result.announcements.map((line, index) => (
              <div key={index} className="flex items-center justify-between gap-3 border border-[var(--color-border)] p-3 text-sm">
                <span>{line}</span>
                <Button variant="ghost" onClick={() => copy(line)}>Copy</Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

const EXAMPLE_QUESTIONS = [
  'Which 10 styles sold the most pieces in the last 90 days?',
  'How have earrings sold month by month this year?',
  'Which buyers have not ordered in the last 60 days?',
  'Which active styles have not sold since July?',
  'What is the metal colour and karat mix this quarter?',
  'How many orders were cancelled or rejected last month?',
];

// Plain CSS bars; the table under it carries the same figures for screen readers.
function BarChart({ rows, label, value }) {
  const bars = rows.slice(0, 12);
  const max = Math.max(1, ...bars.map((row) => Number(row[value]) || 0));
  return (
    <div className="space-y-1.5" aria-hidden>
      {bars.map((row, index) => (
        <div key={index} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-xs sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
          <span className="truncate text-[var(--color-text-muted)]" title={String(row[label])}>{row[label]}</span>
          <div className="h-3 bg-[var(--color-surface-alt)]">
            <div className="h-3 bg-[var(--color-primary)]" style={{ width: `${((Number(row[value]) || 0) / max) * 100}%` }} />
          </div>
          <span className="tabular-nums">{row[value]}</span>
        </div>
      ))}
    </div>
  );
}

function AskPanel({ enabled }) {
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const ask = async (text) => {
    const asked = text.trim();
    if (asked.length < 4) return;
    setQuestion(asked);
    setBusy(true);
    try {
      setResult(await aiService.ask(asked));
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not answer that right now.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="space-y-4">
      <p className="lux-label">Ask your data</p>
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
      >
        <div className="flex-1">
          <Field label="Question about orders, styles or buyers" hint="Answered from fixed reports over your orders. Buyer names are never sent to the AI service.">
            <input className={inputClass} value={question} maxLength={300} placeholder="e.g. Which 10 styles sold the most pieces in the last 90 days?" onChange={(event) => setQuestion(event.target.value)} />
          </Field>
        </div>
        <Button type="submit" icon={Sparkles} loading={busy} disabled={!enabled || busy || question.trim().length < 4}>Ask</Button>
      </form>
      <div className="flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((example) => (
          <button
            key={example}
            type="button"
            disabled={!enabled || busy}
            onClick={() => ask(example)}
            className="border border-[var(--color-border)] px-2.5 py-1 text-left text-xs text-[var(--color-text-muted)] transition hover:border-[var(--color-border-active)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {example}
          </button>
        ))}
      </div>
      {result ? (
        <div className="space-y-4 border-t border-[var(--color-border)] pt-4">
          <p className="text-sm leading-6 text-[var(--color-text)]">{result.answer}</p>
          {result.report ? (
            <>
              <p className="text-xs text-[var(--color-text-muted)]">
                {result.title} · {result.period}{result.category ? ` · ${result.category}` : ''}
              </p>
              {result.chart && result.rows.length ? <BarChart rows={result.rows} label={result.chart.label} value={result.chart.value} /> : null}
              <SimpleTable columns={result.columns} rows={result.rows} empty="No orders match." />
            </>
          ) : null}
        </div>
      ) : null}
    </Panel>
  );
}

export function AdminAiStudioPage() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['admin-ai-status'], queryFn: aiService.status });
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [indexing, setIndexing] = useState(false);

  if (status.isLoading) return <LoadingBlock label="Loading AI Studio..." />;
  if (status.isLoadingError) {
    return <ErrorState error={status.error} onRetry={status.refetch} retrying={status.isFetching} />;
  }

  const data = status.data;
  const settings = draft || data.settings;
  const update = (mutate) =>
    setDraft((current) => {
      const next = structuredClone(current || data.settings);
      mutate(next);
      return next;
    });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-ai-status'] });
    queryClient.invalidateQueries({ queryKey: ['ai-features'] });
  };

  const save = async () => {
    setSaving(true);
    try {
      // Blog settings are saved from the Blog page; sending only these keeps
      // the two pages from overwriting each other.
      await aiService.saveSettings({ features: settings.features, photoIndex: settings.photoIndex, nudges: settings.nudges });
      toast.success('AI settings saved');
      setDraft(null);
      refresh();
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not save the settings.'));
    } finally {
      setSaving(false);
    }
  };

  const runPhotoIndex = async () => {
    setIndexing(true);
    try {
      const run = await aiService.runPhotoIndex();
      if (run.ok) toast.success(run.summary || 'Photo index updated');
      else toast.error(run.error || 'The photo index run failed.');
      refresh();
    } catch (error) {
      toast.error(aiErrorMessage(error, 'Could not run the photo index.'));
    } finally {
      setIndexing(false);
    }
  };

  const { configured } = data;
  const progress = data.photoIndex.total
    ? Math.round((data.photoIndex.indexed / data.photoIndex.total) * 100)
    : 0;

  return (
    <div className="space-y-5 sm:space-y-8">
      <SectionHeading
        eyebrow="AI Studio"
        title="AI features and automation"
        description="Every feature starts as a staff preview. Try it on the live site signed in as admin, then switch it to Everyone."
      />

      <Panel className="space-y-4">
        <p className="lux-label">Setup</p>
        <div className="flex flex-wrap gap-2">
          {SETUP.map((item) => <Pill key={item.key} ok={configured[item.key]}>{item.label}</Pill>)}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          Keys are set as environment variables on the API project in Vercel (see docs/ai.md), never here.
          {data.models.text ? ` Text model: ${data.models.text}.` : ''}
          {data.models.vision ? ` Vision model: ${data.models.vision}.` : ''}
        </p>
      </Panel>

      <Panel className="space-y-5">
        <p className="lux-label">Buyer features</p>
        <div className="grid gap-5 lg:grid-cols-2">
          {FEATURES.map((feature) => (
            <Field key={feature.key} label={feature.label} hint={feature.detail}>
              <select
                className={inputClass}
                value={settings.features[feature.key]}
                onChange={(event) => update((next) => { next.features[feature.key] = event.target.value; })}
              >
                {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
              </select>
            </Field>
          ))}
        </div>
      </Panel>

      <Panel className="space-y-5">
        <p className="lux-label">Scheduled jobs</p>
        <div className="space-y-3">
          <Check
            label="Photo index (five short runs a night, between 00:30 and 07:30 IST)"
            hint="Tags each style's main photo so Shop by photo can match designs; about 20 styles a night on the free AI plan. Stored separately; product records are never changed."
            checked={settings.photoIndex.enabled}
            onChange={(value) => update((next) => { next.photoIndex.enabled = value; })}
          />
          <div className="flex flex-wrap items-center gap-3 pl-7">
            <div className="h-2 w-48 bg-[var(--color-surface-alt)]" aria-hidden>
              <div className="h-2 bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-[var(--color-text-muted)]">
              {data.photoIndex.indexed} of {data.photoIndex.total} active styles indexed
            </span>
            <Button variant="ghost" icon={Play} loading={indexing} disabled={!configured.vision} onClick={runPhotoIndex}>
              Run a batch now
            </Button>
          </div>
        </div>
        <Check
          label="Restock reminder emails (Mondays)"
          hint="Emails a buyer only about styles that came due for reorder in the past week. Needs email configured."
          checked={settings.nudges.enabled}
          onChange={(value) => update((next) => { next.nudges.enabled = value; })}
        />
        <p className="text-xs text-[var(--color-text-muted)]">The blog has its own page: Admin → Blog.</p>
      </Panel>

      <div className="flex flex-wrap gap-3">
        <Button onClick={save} loading={saving} disabled={!draft}>Save settings</Button>
        {draft ? <Button variant="ghost" onClick={() => setDraft(null)}>Discard changes</Button> : null}
      </div>

      <AskPanel enabled={configured.text} />

      <BannerCopyPanel enabled={configured.text} />

      <Panel className="space-y-4">
        <p className="lux-label">Recent runs</p>
        <SimpleTable
          columns={[
            { key: 'job', label: 'Job' },
            { key: 'trigger', label: 'Started by' },
            { key: 'startedAt', label: 'When', render: (value) => formatWhen(value) },
            {
              key: 'ok',
              label: 'Result',
              render: (value, row) => (
                <span className={value ? 'text-emerald-700' : 'text-[var(--color-primary)]'}>
                  {value ? row.summary : row.error || (row.finishedAt ? 'Failed' : 'Running…')}
                </span>
              ),
            },
          ]}
          rows={data.runs}
          empty="No jobs have run yet."
        />
      </Panel>
    </div>
  );
}

const POST_STATUS = {
  published: { label: 'Published', className: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  draft: { label: 'Draft', className: 'border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]' },
  needs_review: { label: 'Needs review', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  unpublished: { label: 'Unpublished', className: 'border-gray-200 bg-gray-50 text-gray-500' },
};

function PostStatus({ status }) {
  const style = POST_STATUS[status] || POST_STATUS.draft;
  return (
    <span className={`inline-flex whitespace-nowrap border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${style.className}`}>
      {style.label}
    </span>
  );
}

// The whole draft, as it will read on the site, for a decision before publishing.
function PostPreview({ post, onClose }) {
  return (
    <Panel className="space-y-4 border-[var(--color-border-active)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="lux-label">Preview · {POST_STATUS[post.status]?.label}</p>
          <h3 className="lux-heading mt-2 text-2xl sm:text-3xl">{post.title}</h3>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">Search snippet: {post.metaDescription}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close preview" className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]">
          <X className="h-5 w-5" />
        </button>
      </div>
      {post.quality?.issues?.length ? (
        <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Checks and reviewer notes{post.quality.score ? ` (score ${post.quality.score}/10)` : ' (not reviewed)'}</p>
          <ul className="mt-1 list-disc pl-5">
            {post.quality.issues.map((issue, index) => <li key={index}>{issue}</li>)}
          </ul>
        </div>
      ) : null}
      {post.coverImage?.secureUrl ? (
        <img src={cdnImage(post.coverImage.secureUrl, 1200)} alt={post.coverImage.alt || ''} className="max-h-64 w-full border border-[var(--color-border)] object-contain" />
      ) : null}
      <p className="text-base leading-7">{post.excerpt}</p>
      {post.sections.map((section, index) => (
        <div key={index}>
          <h4 className="text-lg font-semibold text-[var(--color-primary)]">{section.heading}</h4>
          {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="mt-2 text-sm leading-6">{paragraph}</p>)}
          {section.bullets.length ? (
            <ul className="mt-2 list-disc pl-5 text-sm leading-6">
              {section.bullets.map((bullet, bulletIndex) => <li key={bulletIndex}>{bullet}</li>)}
            </ul>
          ) : null}
        </div>
      ))}
      {post.faq.length ? (
        <div>
          <h4 className="text-lg font-semibold text-[var(--color-primary)]">FAQ</h4>
          {post.faq.map((entry, index) => (
            <p key={index} className="mt-2 text-sm leading-6"><strong>{entry.question}</strong> {entry.answer}</p>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

const emptyTopic = { title: '', angle: '', category: '', occasion: '' };

export function AdminBlogPage() {
  const queryClient = useQueryClient();
  const status = useQuery({ queryKey: ['admin-ai-status'], queryFn: aiService.status });
  const posts = useQuery({ queryKey: ['admin-blog-posts'], queryFn: aiService.adminPosts });
  // Two drafts, so saving one panel never discards edits in the other.
  const [autopilot, setAutopilot] = useState(null);
  const [queueDraft, setQueueDraft] = useState(null);
  const [topicForm, setTopicForm] = useState(emptyTopic);
  const [busy, setBusy] = useState('');
  const [previewId, setPreviewId] = useState(null);

  if (status.isLoading || posts.isLoading) return <LoadingBlock label="Loading the blog..." />;
  if (status.isLoadingError) return <ErrorState error={status.error} onRetry={status.refetch} retrying={status.isFetching} />;
  if (posts.isLoadingError) return <ErrorState error={posts.error} onRetry={posts.refetch} retrying={posts.isFetching} />;

  const saved = status.data.settings.blog;
  const blog = { ...saved, ...(autopilot || {}) };
  const setBlog = (patch) => setAutopilot({ ...(autopilot || {}), ...patch });
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-ai-status'] });
    queryClient.invalidateQueries({ queryKey: ['admin-blog-posts'] });
    queryClient.invalidateQueries({ queryKey: ['blog'] });
  };

  // One helper for every button: shows its spinner, reports the outcome.
  const act = async (key, work, success) => {
    setBusy(key);
    try {
      const message = await work();
      if (message !== false) toast.success(message || success);
      refresh();
    } catch (error) {
      toast.error(aiErrorMessage(error, 'That did not work. Please try again.'));
    } finally {
      setBusy('');
    }
  };

  const saveSettings = (key, patch, clear, success) =>
    act(key, async () => {
      await aiService.saveSettings({ blog: patch });
      clear(null);
    }, success);

  const generate = () =>
    act('generate', async () => {
      const { run, post } = await aiService.generatePost();
      if (!run.ok) {
        toast.error(run.error || 'Generation failed.');
        return false;
      }
      if (post) setPreviewId(post.id);
      return run.summary;
    });

  const changeStatus = (post, next) =>
    act(`status-${post.id}`, async () => {
      const result = await aiService.updatePost(post.id, { status: next });
      const suffix = result.rebuilding ? ' The site is rebuilding with the change.' : '';
      return `${next === 'published' ? 'Published' : 'Unpublished'}.${suffix}`;
    });

  const regenerate = (post) =>
    act(`regen-${post.id}`, async () => {
      const { run, post: fresh } = await aiService.regeneratePost(post.id);
      if (!run.ok) {
        toast.error(run.error || 'Regeneration failed.');
        return false;
      }
      if (fresh) setPreviewId(fresh.id);
      return run.summary;
    });

  const remove = (post) => {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    act(`delete-${post.id}`, () => aiService.deletePost(post.id), 'Post deleted');
  };

  const queue = queueDraft || saved.topicQueue || [];
  const queued = queue.filter((topic) => topic.status === 'queued');
  const setQueue = setQueueDraft;
  const addTopic = () => {
    if (!topicForm.title.trim()) return;
    setQueue([
      ...queue,
      {
        title: topicForm.title.trim(),
        angle: topicForm.angle.trim(),
        keywords: [],
        hints: { category: topicForm.category.trim(), occasion: topicForm.occasion.trim(), collection: '' },
        months: [],
        status: 'queued',
        source: 'admin',
      },
    ]);
    setTopicForm(emptyTopic);
  };

  const previewPost = (posts.data || []).find((post) => post.id === previewId);
  const configured = status.data.configured;

  return (
    <div className="space-y-5 sm:space-y-8">
      <SectionHeading
        eyebrow="Blog"
        title="Automated journal"
        description="A post is written, checked, reviewed and published on schedule. Anything that fails a check is held here for you instead."
        action={
          <Button icon={RefreshCw} loading={busy === 'generate'} disabled={!configured.text} onClick={generate}>
            Generate draft now
          </Button>
        }
      />

      {!configured.text ? (
        <Panel className="text-sm text-[var(--color-text-muted)]">
          Set AI_API_KEY and AI_TEXT_MODEL on the API project to turn the blog on. See docs/ai.md.
        </Panel>
      ) : null}

      {busy === 'generate' ? (
        <Panel className="text-sm text-[var(--color-text-muted)]">Writing, checking and reviewing a draft. This takes up to a minute.</Panel>
      ) : null}

      {previewPost ? <PostPreview post={previewPost} onClose={() => setPreviewId(null)} /> : null}

      <Panel className="space-y-4">
        <p className="lux-label">Posts</p>
        <SimpleTable
          columns={[
            {
              key: 'title',
              label: 'Title',
              render: (value, row) => (
                <div className="max-w-md">
                  {row.status === 'published' ? (
                    <Link to={`/blog/${row.slug}`} target="_blank" className="font-medium text-[var(--color-primary)] hover:underline">{value}</Link>
                  ) : (
                    <span className="font-medium">{value}</span>
                  )}
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{row.wordCount} words · {row.quality?.score ? `score ${row.quality.score}/10` : 'not reviewed'} · {row.trigger === 'admin' ? 'by admin' : 'scheduled'}</p>
                </div>
              ),
            },
            { key: 'status', label: 'Status', render: (value) => <PostStatus status={value} /> },
            { key: 'createdAt', label: 'Written', render: (value, row) => formatWhen(row.publishedAt || value) },
            {
              key: 'actions',
              label: 'Actions',
              render: (_value, row) => (
                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" icon={Eye} onClick={() => setPreviewId(previewId === row.id ? null : row.id)}>Preview</Button>
                  {row.status === 'published' ? (
                    <Button variant="ghost" loading={busy === `status-${row.id}`} onClick={() => changeStatus(row, 'unpublished')}>Unpublish</Button>
                  ) : (
                    <Button variant="secondary" loading={busy === `status-${row.id}`} onClick={() => changeStatus(row, 'published')}>Publish</Button>
                  )}
                  {row.status !== 'published' ? (
                    <Button variant="ghost" icon={RefreshCw} loading={busy === `regen-${row.id}`} disabled={!configured.text} onClick={() => regenerate(row)}>Rewrite</Button>
                  ) : null}
                  <Button variant="ghost" icon={Trash2} loading={busy === `delete-${row.id}`} onClick={() => remove(row)} aria-label={`Delete ${row.title}`} />
                </div>
              ),
            },
          ]}
          rows={posts.data || []}
          empty="No posts yet. Generate a draft to see the writing style."
        />
      </Panel>

      <Panel className="space-y-5">
        <p className="lux-label">Autopilot</p>
        <div className="space-y-3">
          <Check
            label="Write and publish on schedule"
            hint="Runs about 03:00 IST on publish days. Nothing happens until this is on."
            checked={blog.enabled}
            onChange={(value) => setBlog({ enabled: value })}
          />
          <Check
            label="Publish automatically when a post passes every check"
            hint="Off: passing posts wait here as drafts. Posts that fail a check are always held."
            checked={blog.autoPublish}
            onChange={(value) => setBlog({ autoPublish: value })}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Posts per week">
            <select className={inputClass} value={blog.postsPerWeek} onChange={(event) => setBlog({ postsPerWeek: Number(event.target.value) })}>
              <option value={1}>1 (Tuesdays)</option>
              <option value={2}>2 (Tuesdays and Fridays)</option>
            </select>
          </Field>
        </div>
        <Field
          label="Facts the writer may use"
          hint="Posts may only quote numbers (prices, market shares, dates) that appear here or in the product data. Add figures with their source, one per line."
        >
          <textarea
            className={`${inputClass} min-h-[140px]`}
            value={blog.facts}
            maxLength={4000}
            placeholder="e.g. Minimum order: 5 pieces per style (trade terms, 2026)"
            onChange={(event) => setBlog({ facts: event.target.value })}
          />
        </Field>
        <div className="flex flex-wrap gap-3">
          <Button
            loading={busy === 'autopilot'}
            disabled={!autopilot}
            onClick={() =>
              saveSettings(
                'autopilot',
                { enabled: blog.enabled, autoPublish: blog.autoPublish, postsPerWeek: blog.postsPerWeek, facts: blog.facts },
                setAutopilot,
                'Autopilot settings saved',
              )}
          >
            Save autopilot settings
          </Button>
          {autopilot ? <Button variant="ghost" onClick={() => setAutopilot(null)}>Discard changes</Button> : null}
        </div>
        {blog.enabled && !configured.cron ? (
          <p className="text-xs text-[var(--color-primary)]">CRON_SECRET is not set on the API project, so the schedule cannot run yet.</p>
        ) : null}
        {blog.enabled && !configured.deployHook ? (
          <p className="text-xs text-[var(--color-primary)]">CLIENT_DEPLOY_HOOK_URL is not set: new posts will show on the site, but reach search engines' page copies only at the next deploy.</p>
        ) : null}
      </Panel>

      <Panel className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="lux-label">Topic queue</p>
          <p className="text-xs text-[var(--color-text-muted)]">{queued.length} waiting. When fewer than five remain, the AI suggests more.</p>
        </div>
        <ol className="divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
          {queue.map((topic, index) => (
            <li key={`${topic.title}-${index}`} className="flex items-start justify-between gap-3 py-2.5 text-sm">
              <div className={topic.status === 'queued' ? '' : 'text-[var(--color-text-muted)] line-through'}>
                <span className="font-medium">{topic.title}</span>
                <span className="ml-2 text-xs text-[var(--color-text-muted)]">
                  {[topic.hints?.category, topic.hints?.occasion, topic.hints?.collection].filter(Boolean).join(' · ')}
                  {topic.months?.length ? ` · months ${topic.months.join(', ')}` : ''}
                  {topic.source === 'ai' ? ' · suggested by AI' : ''}
                </span>
              </div>
              <button
                type="button"
                aria-label={`Remove ${topic.title}`}
                onClick={() => setQueue(queue.filter((_, itemIndex) => itemIndex !== index))}
                className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ol>
        <div className="grid gap-3 md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:items-end">
          <Field label="New topic"><input className={inputClass} value={topicForm.title} maxLength={140} onChange={(event) => setTopicForm({ ...topicForm, title: event.target.value })} /></Field>
          <Field label="Angle (optional)"><input className={inputClass} value={topicForm.angle} maxLength={300} onChange={(event) => setTopicForm({ ...topicForm, angle: event.target.value })} /></Field>
          <Field label="Category"><input className={inputClass} value={topicForm.category} placeholder="Rings" onChange={(event) => setTopicForm({ ...topicForm, category: event.target.value })} /></Field>
          <Field label="Occasion"><input className={inputClass} value={topicForm.occasion} placeholder="Festive" onChange={(event) => setTopicForm({ ...topicForm, occasion: event.target.value })} /></Field>
          <Button variant="secondary" icon={Plus} onClick={addTopic}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button loading={busy === 'topics'} disabled={!queueDraft} onClick={() => saveSettings('topics', { topicQueue: queue }, setQueueDraft, 'Topic queue saved')}>
            Save topic queue
          </Button>
          {queueDraft ? <Button variant="ghost" onClick={() => setQueueDraft(null)}>Discard changes</Button> : null}
        </div>
      </Panel>
    </div>
  );
}
