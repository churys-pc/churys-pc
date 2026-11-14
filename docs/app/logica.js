/* Churys PC (celular) — lógica sin pantalla: qué PCs se muestran, garantías y servicios en curso.
 * La usan app.js y las pruebas (tools/pruebas/celular-unit.js). */
(function (raiz) {
  'use strict';
  const hoy = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const fecha = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const dias = s => { const d = fecha(s); return d ? Math.round((d - hoy()) / 864e5) : null; };
  const esCompraSuelta = e => /compon|servic/i.test(e?.equipo?.tipoVenta || '');

  // PCs a mostrar: las que la app de Windows respaldó (con su equipo verificado, si tiene) + equipos sin PC respaldada
  function pcs(equipos, respaldo) {
    const out = [], usados = new Set(), eqs = Array.isArray(equipos) ? equipos.filter(e => e && e.equipo && e.equipo.id) : [];
    for (const p of (respaldo && Array.isArray(respaldo.pcs) ? respaldo.pcs : [])) {
      if (!p || typeof p !== 'object') continue;
      const id = p.verified && p.verified.id, eq = id ? eqs.find(e => String(e.equipo.id).toUpperCase() === String(id).toUpperCase()) : null;
      if (eq) usados.add(eq.equipo.id);
      out.push({ uid: String(p.uid || 'pc:' + out.length), nombre: p.name || 'Mi PC', pc: p, eq: eq || null });
    }
    for (const e of eqs) if (!usados.has(e.equipo.id)) out.push({ uid: 'eq:' + e.equipo.id, nombre: (esCompraSuelta(e) ? 'Compra ' : 'PC ') + e.equipo.id, pc: null, eq: e });
    return out;
  }
  // Garantía: general si es una PC completa con una sola fecha; por componente si es mixta o una compra de componentes
  function garantia(x) {
    const e = x && x.eq; if (!e) return null;
    const comps = (e.componentes || []).filter(c => !c.reemplazado && c.garantiaHasta);
    const distintas = new Set(comps.map(c => c.garantiaHasta)).size > 1;
    if (!esCompraSuelta(e) && e.equipo.garantiaHasta && !distintas) return { general: true, hasta: e.equipo.garantiaHasta, dias: dias(e.equipo.garantiaHasta) };
    const vivas = comps.map(c => ({ c, d: dias(c.garantiaHasta) })).filter(z => z.d !== null && z.d >= 0).sort((a, b) => a.d - b.d);
    if (!vivas.length) {
      const ult = comps.slice().sort((a, b) => String(b.garantiaHasta).localeCompare(String(a.garantiaHasta)))[0];
      return ult ? { general: false, hasta: ult.garantiaHasta, dias: dias(ult.garantiaHasta), que: ult.modelo } : null;
    }
    return { general: false, hasta: vivas[0].c.garantiaHasta, dias: vivas[0].d, que: vivas[0].c.modelo, mas: vivas.length - 1 };
  }
  const enCurso = x => ((x && x.eq && x.eq.servicios) || []).filter(s => s && s.estado && !/entregad/i.test(s.estado));

  const api = { hoy, fecha, dias, pcs, garantia, enCurso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else raiz.CHURYS_LOGICA = api;
})(typeof window !== 'undefined' ? window : globalThis);
