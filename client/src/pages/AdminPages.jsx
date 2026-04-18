import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { adminService } from '../services/adminService';
import { Button, LoadingBlock, Panel, SectionHeading, StatCard } from '../components/ui/Primitives';

const textInput =
  'w-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-border-active)]';
const textareaInput = `${textInput} min-h-[120px]`;

const emptyAsset = { publicId: '', secureUrl: '', width: 0, height: 0, alt: '', resourceType: 'image' };

const emptyProduct = {
  styleCode: '',
  name: '',
  categoryId: '',
  subCategoryId: '',
  collectionId: '',
  metalType: '',
  metalColorId: '',
  metal: '',
  diamondWeight: 0,
  goldWeight: 0,
  diamondQuality: 'VS-GH',
  settingType: '',
  occasion: '',
  stockType: 'Ready Stock',
  stockQuantity: 10,
  status: 'Active',
  description: '',
  media: [],
  isNewArrival: false,
  isBestSeller: false,
  sku: '',
};

const emptyBanner = {
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaLink: '',
  image: emptyAsset,
  active: true,
};

const emptyPopup = {
  image: emptyAsset,
  frequency: 'once_per_session',
  startDate: '',
  endDate: '',
  active: true,
};

const emptyEvent = {
  title: '',
  date: '',
  description: '',
  image: emptyAsset,
  active: true,
};

const emptyCatalogue = {
  name: '',
  description: '',
  coverImage: emptyAsset,
  productIds: [],
  assignedUserIds: [],
  active: true,
  archived: false,
};

const emptyTestimonial = {
  name: '',
  company: '',
  rating: 5,
  status: 'Pending',
  review: '',
  avatar: emptyAsset,
};

const emptySiteSettings = {
  companyName: '',
  email: '',
  phone: '',
  whatsapp: '',
  instagram: '',
  linkedin: '',
  facebook: '',
  address: '',
  hours: '',
  mapsEmbed: '',
  newsletterBlurb: '',
};

const emptyCategory = { name: '', slug: '', image: emptyAsset, active: true };
const emptySubCategory = { name: '', slug: '', categoryId: '', image: emptyAsset, active: true };
const emptyCollection = {
  name: '',
  slug: '',
  categoryId: '',
  subCategoryId: '',
  image: emptyAsset,
  active: true,
};
const emptyMetalOption = { name: '', group: 'Metal Color', swatch: emptyAsset, active: true };

function toDateInput(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeAsset(value) {
  if (!value) return { ...emptyAsset };
  if (typeof value === 'string') {
    return { ...emptyAsset, secureUrl: value };
  }
  return {
    ...emptyAsset,
    ...value,
  };
}

async function uploadFile(file, folder) {
  const signing = await adminService.signUpload({ folder });
  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', signing.apiKey);
  formData.append('timestamp', String(signing.timestamp));
  formData.append('signature', signing.signature);
  formData.append('folder', signing.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${signing.cloudName}/auto/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
    width: data.width,
    height: data.height,
    alt: file.name,
    resourceType: data.resource_type || 'image',
  };
}

function Thumbnail({ asset, alt = '', size = 'h-12 w-12' }) {
  const src = typeof asset === 'string' ? asset : asset?.secureUrl;
  if (!src) {
    return <div className={`${size} rounded border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]`} />;
  }

  return <img src={src} alt={alt} className={`${size} rounded object-cover`} />;
}

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

function AssetField({ label, value, onChange, folder }) {
  const [uploading, setUploading] = useState(false);
  const asset = normalizeAsset(value);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const nextAsset = await uploadFile(file, folder);
      onChange(nextAsset);
      toast.success('Asset uploaded');
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <Field label={label}>
        <div className="flex items-center gap-3 rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
          <Thumbnail asset={asset} alt={asset.alt} />
          <div className="flex-1 space-y-2">
            <div className="text-xs text-[var(--color-text-muted)] break-all">
              {asset.secureUrl || 'No asset uploaded yet'}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center rounded border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-text)]">
                {uploading ? 'Uploading...' : 'Upload'}
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
              {asset.publicId ? (
                <Button
                  variant="secondary"
                  type="button"
                  onClick={async () => {
                    try {
                      await adminService.deleteUpload(asset.publicId);
                    } catch {
                      // Ignore delete failures so the form can still be cleared locally.
                    }
                    onChange({ ...emptyAsset });
                  }}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Field>
      <Field label="Alt text">
        <input
          className={textInput}
          value={asset.alt || ''}
          onChange={(event) => onChange({ ...asset, alt: event.target.value })}
        />
      </Field>
    </div>
  );
}

