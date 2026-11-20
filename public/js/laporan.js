// ===== Laporan resmi berkop: PDF (html2pdf), Cetak, dan Word (.docx) =====
import { state, esc, kopSrc, fileUrl, tglPanjang, parseD, HARI, BULAN, loadImg, downloadBlob, toast } from './core.js';

const REPORT_CSS = `
.rep{font-family:'Times New Roman',Times,serif;font-size:12pt;color:#000;line-height:1.45;background:#fff}
.rep .kop{width:100%;display:block}
.rep h3{font-size:13pt;letter-spacing:.03em}
.rep table.id{border-collapse:collapse;margin:6px 0 10px}
.rep table.id td{padding:2px 6px 2px 0;vertical-align:top}
.rep table.rt{width:100%;border-collapse:collapse;font-size:11pt}
.rep table.rt th,.rep table.rt td{border:1px solid #000;padding:4px 6px;vertical-align:top}
.rep table.rt th{background:#e9e9e9;text-align:center}
.rep .c{text-align:center}
.rep h4{margin:12px 0 4px;font-size:12pt}
.rep p{margin:0 0 6px;text-align:justify}
.rep ol,.rep ul{margin:0 0 6px;padding-left:24px}
.rep table.ttd{width:100%;margin-top:22px;page-break-inside:avoid;break-inside:avoid}
.rep table.ttd td{vertical-align:top;text-align:left;padding-left:10px}
.rep .sig{height:62px;display:block;margin:4px 0}
.rep .sig img{height:60px;max-width:180px;object-fit:contain}
.rep .pb{page-break-before:always;break-before:page}
.rep .ph{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
.rep .ph figure{margin:0;break-inside:avoid;page-break-inside:avoid}
.rep .ph img{width:100%;height:230px;object-fit:cover;border:1px solid #999}
.rep .ph figcaption{font-size:10.5pt;text-align:center;margin-top:3px}
.rep .hd td.ttdc{height:46px;position:relative;padding:0}
.rep .hd .half{display:inline-block;width:50%;height:46px;vertical-align:top;position:relative;font-size:9pt}
.rep .hd .half span{position:absolute;left:3px;top:2px}
.rep .hd .half img{height:42px;max-width:90%;object-fit:contain;position:absolute;left:12px;top:2px}
.rep tr{page-break-inside:avoid;break-inside:avoid}
`;
export function ensureCss() { if (!document.getElementById('repcss')) { const s = document.createElement('style'); s.id = 'repcss'; s.textContent = REPORT_CSS; document.head.appendChild(s); } }

export const kopHtml = () => `<img class="kop" src="${kopSrc()}" alt="Kop surat">`;

function loadScript(src) { return new Promise((res, rej) => { if (document.querySelector(`script[src="${src}"]`)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Gagal memuat ' + src)); document.head.appendChild(s); }); }

export async function exportPdf(html, filename, orientation = 'portrait') {
  ensureCss();
  toast('Menyiapkan PDF…');
  await loadScript('/vendor/html2pdf.min.js');
  const w = orientation === 'landscape' ? 1005 : 676; // lebar area isi A4 (px) dengan margin 1,5 cm
  const el = document.createElement('div'); el.className = 'rep'; el.style.width = w + 'px'; el.style.padding = '0'; el.innerHTML = html;
  await Promise.all([...el.querySelectorAll('img')].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await window.html2pdf().set({
    margin: [12, 15, 14, 15], filename,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation },
    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'figure', '.ttd'] },
  }).from(el).save();
}

export function printDoc(html, title = 'Laporan', orientation = 'portrait') {
  const w = window.open('', '_blank');
  if (!w) return toast('Izinkan pop-up untuk mencetak', true);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><base href="${location.origin}/"><style>@page{size:A4 ${orientation};margin:12mm 15mm 14mm}body{margin:0}${REPORT_CSS}</style></head><body><div class="rep">${html}</div><script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
}

// ---------- teks notulen → HTML (dukung daftar "1." dan "-") ----------
function parseBlocks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = []; let cur = null;
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) { cur = null; continue; }
    let m;
    if ((m = l.match(/^(\d+)[.)]\s+(.*)$/))) { if (!cur || cur.t !== 'ol') { cur = { t: 'ol', items: [] }; blocks.push(cur); } cur.items.push(m[2]); }
    else if ((m = l.match(/^[-•*]\s+(.*)$/))) { if (!cur || cur.t !== 'ul') { cur = { t: 'ul', items: [] }; blocks.push(cur); } cur.items.push(m[1]); }
    else { cur = null; blocks.push({ t: 'p', text: l }); }
  }
  return blocks;
}
const textHtml = (t) => parseBlocks(t).map((b) => (b.t === 'p' ? `<p>${esc(b.text)}</p>` : `<${b.t}>${b.items.map((i) => `<li>${esc(i)}</li>`).join('')}</${b.t}>`)).join('');

