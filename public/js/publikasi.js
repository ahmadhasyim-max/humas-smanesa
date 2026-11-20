import { state, api, $, $$, h, esc, icon, toast, fail, todayISO, tglPanjang, parseD, BULAN, countdown, selisihHari, formModal, confirmBox, modal, fileUrl, pickFile, uploadFile, downloadBlob, copyText, qrDataUrl, loadImg } from './core.js';
import { FORMATS, THEMES, autoTheme, prefixOf, render, recordVideo, getImages } from './designer.js';

const KAT = { nasional: ['Nasional', ''], libur: ['Libur Nasional', 'red'], keagamaan: ['Keagamaan', 'green'], internasional: ['Internasional', 'gray'], lokal: ['Daerah', 'gold'], sekolah: ['Sekolah', 'gold'] };
let pubYear = null, pubFilter = '', pubPast = false;

export async function pagePublikasi(main) {
  const now = new Date(); if (!pubYear) pubYear = now.getFullYear();
  const [list, up] = await Promise.all([api('publikasi?tahun=' + pubYear), api('publikasi/mendatang')]);
  const lead = +state.settings.pengingat_hari || 7;
  const near = up.items.filter((x) => selisihHari(x.tanggal) <= lead);
  const done = list.filter((x) => x.pub && x.pub.ig_done && x.pub.tiktok_done).length;
  const past = list.filter((x) => x.tanggal < todayISO()).length;
  const shown = list.filter((x) => (!pubFilter || x.kategori === pubFilter) && (pubPast || x.tanggal >= todayISO()));
  const byMonth = {}; shown.forEach((x) => (byMonth[+x.bulan] ||= []).push(x));
  main.innerHTML = `<div class="topbar"><div><h1>Publikasi Hari Penting</h1><p class="muted">Pengingat otomatis hari nasional & hari besar, lengkap dengan desain, caption IG/TikTok, dan twibbon.</p></div>
    <div class="row"><select class="in" id="yr" style="width:auto">${[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => `<option ${y === pubYear ? 'selected' : ''}>${y}</option>`).join('')}</select><button class="btn" id="kelola">${icon('gear')} Kelola daftar hari</button></div></div>
    <div class="remind"><h3>${near.length ? `🔔 ${near.length} hari penting dalam ${lead} hari ke depan` : '📅 Hari penting berikutnya'}</h3><div class="small" style="opacity:.85">Klik kartu untuk membuat desain & caption, lalu tandai setelah diunggah.</div>
      <div class="items">${(near.length ? near : up.items.slice(0, 3)).map((x) => `<a class="it" href="#/publikasi/${x.id}/${x.tanggal.slice(0, 4)}"><span class="cd">${countdown(x.tanggal)} · ${tglPanjang(x.tanggal, false)}</span><b>${esc(x.nama)}</b><span class="small">${statusText(x.pub)}</span></a>`).join('')}</div></div>
    <div class="grid g4" style="margin:16px 0">
      <div class="card stat"><span class="muted small">Hari penting ${pubYear}</span><b>${list.length}</b></div>
      <div class="card stat"><span class="muted small">Sudah lewat</span><b>${past}</b></div>
      <div class="card stat"><span class="muted small">Terpublikasi IG + TikTok</span><b>${done}</b></div>
      <div class="card stat"><span class="muted small">Twibbon dibuat</span><b>${list.filter((x) => x.pub && x.pub.twibbon_file).length}</b></div></div>
    <div class="row" style="margin-bottom:12px"><div class="tabs">${[['', 'Semua'], ...Object.entries(KAT).map(([k, v]) => [k, v[0]])].map(([k, l]) => `<button data-k="${k}" class="${pubFilter === k ? 'on' : ''}">${l}</button>`).join('')}</div><label class="row small" style="gap:6px"><input type="checkbox" id="past" ${pubPast ? 'checked' : ''}> Tampilkan yang sudah lewat</label></div>
    ${Object.entries(byMonth).map(([m, xs]) => `<h3 style="margin:18px 0 8px">${BULAN[m - 1]} ${pubYear}</h3><div class="hp-grid">${xs.map(card).join('')}</div>`).join('') || `<div class="card empty">Tidak ada hari penting${pubPast ? '' : ' mendatang'} di tahun ${pubYear}.${pubPast ? '' : ' Pilih tahun berikutnya atau centang "Tampilkan yang sudah lewat".'}</div>`}`;
  $('#yr', main).onchange = (e) => { pubYear = +e.target.value; pagePublikasi(main); };
  $$('.tabs button', main).forEach((b) => (b.onclick = () => { pubFilter = b.dataset.k; pagePublikasi(main); }));
  $('#kelola', main).onclick = () => kelolaHari(main);
  $('#past', main).onchange = (e) => { pubPast = e.target.checked; pagePublikasi(main); };
}
function statusText(p) { if (p && p.ig_done && p.tiktok_done) return '✅ Sudah diunggah IG & TikTok'; if (p && (p.ig_done || p.tiktok_done)) return '🟡 Baru ' + (p.ig_done ? 'IG' : 'TikTok'); if (p && p.desain && p.desain !== '[]') return '🎨 Desain siap'; return '⏳ Belum dibuat'; }
function card(x) {
  const d = parseD(x.tanggal); const p = x.pub; const n = selisihHari(x.tanggal); const k = KAT[x.kategori] || ['Lainnya', 'gray'];
  return `<a class="hp ${n < 0 ? 'past' : ''}" href="#/publikasi/${x.id}/${x.tanggal.slice(0, 4)}"><div class="datebox ${n >= 0 && n <= (+state.settings.pengingat_hari || 7) ? 'gold' : x.kategori === 'libur' ? 'red' : ''}"><b>${d.getDate()}</b><span>${BULAN[d.getMonth()].slice(0, 3)}</span></div><div style="min-width:0"><b>${esc(x.nama)}</b><div class="small muted">${countdown(x.tanggal)}</div><div class="st"><span class="badge ${k[1]}">${k[0]}</span>${p && p.ig_done ? '<span class="badge green">IG ✓</span>' : ''}${p && p.tiktok_done ? '<span class="badge green">TikTok ✓</span>' : ''}${p && p.twibbon_file ? '<span class="badge gold">Twibbon</span>' : ''}</div></div></a>`;
}

