/**
 * "Ask your data": an admin's question about orders, answered from a fixed set
 * of reports. The model only chooses a report and its period, then words the
 * answer. It never writes a query, and every figure it quotes must appear in
 * the report it was given; otherwise only the table is shown.
 *
 * Buyer names never reach the model: they go out as "Buyer 1", "Buyer 2"…
 * and are put back into the answer here.
 *
 * ponytail: the orders for the chosen period are loaded and counted in memory.
 * Fine for thousands of orders; move each report to a $group pipeline past
 * roughly 20,000.
 */
import { Category, Order, Product, User } from '../../models/index.js';
import { asString } from '../../utils/validation.js';
import { chatJson } from './llm.js';
import { clampNumber, matchNames, ungroundedNumbers } from './guards.js';
import { displayName } from './catalogue.js';

// Cancelled and rejected orders are not demand; only the status report counts them.
const NOT_SALES = ['Cancelled', 'Rejected'];
const STATUS_ORDER = ['Pending', 'Approved', 'Processing', 'Shipped', 'Fulfilled', 'Cancelled', 'Rejected'];
const DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;
const EARLIEST_DAY = '2015-01-01';
const DEFAULT_DAYS = 90;
const ROWS_FOR_MODEL = 50;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Dates (India time) ──────────────────────────────────────────────────────

/** The calendar day in India for a moment, as YYYY-MM-DD. */
export const istDay = (date) => new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);

function validDay(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parsed = new Date(`${text}T00:00:00.000Z`);
  // Round-tripping rejects dates like 2026-02-31, which Date would roll over.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text ? text : '';
}

const shiftDay = (day, days) => new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
const dayStart = (day) => new Date(Date.parse(`${day}T00:00:00.000Z`) - IST_OFFSET_MS);
const dayEnd = (day) => new Date(Date.parse(`${day}T00:00:00.000Z`) + DAY - 1 - IST_OFFSET_MS);

/** "2026-09-14" → "14 Sep 2026" */
export function formatDay(day) {
  const [year, month, date] = day.split('-').map(Number);
  return `${date} ${MONTHS[month - 1]} ${year}`;
}