const SECTIONS = [['pembukaan', 'Pembukaan'], ['pembahasan', 'Pembahasan'], ['keputusan', 'Hasil Rapat / Keputusan'], ['tindak_lanjut', 'Tindak Lanjut'], ['penutup', 'Penutup']];
const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const hariTgl = (s) => { const d = parseD(s); return `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`; };
const waktu = (r) => (r.waktu_mulai ? `${r.waktu_mulai}${r.waktu_selesai ? ' – ' + r.waktu_selesai : ' – selesai'} WIB` : '-');

function identitas(r) {
  const rows = [];
  if (r.nomor) rows.push(['Nomor', r.nomor]);
  rows.push(['Hari, Tanggal', hariTgl(r.tanggal)], ['Waktu', waktu(r)], ['Tempat', r.tempat || '-'], ['Pimpinan Rapat', r.pimpinan ? r.pimpinan + (r.pimpinan_jabatan ? ` (${r.pimpinan_jabatan})` : '') : '-'], ['Notulis', r.notulis || '-'], ['Peserta', `${r.hadir.length} orang (daftar hadir terlampir)`]);
  if (r.undangan) rows.push(['Undangan', r.undangan]);
  return rows;
}

export function notulenHtml(r, opt = { hadir: true, foto: true }) {
  const s = state.settings;
  const secs = SECTIONS.filter(([k]) => (r[k] || '').trim());
  let html = `${kopHtml()}
  <h3 style="text-align:center;margin:14px 0 0">NOTULEN RAPAT</h3><p style="text-align:center;margin:0 0 10px;font-weight:bold">${esc((r.judul || '').toUpperCase())}</p>
  <table class="id">${identitas(r).map(([a, b]) => `<tr><td style="width:130px">${a}</td><td style="width:10px">:</td><td>${esc(b)}</td></tr>`).join('')}
  ${r.agenda ? `<tr><td>Acara</td><td>:</td><td>${textHtml(r.agenda)}</td></tr>` : ''}</table>
  ${secs.map(([k, label], i) => `<h4>${ROMAWI[i]}. ${label}</h4>${textHtml(r[k])}`).join('')}
  <table class="ttd"><tr>
    <td style="width:50%">&nbsp;<br>Pimpinan Rapat,<div class="sig">${r.ttd_pimpinan ? `<img src="${r.ttd_pimpinan}">` : ''}</div><b><u>${esc(r.pimpinan || '..............................')}</u></b>${r.pimpinan_jabatan ? `<br>${esc(r.pimpinan_jabatan)}` : ''}</td>
    <td>${esc(s.kota || 'Purwoasri')}, ${tglPanjang(r.tanggal, false)}<br>Notulis,<div class="sig">${r.ttd_notulis ? `<img src="${r.ttd_notulis}">` : ''}</div><b><u>${esc(r.notulis || '..............................')}</u></b>${r.notulis_nip ? `<br>NIP. ${esc(r.notulis_nip)}` : ''}</td></tr>
    ${+r.mengetahui ? `<tr><td colspan="2" style="text-align:center;padding-top:18px">Mengetahui,<br>Kepala ${esc(s.nama_sekolah)}<div style="height:66px"></div><b><u>${esc(s.kepsek_nama)}</u></b><br>${esc(s.kepsek_pangkat || '')}<br>NIP. ${esc(s.kepsek_nip || '.......................')}</td></tr>` : ''}
  </table>`;
  if (opt.hadir) html += daftarHadirHtml(r, true);
  if (opt.foto && r.foto.length) {
    html += `<div class="pb"></div>${kopHtml()}<h3 style="text-align:center;margin:14px 0 2px">DOKUMENTASI RAPAT</h3><p style="text-align:center;margin:0">${esc(r.judul)}<br>${hariTgl(r.tanggal)}</p>
    <div class="ph">${r.foto.map((f) => `<figure><img src="${fileUrl(f.file_id)}"><figcaption>${esc(f.keterangan || '')}</figcaption></figure>`).join('')}</div>`;
  }
  return html;
}
export function daftarHadirHtml(r, pagebreak = false) {
  return `${pagebreak ? '<div class="pb"></div>' : ''}${kopHtml()}<h3 style="text-align:center;margin:14px 0 2px">DAFTAR HADIR RAPAT</h3>
  <table class="id" style="margin:8px 0"><tr><td style="width:130px">Acara</td><td>:</td><td>${esc(r.judul)}</td></tr><tr><td>Hari, Tanggal</td><td>:</td><td>${hariTgl(r.tanggal)}</td></tr><tr><td>Tempat</td><td>:</td><td>${esc(r.tempat || '-')}</td></tr></table>
  <table class="rt hd"><thead><tr><th style="width:34px">No</th><th>Nama</th><th style="width:30%">Jabatan / Unsur</th><th style="width:30%">Tanda Tangan</th></tr></thead><tbody>
  ${r.hadir.map((x, i) => `<tr><td class="c">${i + 1}</td><td>${esc(x.nama)}</td><td>${esc([x.jabatan, x.unsur].filter(Boolean).join(' / '))}</td><td class="ttdc">${i % 2 === 0 ? `<div class="half"><span>${i + 1}.</span>${x.ttd ? `<img src="${x.ttd}">` : ''}</div><div class="half"></div>` : `<div class="half"></div><div class="half"><span>${i + 1}.</span>${x.ttd ? `<img src="${x.ttd}">` : ''}</div>`}</td></tr>`).join('') || '<tr><td colspan="4" class="c">Belum ada peserta</td></tr>'}
  </tbody></table>`;
}

