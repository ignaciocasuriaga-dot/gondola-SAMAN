// App principal - vistas: Catalogo, Comparador, Ofertas, Cobertura, Informe Gerencial

const SUPER_LABEL = { tata: 'Tata', disco: 'Disco', eldorado: 'El Dorado', tiendainglesa: 'Tienda Inglesa' };
const SUPERS = ['tata', 'disco', 'eldorado', 'tiendainglesa'];
const GROUP_LABEL = { saman: 'Saman', competencia: 'Competencia' };
const OWN_BRANDS = ['saman', 'la abundancia', 'kyoto'];
const COMPETITOR_BRANDS = ['blue patna', 'arroz green chef', 'arroz aruba', 'kikkoman', 'mirokumai'];
const ALL_BRANDS = [...OWN_BRANDS, ...COMPETITOR_BRANDS];
const PRICE_LIST_KEY = 'gondola-saman-pvp-v1';
const GAP_LABEL = { above: 'Sobre PVP', ok: 'En linea', below: 'Bajo PVP' };

function activeGroup() { return state.competitorMode ? 'competencia' : 'saman'; }
function activeGroupLabel() { return GROUP_LABEL[activeGroup()]; }
function portfolioBrands() { return state.competitorMode ? COMPETITOR_BRANDS : OWN_BRANDS; }

const state = {
  allItems: [],        // todos los items relevados (marcas propias + competencia)
  items: [],           // items del grupo activo (Saman o Competencia)
  competitorMode: false,
  groups: { saman: OWN_BRANDS, competencia: COMPETITOR_BRANDS },
  suggested: null,
  priceList: [],       // lista cargada manualmente por el usuario (flat, merged)
  globalList: [],      // lista única cargada sin filtro de cadena
  perSuperLists: { tata: [], disco: [], eldorado: [], tiendainglesa: [] },
  builtinPvp: [],      // lista PVP embebida (pvp.json de los Excel del usuario)
  pvpMeta: null,       // { vigencia, generatedAt }
  generatedAt: null,
  view: 'catalog',
  history: null,           // array de snapshots {t, prices}
  catalog: { q: '', brands: new Set(), supers: new Set(), groups: new Set(), sort: { key: 'price', asc: true } },
  compare: { q: '', brand: '' },
  offers: { q: '' },
  clusters: [],
};

function applyGroupFilter() {
  state.items = state.allItems.filter((i) => i.group === activeGroup());
  state.clusters = clusterProducts(state.items);
  // Limpiar selecciones de filtros que pueden referirse a marcas del otro grupo
  state.catalog.brands.clear();
  state.catalog.groups.clear();
  state.compare.brand = '';
}

// ===== Util =====
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const escape = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtPrice = (p) => p == null ? '—' : '$ ' + p.toLocaleString('es-UY');
const fmtPct = (p) => p == null ? '-' : `${p > 0 ? '+' : ''}${Number(p).toFixed(1)}%`;
const stripAccents = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

function toast(msg, kind = '') {
  $$('.toast').forEach((t) => t.remove());
  const el = document.createElement('div');
  el.className = 'toast' + (kind ? ' ' + kind : '');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); }, 5500);
}

// ===== Normalización para clustering =====
function extractSize(name) {
  const rx = /(\d+(?:[.,]\d+)?)\s*(kg|kilos?|gr?\b|gramos|ml|cc|lts?|litros?|un|u\b|unid(?:ades?)?|x\s*\d+)/i;
  const m = name.match(rx);
  if (!m) return null;
  const num = Number(m[1].replace(',', '.'));
  let unit = m[2].toLowerCase().replace(/\s+/g, '');
  let value = num;
  if (/^(g|gr|gramos)$/.test(unit)) unit = 'g';
  else if (/^(kg|kilo|kilos)$/.test(unit)) { unit = 'g'; value = num * 1000; }
  else if (/^(ml|cc)$/.test(unit)) unit = 'ml';
  else if (/^(l|lt|lts|litro|litros)$/.test(unit)) { unit = 'ml'; value = num * 1000; }
  else if (/^(un|u|unid|unidad|unidades)$/.test(unit)) unit = 'u';
  return { value: Math.round(value), unit };
}

function normalizeName(name) {
  let n = stripAccents(name.toLowerCase());
  n = n.replace(/\b(saman|la abundancia|abundancia|kyoto|blue patna|green chef|arroz aruba|aruba|kikkoman|mirokumai)\b/g, ' ');
  n = n.replace(/\d+(?:[.,]\d+)?\s*(kg|kilos?|gr?|gramos|ml|cc|lts?|litros?|un|u|unid(?:ades?)?|x\s*\d+)\b/g, ' ');
  n = n.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const stop = new Set(['de', 'la', 'el', 'con', 'sin', 'y', 'a', 'en', 'para', 'gr', 'g']);
  return n.split(' ').filter((w) => w && w.length > 1 && !stop.has(w)).join(' ');
}

const tokenize = (name) => new Set(normalizeName(name).split(' ').filter(Boolean));

function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function clusterProducts(items) {
  const groups = [];
  const enriched = items.map((it) => ({ item: it, tokens: tokenize(it.name), size: extractSize(it.name) }));
  for (const cur of enriched) {
    let bestGroup = null;
    let bestScore = 0;
    for (const g of groups) {
      if (g.brand !== cur.item.brand) continue;
      if (cur.size && g.size) {
        if (cur.size.unit !== g.size.unit) continue;
        const ratio = Math.min(cur.size.value, g.size.value) / Math.max(cur.size.value, g.size.value);
        if (ratio < 0.85) continue;
      }
      const score = jaccard(cur.tokens, g.tokens);
      if (score > bestScore && score >= 0.55) { bestScore = score; bestGroup = g; }
    }
    if (bestGroup) {
      bestGroup.items.push(cur.item);
      const intersection = new Set();
      for (const t of cur.tokens) if (bestGroup.tokens.has(t)) intersection.add(t);
      if (intersection.size >= 2) bestGroup.tokens = intersection;
    } else {
      groups.push({ brand: cur.item.brand, group: cur.item.group, size: cur.size, tokens: new Set(cur.tokens), items: [cur.item], label: cur.item.name });
    }
  }
  for (const g of groups) {
    g.items.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
    g.label = g.items.slice().sort((a, b) => a.name.length - b.name.length)[0].name;
  }
  return groups;
}

// ===== PVP sugerido local =====
function normalizeStore(value) {
  const n = stripAccents(String(value ?? '').toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!n) return '';
  if (['todos', 'todas', 'all', 'global'].includes(n)) return 'all';
  const map = {
    tata: 'tata',
    'ta ta': 'tata',
    'ta-ta': 'tata',
    disco: 'disco',
    eldorado: 'eldorado',
    'el dorado': 'eldorado',
    tiendainglesa: 'tiendainglesa',
    'tienda inglesa': 'tiendainglesa',
  };
  return map[n] || '';
}

function normalizeBrand(value) {
  const n = stripAccents(String(value ?? '').toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  for (const brand of ALL_BRANDS) {
    if (n === brand || n.includes(brand)) return brand;
  }
  return n || '';
}

function normalizeLoadedItem(item) {
  if (!item || !SUPERS.includes(item.super)) return null;
  const next = { ...item };
  if (!ALL_BRANDS.includes(next.brand)) return null;
  return next;
}

function numberOrNull(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let s = String(value).trim().replace(/[^\d,.-]/g, '');
  if (!s) return null;
  const comma = s.lastIndexOf(',');
  const dot = s.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) s = comma > dot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (comma >= 0) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function csvDelimiter(text) {
  const firstLine = String(text).split(/\r?\n/, 1)[0] || '';
  return (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
}

function parseCsv(text, delimiter = csvDelimiter(text)) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i], next = text[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) { row.push(cell); cell = ''; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (ch !== '\r') cell += ch;
  }
  row.push(cell);
  if (row.some((v) => String(v).trim())) rows.push(row);
  return rows;
}

function headerKey(value) {
  return stripAccents(String(value ?? '').toLowerCase())
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function rowsFromCsv(text) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => String(cell).trim()));
  if (!rows.length) return [];
  const headers = rows[0].map(headerKey);
  return rows.slice(1).map((row) => {
    const record = {};
    headers.forEach((key, index) => { record[key] = row[index] ?? ''; });
    return record;
  });
}

function pick(row, keys) {
  for (const key of keys) {
    const v = row[headerKey(key)];
    if (v != null && String(v).trim() !== '') return v;
  }
  return '';
}

function rowsFromJson(text) {
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : (parsed.rows || parsed.items || []);
}

// Parsea un Excel: toma la primera hoja con sheet_to_json, normaliza claves.
// Si la primera hoja está vacía, hace fallback multi-pestaña buscando 'descripci' en encabezados.
function rowsFromExcel(buffer) {
  if (typeof XLSX === 'undefined') throw new Error('Libreria Excel no cargo. Revisa tu conexion a internet.');
  const wb = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (firstSheetName) {
    const ws = wb.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (rows.length) {
      return rows.map((row) => {
        const norm = {};
        for (const [k, v] of Object.entries(row)) norm[headerKey(k)] = v;
        return norm;
      });
    }
  }
  // Multi-sheet fallback
  const allRows = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!raw.length) continue;
    let headerIdx = -1;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].some((c) => String(c).toLowerCase().includes('descripci'))) { headerIdx = i; break; }
    }
    if (headerIdx < 0) continue;
    const headers = raw[headerIdx].map(headerKey);
    for (const row of raw.slice(headerIdx + 1)) {
      if (!row.some((v) => String(v).trim())) continue;
      const record = {};
      headers.forEach((key, i) => { record[key] = row[i] ?? ''; });
      allRows.push(record);
    }
  }
  return allRows;
}

