// ===== Menu Prestasi Siswa =====
import { state, api, $, $$, h, esc, icon, toast, fail, todayISO, tglPanjang, BULAN, iso, formModal, confirmBox, modal, fileUrl, pickFile, uploadFile, compressImage, downloadBlob, copyText, loadImg } from './core.js';
import { FORMATS, THEMES, renderPrestasi, getImages } from './designer.js';
import { exportPdf, kopHtml } from './laporan.js';

export const TINGKAT = ['Sekolah', 'Kecamatan', 'Kabupaten', 'Kota Kediri', 'Eks Karesidenan Kediri', 'Provinsi', 'Nasional', 'Internasional'];
export const KATEGORI = ['Akademik', 'Keagamaan', 'Olahraga', 'Seni & Budaya', 'Pramuka & Organisasi', 'Lainnya'];
const BOBOT = { Internasional: 7, Nasional: 6, Provinsi: 5, 'Eks Karesidenan Kediri': 4, Kabupaten: 3, 'Kota Kediri': 3, Kecamatan: 2, Sekolah: 1 };

// ---------- normalisasi ----------
const rapikan = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s/(-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
export function normTingkat(t) {
  const s = rapikan(t).toUpperCase(); if (!s) return '';
  if (/INTERNASIONAL/.test(s)) return 'Internasional';
  if (/NASIONAL/.test(s)) return 'Nasional';
  if (/PROVINSI|JAWA TIMUR|JATIM/.test(s)) return 'Provinsi';
  if (/EKS|KARISDENAN|KARESIDENAN/.test(s)) return 'Eks Karesidenan Kediri';
  if (/KABUP|KABUPTEN|KAB\./.test(s)) return 'Kabupaten';
  if (/KECAMATAN/.test(s)) return 'Kecamatan';
  if (/SEKOLAH/.test(s)) return 'Sekolah';
  return titleCase(s);
}
export function tebakKategori(prestasi, nama = '') {
  const s = (prestasi + ' ' + nama).toUpperCase();
  if (/MTQ|\bPAI\b|AGAMA|BANJARI|FIKIH|AKIDAH|ISLAM|TILAWAH|HADRAH|KALIGRAFI|ADZAN/.test(s)) return 'Keagamaan';
  if (/O2SN|SILAT|KARATE|KEMPO|FUTSAL|SEPAK|VOLI|LARI|LOMPAT|KICK|JUJITSU|GERAK JALAN|TANDING|POPDA|PORKAB|PORPROV|DANDIM|ATLET|FIGHTING|\bLPI\b|BULU TANGKIS|BADMINTON|BASKET|TAEKWONDO|RANDORI|TANDOKU|RENANG|CATUR/.test(s)) return 'Olahraga';
  if (/TARI|FLS2N|FLS3N|SENI|KARAWITAN|TETEMBANGAN|MENYANYI|MUSIK|PERKUSI|PERTUNJUKAN|ORIGAMI|COVER|PPST|TEATER|PUISI|LUKIS|FILM|PADUAN SUARA/.test(s)) return 'Seni & Budaya';
  if (/PRAMUKA|EGRANG|KETAPEL|GUDEP|PIK-R|LIFESKILL|JAMBORE|PASKIBRA|PMR|OSIS/.test(s)) return 'Pramuka & Organisasi';
  if (/OSN|OLIMPIADE|OLYMPIAD|DEBAT|LAWATAN|SEJARAH|FISIKA|BIOLOGI|KIMIA|MATEMATIKA|KOMPETISI|ECONOMIC|FARMASI|\bMEA\b|PIDATO|KTI|ILMIAH|BAHASA|INFORMATIKA|ELEKTRONIK/.test(s)) return 'Akademik';
  return 'Lainnya';
}
const BLN = { januari: 1, februari: 2, pebruari: 2, maret: 3, april: 4, mei: 5, juni: 6, juli: 7, agustus: 8, september: 9, oktober: 10, nopember: 11, november: 11, desember: 12 };
export function parseTanggal(v) {
  if (v == null || v === '') return { tanggal: '', tgl: '' };
  if (v instanceof Date) { const d = new Date(v.getFullYear(), v.getMonth(), v.getDate() + (v.getHours() >= 12 ? 1 : 0)); return { tanggal: `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`, tgl: iso(d) }; }
  if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return parseTanggal(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); }
  const s = rapikan(v);
  if (!/\d/.test(s)) return { tanggal: '', tgl: '', catatan: s };
  let m;
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return parseTanggal(new Date(+m[1], +m[2] - 1, +m[3]));
  if ((m = s.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/))) return parseTanggal(new Date(+m[3], +m[2] - 1, +m[1]));
  if ((m = s.match(/(\d{1,2})\s*(?:[-–,]\s*\d{1,2}\s*)*\s+([A-Za-z]+)\s+(\d{4})/)) && BLN[m[2].toLowerCase()]) return { tanggal: s, tgl: `${m[3]}-${String(BLN[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}` };
  if ((m = s.match(/([A-Za-z]+)\s+(\d{4})/)) && BLN[m[1].toLowerCase()]) return { tanggal: titleCase(s), tgl: `${m[2]}-${String(BLN[m[1].toLowerCase()]).padStart(2, '0')}-01` };
  return { tanggal: s, tgl: '' };
}

