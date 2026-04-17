import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';
import { Button, LoadingBlock, Panel, SectionHeading, StatCard } from '../components/ui/Primitives';

const COLORS = ['#6B0F2E', '#8B1A3A', '#D4A82A', '#9A7080'];

const textInput =
  'w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-active)]';
const textareaInput = `${textInput} min-h-[120px]`;

const emptyProduct = {
  styleCode: '',
  name: '',
  category: '',
  subCategory: '',
  collection: '',
  metal: '',
  metalColor: 'Yellow Gold',
  diamondWeight: 0,
  goldWeight: 0,
  kt18GrossWt: 0,
  kt18NetWt: 0,
  kt14GrossWt: 0,
  kt14NetWt: 0,
  kt9GrossWt: 0,
  kt9NetWt: 0,
  diamondQuality: 'VS-GH',
  settingType: '',
  occasion: '',
  stockType: 'Ready Stock',
  stockQuantity: 10,
  status: 'Active',
  description: '',
  imagesText: '',
  isNewArrival: false,
  isBestSeller: false,
  sku: '',
};

const emptyBanner = {
  title: '',
  subtitle: '',
  offerBadge: '',
  ctaLabel: '',
  ctaLink: '',
  image: '',
  active: true,
};

const emptyPopup = {
  image: '',
  frequency: 'once_per_session',
  startDate: '',
  endDate: '',
  active: true,
};

const emptyEvent = {
  title: '',
  date: '',
  description: '',
  image: '',
};

const emptyCatalogue = {
  name: '',
  description: '',
  coverImage: '',
  productIdsText: '',
  assignedUserIdsText: '',
};