function normalizePriceRows(rows, storeOverride = '', source = 'archivo') {
  const override = normalizeStore(storeOverride);
  const diagnostics = { noStore: 0, noPrice: 0, noProduct: 0 };
  const result = rows.map((row, index) => {
    // If storeOverride given, ALL rows use that store (ignore file column)
    const rawStore = override ? '' : pick(row, ['super', 'cadena', 'supermercado', 'tienda']);
    const store = override || normalizeStore(rawStore);
    // no store and no column → apply to all supers; unrecognized → reject
    const stores = store === 'all' ? SUPERS : (store ? [store] : (rawStore ? [] : SUPERS));
    const product = String(pick(row, ['producto', 'nombre', 'descripcion', 'articulo', 'description'])).trim();
    const brand = normalizeBrand(pick(row, ['marca', 'brand', 'submarca']));
    const price = numberOrNull(pick(row, ['mi_pvp', 'mipvp', 'pvp_sugerido', 'pvpSugerido', 'precio_sugerido', 'precioSugerido', 'suggestedPrice', 'pvs', 'pvp', 'precio']));
    const sku = String(pick(row, ['sku', 'codigo', 'id_producto', 'id'])).trim();
    if (!stores.length) { diagnostics.noStore++; return null; }
    if (price == null) { diagnostics.noPrice++; return null; }
    if (!product && !sku) { diagnostics.noProduct++; return null; }
    return { index, stores, sku, brand, product, price, source };
  }).filter(Boolean);
  result._diagnostics = diagnostics;
  return result;
}

function rebuildFlatPriceList() {
  state.priceList = [
    ...state.globalList,
    ...state.perSuperLists.tata,
    ...state.perSuperLists.disco,
    ...state.perSuperLists.eldorado,
    ...state.perSuperLists.tiendainglesa,
  ];
}

function loadLocalPriceList() {
  try {
    const saved = JSON.parse(localStorage.getItem(PRICE_LIST_KEY) || 'null');
    if (saved && saved.globalList) {
      state.globalList = saved.globalList || [];
    }
    if (saved && saved.perSuperLists) {
      state.perSuperLists = {
        tata: saved.perSuperLists.tata || [],
        disco: saved.perSuperLists.disco || [],
        eldorado: saved.perSuperLists.eldorado || [],
        tiendainglesa: saved.perSuperLists.tiendainglesa || [],
      };
    } else if (Array.isArray(saved)) {
      state.perSuperLists = { tata: saved, disco: [], eldorado: [], tiendainglesa: [] };
    } else {
      state.perSuperLists = { tata: [], disco: [], eldorado: [], tiendainglesa: [] };
    }
  } catch {
    state.globalList = [];
    state.perSuperLists = { tata: [], disco: [], eldorado: [], tiendainglesa: [] };
  }
  rebuildFlatPriceList();
}

function saveLocalPriceList() {
  localStorage.setItem(PRICE_LIST_KEY, JSON.stringify({ globalList: state.globalList, perSuperLists: state.perSuperLists }));
  rebuildFlatPriceList();
}

function sizeCompatible(rowSize, itemSize) {
  if (!rowSize) return true;
  if (!itemSize || rowSize.unit !== itemSize.unit) return false;
  const ratio = Math.min(rowSize.value, itemSize.value) / Math.max(rowSize.value, itemSize.value);
  return ratio >= 0.85;
}

function scorePriceRow(row, item) {
  if (!row.stores.includes(item.super)) return null;
  if (row.sku && String(row.sku) === String(item.sku)) return 999;
  if (row.brand && row.brand !== item.brand) return null;

  const rowSize = extractSize(row.product || '');
  const itemSize = extractSize(item.name || '');
  if (!sizeCompatible(rowSize, itemSize)) return null;

  const wanted = tokenize(row.product || '');
  const got = tokenize(item.name || '');
  if (!wanted.size) return null;
  let overlap = 0;
  for (const token of wanted) if (got.has(token)) overlap += 1;
  const ratio = overlap / wanted.size;
  if (ratio < (rowSize ? 0.2 : 0.45)) return null;
  return (row.brand ? 30 : 8) + (rowSize ? 35 : 0) + Math.round(ratio * 35);
}

function matchLocalSuggested(item) {
  let best = null;
  for (const row of state.priceList) {
    const score = scorePriceRow(row, item);
    if (score == null) continue;
    if (!best || score > best.score) best = { row, score };
  }
  return best && best.score >= 45 ? best.row : null;
}

function gapStatus(gap) {
  if (gap == null) return '';
  if (gap > 0.5) return 'above';
  if (gap < -0.5) return 'below';
  return 'ok';
}

function suggestedFor(item) {
  const local = matchLocalSuggested(item);
  if (local) return { price: local.price, product: local.product, source: local.source || 'lista local', local: true };
  if (item.suggestedPrice != null) {
    return { price: item.suggestedPrice, product: item.suggestedProduct, source: item.suggestedSource || 'archivo backend', local: false };
  }
  return null;
}

function gapFor(item) {
  const suggested = suggestedFor(item);
  if (!suggested?.price || item.price == null) return null;
  return Number((((Number(item.price) - suggested.price) / suggested.price) * 100).toFixed(2));
}

function pvpCell(item) {
  const suggested = suggestedFor(item);
  if (!suggested?.price) return '<span class="suggested-empty">-</span>';
  return `<div class="suggested-cell"><span class="suggested-price">${fmtPrice(suggested.price)}</span>${suggested.local ? '<span class="suggested-ref">local</span>' : ''}</div>`;
}

function gapCell(item) {
  const gap = gapFor(item);
  if (gap == null) return '<span class="suggested-empty">-</span>';
  const status = gapStatus(gap);
  return `<span class="gap-badge ${escape(status)}" title="${escape(GAP_LABEL[status] || '')}">${fmtPct(gap)}</span>`;
}

