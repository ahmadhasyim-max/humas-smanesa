// ===== Inti: API, state, utilitas tanggal, modal, toast, ikon =====
export const state = { token: localStorage.getItem('humas_token') || '', user: null, settings: {} };

export async function api(path, opt = {}) {
  const headers = { ...(opt.headers || {}) };
  if (state.token) headers.authorization = 'Bearer ' + state.token;
  let body = opt.body;
  if (body && !(body instanceof FormData) && typeof body !== 'string') { body = JSON.stringify(body); headers['content-type'] = 'application/json'; }
  const res = await fetch('/api/' + path, { method: opt.method || 'GET', headers, body });
  let data; try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) {
    if (res.status === 401 && state.token && !opt.noAuthRedirect) { setToken(''); location.hash = '#/login'; }
    throw new Error(data.error || 'Gagal (' + res.status + ')');
  }
  return data;
}
export function setToken(t) { state.token = t; if (t) localStorage.setItem('humas_token', t); else localStorage.removeItem('humas_token'); }
export const fileUrl = (id) => (id ? '/api/file/' + id : '');
export const logoSrc = () => (state.settings.logo_file ? fileUrl(state.settings.logo_file) : '/assets/logo-jatim.png');
export const kopSrc = () => (state.settings.kop_file ? fileUrl(state.settings.kop_file) : '/assets/kop.png');

// ---------- tanggal ----------
export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const parseD = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayISO = () => iso(new Date());
export function tglPanjang(s, withDay = true) { if (!s) return '-'; const d = parseD(s); return (withDay ? HARI[d.getDay()] + ', ' : '') + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
export const tglPendek = (s) => { if (!s) return '-'; const d = parseD(s); return d.getDate() + ' ' + BULAN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); };
export function selisihHari(s) { const a = parseD(todayISO()), b = parseD(s); return Math.round((b - a) / 86400000); }
export function countdown(s) { const n = selisihHari(s); if (n === 0) return 'Hari ini'; if (n === 1) return 'Besok'; if (n < 0) return Math.abs(n) + ' hari lalu'; return 'H-' + n; }
export const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// ---------- DOM ----------
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const nl2br = (s) => esc(s).replace(/\n/g, '<br>');
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

export function toast(msg, isErr = false) {
  const t = h(`<div class="toast ${isErr ? 'err' : ''}">${esc(msg)}</div>`);
  document.body.appendChild(t); setTimeout(() => t.remove(), isErr ? 4500 : 2600);
}
export const fail = (e) => toast(e.message || String(e), true);

export function modal({ title, body, wide = false, actions = [] }) {
  const el = h(`<div class="modal-bg"><div class="modal ${wide ? 'wide' : ''}"><div class="modal-h"><h3>${esc(title)}</h3><button class="x" aria-label="Tutup">&times;</button></div><div class="modal-b"></div><div class="modal-f"></div></div></div>`);
  const b = $('.modal-b', el); if (typeof body === 'string') b.innerHTML = body; else if (body) b.appendChild(body);
  const close = () => el.remove();
  $('.x', el).onclick = close;
  el.addEventListener('mousedown', (e) => { if (e.target === el) close(); });
  const f = $('.modal-f', el);
  if (!actions.length) f.remove();
  for (const a of actions) {
    const btn = h(`<button class="btn ${a.cls || ''}">${a.label}</button>`);
    btn.onclick = async () => { if (!a.onClick) return close(); btn.disabled = true; try { const r = await a.onClick(el); if (r !== false) close(); } catch (e) { fail(e); } btn.disabled = false; };
    f.appendChild(btn);
  }
  document.body.appendChild(el);
  return { el, close };
}
export function confirmBox(msg, label = 'Hapus') {
  return new Promise((res) => {
    const m = modal({ title: 'Konfirmasi', body: `<p>${esc(msg)}</p>`, actions: [{ label: 'Batal', onClick: () => { res(false); } }, { label, cls: 'primary', onClick: () => { res(true); } }] });
    $('.x', m.el).addEventListener('click', () => res(false));
  });
}