// ---------- pembaca Excel format sekolah ----------
function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat pembaca Excel')); document.head.appendChild(s); }); }
const isKelas = (v) => /^(X|XI|XII|10|11|12)\s*[-.]?\s*\d{0,2}$/i.test(rapikan(v));

export function parseSheet(rows) {
  const out = []; let map = null, curYear = null, prev = null; const ttd = {};
  const cell = (r, k) => (map && map[k] >= 0 ? r[map[k]] : '');
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]; const filled = r.map((c, j) => [j, c]).filter(([, c]) => rapikan(c instanceof Date ? 'd' : c) !== '');
    if (!filled.length) continue;
    const up = r.map((c) => rapikan(c instanceof Date ? '' : c).toUpperCase());
    // baris judul kolom
    if (up.some((c) => /^NAMA/.test(c)) && up.some((c) => /PRESTASI|PERLOMBAAN|LOMBA/.test(c))) {
      const f = (re) => up.findIndex((c) => re.test(c));
      map = { no: f(/^NO\b|^NO\.$/), nama: f(/^NAMA/), prestasi: f(/PRESTASI|PERLOMBAAN|LOMBA/), tingkat: f(/^TING+KAT/), kelas: f(/KELAS/), tanggal: f(/^TANGGAL|^TGL/), tahun: f(/^TAHUN/), ket: f(/^KET/) };
      // kolom tanpa judul: kenali dari isinya (kelas / keterangan)
      const blanks = []; const width = Math.max(...rows.slice(i, i + 200).map((x) => x.length));
      for (let j = 0; j < width; j++) if (!up[j] && !Object.values(map).includes(j)) blanks.push(j);
      for (const j of blanks) {
        const vals = rows.slice(i + 1, i + 200).map((x) => rapikan(x[j] instanceof Date ? '' : x[j])).filter(Boolean);
        if (!vals.length) continue;
        if (map.kelas < 0 && vals.filter(isKelas).length >= vals.length * 0.6) map.kelas = j;
        else if (map.tahun < 0 && vals.every((v) => /^(19|20)\d{2}$/.test(v))) map.tahun = j;
        else if (map.ket < 0 && j > map.nama) map.ket = j;
      }
      continue;
    }
    // judul "… TAHUN 2025"
    if (filled.length === 1) {
      const t = rapikan(filled[0][1]);
      if (/NIP/i.test(t)) { ttd.nip = t.replace(/^NIP\.?\s*/i, ''); continue; }
      const y = t.match(/TAHUN\s+((19|20)\d{2})/i); if (y) { curYear = +y[1]; continue; }
      if (map && filled[0][0] !== map.nama && /,\s*(S|M|Dr)\.?/i.test(t)) { ttd.nama = t; continue; }
      if (!map) continue;
    }
    if (!map) continue;
    const thn = rapikan(cell(r, 'tahun')); if (/^(19|20)\d{2}$/.test(thn)) curYear = +thn;
    const nama = rapikan(cell(r, 'nama')); const pres = rapikan(cell(r, 'prestasi')); const no = rapikan(cell(r, 'no'));
    if (!pres && nama && !no && prev) { prev.anggota.push(nama.replace(/^\d+[.)]\s*/, '')); continue; }
    if (!pres) continue;
    const tg = parseTanggal(cell(r, 'tanggal'));
    const ketCol = rapikan(cell(r, 'ket'));
    const rec = {
      nama: (nama || (prev && prev.nama) || '').replace(/\s*:$/, ''), anggota: [],
      kelas: rapikan(cell(r, 'kelas')) || (!nama && prev ? prev.kelas : ''),
      prestasi: pres, tingkat: normTingkat(cell(r, 'tingkat')), tingkat_asli: rapikan(cell(r, 'tingkat')),
      tanggal: tg.tanggal, tgl: tg.tgl, tahun: curYear || (tg.tgl ? +tg.tgl.slice(0, 4) : null),
      keterangan: [ketCol, tg.catatan].filter(Boolean).join('; '),
    };
    rec.kategori = tebakKategori(rec.prestasi, rec.nama);
    out.push(rec); prev = rec;
  }
  return { rows: out.map((x) => ({ ...x, anggota: x.anggota.join('\n') })), ttd };
}