async function kelolaHari(main) {
  const rows = await api('hari');
  const body = h(`<div><p class="small muted" style="margin-top:0">Hari bertanda <b>setiap tahun</b> otomatis muncul tiap tahun. Hari besar keagamaan yang tanggalnya berubah diisi per tahun (sudah terisi 2026–2027 sesuai SKB 3 Menteri). Tambahkan juga hari khusus sekolah, misalnya HUT ${esc(state.settings.singkatan || 'sekolah')}.</p>
    <div class="row" style="margin-bottom:10px"><button class="btn primary sm" id="addh">${icon('plus')} Tambah hari</button></div>
    <div class="tblwrap" style="max-height:60vh;overflow:auto"><table class="tbl"><thead><tr><th>Tanggal</th><th>Nama</th><th>Kategori</th><th>Aktif</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td style="white-space:nowrap">${r.tgl} ${BULAN[r.bulan - 1]} ${r.tahun || '<span class="badge gray">setiap tahun</span>'}</td><td>${esc(r.nama)}</td><td>${esc((KAT[r.kategori] || [r.kategori])[0])}</td><td><input type="checkbox" data-a="${r.id}" ${r.aktif ? 'checked' : ''}></td><td class="right" style="white-space:nowrap"><button class="btn sm" data-e="${r.id}">${icon('edit')}</button> <button class="btn sm danger" data-x="${r.id}">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div></div>`);
  const m = modal({ title: 'Kelola Daftar Hari Penting', wide: true, body });
  const F = [
    { name: 'nama', label: 'Nama hari', required: true, full: true },
    { name: 'tgl', label: 'Tanggal', type: 'number', min: 1, max: 31, required: true },
    { name: 'bulan', label: 'Bulan', type: 'select', options: BULAN.map((b, i) => [i + 1, b]) },
    { name: 'tahun', label: 'Tahun (kosongkan = setiap tahun)', type: 'number', hint: 'Isi untuk hari yang tanggalnya berubah tiap tahun (Idulfitri, Waisak, dll.)' },
    { name: 'kategori', label: 'Kategori', type: 'select', options: Object.entries(KAT).map(([k, v]) => [k, v[0]]) },
    { name: 'pesan', label: 'Pesan / tema default', type: 'textarea', rows: 2 },
    { name: 'hashtag', label: 'Hashtag utama', placeholder: '#HariGuruNasional', hint: 'Tahun ditambahkan otomatis' },
  ];
  const save = (r) => formModal({ title: r.id ? 'Edit Hari' : 'Tambah Hari', fields: F, values: r, onSubmit: async (d) => { d.tahun = d.tahun ? +d.tahun : null; d.bulan = +d.bulan; if (r.id) await api('hari/' + r.id, { method: 'PUT', body: d }); else await api('hari', { method: 'POST', body: { ...d, aktif: 1 } }); m.close(); toast('Tersimpan'); kelolaHari(main); pagePublikasi(main); } });
  $('#addh', body).onclick = () => save({ kategori: 'sekolah' });
  $$('[data-e]', body).forEach((b) => (b.onclick = () => save(rows.find((r) => r.id === +b.dataset.e))));
  $$('[data-x]', body).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus hari ini dari daftar?')) { await api('hari/' + b.dataset.x, { method: 'DELETE' }); b.closest('tr').remove(); pagePublikasi(main); } }));
  $$('[data-a]', body).forEach((c) => (c.onchange = async () => { await api('hari/' + c.dataset.a, { method: 'PUT', body: { aktif: c.checked ? 1 : 0 } }); pagePublikasi(main); }));
}

