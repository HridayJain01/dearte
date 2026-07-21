import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { adminService } from '../services/adminService';
import { Button, LoadingBlock, Panel, SectionHeading, StatCard, StatusBadge } from '../components/ui/Primitives';
import { Download, Plus, Search, Trash2 } from 'lucide-react';
import { downloadDeArteOrderPdf } from '../utils/orderPdf';

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
  colorVariants: [],
  specifications: [],
  isNewArrival: false,
  isBestSeller: false,
  showToGuests: false,
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
  whatsappOperationsNumbers: '',
  orderNotificationEmails: '',
  instagram: '',
  linkedin: '',
  facebook: '',
  address: '',
  hours: '',
  mapsEmbed: '',
  newsletterBlurb: '',
  guestAccess: {
    showPopupPromo: true,
    showHeroSlider: true,
    showBrandExpression: true,
    showProcessImage: true,
    showCollections: true,
    showBestSellers: true,
    showNewArrivals: true,
    showTestimonials: true,
    showEvents: true,
    showTrustedBrands: true,
    showCTABanner: true,
    pageProducts: true,
    pageCollections: false,
    pageEvents: true,
    pageTestimonials: true,
    pageTrustedBrands: true,
  },
  guestCatalogue: {
    includeFlagged: true,
    categories: [],
    subCategories: [],
    collections: [],
    occasions: [],
  },
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
const emptyTrustedBrand = {
  name: '',
  sector: '',
  websiteUrl: '',
  logo: emptyAsset,
  active: true,
  sortOrder: 0,
};

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

// Product images are small (~500kb), so each upload costs more in round-trip overhead
// than in transfer. That makes the batch latency-bound, and a wider pool converts
// almost directly into throughput.
const UPLOAD_CONCURRENCY = 10;
// Cloudinary accepts a signed timestamp for an hour. Re-sign well inside that so a
// long folder import cannot fail halfway through on an expired signature.
const SIGNATURE_TTL_MS = 30 * 60 * 1000;

// The file is sent exactly as picked, with no transformation or quality parameters,
// so Cloudinary stores the untouched original.
async function postToCloudinary(file, signing) {
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
    throw new Error(`Upload failed for ${file.name} (${response.status})`);
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

// One signature covers every file in a batch, so a folder upload spends a single
// round trip on our API instead of one per image.
function createUploadSigner(folder) {
  let pending = null;
  let signedAt = 0;

  return function sign() {
    if (!pending || Date.now() - signedAt > SIGNATURE_TTL_MS) {
      signedAt = Date.now();
      pending = adminService.signUpload({ folder }).catch((error) => {
        pending = null;
        throw error;
      });
    }
    return pending;
  };
}

async function uploadFile(file, folder) {
  const signing = await adminService.signUpload({ folder });
  return postToCloudinary(file, signing);
}

// Uploads run through a small worker pool. Cloudinary is the bottleneck, not us, and
// a serial loop made a folder import take as long as the sum of every single file.
async function uploadFiles(files, folder, onProgress) {
  if (!files.length) return [];

  const sign = createUploadSigner(folder);
  const uploaded = new Array(files.length);
  let cursor = 0;
  let completed = 0;

  async function worker() {
    while (cursor < files.length) {
      const index = cursor;
      cursor += 1;
      const signing = await sign();
      uploaded[index] = await postToCloudinary(files[index], signing);
      completed += 1;
      onProgress?.(completed, files.length);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, files.length) }, worker),
  );

  return uploaded;
}

function Thumbnail({ asset, alt = '', size = 'h-12 w-12' }) {
  const src = typeof asset === 'string' ? asset : asset?.secureUrl;
  if (!src) {
    return <div className={`${size} rounded border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]`} />;
  }

  return <img src={src} alt={alt} className={`${size} rounded object-cover`} />;
}

