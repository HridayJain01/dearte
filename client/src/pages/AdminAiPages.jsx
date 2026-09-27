import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Play } from 'lucide-react';
import { Button, ErrorState, LoadingBlock, Panel, SectionHeading } from '../components/ui/Primitives';
import { aiErrorMessage, aiService } from '../services/aiService';

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
            label="Photo index (nightly, about 03:30 IST)"
            hint="Tags each style's photos so Shop by photo can match designs. Stored separately; product records are never changed."
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