// ================= Caption =================
function emoji(h) { const n = h.nama; if (/Idul|Isra|Maulid|Islam|Santri/.test(n)) return '🌙'; if (/Natal/.test(n)) return '🎄'; if (/Waisak/.test(n)) return '🪷'; if (/Imlek/.test(n)) return '🧧'; if (/Nyepi|Wafat|Paskah|Kenaikan/.test(n)) return '🙏'; if (/Guru/.test(n)) return '👩‍🏫'; if (/Ibu|Kartini/.test(n)) return '🌷'; if (/Bumi|Lingkungan|Sampah/.test(n)) return '🌱'; if (/Olahraga/.test(n)) return '🏃'; if (/Buku|Pers/.test(n)) return '📚'; if (/Kesehatan|Gizi|AIDS/.test(n)) return '💚'; if (h.kategori === 'internasional') return '🌍'; if (h.kategori === 'lokal') return '🏛️'; return '🇮🇩'; }
function penutup(h) {
  if (h.kategori === 'keagamaan') return 'Semoga momentum ini membawa keberkahan, kedamaian, dan semakin mempererat persaudaraan di antara kita semua.';
  if (h.kategori === 'internasional') return 'Mari bersama-sama mengambil peran, dimulai dari langkah kecil di lingkungan sekolah kita.';
  if (h.kategori === 'lokal') return 'Mari terus berkontribusi dan berprestasi untuk kemajuan daerah tercinta.';
  return 'Mari jadikan momentum ini untuk terus menumbuhkan semangat cinta tanah air, belajar dengan sungguh-sungguh, dan berkarya untuk Indonesia.';
}
export function captions(h, tahun, tema, twibLink) {
  const s = state.settings; const e = emoji(h); const tag = (h.hashtag || '').trim(); const pre = prefixOf(h.nama);
  const tetap = (s.hashtag_tetap || '').trim();
  const msg = (tema || h.pesan || '').trim();
  const ig = `${e} ${pre} ${h.nama} ${tahun}!\n\n${msg ? `"${msg}"\n\n` : ''}Keluarga Besar ${s.nama_sekolah} mengucapkan ${pre.toLowerCase() === 'selamat' ? 'Selamat ' : 'selamat memperingati '}${h.nama} ${tahun}. ${penutup(h)}\n\n📅 ${tglPanjang(h.tanggal)}\n📍 ${s.nama_sekolah}\n🌐 ${s.website || ''}${twibLink ? `\n🖼️ Twibbon: ${twibLink}` : ''}\n\n${tag} ${tag}${tahun} ${tetap}`.trim();
  const tk = `${e} ${pre} ${h.nama} ${tahun}! ${msg ? msg + ' ' : ''}✨\n\nDari kami, keluarga besar ${s.nama_sekolah} 💙\n\n${tag} ${tag}${tahun} #SMAN1Purwoasri #${(s.singkatan || 'Smanesa').replace(/\s/g, '')} #Kediri #pelajarindonesia #fyp #fypシ`;
  const tw = `🎉 TWIBBON ${h.nama.toUpperCase()} ${tahun} 🎉\n\nHalo, Keluarga Besar ${s.nama_sekolah}! 👋\nYuk, meriahkan ${h.nama} ${tahun} dengan memasang twibbon resmi sekolah.\n\n📌 Cara memakai:\n1. Buka link: ${twibLink || '(link twibbon)'}\n2. Unggah foto terbaikmu\n3. Atur posisi & ukuran foto, lalu unduh\n4. Unggah ke Instagram, TikTok, atau status WhatsApp\n5. Tag @${s.instagram} dan gunakan tagar ${tag}${tahun}\n\n${msg ? `"${msg}"\n\n` : ''}${tag} ${tag}${tahun} #TwibbonSMAN1Purwoasri ${tetap}`;
  return { ig, tk, tw };
}