function DataTable({ columns, rows, emptyMessage = 'No records.' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className="py-2.5 pr-4 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-10 text-center text-sm text-[var(--color-text-muted)]">
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row, index) => (
            <tr key={row.id || index} className="border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-alt)]">
              {columns.map((column) => (
                <td key={column.key} className="py-3.5 pr-4 align-middle">
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

// A bulk-imported style carries one image set per metal colour (e.g. Rose/White/Yellow
// Gold x Left/Right/Through/Top). The product form's MediaField only shows the primary
// colour's images, so this lets admins switch colour and see every imported view.
function ColorVariantGallery({ colorVariants, onChange }) {
  const variants = Array.isArray(colorVariants) ? colorVariants : [];
  const [activeColor, setActiveColor] = useState('');

  const active = variants.find((variant) => variant.color === activeColor) || variants[0];

  if (!variants.length) return null;

  const removeView = (viewName) => {
    if (!active) return;
    onChange?.(
      variants
        .map((variant) =>
          variant.color === active.color
            ? { ...variant, views: (variant.views || []).filter((item) => item.view !== viewName) }
            : variant,
        )
        .filter((variant) => (variant.views || []).length),
    );
  };

  return (
    <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium text-[var(--color-text)]">Imported color mapping</p>
        <p className="text-sm text-[var(--color-text-muted)]">
          {variants.length} colors •{' '}
          {variants.reduce((total, variant) => total + (variant.views?.length || 0), 0)} images
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {variants.map((variant) => {
          const isActive = active?.color === variant.color;
          return (
            <button
              key={variant.color}
              type="button"
              onClick={() => setActiveColor(variant.color)}
              className={`rounded border px-3 py-1.5 text-xs uppercase tracking-[0.12em] transition ${
                isActive
                  ? 'border-[var(--color-text)] bg-[var(--color-text)] text-[var(--color-surface)]'
                  : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text)]'
              }`}
            >
              {variant.color} ({variant.views?.length || 0})
            </button>
          );
        })}
      </div>

      {active?.views?.length ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {active.views.map((item) => (
            // Keyed by colour too: a bare view key lets React reuse the <img> node
            // across colours, which leaves the previous colour's image on screen.
            <figure
              key={`${active.color}-${item.view}`}
              className="overflow-hidden rounded border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <img
                src={item.asset?.secureUrl}
                alt={item.asset?.alt || `${active.color} ${item.view}`}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <figcaption className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs text-[var(--color-text-muted)]">
                <span className="truncate">{item.view}</span>
                {onChange ? (
                  <button
                    type="button"
                    onClick={() => removeView(item.view)}
                    className="shrink-0 text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                ) : null}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">No images for this color.</p>
      )}
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
      const uploaded = await uploadFiles(files, folder);
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

function roundSpecificationValue(attribute, value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  if (!/(wt|weight|carat)/i.test(attribute)) return trimmed;

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return trimmed;

  return parsed.toFixed(2);
}

function buildProductSpecifications(form) {
  const baseSpecifications = [
    { attribute: 'Metal', value: form.metal || '' },
    { attribute: 'Diamond Weight', value: `${Number(form.diamondWeight || 0).toFixed(2)} ct` },
    { attribute: 'Gold Weight', value: `${Number(form.goldWeight || 0).toFixed(2)} g` },
    { attribute: 'Diamond Quality', value: form.diamondQuality || '' },
    { attribute: 'Setting Type', value: form.settingType || '' },
    { attribute: 'Occasion', value: form.occasion || '' },
    { attribute: 'SKU', value: form.sku || `${form.styleCode}-SKU` },
  ].filter((item) => item.value);

  const seen = new Set(baseSpecifications.map((item) => item.attribute.toLowerCase()));
  const extraSpecifications = (Array.isArray(form.specifications) ? form.specifications : [])
    .map((item) => ({
      attribute: String(item?.attribute || '').trim(),
      value: roundSpecificationValue(item?.attribute, item?.value),
    }))
    .filter((item) => item.attribute && item.value)
    .filter((item) => {
      const key = item.attribute.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return [...baseSpecifications, ...extraSpecifications];
}

// Cleans the editable specification rows for persistence: trims labels, rounds
// weight/carat values, and drops empty rows. What admins see is what gets saved.
function normalizeEditedSpecifications(form) {
  return (Array.isArray(form.specifications) ? form.specifications : [])
    .map((item) => ({
      attribute: String(item?.attribute || '').trim(),
      value: roundSpecificationValue(item?.attribute, item?.value),
    }))
    .filter((item) => item.attribute && item.value);
}

function normalizeSheetHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getWorkbookRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
        resolve({ rows, sheetName: firstSheetName });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Could not read spreadsheet'));
    reader.readAsArrayBuffer(file);
  });
}

function summarizeImportRows(rows) {
  const summaryMap = new Map();

  rows.forEach((row) => {
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      normalized[normalizeSheetHeader(key)] = value;
    });

    const styleCode = String(
      normalized.styleno || normalized.stylecode || normalized.style || normalized.collectionstyleno || '',
    ).trim();
    const color = String(normalized.colour || normalized.color || '').trim();
    const view = String(normalized.view || '').trim();
    const category = String(normalized.category || normalized.productcategory || '').trim();
    const subCategory = String(normalized.subcategory || normalized.subcategoryname || '').trim();
    const collection = String(normalized.collection || normalized.collectionname || '').trim();

    if (!styleCode) return;

    const current = summaryMap.get(styleCode) || {
      styleCode,
      categories: new Set(),
      subCategories: new Set(),
      collections: new Set(),
      colors: new Set(),
      views: new Set(),
      rows: 0,
    };

    if (category) current.categories.add(category);
    if (subCategory) current.subCategories.add(subCategory);
    if (collection) current.collections.add(collection);
    if (color) current.colors.add(color);
    if (view) current.views.add(view);
    current.rows += 1;
    summaryMap.set(styleCode, current);
  });

  return [...summaryMap.values()]
    .map((item) => ({
      styleCode: item.styleCode,
      colorCount: item.colors.size,
      categories: [...item.categories],
      subCategories: [...item.subCategories],
      collections: [...item.collections],
      colors: [...item.colors],
      views: [...item.views],
      rows: item.rows,
    }))
    .sort((a, b) => a.styleCode.localeCompare(b.styleCode));
}

function getRowFileName(row) {
  const normalized = {};
  Object.entries(row || {}).forEach(([key, value]) => {
    normalized[normalizeSheetHeader(key)] = value;
  });

  return String(
    normalized.filename || normalized.file || normalized.image || normalized.imagename || '',
  ).trim();
}

function normalizeImportFileKey(value) {
  return String(value || '')
    .trim()
    .split(/[\\/]/)
    .pop()
    .toLowerCase();
}

function buildSheetFileSummary(rows, fileMap = new Map()) {
  const fileNames = [...new Set(rows.map(getRowFileName).filter(Boolean))];
  const matched = fileNames.filter((name) => fileMap.has(normalizeImportFileKey(name)));
  const missing = fileNames.filter((name) => !fileMap.has(normalizeImportFileKey(name)));

  return {
    required: fileNames.length,
    matched: matched.length,
    missingCount: missing.length,
    missing,
  };
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

  const addSpecification = () => {
    setForm((current) => ({
      ...current,
      specifications: [...(current.specifications || []), { attribute: '', value: '' }],
    }));
  };

  const updateSpecification = (index, key, value) => {
    setForm((current) => {
      const next = [...(current.specifications || [])];
      next[index] = { ...next[index], [key]: value };
      return { ...current, specifications: next };
    });
  };

  const removeSpecification = (index) => {
    setForm((current) => ({
      ...current,
      specifications: (current.specifications || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const autofillSpecifications = () => {
    setForm((current) => ({ ...current, specifications: buildProductSpecifications(current) }));
  };

  return (
    <Panel className="max-h-[780px] space-y-4 overflow-y-auto">
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
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.showToGuests} onChange={(event) => setForm((current) => ({ ...current, showToGuests: event.target.checked }))} /> Show to guests (preview)</label>
      </div>

      <ColorVariantGallery
        colorVariants={form.colorVariants}
        onChange={(colorVariants) => setForm((current) => ({ ...current, colorVariants }))}
      />

      <div className="border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium text-[var(--color-text)]">Specifications</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Attribute and value pairs shown on the product page. Imported rows are editable.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" onClick={autofillSpecifications}>Auto-fill from fields</Button>
            <Button variant="secondary" type="button" icon={Plus} onClick={addSpecification}>Add Row</Button>
          </div>
        </div>

        {form.specifications?.length ? (
          <div className="mt-4 space-y-2">
            {form.specifications.map((item, index) => (
              <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  className={textInput}
                  placeholder="Attribute"
                  value={item.attribute || ''}
                  onChange={(event) => updateSpecification(index, 'attribute', event.target.value)}
                />
                <input
                  className={textInput}
                  placeholder="Value"
                  value={item.value ?? ''}
                  onChange={(event) => updateSpecification(index, 'value', event.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeSpecification(index)}
                  aria-label="Remove specification"
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center border border-[var(--color-border)] text-[var(--color-text-muted)] transition hover:border-red-300 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--color-text-muted)]">
            No specifications yet. Add a row or import a sheet to populate them.
          </p>
        )}
      </div>

      <MediaField value={form.media} onChange={(media) => setForm((current) => ({ ...current, media }))} folder={`dearte/products/${form.styleCode || 'draft'}`} />

      <div className="flex gap-3">
        <Button onClick={onSave}>{form.id ? 'Update Product' : 'Create Product'}</Button>
        {onDelete ? <Button variant="danger" onClick={onDelete}>Delete</Button> : null}
      </div>
    </Panel>
  );
}

function BulkProductImportPanel({ onImported }) {
  const [importFileName, setImportFileName] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [summaryRows, setSummaryRows] = useState([]);
  const [folderFiles, setFolderFiles] = useState([]);
  const [folderFileMap, setFolderFileMap] = useState(new Map());
  const [sheetFileSummary, setSheetFileSummary] = useState({
    required: 0,
    matched: 0,
    missingCount: 0,
    missing: [],
  });
  const [importing, setImporting] = useState(false);
  const [cloudinaryBaseUrl, setCloudinaryBaseUrl] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  // Taxonomy comes from the sheet itself, so only upload-wide defaults live here.
  const [importOptions, setImportOptions] = useState({
    stockType: 'Ready Stock',
    stockQuantity: 10,
    status: 'Active',
    isNewArrival: false,
    isBestSeller: false,
  });

  const handleSheetUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = await getWorkbookRows(file);
      const nextRows = Array.isArray(workbook.rows) ? workbook.rows : [];
      setImportFileName(file.name);
      setSheetName(workbook.sheetName);
      setParsedRows(nextRows);
      setSummaryRows(summarizeImportRows(nextRows));
      setSheetFileSummary(buildSheetFileSummary(nextRows, folderFileMap));
      toast.success(`Loaded ${nextRows.length} rows from ${file.name}`);
    } catch (error) {
      toast.error(error.message || 'Could not read spreadsheet');
    } finally {
      event.target.value = '';
    }
  };

  const handleFolderUpload = (event) => {
    const nextFiles = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(file.name));
    const nextMap = new Map();

    nextFiles.forEach((file) => {
      const normalizedName = normalizeImportFileKey(file.webkitRelativePath || file.name);
      nextMap.set(normalizedName, file);
      nextMap.set(normalizeImportFileKey(file.name), file);
    });

    setFolderFiles(nextFiles);
    setFolderFileMap(nextMap);
    setSheetFileSummary(buildSheetFileSummary(parsedRows, nextMap));
    toast.success(`Loaded ${nextFiles.length} images from folder`);
    event.target.value = '';
  };

  const uploadFolderAssetsForRows = async (rows) => {
    const fileNames = [...new Set(rows.map(getRowFileName).filter(Boolean))];
    const missing = fileNames.filter((name) => !folderFileMap.has(normalizeImportFileKey(name)));

    if (missing.length) {
      throw new Error(`Missing ${missing.length} image file(s). First missing file: ${missing[0]}`);
    }

    const matchedNames = fileNames.filter((name) =>
      folderFileMap.has(normalizeImportFileKey(name)),
    );
    const matchedFiles = matchedNames.map((name) =>
      folderFileMap.get(normalizeImportFileKey(name)),
    );

    const assets = await uploadFiles(matchedFiles, 'dearte/products/bulk-import', (done, total) =>
      setUploadProgress({ done, total }),
    );

    const uploadedAssets = new Map(
      matchedNames.map((name, index) => [normalizeImportFileKey(name), assets[index]]),
    );

    return rows.map((row) => {
      const fileName = getRowFileName(row);
      const asset = uploadedAssets.get(normalizeImportFileKey(fileName));
      return asset
        ? {
            ...row,
            cloudinaryUrl: asset.secureUrl,
          }
        : row;
    });
  };

  const handleImport = async () => {
    if (!parsedRows.length) {
      toast.error('Upload the spreadsheet first.');
      return;
    }

    try {
      setImporting(true);
      setImportErrors([]);
      setUploadProgress(null);
      let rowsForImport = parsedRows;

      if (folderFiles.length) {
        rowsForImport = await uploadFolderAssetsForRows(parsedRows);
      }

      // Category, sub-category, collection and metal colour are read per row from the
      // sheet and created on demand, so only the upload defaults are sent here.
      const result = await adminService.bulkImportProducts({
        rows: rowsForImport,
        cloudinaryBaseUrl: cloudinaryBaseUrl.trim(),
        stockQuantity: importOptions.stockQuantity,
        isNewArrival: importOptions.isNewArrival,
        isBestSeller: importOptions.isBestSeller,
      });

      setImportErrors(result.errors || []);
      if (result.summary?.skippedRows) {
        toast.error(
          `Imported ${result.summary.totalProducts} styles, skipped ${result.summary.skippedRows} row(s)`,
        );
      } else {
        toast.success(`Imported ${result.summary.totalProducts} styles`);
      }
      onImported?.(result);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Bulk import failed');
    } finally {
      setImporting(false);
      setUploadProgress(null);
    }
  };

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="lux-label">Bulk Excel Import</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Group rows by style code, then map each color and view to its Cloudinary image.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 border border-[var(--color-border)] px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--color-text)] transition hover:border-[var(--color-border-active)]">
            Upload Sheet
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleSheetUpload}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 border border-[var(--color-border)] px-4 py-2.5 text-[12px] font-medium uppercase tracking-[0.12em] text-[var(--color-text)] transition hover:border-[var(--color-border-active)]">
            Upload Image Folder
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFolderUpload}
              webkitdirectory=""
              directory=""
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Cloudinary base URL (optional)">
          <input
            className={textInput}
            value={cloudinaryBaseUrl}
            onChange={(event) => setCloudinaryBaseUrl(event.target.value)}
            placeholder="https://res.cloudinary.com/<cloud>/image/upload/v123/dearte/products"
          />
        </Field>
        <Field label="Default stock quantity">
          <input
            type="number"
            min="0"
            className={textInput}
            value={importOptions.stockQuantity}
            onChange={(event) => setImportOptions((current) => ({ ...current, stockQuantity: Number(event.target.value) }))}
          />
        </Field>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-muted)]">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={importOptions.isNewArrival}
            onChange={(event) => setImportOptions((current) => ({ ...current, isNewArrival: event.target.checked }))}
          />
          Mark imported products as new arrivals
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={importOptions.isBestSeller}
            onChange={(event) => setImportOptions((current) => ({ ...current, isBestSeller: event.target.checked }))}
          />
          Mark imported products as best sellers
        </label>
      </div>

      <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 text-sm text-[var(--color-text-muted)]">
        <p>File: {importFileName || 'No spreadsheet loaded yet'}</p>
        <p>Sheet: {sheetName || '-'}</p>
        <p>Rows: {parsedRows.length}</p>
        <p>Styles detected: {summaryRows.length}</p>
        <p>Folder images loaded: {folderFiles.length}</p>
        <p>Sheet image matches: {sheetFileSummary.matched} / {sheetFileSummary.required}</p>
      </div>

      {sheetFileSummary.missingCount ? (
        <div className="border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Missing {sheetFileSummary.missingCount} sheet image file(s) from the uploaded folder.
          {sheetFileSummary.missing[0] ? ` First missing file: ${sheetFileSummary.missing[0]}` : ''}
        </div>
      ) : null}

      {importErrors.length ? (
        <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-medium">
            {importErrors.length} row(s) were skipped. Fix these in the sheet and re-upload:
          </p>
          <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5">
            {importErrors.map((item, index) => (
              <li key={`${item.row}-${item.styleCode}-${index}`}>
                {item.row ? `Row ${item.row}` : 'Style'} {item.styleCode ? `(${item.styleCode})` : ''}: {item.reason}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {summaryRows.length ? (
        <div className="max-h-[320px] overflow-y-auto rounded border border-[var(--color-border)]">
          <DataTable
            columns={[
              { key: 'styleCode', label: 'Style Code' },
              { key: 'rows', label: 'Rows' },
              { key: 'categories', label: 'Category', render: (value) => value.join(', ') || '-' },
              { key: 'subCategories', label: 'Sub-category', render: (value) => value.join(', ') || '-' },
              { key: 'collections', label: 'Collection', render: (value) => value.join(', ') || '-' },
              { key: 'colorCount', label: 'Colors' },
              { key: 'views', label: 'Views', render: (value) => value.join(', ') || '-' },
              { key: 'colors', label: 'Color Names', render: (value) => value.join(', ') || '-' },
            ]}
            rows={summaryRows}
          />
        </div>
      ) : (
        <div className="rounded border border-dashed border-[var(--color-border)] px-4 py-6 text-sm text-[var(--color-text-muted)]">
          Upload the Excel first. Required columns are `Style No`, `Category`, `Colour`, `View`, `File Name`, and the six Gross/Net weight columns (18kt, 14kt, 9kt). `Sub Category`, `Collection`, `Occasion 1-4` and `Colour Stone Wt` may be left blank. Category, sub-category and collection are read from each row and created automatically if they do not exist yet. If you upload an image folder too, the importer will match by filename and upload those images to Cloudinary for you.
        </div>
      )}

      <div className="flex gap-3">
        <Button onClick={handleImport} disabled={importing || !summaryRows.length}>
          {!importing
            ? 'Import / Update Products'
            : uploadProgress
              ? `Uploading images ${uploadProgress.done}/${uploadProgress.total}...`
              : 'Importing...'}
        </Button>
      </div>
    </Panel>
  );
}

function TaxonomyManager({ title, items, onSave, onDelete, children, onEdit, onNew, saveLabel }) {
  return (
    <Panel className="flex h-[540px] flex-col space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
        <p className="lux-label">{title}</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onNew}>New</Button>
          <Button onClick={onSave}>{saveLabel}</Button>
          {onDelete ? <Button variant="danger" onClick={onDelete}>Delete</Button> : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <div className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              className="flex w-full items-center gap-3 rounded border border-[var(--color-border)] px-3 py-2 text-left hover:border-[var(--color-border-active)]"
              onClick={() => onEdit(item)}
            >
                <Thumbnail asset={item.logo || item.image || item.swatch} alt={item.name} />
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">{item.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{item.slug || item.group || item.sector || ''}</p>
              </div>
            </button>
          ))}
        </div>
        {children}
      </div>
    </Panel>
  );
}

export function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminService.dashboard });
  const [downloadingOrderId, setDownloadingOrderId] = useState(null);
  if (isLoading) return <LoadingBlock />;

  const stats = data?.stats || {};

  const handleDownloadOrder = async (order) => {
    try {
      setDownloadingOrderId(order.id || order.orderId);
      await downloadDeArteOrderPdf({ order, user: order.user || {} });
      toast.success(`Downloaded ${order.orderId}`);
    } catch (error) {
      toast.error(error?.message || 'Could not generate PDF');
    } finally {
      setDownloadingOrderId(null);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
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
            { key: 'status', label: 'Status', render: (value) => <StatusBadge status={value} /> },
            { key: 'createdAt', label: 'Created', render: (value) => new Date(value).toLocaleString('en-IN') },
            {
              key: 'download',
              label: 'PDF',
              render: (_value, row) => (
                <Button
                  variant="ghost"
                  className="px-3 py-2 text-[11px]"
                  icon={Download}
                  loading={downloadingOrderId === (row.id || row.orderId)}
                  onClick={() => handleDownloadOrder(row)}
                >
                  Download
                </Button>
              ),
            },
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
    <div className="space-y-5 sm:space-y-8">
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

function accessSummary(user) {
  if (user.role === 'sales') return 'Full catalogue (sales)';
  if (!user.catalogAccess || user.catalogAccess.mode === 'all') return 'Full catalogue';
  const cats = user.catalogAccess.categories?.length || 0;
  const cols = user.catalogAccess.collections?.length || 0;
  if (!cats && !cols) return 'Restricted — nothing granted';
  const parts = [];
  if (cats) parts.push(`${cats} categor${cats === 1 ? 'y' : 'ies'}`);
  if (cols) parts.push(`${cols} collection${cols === 1 ? '' : 's'}`);
  return `Restricted — ${parts.join(', ')}`;
}

function UserAccessEditor({ user, config, onClose }) {
  const queryClient = useQueryClient();
  const categories = config?.categories || [];

  const [role, setRole] = useState(user.role === 'sales' ? 'sales' : 'buyer');
  const [mode, setMode] = useState(user.catalogAccess?.mode || 'all');
  const [selectedCats, setSelectedCats] = useState(() => new Set(user.catalogAccess?.categories || []));
  const [selectedCols, setSelectedCols] = useState(() => new Set(user.catalogAccess?.collections || []));
  const [saving, setSaving] = useState(false);

  const collectionsByCategory = useMemo(() => {
    const map = new Map();
    (config?.collections || []).forEach((col) => {
      const key = col.categoryId || 'other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(col);
    });
    return map;
  }, [config]);

  const toggle = (setFn) => (id) =>
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleCat = toggle(setSelectedCats);
  const toggleCol = toggle(setSelectedCols);

  const save = async () => {
    setSaving(true);
    try {
      await adminService.updateUser(user.id, {
        role,
        catalogAccess: {
          mode: role === 'sales' ? 'all' : mode,
          categories: [...selectedCats],
          collections: [...selectedCols],
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Access updated');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update access');
    } finally {
      setSaving(false);
    }
  };

  const restricted = role === 'buyer' && mode === 'restricted';

  return (
    <Panel className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="lux-label">Catalogue access</p>
          <p className="text-sm text-[var(--color-text-muted)]">{user.name} · {user.email}</p>
        </div>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Role">
          <select className={textInput} value={role} onChange={(event) => setRole(event.target.value)}>
            <option value="buyer">Buyer</option>
            <option value="sales">Sales (full access)</option>
          </select>
        </Field>
        {role === 'buyer' ? (
          <Field label="Catalogue visibility">
            <select className={textInput} value={mode} onChange={(event) => setMode(event.target.value)}>
              <option value="all">Full catalogue</option>
              <option value="restricted">Restricted to selected</option>
            </select>
          </Field>
        ) : (
          <div className="flex items-end text-sm text-[var(--color-text-muted)]">
            Sales accounts can view the entire catalogue.
          </div>
        )}
      </div>

      {restricted ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="lux-label">Allowed categories</p>
            <p className="text-xs text-[var(--color-text-muted)]">Granting a category gives access to every product and collection inside it.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 border border-[var(--color-border)] p-2 text-sm">
                  <input type="checkbox" checked={selectedCats.has(cat.id)} onChange={() => toggleCat(cat.id)} />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="lux-label">Allowed collections</p>
            <p className="text-xs text-[var(--color-text-muted)]">Use these to grant individual collections without opening the whole category.</p>
            <div className="space-y-4">
              {categories.map((cat) => {
                const cols = collectionsByCategory.get(cat.id) || [];
                if (!cols.length) return null;
                return (
                  <div key={cat.id} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{cat.name}</p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {cols.map((col) => (
                        <label key={col.id} className={`flex items-center gap-2 border p-2 text-sm ${selectedCats.has(cat.id) ? 'border-dashed border-[var(--color-border)] opacity-60' : 'border-[var(--color-border)]'}`}>
                          <input
                            type="checkbox"
                            checked={selectedCols.has(col.id) || selectedCats.has(cat.id)}
                            disabled={selectedCats.has(cat.id)}
                            onChange={() => toggleCol(col.id)}
                          />
                          <span>{col.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save access'}</Button>
      </div>
    </Panel>
  );
}

export function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['admin-users'], queryFn: adminService.users });
  const { data: config } = useQuery({ queryKey: ['admin-config'], queryFn: adminService.config });
  const [editingUserId, setEditingUserId] = useState(null);
  if (isLoading) return <LoadingBlock />;

  const editingUser = data.find((user) => user.id === editingUserId) || null;

  return (
    <div className="space-y-5 sm:space-y-8">
      <SectionHeading eyebrow="Users" title="Buyer account management" description="Approve accounts, set sales roles, and control which categories or collections each buyer can view." />

      {editingUser ? (
        <UserAccessEditor user={editingUser} config={config} onClose={() => setEditingUserId(null)} />
      ) : null}

      <Panel>
        <DataTable
          columns={[
            { key: 'name', label: 'Buyer' },
            { key: 'email', label: 'Email' },
            { key: 'companyName', label: 'Company' },
            {
              key: 'role',
              label: 'Role',
              render: (value, row) => (
                <select
                  className={textInput}
                  value={value === 'sales' ? 'sales' : 'buyer'}
                  onChange={async (event) => {
                    await adminService.updateUser(row.id, { role: event.target.value });
                    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                  }}
                >
                  <option value="buyer">Buyer</option>
                  <option value="sales">Sales</option>
                </select>
              ),
            },
            {
              key: 'catalogAccess',
              label: 'Catalogue access',
              render: (_value, row) => (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--color-text-muted)]">{accessSummary(row)}</span>
                  <Button variant="secondary" onClick={() => setEditingUserId(row.id)}>Manage</Button>
                </div>
              ),
            },
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
  const [search, setSearch] = useState('');

  if (isLoading || !config) return <LoadingBlock />;

  const query = search.trim().toLowerCase();
  const filteredProducts = query
    ? products.filter((product) =>
        [product.styleCode, product.name, product.sku, product.category, product.collection]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      )
    : products;

  const saveProduct = async () => {
    const payload = {
      ...form,
      media: form.media,
      colorVariants: form.colorVariants || [],
      customizationOptions: {
        goldColors: form.colorVariants?.length
          ? form.colorVariants.map((variant) => variant.color)
          : ['Yellow Gold', 'Rose Gold', 'White Gold'],
        goldCarats: ['9K', '14K', '18K'],
        diamondQualities: ['SI-IJ', 'VS-GH', 'VVS-EF'],
      },
      specifications: normalizeEditedSpecifications(form),
    };

    if (editingId) await adminService.updateProduct(editingId, payload);
    else await adminService.createProduct(payload);

    toast.success(`Product ${editingId ? 'updated' : 'created'}`);
    setEditingId(null);
    setForm(emptyProduct);
    queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <SectionHeading eyebrow="Inventory" title="Create and manage products" description="Products, media, and stock now live in MongoDB and are editable from admin." />
      <BulkProductImportPanel
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-products'] });
        }}
      />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="lux-label">Products</p>
            <Button variant="secondary" onClick={() => { setEditingId(null); setForm(emptyProduct); }}>New Product</Button>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by style code, name, SKU, category…"
              className={`${textInput} pl-9`}
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {filteredProducts.length} of {products.length} products
          </p>
          <div className="max-h-[780px] space-y-3 overflow-y-auto pr-1">
            {filteredProducts.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No products match “{search}”.</p>
            )}
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                className={`flex w-full items-center gap-3 border p-4 text-left transition hover:border-[var(--color-border-active)] ${editingId === product.id ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)]' : 'border-[var(--color-border)]'}`}
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
                    colorVariants: product.colorVariants || [],
                    specifications: product.specifications || [],
                    isNewArrival: product.isNewArrival,
                    isBestSeller: product.isBestSeller,
                    showToGuests: product.showToGuests,
                    sku: product.sku,
                  });
                }}
              >
                <Thumbnail asset={product.media?.[0]} alt={product.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-[var(--color-text)]">{product.styleCode}</p>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="truncate text-sm text-[var(--color-text-muted)]">{product.name}</p>
                  <p className="mt-1 truncate text-xs text-[var(--color-text-muted)]">
                    {[product.category, product.collection].filter(Boolean).join(' › ') || 'No collection'}
                  </p>
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
  const orderTotalDiamondWeight = (selectedOrder?.items || []).reduce((s, it) => s + (Number(it.product?.diamondWeight || 0) * (it.quantity || 1)), 0);
  const orderTotalGoldWeight = (selectedOrder?.items || []).reduce((s, it) => s + (Number(it.product?.goldWeight || 0) * (it.quantity || 1)), 0);
  const [statusChangeFlow, setStatusChangeFlow] = useState(null);
  const [statusNotifyOptionalNote, setStatusNotifyOptionalNote] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    setStatusChangeFlow(null);
    setStatusNotifyOptionalNote('');
  }, [selectedOrder?.id]);

  if (isLoading) return <LoadingBlock />;

  const displayedStatusSelect = statusChangeFlow?.next ?? selectedOrder?.status ?? 'Pending';

  const applyOrderStatusChange = async ({ whatsapp = false, email = false } = {}) => {
    if (!selectedOrder || !statusChangeFlow?.next || statusSaving) return;
    try {
      setStatusSaving(true);
      await adminService.updateOrder(selectedOrder.id, {
        status: statusChangeFlow.next,
        notifyCustomerViaWhatsapp: whatsapp,
        notifyCustomerViaEmail: email,
        notifyCustomerMessage: statusNotifyOptionalNote,
      });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setStatusChangeFlow(null);
      setStatusNotifyOptionalNote('');
      const channels = [whatsapp && 'WhatsApp', email && 'email'].filter(Boolean).join(' & ');
      toast.success(channels ? `Order saved and ${channels} sent (if buyer details on file).` : 'Order saved.');
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Could not update order.';
      toast.error(msg);
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <SectionHeading eyebrow="Orders" title="Review and edit buyer orders" description="When you change order status, confirm whether WhatsApp notification should reach the buyer. Order confirmations with PDF attach automatically." />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel className="space-y-2">
          {data.map((order) => (
            <button
              key={order.id}
              className={`w-full border p-4 text-left transition hover:border-[var(--color-border-active)] ${selectedOrderId === order.id ? 'border-[var(--color-border-active)] bg-[var(--color-surface-alt)]' : 'border-[var(--color-border)]'}`}
              onClick={() => setSelectedOrderId(order.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[var(--color-text)]">{order.orderId}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">{order.user?.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{new Date(order.createdAt).toLocaleString('en-IN')}</p>
            </button>
          ))}
        </Panel>
        {selectedOrder ? (
          <Panel className="space-y-4">
            <p className="lux-label">Order detail</p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Buyer"><input className={textInput} value={selectedOrder.user?.name || ''} readOnly /></Field>
              <Field label="Status">
                <select
                  key={selectedOrder.id}
                  className={textInput}
                  value={displayedStatusSelect}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === selectedOrder.status) {
                      setStatusChangeFlow(null);
                      return;
                    }
                    setStatusChangeFlow({ next });
                  }}
                >
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
            {statusChangeFlow ? (
              <div className="space-y-3 rounded border border-[var(--color-border-active)] bg-[var(--color-surface-alt)] p-4">
                <p className="text-sm text-[var(--color-text)]">
                  Status goes from “{selectedOrder.status}” to “{statusChangeFlow.next}”. Choose how to notify the buyer, then save.
                </p>
                <Field label="Optional note for buyer (added to the notification)">
                  <textarea
                    className={textareaInput}
                    value={statusNotifyOptionalNote}
                    placeholder="Shipment tracking reference, ETA, pickup instructions..."
                    rows={3}
                    onChange={(event) => setStatusNotifyOptionalNote(event.target.value)}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button loading={statusSaving} onClick={() => applyOrderStatusChange({ whatsapp: true, email: true })}>Notify WhatsApp + Email and save</Button>
                  <Button variant="secondary" loading={statusSaving} onClick={() => applyOrderStatusChange({ email: true })}>Email only and save</Button>
                  <Button variant="secondary" loading={statusSaving} onClick={() => applyOrderStatusChange({ whatsapp: true })}>WhatsApp only and save</Button>
                  <Button variant="secondary" loading={statusSaving} onClick={() => applyOrderStatusChange({})}>Save without notifying</Button>
                  <Button variant="ghost" disabled={statusSaving} onClick={() => setStatusChangeFlow(null)}>Cancel</Button>
                </div>
              </div>
            ) : null}
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
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {[item.customization?.goldColor, item.customization?.goldCarat, item.customization?.diamondQuality, item.customization?.size ? `Size ${item.customization.size}` : '']
                        .filter(Boolean)
                        .join(' • ')}
                    </p>
                    {item.customization?.note ? (
                      <p className="mt-1 text-xs text-[var(--color-text)]">Custom request: {item.customization.note}</p>
                    ) : null}
                    {(item.changeRequests || []).map((cr) => (
                      <div
                        key={cr.id}
                        className={`mt-2 flex items-start justify-between gap-2 border-l-2 px-3 py-2 ${cr.status === 'Open' ? 'border-amber-400 bg-amber-50' : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'}`}
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-amber-700">Change request</p>
                          <p className="text-xs text-[var(--color-text)]">{cr.message}</p>
                        </div>
                        <div className="flex flex-shrink-0 flex-col items-end gap-1">
                          <StatusBadge status={cr.status} />
                          {cr.status === 'Open' ? (
                            <Button
                              variant="ghost"
                              className="px-2 py-1 text-[10px]"
                              onClick={async () => {
                                try {
                                  await adminService.resolveChangeRequest(selectedOrder.id, cr.id);
                                  queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
                                  toast.success('Change request resolved.');
                                } catch (error) {
                                  toast.error(error?.response?.data?.message || error?.message || 'Could not resolve.');
                                }
                              }}
                            >
                              Mark resolved
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded border border-[var(--color-border)] p-3">
                  <p className="text-xs text-[var(--color-text-muted)]">Total Diamond Weight</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{orderTotalDiamondWeight.toFixed(2)} ct</p>
                </div>
                <div className="rounded border border-[var(--color-border)] p-3">
                  <p className="text-xs text-[var(--color-text-muted)]">Total Gold Weight</p>
                  <p className="mt-1 text-sm font-semibold text-[var(--color-text)]">{orderTotalGoldWeight.toFixed(2)} g</p>
                </div>
              </div>
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
    <div className="space-y-5 sm:space-y-8">
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

export function AdminWhatsAppPage() {
  const queryClient = useQueryClient();
  const { data: waStatus, isLoading: waLoading } = useQuery({
    queryKey: ['admin-whatsapp-status'],
    queryFn: adminService.whatsappStatus,
  });
  const { data: emailStatus, isLoading: emailLoading } = useQuery({
    queryKey: ['admin-email-status'],
    queryFn: adminService.emailStatus,
  });
  const { data: buyers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.users,
  });

  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('selected');
  const [selectedBuyerIds, setSelectedBuyerIds] = useState(() => new Set());
  const [mediaKind, setMediaKind] = useState('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFilename, setMediaFilename] = useState('attachment.pdf');
  const [sending, setSending] = useState(false);

  const [emailSubject, setEmailSubject] = useState('');
  const [emailHeading, setEmailHeading] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailCtaLabel, setEmailCtaLabel] = useState('');
  const [emailCtaUrl, setEmailCtaUrl] = useState('');
  const [emailSending, setEmailSending] = useState(false);

  const buyerSearchList = useMemo(() => [...buyers].sort((a, b) => a.name.localeCompare(b.name)), [buyers]);

  if (waLoading || emailLoading || usersLoading) return <LoadingBlock />;

  const toggleBuyer = (id) => {
    setSelectedBuyerIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBroadcast = async () => {
    const trimmedMsg = message.trim();
    const trimmedUrl = mediaUrl.trim();
    if (!trimmedMsg && !trimmedUrl) {
      toast.error('Enter a message, an https media URL, or both.');
      return;
    }

    const payload = {
      audience,
      userIds: audience === 'selected' ? [...selectedBuyerIds] : [],
      message: trimmedMsg,
      mediaKind: trimmedUrl ? mediaKind : 'none',
      mediaUrl: trimmedUrl,
      mediaFilename: mediaFilename.trim() || 'attachment.pdf',
    };

    if (audience === 'selected' && payload.userIds.length === 0) {
      toast.error('Select at least one buyer.');
      return;
    }

    try {
      setSending(true);
      const result = await adminService.whatsappBroadcast(payload);
      const totals = result?.totals || {};
      toast.success(`Sent ${totals.sent || 0}, skipped ${totals.skipped || 0}, failed ${totals.failed || 0}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-whatsapp-status'] });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Broadcast failed.');
    } finally {
      setSending(false);
    }
  };

  const runEmailBroadcast = async () => {
    const subject = emailSubject.trim();
    const body = emailBody.trim();
    if (!subject) {
      toast.error('Enter an email subject.');
      return;
    }
    if (!body) {
      toast.error('Enter an email message.');
      return;
    }
    const userIds = audience === 'selected' ? [...selectedBuyerIds] : [];
    if (audience === 'selected' && userIds.length === 0) {
      toast.error('Select at least one buyer.');
      return;
    }

    // Convert newlines to <br> so plain-typed paragraphs render in HTML email.
    const bodyHtml = body
      .split(/\n{2,}/)
      .map((para) => `<p>${para.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const payload = {
      audience,
      userIds,
      subject,
      heading: emailHeading.trim(),
      bodyHtml,
      bodyText: body,
      ctaLabel: emailCtaLabel.trim(),
      ctaUrl: emailCtaUrl.trim(),
    };

    try {
      setEmailSending(true);
      const result = await adminService.emailBroadcast(payload);
      const totals = result?.totals || {};
      toast.success(`Sent ${totals.sent || 0}, skipped ${totals.skipped || 0}, failed ${totals.failed || 0}.`);
      queryClient.invalidateQueries({ queryKey: ['admin-email-status'] });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Email broadcast failed.');
    } finally {
      setEmailSending(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-8">
      <SectionHeading
        eyebrow="WhatsApp"
        title="Cloud API broadcasts"
        description="Send trade updates with optional CDN-hosted media (image, video, or document link). Recipient phones must accept messages from your business number and use international format on profiles."
      />

      <Panel className="space-y-4">
        <p className="lux-label">Connection status</p>
        {waStatus?.configured ? (
          <p className="text-sm text-[var(--color-text-muted)]">WhatsApp Cloud API credentials are configured on the server.</p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Not ready: {(waStatus?.missing || []).join(', ') || 'Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID'}.
          </p>
        )}
      </Panel>

      <Panel className="space-y-4">
        <p className="lux-label">Audience</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={audience === 'selected'} onChange={() => setAudience('selected')} /> Selected buyers ({selectedBuyerIds.size})
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" checked={audience === 'all_active_buyers'} onChange={() => setAudience('all_active_buyers')} /> All active buyers
          </label>
        </div>

        {audience === 'selected' ? (
          <div className="max-h-[280px] space-y-2 overflow-y-auto rounded border border-[var(--color-border)] p-3">
            {buyerSearchList.map((user) => (
              <label key={user.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={selectedBuyerIds.has(user.id)} onChange={() => toggleBuyer(user.id)} />
                <span className="font-medium text-[var(--color-text)]">{user.name}</span>
                <span className="text-[var(--color-text-muted)]">{user.email || 'No email'}</span>
                <span className="text-[var(--color-text-muted)]">· {user.mobile || 'No mobile'}</span>
              </label>
            ))}
          </div>
        ) : null}

        <Field label="Message body">
          <textarea className={textareaInput} rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hi from De Arté — new collection preview inside." />
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Media type (optional)">
            <select className={textInput} value={mediaKind} onChange={(event) => setMediaKind(event.target.value)}>
              <option value="none">Text only</option>
              <option value="image">Image (https link)</option>
              <option value="video">Video (https link)</option>
              <option value="document">Document (https link)</option>
            </select>
          </Field>
          <Field label="Public https URL (Cloudinary, etc.)">
            <input className={textInput} value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://res.cloudinary.com/..." />
          </Field>
        </div>
        {mediaKind === 'document' ? (
          <Field label="Filename shown in WhatsApp">
            <input className={textInput} value={mediaFilename} onChange={(event) => setMediaFilename(event.target.value)} />
          </Field>
        ) : null}

        <Button loading={sending} onClick={runBroadcast} disabled={!waStatus?.configured}>
          Send broadcast
        </Button>
      </Panel>

      <SectionHeading
        eyebrow="Email"
        title="Promotional email broadcasts"
        description="Send a branded email to the audience selected above. Uses the same buyer selection as the WhatsApp panel."
      />

      <Panel className="space-y-4">
        <p className="lux-label">Connection status</p>
        {emailStatus?.configured ? (
          <p className="text-sm text-[var(--color-text-muted)]">Email is configured on the server (from {emailStatus?.from || 'configured sender'}).</p>
        ) : (
          <p className="text-sm text-[var(--color-text-muted)]">
            Not ready: {(emailStatus?.missing || []).join(', ') || 'Set EMAIL_USER and EMAIL_PASSWORD'}.
          </p>
        )}
      </Panel>

      <Panel className="space-y-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          Sending to: {audience === 'all_active_buyers' ? 'all active buyers' : `${selectedBuyerIds.size} selected buyer(s)`}. Change the audience in the panel above.
        </p>
        <Field label="Subject">
          <input className={textInput} value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} placeholder="New collection preview from De Arté" />
        </Field>
        <Field label="Heading (optional, shown large at top)">
          <input className={textInput} value={emailHeading} onChange={(event) => setEmailHeading(event.target.value)} placeholder="Introducing the Aurora line" />
        </Field>
        <Field label="Message body (plain text — blank lines become paragraphs)">
          <textarea className={textareaInput} rows={6} value={emailBody} onChange={(event) => setEmailBody(event.target.value)} placeholder="Dear patron,&#10;&#10;We're delighted to share..." />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Button label (optional)">
            <input className={textInput} value={emailCtaLabel} onChange={(event) => setEmailCtaLabel(event.target.value)} placeholder="View the collection" />
          </Field>
          <Field label="Button link (optional, https)">
            <input className={textInput} value={emailCtaUrl} onChange={(event) => setEmailCtaUrl(event.target.value)} placeholder="https://dearte.com/collections" />
          </Field>
        </div>
        <Button loading={emailSending} onClick={runEmailBroadcast} disabled={!emailStatus?.configured}>
          Send email broadcast
        </Button>
      </Panel>
    </div>
  );
}

// Lets an admin decide which products a signed-out guest may browse, addressed
// by any taxonomy identifier (category / sub-category / collection / occasion)
// on top of the per-product "Show to guests" teaser flag. Rules are additive.
function GuestCatalogueGroup({ label, options, selected, onToggle }) {
  if (!options.length) {
    return (
      <div>
        <p className="lux-label">{label}</p>
        <p className="mt-1 text-sm text-gray-500">None available yet.</p>
      </div>
    );
  }
  const selectedSet = new Set((selected || []).map(String));
  return (
    <div>
      <p className="lux-label">{label}</p>
      <div className="mt-2 flex max-h-56 flex-col gap-2 overflow-auto pr-1">
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={selectedSet.has(String(option.value))}
              onChange={() => onToggle(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function GuestCataloguePanel({ guestCatalogue, categories, subCategories, collections, occasions, onChange, onSave }) {
  const gc = {
    includeFlagged: guestCatalogue?.includeFlagged ?? true,
    categories: guestCatalogue?.categories || [],
    subCategories: guestCatalogue?.subCategories || [],
    collections: guestCatalogue?.collections || [],
    occasions: guestCatalogue?.occasions || [],
  };

  const toggle = (field, value) => {
    const current = (gc[field] || []).map(String);
    const key = String(value);
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    onChange({ ...gc, [field]: next });
  };

  const totalSelected =
    gc.categories.length + gc.subCategories.length + gc.collections.length + gc.occasions.length;

  return (
    <Panel className="order-4 space-y-5">
      <div>
        <p className="lux-label">Guest Catalogue (which products guests can browse)</p>
        <p className="mt-1 text-sm text-gray-500">
          Pick which products signed-out visitors may see by any identifier below. A product is shown to
          guests if it matches <span className="font-medium">any</span> selected category, sub-category,
          collection, or occasion. Leave everything empty to fall back to the per-product "Show to guests"
          flag only.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={gc.includeFlagged}
          onChange={(e) => onChange({ ...gc, includeFlagged: e.target.checked })}
        />
        Also include products individually flagged "Show to guests"
      </label>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <GuestCatalogueGroup
          label="Categories"
          options={categories.map((item) => ({ value: item.id, label: item.name }))}
          selected={gc.categories}
          onToggle={(value) => toggle('categories', value)}
        />
        <GuestCatalogueGroup
          label="Sub Categories"
          options={subCategories.map((item) => ({
            value: item.id,
            label: item.categoryName ? `${item.name} · ${item.categoryName}` : item.name,
          }))}
          selected={gc.subCategories}
          onToggle={(value) => toggle('subCategories', value)}
        />
        <GuestCatalogueGroup
          label="Collections"
          options={collections.map((item) => ({
            value: item.id,
            label: item.categoryName ? `${item.name} · ${item.categoryName}` : item.name,
          }))}
          selected={gc.collections}
          onToggle={(value) => toggle('collections', value)}
        />
        <GuestCatalogueGroup
          label="Occasions"
          options={occasions.map((name) => ({ value: name, label: name }))}
          selected={gc.occasions}
          onToggle={(value) => toggle('occasions', value)}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button onClick={onSave}>Save Guest Catalogue</Button>
        <span className="text-sm text-gray-500">
          {totalSelected} rule{totalSelected === 1 ? '' : 's'} selected
          {gc.includeFlagged ? ' + flagged products' : ''}
        </span>
      </div>
    </Panel>
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
  const [brandForm, setBrandForm] = useState(emptyTrustedBrand);
  const siteSettings = siteSettingsDraft || data?.siteSettings || emptySiteSettings;

  if (isLoading) return <LoadingBlock />;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-config'] });
    queryClient.invalidateQueries({ queryKey: ['home'] });
    queryClient.invalidateQueries({ queryKey: ['trusted-by'] });
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-8">
      <SectionHeading eyebrow="Configuration" title="Site settings and taxonomy managers" description="These records now power admin dropdowns and frontend content structure." />

      <Panel className="order-3 space-y-4">
        <p className="lux-label">Site settings</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name"><input className={textInput} value={siteSettings.companyName} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), companyName: event.target.value }))} /></Field>
          <Field label="Email"><input className={textInput} value={siteSettings.email} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), email: event.target.value }))} /></Field>
          <Field label="Phone"><input className={textInput} value={siteSettings.phone} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), phone: event.target.value }))} /></Field>
          <Field label="Hours"><input className={textInput} value={siteSettings.hours} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), hours: event.target.value }))} /></Field>
          <Field label="WhatsApp (public link)"><input className={textInput} value={siteSettings.whatsapp} onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), whatsapp: event.target.value }))} /></Field>
          <Field label="WhatsApp ops numbers (order PDF copies)"><input className={textInput} value={siteSettings.whatsappOperationsNumbers || ''} placeholder="9198..., 9197... (comma-separated)" onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), whatsappOperationsNumbers: event.target.value }))} /></Field>
          <Field label="Order notification emails (admin copies)"><input className={textInput} value={siteSettings.orderNotificationEmails || ''} placeholder="ops@dearte.com, sales@dearte.com (comma-separated)" onChange={(event) => setSiteSettingsDraft((current) => ({ ...(current || siteSettings), orderNotificationEmails: event.target.value }))} /></Field>
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

      <Panel className="order-4 space-y-4">
        <div>
          <p className="lux-label">General Access (Home Page)</p>
          <p className="text-sm text-gray-500 mb-4 mt-1">Select which sections should be visible to guests (users who are not signed in).</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: 'showPopupPromo', label: 'Popup Promo' },
            { key: 'showHeroSlider', label: 'Hero Slider' },
            { key: 'showBrandExpression', label: 'Brand Expression' },
            { key: 'showProcessImage', label: 'Process Image' },
            { key: 'showCollections', label: 'Collections Showcase' },
            { key: 'showBestSellers', label: 'Best Sellers' },
            { key: 'showNewArrivals', label: 'New Arrivals' },
            { key: 'showTestimonials', label: 'Testimonials' },
            { key: 'showEvents', label: 'Events' },
            { key: 'showTrustedBrands', label: 'Trusted Brands' },
            { key: 'showCTABanner', label: 'CTA Banner' },
          ].map((field) => (
            <label key={field.key} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={siteSettings?.guestAccess?.[field.key] ?? true}
                onChange={(e) => {
                  const val = e.target.checked;
                  setSiteSettingsDraft((current) => ({
                    ...(current || siteSettings),
                    guestAccess: {
                      ...(current?.guestAccess || siteSettings.guestAccess || emptySiteSettings.guestAccess),
                      [field.key]: val,
                    },
                  }));
                }}
              />
              <span className="text-sm font-medium">{field.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-6">
          <p className="lux-label">General Access (Full Pages)</p>
          <p className="text-sm text-gray-500 mb-4 mt-1">Select which entire pages should be accessible to guests. If unchecked, guests will be redirected to the login page.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: 'pageProducts', label: 'Products (Jewellery) Page' },
            { key: 'pageCollections', label: 'Collections Page' },
            { key: 'pageEvents', label: 'Events Page' },
            { key: 'pageTestimonials', label: 'Testimonials Page' },
            { key: 'pageTrustedBrands', label: 'Trusted Brands Page' },
          ].map((field) => (
            <label key={field.key} className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-5 w-5"
                checked={siteSettings?.guestAccess?.[field.key] ?? true}
                onChange={(e) => {
                  const val = e.target.checked;
                  setSiteSettingsDraft((current) => ({
                    ...(current || siteSettings),
                    guestAccess: {
                      ...(current?.guestAccess || siteSettings.guestAccess || emptySiteSettings.guestAccess),
                      [field.key]: val,
                    },
                  }));
                }}
              />
              <span className="text-sm font-medium">{field.label}</span>
            </label>
          ))}
        </div>
        <Button onClick={async () => {
          await adminService.updateConfig({ siteSettings });
          toast.success('Site settings updated');
          setSiteSettingsDraft(null);
          refresh();
        }}>Save General Access Settings</Button>
      </Panel>

      <GuestCataloguePanel
        guestCatalogue={siteSettings?.guestCatalogue || emptySiteSettings.guestCatalogue}
        categories={data.categories || []}
        subCategories={data.subCategories || []}
        collections={data.collections || []}
        occasions={data.occasions || []}
        onChange={(next) =>
          setSiteSettingsDraft((current) => ({
            ...(current || siteSettings),
            guestCatalogue: next,
          }))
        }
        onSave={async () => {
          await adminService.updateConfig({ siteSettings });
          toast.success('Guest catalogue updated');
          setSiteSettingsDraft(null);
          refresh();
        }}
      />

      <div className="order-1 grid gap-6 xl:grid-cols-2">
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

        <TaxonomyManager
          title="Trusted by brands"
          items={data.trustedBrands || []}
          onEdit={(item) => setBrandForm({ ...item, logo: normalizeAsset(item.logo) })}
          onNew={() => setBrandForm(emptyTrustedBrand)}
          onSave={async () => {
            if (brandForm.id) await adminService.updateTrustedBrand(brandForm.id, brandForm);
            else await adminService.createTrustedBrand(brandForm);
            setBrandForm(emptyTrustedBrand);
            refresh();
          }}
          onDelete={brandForm.id ? async () => {
            await adminService.deleteTrustedBrand(brandForm.id);
            setBrandForm(emptyTrustedBrand);
            refresh();
          } : null}
          saveLabel={brandForm.id ? 'Update Brand' : 'Create Brand'}
        >
          <Field label="Brand Name"><input className={textInput} value={brandForm.name} onChange={(event) => setBrandForm((current) => ({ ...current, name: event.target.value }))} /></Field>
          <Field label="Sector"><input className={textInput} value={brandForm.sector} onChange={(event) => setBrandForm((current) => ({ ...current, sector: event.target.value }))} /></Field>
          <Field label="Website URL"><input className={textInput} value={brandForm.websiteUrl} onChange={(event) => setBrandForm((current) => ({ ...current, websiteUrl: event.target.value }))} /></Field>
          <Field label="Sort Order"><input type="number" className={textInput} value={brandForm.sortOrder} onChange={(event) => setBrandForm((current) => ({ ...current, sortOrder: Number(event.target.value) }))} /></Field>
          <AssetField label="Brand logo" value={brandForm.logo} onChange={(logo) => setBrandForm((current) => ({ ...current, logo }))} folder="dearte/trusted-brands" />
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]"><input type="checkbox" checked={brandForm.active} onChange={(event) => setBrandForm((current) => ({ ...current, active: event.target.checked }))} /> Active</label>
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
    <div className="space-y-5 sm:space-y-8">
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
    <div className="space-y-5 sm:space-y-8">
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
    <div className="space-y-5 sm:space-y-8">
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