// ===== Carga =====
async function load() {
  try {
    const r = await fetch('/data/latest.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('No se pudo cargar latest.json');
    const data = await r.json();
    state.allItems = (data.items || []).map(normalizeLoadedItem).filter(Boolean);
    state.groups = { saman: OWN_BRANDS, competencia: COMPETITOR_BRANDS };
    state.suggested = data.suggested || null;
    state.generatedAt = data.generatedAt;
    applyGroupFilter();
    renderAll();
  } catch (e) {
    console.error(e);
    $('#lastUpdate').innerHTML = '<b>Sin datos.</b><br>Tocá "Actualizar precios" para hacer el primer scrape.';
  }
  loadHistory();
}

async function loadHistory() {
  try {
    const r = await fetch('/data/history.jsonl', { cache: 'no-store' });
    if (!r.ok) return;
    const text = await r.text();
    state.history = text.split('\n').filter(Boolean).map((line) => JSON.parse(line));
  } catch (e) { console.warn('Sin histórico aún:', e.message); }
}

function renderAll() {
  renderHeader();
  renderKPIs();
  renderCatalog();
  renderCompare();
  renderOffers();
  renderPrices();
  renderPositioning();
  renderExecutive();
  updateTabBadges();
}

function renderHeader() {
  $('#competidorBtn')?.classList.toggle('active', state.competitorMode);
  if ($('#competidorBtnLabel')) {
    $('#competidorBtnLabel').textContent = state.competitorMode ? '◀ Volver a Saman' : 'Escanear competencia';
  }
  if ($('#competenciaBanner')) $('#competenciaBanner').style.display = state.competitorMode ? '' : 'none';
  if (!state.generatedAt) return;
  const d = new Date(state.generatedAt);
  $('#lastUpdate').innerHTML = `<b>Última actualización</b><br>${d.toLocaleString('es-UY', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function renderKPIs() {
  const groupItems = state.items.filter((i) => i.group === activeGroup());
  const offers = state.items.filter((i) => i.listPrice && i.price && i.listPrice > i.price);
  const avgGroup = groupItems.length ? Math.round(groupItems.reduce((s, i) => s + (i.price ?? 0), 0) / groupItems.length) : 0;
  const categories = new Set(groupItems.map((i) => extractCategory(i.name)));
  const supers = new Set(groupItems.map((i) => i.super));
  const withPvp = state.items.filter((i) => suggestedFor(i)?.price != null);
  const avgGap = withPvp.length ? withPvp.reduce((sum, i) => sum + (gapFor(i) ?? 0), 0) / withPvp.length : null;

  $('#kpis').innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Productos ${escape(activeGroupLabel())}</div>
      <div class="kpi-value">${groupItems.length}</div>
      <div class="kpi-sub">prom ${fmtPrice(avgGroup)}</div>
    </div>
    <div class="kpi azul">
      <div class="kpi-label">Líneas de producto</div>
      <div class="kpi-value">${categories.size}</div>
      <div class="kpi-sub">${[...categories].slice(0, 3).join(', ')}${categories.size > 3 ? '…' : ''}</div>
    </div>
    <div class="kpi amarillo">
      <div class="kpi-label">Supers relevados</div>
      <div class="kpi-value">${supers.size}/4</div>
      <div class="kpi-sub">${[...supers].map((s) => SUPER_LABEL[s] || s).join(', ') || 'sin datos'}</div>
    </div>
    <div class="kpi verde">
      <div class="kpi-label">Ofertas activas</div>
      <div class="kpi-value">${offers.length}</div>
      <div class="kpi-sub">${state.items.length ? Math.round(offers.length / state.items.length * 100) : 0}% del catálogo</div>
    </div>
    <div class="kpi azul">
      <div class="kpi-label">PVP cruzados</div>
      <div class="kpi-value">${withPvp.length}</div>
      <div class="kpi-sub">GAP prom ${avgGap == null ? '-' : fmtPct(avgGap)}</div>
    </div>
  `;
}

// ===== Catálogo =====
function buildChips(items, key, container, stateSet, labels = null) {
  const values = [...new Set(items.map((i) => i[key]))].filter(Boolean).sort();
  container.innerHTML = values.map((v) => {
    const label = labels ? (labels[v] ?? v) : v;
    const active = stateSet.has(v);
    return `<span class="chip ${active ? 'active' : ''}" data-${key}="${escape(v)}">${escape(label)}</span>`;
  }).join('');
  container.querySelectorAll('.chip').forEach((el) => {
    el.addEventListener('click', () => {
      const v = el.dataset[key];
      if (stateSet.has(v)) stateSet.delete(v); else stateSet.add(v);
      el.classList.toggle('active');
      renderCatalog();
    });
  });
}

function filterItems(items, q, categories, supers, groups) {
  const qn = stripAccents(q.toLowerCase().trim());
  return items.filter((i) => {
    if (qn && !stripAccents(i.name.toLowerCase()).includes(qn)) return false;
    if (categories.size && !categories.has(extractCategory(i.name))) return false;
    if (supers.size && !supers.has(i.super)) return false;
    if (groups.size && !groups.has(i.group)) return false;
    return true;
  });
}

function sortItems(items, sort) {
  const dir = sort.asc ? 1 : -1;
  const valueFor = (item) => {
    if (sort.key === 'suggestedPrice') return suggestedFor(item)?.price ?? null;
    if (sort.key === 'gapPct') return gapFor(item);
    return item[sort.key];
  };
  return items.slice().sort((a, b) => {
    const va = valueFor(a), vb = valueFor(b);
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    return String(va).localeCompare(String(vb), 'es') * dir;
  });
}

function extractCategory(name) {
  const n = stripAccents(name.toLowerCase());
  if (/sushi/.test(n)) return 'Arroz para Sushi';
  if (/yamani|integral/.test(n)) return 'Arroz Integral';
  if (/parboil|carolina|doble/.test(n)) return 'Arroz Parboil/Doble';
  if (/arroz/.test(n)) return 'Arroz Blanco';
  if (/soja|salsa|condimento|aderezo/.test(n)) return 'Salsas y Condimentos';
  if (/galleta|snack|cracker/.test(n)) return 'Snacks Orientales';
  if (/fideo|pasta|noodle|cabello/.test(n)) return 'Pastas Orientales';
  if (/conserva|lata|enlatad/.test(n)) return 'Conservas';
  return 'Otros';
}

function buildCategoryChips(items, container, activeSet) {
  const cats = [...new Set(items.map(i => extractCategory(i.name)))].sort();
  container.innerHTML = cats.map(c => {
    const active = activeSet.has(c);
    return `<span class="chip ${active ? 'active' : ''}" data-cat="${escape(c)}">${escape(c)}</span>`;
  }).join('');
  container.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.dataset.cat;
      if (activeSet.has(v)) activeSet.delete(v); else activeSet.add(v);
      el.classList.toggle('active');
      renderCatalog();
    });
  });
}

function renderCatalog() {
  buildChips(state.items, 'group', $('#groupChips'), state.catalog.groups, GROUP_LABEL);
  buildCategoryChips(state.items, $('#brandChips'), state.catalog.brands);
  buildChips(state.items, 'super', $('#superChips'), state.catalog.supers, SUPER_LABEL);
  const items = sortItems(filterItems(state.items, state.catalog.q, state.catalog.brands, state.catalog.supers, state.catalog.groups), state.catalog.sort);
  const tbody = $('#catalogRows');
  const empty = $('#catalogEmpty');
  if (!items.length) { tbody.innerHTML = ''; empty.style.display = 'block'; }
  else {
    empty.style.display = 'none';
    tbody.innerHTML = items.map((i) => {
      const isOffer = i.listPrice && i.price && i.listPrice > i.price;
      const discountPct = isOffer ? Math.round((1 - i.price / i.listPrice) * 100) : 0;
      const key = `${i.super}:${i.sku}`;
      return `<tr>
        <td><a href="#" class="product-link" data-key="${escape(key)}">${escape(i.name)}</a></td>
        <td class="brand">${escape(extractCategory(i.name))}</td>
        <td><span class="pill ${i.super}">${SUPER_LABEL[i.super] || i.super}</span></td>
        <td class="price">${fmtPrice(i.price)}${isOffer ? `<br><span class="price list">${fmtPrice(i.listPrice)}</span>` : ''}</td>
        <td class="price">${pvpCell(i)}</td>
        <td class="price">${gapCell(i)}</td>
        <td>${isOffer ? `<span class="discount-badge">−${discountPct}%</span>` : ''}</td>
      </tr>`;
    }).join('');
    bindProductLinks(tbody);
  }
  $('#catalogCount').textContent = items.length;
  $$('#tableCatalog th[data-sort]').forEach((th) => {
    th.classList.toggle('sorted', th.dataset.sort === state.catalog.sort.key);
    th.classList.toggle('asc', th.dataset.sort === state.catalog.sort.key && state.catalog.sort.asc);
  });
}

// ===== Comparador =====
function renderCompare() {
  const filteredClusters = state.clusters.filter((g) => {
    if (g.items.length < 2) return false;
    if (state.compare.brand && g.brand !== state.compare.brand) return false;
    if (state.compare.q) {
      const qn = stripAccents(state.compare.q.toLowerCase());
      if (!stripAccents(g.label.toLowerCase()).includes(qn)) return false;
    }
    return true;
  }).sort((a, b) => {
    const ap = a.items.map((x) => x.price).filter((p) => p != null);
    const bp = b.items.map((x) => x.price).filter((p) => p != null);
    const ad = ap.length ? Math.max(...ap) - Math.min(...ap) : 0;
    const bd = bp.length ? Math.max(...bp) - Math.min(...bp) : 0;
    return bd - ad;
  });

  const brands = [...new Set(state.items.map((i) => i.brand))].sort();
  if (!$('#compareBrand').options.length) {
    $('#compareBrand').innerHTML = '<option value="">Todas las marcas</option>' +
      brands.map((b) => `<option value="${escape(b)}">${escape(b.replace(/\b\w/g, (c) => c.toUpperCase()))}</option>`).join('');
  }

  const html = filteredClusters.map((g) => {
    const prices = g.items.map((x) => x.price).filter((p) => p != null);
    const min = prices.length ? Math.min(...prices) : null;
    const max = prices.length ? Math.max(...prices) : null;
    const savings = (min != null && max != null && max > min) ? max - min : 0;
    const savingsPct = savings && max ? Math.round((1 - min / max) * 100) : 0;
    const cells = SUPERS.map((s) => {
      const it = g.items.find((x) => x.super === s);
      if (!it) return `<div class="compare-cell empty"><div class="compare-cell-label">${SUPER_LABEL[s]}</div><div class="compare-cell-price">—</div></div>`;
      const isBest = it.price === min;
      const diff = it.price != null && min != null && it.price > min ? `+$${(it.price - min).toLocaleString('es-UY')}` : '';
      return `<div class="compare-cell ${isBest ? 'best' : ''}">
        <div class="compare-cell-label">${SUPER_LABEL[s]}</div>
        <div class="compare-cell-price">${it.url ? `<a href="${escape(it.url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none">${fmtPrice(it.price)}</a>` : fmtPrice(it.price)}</div>
        ${isBest ? '<div class="compare-cell-diff" style="color:var(--offer);font-weight:700">★ Más barato</div>' : (diff ? `<div class="compare-cell-diff">${diff}</div>` : '')}
      </div>`;
    }).join('');
    return `<div class="compare-row">
      <div class="compare-prod">
        <div>
          <div class="compare-prod-name">${escape(g.label)}</div>
          <div class="compare-prod-brand">${escape(g.brand)} · ${g.items.length} supers</div>
        </div>
        ${savings > 0 ? `<div style="text-align:right">
          <div style="font-size:11px;color:var(--texto-muted);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Ahorro máx</div>
          <div style="font-size:18px;font-weight:800;color:var(--offer)">$ ${savings.toLocaleString('es-UY')}</div>
          <div style="font-size:11px;color:var(--offer)">−${savingsPct}%</div>
        </div>` : ''}
      </div>
      <div class="compare-prices">${cells}</div>
    </div>`;
  }).join('');
  $('#compareList').innerHTML = html || '<div class="empty">No hay productos comparables.</div>';
  $('#compareCount').textContent = filteredClusters.length;
}