const emptyTestimonial = {
  name: '',
  company: '',
  rating: 5,
  status: 'Pending',
  review: '',
  avatar: '',
};

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-[var(--color-text-muted)]">
          <tr>{columns.map((column) => <th key={column.key} className="pb-4">{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id || index} className="border-t border-[var(--color-border)]">
              {columns.map((column) => (
                <td key={column.key} className="py-4 align-top">
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

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}

function linesToArray(value) {
  return value
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}


function buildProductSpecifications(form) {
  const fmt = (n) => `${Number(n || 0).toFixed(2)}`;
  const rows = [
    { attribute: 'Metal', value: form.metal },
    { attribute: 'Diamond Weight', value: `${fmt(form.diamondWeight)} ct` },
    { attribute: 'Gold Weight (filter)', value: `${fmt(form.goldWeight)} g` },
  ];
  const pairs = [
    ['18kt Gross Wt', form.kt18GrossWt],
    ['18kt Net Wt', form.kt18NetWt],
    ['14kt Gross Wt', form.kt14GrossWt],
    ['14kt Net Wt', form.kt14NetWt],
    ['9kt Gross Wt', form.kt9GrossWt],
    ['9kt Net Wt', form.kt9NetWt],
  ];
  pairs.forEach(([label, val]) => {
    if (Number(val) > 0) rows.push({ attribute: label, value: `${fmt(val)} g` });
  });
  rows.push(
    { attribute: 'Diamond Quality', value: form.diamondQuality },
    { attribute: 'Setting Type', value: form.settingType },
    { attribute: 'Occasion', value: form.occasion },
    { attribute: 'SKU', value: form.sku || `${form.styleCode}-SKU` },
  );
  return rows;
}

function csvToArray(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function ProductEditor({ form, setForm, onSave, onDelete, saveLabel = 'Save Product' }) {
  return (
    <Panel className="space-y-4">
      <p className="lux-label">Product Editor</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Style Code"><input className={textInput} value={form.styleCode} onChange={(event) => setForm((current) => ({ ...current, styleCode: event.target.value }))} /></Field>
        <Field label="Product Name"><input className={textInput} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Category"><input className={textInput} value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} /></Field>
        <Field label="Sub Category"><input className={textInput} value={form.subCategory} onChange={(event) => setForm((current) => ({ ...current, subCategory: event.target.value }))} /></Field>
        <Field label="Collection"><input className={textInput} value={form.collection} onChange={(event) => setForm((current) => ({ ...current, collection: event.target.value }))} /></Field>
        <Field label="SKU"><input className={textInput} value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></Field>
        <Field label="Metal"><input className={textInput} value={form.metal} onChange={(event) => setForm((current) => ({ ...current, metal: event.target.value }))} /></Field>
        <Field label="Metal Color"><input className={textInput} value={form.metalColor} onChange={(event) => setForm((current) => ({ ...current, metalColor: event.target.value }))} /></Field>
        <Field label="Diamond Weight (ct)"><input type="number" step="0.01" className={textInput} value={form.diamondWeight} onChange={(event) => setForm((current) => ({ ...current, diamondWeight: Number(event.target.value) }))} /></Field>
        <Field label="Gold Weight (derived filter, g)"><input type="number" step="0.01" className={textInput} value={form.goldWeight} onChange={(event) => setForm((current) => ({ ...current, goldWeight: Number(event.target.value) }))} /></Field>
        <Field label="18kt Gross Wt (g)"><input type="number" step="0.01" className={textInput} value={form.kt18GrossWt ?? 0} onChange={(event) => setForm((current) => ({ ...current, kt18GrossWt: Number(event.target.value) }))} /></Field>
        <Field label="18kt Net Wt (g)"><input type="number" step="0.01" className={textInput} value={form.kt18NetWt ?? 0} onChange={(event) => setForm((current) => ({ ...current, kt18NetWt: Number(event.target.value) }))} /></Field>
        <Field label="14kt Gross Wt (g)"><input type="number" step="0.01" className={textInput} value={form.kt14GrossWt ?? 0} onChange={(event) => setForm((current) => ({ ...current, kt14GrossWt: Number(event.target.value) }))} /></Field>
        <Field label="14kt Net Wt (g)"><input type="number" step="0.01" className={textInput} value={form.kt14NetWt ?? 0} onChange={(event) => setForm((current) => ({ ...current, kt14NetWt: Number(event.target.value) }))} /></Field>
        <Field label="9kt Gross Wt (g)"><input type="number" step="0.01" className={textInput} value={form.kt9GrossWt ?? 0} onChange={(event) => setForm((current) => ({ ...current, kt9GrossWt: Number(event.target.value) }))} /></Field>
        <Field label="9kt Net Wt (g)"><input type="number" step="0.01" className={textInput} value={form.kt9NetWt ?? 0} onChange={(event) => setForm((current) => ({ ...current, kt9NetWt: Number(event.target.value) }))} /></Field>
        <Field label="Diamond Quality"><input className={textInput} value={form.diamondQuality} onChange={(event) => setForm((current) => ({ ...current, diamondQuality: event.target.value }))} /></Field>
        <Field label="Setting Type"><input className={textInput} value={form.settingType} onChange={(event) => setForm((current) => ({ ...current, settingType: event.target.value }))} /></Field>
        <Field label="Occasion"><input className={textInput} value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))} /></Field>
        <Field label="Stock quantity (units)"><input type="number" min="0" className={textInput} value={form.stockQuantity ?? 0} onChange={(event) => setForm((current) => ({ ...current, stockQuantity: Number(event.target.value) }))} /></Field>
        <Field label="Stock Type">
          <select className={textInput} value={form.stockType} onChange={(event) => setForm((current) => ({ ...current, stockType: event.target.value }))}>
            <option>Ready Stock</option>
            <option>Make to Order</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={textInput} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option>Active</option>
            <option>Inactive</option>
            <option>Synced</option>
          </select>
        </Field>
        <Field label="Images (comma separated URLs)">
          <textarea className={textareaInput} value={form.imagesText} onChange={(event) => setForm((current) => ({ ...current, imagesText: event.target.value }))} />
        </Field>
        <Field label="Description">
          <textarea className={textareaInput} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isNewArrival} onChange={(event) => setForm((current) => ({ ...current, isNewArrival: event.target.checked }))} /> New Arrival</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isBestSeller} onChange={(event) => setForm((current) => ({ ...current, isBestSeller: event.target.checked }))} /> Best Seller</label>
      </div>
      <div className="flex gap-3">
        <Button onClick={onSave}>{saveLabel}</Button>
        {onDelete ? <Button variant="danger" onClick={onDelete}>Delete</Button> : null}
      </div>
    </Panel>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminService.dashboard });

  if (isLoading) return <LoadingBlock label="Loading dashboard metrics..." />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Admin" title="Overview Dashboard" description="KPIs, category velocity, and order type trends." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((metric) => <StatCard key={metric.label} label={metric.label} value={metric.value} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="h-[360px]">
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Orders over last 30 days</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.orderTrend}>
              <CartesianGrid stroke="rgba(107,15,46,0.08)" />
              <XAxis dataKey="day" stroke="#9A7080" />
              <YAxis stroke="#9A7080" />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#6B0F2E" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
        <Panel className="h-[360px]">
          <p className="mb-4 text-sm text-[var(--color-text-muted)]">Order type split</p>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data.orderTypeSplit} dataKey="value" innerRadius={70} outerRadius={110}>
                {data.orderTypeSplit.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Panel>
      </div>
      <Panel className="h-[360px]">
        <p className="mb-4 text-sm text-[var(--color-text-muted)]">Top categories by order volume</p>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.categoryChart}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="name" stroke="#9A7080" />
            <YAxis stroke="#9A7080" />
            <Tooltip />
            <Bar dataKey="value" fill="#D4A82A" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}

