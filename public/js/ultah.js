// ===== Menu Ucapan Ulang Tahun Guru & Tendik =====
import { state, api, $, $$, h, esc, icon, toast, fail, todayISO, tglPanjang, parseD, iso, BULAN, HARI, formModal, confirmBox, modal, fileUrl, pickFile, uploadFile, compressImage, downloadBlob, copyText, loadImg } from './core.js';
import { FORMATS, THEMES, renderUltah, getImages } from './designer.js';

// ---------- util data guru ----------
const GELAR_DEPAN = { 'DRS.': 'Drs.', 'DRA.': 'Dra.', 'DR.': 'Dr.', 'H.': 'H.', 'HJ.': 'Hj.', 'IR.': 'Ir.', 'M.': 'M.', 'MOH.': 'Moh.', 'MUH.': 'Muh.', 'MOCH.': 'Moch.' };
export function namaTampil(n) {
  const s = String(n || '').trim(); const i = s.indexOf(',');
  const base = i >= 0 ? s.slice(0, i) : s; const gelar = i >= 0 ? s.slice(i) : '';
  const nb = base.split(/\s+/).filter(Boolean).map((w) => GELAR_DEPAN[w.toUpperCase()] || w.toLowerCase().replace(/(^|[-'’])([a-z])/g, (m, a, b) => a + b.toUpperCase()).replace(/^([A-Z][a-z]*)'([A-Z])/, (m, a, b) => a + "'" + b.toLowerCase())).join(' ');
  return nb + gelar;
}
export function dariNip(nip) {
  const d = String(nip || '').replace(/\D/g, '');
  const out = {};
  if (d.length >= 8) { const y = +d.slice(0, 4), mo = +d.slice(4, 6), da = +d.slice(6, 8); const dt = new Date(y, mo - 1, da); if (y > 1940 && y < 2015 && dt.getMonth() === mo - 1) out.tgl_lahir = iso(dt); }
  if (d.length === 18) out.jk = d[14] === '1' ? 'L' : d[14] === '2' ? 'P' : '';
  return out;
}
const sapaan = (g) => (g.jk === 'L' ? 'Bapak' : g.jk === 'P' ? 'Ibu' : 'Bapak/Ibu');
function ultahTahun(g, tahun) { if (!g.tgl_lahir) return null; const [, m, d] = g.tgl_lahir.split('-').map(Number); const dt = new Date(tahun, m - 1, d); if (dt.getMonth() !== m - 1) dt.setDate(0); return iso(dt); }
function nextUltah(g) { const t = todayISO(); const y = +t.slice(0, 4); const a = ultahTahun(g, y); if (!a) return null; return a >= t ? a : ultahTahun(g, y + 1); }
const umurPada = (g, tahun) => (g.tgl_lahir ? tahun - +g.tgl_lahir.slice(0, 4) : null);
const selisih = (s) => Math.round((parseD(s) - parseD(todayISO())) / 86400000);
const cd = (n) => (n === 0 ? 'Hari ini 🎉' : n === 1 ? 'Besok' : n < 0 ? Math.abs(n) + ' hari lalu' : 'H-' + n);

// ---------- template ucapan ----------
export const GAYA = { umum: 'Umum', islami: 'Islami', kristiani: 'Kristiani', santai: 'Hangat/Santai', formal: 'Formal' };
const TPL = {
  umum: [
    ['Semoga sehat selalu, bahagia, dan makin sukses dalam mengabdi.', 'Selamat ulang tahun, {S} {N}. Semoga senantiasa diberikan kesehatan, kebahagiaan, dan kelancaran dalam setiap langkah. Terima kasih atas dedikasi dan pengabdian {S} dalam mendidik putra-putri {SEK}. Semoga semakin sukses dan terus menjadi inspirasi bagi kami semua.'],
    ['Semoga hari-hari ke depan penuh kebahagiaan, kesehatan, dan prestasi.', 'Selamat bertambah usia, {S} {N}! Semoga di usia yang baru ini {S} semakin bijaksana, sehat walafiat, dan selalu dilimpahi kebahagiaan bersama keluarga tercinta. Semangat terus dalam mencerdaskan generasi penerus bangsa.'],
    ['Terima kasih telah menjadi pelita bagi murid-murid kami. Selamat ulang tahun!', 'Hari ini kami mengucapkan selamat ulang tahun kepada {S} {N}. Terima kasih telah menjadi pelita yang tak lelah menerangi jalan murid-murid {SEK}. Semoga segala cita-cita dan harapan {S} terwujud, dan setiap langkah senantiasa dimudahkan.'],
  ],
  islami: [
    ['Barakallah fii umrik. Semoga panjang umur, sehat, dan penuh keberkahan.', "Barakallah fii umrik, {S} {N}. Semoga Allah SWT senantiasa melimpahkan kesehatan, umur yang berkah, rezeki yang luas, serta kebahagiaan dunia dan akhirat. Semoga setiap ilmu yang {S} ajarkan menjadi amal jariyah yang terus mengalir pahalanya. Aamiin ya Rabbal 'alamin."],
    ['Semoga Allah memberkahi umur, ilmu, dan setiap langkah pengabdian.', 'Selamat milad, {S} {N}. Semoga di usia yang baru ini Allah SWT menambahkan keberkahan pada umur, ilmu, dan keluarga {S}. Semoga senantiasa istiqamah dalam mendidik dan menjadi teladan bagi kami semua. Aamiin.'],
    ["Semoga sehat wal 'afiat dan selalu dalam lindungan Allah SWT.", "Barakallah fii umrik, {S} {N}. Semoga senantiasa dalam lindungan Allah SWT, diberi kesehatan wal 'afiat, serta dimudahkan dalam setiap urusan. Terima kasih atas keikhlasan {S} membimbing putra-putri {SEK}."],
  ],
  kristiani: [
    ['Tuhan Yesus memberkati senantiasa. Selamat ulang tahun!', 'Selamat ulang tahun, {S} {N}. Kiranya kasih dan anugerah Tuhan senantiasa menyertai {S} dan keluarga, memberikan kesehatan, sukacita, dan damai sejahtera. Terima kasih atas pengabdian {S} bagi {SEK}. Tuhan Yesus memberkati.'],
    ['Kiranya kasih Tuhan menyertai setiap langkah di usia yang baru.', 'Selamat bertambah usia, {S} {N}. Kiranya Tuhan memperbarui kekuatan {S} setiap hari, memberkati keluarga, dan menjadikan setiap karya {S} berbuah bagi banyak orang. Selamat ulang tahun!'],
  ],
  santai: [
    ['Happy birthday! Tetap semangat, sehat, dan penuh senyum.', 'Happy birthday, {S} {N}! 🎉 Semoga makin sehat, makin bahagia, dan makin semangat menginspirasi murid-murid. Terima kasih sudah menjadi bagian luar biasa dari keluarga besar {SEK}. Wish you all the best!'],
    ['Semoga tahun ini jadi tahun terbaik. Selamat ulang tahun!', 'Selamat ulang tahun, {S} {N}! 🎂 Semoga tahun ini menjadi tahun terbaik, penuh tawa, kesehatan, dan kabar baik. Tetap jadi sosok yang hangat dan inspiratif bagi kami semua.'],
  ],
  formal: [
    ['Semoga senantiasa sehat dan sukses dalam pengabdian di dunia pendidikan.', 'Atas nama Keluarga Besar {SEK}, kami mengucapkan selamat ulang tahun kepada {S} {N}. Semoga senantiasa diberikan kesehatan, kekuatan, dan kesuksesan dalam melaksanakan tugas serta pengabdian di dunia pendidikan.'],
    ['Semoga kesehatan dan keberhasilan senantiasa menyertai.', 'Keluarga Besar {SEK} menyampaikan selamat ulang tahun kepada {S} {N}. Semoga di usia yang baru ini senantiasa diberikan kesehatan, kebahagiaan, dan keberhasilan dalam setiap tugas yang diemban.'],
  ],
};
export function buatUcapan(g, gaya = 'umum', idx = 0) {
  const list = TPL[gaya] || TPL.umum; const [pendek, panjang] = list[((idx % list.length) + list.length) % list.length];
  const f = (t) => t.replaceAll('{S}', sapaan(g)).replaceAll('{N}', namaTampil(g.nama)).replaceAll('{SEK}', state.settings.nama_sekolah).replace(/\.\.(?!\.)/g, '.');
  return { pendek: f(pendek), panjang: f(panjang), jumlah: list.length };
}
function captions(g, tahun, pesan, gaya, showAge) {
  const s = state.settings; const N = namaTampil(g.nama); const S = sapaan(g); const tgl = tglPanjang(ultahTahun(g, tahun)); const u = umurPada(g, tahun);
  const ig = `🎉 SELAMAT ULANG TAHUN 🎉\n\n${S} ${N}${g.jabatan ? '\n' + g.jabatan : ''}\n📅 ${tgl}${showAge && u ? ` · ulang tahun ke-${u}` : ''}\n\n${pesan}\n\nDari kami, Keluarga Besar ${s.nama_sekolah} 💙\n\n#SelamatUlangTahun #HappyBirthday #KeluargaBesar${(s.singkatan || 'Smanesa').replace(/\s/g, '')} ${s.hashtag_tetap || ''}`.trim();
  const salam = gaya === 'islami' ? "Assalamu'alaikum warahmatullahi wabarakatuh." : 'Selamat pagi.';
  const wa = `${salam}\n\n🎂 *Selamat Ulang Tahun* 🎂\n${S} *${N}*\n\n${pesan}\n\n_Keluarga Besar ${s.nama_sekolah}_`;
  return { ig, wa };
}

// ---------- impor Excel ----------
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat pembaca Excel')); document.head.appendChild(s); }); }
function tglDariSel(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return iso(v);
  if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 86400000)); return iso(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
  const s = String(v).trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/))) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const bi = BULAN.findIndex((b) => s.toLowerCase().includes(b.toLowerCase()));
  if (bi >= 0 && (m = s.match(/(\d{1,2})\D+(\d{4})/))) return `${m[2]}-${String(bi + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}
async function imporExcel(onDone) {
  const [file] = await pickFile('.xlsx,.xls,.csv'); if (!file) return;
  try {
    await loadScript('/vendor/xlsx.mini.min.js');
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: '' });
    const hi = rows.findIndex((r) => r.some((c) => /^nama/i.test(String(c).trim())));
    if (hi < 0) throw new Error('Kolom "NAMA" tidak ditemukan di baris judul Excel.');
    const H = rows[hi].map((c) => String(c).trim().toUpperCase());
    const col = (re) => H.findIndex((x) => re.test(x));
    const C = { nama: col(/^NAMA/), nip: col(/^NIP|NUPTK|NIK/), tgl: col(/TANGGAL LAHIR|TGL\.? ?LAHIR|TTL|LAHIR/), jk: col(/^(JK|L\/P|JENIS KELAMIN|GENDER)/), jab: col(/JABATAN|TUGAS|MAPEL|MATA PELAJARAN/), agama: col(/AGAMA/) };
    const kep = String(state.settings.kepsek_nama || '').split(',')[0].replace(/[^A-Z]/gi, '').toUpperCase();
    const data = rows.slice(hi + 1).filter((r) => String(r[C.nama] || '').trim()).map((r) => {
      const nip = C.nip >= 0 ? String(r[C.nip] ?? '').trim() : '';
      const fromNip = dariNip(nip);
      const jkRaw = C.jk >= 0 ? String(r[C.jk]).trim().toUpperCase() : '';
      const nama = String(r[C.nama]).trim();
      let jab = C.jab >= 0 ? String(r[C.jab]).trim() : '';
      if (!jab && kep && nama.split(',')[0].replace(/[^A-Z]/gi, '').toUpperCase() === kep) jab = 'Kepala ' + state.settings.nama_sekolah;
      return { nama, nip, tgl_lahir: (C.tgl >= 0 && tglDariSel(r[C.tgl])) || fromNip.tgl_lahir || '', jk: jkRaw.startsWith('L') ? 'L' : jkRaw.startsWith('P') ? 'P' : fromNip.jk || '', jabatan: jab, agama: C.agama >= 0 ? String(r[C.agama]).trim() : '' };
    });
    const tanpaTgl = data.filter((d) => !d.tgl_lahir).length;
    const body = h(`<div><p>Ditemukan <b>${data.length}</b> orang di <b>${esc(file.name)}</b>. ${C.tgl < 0 ? 'Tanggal lahir diambil dari <b>8 digit pertama NIP</b>, ' : ''}${C.jk < 0 ? 'sapaan Bapak/Ibu dari <b>digit ke-15 NIP</b>.' : ''}</p>
      ${tanpaTgl ? `<p class="badge red">${tanpaTgl} orang belum punya tanggal lahir — bisa dilengkapi manual setelah impor.</p>` : ''}
      <div class="tblwrap" style="max-height:45vh;overflow:auto"><table class="tbl"><thead><tr><th>Nama</th><th>NIP</th><th>Tgl lahir</th><th>Sapaan</th><th>Jabatan</th></tr></thead><tbody>${data.map((d) => `<tr><td>${esc(namaTampil(d.nama))}</td><td class="small">${esc(d.nip)}</td><td>${d.tgl_lahir ? tglPanjang(d.tgl_lahir, false) : '<span class="badge red">kosong</span>'}</td><td>${sapaan(d)}</td><td class="small">${esc(d.jabatan)}</td></tr>`).join('')}</tbody></table></div>
      <label class="row small" style="margin-top:12px;gap:6px"><input type="checkbox" id="ganti"> Hapus data lama dulu (ganti semua). Jika tidak dicentang, data dengan NIP sama akan diperbarui.</label></div>`);
    modal({ title: 'Impor Data Guru & Tendik', wide: true, body, actions: [{ label: 'Batal' }, { label: `Impor ${data.length} data`, cls: 'primary', onClick: async () => {
      const r = await api('guru/impor', { method: 'POST', body: { rows: data, ganti: $('#ganti', body).checked } });
      toast(`Impor selesai: ${r.baru} baru, ${r.ubah} diperbarui`); onDone();
    } }] });
  } catch (e) { fail(e); }
}

const GURU_FIELDS = [
  { name: 'nama', label: 'Nama lengkap & gelar', required: true, full: true },
  { name: 'nip', label: 'NIP', hint: 'Tanggal lahir & sapaan otomatis terisi dari NIP bila dikosongkan' },
  { name: 'tgl_lahir', label: 'Tanggal lahir', type: 'date' },
  { name: 'jk', label: 'Sapaan', type: 'select', options: [['L', 'Bapak'], ['P', 'Ibu'], ['', 'Bapak/Ibu']] },
  { name: 'jabatan', label: 'Jabatan / mapel', placeholder: 'Guru Matematika' },
  { name: 'agama', label: 'Agama (untuk gaya ucapan)', type: 'select', options: ['', 'Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Konghucu'] },
];
function editGuru(g, done) {
  formModal({ title: g.id ? 'Edit Data' : 'Tambah Guru/Tendik', fields: GURU_FIELDS, values: g, onSubmit: async (d) => {
    const n = dariNip(d.nip); if (!d.tgl_lahir && n.tgl_lahir) d.tgl_lahir = n.tgl_lahir; if (!d.jk && n.jk) d.jk = n.jk;
    if (g.id) await api('guru/' + g.id, { method: 'PUT', body: d }); else await api('guru', { method: 'POST', body: d });
    toast('Tersimpan'); done();
  } });
}

// ================= Halaman daftar =================
let cari = '';
export async function pageUltah(main) {
  const tahun = new Date().getFullYear();
  const list = await api('guru?tahun=' + tahun);
  const t = todayISO();
  const withNext = list.filter((g) => g.aktif !== 0).map((g) => ({ ...g, next: nextUltah(g), ini: ultahTahun(g, tahun) })).filter((g) => g.next);
  const hariIni = withNext.filter((g) => g.next === t);
  const segera = withNext.filter((g) => g.next > t && selisih(g.next) <= 30).sort((a, b) => a.next.localeCompare(b.next));
  const bulanIni = withNext.filter((g) => g.ini && +g.ini.slice(5, 7) === new Date().getMonth() + 1);
  const sudah = list.filter((g) => g.ig_done || g.wa_done).length;
  const q = cari.toLowerCase();
  const shown = list.filter((g) => !q || g.nama.toLowerCase().includes(q) || String(g.nip || '').includes(q));
  const byMonth = {}; shown.forEach((g) => { const m = g.tgl_lahir ? +g.tgl_lahir.slice(5, 7) : 0; (byMonth[m] ||= []).push(g); });
  const item = (g) => { const ini = ultahTahun(g, tahun); const n = ini ? selisih(ini) : null; const d = ini ? parseD(ini) : null;
    return `<a class="hp ${n != null && n < 0 ? 'past' : ''}" href="#/ultah/${g.id}/${tahun}"><div class="datebox ${n === 0 ? 'red' : n != null && n > 0 && n <= 7 ? 'gold' : ''}">${d ? `<b>${d.getDate()}</b><span>${BULAN[d.getMonth()].slice(0, 3)}</span>` : '<b>?</b><span>tgl</span>'}</div><div style="min-width:0"><b>${esc(namaTampil(g.nama))}</b><div class="small muted">${n == null ? 'Tanggal lahir belum diisi' : cd(n) + ' · ke-' + umurPada(g, tahun)}</div><div class="st">${g.ig_done ? '<span class="badge green">IG ✓</span>' : ''}${g.wa_done ? '<span class="badge green">WA ✓</span>' : ''}${g.desain && g.desain !== '[]' ? '<span class="badge gold">Desain</span>' : ''}</div></div></a>`; };
  main.innerHTML = `<div class="topbar"><div><h1>Ucapan Ulang Tahun</h1><p class="muted">Pengingat & ucapan ulang tahun guru dan tenaga kependidikan ${esc(state.settings.nama_sekolah)}.</p></div>
    <div class="row"><button class="btn" id="imp">${icon('up')} Impor Excel</button><button class="btn primary" id="add">${icon('plus')} Tambah</button></div></div>
    ${list.length ? `<div class="remind"><h3>${hariIni.length ? `🎂 Hari ini ${hariIni.length} orang berulang tahun!` : '🎈 Ulang tahun terdekat'}</h3><div class="small" style="opacity:.85">${hariIni.length ? 'Klik untuk membuat ucapan, desain, dan caption.' : 'Tidak ada yang berulang tahun hari ini.'}</div>
      <div class="items">${(hariIni.length ? hariIni : segera.slice(0, 4)).map((g) => `<a class="it" href="#/ultah/${g.id}/${g.next.slice(0, 4)}"><span class="cd">${cd(selisih(g.next))} · ${tglPanjang(g.next, false)}</span><b>${esc(namaTampil(g.nama))}</b><span class="small">Ulang tahun ke-${umurPada(g, +g.next.slice(0, 4))}</span></a>`).join('') || '<span class="small">—</span>'}</div></div>
    <div class="grid g4" style="margin:16px 0">
      <div class="card stat"><span class="muted small">Guru & tendik</span><b>${list.length}</b></div>
      <div class="card stat"><span class="muted small">Ulang tahun bulan ${BULAN[new Date().getMonth()]}</span><b>${bulanIni.length}</b></div>
      <div class="card stat"><span class="muted small">30 hari ke depan</span><b>${segera.length + hariIni.length}</b></div>
      <div class="card stat"><span class="muted small">Sudah diucapkan ${tahun}</span><b>${sudah}</b></div></div>
    <div class="row" style="margin-bottom:6px"><input class="in" id="cari" placeholder="Cari nama atau NIP…" value="${esc(cari)}" style="max-width:320px"><span class="spacer"></span><button class="btn sm" id="kelola">${icon('list')} Kelola data</button></div>
    ${Object.keys(byMonth).sort((a, b) => a - b).map((m) => `<h3 style="margin:18px 0 8px">${+m ? BULAN[m - 1] : 'Tanggal lahir belum diisi'} <span class="badge gray">${byMonth[m].length}</span></h3><div class="hp-grid">${byMonth[m].map(item).join('')}</div>`).join('')}`
    : `<div class="card empty"><h2>Belum ada data guru</h2><p>Impor file Excel daftar guru (kolom <b>NAMA</b> dan <b>NIP</b>; boleh juga TANGGAL LAHIR, JABATAN, JK, AGAMA).<br>Tanggal lahir & sapaan Bapak/Ibu otomatis dibaca dari NIP.</p><button class="btn primary" id="imp2">${icon('up')} Impor Excel sekarang</button></div>`}`;
  const reload = () => pageUltah(main);
  $('#imp', main).onclick = () => imporExcel(reload);
  $('#imp2', main)?.addEventListener('click', () => imporExcel(reload));
  $('#add', main).onclick = () => editGuru({}, reload);
  $('#cari', main)?.addEventListener('input', (e) => { cari = e.target.value; clearTimeout(window.__c); window.__c = setTimeout(async () => { await reload(); const i = $('#cari', main); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 350); });
  $('#kelola', main)?.addEventListener('click', () => kelola(list, reload));
}
function kelola(list, reload) {
  const body = h(`<div class="tblwrap" style="max-height:62vh;overflow:auto"><table class="tbl"><thead><tr><th>Nama</th><th>NIP</th><th>Tgl lahir</th><th>Sapaan</th><th>Jabatan</th><th></th></tr></thead><tbody>${list.map((g) => `<tr><td>${esc(namaTampil(g.nama))}</td><td class="small">${esc(g.nip || '')}</td><td style="white-space:nowrap">${g.tgl_lahir ? tglPanjang(g.tgl_lahir, false) : '<span class="badge red">kosong</span>'}</td><td>${sapaan(g)}</td><td class="small">${esc(g.jabatan || '')}</td><td class="right" style="white-space:nowrap"><button class="btn sm" data-e="${g.id}">${icon('edit')}</button> <button class="btn sm danger" data-x="${g.id}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>`);
  const m = modal({ title: `Data Guru & Tendik (${list.length})`, wide: true, body });
  $$('[data-e]', body).forEach((b) => (b.onclick = () => { m.close(); editGuru(list.find((g) => g.id === +b.dataset.e), reload); }));
  $$('[data-x]', body).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus data ini?')) { await api('guru/' + b.dataset.x, { method: 'DELETE' }); b.closest('tr').remove(); reload(); } }));
}