// Form modal: fields = [{name,label,type,options,required,full,hint,placeholder}]
export function formModal({ title, fields, values = {}, submitLabel = 'Simpan', onSubmit, wide }) {
  const form = h('<form class="form"></form>');
  for (const f of fields) {
    const v = values[f.name] ?? f.default ?? '';
    let input;
    if (f.type === 'select') input = `<select name="${f.name}">${f.options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if (f.type === 'textarea') input = `<textarea name="${f.name}" rows="${f.rows || 4}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea>`;
    else input = `<input name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''} ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${f.datalist ? `list="dl_${f.name}"` : ''}>${f.datalist ? `<datalist id="dl_${f.name}">${f.datalist.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>` : ''}`;
    form.appendChild(h(`<label class="f ${f.full || f.type === 'textarea' ? 'full' : ''}">${esc(f.label)}${f.required ? ' *' : ''}${input}${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</label>`));
  }
  const m = modal({
    title, body: form, wide,
    actions: [{ label: 'Batal' }, {
      label: submitLabel, cls: 'primary', onClick: async () => {
        if (!form.reportValidity()) return false;
        const data = Object.fromEntries(new FormData(form));
        for (const f of fields) if (f.type === 'number') data[f.name] = data[f.name] === '' ? 0 : Number(data[f.name]);
        return onSubmit(data);
      },
    }],
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  return m;
}

// ---------- gambar ----------
export function loadImg(src) { return new Promise((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar gagal dimuat')); i.src = src; }); }
export async function compressImage(file, max = 1600, q = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', q));
    return new File([blob], (file.name || 'foto').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally { URL.revokeObjectURL(url); }
}
export async function uploadFile(file, name) {
  const fd = new FormData(); fd.append('file', file, name || file.name);
  return (await api('files', { method: 'POST', body: fd })).id;
}
export function downloadBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
export function pickFile(accept = 'image/*', multiple = false) {
  return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = multiple; i.onchange = () => res([...i.files]); i.click(); });
}
export async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Disalin ke clipboard'); } catch { const ta = h('<textarea></textarea>'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('Disalin'); } }

// ---------- QR ----------
export function qrDataUrl(text, cell = 6) { const q = window.qrcode(0, 'M'); q.addData(text); q.make(); return q.createDataURL(cell, 2); }

// ---------- Ikon (SVG sederhana) ----------
const P = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  meet: 'M4 5h16v11H8l-4 4zM8 9h8M8 12h5',
  mega: 'M3 11v2a1 1 0 001 1h2l5 4V6L6 10H4a1 1 0 00-1 1zM15 8a5 5 0 010 8M18 5a9 9 0 010 14',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V21a2 2 0 11-4 0v-.1a1.6 1.6 0 00-2.7-1.1l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00-1.1-2.7H3a2 2 0 110-4h.1a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 002.7-1.1V3a2 2 0 114 0v.1a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 001.1 2.7H21a2 2 0 110 4h-.1a1.6 1.6 0 00-1.5 1z',
  plus: 'M12 5v14M5 12h14',
  edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  dl: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  up: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  pdf: 'M6 3h9l4 4v14H6zM14 3v5h5',
  img: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  back: 'M15 18l-6-6 6-6',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  print: 'M7 8V3h10v5M7 17H4v-7h16v7h-3M7 14h10v7H7z',
  pen: 'M3 21c3-1 5-3 7-6l8-8a2 2 0 00-3-3l-8 8c-3 2-5 4-6 7z',
  out: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M9 17h6v4H9z',
  cake: 'M4 21h16M5 21v-8h14v8M5 16c2 1.5 4 1.5 7 0s5-1.5 7 0M12 13V9M12 6.5a1.2 1.2 0 01-1.2-1.2C10.8 4.2 12 3 12 3s1.2 1.2 1.2 2.3A1.2 1.2 0 0112 6.5z',
};
export const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n] || ''}"/></svg>`;

// ---------- Signature pad ----------
export function sigPad(canvas) {
  const ctx = canvas.getContext('2d');
  let drawing = false, last = null, dirty = false;
  function fit() {
    const r = canvas.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    const data = dirty ? canvas.toDataURL() : null;
    canvas.width = r.width * dpr; canvas.height = r.height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#0b1f63';
    if (data) loadImg(data).then((i) => ctx.drawImage(i, 0, 0, r.width, r.height));
  }
  const pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', (e) => { drawing = true; last = pos(e); canvas.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.arc(last.x, last.y, 1.1, 0, Math.PI * 2); ctx.fillStyle = '#0b1f63'; ctx.fill(); dirty = true; });
  canvas.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pos(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; dirty = true; });
  const end = () => { drawing = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  requestAnimationFrame(fit);
  return {
    clear() { ctx.clearRect(0, 0, canvas.width, canvas.height); dirty = false; },
    isEmpty: () => !dirty,
    // potong area kosong agar rapi saat dicetak
    toDataURL() {
      const w = canvas.width, hh = canvas.height; const d = ctx.getImageData(0, 0, w, hh).data;
      let x0 = w, y0 = hh, x1 = 0, y1 = 0;
      for (let y = 0; y < hh; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 <= x0) return '';
      const pad = 10; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w, x1 + pad); y1 = Math.min(hh, y1 + pad);
      const s = Math.min(1, 600 / (x1 - x0));
      const c = document.createElement('canvas'); c.width = Math.round((x1 - x0) * s); c.height = Math.round((y1 - y0) * s);
      c.getContext('2d').drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
      return c.toDataURL('image/png');
    },
  };
}

export function sigModal(title = 'Tanda Tangan') {
  return new Promise((res) => {
    const body = h(`<div><p class="muted small" style="margin-top:0">Goreskan tanda tangan di dalam kotak (bisa dengan jari di HP/tablet).</p><canvas class="sigbox"></canvas></div>`);
    let pad;
    const m = modal({ title, body, actions: [
      { label: 'Ulangi', onClick: () => { pad.clear(); return false; } },
      { label: 'Batal', onClick: () => res(null) },
      { label: 'Gunakan', cls: 'primary', onClick: () => { if (pad.isEmpty()) { toast('Tanda tangan masih kosong', true); return false; } res(pad.toDataURL()); } },
    ] });
    pad = sigPad($('canvas', body));
    $('.x', m.el).addEventListener('click', () => res(null));
  });
}
