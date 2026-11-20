import { state, api, setToken, $, $$, h, esc, icon, toast, fail, todayISO, tglPanjang, BULAN, HARI, parseD, iso, countdown, selisihHari, rupiah, formModal, confirmBox, fileUrl, nl2br, logoSrc, modal } from './core.js';
import { pageRapat, pageRapatDetail } from './rapat.js';
import { pagePublikasi, pagePublikasiDetail } from './publikasi.js';
import { pagePengaturan } from './pengaturan.js';
import { pageUltah, pageUltahDetail, ultahMendatang } from './ultah.js';
import { exportPdf, printDoc, kopHtml } from './laporan.js';

const root = $('#root');
const NAV = [
  ['#/', 'home', 'Beranda'],
  ['#/agenda', 'cal', 'Agenda'],
  ['#/proker', 'list', 'Program Kerja'],
  ['#/rapat', 'meet', 'Rapat'],
  ['#/publikasi', 'mega', 'Publikasi'],
  ['#/ultah', 'cake', 'Ulang Tahun'],
  ['#/pengaturan', 'gear', 'Pengaturan'],
];

async function boot() {
  try {
    const st = await api('status');
    state.settings = st.settings; state.needSetup = st.needSetup;
  } catch (e) { root.innerHTML = `<div class="login-wrap"><div class="login"><h2>Tidak dapat terhubung</h2><p class="muted">${esc(e.message)}</p></div></div>`; return; }
  if (state.token) { try { state.user = await api('me', { noAuthRedirect: true }); } catch { setToken(''); } }
  window.addEventListener('hashchange', render);
  render();
}

function shell(active) {
  const s = state.settings;
  root.innerHTML = '';
  const app = h(`<div class="app">
    <aside class="sidebar">
      <div class="brand"><img src="${logoSrc()}" alt="logo"><div><b>HUMAS</b><span>${esc(s.nama_sekolah)}</span></div></div>
      <nav class="nav">${NAV.filter((n) => state.user || !['#/pengaturan'].includes(n[0])).map(([href, ic, label]) => `<a href="${href}" class="${active === href ? 'active' : ''}">${icon(ic)}<span>${label}</span></a>`).join('')}</nav>
      <div class="side-foot">${state.user ? `Masuk sebagai <b>${esc(state.user.nama)}</b><br><button id="logout">Keluar</button>` : `<a href="#/login" style="color:var(--gold)">Login petugas Humas →</a>`}</div>
    </aside>
    <div>
      <div class="mobilebar"><img src="${logoSrc()}" alt=""><b>HUMAS</b><span class="small">${esc(s.singkatan || '')}</span><span class="spacer"></span>${state.user ? '<button id="logout2">Keluar</button>' : '<a href="#/login" style="color:var(--gold)">Login</a>'}</div>
      <main class="main" id="main"></main>
    </div></div>`);
  root.appendChild(app);
  const lo = async () => { try { await api('logout', { method: 'POST' }); } catch {} setToken(''); state.user = null; location.hash = '#/'; render(); };
  $('#logout', app)?.addEventListener('click', lo); $('#logout2', app)?.addEventListener('click', lo);
  return $('#main', app);
}

async function render() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (state.needSetup) return pageSetup();
  if (parts[0] === 'login') return pageLogin();
  const needAuth = ['rapat', 'publikasi', 'pengaturan', 'ultah'].includes(parts[0]);
  if (needAuth && !state.user) { sessionStorage.setItem('after_login', hash); location.hash = '#/login'; return; }
  const active = '#/' + (parts[0] || '');
  const main = shell(active === '#/' ? '#/' : active);
  window.scrollTo(0, 0);
  try {
    if (!parts[0]) await pageBeranda(main);
    else if (parts[0] === 'agenda') await pageAgenda(main);
    else if (parts[0] === 'proker') await pageProker(main);
    else if (parts[0] === 'rapat') parts[1] ? await pageRapatDetail(main, +parts[1]) : await pageRapat(main);
    else if (parts[0] === 'publikasi') parts[1] ? await pagePublikasiDetail(main, +parts[1], +parts[2]) : await pagePublikasi(main);
    else if (parts[0] === 'ultah') parts[1] ? await pageUltahDetail(main, +parts[1], +parts[2]) : await pageUltah(main);
    else if (parts[0] === 'pengaturan') await pagePengaturan(main);
    else main.innerHTML = '<div class="empty">Halaman tidak ditemukan.</div>';
  } catch (e) { main.innerHTML = `<div class="card empty">Gagal memuat: ${esc(e.message)}</div>`; }
}
export const rerender = render;

