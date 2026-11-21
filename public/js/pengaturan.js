import { state, api, $, $$, esc, icon, toast, fail, formModal, confirmBox, pickFile, uploadFile, kopSrc, logoSrc } from './core.js';

const FIELDS = [
  ['Identitas sekolah', [['nama_sekolah', 'Nama sekolah'], ['singkatan', 'Singkatan / sebutan'], ['alamat', 'Alamat', true], ['kota', 'Kota tempat tanda tangan'], ['tahun_ajaran', 'Tahun ajaran aktif']]],
  ['Pejabat penanda tangan', [['kepsek_nama', 'Nama Kepala Sekolah'], ['kepsek_pangkat', 'Pangkat/Golongan'], ['kepsek_nip', 'NIP Kepala Sekolah'], ['humas_nama', 'Nama Wakasek/Koordinator Humas'], ['humas_nip', 'NIP Wakasek Humas'], ['kesiswaan_nama', 'Penanda tangan rekap prestasi (nama)'], ['kesiswaan_nip', 'NIP penanda tangan rekap prestasi'], ['kesiswaan_jabatan', 'Jabatan penanda tangan rekap prestasi']]],
  ['Media sosial & publikasi', [['instagram', 'Username Instagram (tanpa @)'], ['tiktok', 'Username TikTok (tanpa @)'], ['website', 'Website'], ['pengingat_hari', 'Pengingat publikasi (berapa hari sebelumnya)'], ['hashtag_tetap', 'Hashtag tetap di setiap caption', true]]],
];

export async function pagePengaturan(main) {
  const s = state.settings;
  const isAdmin = state.user.role === 'admin';
  const users = isAdmin ? await api('users') : [];
  main.innerHTML = `<div class="topbar"><div><h1>Pengaturan</h1><p class="muted">Identitas sekolah, kop surat, logo, dan akun petugas.</p></div></div>
  <div class="card"><h2>Kop Surat & Logo</h2>
    <div class="grid g2">
      <div><b class="small">Kop surat (dipakai di semua laporan PDF & Word)</b><div style="border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:#fff"><img src="${kopSrc()}" style="width:100%"></div>
        <div class="row"><button class="btn sm" id="kop">${icon('up')} Ganti kop (PNG/JPG)</button>${s.kop_file ? '<button class="btn sm" id="kopd">Kembalikan bawaan</button>' : ''}</div><p class="hint">Gunakan gambar kop lebar resolusi tinggi (mis. 2000×420 px) agar tajam saat dicetak.</p></div>
      <div><b class="small">Logo (sidebar, desain publikasi & twibbon)</b><div style="border:1px solid var(--line);border-radius:10px;padding:10px;margin:8px 0;background:#fff;text-align:center"><img src="${logoSrc()}" style="height:110px"></div>
        <div class="row"><button class="btn sm" id="logo">${icon('up')} Ganti logo (PNG transparan)</button>${s.logo_file ? '<button class="btn sm" id="logod">Kembalikan bawaan</button>' : ''}</div><p class="hint">Disarankan logo sekolah PNG transparan ≥ 500 px.</p></div>
    </div></div>
  <form id="sf">${FIELDS.map(([title, fs]) => `<div class="card"><h2>${title}</h2><div class="form">${fs.map(([k, l, full]) => `<label class="f ${full ? 'full' : ''}">${l}<input name="${k}" value="${esc(s[k] || '')}"></label>`).join('')}</div></div>`).join('')}
  <div class="card row"><span class="muted small">Perubahan berlaku untuk laporan, desain, dan caption berikutnya.</span><span class="spacer"></span><button class="btn primary">Simpan Pengaturan</button></div></form>
  <div class="card"><div class="row"><h2 style="margin:0">Akun Petugas</h2><span class="spacer"></span><button class="btn sm" id="pw">Ganti password saya</button>${isAdmin ? `<button class="btn sm primary" id="addu">${icon('plus')} Tambah akun</button>` : ''}</div>
  ${isAdmin ? `<div class="tblwrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th></th></tr></thead><tbody>${users.map((u) => `<tr><td>${esc(u.nama)}</td><td>${esc(u.username)}</td><td><span class="badge">${esc(u.role)}</span></td><td class="right"><button class="btn sm" data-r="${u.id}">Reset password</button> ${u.id === state.user.id ? '' : `<button class="btn sm danger" data-x="${u.id}">${icon('trash')}</button>`}</td></tr>`).join('')}</tbody></table></div>` : ''}</div>`;

  const setFile = async (key, accept) => { const [f] = await pickFile(accept); if (!f) return; try { const id = await uploadFile(f); state.settings = await api('settings', { method: 'PUT', body: { [key]: id } }); toast('Tersimpan'); pagePengaturan(main); } catch (e) { fail(e); } };
  $('#kop', main).onclick = () => setFile('kop_file', 'image/png,image/jpeg');
  $('#logo', main).onclick = () => setFile('logo_file', 'image/png,image/jpeg');
  $('#kopd', main)?.addEventListener('click', async () => { state.settings = await api('settings', { method: 'PUT', body: { kop_file: '' } }); pagePengaturan(main); });
  $('#logod', main)?.addEventListener('click', async () => { state.settings = await api('settings', { method: 'PUT', body: { logo_file: '' } }); pagePengaturan(main); });
  $('#sf', main).onsubmit = async (e) => { e.preventDefault(); try { state.settings = await api('settings', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) }); toast('Pengaturan disimpan'); } catch (er) { fail(er); } };
  $('#pw', main).onclick = () => formModal({ title: 'Ganti Password', fields: [{ name: 'lama', label: 'Password lama', type: 'password', required: true, full: true }, { name: 'baru', label: 'Password baru (min. 6)', type: 'password', required: true, full: true }], onSubmit: async (d) => { await api('password', { method: 'POST', body: d }); toast('Password diganti'); } });
  $('#addu', main)?.addEventListener('click', () => formModal({ title: 'Tambah Akun Petugas', fields: [{ name: 'nama', label: 'Nama', required: true, full: true }, { name: 'username', label: 'Username', required: true }, { name: 'password', label: 'Password (min. 6)', type: 'password', required: true }, { name: 'role', label: 'Peran', type: 'select', options: [['admin', 'Admin (semua akses)'], ['operator', 'Operator (tanpa kelola akun)']] }], onSubmit: async (d) => { await api('users', { method: 'POST', body: d }); toast('Akun ditambahkan'); pagePengaturan(main); } }));
  $$('[data-r]', main).forEach((b) => (b.onclick = () => formModal({ title: 'Reset Password', fields: [{ name: 'password', label: 'Password baru (min. 6)', type: 'password', required: true, full: true }], onSubmit: async (d) => { await api('users/' + b.dataset.r, { method: 'PUT', body: d }); toast('Password direset'); } })));
  $$('[data-x]', main).forEach((b) => (b.onclick = async () => { if (await confirmBox('Hapus akun ini?')) { await api('users/' + b.dataset.x, { method: 'DELETE' }); pagePengaturan(main); } }));
}
