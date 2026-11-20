import { state, api, $, $$, h, esc, icon, toast, fail, todayISO, tglPanjang, parseD, BULAN, formModal, confirmBox, modal, fileUrl, compressImage, pickFile, qrDataUrl, copyText, sigModal, sigPad } from './core.js';
import { exportPdf, printDoc, notulenHtml, notulenDocx, ensureCss } from './laporan.js';

const JENIS = ['Rapat Dinas', 'Rapat Koordinasi Humas', 'Rapat Komite / Wali Murid', 'Rapat Panitia Kegiatan', 'Rapat Kemitraan', 'Rapat Lainnya'];
const UNSUR = ['', 'Kepala Sekolah', 'Wakil Kepala Sekolah', 'Guru', 'Tenaga Kependidikan', 'Komite Sekolah', 'Wali Murid', 'OSIS / Siswa', 'Tamu / Mitra'];

export async function pageRapat(main) {
  const list = await api('rapat');
  main.innerHTML = `<div class="topbar"><div><h1>Rapat & Notulensi</h1><p class="muted">Notulen, daftar hadir bertanda tangan digital, dokumentasi foto, dan laporan resmi berkop.</p></div>
    <div class="row"><button class="btn primary" id="add">${icon('plus')} Rapat Baru</button></div></div>
    <div class="card">${list.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th>Tanggal</th><th>Rapat</th><th>Tempat</th><th>Notulis</th><th class="center">Hadir</th><th class="center">Foto</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map((r) => `<tr><td style="white-space:nowrap">${tglPanjang(r.tanggal)}<div class="small muted">${esc(r.waktu_mulai || '')}</div></td><td><a href="#/rapat/${r.id}"><b>${esc(r.judul)}</b></a><div class="small muted">${esc(r.jenis || '')}</div></td><td>${esc(r.tempat || '')}</td><td>${esc(r.notulis || '')}</td><td class="center">${r.jml_hadir}</td><td class="center">${r.jml_foto}</td><td>${r.status === 'final' ? '<span class="badge green">Final</span>' : '<span class="badge gold">Draft</span>'}</td><td class="right"><a class="btn sm" href="#/rapat/${r.id}">Buka</a></td></tr>`).join('')}
    </tbody></table></div>` : '<div class="empty">Belum ada rapat. Klik <b>Rapat Baru</b> untuk mulai mencatat notulen.</div>'}</div>`;
  $('#add', main).onclick = () => formModal({
    title: 'Rapat Baru', submitLabel: 'Buat & Mulai Notulen',
    fields: [
      { name: 'judul', label: 'Judul / perihal rapat', required: true, full: true, placeholder: 'Rapat Persiapan Peringatan Hari Guru Nasional' },
      { name: 'jenis', label: 'Jenis rapat', type: 'select', options: JENIS },
      { name: 'tanggal', label: 'Tanggal', type: 'date', required: true, default: todayISO() },
      { name: 'waktu_mulai', label: 'Jam mulai', type: 'time' },
      { name: 'tempat', label: 'Tempat', default: 'Ruang Rapat ' + (state.settings.nama_sekolah || '') },
      { name: 'pimpinan', label: 'Pimpinan rapat', default: state.settings.kepsek_nama },
      { name: 'notulis', label: 'Notulis', default: state.user.nama },
    ],
    onSubmit: async (d) => { d.mengetahui = 1; const { id } = await api('rapat', { method: 'POST', body: d }); location.hash = '#/rapat/' + id; },
  });
}

let pollTimer = null;
export async function pageRapatDetail(main, id) {
  clearInterval(pollTimer);
  let r = await api('rapat/' + id);
  const locked = r.status === 'final';
  const signUrl = `${location.origin}/ttd.html?t=${r.token}`;
  const fld = (name, label, o = {}) => `<label class="f ${o.full ? 'full' : ''}">${label}${o.type === 'textarea' ? `<textarea name="${name}" rows="${o.rows || 4}" placeholder="${esc(o.ph || '')}" ${locked ? 'readonly' : ''}>${esc(r[name] || '')}</textarea>` : o.type === 'select' ? `<select name="${name}" ${locked ? 'disabled' : ''}>${o.options.map((x) => `<option ${x === r[name] ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : `<input name="${name}" type="${o.type || 'text'}" value="${esc(r[name] || '')}" placeholder="${esc(o.ph || '')}" ${locked ? 'readonly' : ''}>`}${o.hint ? `<span class="hint">${o.hint}</span>` : ''}</label>`;

  main.innerHTML = `
  <div class="topbar"><div><a href="#/rapat" class="small">← Semua rapat</a><h1 style="margin-top:4px">${esc(r.judul)}</h1><p class="muted">${tglPanjang(r.tanggal)} · ${esc(r.tempat || '')} ${locked ? '<span class="badge green">Final — terkunci</span>' : '<span class="badge gold">Draft</span>'} <span id="saved" class="small muted"></span></p></div>
    <div class="row"><button class="btn" id="prev">${icon('img')} Pratinjau</button><button class="btn primary" id="pdf">${icon('pdf')} Unduh PDF</button><button class="btn primary" id="docx">${icon('dl')} Unduh Word</button><button class="btn" id="print">${icon('print')} Cetak</button></div></div>

  <div class="card"><div class="sec-title"><span class="num">1</span><h2 style="margin:0">Data Rapat</h2></div>
    <form class="form" id="f1">
      ${fld('judul', 'Judul / perihal rapat', { full: true })}
      ${fld('jenis', 'Jenis rapat', { type: 'select', options: JENIS })}
      ${fld('nomor', 'Nomor surat/undangan (opsional)', { ph: '005/123/101.6.9.12/2026' })}
      ${fld('tanggal', 'Tanggal', { type: 'date' })}
      <div class="row" style="gap:10px">${fld('waktu_mulai', 'Mulai', { type: 'time' })}${fld('waktu_selesai', 'Selesai', { type: 'time' })}</div>
      ${fld('tempat', 'Tempat')}
      ${fld('undangan', 'Peserta yang diundang', { ph: 'Seluruh guru dan tendik' })}
      ${fld('pimpinan', 'Pimpinan rapat')}
      ${fld('pimpinan_jabatan', 'Jabatan pimpinan rapat', { ph: 'Kepala Sekolah' })}
      ${fld('notulis', 'Notulis')}
      ${fld('notulis_nip', 'NIP notulis (opsional)')}
      ${fld('agenda', 'Acara / agenda rapat', { type: 'textarea', full: true, rows: 3, ph: '1. Pembukaan\n2. Pembahasan persiapan HGN\n3. Lain-lain', hint: 'Tulis per baris. Awali dengan "1." untuk daftar bernomor atau "-" untuk poin.' })}
    </form></div>

  <div class="card"><div class="sec-title"><span class="num">2</span><h2 style="margin:0">Notulensi</h2><span class="spacer"></span><span class="small muted">Tersimpan otomatis</span></div>
    <form class="form" id="f2">
      ${fld('pembukaan', 'I. Pembukaan', { type: 'textarea', full: true, rows: 3, ph: 'Rapat dibuka oleh Kepala Sekolah pukul 09.00 WIB dengan bacaan basmalah…' })}
      ${fld('pembahasan', 'II. Pembahasan', { type: 'textarea', full: true, rows: 8, ph: '1. Kepala sekolah menyampaikan…\n2. Waka Humas menjelaskan…\n- poin tambahan' })}
      ${fld('keputusan', 'III. Hasil Rapat / Keputusan', { type: 'textarea', full: true, rows: 5, ph: '1. Upacara HGN dilaksanakan Selasa, 25 November 2026 pukul 07.00\n2. …' })}
      ${fld('tindak_lanjut', 'IV. Tindak Lanjut (siapa, apa, kapan)', { type: 'textarea', full: true, rows: 3 })}
      ${fld('penutup', 'V. Penutup', { type: 'textarea', full: true, rows: 2, ph: 'Rapat ditutup pukul 11.00 WIB dengan bacaan hamdalah.' })}
    </form></div>

  <div class="card"><div class="sec-title"><span class="num">3</span><h2 style="margin:0">Daftar Hadir & Tanda Tangan Digital</h2><span class="spacer"></span><span class="badge" id="jml">${r.hadir.length} hadir</span></div>
    <div class="qrbox"><img src="${qrDataUrl(signUrl)}" alt="QR tanda tangan">
      <div style="flex:1;min-width:240px"><b>Peserta tanda tangan dari HP masing-masing</b><p class="small muted" style="margin:4px 0 8px">Tampilkan QR ini di layar/proyektor atau bagikan link ke grup WhatsApp. Peserta mengisi nama, jabatan, lalu tanda tangan. Daftar di bawah diperbarui otomatis.</p>
      <div class="linkbox">${esc(signUrl)}</div>
      <div class="row" style="margin-top:8px"><button class="btn sm" id="cpl">${icon('copy')} Salin link</button><a class="btn sm" target="_blank" href="https://wa.me/?text=${encodeURIComponent(`Assalamu'alaikum. Mohon Bapak/Ibu mengisi daftar hadir & tanda tangan digital *${r.judul}* (${tglPanjang(r.tanggal)}) melalui link berikut:\n${signUrl}`)}">Bagikan ke WhatsApp</a><button class="btn sm" id="qrbig">Tampilkan QR besar</button><button class="btn sm" id="newtok" title="Link lama tidak berlaku lagi">Ganti link</button></div></div></div>
    <div class="row" style="margin:16px 0 10px"><h3 style="margin:0">Peserta hadir</h3><span class="spacer"></span>${locked ? '' : `<button class="btn sm gold" id="addh">${icon('pen')} Tambah & TTD di perangkat ini</button>`}<button class="btn sm" id="refresh">Muat ulang</button></div>
    <div id="hadir"></div></div>

  <div class="card"><div class="sec-title"><span class="num">4</span><h2 style="margin:0">Pengesahan</h2></div>
    <div class="grid g2">
      <div><b>Pimpinan Rapat</b> — ${esc(r.pimpinan || '-')}<div id="tp" style="margin-top:8px"></div></div>
      <div><b>Notulis</b> — ${esc(r.notulis || '-')}<div id="tn" style="margin-top:8px"></div></div>
    </div>
    <label class="row" style="margin-top:14px;gap:8px"><input type="checkbox" id="mengetahui" ${+r.mengetahui ? 'checked' : ''} ${locked ? 'disabled' : ''}> Tampilkan kolom <b>"Mengetahui, Kepala Sekolah"</b> di laporan <span class="small muted">(matikan jika pimpinan rapat adalah Kepala Sekolah)</span></label>
  </div>

  <div class="card"><div class="sec-title"><span class="num">5</span><h2 style="margin:0">Dokumentasi Foto</h2><span class="spacer"></span>${locked ? '' : `<button class="btn sm primary" id="upf">${icon('up')} Unggah foto</button>`}</div>
    <div id="fotos"></div><p class="small muted" style="margin-bottom:0">Foto otomatis dikompres (maks. 1600 px) agar laporan ringan. Bisa pilih beberapa foto sekaligus.</p></div>

  <div class="card row"><div><b>Status notulen</b><div class="small muted">${locked ? 'Notulen sudah final. Peserta tidak bisa menambah tanda tangan lagi.' : 'Kunci notulen setelah rapat selesai agar daftar hadir tidak berubah.'}</div></div><span class="spacer"></span>
    <button class="btn ${locked ? '' : 'gold'}" id="lock">${locked ? 'Buka kunci (kembali ke draft)' : 'Kunci sebagai FINAL'}</button><button class="btn danger" id="del">${icon('trash')} Hapus rapat</button></div>`;

  // ----- autosave -----
  let timer;
  const save = async () => {
    const d = { ...Object.fromEntries(new FormData($('#f1', main))), ...Object.fromEntries(new FormData($('#f2', main))) };
    try { await api('rapat/' + id, { method: 'PUT', body: d }); Object.assign(r, d); $('#saved', main).textContent = '✓ Tersimpan ' + new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); } catch (e) { fail(e); }
  };
  if (!locked) $$('#f1, #f2', main).forEach((f) => f.addEventListener('input', () => { $('#saved', main).textContent = 'Menyimpan…'; clearTimeout(timer); timer = setTimeout(save, 1200); }));
  const flush = async () => { if (timer) { clearTimeout(timer); timer = null; if (!locked) await save(); } };

  // ----- hadir -----
  const renderHadir = () => {
    $('#jml', main).textContent = r.hadir.length + ' hadir';
    $('#hadir', main).innerHTML = r.hadir.length ? `<div class="tblwrap"><table class="tbl"><thead><tr><th style="width:40px">No</th><th>Nama</th><th>Jabatan / Unsur</th><th>Tanda tangan</th><th>Waktu</th><th></th></tr></thead><tbody>${r.hadir.map((x, i) => `<tr><td>${i + 1}</td><td><b>${esc(x.nama)}</b></td><td>${esc([x.jabatan, x.unsur].filter(Boolean).join(' / '))}</td><td>${x.ttd ? `<img class="sigimg" src="${x.ttd}">` : `<span class="badge red">belum</span>`}</td><td class="small muted">${jamWIB(x.waktu)}</td><td class="right" style="white-space:nowrap">${locked ? '' : `<button class="btn sm" data-s="${x.id}" title="Tanda tangan ulang">${icon('pen')}</button> <button class="btn sm danger" data-x="${x.id}">${icon('trash')}</button>`}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty">Belum ada peserta. Bagikan QR/link di atas atau tambahkan langsung.</div>';
    $$('[data-x]', main).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus peserta ini dari daftar hadir?')) { await api(`rapat/${id}/hadir/${b.dataset.x}`, { method: 'DELETE' }); await reload(); } }));
    $$('[data-s]', main).forEach((b) => (b.onclick = async () => { const t = await sigModal('Tanda tangan ulang'); if (t) { await api(`rapat/${id}/hadir/${b.dataset.s}`, { method: 'PUT', body: { ttd: t } }); await reload(); } }));
  };
  const reload = async () => { const nr = await api('rapat/' + id); r.hadir = nr.hadir; r.foto = nr.foto; renderHadir(); renderFoto(); };
  renderHadir();
  pollTimer = setInterval(async () => { if (!location.hash.startsWith('#/rapat/' + id) || document.hidden) return; try { const nr = await api('rapat/' + id); if (nr.hadir.length !== r.hadir.length) { r.hadir = nr.hadir; renderHadir(); toast('Ada peserta baru tanda tangan'); } } catch {} }, 8000);

  $('#cpl', main).onclick = () => copyText(signUrl);
  $('#qrbig', main).onclick = () => modal({ title: 'Scan untuk tanda tangan', wide: true, body: `<div class="center"><img src="${qrDataUrl(signUrl, 14)}" style="width:min(520px,90%)"><h2>${esc(r.judul)}</h2><p class="muted">${tglPanjang(r.tanggal)} · Scan QR lalu isi nama & tanda tangan</p></div>` });
  $('#newtok', main).onclick = async () => { if (await confirmBox('Ganti link tanda tangan? Link/QR lama tidak bisa dipakai lagi.', 'Ganti')) { await flush(); await api(`rapat/${id}/token`, { method: 'POST' }); pageRapatDetail(main, id); } };
  $('#refresh', main).onclick = reload;
  $('#addh', main)?.addEventListener('click', () => {
    const body = h(`<div><div class="form"><label class="f">Nama lengkap *<input name="nama" required></label><label class="f">Jabatan<input name="jabatan" placeholder="Guru Informatika"></label><label class="f full">Unsur<select name="unsur">${UNSUR.map((u) => `<option>${u}</option>`).join('')}</select></label></div><p class="small muted">Tanda tangan:</p><canvas class="sigbox"></canvas></div>`);
    let pad;
    modal({ title: 'Tambah Peserta', body, actions: [{ label: 'Ulangi TTD', onClick: () => { pad.clear(); return false; } }, { label: 'Batal' }, { label: 'Simpan', cls: 'primary', onClick: async () => {
      const nama = $('[name=nama]', body).value.trim(); if (!nama) { toast('Nama wajib diisi', true); return false; }
      await api(`rapat/${id}/hadir`, { method: 'POST', body: { nama, jabatan: $('[name=jabatan]', body).value, unsur: $('[name=unsur]', body).value, ttd: pad.isEmpty() ? '' : pad.toDataURL() } });
      await reload(); toast('Peserta ditambahkan');
    } }] });
    pad = sigPad($('canvas', body));
  });

  // ----- pengesahan -----
  const renderSig = (key, el, label) => {
    const v = r[key];
    $(el, main).innerHTML = `${v ? `<img src="${v}" style="height:70px;border:1px solid var(--line);border-radius:8px;padding:4px;background:#fff">` : '<div class="small muted">Belum ditandatangani (boleh dikosongkan untuk tanda tangan basah).</div>'}${locked ? '' : `<div class="row" style="margin-top:6px"><button class="btn sm" data-sig>${icon('pen')} ${v ? 'Ganti' : 'Tanda tangan'}</button>${v ? '<button class="btn sm danger" data-clr>Hapus</button>' : ''}</div>`}`;
    $(el + ' [data-sig]', main)?.addEventListener('click', async () => { const t = await sigModal('Tanda tangan ' + label); if (t) { r[key] = t; await api('rapat/' + id, { method: 'PUT', body: { [key]: t } }); renderSig(key, el, label); } });
    $(el + ' [data-clr]', main)?.addEventListener('click', async () => { r[key] = ''; await api('rapat/' + id, { method: 'PUT', body: { [key]: '' } }); renderSig(key, el, label); });
  };
  renderSig('ttd_pimpinan', '#tp', 'Pimpinan Rapat'); renderSig('ttd_notulis', '#tn', 'Notulis');
  $('#mengetahui', main).onchange = async (e) => { r.mengetahui = e.target.checked ? 1 : 0; await api('rapat/' + id, { method: 'PUT', body: { mengetahui: r.mengetahui } }); toast('Disimpan'); };

  // ----- foto -----
  function renderFoto() {
    $('#fotos', main).innerHTML = r.foto.length ? `<div class="photos">${r.foto.map((f) => `<div class="photo"><a href="${fileUrl(f.file_id)}" target="_blank"><img src="${fileUrl(f.file_id)}" loading="lazy"></a><div class="cap"><input data-cap="${f.id}" value="${esc(f.keterangan || '')}" placeholder="Keterangan foto" ${locked ? 'readonly' : ''}>${locked ? '' : `<button class="btn sm danger" data-fx="${f.id}">${icon('trash')}</button>`}</div></div>`).join('')}</div>` : '<div class="empty">Belum ada foto dokumentasi.</div>';
    $$('[data-cap]', main).forEach((i) => i.addEventListener('change', async () => { await api(`rapat/${id}/foto/${i.dataset.cap}`, { method: 'PUT', body: { keterangan: i.value } }); const f = r.foto.find((x) => x.id === +i.dataset.cap); if (f) f.keterangan = i.value; toast('Keterangan disimpan'); }));
    $$('[data-fx]', main).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus foto ini?')) { await api(`rapat/${id}/foto/${b.dataset.fx}`, { method: 'DELETE' }); await reload(); } }));
  }
  renderFoto();
  $('#upf', main)?.addEventListener('click', async () => {
    const files = await pickFile('image/*', true); if (!files.length) return;
    const btn = $('#upf', main); btn.disabled = true;
    try {
      for (let i = 0; i < files.length; i++) {
        btn.textContent = `Mengunggah ${i + 1}/${files.length}…`;
        const f = await compressImage(files[i]);
        const fd = new FormData(); fd.append('file', f); fd.append('keterangan', `Dokumentasi ${r.judul}`);
        await api(`rapat/${id}/foto`, { method: 'POST', body: fd });
      }
      toast('Foto berhasil diunggah');
    } catch (e) { fail(e); }
    btn.disabled = false; btn.innerHTML = icon('up') + ' Unggah foto'; await reload();
  });

  // ----- laporan -----
  const fname = (ext) => `Notulen - ${r.judul} - ${r.tanggal}.${ext}`.replace(/[\\/:*?"<>|]/g, '-');
  $('#prev', main).onclick = async () => { await flush(); ensureCss(); modal({ title: 'Pratinjau Laporan', wide: true, body: `<div style="background:#e9edf3;padding:16px;border-radius:10px;overflow:auto"><div class="rep" style="background:#fff;padding:40px 48px;max-width:794px;margin:auto;box-shadow:0 4px 20px rgba(0,0,0,.1)">${notulenHtml(r)}</div></div>` }); };
  $('#pdf', main).onclick = async () => { await flush(); try { await exportPdf(notulenHtml(r), fname('pdf')); } catch (e) { fail(e); } };
  $('#docx', main).onclick = async () => { await flush(); try { await notulenDocx(r); } catch (e) { fail(e); } };
  $('#print', main).onclick = async () => { await flush(); printDoc(notulenHtml(r), 'Notulen ' + r.judul); };
  $('#lock', main).onclick = async () => { await flush(); await api('rapat/' + id, { method: 'PUT', body: { status: locked ? 'draft' : 'final' } }); toast(locked ? 'Notulen dibuka kembali' : 'Notulen dikunci sebagai FINAL'); pageRapatDetail(main, id); };
  $('#del', main).onclick = async () => { if (await confirmBox('Hapus rapat ini beserta daftar hadir dan fotonya? Tindakan ini tidak bisa dibatalkan.')) { await api('rapat/' + id, { method: 'DELETE' }); clearInterval(pollTimer); location.hash = '#/rapat'; } };
}

function jamWIB(t) { if (!t) return ''; const d = new Date(t.replace(' ', 'T') + 'Z'); return isNaN(d) ? '' : d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB'; }
