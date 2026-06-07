# Precios Sugeridos (PVP) - Gondola SAMAN

Este directorio contiene la lista de PVP sugeridos para los productos Saman,
La Abundancia y Kyoto (también podés cargar PVP de la competencia).

## Formato

El archivo `precios_sugeridos.csv` debe tener las columnas:
- `super`: cadena de supermercado (tata, disco, eldorado, tiendainglesa, o "todos")
- `producto`: descripción del producto
- `pvp_sugerido`: precio de venta al público sugerido en UYU
- `sku` (opcional): código SKU del producto
- `marca` (opcional): marca del producto (saman, la abundancia, kyoto, blue patna, ...)

## Ejemplo

Ver `precios_sugeridos.csv.example` para un ejemplo del formato.

## Uso

Renombrar `precios_sugeridos.csv.example` a `precios_sugeridos.csv` y completar
con los datos reales, o subir el archivo de comparativa directamente desde la
pestaña "PVP" de la web (acepta Excel, CSV o JSON).
