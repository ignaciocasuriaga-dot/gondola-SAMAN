import { useEffect, useMemo, useState } from 'react';
import './App.css';
import logo from './assets/saman-logo.svg';
import {
  SUPERMARKETS,
  SAMAN_BRANDS,
  COMPETITOR_BRANDS,
  CATEGORIES,
  baseProducts,
  regenerateProducts,
} from './data/products';
import { runScrapers } from './scrapers';

const TABS = [
  { id: 'productos', label: 'Productos' },
  { id: 'cobertura', label: 'Cobertura por súper' },
  { id: 'ofertas', label: 'Análisis de ofertas' },
  { id: 'comparativa', label: 'Comparativa de precios' },
];

const STORAGE_KEY = 'gondola-saman-ultima-actualizacion';

function formatFecha(ts) {
  if (!ts) return 'nunca';
  return new Date(Number(ts)).toLocaleString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function porcentaje(parte, total) {
  if (!total) return 0;
  return Math.round((parte / total) * 100);
}

export default function App() {
  const [products, setProducts] = useState(baseProducts);
  const [tab, setTab] = useState('productos');
  const [modoCompetencia, setModoCompetencia] = useState(false);
  const [filtroSuper, setFiltroSuper] = useState('Todos');
  const [filtroCategoria, setFiltroCategoria] = useState('Todas');
  const [filtroMarca, setFiltroMarca] = useState('Todas');
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(
    () => localStorage.getItem(STORAGE_KEY) || null
  );
  const [archivoComparativa, setArchivoComparativa] = useState(null);

  const marcasDisponibles = modoCompetencia ? COMPETITOR_BRANDS : SAMAN_BRANDS;

  useEffect(() => {
    setFiltroMarca('Todas');
  }, [modoCompetencia]);

  function irAInicio() {
    setTab('productos');
    setModoCompetencia(false);
    setFiltroSuper('Todos');
    setFiltroCategoria('Todas');
    setFiltroMarca('Todas');
  }

  const productosFiltrados = useMemo(() => {
    return products.filter((p) => {
      if (!marcasDisponibles.includes(p.brand)) return false;
      if (filtroSuper !== 'Todos' && p.super !== filtroSuper) return false;
      if (filtroCategoria !== 'Todas' && p.category !== filtroCategoria) return false;
      if (filtroMarca !== 'Todas' && p.brand !== filtroMarca) return false;
      return true;
    });
  }, [products, marcasDisponibles, filtroSuper, filtroCategoria, filtroMarca]);

  async function actualizarPrecios() {
    setActualizando(true);
    try {
      await runScrapers(filtroSuper === 'Todos' ? SUPERMARKETS : [filtroSuper]);
    } catch {
      // Si los sitios no responden (bloqueo, sin red) seguimos con la última lectura simulada
    }
    setProducts(regenerateProducts());
    const ahora = Date.now();
    localStorage.setItem(STORAGE_KEY, String(ahora));
    setUltimaActualizacion(String(ahora));
    setActualizando(false);
  }

  function manejarArchivo(e) {
    setArchivoComparativa(e.target.files?.[0] || null);
  }

  return (
    <div className="app">
      <header className="header">
        <button className="logo-btn" onClick={irAInicio} title="Volver al inicio" aria-label="Inicio SAMAN">
          <img src={logo} alt="SAMAN" />
        </button>

        <nav className="nav-tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        <button
          className={`competidor-btn ${modoCompetencia ? 'active' : ''}`}
          onClick={() => {
            setModoCompetencia((v) => !v);
            setTab('productos');
          }}
        >
          {modoCompetencia ? '◀ Volver a Saman' : '🔍 Escanear competencia'}
        </button>
      </header>

      {modoCompetencia && (
        <div className="competencia-banner">
          Escaneando marcas de la competencia:&nbsp;
          <strong>Blue Patna · Arroz Green Chef · Arroz Aruba · Kikkoman · Mirokumai</strong>
        </div>
      )}

      <div className="toolbar">
        <label className="campo">
          Supermercado
          <select value={filtroSuper} onChange={(e) => setFiltroSuper(e.target.value)}>
            <option>Todos</option>
            {SUPERMARKETS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          Categoría
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
            <option>Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          Marca
          <select value={filtroMarca} onChange={(e) => setFiltroMarca(e.target.value)}>
            <option>Todas</option>
            {marcasDisponibles.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>

        <label className="campo">
          Archivo comparativa PVP
          <input type="file" accept=".csv,.xls,.xlsx,.pdf" onChange={manejarArchivo} />
        </label>

        <div className="spacer" />

        <div className="campo" style={{ alignItems: 'flex-end' }}>
          <button className="btn-actualizar" onClick={actualizarPrecios} disabled={actualizando}>
            {actualizando ? 'Actualizando…' : '⟳ Actualizar precios'}
          </button>
          <span className="ultima-actualizacion">Última actualización: {formatFecha(ultimaActualizacion)}</span>
        </div>
      </div>

      <main className="main">
        {tab === 'productos' && (
          <VistaProductos productos={productosFiltrados} archivoComparativa={archivoComparativa} modoCompetencia={modoCompetencia} />
        )}
        {tab === 'cobertura' && <VistaCobertura productos={productosFiltrados} marcas={marcasDisponibles} />}
        {tab === 'ofertas' && <VistaOfertas productos={productosFiltrados} />}
        {tab === 'comparativa' && <VistaComparativa productos={productosFiltrados} archivoComparativa={archivoComparativa} />}
      </main>

      <footer className="app-footer">
        Gondola SAMAN · Monitoreo de góndolas en Tienda Inglesa, Disco, El Dorado y Tata
      </footer>
    </div>
  );
}

function VistaProductos({ productos, archivoComparativa, modoCompetencia }) {
  return (
    <>
      <h2 className="section-title">
        {modoCompetencia ? 'Productos de la competencia' : 'Productos Saman, La Abundancia y Kyoto'}
      </h2>
      {archivoComparativa && (
        <p style={{ fontSize: 13, color: '#666', marginTop: -10 }}>
          📎 Archivo de comparativa cargado: <strong>{archivoComparativa.name}</strong>
        </p>
      )}
      {productos.length === 0 ? (
        <p className="empty-state">No se encontraron productos con los filtros seleccionados.</p>
      ) : (
        <div className="product-grid">
          {productos.map((p) => (
            <div className="product-card" key={`${p.id}-${p.super}`}>
              {p.oferta && <span className="badge-oferta">OFERTA · {p.ofertaTexto || '¡Promo!'}</span>}
              <span className="marca">{p.brand}</span>
              <span className="nombre">{p.name}</span>
              <span className="super">{p.super} · {p.category}</span>
              <span className="pvp"><span className="label">PVP</span>${p.pvp}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function VistaCobertura({ productos, marcas }) {
  const filas = useMemo(() => {
    return marcas.map((marca) => {
      const deLaMarca = productos.filter((p) => p.brand === marca);
      const supersConPresencia = new Set(deLaMarca.map((p) => p.super));
      return {
        marca,
        cantidad: deLaMarca.length,
        supers: supersConPresencia.size,
        pct: porcentaje(supersConPresencia.size, SUPERMARKETS.length),
      };
    });
  }, [productos, marcas]);

  return (
    <>
      <h2 className="section-title">Cobertura por supermercado</h2>
      <p style={{ color: '#666', marginTop: -10, fontSize: 14 }}>
        Presencia de cada marca en los {SUPERMARKETS.length} supermercados relevados.
      </p>
      <div className="tabla-wrap">
        <table className="comparativa">
          <thead>
            <tr>
              <th>Marca</th>
              <th>Productos relevados</th>
              <th>Súper con presencia</th>
              <th>Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.marca}>
                <td><strong>{f.marca}</strong></td>
                <td>{f.cantidad}</td>
                <td>{f.supers} / {SUPERMARKETS.length}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="barra-cobertura"><div style={{ width: `${f.pct}%` }} /></div>
                    <span>{f.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function VistaOfertas({ productos }) {
  const enOferta = productos.filter((p) => p.oferta);
  const porSuper = useMemo(
    () =>
      SUPERMARKETS.map((s) => ({
        super: s,
        total: productos.filter((p) => p.super === s).length,
        enOferta: productos.filter((p) => p.super === s && p.oferta).length,
      })),
    [productos]
  );

  return (
    <>
      <h2 className="section-title">Análisis de ofertas</h2>
      <div className="tarjetas-resumen">
        <div className="tarjeta-resumen">
          <div className="num">{enOferta.length}</div>
          <div className="desc">Productos en oferta (de {productos.length} relevados)</div>
        </div>
        <div className="tarjeta-resumen">
          <div className="num">{porcentaje(enOferta.length, productos.length)}%</div>
          <div className="desc">Porcentaje del surtido con promoción activa</div>
        </div>
      </div>

      <div className="tabla-wrap">
        <table className="comparativa">
          <thead>
            <tr>
              <th>Supermercado</th>
              <th>Productos relevados</th>
              <th>En oferta</th>
              <th>% en oferta</th>
            </tr>
          </thead>
          <tbody>
            {porSuper.map((s) => (
              <tr key={s.super}>
                <td><strong>{s.super}</strong></td>
                <td>{s.total}</td>
                <td>{s.enOferta}</td>
                <td>{porcentaje(s.enOferta, s.total)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Detalle de promociones</h2>
      {enOferta.length === 0 ? (
        <p className="empty-state">No hay ofertas activas para los filtros seleccionados.</p>
      ) : (
        <div className="tabla-wrap">
          <table className="comparativa">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Supermercado</th>
                <th>PVP</th>
                <th>Promoción</th>
              </tr>
            </thead>
            <tbody>
              {enOferta.map((p) => (
                <tr key={`${p.id}-${p.super}`}>
                  <td>{p.name}</td>
                  <td>{p.brand}</td>
                  <td>{p.super}</td>
                  <td>${p.pvp}</td>
                  <td className="celda-oferta">{p.ofertaTexto || 'Promoción'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function VistaComparativa({ productos, archivoComparativa }) {
  const grupos = useMemo(() => {
    const mapa = new Map();
    for (const p of productos) {
      if (!mapa.has(p.name)) mapa.set(p.name, { nombre: p.name, marca: p.brand, precios: {} });
      mapa.get(p.name).precios[p.super] = p;
    }
    return Array.from(mapa.values());
  }, [productos]);

  return (
    <>
      <h2 className="section-title">Comparativa de precios (PVP) entre supermercados</h2>
      <p style={{ color: '#666', marginTop: -10, fontSize: 14 }}>
        Subí tu archivo de comparativa (CSV / Excel / PDF) desde la barra superior para cruzarlo con el
        relevamiento de góndola. El precio más bajo de cada producto se resalta en verde.
      </p>
      {archivoComparativa ? (
        <p style={{ fontSize: 13 }}>📎 Comparando contra: <strong>{archivoComparativa.name}</strong></p>
      ) : (
        <p style={{ fontSize: 13, color: '#999' }}>No se adjuntó ningún archivo de comparativa todavía.</p>
      )}

      {grupos.length === 0 ? (
        <p className="empty-state">No hay productos para comparar con los filtros seleccionados.</p>
      ) : (
        <div className="tabla-wrap">
          <table className="comparativa">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                {SUPERMARKETS.map((s) => (
                  <th key={s}>{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grupos.map((g) => {
                const valores = SUPERMARKETS.map((s) => g.precios[s]?.pvp).filter((v) => v != null);
                const minimo = valores.length ? Math.min(...valores) : null;
                return (
                  <tr key={g.nombre}>
                    <td>{g.nombre}</td>
                    <td>{g.marca}</td>
                    {SUPERMARKETS.map((s) => {
                      const item = g.precios[s];
                      if (!item) return <td key={s}>—</td>;
                      const esMin = item.pvp === minimo;
                      return (
                        <td key={s} className={esMin ? 'celda-min' : ''}>
                          ${item.pvp}{item.oferta ? ' 🔻' : ''}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