// ===== Ofertas =====
function renderOffers() {
  const offers = state.items
    .filter((i) => i.listPrice && i.price && i.listPrice > i.price)
    .map((i) => ({ ...i, discount: 1 - i.price / i.listPrice, savings: i.listPrice - i.price }))
    .sort((a, b) => b.discount - a.discount);
  const qn = stripAccents((state.offers.q || '').toLowerCase().trim());
  const filtered = qn ? offers.filter((o) => stripAccents(o.name.toLowerCase()).includes(qn)) : offers;
  const tbody = $('#offersRows');
  const empty = $('#offersEmpty');
  if (!filtered.length) { tbody.innerHTML = ''; empty.style.display = 'block'; }
  else {
    empty.style.display = 'none';
    tbody.innerHTML = filtered.map((o) => {
      const key = `${o.super}:${o.sku}`;
      return `<tr>
        <td><a href="#" class="product-link" data-key="${escape(key)}">${escape(o.name)}</a></td>
        <td class="brand">${escape(o.brand)}</td>
        <td><span class="pill ${o.super}">${SUPER_LABEL[o.super] || o.super}</span></td>
        <td class="price list">${fmtPrice(o.listPrice)}</td>
        <td class="price">${fmtPrice(o.price)}</td>
        <td class="price">${pvpCell(o)}</td>
        <td class="price">${gapCell(o)}</td>
        <td class="price" style="color:var(--offer)">${fmtPrice(o.savings)}</td>
        <td><span class="discount-badge">−${Math.round(o.discount * 100)}%</span></td>
      </tr>`;
    }).join('');
    bindProductLinks(tbody);
  }
  $('#offersCount').textContent = filtered.length;
}

function renderGlobalUpload() {
  const container = $('#globalUpload');
  if (!container) return;
  const rows = state.globalList || [];
  const count = rows.length;
  const preview = count > 0 ? rows.slice(0, 3).map((r) => escape(r.product || r.sku || '-')).join(', ') : '';
  container.innerHTML = `<div class="super-upload-card" style="max-width:480px">
    <div class="super-upload-header">
      <span style="font-weight:700;font-size:14px">Mi lista de precios</span>
      <span class="super-upload-count">${count} lineas cargadas</span>
    </div>
    <div style="font-size:12px;color:var(--texto-muted);margin:4px 0 8px">Columnas: <b>codigo</b>, <b>descripcion</b>, <b>pvp_sugerido</b></div>
    <div class="super-upload-controls">
      <label class="btn" for="globalPriceFile" style="cursor:pointer">📂 Cargar lista</label>
      <input type="file" id="globalPriceFile" accept=".xlsx,.xls,.csv,.json,application/json,text/csv" style="display:none" />
      <button class="btn danger-sm" id="clearGlobalBtn" style="display:${count > 0 ? 'inline-flex' : 'none'}">Limpiar</button>
    </div>
    ${count > 0 ? `<div class="super-upload-preview">${preview}${count > 3 ? '…' : ''}</div>` : ''}
  </div>`;

  const input = container.querySelector('#globalPriceFile');
  if (input) {
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) importGlobalPriceList(file).finally(() => { input.value = ''; });
    });
  }
  const clearBtn = container.querySelector('#clearGlobalBtn');
  if (clearBtn) clearBtn.addEventListener('click', clearGlobalPriceList);
}

async function importGlobalPriceList(file) {
  try {
    const name = file.name.toLowerCase();
    let rawRows;
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await file.arrayBuffer();
      rawRows = rowsFromExcel(new Uint8Array(buffer));
    } else if (name.endsWith('.json')) {
      rawRows = rowsFromJson(await file.text());
    } else {
      rawRows = rowsFromCsv(await file.text());
    }
    // No store override → stores = SUPERS (aplica a todas las cadenas)
    const rows = normalizePriceRows(rawRows, '', file.name);
    const d = rows._diagnostics || {};
    if (!rows.length) {
      const hints = [];
      if (d.noPrice > 0) hints.push(`${d.noPrice} filas sin pvp_sugerido`);
      if (d.noProduct > 0) hints.push(`${d.noProduct} filas sin descripcion`);
      throw new Error('No se encontraron filas validas.' + (hints.length ? ' ' + hints.join('; ') + '.' : ''));
    }
    state.globalList = rows;
    rebuildFlatPriceList();
    saveLocalPriceList();
    renderPrices();
    renderCatalog();
    updateTabBadges();
    const warn = d.noPrice > 0 ? ` (${d.noPrice} sin precio ignoradas)` : '';
    toast(`Lista cargada: ${rows.length} productos${warn}.`, 'success');
  } catch (err) {
    toast('Error importando: ' + err.message, 'error');
  }
}

function clearGlobalPriceList() {
  state.globalList = [];
  rebuildFlatPriceList();
  saveLocalPriceList();
  renderPrices();
  renderCatalog();
  updateTabBadges();
  toast('Lista limpiada.', 'success');
}

function renderPrices() {
  const localRows = state.priceList || [];
  const withPvp = state.items.filter((i) => suggestedFor(i)?.price != null);
  const stats = {
    above: withPvp.filter((i) => gapStatus(gapFor(i)) === 'above').length,
    ok: withPvp.filter((i) => gapStatus(gapFor(i)) === 'ok').length,
    below: withPvp.filter((i) => gapStatus(gapFor(i)) === 'below').length,
    local: state.items.filter((i) => matchLocalSuggested(i)).length,
  };
  const priceSummary = $('#priceSummary');
  if (priceSummary) {
    priceSummary.innerHTML = `
      <div class="suggested-card above"><div class="suggested-card-label">Sobre PVP</div><div class="suggested-card-value">${stats.above}</div></div>
      <div class="suggested-card ok"><div class="suggested-card-label">En linea</div><div class="suggested-card-value">${stats.ok}</div></div>
      <div class="suggested-card below"><div class="suggested-card-label">Bajo PVP</div><div class="suggested-card-value">${stats.below}</div></div>
      <div class="suggested-card"><div class="suggested-card-label">Lista local</div><div class="suggested-card-value">${localRows.length}</div><div class="suggested-ref">${stats.local} matches locales</div></div>
    `;
  }

  renderGlobalUpload();

  // Compact table of all loaded rows in #priceMatchDetails
  const details = $('#priceMatchDetails');
  if (details) {
    if (!localRows.length) {
      details.innerHTML = '<div class="empty" style="padding:30px 20px">Sin lista PVP cargada. Cargá un archivo arriba.</div>';
    } else {
      const rows = localRows.slice(0, 200);
      details.innerHTML = `<table class="mini-table">
        <thead><tr><th>Descripción</th><th>Código</th><th class="price">PVP Sugerido</th><th>Cadenas con match</th></tr></thead>
        <tbody>${rows.map((row) => {
          const matchedSupers = SUPERS.filter((s) => state.items.some((item) => scorePriceRow({ ...row, stores: [s] }, item) != null));
          return `<tr>
            <td>${escape(row.product || '-')}</td>
            <td style="color:var(--texto-muted);font-size:12px">${escape(row.sku || '-')}</td>
            <td class="price">${fmtPrice(row.price)}</td>
            <td>${matchedSupers.length ? matchedSupers.map((s) => `<span class="pill ${s}">${SUPER_LABEL[s]}</span>`).join(' ') : '<span style="color:var(--texto-muted);font-size:12px">sin match</span>'}</td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;
    }
  }

  const countEl = $('#priceListCount');
  if (countEl) countEl.textContent = localRows.length;
}