async function imporExcel(done) {
  const [file] = await pickFile('.xlsx,.xls'); if (!file) return;
  try {
    await loadScript('/vendor/xlsx.mini.min.js');
    const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
    const parsed = Object.fromEntries(wb.SheetNames.map((n) => [n, parseSheet(window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }))]));
    const best = wb.SheetNames.slice().sort((a, b) => parsed[b].rows.length - parsed[a].rows.length || (/BARU/i.test(b) ? 1 : 0) - (/BARU/i.test(a) ? 1 : 0))[0];
    const body = h(`<div><div class="row"><label class="f" style="flex:1">Pilih sheet<select class="in" id="sh">${wb.SheetNames.map((n) => `<option value="${esc(n)}" ${n === best ? 'selected' : ''}>${esc(n)} — ${parsed[n].rows.length} prestasi</option>`).join('')}</select></label></div><div id="pv" style="margin-top:12px"></div>
      <label class="row small" style="margin-top:12px;gap:6px"><input type="checkbox" id="ganti"> Hapus semua data prestasi lama dulu (ganti total). Jika tidak dicentang, data yang sama (nama + prestasi + tahun) dilewati.</label></div>`);
    const show = () => {
      const p = parsed[$('#sh', body).value];
      const years = {}; p.rows.forEach((r) => (years[r.tahun || '?'] = (years[r.tahun || '?'] || 0) + 1));
      $('#pv', body).innerHTML = `<p class="small" style="margin:0 0 8px"><b>${p.rows.length}</b> prestasi · ${p.rows.filter((r) => r.anggota).length} tim dengan daftar anggota · per tahun: ${Object.entries(years).map(([y, n]) => `${y}: ${n}`).join(', ')}${p.ttd.nama ? `<br>Penanda tangan terdeteksi: <b>${esc(p.ttd.nama)}</b> ${p.ttd.nip ? '(NIP ' + esc(p.ttd.nip) + ')' : ''}` : ''}</p>
      <div class="tblwrap" style="max-height:48vh;overflow:auto"><table class="tbl"><thead><tr><th>Tahun</th><th>Nama Siswa</th><th>Kelas</th><th>Prestasi</th><th>Tingkat</th><th>Tanggal</th><th>Keterangan</th></tr></thead><tbody>${p.rows.map((r) => `<tr><td>${r.tahun || '<span class="badge red">?</span>'}</td><td><b>${esc(r.nama)}</b>${r.anggota ? `<div class="small muted">${esc(r.anggota.split('\n').join(', '))}</div>` : ''}</td><td>${esc(r.kelas)}</td><td>${esc(r.prestasi)}<div><span class="badge gray">${esc(r.kategori)}</span></div></td><td>${esc(r.tingkat)}</td><td class="small">${esc(r.tanggal)}</td><td class="small">${esc(r.keterangan)}</td></tr>`).join('')}</tbody></table></div>`;
    };
    $('#sh', body).onchange = show; show();
    modal({ title: 'Impor Prestasi dari Excel', wide: true, body, actions: [{ label: 'Batal' }, { label: 'Impor', cls: 'primary', onClick: async () => {
      const p = parsed[$('#sh', body).value];
      const r = await api('prestasi/impor', { method: 'POST', body: { rows: p.rows.map(({ tingkat_asli, ...x }) => x), ganti: $('#ganti', body).checked, ttd: p.ttd } });
      if (p.ttd.nama && !state.settings.kesiswaan_nama) { state.settings.kesiswaan_nama = p.ttd.nama; state.settings.kesiswaan_nip = p.ttd.nip || ''; }
      toast(`Impor selesai: ${r.baru} ditambahkan${r.lewat ? `, ${r.lewat} sudah ada (dilewati)` : ''}`); done();
    } }] });
  } catch (e) { fail(e); }
}