// ================= Studio =================
export async function pagePublikasiDetail(main, hid, tahun) {
  const { hari, pub: p0 } = await api(`publikasi/${hid}/${tahun}`);
  const pub = p0 || {};
  let desain = []; try { desain = JSON.parse(pub.desain || '[]'); } catch {}
  const twibLink = `${location.origin}/twibbon.html?h=${hid}&y=${tahun}`;
  const st = { format: 'feed', theme: autoTheme(hari), tema: pub.tema || hari.pesan || '', photo: null, photoCard: true };
  const imgs = await getImages(state.settings);
  const k = KAT[hari.kategori] || ['Lainnya', 'gray'];
  const n = selisihHari(hari.tanggal);
  const cap0 = captions(hari, tahun, st.tema, twibLink);

  main.innerHTML = `<div class="topbar"><div><a href="#/publikasi" class="small">← Semua hari penting</a><h1 style="margin-top:4px">${esc(hari.nama)} ${tahun}</h1><p class="muted">${tglPanjang(hari.tanggal)} · <b>${countdown(hari.tanggal)}</b> · <span class="badge ${k[1]}">${k[0]}</span> ${n >= 0 && n <= 3 ? '<span class="badge red">Segera unggah!</span>' : ''}</p></div>
    <div class="row"><a class="btn" href="https://www.instagram.com/" target="_blank">Buka Instagram</a><a class="btn" href="https://www.tiktok.com/upload" target="_blank">Buka TikTok Upload</a></div></div>

  <div class="card"><div class="sec-title"><span class="num">1</span><h2 style="margin:0">Studio Desain Otomatis</h2></div>
    <div class="studio"><div class="grid" style="gap:14px">
      <label class="f">Tema / pesan utama<textarea class="in" id="tema" rows="3">${esc(st.tema)}</textarea><span class="hint">Tampil sebagai kutipan di desain dan caption.</span></label>
      <div><b class="small">Format</b><div class="tabs" id="fmt" style="margin-top:6px;flex-wrap:wrap;width:auto">${Object.entries(FORMATS).map(([k2, f]) => `<button data-f="${k2}" class="${k2 === st.format ? 'on' : ''}">${f.label}</button>`).join('')}</div></div>
      <div><b class="small">Gaya warna</b><div class="tpl-pick" style="margin-top:6px">${Object.entries(THEMES).map(([k2, t]) => `<button data-t="${k2}" title="${t.name}" class="${k2 === st.theme ? 'on' : ''}" style="background:linear-gradient(135deg,${t.bg[0]},${t.bg[1]})"></button>`).join('')}</div></div>
      <div><b class="small">Foto kegiatan (opsional)</b><div class="row" style="margin-top:6px"><button class="btn sm" id="photo">${icon('img')} Pilih foto</button><button class="btn sm hide" id="nophoto">Hapus foto</button></div>
        <label class="row small" style="margin-top:6px;gap:6px"><input type="checkbox" id="pc" checked> Tampilkan sebagai bingkai foto (bukan latar)</label></div>
      <div class="grid" style="gap:8px">
        <button class="btn primary" id="dl" style="justify-content:center">${icon('dl')} Unduh PNG format ini</button>
        <button class="btn" id="dlall" style="justify-content:center">${icon('dl')} Unduh paket lengkap (Feed + Story + Twibbon)</button>
        <button class="btn" id="vid" style="justify-content:center">🎬 Buat video 6 detik untuk TikTok/Reels</button>
        <button class="btn gold" id="share" style="justify-content:center">📲 Bagikan langsung ke IG/TikTok (HP)</button>
        <button class="btn" id="save" style="justify-content:center">${icon('up')} Simpan ke galeri desain</button>
      </div>
    </div><div class="preview-wrap"><canvas id="cv"></canvas></div></div></div>

  <div class="card"><div class="sec-title"><span class="num">2</span><h2 style="margin:0">Galeri Desain</h2><span class="spacer"></span><button class="btn sm primary" id="upd">${icon('up')} Unggah desain sendiri (mis. dari ChatGPT)</button></div>
    <div id="gal"></div></div>

  <div class="card"><div class="sec-title"><span class="num">3</span><h2 style="margin:0">Caption</h2><span class="spacer"></span><button class="btn sm" id="regen">↻ Buat ulang dari template</button></div>
    <div class="grid g3">
      ${[['ig', 'Instagram', pub.caption_ig || cap0.ig], ['tk', 'TikTok', pub.caption_tiktok || cap0.tk], ['tw', 'Twibbon', pub.caption_twibbon || cap0.tw]].map(([key, label, v]) => `<div><div class="row" style="margin-bottom:6px"><b>${label}</b><span class="spacer"></span><button class="btn sm" data-copy="${key}">${icon('copy')} Salin</button></div><textarea class="in" id="cap_${key}" rows="14" style="font-size:.85rem">${esc(v)}</textarea></div>`).join('')}
    </div><div class="row" style="margin-top:10px"><span class="small muted">Caption tersimpan otomatis saat diubah.</span></div></div>

  <div class="card"><div class="sec-title"><span class="num">4</span><h2 style="margin:0">Twibbon Resmi</h2></div>
    <div class="grid g2"><div id="twb"></div>
    <div><p class="small muted" style="margin-top:0">Siswa, guru, dan wali murid bisa memasang foto mereka ke twibbon melalui link publik ini — tanpa aplikasi tambahan.</p>
    <div class="qrbox"><img src="${qrDataUrl(twibLink)}" alt="QR"><div style="flex:1;min-width:200px"><div class="linkbox">${esc(twibLink)}</div><div class="row" style="margin-top:8px"><button class="btn sm" id="cpt">${icon('copy')} Salin link</button><a class="btn sm" href="${twibLink}" target="_blank">Buka</a></div></div></div></div></div></div>

  <div class="card"><div class="sec-title"><span class="num">5</span><h2 style="margin:0">Status Unggah</h2></div>
    <div class="grid g2">
      <div><label class="row" style="gap:8px"><input type="checkbox" id="igd" ${pub.ig_done ? 'checked' : ''}> <b>Sudah diunggah ke Instagram</b></label><input class="in" id="igl" placeholder="Link postingan IG (opsional)" value="${esc(pub.ig_link || '')}" style="margin-top:6px"></div>
      <div><label class="row" style="gap:8px"><input type="checkbox" id="tkd" ${pub.tiktok_done ? 'checked' : ''}> <b>Sudah diunggah ke TikTok</b></label><input class="in" id="tkl" placeholder="Link video TikTok (opsional)" value="${esc(pub.tiktok_link || '')}" style="margin-top:6px"></div>
      <label class="f full">Catatan<textarea class="in" id="cat" rows="2">${esc(pub.catatan || '')}</textarea></label>
    </div></div>`;

  const cv = $('#cv', main);
  const opts = () => ({ hari, tahun, tema: st.tema, theme: st.theme, format: st.format, settings: state.settings, logo: imgs.logo, photo: st.photo, photoCard: st.photoCard });
  const draw = () => render(cv, opts());
  await draw();
  const slug = (f) => `${hari.nama} ${tahun} - ${FORMATS[f].label.replace(/[/:]/g, '-')}.png`;
  const canvasBlob = (c) => new Promise((r) => c.toBlob(r, 'image/png'));
  const renderTo = async (format) => { const c = document.createElement('canvas'); await render(c, { ...opts(), format }); return c; };

  const savePub = async (data) => { try { await api(`publikasi/${hid}/${tahun}`, { method: 'PUT', body: data }); } catch (e) { fail(e); } };
  let tt; $('#tema', main).oninput = (e) => { st.tema = e.target.value; draw(); clearTimeout(tt); tt = setTimeout(() => savePub({ tema: st.tema }), 1000); };
  $$('#fmt button', main).forEach((b) => (b.onclick = () => { st.format = b.dataset.f; $$('#fmt button', main).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $$('.tpl-pick button', main).forEach((b) => (b.onclick = () => { st.theme = b.dataset.t; $$('.tpl-pick button', main).forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  $('#photo', main).onclick = async () => { const [f] = await pickFile('image/*'); if (!f) return; const u = URL.createObjectURL(f); st.photo = await loadImg(u); $('#nophoto', main).classList.remove('hide'); draw(); };
  $('#nophoto', main).onclick = () => { st.photo = null; $('#nophoto', main).classList.add('hide'); draw(); };
  $('#pc', main).onchange = (e) => { st.photoCard = e.target.checked; draw(); };
  $('#dl', main).onclick = async () => downloadBlob(await canvasBlob(cv), slug(st.format));
  $('#dlall', main).onclick = async () => { for (const f of ['feed', 'story', 'twibbon']) { downloadBlob(await canvasBlob(await renderTo(f)), slug(f)); await new Promise((r) => setTimeout(r, 600)); } toast('3 file diunduh'); };
  $('#vid', main).onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true; b.textContent = '⏺ Merekam video (6 detik)…';
    try { const c = await renderTo('story'); const { blob, ext } = await recordVideo(c, 6); downloadBlob(blob, `${hari.nama} ${tahun} - TikTok.${ext}`); toast('Video siap' + (ext === 'webm' ? ' (format WEBM — TikTok web menerimanya)' : '')); } catch (er) { fail(er); }
    b.disabled = false; b.textContent = '🎬 Buat video 6 detik untuk TikTok/Reels';
  };
  $('#share', main).onclick = async () => {
    const files = [new File([await canvasBlob(await renderTo('feed'))], slug('feed'), { type: 'image/png' })];
    const text = $('#cap_ig', main).value;
    if (navigator.canShare && navigator.canShare({ files })) { await copyText(text); try { await navigator.share({ files, text }); } catch {} }
    else toast('Fitur bagikan langsung hanya tersedia di HP (Chrome Android / Safari iOS). Di komputer, unduh PNG lalu unggah manual.', true);
  };
  $('#save', main).onclick = async (e) => {
    const b = e.currentTarget; b.disabled = true;
    try { const id = await uploadFile(new File([await canvasBlob(cv)], slug(st.format), { type: 'image/png' })); desain.push({ id, label: FORMATS[st.format].label + ' · ' + THEMES[st.theme].name, src: 'auto' }); await savePub({ desain }); renderGal(); toast('Disimpan ke galeri'); } catch (er) { fail(er); }
    b.disabled = false;
  };

  // galeri
  function renderGal() {
    $('#gal', main).innerHTML = desain.length ? `<div class="thumbs">${desain.map((d, i) => `<div class="t"><a href="${fileUrl(d.id)}" target="_blank"><img src="${fileUrl(d.id)}" loading="lazy"></a><div class="a"><span>${esc(d.label || '')}</span><span style="white-space:nowrap"><a class="btn sm" href="${fileUrl(d.id)}" download="${esc(hari.nama)}-${i + 1}">${icon('dl')}</a> <button class="btn sm danger" data-gx="${i}">${icon('trash')}</button></span></div></div>`).join('')}</div>` : '<div class="empty">Belum ada desain tersimpan. Simpan desain otomatis di atas, atau unggah desain buatan Bapak/Ibu sendiri.</div>';
    $$('[data-gx]', main).forEach((b) => (b.onclick = async () => { if (!(await confirmBox('Hapus desain ini dari galeri?'))) return; const [d] = desain.splice(+b.dataset.gx, 1); await savePub({ desain }); api('files/' + d.id, { method: 'DELETE' }).catch(() => {}); renderGal(); }));
  }
  renderGal();
  $('#upd', main).onclick = async () => {
    const files = await pickFile('image/*,video/mp4', true); if (!files.length) return;
    try { for (const f of files) { if (f.size > 8 * 1024 * 1024) { toast(f.name + ' lebih dari 8 MB, dilewati', true); continue; } const id = await uploadFile(f); desain.push({ id, label: 'Unggahan: ' + f.name.slice(0, 24), src: 'upload' }); } await savePub({ desain }); renderGal(); toast('Desain diunggah'); } catch (e) { fail(e); }
  };

  // caption
  const capMap = { ig: 'caption_ig', tk: 'caption_tiktok', tw: 'caption_twibbon' };
  $$('[data-copy]', main).forEach((b) => (b.onclick = () => copyText($('#cap_' + b.dataset.copy, main).value)));
  Object.entries(capMap).forEach(([k2, field]) => { let t2; $('#cap_' + k2, main).oninput = (e) => { clearTimeout(t2); t2 = setTimeout(() => savePub({ [field]: e.target.value }), 900); }; });
  $('#regen', main).onclick = async () => { const c = captions(hari, tahun, st.tema, twibLink); $('#cap_ig', main).value = c.ig; $('#cap_tk', main).value = c.tk; $('#cap_tw', main).value = c.tw; await savePub({ caption_ig: c.ig, caption_tiktok: c.tk, caption_twibbon: c.tw }); toast('Caption dibuat ulang'); };
  if (!p0) savePub({ tema: st.tema, caption_ig: cap0.ig, caption_tiktok: cap0.tk, caption_twibbon: cap0.tw });

  // twibbon
  let twFile = pub.twibbon_file || '';
  function renderTw() {
    $('#twb', main).innerHTML = `${twFile ? `<div class="preview-wrap" style="padding:10px"><img src="${fileUrl(twFile)}" style="max-width:260px;width:100%"></div>` : '<div class="empty" style="padding:20px">Belum ada twibbon resmi.</div>'}
      <div class="row" style="margin-top:10px"><button class="btn sm primary" id="twgen">Pakai twibbon otomatis (gaya saat ini)</button><button class="btn sm" id="twup">${icon('up')} Unggah frame PNG sendiri</button></div><p class="hint">Frame unggahan harus PNG dengan bagian tengah transparan, ukuran persegi (mis. 1080×1080).</p>`;
    $('#twgen', main).onclick = async () => { const c = await renderTo('twibbon'); const id = await uploadFile(new File([await canvasBlob(c)], 'twibbon.png', { type: 'image/png' })); twFile = id; await savePub({ twibbon_file: id }); renderTw(); toast('Twibbon resmi disimpan — link publik aktif'); };
    $('#twup', main).onclick = async () => { const [f] = await pickFile('image/png'); if (!f) return; const id = await uploadFile(f); twFile = id; await savePub({ twibbon_file: id }); renderTw(); toast('Frame twibbon diunggah'); };
  }
  renderTw();
  $('#cpt', main).onclick = () => copyText(twibLink);

  // status
  const saveStatus = () => savePub({ ig_done: $('#igd', main).checked ? 1 : 0, tiktok_done: $('#tkd', main).checked ? 1 : 0, ig_link: $('#igl', main).value, tiktok_link: $('#tkl', main).value, catatan: $('#cat', main).value }).then(() => toast('Status disimpan'));
  ['#igd', '#tkd'].forEach((s) => ($(s, main).onchange = saveStatus));
  ['#igl', '#tkl', '#cat'].forEach((s) => ($(s, main).onchange = saveStatus));
}
