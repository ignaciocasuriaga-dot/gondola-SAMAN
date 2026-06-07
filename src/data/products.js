// Datos de muestra que simulan el resultado del scraping de cada supermercado.
// El botón "Actualizar precios" reejecuta los scrapers (ver src/scrapers) y,
// si la red no está disponible, conserva/regenera estos valores de referencia.

export const SUPERMARKETS = ['Tienda Inglesa', 'Disco', 'El Dorado', 'Tata'];

export const SAMAN_BRANDS = ['Saman', 'La Abundancia', 'Kyoto'];

export const COMPETITOR_BRANDS = [
  'Blue Patna',
  'Arroz Green Chef',
  'Arroz Aruba',
  'Kikkoman',
  'Mirokumai',
];

export const CATEGORIES = [
  'Arroz',
  'Salsas y condimentos',
  'Snacks orientales',
  'Pastas orientales',
  'Conservas',
];

const seedProducts = [
  // --- SAMAN ---
  { brand: 'Saman', name: 'Arroz Saman Blanco Grano Largo Fino 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 89, oferta: false },
  { brand: 'Saman', name: 'Arroz Saman Blanco Grano Largo Fino 1kg', category: 'Arroz', super: 'Disco', pvp: 92, oferta: true, ofertaTexto: '2x1' },
  { brand: 'Saman', name: 'Arroz Saman Blanco Grano Largo Fino 1kg', category: 'Arroz', super: 'El Dorado', pvp: 87, oferta: false },
  { brand: 'Saman', name: 'Arroz Saman Blanco Grano Largo Fino 1kg', category: 'Arroz', super: 'Tata', pvp: 90, oferta: true, ofertaTexto: '20% OFF' },

  { brand: 'Saman', name: 'Arroz Saman Doble Carolina 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 105, oferta: false },
  { brand: 'Saman', name: 'Arroz Saman Doble Carolina 1kg', category: 'Arroz', super: 'Disco', pvp: 99, oferta: true, ofertaTexto: '15% OFF' },
  { brand: 'Saman', name: 'Arroz Saman Doble Carolina 1kg', category: 'Arroz', super: 'El Dorado', pvp: 108, oferta: false },
  { brand: 'Saman', name: 'Arroz Saman Doble Carolina 1kg', category: 'Arroz', super: 'Tata', pvp: 102, oferta: false },

  { brand: 'Saman', name: 'Arroz Saman Yamaní Integral 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 119, oferta: false },
  { brand: 'Saman', name: 'Arroz Saman Yamaní Integral 1kg', category: 'Arroz', super: 'Disco', pvp: 121, oferta: false },
  { brand: 'Saman', name: 'Arroz Saman Yamaní Integral 1kg', category: 'Arroz', super: 'El Dorado', pvp: 117, oferta: true, ofertaTexto: '2da unidad 50%' },
  { brand: 'Saman', name: 'Arroz Saman Yamaní Integral 1kg', category: 'Arroz', super: 'Tata', pvp: 120, oferta: false },

  // --- LA ABUNDANCIA ---
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Blanco 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 75, oferta: false },
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Blanco 1kg', category: 'Arroz', super: 'Disco', pvp: 78, oferta: false },
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Blanco 1kg', category: 'Arroz', super: 'El Dorado', pvp: 73, oferta: true, ofertaTexto: '3x2' },
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Blanco 1kg', category: 'Arroz', super: 'Tata', pvp: 76, oferta: false },

  { brand: 'La Abundancia', name: 'Arroz La Abundancia Parboil 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 96, oferta: true, ofertaTexto: '10% OFF' },
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Parboil 1kg', category: 'Arroz', super: 'Disco', pvp: 99, oferta: false },
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Parboil 1kg', category: 'Arroz', super: 'El Dorado', pvp: 98, oferta: false },
  { brand: 'La Abundancia', name: 'Arroz La Abundancia Parboil 1kg', category: 'Arroz', super: 'Tata', pvp: 95, oferta: false },

  { brand: 'La Abundancia', name: 'Fideos La Abundancia Cabello de Ángel 500g', category: 'Pastas orientales', super: 'Tienda Inglesa', pvp: 64, oferta: false },
  { brand: 'La Abundancia', name: 'Fideos La Abundancia Cabello de Ángel 500g', category: 'Pastas orientales', super: 'Disco', pvp: 66, oferta: true, ofertaTexto: '2x1' },
  { brand: 'La Abundancia', name: 'Fideos La Abundancia Cabello de Ángel 500g', category: 'Pastas orientales', super: 'El Dorado', pvp: 63, oferta: false },
  { brand: 'La Abundancia', name: 'Fideos La Abundancia Cabello de Ángel 500g', category: 'Pastas orientales', super: 'Tata', pvp: 65, oferta: false },

  // --- KYOTO ---
  { brand: 'Kyoto', name: 'Salsa de Soja Kyoto 250ml', category: 'Salsas y condimentos', super: 'Tienda Inglesa', pvp: 82, oferta: true, ofertaTexto: '20% OFF' },
  { brand: 'Kyoto', name: 'Salsa de Soja Kyoto 250ml', category: 'Salsas y condimentos', super: 'Disco', pvp: 85, oferta: false },
  { brand: 'Kyoto', name: 'Salsa de Soja Kyoto 250ml', category: 'Salsas y condimentos', super: 'El Dorado', pvp: 84, oferta: false },
  { brand: 'Kyoto', name: 'Salsa de Soja Kyoto 250ml', category: 'Salsas y condimentos', super: 'Tata', pvp: 80, oferta: true, ofertaTexto: '2x1' },

  { brand: 'Kyoto', name: 'Galletas de Arroz Kyoto Mix 100g', category: 'Snacks orientales', super: 'Tienda Inglesa', pvp: 58, oferta: false },
  { brand: 'Kyoto', name: 'Galletas de Arroz Kyoto Mix 100g', category: 'Snacks orientales', super: 'Disco', pvp: 60, oferta: false },
  { brand: 'Kyoto', name: 'Galletas de Arroz Kyoto Mix 100g', category: 'Snacks orientales', super: 'El Dorado', pvp: 57, oferta: true, ofertaTexto: '15% OFF' },
  { brand: 'Kyoto', name: 'Galletas de Arroz Kyoto Mix 100g', category: 'Snacks orientales', super: 'Tata', pvp: 59, oferta: false },

  { brand: 'Kyoto', name: 'Arroz Kyoto para Sushi 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 159, oferta: false },
  { brand: 'Kyoto', name: 'Arroz Kyoto para Sushi 1kg', category: 'Arroz', super: 'Disco', pvp: 165, oferta: true, ofertaTexto: '10% OFF' },
  { brand: 'Kyoto', name: 'Arroz Kyoto para Sushi 1kg', category: 'Arroz', super: 'El Dorado', pvp: 162, oferta: false },
  { brand: 'Kyoto', name: 'Arroz Kyoto para Sushi 1kg', category: 'Arroz', super: 'Tata', pvp: 158, oferta: false },

  // --- COMPETENCIA ---
  { brand: 'Blue Patna', name: 'Arroz Blue Patna Largo Fino 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 84, oferta: false },
  { brand: 'Blue Patna', name: 'Arroz Blue Patna Largo Fino 1kg', category: 'Arroz', super: 'Disco', pvp: 86, oferta: true, ofertaTexto: '15% OFF' },
  { brand: 'Blue Patna', name: 'Arroz Blue Patna Largo Fino 1kg', category: 'Arroz', super: 'El Dorado', pvp: 83, oferta: false },
  { brand: 'Blue Patna', name: 'Arroz Blue Patna Largo Fino 1kg', category: 'Arroz', super: 'Tata', pvp: 85, oferta: false },

  { brand: 'Arroz Green Chef', name: 'Arroz Green Chef Integral 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 110, oferta: true, ofertaTexto: '2x1' },
  { brand: 'Arroz Green Chef', name: 'Arroz Green Chef Integral 1kg', category: 'Arroz', super: 'Disco', pvp: 112, oferta: false },
  { brand: 'Arroz Green Chef', name: 'Arroz Green Chef Integral 1kg', category: 'Arroz', super: 'El Dorado', pvp: 109, oferta: false },
  { brand: 'Arroz Green Chef', name: 'Arroz Green Chef Integral 1kg', category: 'Arroz', super: 'Tata', pvp: 111, oferta: false },

  { brand: 'Arroz Aruba', name: 'Arroz Aruba Blanco Grano Largo 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 79, oferta: false },
  { brand: 'Arroz Aruba', name: 'Arroz Aruba Blanco Grano Largo 1kg', category: 'Arroz', super: 'Disco', pvp: 81, oferta: false },
  { brand: 'Arroz Aruba', name: 'Arroz Aruba Blanco Grano Largo 1kg', category: 'Arroz', super: 'El Dorado', pvp: 77, oferta: true, ofertaTexto: '3x2' },
  { brand: 'Arroz Aruba', name: 'Arroz Aruba Blanco Grano Largo 1kg', category: 'Arroz', super: 'Tata', pvp: 80, oferta: false },

  { brand: 'Kikkoman', name: 'Salsa de Soja Kikkoman 250ml', category: 'Salsas y condimentos', super: 'Tienda Inglesa', pvp: 145, oferta: false },
  { brand: 'Kikkoman', name: 'Salsa de Soja Kikkoman 250ml', category: 'Salsas y condimentos', super: 'Disco', pvp: 149, oferta: true, ofertaTexto: '10% OFF' },
  { brand: 'Kikkoman', name: 'Salsa de Soja Kikkoman 250ml', category: 'Salsas y condimentos', super: 'El Dorado', pvp: 148, oferta: false },
  { brand: 'Kikkoman', name: 'Salsa de Soja Kikkoman 250ml', category: 'Salsas y condimentos', super: 'Tata', pvp: 144, oferta: false },

  { brand: 'Mirokumai', name: 'Arroz Mirokumai para Sushi 1kg', category: 'Arroz', super: 'Tienda Inglesa', pvp: 171, oferta: false },
  { brand: 'Mirokumai', name: 'Arroz Mirokumai para Sushi 1kg', category: 'Arroz', super: 'Disco', pvp: 175, oferta: false },
  { brand: 'Mirokumai', name: 'Arroz Mirokumai para Sushi 1kg', category: 'Arroz', super: 'El Dorado', pvp: 169, oferta: true, ofertaTexto: '20% OFF' },
  { brand: 'Mirokumai', name: 'Arroz Mirokumai para Sushi 1kg', category: 'Arroz', super: 'Tata', pvp: 173, oferta: false },
];

let nextId = 1;
export const baseProducts = seedProducts.map((p) => ({ id: nextId++, ...p }));

// Pequeña variación aleatoria de precios/ofertas para simular una nueva lectura del scraping.
export function regenerateProducts() {
  return baseProducts.map((p) => {
    const variacion = Math.round(p.pvp * (Math.random() * 0.06 - 0.03));
    const oferta = Math.random() < 0.35;
    return {
      ...p,
      pvp: Math.max(1, p.pvp + variacion),
      oferta,
      ofertaTexto: oferta ? p.ofertaTexto || `${[10, 15, 20, 25][Math.floor(Math.random() * 4)]}% OFF` : undefined,
    };
  });
}