const HEADER_XL = ['NO', 'NAMA SISWA', 'KELAS', 'PRESTASI', 'TINGKAT', 'TANGGAL', 'TAHUN', 'KETERANGAN', 'ANGGOTA TIM (pisahkan dengan ;)'];
async function unduhTemplate() {
  await loadScript('/vendor/xlsx.mini.min.js'); const X = window.XLSX;
  const aoa = [['DAFTAR PRESTASI SISWA'], [state.settings.nama_sekolah.toUpperCase()], [], HEADER_XL,
    [1, 'NAMA SISWA CONTOH', 'XI-3', 'JUARA 1 OLIMPIADE PAI SMA/SMK/MA SEDERAJAT', 'NASIONAL', '14-15 Maret 2026', 2026, '', ''],
    [2, 'TIM FUTSAL SMAN 1 PURWOASRI', '', 'JUARA 2 FUTSAL SENTANA CUP', 'KABUPATEN', 'Januari 2026', 2026, '', 'Siswa A; Siswa B; Siswa C']];
  const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [6, 34, 8, 50, 16, 20, 8, 22, 40].map((w) => ({ wch: w })); ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }];
  const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'PRESTASI'); X.writeFile(wb, 'Template Prestasi Siswa.xlsx');
}
async function eksporExcel(list, judul) {
  await loadScript('/vendor/xlsx.mini.min.js'); const X = window.XLSX; const s = state.settings;
  const aoa = [['DAFTAR PRESTASI SISWA'], [s.nama_sekolah.toUpperCase()], [judul], HEADER_XL];
  const byY = groupYear(urutLama(list)); let no = 0;
  for (const [y, xs] of byY) { no = 0; for (const r of xs) aoa.push([++no, r.nama, r.kelas || '', r.prestasi, (r.tingkat || '').toUpperCase(), r.tanggal || '', y, r.keterangan || '', (r.anggota || '').split('\n').filter(Boolean).join('; ')]); }
  aoa.push([], ['', '', '', '', `${s.kota}, ${tglPanjang(todayISO(), false)}`], ['', '', '', '', s.kesiswaan_jabatan || ''], [], [], ['', '', '', '', s.kesiswaan_nama || ''], ['', '', '', '', s.kesiswaan_nip ? 'NIP. ' + s.kesiswaan_nip : '']);
  const ws = X.utils.aoa_to_sheet(aoa); ws['!cols'] = [6, 34, 8, 50, 16, 20, 8, 22, 40].map((w) => ({ wch: w })); ws['!merges'] = [0, 1, 2].map((r) => ({ s: { r, c: 0 }, e: { r, c: 8 } }));
  const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, 'PRESTASI'); X.writeFile(wb, `Prestasi Siswa ${judul}.xlsx`.replace(/[–·]/g, '-').replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' '));
}
const urutLama = (list) => list.slice().sort((a, b) => (a.tahun || 0) - (b.tahun || 0) || String(a.tgl || '9').localeCompare(String(b.tgl || '9')) || a.id - b.id);
function groupYear(list) { const g = new Map(); list.forEach((r) => { const y = r.tahun || '-'; if (!g.has(y)) g.set(y, []); g.get(y).push(r); }); return [...g.entries()]; }
function pdfHtml(list, judul) {
  const s = state.settings;
  return `${kopHtml()}<h3 style="text-align:center;margin:14px 0 2px">DAFTAR PRESTASI SISWA</h3><p style="text-align:center;margin:0 0 12px">${esc(judul)}</p>
  <table class="rt"><thead><tr><th style="width:28px">No</th><th>Nama Siswa</th><th style="width:48px">Kelas</th><th>Prestasi</th><th style="width:90px">Tingkat</th><th style="width:105px">Tanggal</th></tr></thead><tbody>
  ${groupYear(urutLama(list)).map(([y, xs]) => `<tr><td colspan="6" style="background:#f0f0f0;font-weight:bold">TAHUN ${y}</td></tr>${xs.map((r, i) => `<tr><td class="c">${i + 1}</td><td>${esc(r.nama)}${r.anggota ? `<br><span style="font-size:9.5pt">${esc(r.anggota.split('\n').join(', '))}</span>` : ''}</td><td class="c">${esc(r.kelas || '')}</td><td>${esc(r.prestasi)}</td><td>${esc(r.tingkat || '')}</td><td>${esc(r.tanggal || '')}</td></tr>`).join('')}`).join('')}
  </tbody></table>
  <table class="ttd"><tr><td style="width:50%">Mengetahui,<br>Kepala ${esc(s.nama_sekolah)}<div style="height:70px"></div><b><u>${esc(s.kepsek_nama)}</u></b><br>${esc(s.kepsek_pangkat || '')}<br>NIP. ${esc(s.kepsek_nip || '.......................')}</td>
  <td>${esc(s.kota)}, ${tglPanjang(todayISO(), false)}<br>${esc(s.kesiswaan_jabatan || 'Waka Kesiswaan')}<div style="height:70px"></div><b><u>${esc(s.kesiswaan_nama || '..............................')}</u></b><br>NIP. ${esc(s.kesiswaan_nip || '.......................')}</td></tr></table>`;
}

