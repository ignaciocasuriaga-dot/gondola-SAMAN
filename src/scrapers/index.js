// Scrapers de cada supermercado. En un entorno de despliegue real, cada función
// haría fetch al sitio público del super y parsearía el HTML/JSON de resultados
// para las marcas Saman, La Abundancia y Kyoto (y la competencia).
// Si el sitio no responde (bloqueo anti-bot, cambio de estructura, sin red),
// se conserva la última lectura disponible para no romper la app.

const SOURCES = {
  'Tienda Inglesa': 'https://www.tiendainglesa.com.uy',
  Disco: 'https://www.disco.com.uy',
  'El Dorado': 'https://www.eldorado.com.uy',
  Tata: 'https://www.tata.com.uy',
};

async function tryFetch(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, { signal: controller.signal, mode: 'no-cors' });
    clearTimeout(timeout);
    return res;
  } catch {
    return null;
  }
}

// Intenta refrescar contra cada sitio. Devuelve true si al menos uno respondió.
export async function runScrapers(supermarkets = Object.keys(SOURCES)) {
  const results = await Promise.all(
    supermarkets.map((name) => tryFetch(SOURCES[name]))
  );
  return results.some((r) => r !== null);
}

export const SUPERMARKET_SOURCES = SOURCES;