// ===== Cobertura =====
function renderPositioning() {
  const grupo = state.items.filter((i) => i.group === activeGroup());
  const perSuper = SUPERS.map((s) => {
    const arr = grupo.filter((i) => i.super === s);
    const prices = arr.map((i) => i.price).filter((p) => p != null);
    return {
      super: s,
      count: arr.length,
      avg: prices.length ? Math.round(prices.reduce((sum, x) => sum + x, 0) / prices.length) : null,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      offers: arr.filter((i) => i.listPrice && i.price && i.listPrice > i.price).length,
    };
  });

  const maxCount = Math.max(...perSuper.map((s) => s.count), 1);
  const byBrand = Object.entries(grupo.reduce((acc, item) => {
    (acc[item.brand] ??= []).push(item);
    return acc;
  }, {})).map(([brand, items]) => ({
    brand,
    count: items.length,
    supers: new Set(items.map((i) => i.super)).size,
    offers: items.filter((i) => i.listPrice && i.price && i.listPrice > i.price).length,
  })).sort((a, b) => b.count - a.count);

  $('#positioningContent').innerHTML = `
    <div class="exec-grid">
      <div class="exec-card">
        <h3>Cobertura por super</h3>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${perSuper.map((s) => `
            <div>
              <div style="font-size:12px;font-weight:700;margin-bottom:6px;display:flex;justify-content:space-between">
                <span><span class="pill ${s.super}">${SUPER_LABEL[s.super]}</span> ${s.count} SKUs</span>
                <span style="color:var(--azul)">prom ${fmtPrice(s.avg)}</span>
              </div>
              <div style="background:var(--crema);height:9px;border-radius:5px;overflow:hidden">
                <div style="background:var(--rojo);height:100%;width:${(s.count / maxCount * 100).toFixed(0)}%"></div>
              </div>
              <div style="font-size:11px;color:var(--texto-muted);margin-top:4px">Rango ${fmtPrice(s.min)} a ${fmtPrice(s.max)} · ${s.offers} ofertas</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="exec-card">
        <h3>Resumen ejecutivo</h3>
        <p style="font-size:13px;line-height:1.6;margin:0 0 12px;color:var(--texto)">${buildExecutiveSummary(grupo)}</p>
        <hr style="border:none;border-top:1px solid var(--border);margin:14px 0">
        <div style="font-size:12px;line-height:1.7">
          <div><b>SKUs ${escape(activeGroupLabel())}:</b> ${grupo.length}</div>
          <div><b>Variantes detectadas:</b> ${new Set(grupo.map((i) => i.brand)).size}</div>
          <div><b>Supermercados con presencia:</b> ${new Set(grupo.map((i) => i.super)).size}/4</div>
          <div><b>Ofertas activas:</b> ${grupo.filter((i) => i.listPrice && i.price && i.listPrice > i.price).length}</div>
        </div>
      </div>
    </div>

    ${renderCoverageCharts(grupo)}
  `;
}

function renderCoverageCharts(grupo) {
  const perSuper = SUPERS.map((s) => {
    const arr = grupo.filter((i) => i.super === s);
    const prices = arr.map((i) => i.price).filter((p) => p != null);
    return {
      super: s,
      count: arr.length,
      avg: prices.length ? Math.round(prices.reduce((sum, x) => sum + x, 0) / prices.length) : null,
    };
  }).filter((s) => s.count > 0);
  const maxCount = Math.max(...perSuper.map((s) => s.count), 1);

  const superColors = { tata: 'var(--tata)', disco: 'var(--disco)', eldorado: 'var(--eldorado)', tiendainglesa: 'var(--tiendainglesa)' };
  const chartABars = perSuper.map((s) => {
    const pct = (s.count / maxCount * 100).toFixed(1);
    return `<div class="chart-bar-row">
      <div class="chart-bar-label"><span class="pill ${s.super}">${SUPER_LABEL[s.super]}</span></div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${superColors[s.super] || 'var(--rojo)'}"></div></div>
      <div class="chart-bar-value">${s.count} SKUs</div>
    </div>`;
  }).join('');

  const maxAvg = Math.max(...perSuper.map((s) => s.avg || 0), 1);
  const chartBBars = perSuper.map((s) => {
    if (!s.avg) return '';
    const pct = (s.avg / maxAvg * 100).toFixed(1);
    return `<div class="chart-bar-row">
      <div class="chart-bar-label"><span class="pill ${s.super}">${SUPER_LABEL[s.super]}</span></div>
      <div class="chart-bar-track"><div class="chart-bar-fill" style="width:${pct}%;background:${superColors[s.super] || 'var(--rojo)'}"></div></div>
      <div class="chart-bar-value">${fmtPrice(s.avg)}</div>
    </div>`;
  }).join('');

  // Chart C: frequency of being most expensive vs cheapest per super
  const superExpensive = {};
  const superCheapest = {};
  SUPERS.forEach((s) => { superExpensive[s] = 0; superCheapest[s] = 0; });
  for (const g of state.clusters) {
    if (g.items.length < 2) continue;
    const prices = g.items.map((x) => x.price).filter((p) => p != null);
    if (!prices.length) continue;
    const maxP = Math.max(...prices);
    const minP = Math.min(...prices);
    for (const it of g.items) {
      if (it.price === maxP) superExpensive[it.super] = (superExpensive[it.super] || 0) + 1;
      if (it.price === minP) superCheapest[it.super] = (superCheapest[it.super] || 0) + 1;
    }
  }
  const maxCmp = Math.max(...SUPERS.map((s) => (superExpensive[s] || 0) + (superCheapest[s] || 0)), 1);
  const chartCBars = SUPERS.map((s) => {
    const exp = superExpensive[s] || 0;
    const chp = superCheapest[s] || 0;
    if (!exp && !chp) return '';
    const expPct = (exp / maxCmp * 100).toFixed(1);
    const chpPct = (chp / maxCmp * 100).toFixed(1);
    return `<div class="chart-bar-row">
      <div class="chart-bar-label"><span class="pill ${s}">${SUPER_LABEL[s]}</span></div>
      <div class="chart-bar-track" style="display:flex">
        <div style="width:${expPct}%;background:var(--rojo);height:100%;border-radius:4px 0 0 4px" title="${exp} veces más caro"></div>
        <div style="width:${chpPct}%;background:var(--offer);height:100%;border-radius:0 4px 4px 0" title="${chp} veces más barato"></div>
      </div>
      <div class="chart-bar-value" style="font-size:11px;width:120px">${exp > 0 ? `<span style="color:var(--rojo)">${exp}↑</span> ` : ''}${chp > 0 ? `<span style="color:var(--offer)">${chp}↓</span>` : ''}</div>
    </div>`;
  }).filter(Boolean).join('');

  // Chart D: brand coverage dots
  const brandsPresent = [...new Set(grupo.map((i) => i.brand))].filter((b) => portfolioBrands().includes(b));
  const brandCoverageRows = brandsPresent.map((brand) => {
    const brandItems = grupo.filter((i) => i.brand === brand);
    const supersWithBrand = new Set(brandItems.map((i) => i.super));
    const dots = SUPERS.map((s) => {
      const present = supersWithBrand.has(s);
      return `<span class="coverage-dot ${present ? 'present' : 'absent'}" title="${SUPER_LABEL[s]}">${SUPER_LABEL[s][0]}</span>`;
    }).join('');
    return `<div class="brand-coverage-row">
      <div class="brand-coverage-name">${escape(brand)}</div>
      ${dots}
      <span style="font-size:11px;color:var(--texto-muted);margin-left:4px">${brandItems.length} SKUs</span>
    </div>`;
  }).join('');

  return `<div class="exec-card charts-section">
    <h3>Mis productos en supermercados</h3>
    <div class="charts-grid">
      <div class="chart-card">
        <h4>SKUs por supermercado</h4>
        ${chartABars || '<div class="empty" style="padding:10px">Sin datos</div>'}
      </div>
      <div class="chart-card">
        <h4>Precio promedio mis productos</h4>
        ${chartBBars || '<div class="empty" style="padding:10px">Sin datos</div>'}
      </div>
      <div class="chart-card chart-full">
        <h4>Donde son mas caros / mas baratos mis productos <span style="font-size:10px;color:var(--rojo)">■ más caro</span> <span style="font-size:10px;color:var(--offer)">■ más barato</span></h4>
        ${chartCBars || '<div class="empty" style="padding:10px">No hay productos en 2+ supers aun</div>'}
      </div>
      <div class="chart-card chart-full">
        <h4>Cobertura de mis marcas</h4>
        ${brandCoverageRows || '<div class="empty" style="padding:10px">Sin datos de marcas</div>'}
      </div>
    </div>
  </div>`;
}

function buildExecutiveSummary(grupo) {
  if (!grupo.length) return `Aun no hay datos de ${escape(activeGroupLabel())}. Toca "Actualizar precios" para hacer el primer scrape.`;
  const prices = grupo.map((i) => i.price).filter((p) => p != null);
  const avg = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null;
  const brands = new Set(grupo.map((i) => i.brand));
  const supers = new Set(grupo.map((i) => i.super));
  return `Se relevaron <b>${grupo.length}</b> productos de ${escape(activeGroupLabel())} en <b>${supers.size}/4</b> supermercados, con <b>${brands.size}</b> variantes detectadas y precio promedio de <b>${fmtPrice(avg)}</b>.`;
}

// ===== Informe Gerencial =====
function renderExecutive() {
  if (!state.items.length) {
    $('#execContent').innerHTML = '<div class="empty">Sin datos. Tocá "Actualizar precios" primero.</div>';
    return;
  }
  const items = state.items;
  const total = items.length;
  const grupo = items.filter((i) => i.group === activeGroup());
  const offers = items.filter((i) => i.listPrice && i.price && i.listPrice > i.price);

  const byBrand = {};
  for (const i of items) (byBrand[i.brand] ??= []).push(i);
  const brandStats = Object.entries(byBrand).map(([brand, arr]) => {
    const prices = arr.map((x) => x.price).filter((p) => p != null);
    const avg = prices.length ? Math.round(prices.reduce((s, p) => s + p, 0) / prices.length) : null;
    return { brand, group: arr[0].group, count: arr.length, avg, supersCovered: new Set(arr.map((x) => x.super)).size, offers: arr.filter((i) => i.listPrice && i.price && i.listPrice > i.price).length };
  }).sort((a, b) => b.count - a.count);

  const bySuper = {};
  for (const i of items) (bySuper[i.super] ??= []).push(i);
  const superStats = SUPERS.map((s) => {
    const arr = bySuper[s] || [];
    const prices = arr.map((x) => x.price).filter((p) => p != null);
    return {
      super: s, count: arr.length,
      avg: prices.length ? Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length) : null,
      min: prices.length ? Math.min(...prices) : null,
      max: prices.length ? Math.max(...prices) : null,
      offers: arr.filter((i) => i.listPrice && i.price && i.listPrice > i.price).length,
      delGrupo: arr.filter((i) => i.group === activeGroup()).length,
    };
  }).filter((s) => s.count);
  const maxCount = Math.max(...superStats.map((s) => s.count));

  const clustersWithSpread = state.clusters
    .filter((g) => g.items.length >= 2)
    .map((g) => {
      const prices = g.items.map((x) => x.price).filter((p) => p != null);
      const spread = prices.length ? Math.max(...prices) - Math.min(...prices) : 0;
      const pct = prices.length ? (1 - Math.min(...prices) / Math.max(...prices)) * 100 : 0;
      return { ...g, spread, pct };
    })
    .filter((g) => g.spread > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);

  const topDiscounts = offers
    .map((o) => ({ ...o, pct: (1 - o.price / o.listPrice) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
  const pvpItems = items.filter((i) => suggestedFor(i)?.price != null);
  const pvpRows = pvpItems
    .sort((a, b) => Math.abs(gapFor(b) ?? 0) - Math.abs(gapFor(a) ?? 0))
    .slice(0, 8);
  const pvpAbove = pvpItems.filter((i) => gapStatus(gapFor(i)) === 'above').length;

  const date = new Date(state.generatedAt).toLocaleString('es-UY', { dateStyle: 'long', timeStyle: 'short' });

  $('#execContent').innerHTML = `
    <div class="print-only" style="margin-bottom:20px;border-bottom:2px solid var(--rojo);padding-bottom:14px">
      <img src="/logo.svg" alt="SAMAN" style="height:54px;width:auto;border-radius:6px;margin:0 0 10px;display:block">
      <h1 style="margin:0;font-size:24px;color:var(--rojo)">Informe Ejecutivo · Gondola SAMAN Uruguay</h1>
      <p style="margin:6px 0 0;color:#555;font-size:12px">Generado: ${escape(date)} · Grupo: ${escape(activeGroupLabel())} · Tata · Disco · El Dorado · Tienda Inglesa</p>
    </div>

    <div class="kpis" style="margin-bottom:20px">
      <div class="kpi"><div class="kpi-label">SKUs totales</div><div class="kpi-value">${total}</div><div class="kpi-sub">${grupo.length} ${escape(activeGroupLabel())}</div></div>
      <div class="kpi azul"><div class="kpi-label">Marcas relevadas</div><div class="kpi-value">${brandStats.length}</div></div>
      <div class="kpi verde"><div class="kpi-label">Ofertas vigentes</div><div class="kpi-value">${offers.length}</div><div class="kpi-sub">${Math.round(offers.length / total * 100)}% del catálogo</div></div>
      <div class="kpi amarillo"><div class="kpi-label">Productos comparables</div><div class="kpi-value">${clustersWithSpread.length}</div><div class="kpi-sub">presentes en 2+ supers</div></div>
      <div class="kpi azul"><div class="kpi-label">PVP cruzados</div><div class="kpi-value">${pvpItems.length}</div><div class="kpi-sub">${pvpAbove} sobre PVP</div></div>
    </div>

    <div class="exec-card" style="margin-bottom:16px">
      <h3>Resumen</h3>
      <p style="margin:0;font-size:13px;line-height:1.6">${buildExecutiveSummary(grupo)}</p>
    </div>

    <div class="exec-grid">
      <div class="exec-card">
        <h3>Performance por marca</h3>
        <div class="brand-stats">
          ${brandStats.map((b) => `
            <div class="brand-stat">
              <div>
                <div class="brand-stat-name">${escape(b.brand)}</div>
                <div class="brand-stat-detail">${b.count} SKUs · ${b.supersCovered}/4 supers · ${b.offers} ofertas</div>
              </div>
              <div style="text-align:right">
                <div class="brand-stat-value">${fmtPrice(b.avg)}</div>
                <div class="brand-stat-detail">precio promedio</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="exec-card">
        <h3>Cobertura por supermercado</h3>
        <div class="super-bars">
          ${superStats.map((s) => `
            <div class="super-bar">
              <div class="super-bar-header">
                <span><span class="pill ${s.super}">${SUPER_LABEL[s.super]}</span> ${s.count} SKUs · ${s.offers} ofertas</span>
                <span style="font-variant-numeric:tabular-nums">prom ${fmtPrice(s.avg)}</span>
              </div>
              <div class="super-bar-track">
                <div class="super-bar-fill ${s.super}" style="width:${(s.count / maxCount * 100).toFixed(1)}%"></div>
              </div>
              <div style="font-size:11px;color:var(--texto-muted);margin-top:3px">Rango: ${fmtPrice(s.min)} — ${fmtPrice(s.max)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="exec-card" style="margin-bottom:16px">
      <h3>Top 5 diferencias entre supermercados</h3>
      <p style="margin:0 0 10px;font-size:12px;color:var(--texto-muted)">Productos con mayor diferencia % de precio entre supers (oportunidad de optimización de compra/venta).</p>
      <table>
        <thead><tr><th>Producto</th><th>Marca</th><th class="price">Más barato</th><th class="price">Más caro</th><th class="price">Diferencia</th></tr></thead>
        <tbody>
          ${clustersWithSpread.map((g) => {
            const prices = g.items.map((x) => x.price).filter((p) => p != null);
            const minIt = g.items.find((x) => x.price === Math.min(...prices));
            const maxIt = g.items.find((x) => x.price === Math.max(...prices));
            return `<tr>
              <td>${escape(g.label)}</td>
              <td class="brand">${escape(g.brand)}</td>
              <td class="price">${fmtPrice(minIt.price)} <span class="pill ${minIt.super}" style="font-size:9px">${SUPER_LABEL[minIt.super]}</span></td>
              <td class="price">${fmtPrice(maxIt.price)} <span class="pill ${maxIt.super}" style="font-size:9px">${SUPER_LABEL[maxIt.super]}</span></td>
              <td class="price" style="color:var(--rojo)">$ ${g.spread.toLocaleString('es-UY')} · ${g.pct.toFixed(1)}%</td>
            </tr>`;
          }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--texto-muted)">No hay productos comparables.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="exec-card" style="margin-bottom:16px">
      <h3>Top 5 mayores descuentos</h3>
      <table>
        <thead><tr><th>Producto</th><th>Marca</th><th>Super</th><th class="price">Lista</th><th class="price">Oferta</th><th>Descuento</th></tr></thead>
        <tbody>
          ${topDiscounts.map((o) => `<tr>
              <td>${escape(o.name)}</td>
              <td class="brand">${escape(o.brand)}</td>
              <td><span class="pill ${o.super}">${SUPER_LABEL[o.super]}</span></td>
              <td class="price list">${fmtPrice(o.listPrice)}</td>
              <td class="price">${fmtPrice(o.price)}</td>
              <td><span class="discount-badge">−${Math.round(o.pct)}%</span></td>
            </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--texto-muted)">No hay ofertas.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div class="exec-card" style="margin-bottom:16px">
      <h3>Control PVP sugerido</h3>
      <table>
        <thead><tr><th>Producto</th><th>Marca</th><th>Super</th><th class="price">Precio</th><th class="price">PVP</th><th class="price">GAP</th></tr></thead>
        <tbody>
          ${pvpRows.map((i) => {
            const suggested = suggestedFor(i);
            const gap = gapFor(i);
            const status = gapStatus(gap);
            return `<tr>
              <td>${escape(i.name)}</td>
              <td class="brand">${escape(i.brand)}</td>
              <td><span class="pill ${i.super}">${SUPER_LABEL[i.super]}</span></td>
              <td class="price">${fmtPrice(i.price)}</td>
              <td class="price">${fmtPrice(suggested?.price)}</td>
              <td class="price"><span class="gap-badge ${escape(status)}">${fmtPct(gap)}</span></td>
            </tr>`;
          }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--texto-muted)">Sin PVP cruzado.</td></tr>'}
        </tbody>
      </table>
    </div>

    <div style="text-align:center;margin-top:24px" class="no-print">
      <button class="btn azul btn-print" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
    </div>
    <p class="print-only" style="margin-top:30px;font-size:10px;color:#555;text-align:center;border-top:1px solid #ccc;padding-top:10px">Datos relevados automáticamente.</p>
  `;
}

// ===== Tabs =====
function updateTabBadges() {
  const offers = state.items.filter((i) => i.listPrice && i.price && i.listPrice > i.price).length;
  const comparable = state.clusters.filter((g) => g.items.length >= 2).length;
  $('#badgeCatalog').textContent = state.items.length;
  $('#badgeCompare').textContent = comparable;
  $('#badgeOffers').textContent = offers;
  $('#badgePrices').textContent = state.items.filter((i) => suggestedFor(i)?.price != null).length;
}

function switchTab(name) {
  state.view = name;
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === 'view-' + name));
  if (name === 'mapa') setTimeout(initMap, 50);
}

// ===== Modal de evolución de precio =====
function bindProductLinks(root) {
  root.querySelectorAll('.product-link').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      openProductModal(a.dataset.key);
    });
  });
}