const FIELDS = () => [
  { name: 'nama', label: 'Nama siswa / nama tim', required: true, full: true, placeholder: 'ALINIA WANDHITA MUTIARAWATI atau TIM FUTSAL SMAN 1 PURWOASRI' },
  { name: 'kelas', label: 'Kelas', placeholder: 'XI-3', datalist: ['X-1', 'X-2', 'X-3', 'X-4', 'X-5', 'X-6', 'X-7', 'X-8', 'X-9', 'X-10', 'XI-1', 'XI-2', 'XI-3', 'XI-4', 'XI-5', 'XI-6', 'XI-7', 'XI-8', 'XI-9', 'XI-10', 'XII-1', 'XII-2', 'XII-3', 'XII-4', 'XII-5', 'XII-6', 'XII-7', 'XII-8', 'XII-9', 'XII-10'] },
  { name: 'tingkat', label: 'Tingkat', datalist: TINGKAT, placeholder: 'Kabupaten', required: true },
  { name: 'prestasi', label: 'Prestasi (juara & nama lomba)', type: 'textarea', rows: 2, required: true, placeholder: 'JUARA 1 OLIMPIADE PAI SMA/SMK/MA SEDERAJAT' },
  { name: 'tanggal', label: 'Tanggal (sesuai piagam)', placeholder: '14-15 Maret 2026', hint: 'Boleh rentang tanggal atau hanya bulan' },
  { name: 'tahun', label: 'Tahun', type: 'number', min: 2000, max: 2100, default: new Date().getFullYear(), required: true },
  { name: 'kategori', label: 'Bidang', type: 'select', options: ['', ...KATEGORI], hint: 'Kosongkan agar ditebak otomatis' },
  { name: 'anggota', label: 'Anggota tim (satu nama per baris, khusus lomba beregu)', type: 'textarea', rows: 3 },
  { name: 'keterangan', label: 'Keterangan (internal, tidak tampil publik)', placeholder: 'Sudah kirim ke Cabdin / belum ada piagam asli', full: true },
];
function editPrestasi(r, done) {
  formModal({ title: r.id ? 'Edit Prestasi' : 'Tambah Prestasi', fields: FIELDS(), values: r, wide: true, onSubmit: async (d) => {
    d.tgl = parseTanggal(d.tanggal).tgl || ''; d.tingkat = normTingkat(d.tingkat) || d.tingkat; d.kategori = d.kategori || tebakKategori(d.prestasi, d.nama);
    if (!d.tahun && d.tgl) d.tahun = +d.tgl.slice(0, 4);
    if (r.id) await api('prestasi/' + r.id, { method: 'PUT', body: d }); else await api('prestasi', { method: 'POST', body: d });
    toast('Prestasi disimpan'); done();
  } });
}