const monthLabel = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/** Every YYYY-MM from the month of `from` to the month of `to`. */
export function monthsBetween(from, to) {
  const months = [];
  let year = Number(from.slice(0, 4));
  let month = Number(from.slice(5, 7));
  const endYear = Number(to.slice(0, 4));
  const endMonth = Number(to.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

// ── Reports: pure functions over a loaded context ──────────────────────────
//
// ctx = {
//   orders:    [{ id, user, status, createdAt, items: [{ product, quantity, customization }] }]
//   products:  Map(id → { id, styleCode, name, category, collection, status, createdAt, views })
//   buyers:    Map(id → { name, active })
//   catalogue: active products (slow_movers only)
//   now:       Date
// }
// Each returns { columns, rows, chart, totals }. `chart` names the row keys a
// bar chart reads, or is null when bars would say nothing.

const sum = (values) => values.reduce((total, value) => total + value, 0);
const share = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const pieces = (item) => Math.max(0, Number(item.quantity) || 0);

/** Accepted order lines in the period, optionally for one category. */
function* salesLines(ctx, plan) {
  for (const order of ctx.orders) {
    if (NOT_SALES.includes(order.status)) continue;
    for (const item of order.items || []) {
      const product = ctx.products.get(String(item.product)) || null;
      if (plan.category && product?.category !== plan.category) continue;
      yield { order, item, product, pieces: pieces(item) };
    }
  }
}

function tally(ctx, plan, keyOf) {
  const groups = new Map();
  const orderIds = new Set();
  let total = 0;
  for (const line of salesLines(ctx, plan)) {
    const key = keyOf(line);
    const group = groups.get(key) || { key, product: line.product, pieces: 0, orders: new Set(), buyers: new Set(), styles: new Set(), last: 0 };
    group.pieces += line.pieces;
    group.orders.add(line.order.id);
    group.buyers.add(line.order.user);
    group.styles.add(String(line.item.product));
    group.last = Math.max(group.last, new Date(line.order.createdAt).getTime());
    groups.set(key, group);
    orderIds.add(line.order.id);
    total += line.pieces;
  }
  return { groups: [...groups.values()], totals: { orders: orderIds.size, pieces: total } };
}

const byPieces = (a, b) => b.pieces - a.pieces || b.orders.size - a.orders.size || String(a.key).localeCompare(String(b.key));

function topProducts(ctx, plan) {
  const { groups, totals } = tally(ctx, plan, (line) => String(line.item.product));
  const rows = groups.sort(byPieces).slice(0, plan.limit).map((group) => ({
    style: group.product?.styleCode || '(deleted)',
    name: group.product?.name || 'Deleted style',
    category: group.product?.category || '',
    pieces: group.pieces,
    orders: group.orders.size,
    buyers: group.buyers.size,
  }));
  return {
    columns: [
      { key: 'style', label: 'Style' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'pieces', label: 'Pieces', numeric: true },
      { key: 'orders', label: 'Orders', numeric: true },
      { key: 'buyers', label: 'Buyers', numeric: true },
    ],
    rows,
    chart: { label: 'style', value: 'pieces' },
    totals,
  };
}

function categoryTrend(ctx, plan) {
  const months = monthsBetween(plan.from, plan.to);
  const cells = new Map(months.map((month) => [month, new Map()]));
  const byCategory = new Map();
  const orderIds = new Set();
  for (const line of salesLines(ctx, plan)) {
    const cell = cells.get(istDay(line.order.createdAt).slice(0, 7));
    if (!cell) continue;
    const category = line.product?.category || 'Uncategorised';
    cell.set(category, (cell.get(category) || 0) + line.pieces);
    byCategory.set(category, (byCategory.get(category) || 0) + line.pieces);
    orderIds.add(line.order.id);
  }

  // The five biggest categories get a column each; the rest share one.
  const top = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([name]) => name);
  const hasOther = byCategory.size > top.length;
  const rows = months.map((month) => {
    const cell = cells.get(month);
    const row = { month: monthLabel(month), total: sum([...cell.values()]) };
    top.forEach((name, index) => {
      row[`c${index}`] = cell.get(name) || 0;
    });
    if (hasOther) row.other = sum([...cell].filter(([name]) => !top.includes(name)).map(([, value]) => value));
    return row;
  });

  return {
    columns: [
      { key: 'month', label: 'Month' },
      ...top.map((name, index) => ({ key: `c${index}`, label: name, numeric: true })),
      ...(hasOther ? [{ key: 'other', label: 'Other categories', numeric: true }] : []),
      { key: 'total', label: 'Total pieces', numeric: true },
    ],
    rows,
    chart: { label: 'month', value: 'total' },
    totals: { orders: orderIds.size, pieces: sum([...byCategory.values()]) },
  };
}

function collectionPerformance(ctx, plan) {
  const { groups, totals } = tally(ctx, plan, (line) => line.product?.collection || 'No collection');
  const rows = groups.sort(byPieces).slice(0, plan.limit).map((group) => ({
    collection: group.key,
    pieces: group.pieces,
    orders: group.orders.size,
    styles: group.styles.size,
    buyers: group.buyers.size,
  }));
  return {
    columns: [
      { key: 'collection', label: 'Collection' },
      { key: 'pieces', label: 'Pieces', numeric: true },
      { key: 'orders', label: 'Orders', numeric: true },
      { key: 'styles', label: 'Styles ordered', numeric: true },
      { key: 'buyers', label: 'Buyers', numeric: true },
    ],
    rows,
    chart: { label: 'collection', value: 'pieces' },
    totals,
  };
}

const buyerName = (ctx, id) => ctx.buyers.get(String(id))?.name || 'Unknown buyer';

function buyerActivity(ctx, plan) {
  const { groups, totals } = tally(ctx, plan, (line) => String(line.order.user));
  const rows = groups.sort(byPieces).slice(0, plan.limit).map((group) => ({
    buyer: buyerName(ctx, group.key),
    pieces: group.pieces,
    orders: group.orders.size,
    styles: group.styles.size,
    lastOrder: formatDay(istDay(group.last)),
  }));
  return {
    columns: [
      { key: 'buyer', label: 'Buyer', buyer: true },
      { key: 'pieces', label: 'Pieces', numeric: true },
      { key: 'orders', label: 'Orders', numeric: true },
      { key: 'styles', label: 'Styles', numeric: true },
      { key: 'lastOrder', label: 'Last order' },
    ],
    rows,
    chart: { label: 'buyer', value: 'pieces' },
    totals: { ...totals, buyers: groups.length },
  };
}

// Uses every accepted order ever (ctx.orders is loaded without a date range for this one).
function lapsedBuyers(ctx, plan) {
  const cutoff = ctx.now.getTime() - plan.inactiveDays * DAY;
  const byBuyer = new Map();
  for (const order of ctx.orders) {
    if (NOT_SALES.includes(order.status)) continue;
    const entry = byBuyer.get(order.user) || { user: order.user, last: 0, orders: 0, pieces: 0 };
    entry.last = Math.max(entry.last, new Date(order.createdAt).getTime());
    entry.orders += 1;
    entry.pieces += sum((order.items || []).map(pieces));
    byBuyer.set(order.user, entry);
  }

  const lapsed = [...byBuyer.values()].filter((entry) => ctx.buyers.get(entry.user)?.active && entry.last < cutoff);
  const rows = lapsed
    .sort((a, b) => b.pieces - a.pieces || b.last - a.last)
    .slice(0, plan.limit)
    .map((entry) => ({
      buyer: buyerName(ctx, entry.user),
      lastOrder: formatDay(istDay(entry.last)),
      // Calendar days in India, so it agrees with the dates beside it.
      daysSince: Math.round((Date.parse(istDay(ctx.now)) - Date.parse(istDay(entry.last))) / DAY),
      orders: entry.orders,
      pieces: entry.pieces,
    }));
  return {
    columns: [
      { key: 'buyer', label: 'Buyer', buyer: true },
      { key: 'lastOrder', label: 'Last order' },
      { key: 'daysSince', label: 'Days since', numeric: true },
      { key: 'orders', label: 'Orders (all time)', numeric: true },
      { key: 'pieces', label: 'Pieces (all time)', numeric: true },
    ],
    rows,
    chart: null,
    totals: { lapsedBuyers: lapsed.length },
  };
}

function slowMovers(ctx, plan) {
  const sold = new Map();
  for (const line of salesLines(ctx, plan)) {
    const key = String(line.item.product);
    sold.set(key, (sold.get(key) || 0) + line.pieces);
  }
  const candidates = (ctx.catalogue || []).filter((product) => !plan.category || product.category === plan.category);
  const rows = candidates
    .map((product) => ({
      style: product.styleCode,
      name: product.name,
      category: product.category,
      pieces: sold.get(product.id) || 0,
      views: product.views || 0,
      addedAt: new Date(product.createdAt).getTime() || 0,
    }))
    // Unsold first; among those, the longest-listed first.
    .sort((a, b) => a.pieces - b.pieces || a.addedAt - b.addedAt || b.views - a.views || a.style.localeCompare(b.style))
    .slice(0, plan.limit)
    .map(({ addedAt, ...row }) => ({ ...row, added: addedAt ? formatDay(istDay(addedAt)) : '' }));
  return {
    columns: [
      { key: 'style', label: 'Style' },
      { key: 'name', label: 'Name' },
      { key: 'category', label: 'Category' },
      { key: 'pieces', label: 'Pieces in period', numeric: true },
      { key: 'views', label: 'Page views', numeric: true },
      { key: 'added', label: 'Added' },
    ],
    rows,
    chart: null,
    totals: { activeStyles: candidates.length, unsoldStyles: candidates.filter((product) => !sold.get(product.id)).length },
  };
}

function orderStatusSummary(ctx) {
  const byStatus = new Map();
  for (const order of ctx.orders) {
    const status = order.status || 'Unknown';
    const entry = byStatus.get(status) || { orders: 0, pieces: 0 };
    entry.orders += 1;
    entry.pieces += sum((order.items || []).map(pieces));
    byStatus.set(status, entry);
  }
  const rank = (status) => (STATUS_ORDER.includes(status) ? STATUS_ORDER.indexOf(status) : STATUS_ORDER.length);
  const total = ctx.orders.length;
  const rows = [...byStatus.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([status, entry]) => ({ status, orders: entry.orders, pieces: entry.pieces, share: share(entry.orders, total) }));
  return {
    columns: [
      { key: 'status', label: 'Status' },
      { key: 'orders', label: 'Orders', numeric: true },
      { key: 'pieces', label: 'Pieces', numeric: true },
      { key: 'share', label: 'Share of orders (%)', numeric: true },
    ],
    rows,
    chart: { label: 'status', value: 'orders' },
    totals: { orders: total, pieces: sum(rows.map((row) => row.pieces)) },
  };
}

function metalKaratMix(ctx, plan) {
  const byMix = new Map();
  let total = 0;
  for (const line of salesLines(ctx, plan)) {
    const colour = line.item.customization?.goldColor || 'Not specified';
    const karat = line.item.customization?.goldCarat || 'Not specified';
    const key = `${colour}|${karat}`;
    const entry = byMix.get(key) || { colour, karat, pieces: 0 };
    entry.pieces += line.pieces;
    byMix.set(key, entry);
    total += line.pieces;
  }
  const rows = [...byMix.values()]
    .sort((a, b) => b.pieces - a.pieces || a.colour.localeCompare(b.colour) || a.karat.localeCompare(b.karat))
    .map((entry) => ({ ...entry, mix: `${entry.colour} ${entry.karat}`, share: share(entry.pieces, total) }));
  return {
    columns: [
      { key: 'colour', label: 'Metal colour' },
      { key: 'karat', label: 'Karat' },
      { key: 'pieces', label: 'Pieces', numeric: true },
      { key: 'share', label: 'Share of pieces (%)', numeric: true },
    ],
    rows,
    chart: { label: 'mix', value: 'pieces' },
    totals: { pieces: total },
  };
}

export const REPORTS = {
  top_products: {
    title: 'Top styles by pieces ordered',
    about: 'styles ranked by pieces ordered in a period. Uses from, to, limit, category.',
    run: topProducts,
  },
  category_trend: {
    title: 'Pieces ordered per category, by month',
    about: 'pieces per category for each month of a period. Uses from, to, category.',
    run: categoryTrend,
  },
  collection_performance: {
    title: 'Collections by pieces ordered',
    about: 'pieces, orders and buyers per collection in a period. Uses from, to, limit, category.',
    run: collectionPerformance,
  },
  buyer_activity: {
    title: 'Buyers by pieces ordered',
    about: 'buyers ranked by pieces and orders in a period. Uses from, to, limit, category.',
    run: buyerActivity,
  },
  lapsed_buyers: {
    title: 'Buyers with no recent order',
    about: 'buyers who ordered before but not in the last N days. Uses inactiveDays, limit.',
    run: lapsedBuyers,
  },
  slow_movers: {
    title: 'Slowest-moving active styles',
    about: 'active styles with the fewest pieces ordered in a period, unsold first. Uses from, to, limit, category.',
    run: slowMovers,
  },
  order_status_summary: {
    title: 'Orders by status',
    about: 'how many orders are in each status (Pending, Approved, Processing, Shipped, Fulfilled, Cancelled, Rejected) in a period. Uses from, to.',
    run: orderStatusSummary,
  },
  metal_karat_mix: {
    title: 'Pieces by metal colour and karat',
    about: 'pieces ordered by metal colour and karat in a period. Uses from, to, category.',
    run: metalKaratMix,
  },
};

// Reports where a category narrows nothing (whole orders, or buyers).
const NO_CATEGORY = ['order_status_summary', 'lapsed_buyers'];

/** Whatever the planner returned, as a report we have and a period that makes sense. */
export function sanitizePlan(raw = {}, { now = new Date(), categories = [] } = {}) {
  const today = istDay(now);
  const report = typeof raw.report === 'string' && Object.hasOwn(REPORTS, raw.report) ? raw.report : '';
  let to = validDay(raw.to);
  if (!to || to > today) to = today;
  let from = validDay(raw.from);
  if (!from || from > today) from = shiftDay(to, -(DEFAULT_DAYS - 1));
  if (from > to) [from, to] = [to, from];
  if (from < EARLIEST_DAY) from = EARLIEST_DAY;

  return {
    report,
    from,
    to,
    limit: Math.round(clampNumber(raw.limit, 1, 50) ?? 10),
    category: NO_CATEGORY.includes(report) ? '' : matchNames([raw.category], categories)[0] || '',
    inactiveDays: Math.round(clampNumber(raw.inactiveDays, 7, 730) ?? 60),
  };
}

/** The period in words, as the answer and the screen show it. */
export function periodLabel(plan) {
  if (plan.report === 'lapsed_buyers') return `no order in the last ${plan.inactiveDays} days`;
  return `${formatDay(plan.from)} to ${formatDay(plan.to)}`;
}

/** Rows keyed by column label, buyer names swapped for aliases. */
export function rowsForModel(result) {
  const aliases = new Map();
  const buyerKeys = result.columns.filter((column) => column.buyer).map((column) => column.key);
  const rows = result.rows.slice(0, ROWS_FOR_MODEL).map((row) =>
    Object.fromEntries(
      result.columns.map((column) => {
        let value = row[column.key];
        if (buyerKeys.includes(column.key)) {
          if (!aliases.has(value)) aliases.set(value, `Buyer ${aliases.size + 1}`);
          value = aliases.get(value);
        }
        return [column.label, value];
      }),
    ),
  );
  // alias → real name, for putting names back into the answer.
  return { rows, names: new Map([...aliases].map(([name, alias]) => [alias, name])) };
}

/**
 * The model's answer, if every figure in it is in the data; with buyer names
 * restored. Returns '' when it quoted anything we did not give it.
 */
export function finishAnswer(answer, { sources = [], names = new Map() } = {}) {
  const text = asString(answer, { maxLength: 1200 });
  if (!text || ungroundedNumbers(text, sources).length) return '';
  return text.replace(/\bBuyer \d+\b/g, (alias) => names.get(alias) || alias);
}

const PLANNER = (today, categories) => `You route an admin's question about DeArte's B2B jewellery orders to ONE report.
Today is ${today} (India time). Orders carry no prices, so there is no revenue or value data; quantities are pieces.
Reports:
${Object.entries(REPORTS).map(([key, report]) => `- ${key}: ${report.about}`).join('\n')}
Dates are YYYY-MM-DD and inclusive. "Last 90 days" ends today. "This year" starts on 1 January. "Last month" is the previous calendar month. If the question gives no period, leave from and to empty.
category is one of: ${categories.join(', ') || '(none)'}; leave it empty unless the question names one.
If no report can answer the question, use "none".
Return ONLY JSON: {"report": "", "from": "", "to": "", "limit": 10, "category": "", "inactiveDays": 60}`;

const WRITER = `You are DeArte's sales analyst. Answer the admin's question in 2 to 4 short sentences, using ONLY the report given.
Quote figures exactly as they appear in the rows or totals. Do not add, subtract, average or work out percentages yourself.
Buyers appear as aliases such as "Buyer 3"; write the alias exactly as given.
If the report cannot fully answer the question, say what it does show.
Return ONLY JSON: {"answer": "..."}`;

const reportList = () =>
  'top styles, category trends by month, collections, buyer activity, lapsed buyers, slow-moving styles, order statuses, and the metal colour and karat mix';

const nameOnly = (paths) => paths.map((path) => ({ path, select: 'name' }));

/** Everything a report reads, loaded for its period. */
async function loadContext(plan, now) {
  const allTime = plan.report === 'lapsed_buyers';
  const orderFilter = allTime
    ? { status: { $nin: NOT_SALES } }
    : { createdAt: { $gte: dayStart(plan.from), $lte: dayEnd(plan.to) } };
  const orders = (await Order.find(orderFilter).select('user status createdAt items.product items.quantity items.customization').lean()).map(
    (order) => ({
      id: String(order._id),
      user: String(order.user),
      status: order.status,
      createdAt: order.createdAt,
      items: order.items || [],
    }),
  );

  const productIds = [...new Set(orders.flatMap((order) => order.items.map((item) => String(item.product))))];
  const productFilter =
    plan.report === 'slow_movers' ? { $or: [{ _id: { $in: productIds } }, { status: 'Active' }] } : { _id: { $in: productIds } };
  const productDocs = allTime
    ? []
    : await Product.find(productFilter)
        .select('styleCode name category subCategory collection metalColor status createdAt views')
        .populate(nameOnly(['category', 'subCategory', 'collection', 'metalColor']))
        .lean();
  const products = new Map(
    productDocs.map((doc) => {
      const plain = {
        id: String(doc._id),
        styleCode: doc.styleCode,
        category: doc.category?.name || '',
        subCategory: doc.subCategory?.name || '',
        collection: doc.collection?.name || '',
        metalColor: doc.metalColor?.name || '',
        status: doc.status,
        createdAt: doc.createdAt,
        views: doc.views || 0,
      };
      return [plain.id, { ...plain, name: displayName({ ...plain, name: doc.name }) }];
    }),
  );

  const users = await User.find({ _id: { $in: [...new Set(orders.map((order) => order.user))] } })
    .select('name companyName role status')
    .lean();
  const buyers = new Map(
    users.map((user) => [
      String(user._id),
      { name: user.companyName || user.name || 'Unknown buyer', active: user.role === 'buyer' && user.status === 'Active' },
    ]),
  );

  return {
    now,
    orders,
    products,
    buyers,
    catalogue: plan.report === 'slow_movers' ? [...products.values()].filter((product) => product.status === 'Active') : [],
  };
}

/** One question in, a written answer plus the table it came from out. */
export async function askData(question, { now = new Date() } = {}) {
  const text = asString(question, { maxLength: 300 });
  if (text.length < 4) throw Object.assign(new Error('Ask a question about orders, styles or buyers.'), { status: 400 });

  const categories = (await Category.find({ active: true }).select('name').lean()).map((category) => category.name);
  const raw = await chatJson({
    system: PLANNER(istDay(now), categories),
    user: `Question: ${text}`,
    maxTokens: 800,
    temperature: 0,
    timeoutMs: 20_000,
  });
  const plan = sanitizePlan(raw, { now, categories });
  if (!plan.report) {
    return {
      question: text,
      report: null,
      answer: `That needs data this tool does not have. Orders carry no prices, so it cannot answer questions about value or revenue. It can answer questions about ${reportList()}.`,
      columns: [],
      rows: [],
      chart: null,
    };
  }

  const definition = REPORTS[plan.report];
  const result = definition.run(await loadContext(plan, now), plan);
  const period = periodLabel(plan);
  const fallback = result.rows.length
    ? `Here are the figures: ${definition.title.toLowerCase()}, ${period}.`
    : `No orders match that question for ${period}.`;

  let answer = fallback;
  if (result.rows.length) {
    const { rows, names } = rowsForModel(result);
    const totals = JSON.stringify(result.totals);
    try {
      const written = await chatJson({
        system: WRITER,
        user: [
          `Question: ${text}`,
          `Report: ${definition.title}`,
          `Period: ${period}`,
          plan.category ? `Category: ${plan.category}` : '',
          `Totals: ${totals}`,
          `Rows (${rows.length}${result.rows.length > rows.length ? ` of ${result.rows.length}` : ''}): ${JSON.stringify(rows)}`,
        ]
          .filter(Boolean)
          .join('\n'),
        maxTokens: 1000,
        temperature: 0.2,
        timeoutMs: 25_000,
      });
      answer =
        finishAnswer(written.answer, {
          sources: [JSON.stringify(rows), totals, period, plan.from, plan.to, text, String(plan.limit), String(result.rows.length)],
          names,
        }) || fallback;
    } catch (error) {
      // The table is exact either way; a busy model only costs the summary.
      console.error('[ai] insights answer failed:', error?.message);
    }
  }

  return {
    question: text,
    report: plan.report,
    title: definition.title,
    period,
    category: plan.category,
    answer,
    columns: result.columns.map(({ key, label, numeric }) => ({ key, label, numeric: Boolean(numeric) })),
    rows: result.rows,
    chart: result.chart,
    totals: result.totals,
  };
}