function MediaField({ value, onChange, folder }) {
  const media = Array.isArray(value) ? value.map(normalizeAsset) : [];
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    try {
      setUploading(true);
      const uploaded = [];
      for (const file of files) {
        uploaded.push(await uploadFile(file, folder));
      }
      onChange([...media, ...uploaded]);
      toast.success('Media uploaded');
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const move = (index, direction) => {
    const next = [...media];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--color-text-muted)]">Media</p>
        <label className="inline-flex cursor-pointer items-center rounded border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[var(--color-text)]">
          {uploading ? 'Uploading...' : 'Upload images'}
          <input type="file" multiple className="hidden" onChange={handleUpload} />
        </label>
      </div>
      <div className="space-y-3">
        {media.length ? media.map((asset, index) => (
          <div key={asset.publicId || asset.secureUrl || index} className="flex items-center gap-3 rounded border border-[var(--color-border)] p-3">
            <Thumbnail asset={asset} alt={asset.alt} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[var(--color-text)]">{asset.alt || `Image ${index + 1}`}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{asset.secureUrl}</p>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => move(index, -1)}>Up</Button>
              <Button type="button" variant="secondary" onClick={() => move(index, 1)}>Down</Button>
              <Button
                type="button"
                variant="danger"
                onClick={async () => {
                  if (asset.publicId) {
                    try {
                      await adminService.deleteUpload(asset.publicId);
                    } catch {
                      // ignore local removal fallback
                    }
                  }
                  onChange(media.filter((_, itemIndex) => itemIndex !== index));
                }}
              >
                Remove
              </Button>
            </div>
          </div>
        )) : (
          <div className="rounded border border-dashed border-[var(--color-border)] px-4 py-6 text-sm text-[var(--color-text-muted)]">
            No product media uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
}

function buildProductSpecifications(form) {
  return [
    { attribute: 'Metal', value: form.metal || '' },
    { attribute: 'Diamond Weight', value: `${Number(form.diamondWeight || 0).toFixed(2)} ct` },
    { attribute: 'Gold Weight', value: `${Number(form.goldWeight || 0).toFixed(2)} g` },
    { attribute: 'Diamond Quality', value: form.diamondQuality || '' },
    { attribute: 'Setting Type', value: form.settingType || '' },
    { attribute: 'Occasion', value: form.occasion || '' },
    { attribute: 'SKU', value: form.sku || `${form.styleCode}-SKU` },
  ].filter((item) => item.value);
}

function ProductEditor({
  form,
  setForm,
  onSave,
  onDelete,
  categories,
  subCategories,
  collections,
  metalOptions,
}) {
  const availableSubCategories = subCategories.filter(
    (item) => !form.categoryId || item.categoryId === form.categoryId,
  );
  const availableCollections = collections.filter(
    (item) =>
      (!form.categoryId || item.categoryId === form.categoryId) &&
      (!form.subCategoryId || item.subCategoryId === form.subCategoryId),
  );

  return (
    <Panel className="space-y-4">
      <p className="lux-label">Product Editor</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Style Code"><input className={textInput} value={form.styleCode} onChange={(event) => setForm((current) => ({ ...current, styleCode: event.target.value }))} /></Field>
        <Field label="Product Name"><input className={textInput} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
        <Field label="Category">
          <select className={textInput} value={form.categoryId} onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value, subCategoryId: '', collectionId: '' }))}>
            <option value="">Select category</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Sub-category">
          <select className={textInput} value={form.subCategoryId} onChange={(event) => setForm((current) => ({ ...current, subCategoryId: event.target.value, collectionId: '' }))}>
            <option value="">Select sub-category</option>
            {availableSubCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Collection">
          <select className={textInput} value={form.collectionId} onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}>
            <option value="">Select collection</option>
            {availableCollections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Metal color">
          <select className={textInput} value={form.metalColorId} onChange={(event) => setForm((current) => ({ ...current, metalColorId: event.target.value }))}>
            <option value="">Select metal color</option>
            {metalOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="SKU"><input className={textInput} value={form.sku} onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))} /></Field>
        <Field label="Metal Type"><input className={textInput} value={form.metalType} onChange={(event) => setForm((current) => ({ ...current, metalType: event.target.value }))} /></Field>
        <Field label="Metal"><input className={textInput} value={form.metal} onChange={(event) => setForm((current) => ({ ...current, metal: event.target.value }))} /></Field>
        <Field label="Diamond Weight (ct)"><input type="number" step="0.01" className={textInput} value={form.diamondWeight} onChange={(event) => setForm((current) => ({ ...current, diamondWeight: Number(event.target.value) }))} /></Field>
        <Field label="Gold Weight (g)"><input type="number" step="0.01" className={textInput} value={form.goldWeight} onChange={(event) => setForm((current) => ({ ...current, goldWeight: Number(event.target.value) }))} /></Field>
        <Field label="Diamond Quality"><input className={textInput} value={form.diamondQuality} onChange={(event) => setForm((current) => ({ ...current, diamondQuality: event.target.value }))} /></Field>
        <Field label="Setting Type"><input className={textInput} value={form.settingType} onChange={(event) => setForm((current) => ({ ...current, settingType: event.target.value }))} /></Field>
        <Field label="Occasion"><input className={textInput} value={form.occasion} onChange={(event) => setForm((current) => ({ ...current, occasion: event.target.value }))} /></Field>
        <Field label="Stock Quantity"><input type="number" min="0" className={textInput} value={form.stockQuantity} onChange={(event) => setForm((current) => ({ ...current, stockQuantity: Number(event.target.value) }))} /></Field>
        <Field label="Stock Type">
          <select className={textInput} value={form.stockType} onChange={(event) => setForm((current) => ({ ...current, stockType: event.target.value }))}>
            <option value="Ready Stock">Ready Stock</option>
            <option value="Make to Order">Make to Order</option>
          </select>
        </Field>
        <Field label="Status">
          <select className={textInput} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </Field>
        <Field label="Description">
          <textarea className={textareaInput} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isNewArrival} onChange={(event) => setForm((current) => ({ ...current, isNewArrival: event.target.checked }))} /> New Arrival</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.isBestSeller} onChange={(event) => setForm((current) => ({ ...current, isBestSeller: event.target.checked }))} /> Best Seller</label>
      </div>

      <MediaField value={form.media} onChange={(media) => setForm((current) => ({ ...current, media }))} folder={`dearte/products/${form.styleCode || 'draft'}`} />

      <div className="flex gap-3">
        <Button onClick={onSave}>{form.id ? 'Update Product' : 'Create Product'}</Button>
        {onDelete ? <Button variant="danger" onClick={onDelete}>Delete</Button> : null}
      </div>
    </Panel>
  );
}