export function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-promotions'], queryFn: adminService.promotions });
  const [bannerForm, setBannerForm] = useState(emptyBanner);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [popupForm, setPopupForm] = useState(emptyPopup);
  const [editingPopupId, setEditingPopupId] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [editingEventId, setEditingEventId] = useState(null);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
  };

  const displayBannerOrder = useMemo(() => {
    if (!data) return [];
    const o = [...(data.bannersOrder || [])];
    data.banners.forEach((b) => {
      if (!o.includes(b.id)) o.push(b.id);
    });
    return o.filter((id) => data.banners.some((b) => b.id === id));
  }, [data]);

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Promotions" title="Manage banners, popups, and event content" description="Everything shown on the public site can be edited from here." />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="space-y-4">
          <p className="lux-label">Banner Library</p>
          {data.banners.map((banner) => (
            <button
              key={banner.id}
              className="w-full border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)] transition"
              onClick={() => {
                setEditingBannerId(banner.id);
                setBannerForm(banner);
              }}
            >
              <p className="font-semibold">{banner.title}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{banner.ctaLabel}</p>
            </button>
          ))}
        </Panel>
        <Panel className="space-y-4">
          <p className="lux-label">Popup Ads</p>
          {data.popupAds.map((popup) => (
            <button
              key={popup.id}
              className="w-full border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)] transition"
              onClick={() => {
                setEditingPopupId(popup.id);
                setPopupForm(popup);
              }}
            >
              <p className="font-semibold">{popup.frequency}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{popup.startDate} to {popup.endDate}</p>
            </button>
          ))}
        </Panel>
        <Panel className="space-y-4">
          <p className="lux-label">Events</p>
          {data.events.map((event) => (
            <button
              key={event.id}
              className="w-full border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)] transition"
              onClick={() => {
                setEditingEventId(event.id);
                setEventForm(event);
              }}
            >
              <p className="font-semibold">{event.title}</p>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{event.date}</p>
            </button>
          ))}
        </Panel>
      </div>

      <Panel className="space-y-4">
        <p className="lux-label">Home hero — banner order</p>
        <p className="text-sm text-[var(--color-text-muted)]">First item appears first on the home page slider.</p>
        <div className="space-y-2">
          {displayBannerOrder.map((id, index) => {
            const b = data.banners.find((x) => x.id === id);
            if (!b) return null;
            return (
              <div key={id} className="flex flex-wrap items-center justify-between gap-2 border border-[var(--color-border)] px-4 py-3">
                <span className="text-sm font-medium">{b.title}</span>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (index === 0) return;
                      const next = [...displayBannerOrder];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      await adminService.updateBannerOrder(next);
                      toast.success('Banner order updated');
                      refresh();
                    }}
                  >
                    Up
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (index >= displayBannerOrder.length - 1) return;
                      const next = [...displayBannerOrder];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      await adminService.updateBannerOrder(next);
                      toast.success('Banner order updated');
                      refresh();
                    }}
                  >
                    Down
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="space-y-4">
          <p className="lux-label">{editingBannerId ? 'Edit Banner' : 'Create Banner'}</p>
          <Field label="Title"><input className={textInput} value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Subtitle"><textarea className={textareaInput} value={bannerForm.subtitle} onChange={(event) => setBannerForm((current) => ({ ...current, subtitle: event.target.value }))} /></Field>
          <Field label="Offer badge (optional)"><input className={textInput} placeholder="e.g. 20% off bridal edit" value={bannerForm.offerBadge || ''} onChange={(event) => setBannerForm((current) => ({ ...current, offerBadge: event.target.value }))} /></Field>
          <Field label="CTA Label"><input className={textInput} value={bannerForm.ctaLabel} onChange={(event) => setBannerForm((current) => ({ ...current, ctaLabel: event.target.value }))} /></Field>
          <Field label="CTA Link"><input className={textInput} value={bannerForm.ctaLink} onChange={(event) => setBannerForm((current) => ({ ...current, ctaLink: event.target.value }))} /></Field>
          <Field label="Image URL"><input className={textInput} value={bannerForm.image} onChange={(event) => setBannerForm((current) => ({ ...current, image: event.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><input type="checkbox" checked={bannerForm.active} onChange={(event) => setBannerForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingBannerId) await adminService.updateBanner(editingBannerId, bannerForm);
              else await adminService.createBanner(bannerForm);
              toast.success(`Banner ${editingBannerId ? 'updated' : 'created'}`);
              setEditingBannerId(null);
              setBannerForm(emptyBanner);
              refresh();
            }}>{editingBannerId ? 'Update Banner' : 'Create Banner'}</Button>
            {editingBannerId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteBanner(editingBannerId);
              toast.success('Banner deleted');
              setEditingBannerId(null);
              setBannerForm(emptyBanner);
              refresh();
            }}>Delete</Button> : null}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">{editingPopupId ? 'Edit Popup Ad' : 'Create Popup Ad'}</p>
          <Field label="Image URL"><input className={textInput} value={popupForm.image} onChange={(event) => setPopupForm((current) => ({ ...current, image: event.target.value }))} /></Field>
          <Field label="Frequency"><input className={textInput} value={popupForm.frequency} onChange={(event) => setPopupForm((current) => ({ ...current, frequency: event.target.value }))} /></Field>
          <Field label="Start Date"><input type="date" className={textInput} value={popupForm.startDate} onChange={(event) => setPopupForm((current) => ({ ...current, startDate: event.target.value }))} /></Field>
          <Field label="End Date"><input type="date" className={textInput} value={popupForm.endDate} onChange={(event) => setPopupForm((current) => ({ ...current, endDate: event.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><input type="checkbox" checked={popupForm.active} onChange={(event) => setPopupForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingPopupId) await adminService.updatePopupAd(editingPopupId, popupForm);
              else await adminService.createPopupAd(popupForm);
              toast.success(`Popup ad ${editingPopupId ? 'updated' : 'created'}`);
              setEditingPopupId(null);
              setPopupForm(emptyPopup);
              refresh();
            }}>{editingPopupId ? 'Update Popup' : 'Create Popup'}</Button>
            {editingPopupId ? <Button variant="danger" onClick={async () => {
              await adminService.deletePopupAd(editingPopupId);
              toast.success('Popup ad deleted');
              setEditingPopupId(null);
              setPopupForm(emptyPopup);
              refresh();
            }}>Delete</Button> : null}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">{editingEventId ? 'Edit Event' : 'Create Event'}</p>
          <Field label="Title"><input className={textInput} value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Date"><input type="date" className={textInput} value={eventForm.date} onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} /></Field>
          <Field label="Image URL"><input className={textInput} value={eventForm.image} onChange={(event) => setEventForm((current) => ({ ...current, image: event.target.value }))} /></Field>
          <Field label="Description"><textarea className={textareaInput} value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} /></Field>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingEventId) await adminService.updateEvent(editingEventId, eventForm);
              else await adminService.createEvent(eventForm);
              toast.success(`Event ${editingEventId ? 'updated' : 'created'}`);
              setEditingEventId(null);
              setEventForm(emptyEvent);
              refresh();
            }}>{editingEventId ? 'Update Event' : 'Create Event'}</Button>
            {editingEventId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteEvent(editingEventId);
              toast.success('Event deleted');
              setEditingEventId(null);
              setEventForm(emptyEvent);
              refresh();
            }}>Delete</Button> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: adminService.users });

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Users" title="Buyer activation and KYC" />
      <Panel>
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'companyName', label: 'Company' },
            { key: 'email', label: 'Email' },
            { key: 'city', label: 'City' },
            { key: 'status', label: 'Status' },
            { key: 'kycDocuments', label: 'KYC', render: (value) => value.join(', ') },
            {
              key: 'actions',
              label: 'Actions',
              render: (_, row) => (
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await adminService.updateUser(row.id, { status: row.status === 'Active' ? 'Inactive' : 'Active' });
                    toast.success('User status updated');
                    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                  }}
                >
                  {row.status === 'Active' ? 'Deactivate' : 'Activate'}
                </Button>
              ),
            },
          ]}
          rows={data}
        />
      </Panel>
    </div>
  );
}

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-products'], queryFn: adminService.products });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProduct);

  if (isLoading) return <LoadingBlock />;

  const payload = {
    ...form,
    images: csvToArray(form.imagesText),
    customizationOptions: {
      goldColors: ['Yellow Gold', 'Rose Gold', 'White Gold'],
      goldCarats: ['14K', '18K', '22K'],
      diamondQualities: ['SI-IJ', 'VS-GH', 'VVS-EF'],
    },
    specifications: buildProductSpecifications(form),
  };
  delete payload.imagesText;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Inventory" title="Create, edit, and manage products from admin" description="This now acts as the backend content source for the product catalogue." />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="lux-label">Products</p>
            <Button variant="secondary" onClick={() => {
              setEditingId(null);
              setForm(emptyProduct);
            }}>New Product</Button>
          </div>
          <div className="max-h-[780px] space-y-3 overflow-y-auto pr-1">
            {data.map((product) => (
              <button
                key={product.id}
                className="w-full border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)] transition"
                onClick={() => {
                  setEditingId(product.id);
                  setForm({
                    ...product,
                    imagesText: (product.images || []).join(', '),
                  });
                }}
              >
                <p className="font-semibold">{product.styleCode}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{product.name}</p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">Stock: {product.stockType === 'Ready Stock' ? product.stockQuantity ?? 0 : '—'} ({product.stockType})</p>
              </button>
            ))}
          </div>
        </Panel>
        <ProductEditor
          form={form}
          setForm={setForm}
          saveLabel={editingId ? 'Update Product' : 'Create Product'}
          onSave={async () => {
            if (editingId) await adminService.updateProduct(editingId, payload);
            else await adminService.createProduct(payload);
            toast.success(`Product ${editingId ? 'updated' : 'created'}`);
            setEditingId(null);
            setForm(emptyProduct);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          }}
          onDelete={editingId ? async () => {
            await adminService.deleteProduct(editingId);
            toast.success('Product deleted');
            setEditingId(null);
            setForm(emptyProduct);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          } : null}
        />
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-orders'], queryFn: adminService.orders });
  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Orders" title="Review, approve, and process buyer requests" />
      <Panel>
        <DataTable
          columns={[
            { key: 'orderId', label: 'Order ID' },
            { key: 'date', label: 'Date', render: (value) => new Date(value).toLocaleDateString('en-IN') },
            { key: 'status', label: 'Status' },
            { key: 'paymentMethod', label: 'Payment' },
            { key: 'user', label: 'Buyer', render: (value) => value?.name || '-' },
            {
              key: 'actions',
              label: 'Status',
              render: (_, row) => (
                <select
                  className={textInput}
                  value={row.status}
                  onChange={async (event) => {
                    await adminService.updateOrder(row.id, { status: event.target.value });
                    toast.success('Order updated');
                    queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
                  }}
                >
                  <option>Pending</option>
                  <option>Reviewed</option>
                  <option>Approved</option>
                  <option>Processing</option>
                  <option>Shipped</option>
                  <option>Cancelled</option>
                </select>
              ),
            },
          ]}
          rows={data}
        />
      </Panel>
    </div>
  );
}

