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
  // íconos (los mismos trazos que la app de Windows, src/icons.js)
  const ICONOS = {"monitor": "<rect x=\"3\" y=\"4\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M8 20h8M12 16v4\"/>", "gamepad": "<path d=\"M7 7h10a5 5 0 0 1 4.9 6l-.6 3a2.6 2.6 0 0 1-4.6 1.2L15 15H9l-1.7 2.2a2.6 2.6 0 0 1-4.6-1.2l-.6-3A5 5 0 0 1 7 7z\"/><path d=\"M7.5 10v4M5.5 12h4\"/><circle cx=\"15.5\" cy=\"11\" r=\".6\" fill=\"currentColor\"/><circle cx=\"17.5\" cy=\"13\" r=\".6\" fill=\"currentColor\"/>", "list": "<path d=\"M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01\"/>", "refresh": "<path d=\"M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4\"/>", "cpu": "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"1.5\"/><text x=\"12\" y=\"13.6\" font-size=\"4.6\" text-anchor=\"middle\" fill=\"currentColor\" stroke=\"none\" font-weight=\"700\" font-family=\"Segoe UI,Arial\">CPU</text><path d=\"M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3\"/>", "gpu": "<rect x=\"2.5\" y=\"6\" width=\"19\" height=\"11\" rx=\"2\"/><circle cx=\"8.5\" cy=\"11.5\" r=\"2.6\"/><circle cx=\"15.5\" cy=\"11.5\" r=\"2.6\"/><path d=\"M5 17v2.5\"/>", "ram": "<rect x=\"2.5\" y=\"6.5\" width=\"19\" height=\"9\" rx=\"1\"/><text x=\"12\" y=\"12.9\" font-size=\"4.6\" text-anchor=\"middle\" fill=\"currentColor\" stroke=\"none\" font-weight=\"700\" font-family=\"Segoe UI,Arial\">RAM</text><path d=\"M5 15.5V18M8 15.5V18M11 15.5V18M14 15.5V18M17 15.5V18M20 15.5V18\"/>", "ssd": "<rect x=\"4\" y=\"3\" width=\"16\" height=\"18\" rx=\"2.5\"/><path d=\"M4 15h16M15.5 18h1\"/>", "board": "<rect x=\"3.5\" y=\"3.5\" width=\"17\" height=\"17\" rx=\"2\"/><rect x=\"7\" y=\"7\" width=\"5\" height=\"5\" rx=\"1\"/><path d=\"M15 7h2M15 10h2M7 15h10M7 17.5h6\"/>", "bolt": "<path d=\"M13 2L5 14h6l-1 8 8-12h-6z\"/>", "box": "<rect x=\"6\" y=\"2.5\" width=\"12\" height=\"19\" rx=\"2\"/><circle cx=\"12\" cy=\"15\" r=\"3\"/><path d=\"M9 6h6\"/>", "fan": "<circle cx=\"12\" cy=\"12\" r=\"2\"/><path d=\"M12 10c-1-4 0-7 3-7 2.5 0 3 3 0 5M14 12c4-1 7 0 7 3 0 2.5-3 3-5 0M12 14c1 4 0 7-3 7-2.5 0-3-3 0-5M10 12c-4 1-7 0-7-3 0-2.5 3-3 5 0\"/>", "layers": "<path d=\"M12 3l9 5-9 5-9-5z\"/><path d=\"M3 13l9 5 9-5\"/><path d=\"M3 17.5l9 5 9-5\" opacity=\".5\"/>", "shield": "<path d=\"M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z\"/><path d=\"M8.5 12l2.5 2.5 4.5-5\"/>", "calendar": "<rect x=\"3.5\" y=\"5\" width=\"17\" height=\"15.5\" rx=\"2\"/><path d=\"M3.5 10h17M8 3v4M16 3v4\"/><path d=\"M8 14h2M14 14l2 2-2 2\"/>", "wrench": "<path d=\"M14.5 6.5a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3z\"/>", "check": "<path d=\"M5 12.5l4.5 4.5L19 7.5\"/>", "checkCircle": "<circle cx=\"12\" cy=\"12\" r=\"9\" fill=\"currentColor\" stroke=\"none\"/><path d=\"M7.5 12.3l3 3 6-6\" stroke=\"#06120a\" stroke-width=\"2.4\"/>", "alert": "<path d=\"M12 3l9.5 17h-19z\"/><path d=\"M12 10v4.5M12 17.5v.5\"/>", "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7.5v.5\"/>", "logout": "<path d=\"M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10\"/>", "download": "<path d=\"M12 4v11M7 10l5 5 5-5\"/><path d=\"M4 19h16\"/>", "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21c1.3-4 4.4-6 8-6s6.7 2 8 6\"/>", "chart": "<path d=\"M5 20V12M10 20V8M15 20V4M20 20v-6\"/>", "whatsapp": "<path d=\"M4 20l1.3-3.8A8 8 0 1 1 8 19z\"/><path d=\"M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.6-2-1-1 .9c-1-.4-1.9-1.3-2.3-2.3l.9-1-1-2z\"/>", "globe": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18\"/>", "chevR": "<path d=\"M9 5l7 7-7 7\"/>", "bag": "<path d=\"M5 8h14l-1 12H6z\"/><path d=\"M9 8V6a3 3 0 0 1 6 0v2\"/>", "trophy": "<path d=\"M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z\"/><path d=\"M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3\"/>"};
  const ico = (n, c = '') => `<svg class="ic ${c}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS[n] || ''}</svg>`;
  const ICO_TIPO = { cpu: 'cpu', board: 'board', ram: 'ram', gpu: 'gpu', disk: 'ssd', psu: 'bolt', case: 'box', cooler: 'fan', fans: 'fan', other: 'layers' };
  const TIPO_DE = { 'procesador': 'cpu', 'placa madre': 'board', 'memoria ram': 'ram', 'tarjeta grafica': 'gpu', 'almacenamiento': 'disk', 'fuente': 'psu', 'gabinete': 'case', 'refrigeracion': 'cooler', 'ventiladores': 'fans' };
  const tipoDe = t => TIPO_DE[String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] || 'other';
  const LS = 'churys-movil';
  const leerLS = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}'); } catch { return {}; } };
  const guardarLS = o => { try { localStorage.setItem(LS, JSON.stringify(o)); } catch {} };
  const E = leerLS();                               // { token, usuario, dev, pc, res }
  if (!E.dev) { E.dev = 'cel-' + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); guardarLS(E); }
  const D = { equipos: [], respaldo: null, cargando: false, error: '', tab: 'pc', reportes: null, pedidos: null, pedidosErr: '' };
  // Pedidos hechos en la tienda web con esta misma cuenta (www.churyspc.com valida el token con el script de la planilla)
  const WEB = 'https://www.churyspc.com/api/app/v1';

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
    if (!E.token) return;                       // la sesión venció mientras cargaba: ya se mostró el inicio de sesión
    if (!m?.ok) {                               // sin conexión: se muestra lo último que se vio, con el aviso
      D.error = m?.error === 'sin_conexion' && D.at ? `Sin conexión. Estás viendo los datos del ${new Date(D.at).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : msgErr(m);
      render(); return;
    }
    if (m.usuario) { E.usuario = m.usuario; guardarLS(E); }
    D.equipos = m.equipos || [];
    if (rsp?.ok) { try { D.respaldo = rsp.datos ? JSON.parse(rsp.datos) : null; } catch { D.respaldo = null; } } // si falló solo el respaldo, queda el anterior
    D.at = Date.now(); guardarDatos(); render();
  }
  // Lo último que se cargó queda guardado en el celular para verlo sin conexión (se borra al cerrar sesión)
  const LSD = 'churys-movil-datos';
  function guardarDatos() { try { localStorage.setItem(LSD, JSON.stringify({ de: E.usuario?.email || '', at: D.at, equipos: D.equipos, respaldo: D.respaldo })); } catch { try { localStorage.removeItem(LSD); } catch {} } }
  function leerDatos() {
    try { const x = JSON.parse(localStorage.getItem(LSD) || 'null'); if (x && x.de === (E.usuario?.email || '') && Array.isArray(x.equipos)) { D.equipos = x.equipos; D.respaldo = x.respaldo || null; D.at = x.at || 0; } } catch {}
  }
  // PCs, garantías y servicios: lógica pura en logica.js (probada en tools/pruebas/celular-unit.js)
  const { fecha, dias } = CHURYS_LOGICA, garantia = CHURYS_LOGICA.garantia, enCurso = CHURYS_LOGICA.enCurso;
  const pcs = () => CHURYS_LOGICA.pcs(D.equipos, D.respaldo);
  const actual = () => { const l = pcs(); return l.find(x => x.uid === E.pc) || l[0] || null; };
  const fmtF = s => { const d = fecha(s); return d ? d.toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; };

  /* ---------- Pantallas ---------- */
  const app = () => $('#app');
  function render() {
    if (!E.token) return renderLogin();
    const l = pcs(), x = actual(), u = E.usuario || {};
    app().innerHTML = `
      <header class="top"><img src="logo.png" alt="CHURY'S PC" class="logo"><button class="icon-btn ${D.cargando ? 'gira' : ''}" id="recargar" aria-label="Actualizar">${ico('refresh')}</button></header>
      <main class="main">
        <p class="hola">Hola${u.nombre ? ', <b>' + esc(u.nombre.split(' ')[0]) + '</b>' : ''} 👋</p>
        ${D.error ? `<div class="aviso err">${ico('alert')}<span>${esc(D.error)}</span></div>` : ''}
        ${l.length > 1 && D.tab !== 'mas' ? `<div class="chips">${l.map(p => `<button class="chip ${p.uid === x?.uid ? 'on' : ''}" data-pc="${esc(p.uid)}">${ico('monitor')}${esc(p.nombre)}</button>`).join('')}</div>` : ''}
        ${D.tab === 'mas' ? vistaMas() : D.tab === 'pedidos' ? vistaPedidos() : !x ? vacio() : D.tab === 'fps' ? vistaFps(x) : vistaPc(x)}
      </main>
      <nav class="tabs">${[['pc', 'monitor', 'Mi PC'], ['fps', 'gamepad', 'Rendimiento'], ['pedidos', 'bag', 'Pedidos'], ['mas', 'list', 'Más']].map(([k, i, t]) => `<button class="${D.tab === k ? 'on' : ''}" data-tab="${k}">${ico(i)}<span>${t}</span></button>`).join('')}</nav>`;
    bind();
  }
  function vacio() {
    if (D.cargando) return `<div class="esqueleto"></div><div class="esqueleto corto"></div><div class="esqueleto"></div>`;
    return `<div class="card vacio">${ico('monitor', 'grande')}<h3>Todavía no hay PCs en tu cuenta</h3>
      <p class="muted">Abrí la app <b>Churys PC</b> en tu computadora con esta misma cuenta: en unos minutos vas a ver tu PC acá, con sus componentes y su rendimiento en juegos.</p>
      <p class="muted sm">Si compraste en Churys PC, tu equipo aparece solo cuando el local registra la venta con tu correo.</p></div>`;
  }
  function badge(src) { const [t, c] = ORIGEN[src] || ['', '']; return t ? `<span class="tag ${c}">${t}</span>` : ''; }
  function anillo(dias, total) {
    const f = Math.max(0, Math.min(1, total > 0 ? dias / total : 0)), r = 34, C = 2 * Math.PI * r;
    return `<svg class="anillo" viewBox="0 0 80 80"><circle cx="40" cy="40" r="${r}" class="a-fondo"/><circle cx="40" cy="40" r="${r}" class="a-valor ${f < .15 ? 'poco' : ''}" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 40 40)"/></svg>`;
  }
  function vistaPc(x) {
    const g = garantia(x), serv = enCurso(x), p = x.pc, e = x.eq;
    const comps = p ? (p.components || []).filter(c => !c.removedAt).sort((a, b) => Object.keys(TIPOS).indexOf(a.type) - Object.keys(TIPOS).indexOf(b.type))
      : (e?.componentes || []).filter(c => !c.reemplazado).map(c => ({ type: tipoDe(c.tipo), model: c.modelo, source: 'verificado', condition: c.condicion, warrantyUntil: c.garantiaHasta }));
    const compG = c => { const v = e?.componentes?.find(z => !z.reemplazado && (z.modelo === c.verifiedModel || z.modelo === c.model)); return v?.garantiaHasta || c.warrantyUntil || ''; };
    const de = t => comps.find(c => c.type === t && !c.integrated) || comps.find(c => c.type === t);
    const spec = [de('cpu'), de('gpu'), de('ram')].filter(Boolean).map(c => esc(corto(c.verifiedModel || c.model)));
    const total = g && e ? Math.max(1, Math.round((fecha(g.hasta) - fecha(e.equipo.fechaVenta || g.hasta)) / 864e5)) || 365 : 365;
    return `
      <section class="hero">
        <div class="hero-ic">${ico('monitor')}</div>
        <div class="hero-txt"><h2>${esc(x.nombre)}</h2>
          ${spec.length ? `<p class="spec">${spec.join(' <i>·</i> ')}</p>` : ''}
          <div class="hero-tags">${e ? `<span class="tag ok">${ico('check')}Verificada · ${esc(e.equipo.id)}</span>` : `<span class="tag">Sin compra registrada</span>`}${p?.maintenance?.last ? `<span class="tag">${ico('wrench')}Mantenimiento ${fmtF(p.maintenance.last)}</span>` : ''}</div></div>
      </section>
      ${serv.map(s => `<div class="card serv ${/listo/i.test(s.estado) ? 'listo' : ''}"><div class="row"><div class="tit">${ico(/listo/i.test(s.estado) ? 'checkCircle' : 'wrench')}<div><b>${esc(s.tipo || 'Servicio')}</b><small class="muted">${esc(s.numero || '')}${s.fecha ? ' · ' + fmtF(s.fecha) : ''}</small></div></div><span class="tag det">${esc(s.estado)}</span></div>
        ${s.detalle ? `<p class="muted sm">${esc(s.detalle)}</p>` : ''}${/listo/i.test(s.estado) ? '<p class="ok-t">¡Ya podés pasar a retirarla!</p>' : ''}</div>`).join('')}
      <div class="card gar">
        ${!g ? `<div class="tit">${ico('shield')}<h3>Garantía</h3></div><p class="muted sm">${e ? 'Sin fecha de garantía registrada.' : 'Las garantías aparecen cuando la PC o los componentes los compraste en Churys PC.'}</p>`
          : `<div class="gar-in"><div class="anillo-box">${anillo(Math.max(0, g.dias), total)}<div class="anillo-num">${g.dias >= 0 ? `<b>${g.dias}</b><small>${g.dias === 1 ? 'día' : 'días'}</small>` : `<b>${ico('alert')}</b><small>vencida</small>`}</div></div>
            <div><div class="tit">${ico('shield')}<h3>Garantía</h3></div>
            <p class="sm">${g.dias >= 0 ? (g.general ? `Del equipo, hasta el <b>${fmtF(g.hasta)}</b>` : `Por componente. La próxima vence el <b>${fmtF(g.hasta)}</b>: ${esc(g.que)}${g.mas ? ` (+${g.mas} más)` : ''}`) : `Venció el ${fmtF(g.hasta)}`}</p></div></div>`}
        <p class="muted xs fina">Cubre desperfectos de fábrica; no incluye manipulación, mal uso ni causas externas.</p>
      </div>
      <div class="card">
        <div class="tit">${ico('layers')}<h3>Componentes</h3></div>
        ${comps.length ? comps.map(c => `<div class="comp"><div class="comp-ic">${ico(ICO_TIPO[c.type] || 'layers')}</div>
          <div class="comp-m"><small>${esc(TIPOS[c.type] || c.tipo || '')}</small><b>${esc(c.verifiedModel || c.model)}</b>${c.details ? `<span>${esc(c.details)}</span>` : ''}
            <div class="comp-tags">${badge(c.source)}${c.condition ? `<span class="tag">${/usad/i.test(c.condition) ? 'Usado' : 'Nuevo'}</span>` : ''}${compG(c) ? `<span class="tag">${ico('shield')}${fmtF(compG(c))}</span>` : ''}</div></div></div>`).join('')
          : '<p class="muted">Sin componentes cargados.</p>'}
        <p class="muted xs leyenda"><span class="tag ok">Verificado</span> registrado por Churys PC <span class="tag det">Detectado</span> leído de tu PC <span class="tag man">Manual</span> cargado por vos</p>
      </div>`;
  }
  const corto = m => String(m || '').replace(/\b(NVIDIA|GeForce|AMD|Intel\(R\)|Intel|Radeon\(TM\)|Core\(TM\))\s*/gi, '').replace(/\s+/g, ' ').trim();
  const nivel = f => f >= 100 ? 'n4' : f >= 60 ? 'n3' : f >= 30 ? 'n2' : 'n1';
  function vistaFps(x) {
    const F = (D.respaldo?.movil?.fps || []).find(f => f.uid === x.pc?.uid), res = E.res === '1440p' ? '1440p' : '1080p';
    const ses = (D.respaldo?.movil?.sesiones || []).filter(s => !s.pc || s.pc === x.pc?.uid).slice(0, 15);
    if (!F && !ses.length) return `<div class="card vacio">${ico('gamepad', 'grande')}<h3>Rendimiento en juegos</h3><p class="muted">Abrí la app <b>Churys PC</b> en esta computadora con tu cuenta: ahí se calculan los FPS de tu PC y se guardan tus partidas medidas con el Monitoreo, y aparecen acá.</p></div>`;
    const conf = ['', 'baja', 'media', 'alta'];
    const js = F ? F.juegos.filter(j => j[res]).sort((a, b) => b[res].avg - a[res].avg) : [];
    const sobre60 = js.filter(j => j[res].avg >= 60).length;
    return `
      ${F ? `<section class="hero fps-hero"><div class="hero-ic">${ico('gamepad')}</div><div class="hero-txt"><h2>${sobre60} de ${js.length}</h2><p class="spec">juegos populares a 60 FPS o más en ${res}, calidad Alta</p>
        <p class="muted xs">${esc(corto(F.cpu))} · ${esc(corto(F.gpu))}${F.ram ? ' · ' + esc(F.ram) : ''}</p></div></section>
      <div class="card">
        <div class="row"><div class="tit">${ico('chart')}<h3>FPS estimados</h3></div><div class="seg">${['1080p', '1440p'].map(r => `<button class="${r === res ? 'on' : ''}" data-res="${r}">${r}</button>`).join('')}</div></div>
        ${js.map(j => { const v = j[res]; return `<div class="juego"><div class="j-top"><span class="j-nom">${esc(j.nombre)}</span><span class="fps ${nivel(v.avg)}"><b>${v.avg}</b> FPS</span></div>
          <div class="barra"><i class="${nivel(v.avg)}" data-w="${Math.max(4, Math.min(100, v.avg / 165 * 100)).toFixed(0)}"></i></div>
          <small class="muted">${v.rango ? `entre ${v.rango[0]} y ${v.rango[1]}` : ''}${v.tipo === 'benchmark' ? ' · medido' : ` · confianza ${conf[v.conf] || 'baja'}`}${v.low1 ? ` · 1 % bajo ${v.low1}` : ''}</small></div>`; }).join('') || '<p class="muted">Sin datos para esta resolución.</p>'}
        <p class="muted xs fina">Mismos números que el Simulador de FPS de la app de Windows: salen de mediciones publicadas de cada juego, sin escalado ni ray tracing.</p></div>` : ''}
      <div class="card">
        <div class="tit">${ico('trophy')}<h3>Tus partidas</h3></div>
        ${ses.length ? ses.map(s => `<div class="partida"><div class="p-ic">${ico('gamepad')}</div><div class="p-m"><b>${esc(s.juego || 'Juego')}</b><small class="muted">${s.inicio ? new Date(s.inicio).toLocaleString('es-UY', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}${s.duracion ? ' · ' + Math.round(s.duracion / 60) + ' min' : ''}</small>
            ${s.gpuTempMax != null || s.cpuTempMax != null ? `<small class="muted">${[s.cpuTempMax != null && 'CPU ' + Math.round(s.cpuTempMax) + ' °C', s.gpuTempMax != null && 'GPU ' + Math.round(s.gpuTempMax) + ' °C'].filter(Boolean).join(' · ')} máx.</small>` : ''}</div>
          <div class="p-r">${s.fpsProm != null ? `<b class="${nivel(s.fpsProm)}">${Math.round(s.fpsProm)}</b><small>FPS prom.</small>${s.low1 != null ? `<small>1 % bajo ${Math.round(s.low1)}</small>` : ''}` : '<small class="muted">sin FPS</small>'}</div></div>`).join('')
          : '<p class="muted sm">Todavía no hay partidas medidas. En la app de Windows: Monitoreo → grabá una sesión mientras jugás.</p>'}
      </div>`;
  }
  async function cargarPedidos() {
    D.pedidosErr = '';
    if (!CFG.url) { D.pedidos = (await DEMO({ accion: 'misPedidosWeb' })).pedidos || []; return render(); }
    try {
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 20000);
      const r = await fetch(WEB + '/mis-pedidos', { headers: { authorization: 'Bearer ' + E.token }, signal: ctrl.signal }).then(x => x.json());
      clearTimeout(t);
      if (r.ok) D.pedidos = r.pedidos;
      else D.pedidosErr = r.error === 'identidad_no_configurada' ? 'Muy pronto vas a ver acá tus pedidos de la tienda web.' : r.error === 'sesion_vencida' ? ERR.sesion_vencida || 'Tu sesión venció.' : 'No pudimos traer tus pedidos. Probá de nuevo.';
    } catch { D.pedidosErr = 'Sin conexión con la tienda. Probá de nuevo.'; }
    if (D.tab === 'pedidos') render();
  }
  function vistaPedidos() {
    if (D.pedidos === null && !D.pedidosErr) { cargarPedidos(); return `<div class="esqueleto"></div><div class="esqueleto corto"></div>`; }
    if (D.pedidosErr) return `<div class="aviso err">${ico('alert')}<span>${esc(D.pedidosErr)}</span></div>`;
    if (!D.pedidos.length) return `<div class="card vacio">${ico('bag', 'grande')}<h3>Todavía no hay pedidos</h3><p class="muted">Los pedidos que hagas en churyspc.com con esta cuenta aparecen acá, con su estado.</p></div>`;
    return `<div class="card lista">${D.pedidos.map(p => `<a class="item ped" href="${esc(p.seguimiento)}" rel="noopener">${ico('bag')}<span><b>${esc(p.id)}</b><small class="muted">${esc(String(p.fecha).slice(0, 10).split('-').reverse().join('/'))} · ${p.productos} producto${p.productos === 1 ? '' : 's'} · ${esc(p.total_texto)}</small><small class="estado">${esc(p.estado_texto)}</small></span>${ico('chevR', 'flecha')}</a>`).join('')}</div>
      <p class="muted xs center">Tocá un pedido para ver su seguimiento completo.</p>`;
  }
  function vistaMas() {
    const u = E.usuario || {};
    return `
      <div class="card"><div class="tit">${ico('alert')}<h3>Reportar un problema</h3></div>
        <textarea id="rep-que" rows="4" maxlength="2000" placeholder="Contanos qué pasó…"></textarea>
        <div class="err-t" id="rep-err"></div>
        <button class="btn" id="rep-env">Enviar reporte</button>
        <div id="rep-lista"></div></div>
      <div class="card lista">
        <a class="item" href="../" rel="noopener">${ico('download')}<span><b>App para Windows</b><small class="muted">Monitoreo, Simulador de FPS, drivers y más</small></span>${ico('chevR', 'flecha')}</a>
        <a class="item" href="https://wa.me/59894677755" rel="noopener">${ico('whatsapp')}<span><b>WhatsApp</b><small class="muted">094 677 755</small></span>${ico('chevR', 'flecha')}</a>
        <a class="item" href="https://churyspc.com" rel="noopener">${ico('globe')}<span><b>Churyspc.com</b><small class="muted">Tienda y novedades</small></span>${ico('chevR', 'flecha')}</a>
      </div>
      <div class="card"><div class="tit">${ico('user')}<h3>Cuenta</h3></div><p class="muted sm">${esc(u.email || '')}</p><button class="btn ghost" id="salir">${ico('logout')} Cerrar sesión en este celular</button></div>
      <p class="muted xs center">CHURY'S PC</p>`;
  }
  function bind() {
    // anchos de las barras por JavaScript (la política de seguridad de la página no permite estilos en el HTML)
    $$('[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; });
    $$('[data-tab]').forEach(b => b.onclick = () => { D.tab = b.dataset.tab; render(); window.scrollTo(0, 0); });
    $$('[data-pc]').forEach(b => b.onclick = () => { E.pc = b.dataset.pc; guardarLS(E); render(); });
    $$('[data-res]').forEach(b => b.onclick = () => { E.res = b.dataset.res; guardarLS(E); render(); });
    $('#recargar') && ($('#recargar').onclick = () => { if (D.tab === 'pedidos') { D.pedidos = null; render(); } else cargar(); });
    $('#salir') && ($('#salir').onclick = () => salir());
    if (D.cargando) $('#recargar').disabled = true;
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
    $('#rep-lista').innerHTML = (D.reportes.length ? '<p class="sub">Tus reportes</p>' : '') + D.reportes.map(x => `<div class="rep"><div class="row"><b>${esc(x.numero)}</b><span class="tag ${x.estado === 'Corregido' ? 'ok' : 'det'}">${esc(x.estado === 'Para Facundo' ? 'En revisión' : x.estado)}</span></div><p class="muted sm">${esc(x.descripcion)}</p>${x.respuesta ? `<p class="resp">${esc(x.respuesta)}</p>` : ''}</div>`).join('');
  }
  function alertaSuave(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 3500); }

  /* ---------- Inicio de sesión ---------- */
  let L = { paso: 'datos', email: '', tipo: '' };
  function renderLogin() {
    app().innerHTML = `<main class="login">
      <div class="login-glow"></div>
      <img src="logo.png" alt="CHURY'S PC" class="logo-g">
      <p class="lema">Tu PC, siempre bajo control</p>
      <div class="card login-card">
        ${L.paso === 'datos' ? `<h2>Iniciá sesión</h2><p class="muted sm">Con la misma cuenta que usás en la app de Windows.</p>
          <label>Correo<input id="l-email" type="email" autocomplete="username" inputmode="email" autocapitalize="none" spellcheck="false" value="${esc(L.email)}" placeholder="tu@correo.com"></label>
          <label>PIN o contraseña<input id="l-pin" type="password" autocomplete="current-password" placeholder="••••"></label>`
          : `<h2>Revisá tu correo</h2><p class="muted sm">Te mandamos un código de 6 números a <b>${esc(L.email)}</b>.</p>
          <label>Código<input id="l-cod" class="codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000"></label>`}
        <div class="err-t" id="l-err"></div>
        <button class="btn" id="l-ok">${L.paso === 'datos' ? 'Entrar' : 'Confirmar'}</button>
        ${L.paso !== 'datos' ? '<button class="btn ghost" id="l-volver">Volver</button>' : `<p class="muted xs center separa">¿No tenés cuenta? Creala en la app de Windows de Churys PC.</p>`}
      </div>
      <p class="muted xs center instalar">Para tenerla como app: en Safari tocá <b>Compartir</b> y después <b>Agregar a inicio</b>.</p></main>`;
    $('#l-ok').onclick = loginPaso;
    $('#l-volver') && ($('#l-volver').onclick = () => { L.paso = 'datos'; renderLogin(); });
    $$('input', app()).forEach(i => i.onkeydown = e => { if (e.key === 'Enter') loginPaso(); });
  }
  async function loginPaso() {
    const err = $('#l-err'), b = $('#l-ok');
    if (b.disabled) return;                     // doble toque o Enter repetido: un solo pedido
    err.textContent = '';
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
    delete E.token; delete E.usuario; delete E.pc; guardarLS(E); D.equipos = []; D.respaldo = null; D.reportes = null; D.at = 0; D.tab = 'pc';
    try { localStorage.removeItem(LSD); } catch {}
    renderLogin(); if (vencida) $('#l-err').textContent = ERR.sesion_vencida;
  }

  /* ---------- Modo demostración (solo si la página no tiene configurada la planilla) ---------- */
  function DEMO(b) {
    const d = window.CHURYS_DEMO || {};
    return new Promise(ok => setTimeout(() => ok(d[b.accion] ? d[b.accion](b) : { ok: true }), 250));
  }

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (E.token) { leerDatos(); cargar(); } else renderLogin();
})();