function openProductModal(key) {
  const item = state.items.find((i) => `${i.super}:${i.sku}` === key);
  if (!item) return;
  const points = (state.history || [])
    .map((s) => ({ t: new Date(s.t).getTime(), p: s.prices[key] }))
    .filter((x) => x.p != null);

  $('#modalContent').innerHTML = `
    <h2 style="margin:0 0 4px;font-size:18px">${escape(item.name)}</h2>
    <div style="font-size:13px;color:var(--texto-muted);margin-bottom:14px">
      <span style="text-transform:capitalize;font-weight:600">${escape(item.brand)}</span> ·
      <span class="pill ${item.super}">${SUPER_LABEL[item.super]}</span> ·
      <span style="color:var(--rojo);font-weight:700">${escape(GROUP_LABEL[item.group] || item.group)}</span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px">
      <div class="kpi" style="padding:10px 12px"><div class="kpi-label">Precio actual</div><div style="font-size:20px;font-weight:800">${fmtPrice(item.price)}</div></div>
      <div class="kpi azul" style="padding:10px 12px"><div class="kpi-label">Precio lista</div><div style="font-size:20px;font-weight:800">${fmtPrice(item.listPrice)}</div></div>
      <div class="kpi verde" style="padding:10px 12px"><div class="kpi-label">Snapshots</div><div style="font-size:20px;font-weight:800">${points.length}</div></div>
    </div>

    <h3 style="font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--azul);margin:18px 0 8px">Evolución del precio</h3>
    ${renderSparkline(points)}
    ${points.length >= 2 ? buildHistoryTable(points) : '<div class="empty" style="padding:14px">Hay ${points.length} snapshot(s). Necesitamos ≥2 para mostrar evolución. Volvé a actualizar precios en un rato.</div>'.replace('${points.length}', points.length)}

    ${item.url ? `<div style="margin-top:16px;text-align:right"><a class="btn" href="${escape(item.url)}" target="_blank" rel="noopener">Ver en el super →</a></div>` : ''}
  `;
  $('#modal').classList.add('show');
}