export function AdminCataloguesPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-catalogues'], queryFn: adminService.catalogues });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminService.users });
  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: adminService.products });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCatalogue);

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Catalogues" title="Build and assign buyer catalogues" description="Assign products and users directly from admin-managed data." />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="lux-label">Catalogues</p>
            <Button variant="secondary" onClick={() => {
              setEditingId(null);
              setForm(emptyCatalogue);
            }}>New Catalogue</Button>
          </div>
          <div className="space-y-3">
            {data.map((catalogue) => (
              <button
                key={catalogue.id}
                className="w-full border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)] transition"
                onClick={() => {
                  setEditingId(catalogue.id);
                  setForm({
                    ...catalogue,
                    productIdsText: (catalogue.productIds || []).join(', '),
                    assignedUserIdsText: (catalogue.assignedUserIds || []).join(', '),
                  });
                }}
              >
                <p className="font-semibold">{catalogue.name}</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">{catalogue.description}</p>
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">{editingId ? 'Edit Catalogue' : 'Create Catalogue'}</p>
          <Field label="Name"><input className={textInput} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Description"><textarea className={textareaInput} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
          <Field label="Cover Image URL"><input className={textInput} value={form.coverImage} onChange={(event) => setForm((current) => ({ ...current, coverImage: event.target.value }))} /></Field>
          <Field label="Product IDs (comma separated)">
            <textarea className={textareaInput} value={form.productIdsText} onChange={(event) => setForm((current) => ({ ...current, productIdsText: event.target.value }))} />
          </Field>
          <Field label="Assigned User IDs (comma separated)">
            <textarea className={textareaInput} value={form.assignedUserIdsText} onChange={(event) => setForm((current) => ({ ...current, assignedUserIdsText: event.target.value }))} />
          </Field>
          <div className="border border-[var(--color-border)] p-4 text-sm text-[var(--color-text-muted)]">
            <p className="mb-2 text-[var(--color-text)]">Available product IDs</p>
            <p>{products.map((product) => product.id).join(', ')}</p>
            <p className="mb-2 mt-4 text-[var(--color-text)]">Available user IDs</p>
            <p>{users.map((user) => user.id).join(', ')}</p>
          </div>
          <div className="flex gap-3">
            <Button onClick={async () => {
              const payload = {
                ...form,
                productIds: csvToArray(form.productIdsText),
                assignedUserIds: csvToArray(form.assignedUserIdsText),
              };
              if (editingId) await adminService.updateCatalogue(editingId, payload);
              else await adminService.createCatalogue(payload);
              toast.success(`Catalogue ${editingId ? 'updated' : 'created'}`);
              setEditingId(null);
              setForm(emptyCatalogue);
              queryClient.invalidateQueries({ queryKey: ['admin-catalogues'] });
            }}>{editingId ? 'Update Catalogue' : 'Create Catalogue'}</Button>
            {editingId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteCatalogue(editingId);
              toast.success('Catalogue deleted');
              setEditingId(null);
              setForm(emptyCatalogue);
              queryClient.invalidateQueries({ queryKey: ['admin-catalogues'] });
            }}>Delete</Button> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function AdminConfigPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-config'], queryFn: adminService.config });
  const [siteSettings, setSiteSettings] = useState(null);
  const [emailSettings, setEmailSettings] = useState(null);
  const [integrationSettings, setIntegrationSettings] = useState(null);
  const [pincodesText, setPincodesText] = useState('');
  const [categoriesText, setCategoriesText] = useState('');
  const [subCategoriesText, setSubCategoriesText] = useState('');
  const [collectionsText, setCollectionsText] = useState('');

  if (isLoading) return <LoadingBlock />;

  if (!siteSettings) {
    setSiteSettings(data.siteSettings);
    setEmailSettings(data.emailSettings);
    setIntegrationSettings(data.integrationSettings);
    setPincodesText((data.pincodes || []).join(', '));
    setCategoriesText((data.categoryManager || []).map((item) => `${item.name}|${item.image || ''}`).join('\n'));
    setSubCategoriesText((data.subCategoryManager || []).map((item) => `${item.category}|${item.name}`).join('\n'));
    setCollectionsText((data.collectionManager || []).map((item) => `${item.category}|${item.subCategory}|${item.name}|${item.image || ''}`).join('\n'));
  }

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Configuration" title="Site details, integrations, and data managers" description="Link existing systems here and manage the data structures the storefront depends on." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="space-y-4">
          <p className="lux-label">Site Settings</p>
          {siteSettings ? (
            <>
              <Field label="Company Name"><input className={textInput} value={siteSettings.companyName} onChange={(event) => setSiteSettings((current) => ({ ...current, companyName: event.target.value }))} /></Field>
              <Field label="Email"><input className={textInput} value={siteSettings.email} onChange={(event) => setSiteSettings((current) => ({ ...current, email: event.target.value }))} /></Field>
              <Field label="Phone"><input className={textInput} value={siteSettings.phone} onChange={(event) => setSiteSettings((current) => ({ ...current, phone: event.target.value }))} /></Field>
              <Field label="Address"><textarea className={textareaInput} value={siteSettings.address} onChange={(event) => setSiteSettings((current) => ({ ...current, address: event.target.value }))} /></Field>
              <Field label="Google Maps Embed"><input className={textInput} value={siteSettings.mapsEmbed} onChange={(event) => setSiteSettings((current) => ({ ...current, mapsEmbed: event.target.value }))} /></Field>
            </>
          ) : null}
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">Existing Systems Integration</p>
          {integrationSettings ? (
            <>
              <Field label="ERP Name"><input className={textInput} value={integrationSettings.erpName} onChange={(event) => setIntegrationSettings((current) => ({ ...current, erpName: event.target.value }))} /></Field>
              <Field label="ERP Base URL"><input className={textInput} value={integrationSettings.erpBaseUrl} onChange={(event) => setIntegrationSettings((current) => ({ ...current, erpBaseUrl: event.target.value }))} /></Field>
              <Field label="ERP API Key"><input className={textInput} value={integrationSettings.erpApiKey} onChange={(event) => setIntegrationSettings((current) => ({ ...current, erpApiKey: event.target.value }))} /></Field>
              <Field label="Image CDN Base URL"><input className={textInput} value={integrationSettings.imageCdnBaseUrl} onChange={(event) => setIntegrationSettings((current) => ({ ...current, imageCdnBaseUrl: event.target.value }))} /></Field>
              <Field label="Sync Interval (hours)"><input type="number" className={textInput} value={integrationSettings.syncIntervalHours} onChange={(event) => setIntegrationSettings((current) => ({ ...current, syncIntervalHours: Number(event.target.value) }))} /></Field>
            </>
          ) : null}
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">Email and Pincode Settings</p>
          {emailSettings ? (
            <>
              <Field label="SMTP Host"><input className={textInput} value={emailSettings.smtpHost} onChange={(event) => setEmailSettings((current) => ({ ...current, smtpHost: event.target.value }))} /></Field>
              <Field label="SMTP User"><input className={textInput} value={emailSettings.smtpUser} onChange={(event) => setEmailSettings((current) => ({ ...current, smtpUser: event.target.value }))} /></Field>
              <Field label="From Email"><input className={textInput} value={emailSettings.fromEmail} onChange={(event) => setEmailSettings((current) => ({ ...current, fromEmail: event.target.value }))} /></Field>
              <Field label="Enquiry Inbox"><input className={textInput} value={emailSettings.enquiryInbox} onChange={(event) => setEmailSettings((current) => ({ ...current, enquiryInbox: event.target.value }))} /></Field>
              <Field label="Serviceable Pincodes (comma separated)"><textarea className={textareaInput} value={pincodesText} onChange={(event) => setPincodesText(event.target.value)} /></Field>
            </>
          ) : null}
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">Category Hierarchy</p>
          <Field label="Categories (Name|ImageUrl per line)"><textarea className={textareaInput} value={categoriesText} onChange={(event) => setCategoriesText(event.target.value)} /></Field>
          <Field label="Sub Categories (Category|SubCategory per line)"><textarea className={textareaInput} value={subCategoriesText} onChange={(event) => setSubCategoriesText(event.target.value)} /></Field>
          <Field label="Collections (Category|SubCategory|Collection|ImageUrl per line)"><textarea className={textareaInput} value={collectionsText} onChange={(event) => setCollectionsText(event.target.value)} /></Field>
        </Panel>
      </div>

      <Button onClick={async () => {
        await adminService.updateConfig({
          siteSettings,
          emailSettings,
          integrationSettings,
          pincodes: csvToArray(pincodesText),
          categoryManager: linesToArray(categoriesText).map((line, index) => {
            const [name, image] = line.split('|');
            return { id: `category-${index + 1}`, name: (name || '').trim(), image: (image || '').trim() };
          }),
          subCategoryManager: linesToArray(subCategoriesText).map((line, index) => {
            const [category, name] = line.split('|');
            return { id: `subcategory-${index + 1}`, category: (category || '').trim(), name: (name || '').trim() };
          }),
          collectionManager: linesToArray(collectionsText).map((line, index) => {
            const [category, subCategory, name, image] = line.split('|');
            return {
              id: `collection-${index + 1}`,
              category: (category || '').trim(),
              subCategory: (subCategory || '').trim(),
              name: (name || '').trim(),
              image: (image || '').trim(),
            };
          }),
        });
        toast.success('Configuration updated');
        queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      }}>Save Configuration</Button>
    </div>
  );
}