function TaxonomyManager({ title, items, onSave, onDelete, children, onEdit, onNew, saveLabel }) {
  return (
    <Panel className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="lux-label">{title}</p>
        <Button variant="secondary" onClick={onNew}>New</Button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <button
            key={item.id}
            className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] px-3 py-2 text-left hover:border-[var(--color-border-active)]"
            onClick={() => onEdit(item)}
          >
            <Thumbnail asset={item.image || item.swatch} alt={item.name} />
            <div>
              <p className="text-sm font-medium text-[var(--color-text)]">{item.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{item.slug || item.group || ''}</p>
            </div>
          </button>
        ))}
      </div>
      {children}
      <div className="flex gap-3">
        <Button onClick={onSave}>{saveLabel}</Button>
        {onDelete ? <Button variant="danger" onClick={onDelete}>Delete</Button> : null}
      </div>
    </Panel>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminService.dashboard });
  if (isLoading) return <LoadingBlock />;

  const stats = data?.stats || {};

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Dashboard" title="Admin overview" description="Operational visibility for buyers, products, orders, and catalogue assignments." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Buyers" value={stats.buyers || 0} detail={`${stats.pendingBuyers || 0} pending activation`} />
        <StatCard title="Products" value={stats.products || 0} detail={`${stats.newProducts || 0} marked new`} />
        <StatCard title="Orders" value={stats.orders || 0} detail="Mongo-backed order pipeline" />
        <StatCard title="Catalogues" value={stats.catalogues || 0} detail="Private buyer collections" />
      </div>
      <Panel>
        <p className="lux-label mb-4">Recent orders</p>
        <DataTable
          columns={[
            { key: 'orderId', label: 'Order ID' },
            { key: 'user', label: 'Buyer', render: (value) => value?.name || '-' },
            { key: 'status', label: 'Status' },
            { key: 'paymentMethod', label: 'Payment' },
            { key: 'createdAt', label: 'Created', render: (value) => new Date(value).toLocaleString('en-IN') },
          ]}
          rows={data?.recentOrders || []}
        />
      </Panel>
    </div>
  );
}

