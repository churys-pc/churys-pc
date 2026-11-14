/* Churys PC para el celular (web instalable: Safari → Compartir → Agregar a inicio).
 * Usa la misma cuenta que la app de Windows y habla directo con el script de la planilla (la URL viene en config.js,
 * que se genera al publicar). Muestra:
 *  - Mis PCs: lo vendido y verificado por Churys PC (misDatos) + lo que la app de Windows detectó (respaldo de la cuenta).
 *  - Garantías (por equipo o por componente) y servicios en curso.
 *  - Rendimiento: los FPS que estimó la app de Windows para esa PC y las partidas medidas con el Monitoreo.
 * Nada de lo que se muestra se calcula acá: sale de la planilla o de la app de Windows. Sin servidores propios. */
(function () {
  'use strict';
  const CFG = window.CHURYS_CFG || {};
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LS = 'churys-movil';
  const leerLS = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
  const guardarLS = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };
  const E = leerLS();                               // { token, usuario, dev, pc, res }
  if (!E.dev) { E.dev = 'cel-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); guardarLS(E); }
  const D = { equipos: [], respaldo: null, cargando: false, error: '', tab: 'pc', reportes: null };

  const TIPOS = { cpu: 'Procesador', board: 'Placa madre', ram: 'Memoria RAM', gpu: 'Tarjeta gráfica', disk: 'Almacenamiento', psu: 'Fuente', case: 'Gabinete', cooler: 'Refrigeración', fans: 'Ventiladores', other: 'Otro' };
  const ORIGEN = { verificado: ['Verificado', 'ok'], detectado: ['Detectado', 'det'], manual: ['Manual', 'man'] };
  const ERR = {
    credenciales: 'Correo o PIN incorrectos.', bloqueado: 'Demasiados intentos. Probá más tarde.', sin_registrar: 'Esa cuenta todavía no está creada: creala en la app de Windows de Churys PC.',
    codigo_incorrecto: 'Código incorrecto.', codigo_vencido: 'El código venció. Volvé a iniciar sesión para recibir otro.', sin_conexion: 'Sin conexión. Revisá internet e intentá de nuevo.',
    sesion_vencida: 'Tu sesión venció. Iniciá sesión de nuevo.', demasiados_reportes: 'Ya mandaste varios reportes hoy. Probá mañana o escribinos por WhatsApp.', reporte_corto: 'Contanos un poco más qué pasó.'
  };
  const msgErr = r => ERR[r?.error] || 'No se pudo completar. Intentá de nuevo.';

  /* ---------- Planilla ---------- */
  async function api(body, conSesion = true) {
    if (!CFG.url) return DEMO(body);
    const b = { ...body, dispositivo: E.dev, ...(conSesion ? { token: E.token } : {}) };
    try {
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 45000);
      const r = await fetch(CFG.url, { method: 'POST', redirect: 'follow', signal: ctrl.signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(b) });
      clearTimeout(t);
      const j = JSON.parse(await r.text());
      if (j && j.error === 'sesion_vencida') salir(true);
      return j;
    } catch { return { ok: false, error: 'sin_conexion' }; }
  }

  /* ---------- Datos ---------- */
  async function cargar() {
    D.cargando = true; D.error = ''; render();
    const [m, rsp] = await Promise.all([api({ accion: 'misDatos' }), api({ accion: 'leerRespaldo' })]);
    D.cargando = false;
    if (!m?.ok) { D.error = msgErr(m); render(); return; }
    if (m.usuario) { E.usuario = m.usuario; guardarLS(E); }
    D.equipos = m.equipos || [];
    try { D.respaldo = rsp?.ok && rsp.datos ? JSON.parse(rsp.datos) : null; } catch { D.respaldo = null; }
    D.at = Date.now(); render();
  }
  // PCs a mostrar: las que la app de Windows respaldó (con su equipo verificado, si tiene) + equipos sin PC respaldada
  function pcs() {
    const out = [], usados = new Set();
    for (const p of D.respaldo?.pcs || []) {
      const id = p.verified?.id, eq = id && D.equipos.find(e => String(e.equipo?.id).toUpperCase() === String(id).toUpperCase());
      if (eq) usados.add(eq.equipo.id);
      out.push({ uid: p.uid, nombre: p.name || 'Mi PC', pc: p, eq });
    }
    for (const e of D.equipos) if (!usados.has(e.equipo?.id)) out.push({ uid: 'eq:' + e.equipo.id, nombre: e.equipo.tipoVenta && /compon/i.test(e.equipo.tipoVenta) ? 'Compra ' + e.equipo.id : 'PC ' + e.equipo.id, pc: null, eq: e });
    return out;
  }
  const actual = () => { const l = pcs(); return l.find(x => x.uid === E.pc) || l[0] || null; };

  /* ---------- Fechas y garantías ---------- */
  const hoy = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  const fecha = s => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const fmtF = s => { const d = fecha(s); return d ? d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };
  const dias = s => { const d = fecha(s); return d ? Math.round((d - hoy()) / 864e5) : null; };
  function garantia(x) {
    const e = x.eq; if (!e) return null;
    const comps = (e.componentes || []).filter(c => !c.reemplazado && c.garantiaHasta);
    const pcCompleta = !/compon|servic/i.test(e.equipo.tipoVenta || '');
    const distintas = new Set(comps.map(c => c.garantiaHasta)).size > 1;
    if (pcCompleta && e.equipo.garantiaHasta && !distintas) return { general: true, hasta: e.equipo.garantiaHasta, dias: dias(e.equipo.garantiaHasta) };
    const vivas = comps.map(c => ({ c, d: dias(c.garantiaHasta) })).filter(z => z.d >= 0).sort((a, b) => a.d - b.d);
    if (!vivas.length) { const ult = comps.sort((a, b) => String(b.garantiaHasta).localeCompare(a.garantiaHasta))[0]; return ult ? { general: false, hasta: ult.garantiaHasta, dias: dias(ult.garantiaHasta), que: ult.modelo } : null; }
    return { general: false, hasta: vivas[0].c.garantiaHasta, dias: vivas[0].d, que: vivas[0].c.modelo, mas: vivas.length - 1 };
  }
  const enCurso = x => (x.eq?.servicios || []).filter(s => s.estado && !/entregad/i.test(s.estado));

  /* ---------- Pantallas ---------- */
  const app = () => $('#app');
  function render() {
    if (!E.token) return renderLogin();
    const l = pcs(), x = actual(), u = E.usuario || {};
    app().innerHTML = `
      <header class="top"><img src="logo.png" alt="CHURY'S PC" class="logo"><button class="ghost sm" id="recargar" aria-label="Actualizar">${D.cargando ? '…' : '↻'}</button></header>
      <main class="main">
        <p class="hola">Hola${u.nombre ? ', ' + esc(u.nombre.split(' ')[0]) : ''} 👋</p>
        ${D.error ? `<div class="aviso err">${esc(D.error)}</div>` : ''}
        ${l.length > 1 ? `<div class="chips">${l.map(p => `<button class="chip ${p.uid === x?.uid ? 'on' : ''}" data-pc="${esc(p.uid)}">${esc(p.nombre)}</button>`).join('')}</div>` : ''}
        ${D.tab === 'mas' ? vistaMas() : !x ? vacio() : D.tab === 'fps' ? vistaFps(x) : vistaPc(x)}
      </main>
      <nav class="tabs">${[['pc', '🖥️', 'Mi PC'], ['fps', '🎮', 'Rendimiento'], ['mas', '☰', 'Más']].map(([k, i, t]) => `<button class="${D.tab === k ? 'on' : ''}" data-tab="${k}"><span>${i}</span>${t}</button>`).join('')}</nav>`;
    bind();
  }
  function vacio() {
    if (D.cargando) return `<div class="card center muted">Cargando tus datos…</div>`;
    return `<div class="card"><h3>Todavía no hay PCs en tu cuenta</h3>
      <p class="muted">Abrí la app <b>Churys PC</b> en tu computadora con esta misma cuenta: en unos minutos vas a ver tu PC acá, con sus componentes y su rendimiento en juegos.</p>
      <p class="muted">Si compraste en Churys PC, tu equipo aparece solo cuando el local registra la venta con tu correo.</p></div>`;
  }
  function badge(src) { const [t, c] = ORIGEN[src] || ['', '']; return t ? `<span class="tag ${c}">${t}</span>` : ''; }
  function vistaPc(x) {
    const g = garantia(x), serv = enCurso(x), p = x.pc, e = x.eq;
    const comps = p ? (p.components || []).filter(c => !c.removedAt).sort((a, b) => Object.keys(TIPOS).indexOf(a.type) - Object.keys(TIPOS).indexOf(b.type))
      : (e?.componentes || []).filter(c => !c.reemplazado).map(c => ({ type: null, tipo: c.tipo, model: c.modelo, source: 'verificado', condition: c.condicion, warrantyUntil: c.garantiaHasta }));
    const compG = c => { const v = e?.componentes?.find(z => !z.reemplazado && (z.modelo === c.verifiedModel || z.modelo === c.model)); return v?.garantiaHasta || c.warrantyUntil || ''; };
    return `
      <h2 class="pc-nom">${esc(x.nombre)}</h2>
      ${e ? `<p class="muted sm">Referencia <b>${esc(e.equipo.id)}</b>${e.equipo.fechaVenta ? ' · comprada el ' + fmtF(e.equipo.fechaVenta) : ''}</p>` : ''}
      ${serv.map(s => `<div class="card serv"><div class="row"><b>${esc(s.tipo || 'Servicio')} ${esc(s.numero || '')}</b><span class="tag det">${esc(s.estado)}</span></div><p class="muted sm">${esc(s.detalle || '')}</p>${/listo/i.test(s.estado) ? '<p class="ok-t">¡Ya podés pasar a retirarla!</p>' : ''}</div>`).join('')}
      <div class="card gar">
        <div class="row"><h3>Garantía</h3>${g ? `<span class="tag ${g.dias >= 0 ? 'ok' : 'man'}">${g.dias >= 0 ? 'Vigente' : 'Vencida'}</span>` : ''}</div>
        ${!g ? `<p class="muted">${e ? 'Sin fecha de garantía registrada.' : 'Las garantías aparecen cuando la PC o los componentes los compraste en Churys PC.'}</p>`
          : g.dias >= 0 ? `<div class="big">${g.dias} <small>${g.dias === 1 ? 'día' : 'días'}</small></div><p class="muted sm">${g.general ? 'Garantía del equipo hasta el ' + fmtF(g.hasta) : `La próxima que vence: ${esc(g.que)} (${fmtF(g.hasta)})${g.mas ? ` · +${g.mas} más` : ''}`}</p>`
          : `<p>Venció el ${fmtF(g.hasta)}.</p>`}
        <p class="muted xs">La garantía cubre desperfectos de fábrica; no incluye manipulación, mal uso ni causas externas.</p>
      </div>
      ${p?.maintenance?.last ? `<div class="card"><div class="row"><h3>Último mantenimiento</h3><span class="muted sm">${fmtF(p.maintenance.last)}</span></div></div>` : ''}
      <div class="card"><h3>Componentes</h3>
        ${comps.length ? comps.map(c => `<div class="comp"><div><small>${esc(TIPOS[c.type] || c.tipo || '')}</small><b>${esc(c.verifiedModel || c.model)}</b>${c.details ? `<span class="muted xs">${esc(c.details)}</span>` : ''}</div>
          <div class="comp-r">${badge(c.source)}${c.condition ? `<span class="tag">${/usad/i.test(c.condition) ? 'Usado' : 'Nuevo'}</span>` : ''}${compG(c) ? `<span class="xs muted">Garantía ${fmtF(compG(c))}</span>` : ''}</div></div>`).join('')
          : '<p class="muted">Sin componentes cargados.</p>'}
        <p class="muted xs leg"><span class="tag ok">Verificado</span> registrado por Churys PC · <span class="tag det">Detectado</span> leído de tu PC · <span class="tag man">Manual</span> cargado por vos</p>
      </div>`;
  }
  function vistaFps(x) {
    const F = (D.respaldo?.movil?.fps || []).find(f => f.uid === x.pc?.uid), res = E.res === '1440p' ? '1440p' : '1080p';
    const ses = (D.respaldo?.movil?.sesiones || []).filter(s => !s.pc || s.pc === x.pc?.uid).slice(0, 15);
    if (!F && !ses.length) return `<div class="card"><h3>Rendimiento en juegos</h3><p class="muted">Abrí la app <b>Churys PC</b> en esta computadora con tu cuenta: ahí se calculan los FPS de tu PC y se guardan tus partidas medidas con el Monitoreo, y aparecen acá.</p></div>`;
    const conf = ['', 'baja', 'media', 'alta'];
    return `
      ${F ? `<div class="card"><div class="row"><h3>FPS estimados</h3><div class="seg">${['1080p', '1440p'].map(r => `<button class="${r === res ? 'on' : ''}" data-res="${r}">${r}</button>`).join('')}</div></div>
        <p class="muted sm">${esc(F.cpu)} · ${esc(F.gpu)}${F.ram ? ' · ' + esc(F.ram) : ''} · calidad Alta</p>
        ${F.juegos.filter(j => j[res]).map(j => { const v = j[res]; return `<div class="juego"><span>${esc(j.nombre)}</span><span class="fps"><b>${v.avg}</b> FPS<small>${v.rango ? `${v.rango[0]}–${v.rango[1]}` : ''}${v.tipo === 'benchmark' ? ' · medido' : ` · confianza ${conf[v.conf] || 'baja'}`}</small></span></div>`; }).join('') || '<p class="muted">Sin datos para esta resolución.</p>'}
        <p class="muted xs">Mismos números que el Simulador de FPS de la app de Windows: salen de mediciones publicadas de cada juego, sin escalado ni ray tracing.</p></div>` : ''}
      <div class="card"><h3>Tus partidas</h3>
        ${ses.length ? ses.map(s => `<div class="partida"><div><b>${esc(s.juego || 'Juego')}</b><small class="muted">${s.inicio ? new Date(s.inicio).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}${s.duracion ? ' · ' + Math.round(s.duracion / 60) + ' min' : ''}</small></div>
          <div class="p-r">${s.fpsProm != null ? `<b>${Math.round(s.fpsProm)}</b> FPS prom.` : '<span class="muted">sin FPS</span>'}${s.low1 != null ? `<small>1 % bajo: ${Math.round(s.low1)}</small>` : ''}${s.gpuTempMax != null || s.cpuTempMax != null ? `<small>Temp. máx.: ${[s.cpuTempMax != null && 'CPU ' + Math.round(s.cpuTempMax) + '°', s.gpuTempMax != null && 'GPU ' + Math.round(s.gpuTempMax) + '°'].filter(Boolean).join(' · ')}</small>` : ''}</div></div>`).join('')
          : '<p class="muted">Todavía no hay partidas medidas. En la app de Windows, Monitoreo → grabá una sesión mientras jugás.</p>'}
      </div>`;
  }
  function vistaMas() {
    const u = E.usuario || {};
    return `
      <div class="card"><h3>Reportar un problema</h3>
        <textarea id="rep-que" rows="4" maxlength="2000" placeholder="¿Qué pasó?"></textarea>
        <div class="err-t" id="rep-err"></div>
        <button class="btn" id="rep-env">Enviar reporte</button>
        <div id="rep-lista"></div></div>
      <div class="card"><h3>App de Windows</h3><p class="muted sm">Monitoreo, Simulador de FPS, drivers y más, en tu computadora.</p>
        <a class="btn ghost" href="../" rel="noopener">Descargar para Windows</a></div>
      <div class="card"><h3>Cuenta</h3><p class="muted sm">${esc(u.email || '')}</p><button class="btn ghost" id="salir">Cerrar sesión en este celular</button></div>
      <p class="muted xs center">CHURY'S PC · <a href="https://churyspc.com" rel="noopener">churyspc.com</a> · WhatsApp 094 677 755</p>`;
  }
  function bind() {
    $$('[data-tab]').forEach(b => b.onclick = () => { D.tab = b.dataset.tab; render(); window.scrollTo(0, 0); });
    $$('[data-pc]').forEach(b => b.onclick = () => { E.pc = b.dataset.pc; guardarLS(E); render(); });
    $$('[data-res]').forEach(b => b.onclick = () => { E.res = b.dataset.res; guardarLS(E); render(); });
    $('#recargar') && ($('#recargar').onclick = () => cargar());
    $('#salir') && ($('#salir').onclick = () => salir());
    if ($('#rep-env')) {
      $('#rep-env').onclick = async () => {
        const t = $('#rep-que').value.trim(), er = $('#rep-err');
        if (t.length < 10) { er.textContent = ERR.reporte_corto; return; }
        $('#rep-env').disabled = true;
        const r = await api({ accion: 'reportarProblema', descripcion: t, version: 'celular', seccion: 'celular', tecnico: { celular: navigator.userAgent.slice(0, 160) } });
        $('#rep-env').disabled = false;
        if (!r?.ok) { er.textContent = msgErr(r); return; }
        $('#rep-que').value = ''; er.textContent = ''; D.reportes = null; alertaSuave(`¡Gracias! Recibimos tu reporte ${r.numero}.`); listarReportes();
      };
      listarReportes();
    }
  }
  async function listarReportes() {
    const box = $('#rep-lista'); if (!box) return;
    if (!D.reportes) { const r = await api({ accion: 'misReportes' }); D.reportes = r?.ok ? r.reportes : []; }
    if (!$('#rep-lista')) return;
    $('#rep-lista').innerHTML = D.reportes.map(x => `<div class="rep"><div class="row"><b>${esc(x.numero)}</b><span class="tag ${x.estado === 'Corregido' ? 'ok' : 'det'}">${esc(x.estado === 'Para Facundo' ? 'En revisión' : x.estado)}</span></div><p class="muted sm">${esc(x.descripcion)}</p>${x.respuesta ? `<p class="resp">${esc(x.respuesta)}</p>` : ''}</div>`).join('');
  }
  function alertaSuave(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }

  /* ---------- Inicio de sesión ---------- */
  let L = { paso: 'datos', email: '', tipo: '' };
  function renderLogin() {
    app().innerHTML = `<main class="login">
      <img src="logo.png" alt="CHURY'S PC" class="logo-g">
      <div class="card">
        ${L.paso === 'datos' ? `<h2>Iniciá sesión</h2><p class="muted sm">Con la misma cuenta que usás en la app de Windows.</p>
          <label>Correo<input id="l-email" type="email" autocomplete="username" inputmode="email" value="${esc(L.email)}"></label>
          <label>PIN o contraseña<input id="l-pin" type="password" autocomplete="current-password"></label>`
          : `<h2>Revisá tu correo</h2><p class="muted sm">Te mandamos un código de 6 números a <b>${esc(L.email)}</b>.</p>
          <label>Código<input id="l-cod" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></label>`}
        <div class="err-t" id="l-err"></div>
        <button class="btn" id="l-ok">${L.paso === 'datos' ? 'Entrar' : 'Confirmar'}</button>
        ${L.paso !== 'datos' ? '<button class="btn ghost" id="l-volver">Volver</button>' : `<p class="muted xs">¿No tenés cuenta? Creala en la app de Windows de Churys PC.</p>`}
      </div>
      <p class="muted xs center">Instalala: en Safari tocá <b>Compartir</b> → <b>Agregar a inicio</b>.</p></main>`;
    $('#l-ok').onclick = loginPaso;
    $('#l-volver') && ($('#l-volver').onclick = () => { L.paso = 'datos'; renderLogin(); });
    $$('input', app()).forEach(i => i.onkeydown = e => { if (e.key === 'Enter') loginPaso(); });
  }
  async function loginPaso() {
    const err = $('#l-err'), b = $('#l-ok'); err.textContent = '';
    let r;
    b.disabled = true;
    if (L.paso === 'datos') {
      L.email = $('#l-email').value.trim().toLowerCase(); const pin = $('#l-pin').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(L.email) || !pin) { b.disabled = false; err.textContent = 'Escribí tu correo y tu PIN.'; return; }
      r = await api({ accion: 'login', email: L.email, pin }, false);
      if (r?.ok && r.pendiente === 'codigo') { L.paso = 'codigo'; L.tipo = 'verificarCorreo'; return renderLogin(); }
      if (r?.ok && r.pendiente === 'dispositivo') { L.paso = 'codigo'; L.tipo = 'verificarDispositivo'; return renderLogin(); }
      if (r?.ok && r.pendiente === 'cambiar_clave') { b.disabled = false; err.textContent = 'Primero cambiá tu contraseña desde la app de Windows.'; return; }
    } else {
      const codigo = $('#l-cod').value.trim();
      r = await api({ accion: L.tipo, email: L.email, codigo }, false);
    }
    b.disabled = false;
    if (!r?.ok || !r.token) { err.textContent = msgErr(r); return; }
    E.token = r.token; E.usuario = r.usuario; guardarLS(E); L = { paso: 'datos', email: '', tipo: '' };
    cargar();
  }
  function salir(vencida) {
    if (E.token && !vencida) api({ accion: 'logout' });
    delete E.token; delete E.usuario; delete E.pc; guardarLS(E); D.equipos = []; D.respaldo = null; D.reportes = null;
    renderLogin(); if (vencida) $('#l-err').textContent = ERR.sesion_vencida;
  }

  /* ---------- Modo demostración (solo si la página no tiene configurada la planilla) ---------- */
  function DEMO(b) {
    const d = window.CHURYS_DEMO || {};
    return new Promise(ok => setTimeout(() => ok(d[b.accion] ? d[b.accion](b) : { ok: true }), 250));
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (E.token) cargar(); else renderLogin();
})();