export function AdminTestimonialsPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-testimonials'], queryFn: adminService.testimonials });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyTestimonial);

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Testimonials" title="Create, moderate, and edit testimonials" />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="lux-label">Entries</p>
            <Button variant="secondary" onClick={() => {
              setEditingId(null);
              setForm(emptyTestimonial);
            }}>New</Button>
          </div>
          {data.map((testimonial) => (
            <button
              key={testimonial.id}
              className="w-full border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)] transition"
              onClick={() => {
                setEditingId(testimonial.id);
                setForm(testimonial);
              }}
            >
              <p className="font-semibold">{testimonial.name}</p>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{testimonial.company}</p>
            </button>
          ))}
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">{editingId ? 'Edit Testimonial' : 'Create Testimonial'}</p>
          <Field label="Name"><input className={textInput} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Company"><input className={textInput} value={form.company} onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))} /></Field>
          <Field label="Rating"><input type="number" min="1" max="5" className={textInput} value={form.rating} onChange={(event) => setForm((current) => ({ ...current, rating: Number(event.target.value) }))} /></Field>
          <Field label="Status">
            <select className={textInput} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option>Pending</option>
              <option>Approved</option>
              <option>Disapproved</option>
            </select>
          </Field>
          <Field label="Avatar URL"><input className={textInput} value={form.avatar} onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))} /></Field>
          <Field label="Review"><textarea className={textareaInput} value={form.review} onChange={(event) => setForm((current) => ({ ...current, review: event.target.value }))} /></Field>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingId) await adminService.updateTestimonial(editingId, form);
              else await adminService.createTestimonial(form);
              toast.success(`Testimonial ${editingId ? 'updated' : 'created'}`);
              setEditingId(null);
              setForm(emptyTestimonial);
              queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
            }}>{editingId ? 'Update Testimonial' : 'Create Testimonial'}</Button>
            {editingId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteTestimonial(editingId);
              toast.success('Testimonial deleted');
              setEditingId(null);
              setForm(emptyTestimonial);
              queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
            }}>Delete</Button> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