// ================== WORD (.docx) ==================
async function bytesOf(src) {
  if (src.startsWith('data:')) { const b = atob(src.split(',')[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return { data: u, type: src.includes('image/png') ? 'png' : 'jpg' }; }
  const res = await fetch(src); const blob = await res.blob();
  return { data: new Uint8Array(await blob.arrayBuffer()), type: /png/.test(blob.type) ? 'png' : /gif/.test(blob.type) ? 'gif' : 'jpg' };
}
async function imgRun(D, src, maxW, maxH, opts = {}) {
  if (!src) return null;
  try {
    const [{ data, type }, img] = await Promise.all([bytesOf(src), loadImg(src)]);
    let w = img.naturalWidth, hh = img.naturalHeight; const sc = Math.min(maxW / w, maxH / hh); w = Math.round(w * sc); hh = Math.round(hh * sc);
    return new D.ImageRun({ type, data, transformation: { width: w, height: hh }, ...opts });
  } catch { return null; }
}

export async function notulenDocx(r) {
  toast('Menyiapkan dokumen Word…');
  await loadScript('/vendor/docx.js');
  const D = window.docx; const s = state.settings;
  const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } = D;
  const CW = 9638; // lebar isi A4 (twip) dgn margin 2 cm
  const NB = { top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }, insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } };
  const P = (text, o = {}) => new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 60, before: o.before ?? 0 }, indent: o.indent, children: Array.isArray(text) ? text : [new TextRun({ text: String(text ?? ''), bold: o.bold, underline: o.underline ? {} : undefined, italics: o.italic, size: o.size })] });
  const kop = await imgRun(D, kopSrc(), 642, 200);
  const kopP = () => new Paragraph({ children: kop ? [kop] : [], spacing: { after: 120 } });
  const textParas = (t) => parseBlocks(t).flatMap((b) => (b.t === 'p' ? [P(b.text, { align: AlignmentType.JUSTIFIED })] : b.items.map((it, i) => new Paragraph({ spacing: { after: 40 }, indent: { left: 567, hanging: 340 }, alignment: AlignmentType.JUSTIFIED, children: [new TextRun(`${b.t === 'ol' ? i + 1 + '.' : '•'}\t${it}`)], tabStops: [{ type: 'left', position: 567 }] }))));
  const cell = (children, w, o = {}) => new TableCell({ width: { size: w, type: WidthType.DXA }, children: Array.isArray(children) ? children : [children], verticalAlign: o.v, columnSpan: o.span, shading: o.shade ? { fill: 'E9E9E9' } : undefined, margins: o.m ?? { top: 40, bottom: 40, left: 80, right: 80 } });

  // ---------- halaman notulen ----------
  const idRows = identitas(r).map(([a, b]) => new TableRow({ children: [cell(P(a), 2300, { m: { left: 0, right: 60 } }), cell(P(':'), 250, { m: { left: 0, right: 0 } }), cell(P(b), CW - 2550)] }));
  if (r.agenda) idRows.push(new TableRow({ children: [cell(P('Acara'), 2300, { m: { left: 0, right: 60 } }), cell(P(':'), 250, { m: { left: 0, right: 0 } }), cell(textParas(r.agenda), CW - 2550)] }));
  const secs = SECTIONS.filter(([k]) => (r[k] || '').trim());
  const sigP = async (src) => { const im = await imgRun(D, src, 170, 62); return new Paragraph({ children: im ? [im] : [new TextRun('')], spacing: { before: 60, after: 60 }, ...(im ? {} : { spacing: { before: 600, after: 300 } }) }); };
  const half = CW / 2;
  const ttdRows = [new TableRow({ children: [
    cell([P(' ', { after: 0 }), P('Pimpinan Rapat,'), await sigP(r.ttd_pimpinan), P(r.pimpinan || '..............................', { bold: true, underline: true, after: 0 }), ...(r.pimpinan_jabatan ? [P(r.pimpinan_jabatan)] : [])], half),
    cell([P(`${s.kota || 'Purwoasri'}, ${tglPanjang(r.tanggal, false)}`, { after: 0 }), P('Notulis,'), await sigP(r.ttd_notulis), P(r.notulis || '..............................', { bold: true, underline: true, after: 0 }), ...(r.notulis_nip ? [P('NIP. ' + r.notulis_nip)] : [])], half),
  ] })];
  if (+r.mengetahui) ttdRows.push(new TableRow({ children: [cell([P('Mengetahui,', { align: AlignmentType.CENTER, before: 240, after: 0 }), P('Kepala ' + s.nama_sekolah, { align: AlignmentType.CENTER, after: 900 }), P(s.kepsek_nama, { align: AlignmentType.CENTER, bold: true, underline: true, after: 0 }), P(s.kepsek_pangkat || '', { align: AlignmentType.CENTER, after: 0 }), P('NIP. ' + (s.kepsek_nip || '.......................'), { align: AlignmentType.CENTER })], CW, { span: 2 })] }));

  const page1 = [
    kopP(),
    P('NOTULEN RAPAT', { align: AlignmentType.CENTER, bold: true, size: 26, after: 0 }),
    P((r.judul || '').toUpperCase(), { align: AlignmentType.CENTER, bold: true, after: 200 }),
    new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [2300, 250, CW - 2550], borders: NB, rows: idRows }),
    ...secs.flatMap(([k, label], i) => [P(`${ROMAWI[i]}. ${label}`, { bold: true, before: 160, after: 60 }), ...textParas(r[k])]),
    P('', { after: 200 }),
    new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [half, half], borders: NB, rows: ttdRows }),
  ];

  // ---------- daftar hadir ----------
  const hw = [600, 3600, 2600, CW - 6800];
  const hdRows = [new TableRow({ tableHeader: true, children: ['No', 'Nama', 'Jabatan / Unsur', 'Tanda Tangan'].map((t, i) => cell(P(t, { bold: true, align: AlignmentType.CENTER, after: 0 }), hw[i], { shade: true })) })];
  for (let i = 0; i < r.hadir.length; i++) {
    const x = r.hadir[i];
    const im = await imgRun(D, x.ttd, 110, 40);
    const sigPara = new Paragraph({ alignment: i % 2 === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT, spacing: { after: 0 }, children: [new TextRun({ text: i + 1 + '. ', size: 18 }), ...(im ? [im] : [new TextRun(' \n')])] });
    hdRows.push(new TableRow({ cantSplit: true, height: { value: 680, rule: 'atLeast' }, children: [cell(P(String(i + 1), { align: AlignmentType.CENTER, after: 0 }), hw[0], { v: 'center' }), cell(P(x.nama, { after: 0 }), hw[1], { v: 'center' }), cell(P([x.jabatan, x.unsur].filter(Boolean).join(' / '), { after: 0 }), hw[2], { v: 'center' }), cell(sigPara, hw[3], { v: 'center' })] }));
  }
  const page2 = [
    kopP(), P('DAFTAR HADIR RAPAT', { align: AlignmentType.CENTER, bold: true, size: 26, after: 160 }),
    new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [2300, 250, CW - 2550], borders: NB, rows: [['Acara', r.judul], ['Hari, Tanggal', hariTgl(r.tanggal)], ['Tempat', r.tempat || '-']].map(([a, b]) => new TableRow({ children: [cell(P(a), 2300, { m: { left: 0, right: 60 } }), cell(P(':'), 250, { m: { left: 0, right: 0 } }), cell(P(b), CW - 2550)] })) }),
    P('', { after: 120 }),
    new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: hw, rows: hdRows }),
  ];

  // ---------- dokumentasi ----------
  const sections = [page1, page2];
  if (r.foto.length) {
    const rows = [];
    for (let i = 0; i < r.foto.length; i += 2) {
      const cells = [];
      for (const f of [r.foto[i], r.foto[i + 1]]) {
        if (!f) { cells.push(cell(P(''), half)); continue; }
        const im = await imgRun(D, fileUrl(f.file_id), 300, 225);
        cells.push(cell([new Paragraph({ alignment: AlignmentType.CENTER, children: im ? [im] : [], spacing: { after: 40 } }), P(f.keterangan || '', { align: AlignmentType.CENTER, size: 20, after: 160 })], half));
      }
      rows.push(new TableRow({ cantSplit: true, children: cells }));
    }
    sections.push([kopP(), P('DOKUMENTASI RAPAT', { align: AlignmentType.CENTER, bold: true, size: 26, after: 0 }), P(r.judul, { align: AlignmentType.CENTER, after: 0 }), P(hariTgl(r.tanggal), { align: AlignmentType.CENTER, after: 200 }), new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [half, half], borders: NB, rows })]);
  }

  const doc = new D.Document({
    creator: 'HUMAS ' + s.nama_sekolah, title: 'Notulen ' + r.judul,
    styles: { default: { document: { run: { font: 'Times New Roman', size: 24 } } } },
    sections: sections.map((children) => ({ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 851, bottom: 1134, left: 1134, right: 1134 } } }, children })),
  });
  const blob = await D.Packer.toBlob(doc);
  downloadBlob(blob, `Notulen - ${r.judul} - ${r.tanggal}.docx`.replace(/[\\/:*?"<>|]/g, '-'));
}
