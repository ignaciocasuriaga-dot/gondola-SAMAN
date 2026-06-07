// Portfolio del monitor Gondola SAMAN: marcas propias (Saman, La Abundancia,
// Kyoto) y marcas de la competencia que se relevan al activar "Escanear competencia".

const OWN_BRAND_DEFINITIONS = [
  { name: 'saman', aliases: ['saman'] },
  { name: 'la abundancia', aliases: ['la abundancia', 'abundancia'] },
  { name: 'kyoto', aliases: ['kyoto'] },
];

const COMPETITOR_BRAND_DEFINITIONS = [
  { name: 'blue patna', aliases: ['blue patna'] },
  { name: 'arroz green chef', aliases: ['green chef', 'arroz green chef'] },
  { name: 'arroz aruba', aliases: ['aruba'] },
  { name: 'kikkoman', aliases: ['kikkoman'] },
  { name: 'mirokumai', aliases: ['mirokumai'] },
];

const BRAND_DEFINITIONS = [...OWN_BRAND_DEFINITIONS, ...COMPETITOR_BRAND_DEFINITIONS];

export const BRAND_GROUPS = {
  saman: OWN_BRAND_DEFINITIONS.map((b) => b.name),
  competencia: COMPETITOR_BRAND_DEFINITIONS.map((b) => b.name),
};

export const ALL_BRANDS = BRAND_DEFINITIONS.map((b) => b.name);

export const SEARCH_TERMS = [
  'saman',
  'arroz saman',
  'la abundancia',
  'arroz la abundancia',
  'kyoto',
  'arroz kyoto',
  'blue patna',
  'green chef',
  'arroz aruba',
  'kikkoman',
  'mirokumai',
];

function stripAccents(s) {
  return String(s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function aliasPattern(alias) {
  return stripAccents(alias).toLowerCase().split(/\s+/).map(escapeRegex).join('[\\s-]+');
}

const MATCHERS = BRAND_DEFINITIONS.flatMap((brand) =>
  brand.aliases.map((alias) => ({
    brand: brand.name,
    length: alias.length,
    rx: new RegExp(`\\b${aliasPattern(alias)}\\b`, 'i'),
  })),
).sort((a, b) => b.length - a.length);

export function matchedBrand(text) {
  if (!text) return null;
  const norm = stripAccents(text).toLowerCase();
  const match = MATCHERS.find((m) => m.rx.test(norm));
  return match?.brand ?? null;
}

export function brandGroup(brand) {
  for (const [group, brands] of Object.entries(BRAND_GROUPS)) {
    if (brands.includes(brand)) return group;
  }
  return null;
}

export function isOwnBrand(brand) {
  return BRAND_GROUPS.saman.includes(brand);
}

export function isCompetitorBrand(brand) {
  return BRAND_GROUPS.competencia.includes(brand);
}
