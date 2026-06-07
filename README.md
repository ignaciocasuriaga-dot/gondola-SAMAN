# Gondola SAMAN

Aplicación web para monitorear góndolas de supermercado y comparar precios de
las marcas Saman, La Abundancia y Kyoto frente a la competencia.

## Supermercados relevados
- Tienda Inglesa
- Disco
- El Dorado
- Tata

## Funcionalidades
- Filtros por supermercado, categoría y marca.
- Señalización de productos en oferta.
- Botón "Actualizar precios": vuelve a correr el relevamiento (scrapers en
  `src/scrapers`) y guarda fecha/hora de la última vez que se usó.
- Carga de archivo de comparativa de PVP (CSV/Excel/PDF) para cruzarlo con el
  relevamiento.
- Botón "Escanear competencia": releva las marcas Blue Patna, Arroz Green Chef,
  Arroz Aruba, Kikkoman y Mirokumai.
- Pestañas de comparativas: Productos, Cobertura por súper, Análisis de
  ofertas y Comparativa de precios.
- El logo (estilizado con los colores de la marca SAMAN) lleva siempre a la
  pantalla de inicio.

## Desarrollo

```bash
npm install
npm run dev      # entorno de desarrollo
npm run build    # build de producción (carpeta dist/)
npm run preview  # previsualizar el build
```