function renderSparkline(points) {
  if (points.length < 2) {
    return '<div style="padding:40px;text-align:center;background:var(--crema);border-radius:10px;color:var(--texto-muted);font-size:13px">📈 Histórico aún no disponible (necesita al menos 2 snapshots).</div>';
  }
  const W = 600, H = 140, P = 20;
  const xs = points.map((x) => x.t);
  const ys = points.map((x) => x.p);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const padY = (maxY - minY) * 0.15 || 5;
  const ymin = minY - padY, ymax = maxY + padY;
  const xFor = (t) => P + ((t - minX) / Math.max(1, maxX - minX)) * (W - 2 * P);
  const yFor = (p) => H - P - ((p - ymin) / Math.max(1, ymax - ymin)) * (H - 2 * P);
  const d = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xFor(pt.t).toFixed(1)} ${yFor(pt.p).toFixed(1)}`).join(' ');
  const area = `${d} L ${xFor(maxX).toFixed(1)} ${H - P} L ${xFor(minX).toFixed(1)} ${H - P} Z`;
  const dots = points.map((pt) => `<circle cx="${xFor(pt.t).toFixed(1)}" cy="${yFor(pt.p).toFixed(1)}" r="3" fill="var(--rojo)" stroke="#fff" stroke-width="1.5"/>`).join('');
  const labels = points.length <= 8 ? points.map((pt) => `<text x="${xFor(pt.t).toFixed(1)}" y="${(yFor(pt.p) - 8).toFixed(1)}" font-size="10" text-anchor="middle" fill="var(--azul)" font-weight="700">${pt.p}</text>`).join('') : '';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;background:var(--crema);border-radius:10px;display:block">
    <path d="${area}" fill="var(--rojo)" opacity=".12"/>
    <path d="${d}" fill="none" stroke="var(--rojo)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}${labels}
  </svg>`;
}