// ================= Halaman daftar =================
const F = { q: '', tahun: '', tingkat: '', kategori: '' };
export async function pagePrestasi(main) {
  const all = await api('prestasi');
  const admin = !!state.user;
  const tahunList = [...new Set(all.map((r) => r.tahun).filter(Boolean))].sort((a, b) => b - a);
  const q = F.q.toLowerCase();
  const list = all.filter((r) => (!F.tahun || String(r.tahun) === F.tahun) && (!F.tingkat || r.tingkat === F.tingkat) && (!F.kategori || r.kategori === F.kategori) && (!q || `${r.nama} ${r.anggota || ''} ${r.prestasi} ${r.kelas || ''}`.toLowerCase().includes(q)));
  const per = (fn) => { const o = {}; all.forEach((r) => { const k = fn(r); o[k] = (o[k] || 0) + 1; }); return o; };
  const perTahun = per((r) => r.tahun || '-'); const perTingkat = per((r) => r.tingkat || '-');
  const thnIni = new Date().getFullYear();
  const maxY = Math.max(1, ...Object.values(perTahun));
  const judul = [F.tahun ? 'Tahun ' + F.tahun : tahunList.length ? `Tahun ${tahunList[tahunList.length - 1]}–${tahunList[0]}` : '', F.tingkat && 'Tingkat ' + F.tingkat, F.kategori && 'Bidang ' + F.kategori].filter(Boolean).join(' · ');
  main.innerHTML = `<div class="topbar"><div><h1>Prestasi Siswa</h1><p class="muted">Daftar prestasi siswa ${esc(state.settings.nama_sekolah)}.</p></div>
    <div class="row">${admin ? `<button class="btn primary" id="add">${icon('plus')} Input Manual</button><button class="btn" id="imp">${icon('up')} Impor Excel</button><button class="btn" id="tpl">${icon('dl')} Template Excel</button>` : ''}<button class="btn" id="xls">${icon('dl')} Ekspor Excel</button><button class="btn" id="pdf">${icon('pdf')} Unduh PDF</button></div></div>
    <div class="grid g4" style="margin-bottom:16px">
      <div class="card stat"><span class="muted small">Total prestasi</span><b>${all.length}</b></div>
      <div class="card stat"><span class="muted small">Tahun ${thnIni}</span><b>${perTahun[thnIni] || 0}</b></div>
      <div class="card stat"><span class="muted small">Tingkat nasional</span><b>${(perTingkat.Nasional || 0) + (perTingkat.Internasional || 0)}</b></div>
      <div class="card stat"><span class="muted small">Tingkat provinsi</span><b>${perTingkat.Provinsi || 0}</b></div></div>
    ${all.length ? `<div class="card"><h3>Jumlah prestasi per tahun</h3><div style="display:flex;gap:8px;align-items:flex-end;height:130px;padding-top:8px;overflow-x:auto">${Object.keys(perTahun).filter((y) => y !== '-').sort().map((y) => `<button data-y="${y}" title="${perTahun[y]} prestasi" style="flex:1;min-width:34px;border:0;background:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end"><span class="small"><b>${perTahun[y]}</b></span><i style="display:block;width:100%;max-width:44px;height:${(perTahun[y] / maxY) * 80}px;border-radius:6px 6px 0 0;background:${F.tahun === y ? 'var(--gold)' : 'var(--navy-2)'}"></i><span class="small muted">${y}</span></button>`).join('')}</div></div>` : ''}
    <div class="card"><div class="row" style="margin-bottom:12px">
      <input class="in" id="q" placeholder="Cari nama, kelas, atau lomba…" value="${esc(F.q)}" style="max-width:280px">
      <select class="in" id="ft" style="width:auto"><option value="">Semua tahun</option>${tahunList.map((y) => `<option ${String(y) === F.tahun ? 'selected' : ''}>${y}</option>`).join('')}</select>
      <select class="in" id="fl" style="width:auto"><option value="">Semua tingkat</option>${[...new Set([...TINGKAT, ...Object.keys(perTingkat)])].filter((x) => x !== '-' && perTingkat[x]).map((t) => `<option ${t === F.tingkat ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      <select class="in" id="fk" style="width:auto"><option value="">Semua bidang</option>${KATEGORI.map((k) => `<option ${k === F.kategori ? 'selected' : ''}>${k}</option>`).join('')}</select>
      <span class="spacer"></span><span class="small muted">${list.length} data</span></div>
    ${list.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th style="width:40px">No</th><th>Nama Siswa</th><th>Kelas</th><th>Prestasi</th><th>Tingkat</th><th>Tanggal</th>${admin ? '<th>Keterangan</th><th></th>' : ''}</tr></thead><tbody>
      ${groupYear(list).map(([y, xs]) => `<tr><td colspan="${admin ? 8 : 6}" style="background:#eef2f8;font-weight:800;color:var(--navy)">TAHUN ${y} <span class="badge">${xs.length} prestasi</span></td></tr>${xs.map((r, i) => `<tr><td>${i + 1}</td><td><b>${esc(r.nama)}</b>${r.anggota ? `<div class="small muted">👥 ${esc(r.anggota.split('\n').filter(Boolean).join(', '))}</div>` : ''}</td><td>${esc(r.kelas || '')}</td><td>${esc(r.prestasi)}<div style="margin-top:3px"><span class="badge gray">${esc(r.kategori || '')}</span>${r.dipublikasi ? ' <span class="badge green">Dipublikasi</span>' : ''}${r.piagam_file ? ' <span class="badge gold">Piagam</span>' : ''}</div></td><td><span class="badge ${BOBOT[r.tingkat] >= 5 ? 'red' : BOBOT[r.tingkat] >= 3 ? '' : 'gray'}">${esc(r.tingkat || '-')}</span></td><td class="small">${esc(r.tanggal || '')}</td>${admin ? `<td class="small">${esc(r.keterangan || '')}</td><td class="right" style="white-space:nowrap"><a class="btn sm" href="#/prestasi/${r.id}" title="Poster & publikasi">${icon('img')}</a> <button class="btn sm" data-e="${r.id}">${icon('edit')}</button> <button class="btn sm danger" data-x="${r.id}">${icon('trash')}</button></td>` : ''}</tr>`).join('')}`).join('')}
    </tbody></table></div>` : `<div class="empty">${all.length ? 'Tidak ada data yang cocok dengan filter.' : `Belum ada data prestasi.${admin ? '<br><br>Klik <b>Impor Excel</b> untuk memasukkan file DATA SISWA PRESTASI, atau <b>Input Manual</b>.' : ''}`}</div>`}</div>`;
  const reload = () => pagePrestasi(main);
  let tq; $('#q', main).oninput = (e) => { F.q = e.target.value; clearTimeout(tq); tq = setTimeout(async () => { await reload(); const i = $('#q', main); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 350); };
  $('#ft', main).onchange = (e) => { F.tahun = e.target.value; reload(); };
  $('#fl', main).onchange = (e) => { F.tingkat = e.target.value; reload(); };
  $('#fk', main).onchange = (e) => { F.kategori = e.target.value; reload(); };
  $$('[data-y]', main).forEach((b) => (b.onclick = () => { F.tahun = F.tahun === b.dataset.y ? '' : b.dataset.y; reload(); }));
  $('#add', main)?.addEventListener('click', () => editPrestasi({ tahun: new Date().getFullYear() }, reload));
  $('#imp', main)?.addEventListener('click', () => imporExcel(reload));
  $('#tpl', main)?.addEventListener('click', () => unduhTemplate().catch(fail));
  $('#xls', main).onclick = () => eksporExcel(list, judul || 'Semua').catch(fail);
  $('#pdf', main).onclick = () => exportPdf(pdfHtml(list, judul || 'Semua tahun'), `Prestasi Siswa ${judul || ''}.pdf`.replace(/[–·]/g, '-').replace(/[\\/:*?"<>|]/g, '-'), 'portrait').catch(fail);
  $$('[data-e]', main).forEach((b) => (b.onclick = () => editPrestasi(all.find((r) => r.id === +b.dataset.e), reload)));
  $$('[data-x]', main).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus data prestasi ini?')) { await api('prestasi/' + b.dataset.x, { method: 'DELETE' }); reload(); } }));
}

// ================= Poster & publikasi satu prestasi =================
function caption(r) {
  const s = state.settings; const tim = r.anggota ? r.anggota.split('\n').filter(Boolean) : [];
  const tag = '#' + (r.kategori === 'Olahraga' ? 'PrestasiOlahraga' : r.kategori === 'Keagamaan' ? 'PrestasiKeagamaan' : r.kategori === 'Akademik' ? 'PrestasiAkademik' : 'PrestasiSiswa');
  return `🏆 SELAMAT & SUKSES! 🏆\n\nKeluarga Besar ${s.nama_sekolah} mengucapkan selamat dan sukses kepada:\n\n✨ ${r.nama}${r.kelas ? ` (${r.kelas})` : ''}\n${tim.length ? tim.map((n, i) => `${i + 1}. ${n}`).join('\n') + '\n' : ''}\natas raihan prestasi:\n🥇 ${r.prestasi}\n📍 Tingkat ${r.tingkat || '-'}${r.tanggal ? `\n📅 ${r.tanggal}` : ''}\n\nTerima kasih atas kerja keras, semangat, dan dedikasinya. Semoga menjadi inspirasi bagi seluruh siswa untuk terus berprestasi. Terima kasih juga kepada guru pembina dan orang tua atas dukungannya. 💙\n\n#PrestasiSiswa ${tag} #BanggaSmanesa ${s.hashtag_tetap || ''}`.trim();
}
export async function pagePrestasiDetail(main, id) {
  const all = await api('prestasi'); const r = all.find((x) => x.id === id);
  if (!r) { main.innerHTML = '<div class="card empty">Data tidak ditemukan.</div>'; return; }
  const imgs = await getImages(state.settings);
  const st = { format: 'feed', theme: BOBOT[r.tingkat] >= 5 ? 'merah' : r.kategori === 'Keagamaan' ? 'hijau' : 'navy', foto: r.foto_file ? await loadImg(fileUrl(r.foto_file)).catch(() => null) : null };
  main.innerHTML = `<div class="topbar"><div><a href="#/prestasi" class="small">← Semua prestasi</a><h1 style="margin-top:4px">${esc(r.nama)}</h1><p class="muted">${esc(r.prestasi)} · ${esc(r.tingkat || '')} · ${esc(r.tanggal || r.tahun || '')}</p></div>
    <div class="row"><a class="btn" href="https://www.instagram.com/" target="_blank">Buka Instagram</a></div></div>
  <div class="card"><div class="sec-title"><span class="num">1</span><h2 style="margin:0">Poster Ucapan Selamat</h2></div>
    <div class="studio"><div class="grid" style="gap:14px">
      <div><b class="small">Format</b><div class="tabs" id="fmt" style="margin-top:6px;flex-wrap:wrap;width:auto">${['feed', 'story', 'square'].map((k) => `<button data-f="${k}" class="${k === st.format ? 'on' : ''}">${FORMATS[k].label}</button>`).join('')}</div></div>
      <div><b class="small">Gaya warna</b><div class="tpl-pick" style="margin-top:6px">${Object.entries(THEMES).map(([k, t]) => `<button data-t="${k}" title="${t.name}" class="${k === st.theme ? 'on' : ''}" style="background:linear-gradient(135deg,${t.bg[0]},${t.bg[1]})"></button>`).join('')}</div></div>
      <div><b class="small">Foto siswa / tim (opsional)</b><div class="row" style="margin-top:6px"><button class="btn sm" id="foto">${icon('img')} ${r.foto_file ? 'Ganti foto' : 'Unggah foto'}</button>${r.foto_file ? '<button class="btn sm" id="nofoto">Hapus</button>' : ''}</div><span class="hint">Tanpa foto, poster memakai ikon piala.</span></div>
      <div class="grid" style="gap:8px">
        <button class="btn primary" id="dl" style="justify-content:center">${icon('dl')} Unduh PNG</button>
        <button class="btn" id="dlall" style="justify-content:center">${icon('dl')} Unduh Feed + Story</button>
        <button class="btn gold" id="share" style="justify-content:center">📲 Bagikan ke IG (HP)</button>
      </div>
      <div><b class="small">Piagam / sertifikat</b><div class="row" style="margin-top:6px">${r.piagam_file ? `<a class="btn sm" href="${fileUrl(r.piagam_file)}" target="_blank">Lihat piagam</a>` : ''}<button class="btn sm" id="piagam">${icon('up')} ${r.piagam_file ? 'Ganti' : 'Unggah'} piagam</button></div></div>
    </div><div class="preview-wrap"><canvas id="cv"></canvas></div></div></div>
  <div class="card"><div class="sec-title"><span class="num">2</span><h2 style="margin:0">Caption Instagram</h2><span class="spacer"></span><button class="btn sm" id="regen">↻ Buat ulang</button><button class="btn sm" id="copy">${icon('copy')} Salin</button></div>
    <textarea class="in" id="cap" rows="14" style="font-size:.86rem">${esc(r.caption || caption(r))}</textarea>
    <label class="row" style="margin-top:12px;gap:8px"><input type="checkbox" id="pub" ${r.dipublikasi ? 'checked' : ''}> <b>Sudah dipublikasikan di media sosial</b></label></div>`;
  const cv = $('#cv', main);
  const opts = (format = st.format) => ({ nama: r.nama, anggota: (r.anggota || '').split('\n').filter(Boolean), kelas: r.kelas, prestasi: r.prestasi, tingkat: r.tingkat, tanggal: r.tanggal || String(r.tahun || ''), theme: st.theme, format, settings: state.settings, logo: imgs.logo, foto: st.foto });
  const draw = () => renderPrestasi(cv, opts()); await draw();
  const blobOf = (c) => new Promise((res) => c.toBlob(res, 'image/png'));
  const renderTo = async (f) => { const c = document.createElement('canvas'); await renderPrestasi(c, opts(f)); return c; };
  const fname = (f) => `Prestasi ${r.nama.slice(0, 40)} - ${FORMATS[f].label.replace(/[/:]/g, '-')}.png`;
  const reload = () => pagePrestasiDetail(main, id);
  $$('#fmt button', main).forEach((b) => (b.onclick = () => { st.format = b.dataset.f; $$('#fmt button', main).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $$('.tpl-pick button', main).forEach((b) => (b.onclick = () => { st.theme = b.dataset.t; $$('.tpl-pick button', main).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $('#foto', main).onclick = async () => { const [f] = await pickFile('image/*'); if (!f) return; try { const fid = await uploadFile(await compressImage(f, 1200, 0.88)); await api('prestasi/' + id, { method: 'PUT', body: { foto_file: fid } }); reload(); } catch (e) { fail(e); } };
  $('#nofoto', main)?.addEventListener('click', async () => { await api('prestasi/' + id, { method: 'PUT', body: { foto_file: '' } }); reload(); });
  $('#piagam', main).onclick = async () => { const [f] = await pickFile('image/*,application/pdf'); if (!f) return; try { const fid = await uploadFile(f.type.startsWith('image/') ? await compressImage(f, 2000, 0.9) : f); await api('prestasi/' + id, { method: 'PUT', body: { piagam_file: fid } }); toast('Piagam disimpan'); reload(); } catch (e) { fail(e); } };
  $('#dl', main).onclick = async () => downloadBlob(await blobOf(cv), fname(st.format));
  $('#dlall', main).onclick = async () => { for (const f of ['feed', 'story']) { downloadBlob(await blobOf(await renderTo(f)), fname(f)); await new Promise((res) => setTimeout(res, 600)); } };
  $('#share', main).onclick = async () => { const files = [new File([await blobOf(await renderTo('feed'))], fname('feed'), { type: 'image/png' })]; if (navigator.canShare && navigator.canShare({ files })) { await copyText($('#cap', main).value); try { await navigator.share({ files, text: $('#cap', main).value }); } catch {} } else toast('Bagikan langsung hanya tersedia di HP. Di komputer, unduh PNG lalu unggah manual.', true); };
  let tc; $('#cap', main).oninput = (e) => { clearTimeout(tc); tc = setTimeout(() => api('prestasi/' + id, { method: 'PUT', body: { caption: e.target.value } }).catch(fail), 900); };
  $('#regen', main).onclick = async () => { $('#cap', main).value = caption(r); await api('prestasi/' + id, { method: 'PUT', body: { caption: $('#cap', main).value } }); toast('Caption dibuat ulang'); };
  $('#copy', main).onclick = () => copyText($('#cap', main).value);
  $('#pub', main).onchange = async (e) => { await api('prestasi/' + id, { method: 'PUT', body: { dipublikasi: e.target.checked ? 1 : 0 } }); toast('Status disimpan'); };
}