// ================= LOGIN & SETUP =================
function authFrame(title, sub, formHtml) {
  root.innerHTML = `<div class="login-wrap"><div class="login"><div class="logo"><img src="${logoSrc()}" alt=""><div><b style="letter-spacing:.08em;color:var(--navy)">HUMAS</b><div class="small muted">${esc(state.settings.nama_sekolah || '')}</div></div></div><h2>${title}</h2><p class="muted small">${sub}</p>${formHtml}</div></div>`;
}
function pageSetup() {
  authFrame('Buat Akun Admin', 'Ini pertama kali sistem dijalankan. Buat akun admin Humas.', `<form class="grid" id="f">
    <label class="f">Nama lengkap<input name="nama" required value="Ahmad Hasyim Asy'ari, S.T., M.Kom."></label>
    <label class="f">Username<input name="username" required value="humas"></label>
    <label class="f">Password (min. 6 karakter)<input name="password" type="password" minlength="6" required></label>
    <button class="btn primary" style="justify-content:center">Buat Admin</button></form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault(); const d = Object.fromEntries(new FormData(e.target));
    try { await api('setup', { method: 'POST', body: d }); const r = await api('login', { method: 'POST', body: d }); setToken(r.token); state.user = r.user; state.needSetup = false; location.hash = '#/'; render(); toast('Admin berhasil dibuat'); } catch (er) { fail(er); }
  };
}
function pageLogin() {
  if (state.user) { location.hash = '#/'; return; }
  authFrame('Login Petugas', 'Masuk untuk mengelola rapat, publikasi, agenda, dan program kerja.', `<form class="grid" id="f">
    <label class="f">Username<input name="username" required autocomplete="username"></label>
    <label class="f">Password<input name="password" type="password" required autocomplete="current-password"></label>
    <button class="btn primary" style="justify-content:center">Masuk</button>
    <a href="#/" class="small center">← Kembali ke beranda</a></form>`);
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    try { const r = await api('login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); setToken(r.token); state.user = r.user; const to = sessionStorage.getItem('after_login') || '#/'; sessionStorage.removeItem('after_login'); location.hash = to; render(); } catch (er) { fail(er); }
  };
}

// ================= BERANDA =================
async function pageBeranda(main) {
  const t = todayISO();
  const end = iso(new Date(Date.now() + 60 * 86400000));
  const [agenda, proker, extra] = await Promise.all([
    api(`agenda?from=${t}&to=${end}`),
    api('proker?tahun=' + encodeURIComponent(state.settings.tahun_ajaran || '')),
    state.user ? Promise.all([api('publikasi/mendatang'), api('rapat'), ultahMendatang(7).catch(() => [])]) : Promise.resolve(null),
  ]);
  const items = proker.items;
  const avg = items.length ? Math.round(items.reduce((a, b) => a + (+b.progres || 0), 0) / items.length) : 0;
  const d = new Date();
  main.innerHTML = `
    <div class="topbar"><div><h1>Selamat datang${state.user ? ', ' + esc(state.user.nama.split(',')[0]) : ''}</h1><p class="muted">${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()} · Hubungan Masyarakat ${esc(state.settings.nama_sekolah)}</p></div></div>
    <div id="remind"></div>
    <div class="grid g4" style="margin:16px 0">
      <div class="card stat"><span class="muted small">Agenda 60 hari ke depan</span><b>${agenda.length}</b></div>
      <div class="card stat"><span class="muted small">Program kerja ${esc(state.settings.tahun_ajaran)}</span><b>${items.length}</b></div>
      <div class="card stat"><span class="muted small">Rata-rata capaian proker</span><b>${avg}%</b></div>
      <div class="card stat"><span class="muted small">${state.user ? 'Notulen rapat tersimpan' : 'Proker selesai'}</span><b>${state.user ? extra[1].length : items.filter((x) => x.status === 'selesai').length}</b></div>
    </div>
    <div class="grid g2">
      <div class="card"><div class="row"><h2>Agenda Mendatang</h2><span class="spacer"></span><a class="btn sm" href="#/agenda">Lihat semua</a></div>
        ${agenda.length ? agenda.slice(0, 6).map(agendaLi).join('') : '<div class="empty">Belum ada agenda terjadwal.</div>'}</div>
      <div class="card"><div class="row"><h2>${state.user ? 'Rapat Terbaru' : 'Program Kerja'}</h2><span class="spacer"></span><a class="btn sm" href="${state.user ? '#/rapat' : '#/proker'}">Lihat semua</a></div>
        ${state.user ? (extra[1].length ? extra[1].slice(0, 6).map((r) => `<a class="li" href="#/rapat/${r.id}" style="text-decoration:none;color:inherit"><div class="datebox gold"><b>${parseD(r.tanggal).getDate()}</b><span>${BULAN[parseD(r.tanggal).getMonth()].slice(0, 3)}</span></div><div><b>${esc(r.judul)}</b><div class="small muted">${esc(r.tempat || '')} · ${r.jml_hadir} hadir · ${r.jml_foto} foto</div></div><span class="spacer"></span>${r.status === 'final' ? '<span class="badge green">Final</span>' : '<span class="badge gold">Draft</span>'}</a>`).join('') : '<div class="empty">Belum ada rapat.</div>')
        : (items.length ? items.slice(0, 6).map((p) => `<div class="li"><div style="flex:1"><b>${esc(p.program)}</b><div class="small muted">${esc(p.bidang || '')} · ${esc(p.waktu || '')}</div></div><div style="width:110px"><div class="progress"><i style="width:${+p.progres || 0}%"></i></div><div class="small muted right">${+p.progres || 0}%</div></div></div>`).join('') : '<div class="empty">Belum ada program kerja.</div>')}
      </div>
    </div>`;
  if (state.user) {
    const ul = extra[2];
    if (ul.length) $('#remind', main).insertAdjacentHTML('afterend', `<div class="remind" style="margin-top:12px;background:linear-gradient(120deg,#7a1f4a,#b23a6b)"><h3>🎂 Ulang Tahun ${ul[0].cd === 'Hari ini 🎉' ? 'Hari Ini' : 'Minggu Ini'}</h3><div class="items">${ul.slice(0, 4).map((g) => `<a class="it" href="#/ultah/${g.id}/${g.next.slice(0, 4)}"><span class="cd">${g.cd} · ${tglPanjang(g.next, false)}</span><b>${esc(g.label)}</b><span class="small">${g.ig_done || g.wa_done ? '✅ Sudah diucapkan' : '⏳ Klik untuk membuat ucapan'}</span></a>`).join('')}</div></div>`);
    const up = extra[0].items;
    const lead = +state.settings.pengingat_hari || 7;
    const near = up.filter((x) => selisihHari(x.tanggal) <= lead);
    const show = (near.length ? near : up.slice(0, 3));
    $('#remind', main).innerHTML = `<div class="remind"><h3>${near.length ? '🔔 Pengingat Publikasi' : 'Publikasi berikutnya'}</h3><div class="small" style="opacity:.85">${near.length ? `Ada ${near.length} hari penting dalam ${lead} hari ke depan. Siapkan konten IG &amp; TikTok + twibbon.` : 'Tidak ada hari penting dalam waktu dekat.'}</div>
      <div class="items">${show.map((x) => { const done = x.pub && x.pub.ig_done && x.pub.tiktok_done; return `<a class="it" href="#/publikasi/${x.id}/${x.tanggal.slice(0, 4)}"><span class="cd">${countdown(x.tanggal)} · ${tglPanjang(x.tanggal, false)}</span><b>${esc(x.nama)}</b><span class="small">${done ? '✅ Sudah diunggah' : x.pub && x.pub.desain && x.pub.desain !== '[]' ? '🎨 Desain siap, belum diunggah' : '⏳ Belum dibuat — klik untuk membuat'}</span></a>`; }).join('')}</div></div>`;
  }
}
function agendaLi(a) {
  const d = parseD(a.tanggal);
  return `<div class="li"><div class="datebox"><b>${d.getDate()}</b><span>${BULAN[d.getMonth()].slice(0, 3)}</span></div><div style="flex:1"><b>${esc(a.kegiatan)}</b><div class="small muted">${HARI[d.getDay()]}${a.waktu ? ' · ' + esc(a.waktu) : ''}${a.tempat ? ' · ' + esc(a.tempat) : ''}</div>${a.pj ? `<div class="small">PJ: ${esc(a.pj)}</div>` : ''}</div><span class="small muted">${countdown(a.tanggal)}</span></div>`;
}

// ================= AGENDA =================
const AG_KAT = ['Kegiatan Sekolah', 'Rapat', 'Upacara/Peringatan', 'Kunjungan/Tamu', 'Lomba/Prestasi', 'Publikasi', 'Lainnya'];
const AG_FIELDS = [
  { name: 'kegiatan', label: 'Nama kegiatan', required: true, full: true },
  { name: 'tanggal', label: 'Tanggal', type: 'date', required: true },
  { name: 'tanggal_selesai', label: 'Sampai tanggal (opsional)', type: 'date' },
  { name: 'waktu', label: 'Waktu', placeholder: '07.00 – selesai' },
  { name: 'tempat', label: 'Tempat' },
  { name: 'pj', label: 'Penanggung jawab' },
  { name: 'kategori', label: 'Kategori', type: 'select', options: AG_KAT },
  { name: 'status', label: 'Status', type: 'select', options: [['terjadwal', 'Terjadwal'], ['terlaksana', 'Terlaksana'], ['ditunda', 'Ditunda'], ['batal', 'Batal']] },
  { name: 'keterangan', label: 'Keterangan', type: 'textarea', rows: 3 },
];
let agCursor = null, agView = 'kalender';
async function pageAgenda(main) {
  if (!agCursor) { const n = new Date(); agCursor = new Date(n.getFullYear(), n.getMonth(), 1); }
  const y = agCursor.getFullYear(), mo = agCursor.getMonth();
  const first = iso(new Date(y, mo, 1)), last = iso(new Date(y, mo + 1, 0));
  const [list, hari] = await Promise.all([api(`agenda?from=${iso(new Date(y, mo, -6))}&to=${iso(new Date(y, mo + 1, 7))}`), api('hari-publik?tahun=' + y).catch(() => [])]);
  const monthList = list.filter((a) => a.tanggal >= first && a.tanggal <= last);
  main.innerHTML = `<div class="topbar"><div><h1>Agenda Humas</h1><p class="muted">Jadwal kegiatan sekolah dan hari penting nasional.</p></div>
    <div class="row">${state.user ? `<button class="btn primary" id="add">${icon('plus')} Tambah Agenda</button>` : ''}<button class="btn" id="pdf">${icon('pdf')} Unduh PDF</button></div></div>
    <div class="card"><div class="row" style="margin-bottom:14px"><button class="btn sm" id="prev">‹</button><h2 style="margin:0;min-width:180px;text-align:center">${BULAN[mo]} ${y}</h2><button class="btn sm" id="next">›</button><button class="btn sm" id="now">Bulan ini</button><span class="spacer"></span>
    <div class="tabs"><button data-v="kalender" class="${agView === 'kalender' ? 'on' : ''}">Kalender</button><button data-v="daftar" class="${agView === 'daftar' ? 'on' : ''}">Daftar</button></div></div><div id="body"></div></div>`;
  const body = $('#body', main);
  if (agView === 'kalender') {
    const start = new Date(y, mo, 1 - new Date(y, mo, 1).getDay());
    let html = '<div class="cal">' + HARI.map((d) => `<div class="dow">${d.slice(0, 3)}</div>`).join('');
    for (let i = 0; i < 42; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i); const s = iso(d);
      if (i >= 35 && d.getMonth() !== mo) break;
      const evs = list.filter((a) => s >= a.tanggal && s <= (a.tanggal_selesai || a.tanggal));
      const hp = hari.filter((x) => x.tanggal === s);
      html += `<div class="d ${d.getMonth() !== mo ? 'out' : ''} ${s === todayISO() ? 'today' : ''} ${d.getDay() === 0 ? 'sun' : ''}" data-d="${s}"><span class="n">${d.getDate()}</span>${hp.map((x) => `<span class="ev hp" title="${esc(x.nama)}">${esc(x.nama)}</span>`).join('')}${evs.map((a) => `<span class="ev" data-id="${a.id}" title="${esc(a.kegiatan)}">${esc(a.kegiatan)}</span>`).join('')}</div>`;
    }
    body.innerHTML = html + '</div><p class="small muted" style="margin-bottom:0"><span class="badge red">merah</span> hari penting nasional · <span class="badge">biru</span> agenda sekolah' + (state.user ? ' · klik tanggal untuk menambah agenda' : '') + '</p>';
    $$('.d', body).forEach((c) => c.addEventListener('click', (e) => {
      const ev = e.target.closest('.ev[data-id]');
      if (ev) return showAgenda(list.find((a) => a.id === +ev.dataset.id), main);
      if (state.user) editAgenda({ tanggal: c.dataset.d }, main);
    }));
  } else {
    body.innerHTML = monthList.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Kegiatan</th><th>Waktu & Tempat</th><th>PJ</th><th>Status</th>${state.user ? '<th></th>' : ''}</tr></thead><tbody>${monthList.map((a) => `<tr><td>${tglPanjang(a.tanggal)}${a.tanggal_selesai && a.tanggal_selesai !== a.tanggal ? '<br><span class="small muted">s.d. ' + tglPanjang(a.tanggal_selesai) + '</span>' : ''}</td><td><b>${esc(a.kegiatan)}</b><div class="small muted">${esc(a.kategori || '')}</div></td><td>${esc(a.waktu || '')}<div class="small muted">${esc(a.tempat || '')}</div></td><td>${esc(a.pj || '')}</td><td>${statusBadge(a.status)}</td>${state.user ? `<td class="right"><button class="btn sm" data-e="${a.id}">${icon('edit')}</button> <button class="btn sm danger" data-x="${a.id}">${icon('trash')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<div class="empty">Tidak ada agenda di bulan ini.</div>';
    $$('[data-e]', body).forEach((b) => (b.onclick = () => editAgenda(list.find((a) => a.id === +b.dataset.e), main)));
    $$('[data-x]', body).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus agenda ini?')) { await api('agenda/' + b.dataset.x, { method: 'DELETE' }); pageAgenda(main); } }));
  }
  $('#prev', main).onclick = () => { agCursor = new Date(y, mo - 1, 1); pageAgenda(main); };
  $('#next', main).onclick = () => { agCursor = new Date(y, mo + 1, 1); pageAgenda(main); };
  $('#now', main).onclick = () => { agCursor = null; pageAgenda(main); };
  $$('.tabs button', main).forEach((b) => (b.onclick = () => { agView = b.dataset.v; pageAgenda(main); }));
  $('#add', main)?.addEventListener('click', () => editAgenda({ tanggal: todayISO() }, main));
  $('#pdf', main).onclick = () => exportPdf(agendaReport(monthList, `${BULAN[mo]} ${y}`), `Agenda Humas ${BULAN[mo]} ${y}.pdf`, 'landscape');
}
function statusBadge(s) { return { terjadwal: '<span class="badge">Terjadwal</span>', terlaksana: '<span class="badge green">Terlaksana</span>', ditunda: '<span class="badge gold">Ditunda</span>', batal: '<span class="badge red">Batal</span>' }[s] || `<span class="badge gray">${esc(s || '-')}</span>`; }
function showAgenda(a, main) {
  const body = `<p><b>${tglPanjang(a.tanggal)}</b>${a.tanggal_selesai && a.tanggal_selesai !== a.tanggal ? ' s.d. ' + tglPanjang(a.tanggal_selesai) : ''}${a.waktu ? ' · ' + esc(a.waktu) : ''}</p>${a.tempat ? `<p>📍 ${esc(a.tempat)}</p>` : ''}${a.pj ? `<p>👤 PJ: ${esc(a.pj)}</p>` : ''}<p>${statusBadge(a.status)} <span class="badge gray">${esc(a.kategori || '')}</span></p>${a.keterangan ? `<p>${nl2br(a.keterangan)}</p>` : ''}`;
  const acts = state.user ? [{ label: 'Hapus', cls: 'danger', onClick: async () => { if (await confirmBox('Hapus agenda ini?')) { await api('agenda/' + a.id, { method: 'DELETE' }); pageAgenda(main); } } }, { label: 'Edit', cls: 'primary', onClick: () => { editAgenda(a, main); } }] : [];
  modal({ title: a.kegiatan, body, actions: acts });
}
function editAgenda(a, main) {
  formModal({ title: a.id ? 'Edit Agenda' : 'Tambah Agenda', fields: AG_FIELDS, values: a, onSubmit: async (d) => {
    if (a.id) await api('agenda/' + a.id, { method: 'PUT', body: d }); else await api('agenda', { method: 'POST', body: d });
    toast('Agenda disimpan'); pageAgenda(main);
  } });
}
function agendaReport(list, periode) {
  return `${kopHtml()}<h3 style="text-align:center;margin:14px 0 2px">AGENDA KEGIATAN HUMAS</h3><p style="text-align:center;margin:0 0 14px">Bulan ${esc(periode)}</p>
  <table class="rt"><thead><tr><th style="width:30px">No</th><th style="width:150px">Hari, Tanggal</th><th>Kegiatan</th><th style="width:110px">Waktu</th><th style="width:140px">Tempat</th><th style="width:130px">Penanggung Jawab</th><th style="width:80px">Status</th></tr></thead>
  <tbody>${list.length ? list.map((a, i) => `<tr><td class="c">${i + 1}</td><td>${tglPanjang(a.tanggal)}</td><td>${esc(a.kegiatan)}${a.keterangan ? `<br><i>${esc(a.keterangan)}</i>` : ''}</td><td>${esc(a.waktu || '')}</td><td>${esc(a.tempat || '')}</td><td>${esc(a.pj || '')}</td><td>${esc(a.status || '')}</td></tr>`).join('') : '<tr><td colspan="7" class="c">Tidak ada agenda</td></tr>'}</tbody></table>${ttdKepsek()}`;
}
export function ttdKepsek(kanan = true) {
  const s = state.settings;
  return `<table class="ttd"><tr><td style="width:55%"></td><td>${esc(s.kota || 'Purwoasri')}, ${tglPanjang(todayISO(), false)}<br>Kepala ${esc(s.nama_sekolah)}<div style="height:70px"></div><b><u>${esc(s.kepsek_nama)}</u></b><br>${esc(s.kepsek_pangkat || '')}<br>NIP. ${esc(s.kepsek_nip || '.......................')}</td></tr></table>`;
}

// ================= PROGRAM KERJA =================
const BIDANG = ['Publikasi & Dokumentasi', 'Hubungan Orang Tua & Komite', 'Kemitraan & Alumni', 'Penerimaan Murid Baru (SPMB)', 'Layanan Informasi & Pengaduan', 'Media Sosial & Website', 'Lainnya'];
const PK_FIELDS = () => [
  { name: 'program', label: 'Nama program / kegiatan', required: true, full: true },
  { name: 'bidang', label: 'Bidang', type: 'select', options: BIDANG },
  { name: 'tahun_ajaran', label: 'Tahun ajaran', default: state.settings.tahun_ajaran, required: true },
  { name: 'tujuan', label: 'Tujuan', type: 'textarea', rows: 2 },
  { name: 'sasaran', label: 'Sasaran' },
  { name: 'waktu', label: 'Waktu pelaksanaan', placeholder: 'Juli – Desember 2026' },
  { name: 'pj', label: 'Penanggung jawab' },
  { name: 'anggaran', label: 'Anggaran (Rp)', type: 'number', min: 0 },
  { name: 'indikator', label: 'Indikator keberhasilan', type: 'textarea', rows: 2 },
  { name: 'status', label: 'Status', type: 'select', options: [['rencana', 'Rencana'], ['berjalan', 'Berjalan'], ['selesai', 'Selesai'], ['tertunda', 'Tertunda']] },
  { name: 'progres', label: 'Capaian (%)', type: 'number', min: 0, max: 100 },
];
let pkTahun = null;
async function pageProker(main) {
  if (!pkTahun) pkTahun = state.settings.tahun_ajaran;
  const { items, tahun } = await api('proker?tahun=' + encodeURIComponent(pkTahun));
  const opts = [...new Set([pkTahun, state.settings.tahun_ajaran, ...tahun])].filter(Boolean).sort().reverse();
  const total = items.reduce((a, b) => a + (+b.anggaran || 0), 0);
  const groups = {}; items.forEach((p) => (groups[p.bidang || 'Lainnya'] ||= []).push(p));
  main.innerHTML = `<div class="topbar"><div><h1>Program Kerja Humas</h1><p class="muted">Rencana dan capaian program kerja Hubungan Masyarakat.</p></div>
    <div class="row"><select class="in" id="ta" style="width:auto">${opts.map((t) => `<option ${t === pkTahun ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>${state.user ? `<button class="btn primary" id="add">${icon('plus')} Tambah Program</button>` : ''}<button class="btn" id="pdf">${icon('pdf')} Unduh PDF</button></div></div>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card stat"><span class="muted small">Jumlah program</span><b>${items.length}</b></div>
      <div class="card stat"><span class="muted small">Selesai</span><b>${items.filter((p) => p.status === 'selesai').length}</b></div>
      <div class="card stat"><span class="muted small">Berjalan</span><b>${items.filter((p) => p.status === 'berjalan').length}</b></div>
      <div class="card stat"><span class="muted small">Total anggaran</span><b style="font-size:1.25rem">${rupiah(total)}</b></div></div>
    ${items.length ? Object.entries(groups).map(([bid, list]) => `<div class="card"><h2>${esc(bid)}</h2><div class="tblwrap"><table class="tbl"><thead><tr><th>Program</th><th>Sasaran</th><th>Waktu</th><th>PJ</th><th>Anggaran</th><th>Status</th><th style="width:120px">Capaian</th>${state.user ? '<th></th>' : ''}</tr></thead><tbody>
      ${list.map((p) => `<tr><td><b>${esc(p.program)}</b>${p.tujuan ? `<div class="small muted">${esc(p.tujuan)}</div>` : ''}${p.indikator ? `<div class="small">🎯 ${esc(p.indikator)}</div>` : ''}</td><td>${esc(p.sasaran || '')}</td><td>${esc(p.waktu || '')}</td><td>${esc(p.pj || '')}</td><td>${p.anggaran ? rupiah(p.anggaran) : '-'}</td><td>${pkBadge(p.status)}</td><td><div class="progress"><i style="width:${+p.progres || 0}%"></i></div><span class="small muted">${+p.progres || 0}%</span></td>${state.user ? `<td class="right" style="white-space:nowrap"><button class="btn sm" data-e="${p.id}">${icon('edit')}</button> <button class="btn sm danger" data-x="${p.id}">${icon('trash')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div></div>`).join('') : `<div class="card empty">Belum ada program kerja untuk tahun ajaran ${esc(pkTahun)}.${state.user ? '<br><br><button class="btn gold" id="contoh">Isi dengan contoh program kerja Humas</button>' : ''}</div>`}`;
  $('#ta', main).onchange = (e) => { pkTahun = e.target.value; pageProker(main); };
  $('#add', main)?.addEventListener('click', () => editProker({}, main));
  $$('[data-e]', main).forEach((b) => (b.onclick = () => editProker(items.find((p) => p.id === +b.dataset.e), main)));
  $$('[data-x]', main).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus program kerja ini?')) { await api('proker/' + b.dataset.x, { method: 'DELETE' }); pageProker(main); } }));
  $('#contoh', main)?.addEventListener('click', async () => { for (const c of CONTOH_PROKER) await api('proker', { method: 'POST', body: { ...c, tahun_ajaran: pkTahun, status: 'rencana', progres: 0 } }); toast('Contoh program kerja ditambahkan — silakan sesuaikan'); pageProker(main); });
  $('#pdf', main).onclick = () => exportPdf(prokerReport(items, pkTahun), `Program Kerja Humas ${pkTahun.replace('/', '-')}.pdf`, 'landscape');
}
function pkBadge(s) { return { rencana: '<span class="badge gray">Rencana</span>', berjalan: '<span class="badge">Berjalan</span>', selesai: '<span class="badge green">Selesai</span>', tertunda: '<span class="badge red">Tertunda</span>' }[s] || ''; }
function editProker(p, main) {
  formModal({ title: p.id ? 'Edit Program Kerja' : 'Tambah Program Kerja', fields: PK_FIELDS(), values: p, wide: true, onSubmit: async (d) => {
    if (p.id) await api('proker/' + p.id, { method: 'PUT', body: d }); else await api('proker', { method: 'POST', body: d });
    pkTahun = d.tahun_ajaran; toast('Program kerja disimpan'); pageProker(main);
  } });
}
function prokerReport(items, ta) {
  const s = state.settings;
  return `${kopHtml()}<h3 style="text-align:center;margin:14px 0 2px">PROGRAM KERJA HUBUNGAN MASYARAKAT</h3><p style="text-align:center;margin:0 0 14px">Tahun Ajaran ${esc(ta)}</p>
  <table class="rt"><thead><tr><th style="width:28px">No</th><th>Bidang</th><th>Program / Kegiatan</th><th>Tujuan</th><th>Sasaran</th><th>Waktu</th><th>PJ</th><th>Anggaran</th><th>Indikator</th></tr></thead><tbody>
  ${items.map((p, i) => `<tr><td class="c">${i + 1}</td><td>${esc(p.bidang || '')}</td><td>${esc(p.program)}</td><td>${esc(p.tujuan || '')}</td><td>${esc(p.sasaran || '')}</td><td>${esc(p.waktu || '')}</td><td>${esc(p.pj || '')}</td><td style="white-space:nowrap">${p.anggaran ? rupiah(p.anggaran) : '-'}</td><td>${esc(p.indikator || '')}</td></tr>`).join('')}</tbody></table>
  <table class="ttd"><tr><td style="width:50%">Mengetahui,<br>Kepala ${esc(s.nama_sekolah)}<div style="height:70px"></div><b><u>${esc(s.kepsek_nama)}</u></b><br>${esc(s.kepsek_pangkat || '')}<br>NIP. ${esc(s.kepsek_nip || '.......................')}</td><td>${esc(s.kota)}, ${tglPanjang(todayISO(), false)}<br>Wakasek/Koordinator Humas<div style="height:70px"></div><b><u>${esc(s.humas_nama || '..............................')}</u></b><br>NIP. ${esc(s.humas_nip || '.......................')}</td></tr></table>`;
}
const CONTOH_PROKER = [
  { bidang: 'Publikasi & Dokumentasi', program: 'Dokumentasi & publikasi kegiatan sekolah', tujuan: 'Menginformasikan kegiatan sekolah kepada masyarakat', sasaran: 'Warga sekolah & masyarakat', waktu: 'Sepanjang tahun', indikator: 'Setiap kegiatan terdokumentasi & terpublikasi maks. H+1' },
  { bidang: 'Media Sosial & Website', program: 'Konten peringatan hari besar nasional (IG & TikTok)', tujuan: 'Menumbuhkan nasionalisme & citra positif sekolah', sasaran: 'Pengikut media sosial', waktu: 'Sesuai kalender hari nasional', indikator: '100% hari nasional terpublikasi + twibbon' },
  { bidang: 'Hubungan Orang Tua & Komite', program: 'Rapat koordinasi komite & paguyuban wali murid', tujuan: 'Sinergi program sekolah dengan orang tua', sasaran: 'Komite & wali murid', waktu: 'Per semester', indikator: 'Notulen & daftar hadir lengkap' },
  { bidang: 'Penerimaan Murid Baru (SPMB)', program: 'Sosialisasi SPMB ke SMP/MTs sekitar', tujuan: 'Meningkatkan minat pendaftar', sasaran: 'Siswa kelas IX', waktu: 'Februari – Mei', indikator: 'Pendaftar memenuhi pagu' },
  { bidang: 'Kemitraan & Alumni', program: 'Pendataan & temu alumni', tujuan: 'Membangun jejaring alumni', sasaran: 'Alumni', waktu: 'Semester genap', indikator: 'Database alumni terbarui' },
  { bidang: 'Layanan Informasi & Pengaduan', program: 'Layanan informasi publik & pengaduan', tujuan: 'Keterbukaan informasi', sasaran: 'Masyarakat', waktu: 'Sepanjang tahun', indikator: 'Semua pengaduan ditindaklanjuti' },
];

boot();