function buildHistoryTable(points) {
  const rows = points.slice().reverse().slice(0, 10).map((pt, i, arr) => {
    const prev = arr[i + 1];
    const diff = prev ? pt.p - prev.p : 0;
    const arrow = diff > 0 ? '<span style="color:var(--rojo)">▲</span>' : diff < 0 ? '<span style="color:var(--offer)">▼</span>' : '<span style="color:var(--texto-muted)">—</span>';
    return `<tr><td>${new Date(pt.t).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' })}</td><td class="price">${fmtPrice(pt.p)}</td><td>${arrow} ${diff ? (diff > 0 ? '+' : '') + diff : ''}</td></tr>`;
  }).join('');
  return `<table style="margin-top:10px">
    <thead><tr><th>Fecha</th><th class="price">Precio</th><th>Cambio</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function closeModal() { $('#modal').classList.remove('show'); }

// ===== Refresh =====
let refreshCancelled = false;

async function pollUntilDone(initialGeneratedAt) {
  const start = Date.now();
  const maxMs = 15 * 60 * 1000;
  let failedStatusPolls = 0;
  while (Date.now() - start < maxMs) {
    if (refreshCancelled) throw new Error('Actualización cancelada.');
    await new Promise((r) => setTimeout(r, 10000));
    if (refreshCancelled) throw new Error('Actualización cancelada.');
    try {
      const r = await fetch('/data/latest.json', { cache: 'no-store' });
      if (r.ok) {
        const d = await r.json();
        if (d.generatedAt && d.generatedAt !== initialGeneratedAt) return d;
      }
      const s = await fetch('/api/status', { cache: 'no-store' });
      if (s.ok) {
        failedStatusPolls = 0;
        const sd = await s.json();
        const elapsed = Math.round((Date.now() - start) / 1000);
        $('#refreshBtn').innerHTML = `<span class="spinner"></span> ${sd.status === 'queued' ? 'En cola…' : 'Scraping…'} (${elapsed}s) <small style="opacity:.7">(click para cancelar)</small>`;
        if (sd.status === 'completed' && sd.conclusion === 'failure') throw new Error('El scrape falló.');
      } else {
        failedStatusPolls++;
        if (failedStatusPolls >= 3) throw new Error('No se puede verificar el estado del scrape. Intentá de nuevo en unos minutos.');
      }
    } catch (e) {
      if (e.message.includes('cancelada') || e.message.includes('falló') || e.message.includes('verificar')) throw e;
      failedStatusPolls++;
      if (failedStatusPolls >= 3) throw new Error('Perdimos conexión con el servidor. Intentá de nuevo en unos minutos.');
      console.warn('poll', e);
    }
  }
  throw new Error('Timeout esperando el nuevo scrape (>15 min).');
}

async function refresh() {
  refreshCancelled = false;
  const btn = $('#refreshBtn');
  btn.disabled = false; // keep clickable for cancel
  const originalHTML = btn.innerHTML;
  const originalOnclick = btn.onclick;
  const initial = state.generatedAt;
  try {
    btn.innerHTML = '<span class="spinner"></span> Disparando…';
    btn.disabled = true;
    const resp = await fetch('/api/refresh', { method: 'POST' });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || data.ok === false) {
      const msg = data.error || `HTTP ${resp.status}`;
      if (msg.includes('GITHUB_TOKEN') || msg.includes('GITHUB_REPO')) {
        throw new Error('Falta configurar GITHUB_TOKEN y GITHUB_REPO en Vercel → Settings → Environment Variables');
      }
      throw new Error(msg);
    }
    toast('Scrape disparado. Esperando resultados (~3-5 min)…');
    btn.disabled = false;
    btn.innerHTML = '<span class="spinner"></span> Scraping… <small style="opacity:.7">(click para cancelar)</small>';
    btn.onclick = () => { refreshCancelled = true; };
    await pollUntilDone(initial);
    toast('Listo. Datos actualizados.', 'success');
    await load();
  } catch (err) {
    toast((refreshCancelled ? '' : 'Error: ') + err.message, refreshCancelled ? '' : 'error');
  } finally {
    refreshCancelled = false;
    btn.disabled = false;
    btn.innerHTML = originalHTML;
    btn.onclick = originalOnclick;
  }
}

// ===== Eventos =====
function initEvents() {
  $$('.tab').forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  $('#refreshBtn').addEventListener('click', refresh);
  $('#competidorBtn').addEventListener('click', () => {
    state.competitorMode = !state.competitorMode;
    applyGroupFilter();
    switchTab('catalog');
    renderAll();
    toast(state.competitorMode
      ? 'Modo competencia: Blue Patna · Arroz Green Chef · Arroz Aruba · Kikkoman · Mirokumai'
      : 'Volviste a las marcas Saman, La Abundancia y Kyoto');
  });
  $('#catalogQ').addEventListener('input', (e) => { state.catalog.q = e.target.value; renderCatalog(); });
  $$('#tableCatalog th[data-sort]').forEach((th) => th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (state.catalog.sort.key === key) state.catalog.sort.asc = !state.catalog.sort.asc;
    else state.catalog.sort = { key, asc: key !== 'price' };
    renderCatalog();
  }));
  $('#compareQ').addEventListener('input', (e) => { state.compare.q = e.target.value; renderCompare(); });
  $('#compareBrand').addEventListener('change', (e) => { state.compare.brand = e.target.value; renderCompare(); });
  $('#offersQ').addEventListener('input', (e) => { state.offers.q = e.target.value; renderOffers(); });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  $('#modalClose').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
}

// ===== Mapa =====
const SUPER_LOCATIONS = [
  // Tata - Montevideo y área metropolitana
  { name: 'Tata Pocitos', super: 'tata', lat: -34.9148, lng: -56.1544 },
  { name: 'Tata Malvín', super: 'tata', lat: -34.8918, lng: -56.1283 },
  { name: 'Tata Centro', super: 'tata', lat: -34.9069, lng: -56.1880 },
  { name: 'Tata Carrasco', super: 'tata', lat: -34.8742, lng: -56.0596 },
  { name: 'Tata La Unión', super: 'tata', lat: -34.8991, lng: -56.1509 },
  { name: 'Tata Sayago', super: 'tata', lat: -34.8720, lng: -56.2300 },
  { name: 'Tata Colón', super: 'tata', lat: -34.8622, lng: -56.2020 },
  { name: 'Tata Brazo Oriental', super: 'tata', lat: -34.8960, lng: -56.1648 },
  { name: 'Tata Montevideo Shopping', super: 'tata', lat: -34.9033, lng: -56.1390 },
  { name: 'Tata Las Piedras', super: 'tata', lat: -34.7270, lng: -56.2150 },
  { name: 'Tata Canelones', super: 'tata', lat: -34.5194, lng: -56.2789 },
  { name: 'Tata San José', super: 'tata', lat: -34.3374, lng: -56.7134 },
  { name: 'Tata Salto', super: 'tata', lat: -31.3847, lng: -57.9609 },
  { name: 'Tata Paysandú', super: 'tata', lat: -32.3227, lng: -58.0756 },
  { name: 'Tata Rivera', super: 'tata', lat: -30.9054, lng: -55.5505 },
  { name: 'Tata Melo', super: 'tata', lat: -32.3695, lng: -54.1764 },
  { name: 'Tata Treinta y Tres', super: 'tata', lat: -33.2332, lng: -54.3834 },
  { name: 'Tata Florida', super: 'tata', lat: -34.0990, lng: -56.2130 },
  { name: 'Tata Durazno', super: 'tata', lat: -33.3806, lng: -56.5215 },
  { name: 'Tata Tacuarembó', super: 'tata', lat: -31.7150, lng: -55.9839 },
  { name: 'Tata Mercedes', super: 'tata', lat: -33.2556, lng: -58.0300 },
  { name: 'Tata Colonia', super: 'tata', lat: -34.4689, lng: -57.8413 },
  { name: 'Tata Maldonado', super: 'tata', lat: -34.9022, lng: -54.9590 },
  { name: 'Tata Rocha', super: 'tata', lat: -34.4834, lng: -54.3390 },
  { name: 'Tata Artigas', super: 'tata', lat: -30.4020, lng: -56.4745 },
  { name: 'Tata Fray Bentos', super: 'tata', lat: -33.1203, lng: -58.2997 },
  // Disco - Montevideo
  { name: 'Disco Punta Carretas', super: 'disco', lat: -34.9266, lng: -56.1607 },
  { name: 'Disco Pocitos', super: 'disco', lat: -34.9100, lng: -56.1620 },
  { name: 'Disco Carrasco', super: 'disco', lat: -34.8780, lng: -56.0532 },
  { name: 'Disco Tres Cruces', super: 'disco', lat: -34.8989, lng: -56.1683 },
  { name: 'Disco Buceo', super: 'disco', lat: -34.8985, lng: -56.1370 },
  { name: 'Disco Parque Batlle', super: 'disco', lat: -34.9062, lng: -56.1570 },
  { name: 'Disco Portones', super: 'disco', lat: -34.8735, lng: -56.0842 },
  { name: 'Disco Prado', super: 'disco', lat: -34.8770, lng: -56.2090 },
  { name: 'Disco Montevideo Shopping', super: 'disco', lat: -34.9025, lng: -56.1395 },
  { name: 'Disco Goes', super: 'disco', lat: -34.8943, lng: -56.1961 },
  { name: 'Disco Malvín', super: 'disco', lat: -34.8902, lng: -56.1275 },
  // El Dorado - Montevideo
  { name: 'El Dorado 18 de Julio', super: 'eldorado', lat: -34.9060, lng: -56.1838 },
  { name: 'El Dorado Cordón', super: 'eldorado', lat: -34.9043, lng: -56.1723 },
  { name: 'El Dorado Prado', super: 'eldorado', lat: -34.8780, lng: -56.2012 },
  { name: 'El Dorado Ciudad Vieja', super: 'eldorado', lat: -34.9070, lng: -56.2040 },
  { name: 'El Dorado Palermo', super: 'eldorado', lat: -34.9000, lng: -56.1800 },
  { name: 'El Dorado Centro Comercial', super: 'eldorado', lat: -34.9030, lng: -56.1900 },
  // Tienda Inglesa - Montevideo y resto del país
  { name: 'Tienda Inglesa Pocitos', super: 'tiendainglesa', lat: -34.9164, lng: -56.1530 },
  { name: 'Tienda Inglesa WTC', super: 'tiendainglesa', lat: -34.9005, lng: -56.1413 },
  { name: 'Tienda Inglesa Punta Carretas', super: 'tiendainglesa', lat: -34.9262, lng: -56.1650 },
  { name: 'Tienda Inglesa Carrasco', super: 'tiendainglesa', lat: -34.8760, lng: -56.0495 },
  { name: 'Tienda Inglesa Montevideo Shopping', super: 'tiendainglesa', lat: -34.9020, lng: -56.1400 },
  { name: 'Tienda Inglesa Portones', super: 'tiendainglesa', lat: -34.8730, lng: -56.0850 },
  { name: 'Tienda Inglesa Cordón', super: 'tiendainglesa', lat: -34.9047, lng: -56.1740 },
  { name: 'Tienda Inglesa Maldonado', super: 'tiendainglesa', lat: -34.9035, lng: -54.9610 },
  { name: 'Tienda Inglesa Punta del Este', super: 'tiendainglesa', lat: -34.9624, lng: -54.9452 },
  { name: 'Tienda Inglesa San José', super: 'tiendainglesa', lat: -34.3390, lng: -56.7110 },
  { name: 'Tienda Inglesa Colonia', super: 'tiendainglesa', lat: -34.4705, lng: -57.8390 },
];

let _mapInstance = null;
let _mapInitialized = false;

function superIconWhite() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26">
    <circle cx="13" cy="13" r="11" fill="white" stroke="#1A4F9C" stroke-width="2.5"/>
    <circle cx="13" cy="13" r="4" fill="#1A4F9C"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -15],
  });
}

function bakeryIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="9" fill="#e53e3e" stroke="white" stroke-width="2"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -12],
  });
}

async function initMap() {
  if (_mapInitialized) { _mapInstance?.invalidateSize(); return; }
  _mapInitialized = true;

  // Center on Uruguay
  const map = L.map('mapaContainer').setView([-32.8, -56.0], 7);
  _mapInstance = map;

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(map);

  // White markers for all supermarkets
  for (const loc of SUPER_LOCATIONS) {
    L.marker([loc.lat, loc.lng], { icon: superIconWhite() })
      .addTo(map)
      .bindPopup(`<b>${loc.name}</b><br><span style="color:#1A4F9C;font-size:11px">${SUPER_LABEL[loc.super]}</span>`);
  }

  // Legend
  const legend = L.control({ position: 'bottomright' });
  legend.onAdd = () => {
    const div = L.DomUtil.create('div', '');
    div.style.cssText = 'background:white;padding:10px 14px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.2);font-size:12px;line-height:2';
    div.innerHTML =
      `<div><span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:white;border:2.5px solid #1A4F9C;vertical-align:middle;margin-right:6px"></span>Supermercados (${SUPER_LOCATIONS.length})</div>` +
      `<div><span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:#e53e3e;vertical-align:middle;margin-right:6px"></span>Panaderías</div>`;
    return div;
  };
  legend.addTo(map);

  // Status indicator
  const status = L.control({ position: 'topleft' });
  status.onAdd = () => {
    const div = L.DomUtil.create('div', '');
    div.id = 'mapaStatus';
    div.style.cssText = 'background:white;padding:6px 12px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.15);font-size:12px;color:#555';
    div.textContent = 'Cargando panaderías…';
    return div;
  };
  status.addTo(map);

  const statusEl = document.getElementById('mapaStatus');
  const seen = new Set();
  let totalBakeries = 0;

  function addBakeryMarker(lat, lon, name, address) {
    const key = `${(+lat).toFixed(4)},${(+lon).toFixed(4)}`;
    if (seen.has(key)) return;
    seen.add(key);
    const safeName = String(name).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
    const safeAddr = address ? `<br><span style="font-size:11px;color:#888">${String(address).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))}</span>` : '';
    L.marker([+lat, +lon], { icon: bakeryIcon() })
      .addTo(map)
      .bindPopup(`<b>${safeName}</b>${safeAddr}<br><span style="color:#e53e3e;font-size:11px">Panadería</span>`);
    totalBakeries++;
    if (statusEl) statusEl.textContent = `${SUPER_LOCATIONS.length} supermercados · ${totalBakeries} panaderías`;
  }

  // Nominatim: búsqueda rápida por texto, sin API key, CORS habilitado
  async function nominatimSearch(q) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=uy&format=jsonv2&limit=50&addressdetails=1&dedupe=1`;
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const resp = await fetch(url, { headers: { 'Accept-Language': 'es' }, signal: ctrl.signal });
      clearTimeout(t);
      if (!resp.ok) return [];
      return await resp.json();
    } catch { return []; }
  }

  function processNominatim(results) {
    for (const r of results) {
      if (!r.lat || !r.lon) continue;
      const name = r.name || r.display_name?.split(',')[0] || 'Panadería';
      const addr = r.address ? [r.address.road, r.address.suburb, r.address.city || r.address.town].filter(Boolean).join(', ') : '';
      addBakeryMarker(r.lat, r.lon, name, addr);
    }
  }

  // Lanzar todas las búsquedas en paralelo
  if (statusEl) statusEl.textContent = 'Buscando panaderías…';
  const searches = ['panadería Uruguay', 'panaderia Uruguay', 'bakery Uruguay', 'pan artesanal Uruguay', 'confitería Uruguay', 'horno de pan Uruguay'];
  const allResults = await Promise.all(searches.map(nominatimSearch));
  allResults.forEach(processNominatim);

  if (statusEl) {
    statusEl.textContent = totalBakeries > 0
      ? `${SUPER_LOCATIONS.length} supermercados · ${totalBakeries} panaderías encontradas`
      : `${SUPER_LOCATIONS.length} supermercados`;
  }
}

function goHome() {
  state.competitorMode = false;
  applyGroupFilter();
  state.catalog.q = '';
  state.compare.q = '';
  state.offers.q = '';
  switchTab('catalog');
  renderAll();
}
window.goHome = goHome;

loadLocalPriceList();
initEvents();
load();