export function AdminRolesPage() {
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-roles'], queryFn: adminService.roles });
  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Roles" title="Security and permissions" />
      <Panel>
        <DataTable
          columns={[
            { key: 'name', label: 'Role' },
            { key: 'permissions', label: 'Permissions', render: (value) => value.join(', ') },
          ]}
          rows={data}
        />
      </Panel>
    </div>
  );
}

export function AdminReportsPage() {
  const [type, setType] = useState('product-wise');
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-reports', type],
    queryFn: () => adminService.reports(type),
  });

  const columns = useMemo(() => {
    if (!data.length) return [];
    return Object.keys(data[0]).map((key) => ({ key, label: key }));
  }, [data]);

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Reports" title="Operational and behavioural reporting" />
      <div className="flex flex-wrap gap-3">
        {['product-wise', 'category-wise', 'login-log', 'user-orders'].map((item) => (
          <Button key={item} variant={type === item ? 'primary' : 'secondary'} onClick={() => setType(item)}>
            {item}
          </Button>
        ))}
      </div>
      <Panel>{columns.length ? <DataTable columns={columns} rows={data} /> : <p>No report data</p>}</Panel>
    </div>
  );
}

export function AdminSyncPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-sync'], queryFn: adminService.sync });
  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="ERP Sync" title="Sync dashboard and existing-system link status" description="Use this with the integration settings page to connect DeArte to your ERP and media systems." />
      <Panel className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="lux-label mb-3">ERP</p>
          <p>{data.integrationSettings.erpName}</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{data.integrationSettings.erpBaseUrl}</p>
        </div>
        <div>
          <p className="lux-label mb-3">Sync Controls</p>
          <p className="text-sm text-[var(--color-text-muted)]">Interval: every {data.integrationSettings.syncIntervalHours} hours</p>
          <p className="text-sm text-[var(--color-text-muted)]">Order Import: {data.integrationSettings.orderImportEnabled ? 'Enabled' : 'Disabled'}</p>
        </div>
      </Panel>
      <Button
        onClick={async () => {
          await adminService.triggerSync();
          toast.success('Manual sync triggered');
          queryClient.invalidateQueries({ queryKey: ['admin-sync'] });
        }}
      >
        Trigger Manual Sync
      </Button>
      <Panel>
        <DataTable
          columns={[
            { key: 'time', label: 'Last Sync', render: (value) => new Date(value).toLocaleString('en-IN') },
            { key: 'recordsSynced', label: 'Records Synced' },
            { key: 'errors', label: 'Errors' },
            { key: 'status', label: 'Status' },
            { key: 'nextRun', label: 'Next Run', render: (value) => new Date(value).toLocaleString('en-IN') },
          ]}
          rows={data.logs}
        />
      </Panel>
    </div>
  );
}