export function AdminPromotionsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-promotions'], queryFn: adminService.promotions });
  const [bannerForm, setBannerForm] = useState(emptyBanner);
  const [popupForm, setPopupForm] = useState(emptyPopup);
  const [eventForm, setEventForm] = useState(emptyEvent);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [editingPopupId, setEditingPopupId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);

  if (isLoading) return <LoadingBlock />;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
  };

  const bannerOrder = data?.bannersOrder || [];

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Promotions" title="Manage banners, popups, and events" description="All promotional media is now backend-managed and upload-first." />

      <Panel className="space-y-3">
        <p className="lux-label">Banner order</p>
        {bannerOrder.map((id, index) => {
          const banner = data.banners.find((item) => item.id === id);
          if (!banner) return null;
          return (
            <div key={id} className="flex items-center justify-between gap-3 rounded border border-[var(--color-border)] p-3">
              <div className="flex items-center gap-3">
                <Thumbnail asset={banner.image} alt={banner.title} />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{banner.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{banner.ctaLabel}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={async () => {
                  if (index === 0) return;
                  const next = [...bannerOrder];
                  [next[index - 1], next[index]] = [next[index], next[index - 1]];
                  await adminService.updateBannerOrder(next);
                  refresh();
                }}>Up</Button>
                <Button variant="secondary" onClick={async () => {
                  if (index >= bannerOrder.length - 1) return;
                  const next = [...bannerOrder];
                  [next[index], next[index + 1]] = [next[index + 1], next[index]];
                  await adminService.updateBannerOrder(next);
                  refresh();
                }}>Down</Button>
              </div>
            </div>
          );
        })}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="space-y-4">
          <p className="lux-label">Banners</p>
          <div className="space-y-2">
            {data.banners.map((banner) => (
              <button key={banner.id} className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-border-active)]" onClick={() => {
                setEditingBannerId(banner.id);
                setBannerForm({ ...banner, image: normalizeAsset(banner.image) });
              }}>
                <Thumbnail asset={banner.image} alt={banner.title} />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{banner.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{banner.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
          <Field label="Title"><input className={textInput} value={bannerForm.title} onChange={(event) => setBannerForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Subtitle"><textarea className={textareaInput} value={bannerForm.subtitle} onChange={(event) => setBannerForm((current) => ({ ...current, subtitle: event.target.value }))} /></Field>
          <Field label="CTA Label"><input className={textInput} value={bannerForm.ctaLabel} onChange={(event) => setBannerForm((current) => ({ ...current, ctaLabel: event.target.value }))} /></Field>
          <Field label="CTA Link"><input className={textInput} value={bannerForm.ctaLink} onChange={(event) => setBannerForm((current) => ({ ...current, ctaLink: event.target.value }))} /></Field>
          <AssetField label="Banner image" value={bannerForm.image} onChange={(image) => setBannerForm((current) => ({ ...current, image }))} folder="dearte/banners" />
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
              setEditingBannerId(null);
              setBannerForm(emptyBanner);
              refresh();
            }}>Delete</Button> : null}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">Popup ads</p>
          <div className="space-y-2">
            {data.popupAds.map((popup) => (
              <button key={popup.id} className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-border-active)]" onClick={() => {
                setEditingPopupId(popup.id);
                setPopupForm({ ...popup, image: normalizeAsset(popup.image), startDate: toDateInput(popup.startDate), endDate: toDateInput(popup.endDate) });
              }}>
                <Thumbnail asset={popup.image} />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{popup.frequency}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{toDateInput(popup.startDate)} - {toDateInput(popup.endDate)}</p>
                </div>
              </button>
            ))}
          </div>
          <AssetField label="Popup image" value={popupForm.image} onChange={(image) => setPopupForm((current) => ({ ...current, image }))} folder="dearte/popups" />
          <Field label="Frequency"><input className={textInput} value={popupForm.frequency} onChange={(event) => setPopupForm((current) => ({ ...current, frequency: event.target.value }))} /></Field>
          <Field label="Start Date"><input type="date" className={textInput} value={popupForm.startDate} onChange={(event) => setPopupForm((current) => ({ ...current, startDate: event.target.value }))} /></Field>
          <Field label="End Date"><input type="date" className={textInput} value={popupForm.endDate} onChange={(event) => setPopupForm((current) => ({ ...current, endDate: event.target.value }))} /></Field>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><input type="checkbox" checked={popupForm.active} onChange={(event) => setPopupForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingPopupId) await adminService.updatePopupAd(editingPopupId, popupForm);
              else await adminService.createPopupAd(popupForm);
              setEditingPopupId(null);
              setPopupForm(emptyPopup);
              refresh();
            }}>{editingPopupId ? 'Update Popup' : 'Create Popup'}</Button>
            {editingPopupId ? <Button variant="danger" onClick={async () => {
              await adminService.deletePopupAd(editingPopupId);
              setEditingPopupId(null);
              setPopupForm(emptyPopup);
              refresh();
            }}>Delete</Button> : null}
          </div>
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">Events</p>
          <div className="space-y-2">
            {data.events.map((event) => (
              <button key={event.id} className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-border-active)]" onClick={() => {
                setEditingEventId(event.id);
                setEventForm({ ...event, image: normalizeAsset(event.image), date: toDateInput(event.date) });
              }}>
                <Thumbnail asset={event.image} alt={event.title} />
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)]">{event.title}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{toDateInput(event.date)}</p>
                </div>
              </button>
            ))}
          </div>
          <Field label="Title"><input className={textInput} value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} /></Field>
          <Field label="Date"><input type="date" className={textInput} value={eventForm.date} onChange={(event) => setEventForm((current) => ({ ...current, date: event.target.value }))} /></Field>
          <Field label="Description"><textarea className={textareaInput} value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} /></Field>
          <AssetField label="Event image" value={eventForm.image} onChange={(image) => setEventForm((current) => ({ ...current, image }))} folder="dearte/events" />
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingEventId) await adminService.updateEvent(editingEventId, eventForm);
              else await adminService.createEvent(eventForm);
              setEditingEventId(null);
              setEventForm(emptyEvent);
              refresh();
            }}>{editingEventId ? 'Update Event' : 'Create Event'}</Button>
            {editingEventId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteEvent(editingEventId);
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
      <SectionHeading eyebrow="Users" title="Buyer account management" description="Approve, review, and update buyer account details." />
      <Panel>
        <DataTable
          columns={[
            { key: 'name', label: 'Buyer' },
            { key: 'email', label: 'Email' },
            { key: 'companyName', label: 'Company' },
            { key: 'city', label: 'City' },
            {
              key: 'status',
              label: 'Status',
              render: (value, row) => (
                <select
                  className={textInput}
                  value={value}
                  onChange={async (event) => {
                    await adminService.updateUser(row.id, { status: event.target.value });
                    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
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

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery({ queryKey: ['admin-products'], queryFn: adminService.products });
  const { data: config } = useQuery({ queryKey: ['admin-config'], queryFn: adminService.config });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyProduct);

  if (isLoading || !config) return <LoadingBlock />;

  const saveProduct = async () => {
    const payload = {
      ...form,
      media: form.media,
      customizationOptions: {
        goldColors: ['Yellow Gold', 'Rose Gold', 'White Gold'],
        goldCarats: ['14K', '18K', '22K'],
        diamondQualities: ['SI-IJ', 'VS-GH', 'VVS-EF'],
      },
      specifications: buildProductSpecifications(form),
    };

    if (editingId) await adminService.updateProduct(editingId, payload);
    else await adminService.createProduct(payload);

    toast.success(`Product ${editingId ? 'updated' : 'created'}`);
    setEditingId(null);
    setForm(emptyProduct);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Inventory" title="Create and manage products" description="Products, media, and stock now live in MongoDB and are editable from admin." />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="lux-label">Products</p>
            <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>New Product</Button>
          </div>
          <div className="max-h-[780px] space-y-3 overflow-y-auto pr-1">
            {products.map((product) => (
              <button
                key={product.id}
                className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)]"
                onClick={() => {
                  setEditingId(product.id);
                  setForm({
                    id: product.id,
                    styleCode: product.styleCode,
                    name: product.name,
                    categoryId: product.categoryId,
                    subCategoryId: product.subCategoryId,
                    collectionId: product.collectionId,
                    metalType: product.metalType,
                    metalColorId: product.metalColorId,
                    metal: product.metal,
                    diamondWeight: product.diamondWeight,
                    goldWeight: product.goldWeight,
                    diamondQuality: product.diamondQuality,
                    settingType: product.settingType,
                    occasion: product.occasion,
                    stockType: product.stockType,
                    stockQuantity: product.stockQuantity,
                    status: product.status,
                    description: product.description,
                    media: product.media || [],
                    isNewArrival: product.isNewArrival,
                    isBestSeller: product.isBestSeller,
                    sku: product.sku,
                  });
                }}
              >
                <Thumbnail asset={product.media?.[0]} alt={product.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--color-text)]">{product.styleCode}</p>
                  <p className="truncate text-sm text-[var(--color-text-muted)]">{product.name}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    {product.stockType === 'Ready Stock' ? `${product.stockQuantity} units` : 'Made to order'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </Panel>

        <ProductEditor
          form={form}
          setForm={setForm}
          onSave={saveProduct}
          onDelete={editingId ? async () => {
            await adminService.deleteProduct(editingId);
            setEditingId(null);
            setForm(emptyProduct);
            queryClient.invalidateQueries({ queryKey: ['admin-products'] });
          } : null}
          categories={config.categories || []}
          subCategories={config.subCategories || []}
          collections={config.collections || []}
          metalOptions={config.metalOptions || []}
        />
      </div>
    </div>
  );
}

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-orders'], queryFn: adminService.orders });
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const selectedOrder = data.find((item) => item.id === selectedOrderId) || data[0];

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Orders" title="Review and edit buyer orders" description="Order detail now includes buyer info, shipping notes, and product-level context." />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-3">
          {data.map((order) => (
            <button key={order.id} className="w-full rounded border border-[var(--color-border)] p-4 text-left hover:border-[var(--color-border-active)]" onClick={() => setSelectedOrderId(order.id)}>
              <p className="font-semibold text-[var(--color-text)]">{order.orderId}</p>
              <p className="text-sm text-[var(--color-text-muted)]">{order.user?.name} • {order.status}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
            </button>
          ))}
        </Panel>
        {selectedOrder ? (
          <Panel className="space-y-4">
            <p className="lux-label">Order detail</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Buyer"><input className={textInput} value={selectedOrder.user?.name || ''} readOnly /></Field>
              <Field label="Payment method"><input className={textInput} value={selectedOrder.paymentMethod || ''} onChange={async (event) => {
                await adminService.updateOrder(selectedOrder.id, { paymentMethod: event.target.value });
                queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              }} /></Field>
              <Field label="Status">
                <select className={textInput} value={selectedOrder.status} onChange={async (event) => {
                  await adminService.updateOrder(selectedOrder.id, { status: event.target.value });
                  queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
                }}>
                  <option value="Pending">Pending</option>
                  <option value="Reviewed">Reviewed</option>
                  <option value="Approved">Approved</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Fulfilled">Fulfilled</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Created"><input className={textInput} value={new Date(selectedOrder.createdAt).toLocaleString('en-IN')} readOnly /></Field>
            </div>
            <Field label="Shipping address">
              <textarea className={textareaInput} defaultValue={selectedOrder.shippingAddress || ''} onBlur={async (event) => {
                await adminService.updateOrder(selectedOrder.id, { shippingAddress: event.target.value });
                queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              }} />
            </Field>
            <Field label="Notes">
              <textarea className={textareaInput} defaultValue={selectedOrder.notes || ''} onBlur={async (event) => {
                await adminService.updateOrder(selectedOrder.id, { notes: event.target.value });
                queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
              }} />
            </Field>
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">Line items</p>
              {selectedOrder.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded border border-[var(--color-border)] p-3">
                  <Thumbnail asset={item.product?.media?.[0]} alt={item.product?.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--color-text)]">{item.product?.name}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{item.product?.styleCode} • Qty {item.quantity}</p>
                    <p className="text-xs text-[var(--color-text-muted)]">{item.customization?.goldColor} • {item.customization?.goldCarat} • {item.customization?.diamondQuality}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

export function AdminCataloguesPage() {
  const queryClient = useQueryClient();
  const { data: catalogues = [], isLoading } = useQuery({ queryKey: ['admin-catalogues'], queryFn: adminService.catalogues });
  const { data: users = [] } = useQuery({ queryKey: ['admin-users'], queryFn: adminService.users });
  const { data: products = [] } = useQuery({ queryKey: ['admin-products'], queryFn: adminService.products });
  const [editingId, setEditingId] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [form, setForm] = useState(emptyCatalogue);

  const filteredProducts = useMemo(() => {
    const term = productSearch.toLowerCase().trim();
    if (!term) return products;
    return products.filter((product) =>
      [product.styleCode, product.name, product.category, product.collection]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [productSearch, products]);

  const filteredUsers = useMemo(() => {
    const term = userSearch.toLowerCase().trim();
    if (!term) return users;
    return users.filter((user) =>
      [user.name, user.email, user.companyName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [userSearch, users]);

  if (isLoading) return <LoadingBlock />;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Catalogues" title="Build private buyer catalogues" description="Search products and buyers, preview thumbnails, and manage assignments without manual IDs." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="lux-label">Catalogues</p>
            <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyCatalogue); }}>New Catalogue</Button>
          </div>
          {catalogues.map((catalogue) => (
            <button key={catalogue.id} className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-border-active)]" onClick={() => {
              setEditingId(catalogue.id);
              setForm({
                id: catalogue.id,
                name: catalogue.name,
                description: catalogue.description,
                coverImage: normalizeAsset(catalogue.coverImage),
                productIds: catalogue.productIds || [],
                assignedUserIds: catalogue.assignedUserIds || [],
                active: catalogue.active,
                archived: catalogue.archived,
              });
            }}>
              <Thumbnail asset={catalogue.coverImage || catalogue.products?.[0]?.media?.[0]} alt={catalogue.name} />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{catalogue.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{catalogue.productIds?.length || 0} products • {catalogue.assignedUserIds?.length || 0} buyers</p>
              </div>
            </button>
          ))}
        </Panel>

        <Panel className="space-y-4">
          <p className="lux-label">{editingId ? 'Edit Catalogue' : 'Create Catalogue'}</p>
          <Field label="Name"><input className={textInput} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Description"><textarea className={textareaInput} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
          <AssetField label="Cover image" value={form.coverImage} onChange={(coverImage) => setForm((current) => ({ ...current, coverImage }))} folder="dearte/catalogues" />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <Field label="Search products">
                <input className={textInput} value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Style code, name, category, collection" />
              </Field>
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {filteredProducts.map((product) => (
                  <label key={product.id} className="flex cursor-pointer items-center gap-3 rounded border border-[var(--color-border)] p-3">
                    <input
                      type="checkbox"
                      checked={form.productIds.includes(product.id)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          productIds: current.productIds.includes(product.id)
                            ? current.productIds.filter((id) => id !== product.id)
                            : [...current.productIds, product.id],
                        }))
                      }
                    />
                    <Thumbnail asset={product.media?.[0]} alt={product.name} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)]">{product.styleCode}</p>
                      <p className="truncate text-xs text-[var(--color-text-muted)]">{product.name}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Field label="Search buyers">
                <input className={textInput} value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Name, email, company" />
              </Field>
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {filteredUsers.map((user) => (
                  <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded border border-[var(--color-border)] p-3">
                    <input
                      type="checkbox"
                      checked={form.assignedUserIds.includes(user.id)}
                      onChange={() =>
                        setForm((current) => ({
                          ...current,
                          assignedUserIds: current.assignedUserIds.includes(user.id)
                            ? current.assignedUserIds.filter((id) => id !== user.id)
                            : [...current.assignedUserIds, user.id],
                        }))
                      }
                    />
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">{user.name}</p>
                      <p className="text-xs text-[var(--color-text-muted)]">{user.companyName || user.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.archived} onChange={(event) => setForm((current) => ({ ...current, archived: event.target.checked }))} /> Archived</label>
          </div>

          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingId) await adminService.updateCatalogue(editingId, form);
              else await adminService.createCatalogue(form);
              setEditingId(null);
              setForm(emptyCatalogue);
              queryClient.invalidateQueries({ queryKey: ['admin-catalogues'] });
            }}>{editingId ? 'Update Catalogue' : 'Create Catalogue'}</Button>
            {editingId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteCatalogue(editingId);
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
  const [siteSettingsDraft, setSiteSettingsDraft] = useState(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);
  const [subCategoryForm, setSubCategoryForm] = useState(emptySubCategory);
  const [collectionForm, setCollectionForm] = useState(emptyCollection);
  const [metalForm, setMetalForm] = useState(emptyMetalOption);
  const siteSettings = siteSettingsDraft || data?.siteSettings || emptySiteSettings;

  if (isLoading) return <LoadingBlock />;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-config'] });

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Configuration" title="Site settings and taxonomy managers" description="These records now power admin dropdowns and frontend content structure." />

      <Panel className="space-y-4">
        <p className="lux-label">Site settings</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name"><input className={textInput} value={siteSettings.companyName} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), companyName: event.target.value }))} /></Field>
          <Field label="Email"><input className={textInput} value={siteSettings.email} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), email: event.target.value }))} /></Field>
          <Field label="Phone"><input className={textInput} value={siteSettings.phone} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), phone: event.target.value }))} /></Field>
          <Field label="Hours"><input className={textInput} value={siteSettings.hours} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), hours: event.target.value }))} /></Field>
          <Field label="WhatsApp"><input className={textInput} value={siteSettings.whatsapp} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), whatsapp: event.target.value }))} /></Field>
          <Field label="Instagram"><input className={textInput} value={siteSettings.instagram} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), instagram: event.target.value }))} /></Field>
          <Field label="LinkedIn"><input className={textInput} value={siteSettings.linkedin} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), linkedin: event.target.value }))} /></Field>
          <Field label="Facebook"><input className={textInput} value={siteSettings.facebook} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), facebook: event.target.value }))} /></Field>
        </div>
        <Field label="Address"><textarea className={textareaInput} value={siteSettings.address} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), address: event.target.value }))} /></Field>
        <Field label="Maps Embed"><input className={textInput} value={siteSettings.mapsEmbed} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), mapsEmbed: event.target.value }))} /></Field>
        <Field label="Newsletter blurb"><textarea className={textareaInput} value={siteSettings.newsletterBlurb} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), newsletterBlurb: event.target.value }))} /></Field>
        <Button onClick={async () => {
          await adminService.updateConfig({ siteSettings });
          toast.success('Site settings updated');
          setSiteSettingsDraft(null);
          refresh();
        }}>Save Site Settings</Button>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <TaxonomyManager
          title="Categories"
          items={data.categories || []}
          onEdit={(item) => setCategoryForm({ ...item, image: normalizeAsset(item.image) })}
          onNew={() => setCategoryForm(emptyCategory)}
          onSave={async () => {
            if (categoryForm.id) await adminService.updateCategory(categoryForm.id, categoryForm);
            else await adminService.createCategory(categoryForm);
            setCategoryForm(emptyCategory);
            refresh();
          }}
          onDelete={categoryForm.id ? async () => {
            await adminService.deleteCategory(categoryForm.id);
            setCategoryForm(emptyCategory);
            refresh();
          } : null}
          saveLabel={categoryForm.id ? 'Update Category' : 'Create Category'}
        >
          <Field label="Name"><input className={textInput} value={categoryForm.name} onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Slug"><input className={textInput} value={categoryForm.slug} onChange={(event) => setCategoryForm((current) => ({ ...current, slug: event.target.value }))} /></Field>
          <AssetField label="Category image" value={categoryForm.image} onChange={(image) => setCategoryForm((current) => ({ ...current, image }))} folder="dearte/site/categories" />
        </TaxonomyManager>

        <TaxonomyManager
          title="Sub-categories"
          items={data.subCategories || []}
          onEdit={(item) => setSubCategoryForm({ ...item, image: normalizeAsset(item.image) })}
          onNew={() => setSubCategoryForm(emptySubCategory)}
          onSave={async () => {
            if (subCategoryForm.id) await adminService.updateSubCategory(subCategoryForm.id, subCategoryForm);
            else await adminService.createSubCategory(subCategoryForm);
            setSubCategoryForm(emptySubCategory);
            refresh();
          }}
          onDelete={subCategoryForm.id ? async () => {
            await adminService.deleteSubCategory(subCategoryForm.id);
            setSubCategoryForm(emptySubCategory);
            refresh();
          } : null}
          saveLabel={subCategoryForm.id ? 'Update Sub-category' : 'Create Sub-category'}
        >
          <Field label="Name"><input className={textInput} value={subCategoryForm.name} onChange={(event) => setSubCategoryForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Slug"><input className={textInput} value={subCategoryForm.slug} onChange={(event) => setSubCategoryForm((current) => ({ ...current, slug: event.target.value }))} /></Field>
          <Field label="Category">
            <select className={textInput} value={subCategoryForm.categoryId} onChange={(event) => setSubCategoryForm((current) => ({ ...current, categoryId: event.target.value }))}>
              <option value="">Select category</option>
              {(data.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <AssetField label="Sub-category image" value={subCategoryForm.image} onChange={(image) => setSubCategoryForm((current) => ({ ...current, image }))} folder="dearte/site/subcategories" />
        </TaxonomyManager>

        <TaxonomyManager
          title="Collections"
          items={data.collections || []}
          onEdit={(item) => setCollectionForm({ ...item, image: normalizeAsset(item.image) })}
          onNew={() => setCollectionForm(emptyCollection)}
          onSave={async () => {
            if (collectionForm.id) await adminService.updateCollection(collectionForm.id, collectionForm);
            else await adminService.createCollection(collectionForm);
            setCollectionForm(emptyCollection);
            refresh();
          }}
          onDelete={collectionForm.id ? async () => {
            await adminService.deleteCollection(collectionForm.id);
            setCollectionForm(emptyCollection);
            refresh();
          } : null}
          saveLabel={collectionForm.id ? 'Update Collection' : 'Create Collection'}
        >
          <Field label="Name"><input className={textInput} value={collectionForm.name} onChange={(event) => setCollectionForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Slug"><input className={textInput} value={collectionForm.slug} onChange={(event) => setCollectionForm((current) => ({ ...current, slug: event.target.value }))} /></Field>
          <Field label="Category">
            <select className={textInput} value={collectionForm.categoryId} onChange={(event) => setCollectionForm((current) => ({ ...current, categoryId: event.target.value }))}>
              <option value="">Select category</option>
              {(data.categories || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Sub-category">
            <select className={textInput} value={collectionForm.subCategoryId} onChange={(event) => setCollectionForm((current) => ({ ...current, subCategoryId: event.target.value }))}>
              <option value="">Select sub-category</option>
              {(data.subCategories || []).filter((item) => !collectionForm.categoryId || item.categoryId === collectionForm.categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <AssetField label="Collection image" value={collectionForm.image} onChange={(image) => setCollectionForm((current) => ({ ...current, image }))} folder="dearte/site/collections" />
        </TaxonomyManager>

        <TaxonomyManager
          title="Metal options"
          items={data.metalOptions || []}
          onEdit={(item) => setMetalForm({ ...item, swatch: normalizeAsset(item.swatch) })}
          onNew={() => setMetalForm(emptyMetalOption)}
          onSave={async () => {
            if (metalForm.id) await adminService.updateMetalOption(metalForm.id, metalForm);
            else await adminService.createMetalOption(metalForm);
            setMetalForm(emptyMetalOption);
            refresh();
          }}
          onDelete={metalForm.id ? async () => {
            await adminService.deleteMetalOption(metalForm.id);
            setMetalForm(emptyMetalOption);
            refresh();
          } : null}
          saveLabel={metalForm.id ? 'Update Metal Option' : 'Create Metal Option'}
        >
          <Field label="Name"><input className={textInput} value={metalForm.name} onChange={(event) => setMetalForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Group"><input className={textInput} value={metalForm.group} onChange={(event) => setMetalForm((current) => ({ ...current, group: event.target.value }))} /></Field>
          <AssetField label="Swatch" value={metalForm.swatch} onChange={(swatch) => setMetalForm((current) => ({ ...current, swatch }))} folder="dearte/site/metal-options" />
        </TaxonomyManager>
      </div>
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
      <SectionHeading eyebrow="Testimonials" title="Moderate and curate social proof" description="Testimonials, avatars, and status changes are fully backend-managed." />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="lux-label">Testimonials</p>
            <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyTestimonial); }}>New</Button>
          </div>
          {data.map((testimonial) => (
            <button key={testimonial.id} className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] p-3 text-left hover:border-[var(--color-border-active)]" onClick={() => {
              setEditingId(testimonial.id);
              setForm({ ...testimonial, avatar: normalizeAsset(testimonial.avatar) });
            }}>
              <Thumbnail asset={testimonial.avatar} alt={testimonial.name} />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{testimonial.name}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{testimonial.company} • {testimonial.status}</p>
              </div>
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
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Disapproved">Disapproved</option>
            </select>
          </Field>
          <Field label="Review"><textarea className={textareaInput} value={form.review} onChange={(event) => setForm((current) => ({ ...current, review: event.target.value }))} /></Field>
          <AssetField label="Avatar" value={form.avatar} onChange={(avatar) => setForm((current) => ({ ...current, avatar }))} folder="dearte/testimonials" />
          <div className="flex gap-3">
            <Button onClick={async () => {
              if (editingId) await adminService.updateTestimonial(editingId, form);
              else await adminService.createTestimonial(form);
              setEditingId(null);
              setForm(emptyTestimonial);
              queryClient.invalidateQueries({ queryKey: ['admin-testimonials'] });
            }}>{editingId ? 'Update Testimonial' : 'Create Testimonial'}</Button>
            {editingId ? <Button variant="danger" onClick={async () => {
              await adminService.deleteTestimonial(editingId);
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
      <SectionHeading eyebrow="Roles" title="Reference roles" description="Roles remain documented for future admin permission layering." />
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
  const [reportType, setReportType] = useState('product-wise');
  const { data = [], isLoading } = useQuery({
    queryKey: ['admin-reports', reportType],
    queryFn: () => adminService.reports(reportType),
  });

  if (isLoading) return <LoadingBlock />;

  const columns = data.length
    ? Object.keys(data[0]).map((key) => ({ key, label: key.replace(/([A-Z])/g, ' $1') }))
    : [];

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Reports" title="Operational reporting" description="Product, category, login, and buyer-order reports are pulled from the current Mongo-backed dataset." />
      <Panel className="space-y-4">
        <Field label="Report">
          <select className={textInput} value={reportType} onChange={(event) => setReportType(event.target.value)}>
            <option value="product-wise">Product wise</option>
            <option value="category-wise">Category wise</option>
            <option value="login-log">Login log</option>
            <option value="user-orders">User orders</option>
          </select>
        </Field>
        <DataTable columns={columns} rows={data} />
      </Panel>
    </div>
  );
}

export function AdminSyncPage() {
  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Removed" title="External sync removed" description="This platform no longer uses ERP or jewellery-system sync. Inventory, promotions, catalogues, and product media are managed directly from admin." />
    </div>
  );
}