// ================= Studio ucapan =================
export async function pageUltahDetail(main, gid, tahun) {
  const { guru: g, uc: u0 } = await api(`ucapan/${gid}/${tahun}`);
  const uc = u0 || {};
  let desain = []; try { desain = JSON.parse(uc.desain || '[]'); } catch {}
  const tgl = ultahTahun(g, tahun); const umur = umurPada(g, tahun); const N = namaTampil(g.nama);
  const defGaya = uc.gaya || (/islam/i.test(g.agama || '') ? 'islami' : /kristen|katolik/i.test(g.agama || '') ? 'kristiani' : 'umum');
  const st = { gaya: defGaya, idx: 0, format: 'feed', theme: 'navy', showAge: false, foto: null };
  let uc1 = buatUcapan(g, st.gaya, 0);
  st.pendek = uc1.pendek; st.panjang = uc.pesan || uc1.panjang;
  const imgs = await getImages(state.settings);
  if (g.foto_file) st.foto = await loadImg(fileUrl(g.foto_file)).catch(() => null);
  const cap0 = captions(g, tahun, st.panjang, st.gaya, false);
  const n = tgl ? selisih(tgl) : null;

  main.innerHTML = `<div class="topbar"><div><a href="#/ultah" class="small">← Semua ulang tahun</a><h1 style="margin-top:4px">${esc(N)}</h1><p class="muted">${tgl ? `${tglPanjang(tgl)} · <b>${cd(n)}</b> · ulang tahun ke-${umur}` : 'Tanggal lahir belum diisi'} ${g.jabatan ? '· ' + esc(g.jabatan) : ''}</p></div>
    <div class="row"><button class="btn" id="edg">${icon('edit')} Edit data</button><a class="btn" href="https://www.instagram.com/" target="_blank">Buka Instagram</a></div></div>
  ${!tgl ? '<div class="card empty">Lengkapi tanggal lahir terlebih dahulu melalui tombol <b>Edit data</b>.</div>' : `
  <div class="card"><div class="sec-title"><span class="num">1</span><h2 style="margin:0">Ucapan & Desain Kartu</h2></div>
    <div class="studio"><div class="grid" style="gap:14px">
      <div><b class="small">Gaya ucapan</b><div class="tabs" id="gaya" style="margin-top:6px;flex-wrap:wrap;width:auto">${Object.entries(GAYA).map(([k, l]) => `<button data-g="${k}" class="${k === st.gaya ? 'on' : ''}">${l}</button>`).join('')}</div>
        <button class="btn sm" id="lain" style="margin-top:8px">↻ Buatkan ucapan lain</button></div>
      <label class="f">Ucapan singkat (tampil di desain)<textarea class="in" id="pendek" rows="2">${esc(st.pendek)}</textarea></label>
      <label class="f">Ucapan lengkap (untuk caption & WhatsApp)<textarea class="in" id="panjang" rows="6">${esc(st.panjang)}</textarea></label>
      <div><b class="small">Format</b><div class="tabs" id="fmt" style="margin-top:6px;flex-wrap:wrap;width:auto">${['feed', 'story', 'square'].map((k) => `<button data-f="${k}" class="${k === st.format ? 'on' : ''}">${FORMATS[k].label}</button>`).join('')}</div></div>
      <div><b class="small">Gaya warna</b><div class="tpl-pick" style="margin-top:6px">${Object.entries(THEMES).map(([k, t]) => `<button data-t="${k}" title="${t.name}" class="${k === st.theme ? 'on' : ''}" style="background:linear-gradient(135deg,${t.bg[0]},${t.bg[1]})"></button>`).join('')}</div></div>
      <div><b class="small">Foto ${sapaan(g).toLowerCase()} (tersimpan untuk tahun berikutnya)</b><div class="row" style="margin-top:6px"><button class="btn sm" id="foto">${icon('img')} ${g.foto_file ? 'Ganti foto' : 'Unggah foto'}</button>${g.foto_file ? '<button class="btn sm" id="nofoto">Hapus foto</button>' : ''}</div><span class="hint">Tanpa foto, desain memakai inisial nama.</span></div>
      <label class="row small" style="gap:6px"><input type="checkbox" id="age"> Tampilkan usia (ke-${umur}) di desain & caption</label>
      <div class="grid" style="gap:8px">
        <button class="btn primary" id="dl" style="justify-content:center">${icon('dl')} Unduh PNG</button>
        <button class="btn" id="dlall" style="justify-content:center">${icon('dl')} Unduh Feed + Story</button>
        <button class="btn gold" id="share" style="justify-content:center">📲 Bagikan ke IG/WhatsApp (HP)</button>
        <button class="btn" id="save" style="justify-content:center">${icon('up')} Simpan ke galeri</button>
      </div>
    </div><div class="preview-wrap"><canvas id="cv"></canvas></div></div></div>

  <div class="card"><div class="sec-title"><span class="num">2</span><h2 style="margin:0">Caption & Pesan</h2><span class="spacer"></span><button class="btn sm" id="regen">↻ Buat ulang dari ucapan</button></div>
    <div class="grid g2">
      <div><div class="row" style="margin-bottom:6px"><b>Caption Instagram</b><span class="spacer"></span><button class="btn sm" data-copy="ig">${icon('copy')} Salin</button></div><textarea class="in" id="cap_ig" rows="13" style="font-size:.85rem">${esc(uc.caption_ig || cap0.ig)}</textarea></div>
      <div><div class="row" style="margin-bottom:6px"><b>Pesan WhatsApp</b><span class="spacer"></span><button class="btn sm" data-copy="wa">${icon('copy')} Salin</button><button class="btn sm gold" id="wa">Kirim via WhatsApp</button></div><textarea class="in" id="cap_wa" rows="13" style="font-size:.85rem">${esc(uc.caption_wa || cap0.wa)}</textarea></div>
    </div></div>

  <div class="card"><div class="sec-title"><span class="num">3</span><h2 style="margin:0">Galeri Desain</h2><span class="spacer"></span><button class="btn sm primary" id="upd">${icon('up')} Unggah desain sendiri</button></div><div id="gal"></div></div>

  <div class="card"><div class="sec-title"><span class="num">4</span><h2 style="margin:0">Status</h2></div>
    <div class="row" style="gap:24px"><label class="row" style="gap:8px"><input type="checkbox" id="igd" ${uc.ig_done ? 'checked' : ''}> <b>Sudah diunggah ke Instagram</b></label><label class="row" style="gap:8px"><input type="checkbox" id="wad" ${uc.wa_done ? 'checked' : ''}> <b>Sudah dikirim via WhatsApp</b></label></div></div>`}`;

  const reloadPage = () => pageUltahDetail(main, gid, tahun);
  $('#edg', main).onclick = () => editGuru(g, reloadPage);
  if (!tgl) return;
  const save = async (d) => { try { await api(`ucapan/${gid}/${tahun}`, { method: 'PUT', body: d }); } catch (e) { fail(e); } };
  if (!u0) save({ gaya: st.gaya, pesan: st.panjang, caption_ig: cap0.ig, caption_wa: cap0.wa });

  const cv = $('#cv', main);
  const d = parseD(tgl);
  const opts = (format = st.format) => ({ nama: N, sapaan: sapaan(g), sub: g.jabatan || state.settings.nama_sekolah, tglLabel: `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${tahun}`, umur, showAge: st.showAge, pesan: st.pendek, theme: st.theme, format, settings: state.settings, logo: imgs.logo, foto: st.foto });
  const draw = () => renderUltah(cv, opts());
  await draw();
  const fname = (f) => `Ulang Tahun ${N.split(',')[0]} ${tahun} - ${FORMATS[f].label.replace(/[/:]/g, '-')}.png`;
  const blobOf = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
  const renderTo = async (f) => { const c = document.createElement('canvas'); await renderUltah(c, opts(f)); return c; };

  const setUcapan = () => { uc1 = buatUcapan(g, st.gaya, st.idx); st.pendek = uc1.pendek; st.panjang = uc1.panjang; $('#pendek', main).value = st.pendek; $('#panjang', main).value = st.panjang; draw(); regen(); save({ gaya: st.gaya, pesan: st.panjang }); };
  $$('#gaya button', main).forEach((b) => (b.onclick = () => { st.gaya = b.dataset.g; st.idx = 0; $$('#gaya button', main).forEach((x) => x.classList.toggle('on', x === b)); setUcapan(); }));
  $('#lain', main).onclick = () => { st.idx++; setUcapan(); };
  let tp; $('#pendek', main).oninput = (e) => { st.pendek = e.target.value; draw(); };
  $('#panjang', main).oninput = (e) => { st.panjang = e.target.value; clearTimeout(tp); tp = setTimeout(() => save({ pesan: st.panjang }), 900); };
  $$('#fmt button', main).forEach((b) => (b.onclick = () => { st.format = b.dataset.f; $$('#fmt button', main).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $$('.tpl-pick button', main).forEach((b) => (b.onclick = () => { st.theme = b.dataset.t; $$('.tpl-pick button', main).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $('#age', main).onchange = (e) => { st.showAge = e.target.checked; draw(); };
  $('#foto', main).onclick = async () => { const [f] = await pickFile('image/*'); if (!f) return; try { const id = await uploadFile(await compressImage(f, 900, 0.88)); await api('guru/' + gid, { method: 'PUT', body: { foto_file: id } }); toast('Foto disimpan'); reloadPage(); } catch (e) { fail(e); } };
  $('#nofoto', main)?.addEventListener('click', async () => { await api('guru/' + gid, { method: 'PUT', body: { foto_file: '' } }); reloadPage(); });
  $('#dl', main).onclick = async () => downloadBlob(await blobOf(cv), fname(st.format));
  $('#dlall', main).onclick = async () => { for (const f of ['feed', 'story']) { downloadBlob(await blobOf(await renderTo(f)), fname(f)); await new Promise((r) => setTimeout(r, 600)); } };
  $('#share', main).onclick = async () => {
    const files = [new File([await blobOf(await renderTo('feed'))], fname('feed'), { type: 'image/png' })];
    const text = $('#cap_wa', main).value;
    if (navigator.canShare && navigator.canShare({ files })) { await copyText($('#cap_ig', main).value); try { await navigator.share({ files, text }); } catch {} }
    else toast('Bagikan langsung hanya tersedia di HP. Di komputer, unduh PNG lalu unggah manual.', true);
  };
  $('#save', main).onclick = async (e) => { const b = e.currentTarget; b.disabled = true; try { const id = await uploadFile(new File([await blobOf(cv)], fname(st.format), { type: 'image/png' })); desain.push({ id, label: FORMATS[st.format].label + ' · ' + THEMES[st.theme].name }); await save({ desain }); renderGal(); toast('Disimpan ke galeri'); } catch (er) { fail(er); } b.disabled = false; };

  // caption
  function regen() { const c = captions(g, tahun, st.panjang, st.gaya, st.showAge); $('#cap_ig', main).value = c.ig; $('#cap_wa', main).value = c.wa; save({ caption_ig: c.ig, caption_wa: c.wa }); }
  $('#regen', main).onclick = () => { regen(); toast('Caption dibuat ulang'); };
  $$('[data-copy]', main).forEach((b) => (b.onclick = () => copyText($('#cap_' + b.dataset.copy, main).value)));
  [['ig', 'caption_ig'], ['wa', 'caption_wa']].forEach(([k, f]) => { let t2; $('#cap_' + k, main).oninput = (e) => { clearTimeout(t2); t2 = setTimeout(() => save({ [f]: e.target.value }), 900); }; });
  $('#wa', main).onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent($('#cap_wa', main).value), '_blank');

  function renderGal() {
    $('#gal', main).innerHTML = desain.length ? `<div class="thumbs">${desain.map((x, i) => `<div class="t"><a href="${fileUrl(x.id)}" target="_blank"><img src="${fileUrl(x.id)}" loading="lazy"></a><div class="a"><span>${esc(x.label || '')}</span><span style="white-space:nowrap"><a class="btn sm" href="${fileUrl(x.id)}" download>${icon('dl')}</a> <button class="btn sm danger" data-gx="${i}">${icon('trash')}</button></span></div></div>`).join('')}</div>` : '<div class="empty">Belum ada desain tersimpan.</div>';
    $$('[data-gx]', main).forEach((b) => (b.onclick = async () => { if (!(await confirmBox('Hapus desain ini?'))) return; const [x] = desain.splice(+b.dataset.gx, 1); await save({ desain }); api('files/' + x.id, { method: 'DELETE' }).catch(() => {}); renderGal(); }));
  }
  renderGal();
  $('#upd', main).onclick = async () => { const files = await pickFile('image/*', true); if (!files.length) return; try { for (const f of files) { const id = await uploadFile(f); desain.push({ id, label: 'Unggahan: ' + f.name.slice(0, 24) }); } await save({ desain }); renderGal(); toast('Desain diunggah'); } catch (e) { fail(e); } };
  const st2 = () => save({ ig_done: $('#igd', main).checked ? 1 : 0, wa_done: $('#wad', main).checked ? 1 : 0 }).then(() => toast('Status disimpan'));
  $('#igd', main).onchange = st2; $('#wad', main).onchange = st2;
}

// untuk Beranda
export async function ultahMendatang(hari = 7) {
  const list = await api('guru?tahun=' + new Date().getFullYear());
  return list.map((g) => ({ ...g, next: nextUltah(g) })).filter((g) => g.next && selisih(g.next) <= hari).sort((a, b) => a.next.localeCompare(b.next)).map((g) => ({ ...g, label: namaTampil(g.nama), cd: cd(selisih(g.next)), umur: umurPada(g, +g.next.slice(0, 4)) }));
}
