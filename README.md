# Gondola SAMAN

Monitor de precios de góndola para las marcas **Saman**, **La Abundancia** y
**Kyoto** (y su competencia) en los supermercados uruguayos **Tienda Inglesa**,
**Disco**, **El Dorado** y **Tata**.

Construido con la misma arquitectura que los monitores hermanos
(`gondolabimbo`, `app-Pagnifique`): scrapers en Node que corren en GitHub
Actions, datos publicados como JSON estático y un front-end vanilla servido
desde `public/`.

## Cómo funciona

1. `src/main.js` ejecuta los scrapers de cada supermercado (`src/scrapers/`),
   detecta las marcas del portfolio (`src/brands.js`) y guarda el resultado en
   `public/data/latest.json` (+ histórico en `history.jsonl` y export a CSV).
2. Un workflow de GitHub Actions (`.github/workflows/scrape.yml`) corre el
   scrape dos veces por día y al dispararlo manualmente, y commitea los datos
   actualizados.
3. La web (`public/index.html` + `public/app.js`) lee `public/data/latest.json`
   y muestra catálogo, comparador, ofertas, PVP, cobertura, informe gerencial
   y mapa.
4. El botón **"Actualizar precios"** dispara el workflow vía `/api/refresh`
   (Vercel Function) y muestra fecha/hora de la última vez que se usó.
5. El botón **"Escanear competencia"** cambia el contexto de la web a las
   marcas competidoras: Blue Patna, Arroz Green Chef, Arroz Aruba, Kikkoman y
   Mirokumai.

## Marcas relevadas

- **Propias (Saman):** Saman, La Abundancia, Kyoto
- **Competencia:** Blue Patna, Arroz Green Chef, Arroz Aruba, Kikkoman, Mirokumai

## Desarrollo local

```bash
npm install
npx playwright install chromium   # solo la primera vez (scrapers basados en navegador)
npm run scrape                    # corre todos los scrapers y genera public/data/*
npx serve public                  # o cualquier server estático para previsualizar
```

Scrapers individuales:

```bash
npm run scrape:tata
npm run scrape:disco
npm run scrape:eldorado
npm run scrape:tiendainglesa
```

## Comparativa de PVP

Subí tu lista de precios sugeridos (Excel/CSV/JSON) desde la pestaña **PVP**
de la web, o completá `data/suggested/precios_sugeridos.csv` (ver
`data/suggested/README.md`) para que el scraper calcule el GAP automáticamente
en cada corrida.

## Deploy

El proyecto está pensado para Vercel:
- `outputDirectory`: `public`
- Variables de entorno necesarias para el botón "Actualizar precios":
  `GITHUB_TOKEN` (con permiso `actions:write` sobre este repo) y
  `GITHUB_REPO` (`owner/repo`).
- Opcional: `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` para alertas de cambios
  de precio relevantes (`src/notify.js`).
