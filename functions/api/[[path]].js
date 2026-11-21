// =====================================================================
//  HUMAS SMA Negeri 1 Purwoasri — API (Cloudflare Pages Functions + D1)
//  Binding D1 yang dibutuhkan: DB
//  Semua tabel dibuat otomatis saat pertama kali API diakses.
// =====================================================================

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, nama TEXT, role TEXT DEFAULT 'admin', salt TEXT, hash TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER, expires INTEGER)`,
  `CREATE TABLE IF NOT EXISTS settings (k TEXT PRIMARY KEY, v TEXT)`,
  `CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT, type TEXT, size INTEGER, chunks INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS file_chunks (file_id TEXT, idx INTEGER, data TEXT, PRIMARY KEY (file_id, idx))`,
  `CREATE TABLE IF NOT EXISTS agenda (id INTEGER PRIMARY KEY AUTOINCREMENT, tanggal TEXT, tanggal_selesai TEXT, waktu TEXT, kegiatan TEXT, tempat TEXT, pj TEXT, kategori TEXT, keterangan TEXT, status TEXT DEFAULT 'terjadwal', created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS proker (id INTEGER PRIMARY KEY AUTOINCREMENT, tahun_ajaran TEXT, bidang TEXT, program TEXT, tujuan TEXT, sasaran TEXT, waktu TEXT, pj TEXT, anggaran INTEGER DEFAULT 0, indikator TEXT, status TEXT DEFAULT 'rencana', progres INTEGER DEFAULT 0, urut INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS rapat (id INTEGER PRIMARY KEY AUTOINCREMENT, judul TEXT, nomor TEXT, jenis TEXT, tanggal TEXT, waktu_mulai TEXT, waktu_selesai TEXT, tempat TEXT, pimpinan TEXT, pimpinan_jabatan TEXT, notulis TEXT, notulis_nip TEXT, undangan TEXT, agenda TEXT, pembukaan TEXT, pembahasan TEXT, keputusan TEXT, tindak_lanjut TEXT, penutup TEXT, ttd_pimpinan TEXT, ttd_notulis TEXT, mengetahui INTEGER DEFAULT 1, token TEXT UNIQUE, status TEXT DEFAULT 'draft', created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS rapat_hadir (id INTEGER PRIMARY KEY AUTOINCREMENT, rapat_id INTEGER, nama TEXT, jabatan TEXT, unsur TEXT, ttd TEXT, waktu TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS rapat_foto (id INTEGER PRIMARY KEY AUTOINCREMENT, rapat_id INTEGER, file_id TEXT, keterangan TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS hari_penting (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, bulan INTEGER, tgl INTEGER, tahun INTEGER, kategori TEXT, pesan TEXT, hashtag TEXT, aktif INTEGER DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS publikasi (id INTEGER PRIMARY KEY AUTOINCREMENT, hari_id INTEGER, tahun INTEGER, tema TEXT, caption_ig TEXT, caption_tiktok TEXT, caption_twibbon TEXT, desain TEXT, twibbon_file TEXT, ig_done INTEGER DEFAULT 0, tiktok_done INTEGER DEFAULT 0, ig_link TEXT, tiktok_link TEXT, catatan TEXT, updated_at TEXT, UNIQUE(hari_id, tahun))`,
  `CREATE TABLE IF NOT EXISTS guru (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, nip TEXT, tgl_lahir TEXT, jk TEXT, jabatan TEXT, agama TEXT, foto_file TEXT, aktif INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS ucapan (id INTEGER PRIMARY KEY AUTOINCREMENT, guru_id INTEGER, tahun INTEGER, gaya TEXT, pesan TEXT, caption_ig TEXT, caption_wa TEXT, desain TEXT, ig_done INTEGER DEFAULT 0, wa_done INTEGER DEFAULT 0, updated_at TEXT, UNIQUE(guru_id, tahun))`,
  `CREATE TABLE IF NOT EXISTS prestasi (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT, anggota TEXT, kelas TEXT, prestasi TEXT, tingkat TEXT, tanggal TEXT, tgl TEXT, tahun INTEGER, kategori TEXT, keterangan TEXT, piagam_file TEXT, foto_file TEXT, dipublikasi INTEGER DEFAULT 0, caption TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_hadir_rapat ON rapat_hadir(rapat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_foto_rapat ON rapat_foto(rapat_id)`,
  `CREATE INDEX IF NOT EXISTS idx_agenda_tgl ON agenda(tanggal)`,
];

// ---- Hari penting nasional (tanggal tetap) -------------------------------
// [bulan, tgl, nama, kategori, pesan singkat]
const HARI_TETAP = [
  [1, 1, 'Tahun Baru Masehi', 'libur', 'Semoga tahun yang baru membawa semangat baru dalam belajar dan berkarya.'],
  [1, 25, 'Hari Gizi Nasional', 'nasional', 'Generasi sehat berawal dari gizi seimbang setiap hari.'],
  [2, 9, 'Hari Pers Nasional', 'nasional', 'Pers yang merdeka dan bertanggung jawab adalah pilar demokrasi.'],
  [2, 21, 'Hari Peduli Sampah Nasional', 'nasional', 'Kurangi, pilah, dan olah sampah mulai dari sekolah kita.'],
  [3, 1, 'Hari Penegakan Kedaulatan Negara', 'nasional', 'Meneladani semangat Serangan Umum 1 Maret dalam menjaga kedaulatan bangsa.'],
  [3, 9, 'Hari Musik Nasional', 'nasional', 'Musik Indonesia, identitas dan kebanggaan bangsa.'],
  [3, 25, 'Hari Jadi Kabupaten Kediri', 'lokal', 'Bersama membangun Kabupaten Kediri yang maju dan berbudaya.'],
  [4, 21, 'Hari Kartini', 'nasional', 'Habis gelap terbitlah terang — perempuan Indonesia berdaya dan berprestasi.'],
  [4, 22, 'Hari Bumi', 'internasional', 'Jaga bumi, rawat masa depan generasi kita.'],
  [5, 1, 'Hari Buruh Internasional', 'libur', 'Menghargai setiap kerja keras yang membangun negeri.'],
  [5, 2, 'Hari Pendidikan Nasional', 'nasional', 'Ing ngarsa sung tuladha, ing madya mangun karsa, tut wuri handayani.'],
  [5, 17, 'Hari Buku Nasional', 'nasional', 'Buku adalah jendela dunia — mari tumbuhkan budaya literasi.'],
  [5, 20, 'Hari Kebangkitan Nasional', 'nasional', 'Bangkit bersama, bergerak maju untuk Indonesia.'],
  [6, 1, 'Hari Lahir Pancasila', 'libur', 'Pancasila dalam tindakan, bersatu untuk Indonesia.'],
  [6, 5, 'Hari Lingkungan Hidup Sedunia', 'internasional', 'Sekolah hijau, lingkungan sehat, generasi hebat.'],
  [6, 26, 'Hari Anti Narkotika Internasional', 'internasional', 'Pelajar hebat, pelajar tanpa narkoba.'],
  [6, 29, 'Hari Keluarga Nasional', 'nasional', 'Keluarga adalah sekolah pertama dan utama.'],
  [7, 1, 'Hari Bhayangkara', 'nasional', 'Bersama Polri menjaga keamanan dan ketertiban masyarakat.'],
  [7, 12, 'Hari Koperasi Nasional', 'nasional', 'Koperasi sebagai soko guru perekonomian bangsa.'],
  [7, 23, 'Hari Anak Nasional', 'nasional', 'Anak terlindungi, Indonesia maju.'],
  [8, 10, 'Hari Kebangkitan Teknologi Nasional', 'nasional', 'Inovasi dan teknologi untuk kemajuan bangsa.'],
  [8, 14, 'Hari Pramuka', 'nasional', 'Satyaku kudarmakan, darmaku kubaktikan.'],
  [8, 17, 'HUT Kemerdekaan Republik Indonesia', 'libur', 'Merdeka! Mari isi kemerdekaan dengan prestasi dan karya.'],
  [8, 18, 'Hari Konstitusi', 'nasional', 'Taat konstitusi, wujud cinta pada negeri.'],
  [9, 9, 'Hari Olahraga Nasional', 'nasional', 'Ayo berolahraga — tubuh sehat, jiwa kuat, prestasi hebat.'],
  [10, 1, 'Hari Kesaktian Pancasila', 'nasional', 'Pancasila tetap sakti, persatuan Indonesia abadi.'],
  [10, 2, 'Hari Batik Nasional', 'nasional', 'Bangga berbatik, lestarikan warisan budaya Indonesia.'],
  [10, 5, 'HUT Tentara Nasional Indonesia', 'nasional', 'TNI kuat bersama rakyat, menjaga kedaulatan NKRI.'],
  [10, 12, 'Hari Jadi Provinsi Jawa Timur', 'lokal', 'Jatim maju, Jatim berprestasi.'],
  [10, 22, 'Hari Santri', 'nasional', 'Santri siaga jiwa raga untuk Indonesia.'],
  [10, 28, 'Hari Sumpah Pemuda', 'nasional', 'Satu nusa, satu bangsa, satu bahasa: Indonesia.'],
  [11, 10, 'Hari Pahlawan', 'nasional', 'Teladani pahlawanmu, cintai negerimu.'],
  [11, 12, 'Hari Kesehatan Nasional', 'nasional', 'Sehat adalah investasi masa depan.'],
  [11, 25, 'Hari Guru Nasional', 'nasional', 'Terima kasih guruku, pelita dalam kegelapan, pahlawan tanpa tanda jasa.'],
  [12, 1, 'Hari AIDS Sedunia', 'internasional', 'Kenali, cegah, dan jauhi stigma.'],
  [12, 3, 'Hari Disabilitas Internasional', 'internasional', 'Pendidikan inklusif, setara untuk semua.'],
  [12, 9, 'Hari Antikorupsi Sedunia', 'internasional', 'Berani jujur itu hebat — mulai dari sekolah.'],
  [12, 19, 'Hari Bela Negara', 'nasional', 'Bela negara dimulai dari disiplin dan prestasi pelajar.'],
  [12, 22, 'Hari Ibu', 'nasional', 'Kasih ibu sepanjang masa — terima kasih, Ibu.'],
  [12, 25, 'Hari Raya Natal', 'keagamaan', 'Selamat Natal bagi yang merayakan, damai di hati damai di bumi.'],
];

// Hari besar keagamaan (tanggal berubah tiap tahun) — sesuai SKB 3 Menteri
// [tahun, bulan, tgl, nama, kategori, pesan]
const HARI_TAHUNAN = [
  [2026, 1, 16, 'Isra Mikraj Nabi Muhammad SAW', 'keagamaan', 'Menguatkan iman dan menjaga salat lima waktu.'],
  [2026, 2, 17, 'Tahun Baru Imlek', 'keagamaan', 'Gong Xi Fa Cai — semoga sejahtera dan penuh berkah.'],
  [2026, 3, 19, 'Hari Suci Nyepi', 'keagamaan', 'Selamat Hari Suci Nyepi, semoga damai dan hening membawa kebaikan.'],
  [2026, 3, 21, 'Hari Raya Idulfitri', 'keagamaan', 'Taqabbalallahu minna wa minkum. Mohon maaf lahir dan batin.'],
  [2026, 4, 3, 'Wafat Yesus Kristus', 'keagamaan', 'Selamat memperingati Jumat Agung bagi yang merayakan.'],
  [2026, 4, 5, 'Hari Paskah', 'keagamaan', 'Selamat Paskah bagi yang merayakan.'],
  [2026, 5, 14, 'Kenaikan Yesus Kristus', 'keagamaan', 'Selamat memperingati Kenaikan Yesus Kristus.'],
  [2026, 5, 27, 'Hari Raya Iduladha', 'keagamaan', 'Semangat berkurban, semangat berbagi.'],
  [2026, 5, 31, 'Hari Raya Waisak', 'keagamaan', 'Selamat Hari Raya Waisak, semoga semua makhluk berbahagia.'],
  [2026, 6, 16, 'Tahun Baru Islam', 'keagamaan', 'Hijrah menuju pribadi yang lebih baik.'],
  [2026, 8, 25, 'Maulid Nabi Muhammad SAW', 'keagamaan', 'Meneladani akhlak mulia Rasulullah SAW.'],
  [2027, 1, 5, 'Isra Mikraj Nabi Muhammad SAW', 'keagamaan', 'Menguatkan iman dan menjaga salat lima waktu.'],
  [2027, 2, 6, 'Tahun Baru Imlek', 'keagamaan', 'Gong Xi Fa Cai — semoga sejahtera dan penuh berkah.'],
  [2027, 3, 8, 'Hari Suci Nyepi', 'keagamaan', 'Selamat Hari Suci Nyepi, semoga damai dan hening membawa kebaikan.'],
  [2027, 3, 10, 'Hari Raya Idulfitri', 'keagamaan', 'Taqabbalallahu minna wa minkum. Mohon maaf lahir dan batin.'],
  [2027, 3, 26, 'Wafat Yesus Kristus', 'keagamaan', 'Selamat memperingati Jumat Agung bagi yang merayakan.'],
  [2027, 3, 28, 'Hari Paskah', 'keagamaan', 'Selamat Paskah bagi yang merayakan.'],
  [2027, 5, 6, 'Kenaikan Yesus Kristus', 'keagamaan', 'Selamat memperingati Kenaikan Yesus Kristus.'],
  [2027, 5, 17, 'Hari Raya Iduladha', 'keagamaan', 'Semangat berkurban, semangat berbagi.'],
  [2027, 5, 20, 'Hari Raya Waisak', 'keagamaan', 'Selamat Hari Raya Waisak, semoga semua makhluk berbahagia.'],
  [2027, 6, 6, 'Tahun Baru Islam', 'keagamaan', 'Hijrah menuju pribadi yang lebih baik.'],
  [2027, 8, 15, 'Maulid Nabi Muhammad SAW', 'keagamaan', 'Meneladani akhlak mulia Rasulullah SAW.'],
  [2027, 12, 26, 'Isra Mikraj Nabi Muhammad SAW', 'keagamaan', 'Menguatkan iman dan menjaga salat lima waktu.'],
];

const DEFAULT_SETTINGS = {
  nama_sekolah: 'SMA Negeri 1 Purwoasri',
  singkatan: 'Smanesa',
  alamat: 'Jalan Pahlawan, Ds. Ketawang, Kec. Purwoasri, Kab. Kediri, Jawa Timur 64154',
  kota: 'Purwoasri',
  kepsek_nama: 'SUDARMAJI, S.Sos.',
  kepsek_pangkat: 'Penata Tingkat I (III/d)',
  kepsek_nip: '',
  humas_nama: '',
  humas_nip: '',
  instagram: 'sman1purwoasri',
  tiktok: 'sman1purwoasri',
  website: 'www.sman1purwoasri.sch.id',
  hashtag_tetap: '#SMAN1Purwoasri #Smanesa #SMANegeri1Purwoasri #KabupatenKediri #CabdinKediri #DindikJatim',
  pengingat_hari: '7',
  kop_file: '',
  logo_file: '',
  tahun_ajaran: '2026/2027',
  kesiswaan_nama: '',
  kesiswaan_nip: '',
  kesiswaan_jabatan: 'Waka Kesiswaan',
};

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch(SCHEMA.map((s) => db.prepare(s)));
  const c = await db.prepare('SELECT COUNT(*) n FROM hari_penting').first();
  if (!c.n) {
    const stmts = [];
    for (const [b, t, n, k, p] of HARI_TETAP)
      stmts.push(db.prepare('INSERT INTO hari_penting (nama,bulan,tgl,tahun,kategori,pesan,hashtag) VALUES (?,?,?,?,?,?,?)').bind(n, b, t, null, k, p, tagOf(n)));
    for (const [y, b, t, n, k, p] of HARI_TAHUNAN)
      stmts.push(db.prepare('INSERT INTO hari_penting (nama,bulan,tgl,tahun,kategori,pesan,hashtag) VALUES (?,?,?,?,?,?,?)').bind(n, b, t, y, k, p, tagOf(n)));
    await db.batch(stmts);
  }
  const s = await db.prepare('SELECT COUNT(*) n FROM settings').first();
  if (!s.n) {
    await db.batch(Object.entries(DEFAULT_SETTINGS).map(([k, v]) => db.prepare('INSERT OR IGNORE INTO settings (k,v) VALUES (?,?)').bind(k, v)));
  }
  schemaReady = true;
}

function tagOf(nama) {
  return '#' + nama.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
}

// ---- helpers --------------------------------------------------------------
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const err = (msg, status = 400) => json({ error: msg }, status);
const enc = new TextEncoder();
const b64 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const rid = (n = 24) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((x) => x.toString(36).padStart(2, '0')).join('').slice(0, n); };

async function hashPw(pw, salt) {
  const key = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, key, 256);
  return b64(bits);
}

async function getUser(req, db) {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  const row = await db.prepare('SELECT u.id,u.username,u.nama,u.role,s.expires FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=?').bind(token).first();
  if (!row || row.expires < Date.now()) return null;
  return row;
}

async function getSettings(db) {
  const { results } = await db.prepare('SELECT k,v FROM settings').all();
  const o = { ...DEFAULT_SETTINGS };
  for (const r of results) o[r.k] = r.v;
  return o;
}

const pick = (obj, keys) => { const o = {}; for (const k of keys) if (k in obj) o[k] = obj[k] === undefined ? null : obj[k]; return o; };

async function insertRow(db, table, data) {
  const ks = Object.keys(data);
  const r = await db.prepare(`INSERT INTO ${table} (${ks.join(',')}) VALUES (${ks.map(() => '?').join(',')})`).bind(...ks.map((k) => data[k])).run();
  return r.meta.last_row_id;
}
async function updateRow(db, table, id, data) {
  const ks = Object.keys(data);
  if (!ks.length) return;
  await db.prepare(`UPDATE ${table} SET ${ks.map((k) => k + '=?').join(',')} WHERE id=?`).bind(...ks.map((k) => data[k]), id).run();
}

// ---- file storage (disimpan di D1 dalam potongan base64) ----------------
const CHUNK = 900000;
async function saveFile(db, name, type, buf) {
  const id = rid(20);
  const data = b64(buf);
  const parts = [];
  for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
  const st = [db.prepare('INSERT INTO files (id,name,type,size,chunks) VALUES (?,?,?,?,?)').bind(id, name, type, buf.byteLength, parts.length)];
  parts.forEach((p, i) => st.push(db.prepare('INSERT INTO file_chunks (file_id,idx,data) VALUES (?,?,?)').bind(id, i, p)));
  await db.batch(st);
  return id;
}
async function deleteFile(db, id) {
  if (!id) return;
  await db.batch([db.prepare('DELETE FROM file_chunks WHERE file_id=?').bind(id), db.prepare('DELETE FROM files WHERE id=?').bind(id)]);
}
async function serveFile(db, id) {
  const f = await db.prepare('SELECT * FROM files WHERE id=?').bind(id).first();
  if (!f) return new Response('Not found', { status: 404 });
  const { results } = await db.prepare('SELECT data FROM file_chunks WHERE file_id=? ORDER BY idx').bind(id).all();
  const bytes = unb64(results.map((r) => r.data).join(''));
  return new Response(bytes, { headers: { 'content-type': f.type || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable', 'content-disposition': `inline; filename="${(f.name || 'file').replace(/"/g, '')}"` } });
}

// ---- tanggal hari penting untuk tahun tertentu -------------------------
function hariUntukTahun(rows, tahun) {
  return rows
    .filter((r) => r.aktif && (r.tahun == null || r.tahun === tahun))
    .map((r) => ({ ...r, tanggal: `${tahun}-${String(r.bulan).padStart(2, '0')}-${String(r.tgl).padStart(2, '0')}` }))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
}

// =====================================================================
export async function onRequest(ctx) {
  const { request: req, env } = ctx;
  const db = env.DB;
  if (!db) return err('Binding D1 "DB" belum dipasang di pengaturan Cloudflare Pages.', 500);
  try {
    await ensureSchema(db);
    return await route(req, db);
  } catch (e) {
    return err('Kesalahan server: ' + (e && e.message ? e.message : e), 500);
  }
}

async function route(req, db) {
  const url = new URL(req.url);
  const p = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '').split('/').filter(Boolean);
  const m = req.method;
  const body = async () => { try { return await req.json(); } catch { return {}; } };

  // ---------- PUBLIK ----------
  if (p[0] === 'status' && m === 'GET') {
    const n = await db.prepare('SELECT COUNT(*) n FROM users').first();
    return json({ needSetup: !n.n, settings: await getSettings(db) });
  }
  if (p[0] === 'setup' && m === 'POST') {
    const n = await db.prepare('SELECT COUNT(*) n FROM users').first();
    if (n.n) return err('Admin sudah dibuat.', 403);
    const b = await body();
    if (!b.username || !b.password || b.password.length < 6) return err('Username & password (min. 6 karakter) wajib diisi.');
    const salt = rid(16);
    await db.prepare('INSERT INTO users (username,nama,role,salt,hash) VALUES (?,?,?,?,?)').bind(b.username.trim().toLowerCase(), b.nama || b.username, 'admin', salt, await hashPw(b.password, salt)).run();
    return json({ ok: true });
  }
  if (p[0] === 'login' && m === 'POST') {
    const b = await body();
    const u = await db.prepare('SELECT * FROM users WHERE username=?').bind((b.username || '').trim().toLowerCase()).first();
    if (!u || (await hashPw(b.password || '', u.salt)) !== u.hash) return err('Username atau password salah.', 401);
    const token = rid(40);
    await db.prepare('INSERT INTO sessions (token,user_id,expires) VALUES (?,?,?)').bind(token, u.id, Date.now() + 1000 * 60 * 60 * 24 * 30).run();
    await db.prepare('DELETE FROM sessions WHERE expires < ?').bind(Date.now()).run();
    return json({ token, user: { id: u.id, username: u.username, nama: u.nama, role: u.role } });
  }
  if (p[0] === 'file' && p[1] && m === 'GET') return serveFile(db, p[1]);

  if (p[0] === 'agenda' && m === 'GET') {
    const from = url.searchParams.get('from') || '0000';
    const to = url.searchParams.get('to') || '9999';
    const { results } = await db.prepare('SELECT * FROM agenda WHERE tanggal >= ? AND tanggal <= ? ORDER BY tanggal, waktu').bind(from, to).all();
    return json(results);
  }
  if (p[0] === 'proker' && m === 'GET') {
    const ta = url.searchParams.get('tahun');
    const q = ta ? db.prepare('SELECT * FROM proker WHERE tahun_ajaran=? ORDER BY bidang, urut, id').bind(ta) : db.prepare('SELECT * FROM proker ORDER BY tahun_ajaran DESC, bidang, urut, id');
    const { results } = await q.all();
    const { results: tahun } = await db.prepare('SELECT DISTINCT tahun_ajaran FROM proker ORDER BY tahun_ajaran DESC').all();
    return json({ items: results, tahun: tahun.map((t) => t.tahun_ajaran) });
  }
  if (p[0] === 'hari-publik' && m === 'GET') {
    const tahun = +(url.searchParams.get('tahun') || new Date().getFullYear());
    const { results } = await db.prepare('SELECT id,nama,bulan,tgl,tahun,kategori,aktif FROM hari_penting').all();
    return json(hariUntukTahun(results, tahun));
  }
  if (p[0] === 'prestasi' && !p[1] && m === 'GET' && !(req.headers.get('authorization') || '').startsWith('Bearer ')) {
    const { results } = await db.prepare('SELECT id,nama,anggota,kelas,prestasi,tingkat,tanggal,tgl,tahun,kategori,foto_file FROM prestasi ORDER BY tahun DESC, COALESCE(tgl, tanggal) DESC, id DESC').all();
    return json(results);
  }
  if (p[0] === 'public' && p[1] === 'ttd' && p[2]) {
    const r = await db.prepare('SELECT id,judul,tanggal,waktu_mulai,tempat,status FROM rapat WHERE token=?').bind(p[2]).first();
    if (!r) return err('Link tanda tangan tidak valid.', 404);
    if (m === 'GET') {
      const { results } = await db.prepare('SELECT nama,jabatan,waktu FROM rapat_hadir WHERE rapat_id=? ORDER BY id').bind(r.id).all();
      return json({ rapat: r, hadir: results });
    }
    if (m === 'POST') {
      if (r.status === 'final') return err('Rapat sudah dikunci (final). Hubungi notulis.', 403);
      const b = await body();
      if (!b.nama || !b.ttd) return err('Nama dan tanda tangan wajib diisi.');
      if (b.ttd.length > 400000) return err('Tanda tangan terlalu besar.');
      const dup = await db.prepare('SELECT id FROM rapat_hadir WHERE rapat_id=? AND lower(nama)=lower(?)').bind(r.id, b.nama.trim()).first();
      if (dup) return err('Nama ini sudah mengisi daftar hadir.', 409);
      await db.prepare('INSERT INTO rapat_hadir (rapat_id,nama,jabatan,unsur,ttd) VALUES (?,?,?,?,?)').bind(r.id, b.nama.trim(), (b.jabatan || '').trim(), b.unsur || '', b.ttd).run();
      return json({ ok: true });
    }
  }
  if (p[0] === 'public' && p[1] === 'twibbon' && p[2] && p[3] && m === 'GET') {
    const h = await db.prepare('SELECT * FROM hari_penting WHERE id=?').bind(+p[2]).first();
    const pub = await db.prepare('SELECT twibbon_file, caption_twibbon, tema FROM publikasi WHERE hari_id=? AND tahun=?').bind(+p[2], +p[3]).first();
    if (!h || !pub || !pub.twibbon_file) return err('Twibbon belum tersedia.', 404);
    const s = await getSettings(db);
    return json({ nama: h.nama, tahun: +p[3], tema: pub.tema, frame: pub.twibbon_file, sekolah: s.nama_sekolah, instagram: s.instagram });
  }

  // ---------- PERLU LOGIN ----------
  const user = await getUser(req, db);
  if (!user) return err('Silakan login terlebih dahulu.', 401);

  if (p[0] === 'me') return json(user);
  if (p[0] === 'logout' && m === 'POST') {
    await db.prepare('DELETE FROM sessions WHERE token=?').bind((req.headers.get('authorization') || '').slice(7)).run();
    return json({ ok: true });
  }
  if (p[0] === 'password' && m === 'POST') {
    const b = await body();
    const u = await db.prepare('SELECT * FROM users WHERE id=?').bind(user.id).first();
    if ((await hashPw(b.lama || '', u.salt)) !== u.hash) return err('Password lama salah.');
    if (!b.baru || b.baru.length < 6) return err('Password baru minimal 6 karakter.');
    const salt = rid(16);
    await db.prepare('UPDATE users SET salt=?, hash=? WHERE id=?').bind(salt, await hashPw(b.baru, salt), user.id).run();
    return json({ ok: true });
  }

  // users (admin)
  if (p[0] === 'users') {
    if (user.role !== 'admin') return err('Hanya admin.', 403);
    if (m === 'GET') return json((await db.prepare('SELECT id,username,nama,role,created_at FROM users ORDER BY id').all()).results);
    if (m === 'POST') {
      const b = await body();
      if (!b.username || !b.password || b.password.length < 6) return err('Username & password (min. 6) wajib.');
      const salt = rid(16);
      try {
        await db.prepare('INSERT INTO users (username,nama,role,salt,hash) VALUES (?,?,?,?,?)').bind(b.username.trim().toLowerCase(), b.nama || b.username, b.role === 'operator' ? 'operator' : 'admin', salt, await hashPw(b.password, salt)).run();
      } catch { return err('Username sudah dipakai.'); }
      return json({ ok: true });
    }
    if (m === 'PUT' && p[1]) {
      const b = await body();
      if (b.password) {
        if (b.password.length < 6) return err('Password minimal 6 karakter.');
        const salt = rid(16);
        await db.prepare('UPDATE users SET salt=?, hash=? WHERE id=?').bind(salt, await hashPw(b.password, salt), +p[1]).run();
      }
      if (b.nama || b.role) await updateRow(db, 'users', +p[1], pick(b, ['nama', 'role']));
      return json({ ok: true });
    }
    if (m === 'DELETE' && p[1]) {
      if (+p[1] === user.id) return err('Tidak bisa menghapus akun sendiri.');
      await db.batch([db.prepare('DELETE FROM users WHERE id=?').bind(+p[1]), db.prepare('DELETE FROM sessions WHERE user_id=?').bind(+p[1])]);
      return json({ ok: true });
    }
  }

  if (p[0] === 'settings' && m === 'PUT') {
    const b = await body();
    const st = Object.entries(b).filter(([k]) => k in DEFAULT_SETTINGS).map(([k, v]) => db.prepare('INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind(k, String(v ?? '')));
    if (st.length) await db.batch(st);
    return json(await getSettings(db));
  }

  // upload file umum
  if (p[0] === 'files' && m === 'POST') {
    const fd = await req.formData();
    const f = fd.get('file');
    if (!f || typeof f === 'string') return err('File tidak ditemukan.');
    if (f.size > 8 * 1024 * 1024) return err('Ukuran file maksimal 8 MB.');
    const id = await saveFile(db, f.name || 'file', f.type || 'application/octet-stream', await f.arrayBuffer());
    return json({ id });
  }
  if (p[0] === 'files' && p[1] && m === 'DELETE') { await deleteFile(db, p[1]); return json({ ok: true }); }

  // ---------- AGENDA ----------
  const AG = ['tanggal', 'tanggal_selesai', 'waktu', 'kegiatan', 'tempat', 'pj', 'kategori', 'keterangan', 'status'];
  if (p[0] === 'agenda') {
    if (m === 'POST') { const b = await body(); if (!b.tanggal || !b.kegiatan) return err('Tanggal & kegiatan wajib diisi.'); return json({ id: await insertRow(db, 'agenda', pick(b, AG)) }); }
    if (m === 'PUT' && p[1]) { await updateRow(db, 'agenda', +p[1], pick(await body(), AG)); return json({ ok: true }); }
    if (m === 'DELETE' && p[1]) { await db.prepare('DELETE FROM agenda WHERE id=?').bind(+p[1]).run(); return json({ ok: true }); }
  }

  // ---------- PROGRAM KERJA ----------
  const PK = ['tahun_ajaran', 'bidang', 'program', 'tujuan', 'sasaran', 'waktu', 'pj', 'anggaran', 'indikator', 'status', 'progres', 'urut'];
  if (p[0] === 'proker') {
    if (m === 'POST') { const b = await body(); if (!b.program) return err('Nama program wajib diisi.'); return json({ id: await insertRow(db, 'proker', pick(b, PK)) }); }
    if (m === 'PUT' && p[1]) { await updateRow(db, 'proker', +p[1], pick(await body(), PK)); return json({ ok: true }); }
    if (m === 'DELETE' && p[1]) { await db.prepare('DELETE FROM proker WHERE id=?').bind(+p[1]).run(); return json({ ok: true }); }
  }

  // ---------- RAPAT ----------
  const RP = ['judul', 'nomor', 'jenis', 'tanggal', 'waktu_mulai', 'waktu_selesai', 'tempat', 'pimpinan', 'pimpinan_jabatan', 'notulis', 'notulis_nip', 'undangan', 'agenda', 'pembukaan', 'pembahasan', 'keputusan', 'tindak_lanjut', 'penutup', 'ttd_pimpinan', 'ttd_notulis', 'mengetahui', 'status'];
  if (p[0] === 'rapat') {
    if (!p[1] && m === 'GET') {
      const { results } = await db.prepare(`SELECT r.id,r.judul,r.jenis,r.tanggal,r.waktu_mulai,r.tempat,r.pimpinan,r.notulis,r.status,
        (SELECT COUNT(*) FROM rapat_hadir h WHERE h.rapat_id=r.id) jml_hadir,
        (SELECT COUNT(*) FROM rapat_foto f WHERE f.rapat_id=r.id) jml_foto
        FROM rapat r ORDER BY r.tanggal DESC, r.id DESC`).all();
      return json(results);
    }
    if (!p[1] && m === 'POST') {
      const b = await body();
      if (!b.judul || !b.tanggal) return err('Judul & tanggal rapat wajib diisi.');
      const d = pick(b, RP); d.token = rid(12); d.updated_at = new Date().toISOString();
      return json({ id: await insertRow(db, 'rapat', d) });
    }
    const id = +p[1];
    if (p[1] && !p[2]) {
      if (m === 'GET') {
        const r = await db.prepare('SELECT * FROM rapat WHERE id=?').bind(id).first();
        if (!r) return err('Rapat tidak ditemukan.', 404);
        r.hadir = (await db.prepare('SELECT * FROM rapat_hadir WHERE rapat_id=? ORDER BY id').bind(id).all()).results;
        r.foto = (await db.prepare('SELECT * FROM rapat_foto WHERE rapat_id=? ORDER BY id').bind(id).all()).results;
        return json(r);
      }
      if (m === 'PUT') { const d = pick(await body(), RP); d.updated_at = new Date().toISOString(); await updateRow(db, 'rapat', id, d); return json({ ok: true }); }
      if (m === 'DELETE') {
        const { results: fotos } = await db.prepare('SELECT file_id FROM rapat_foto WHERE rapat_id=?').bind(id).all();
        for (const f of fotos) await deleteFile(db, f.file_id);
        await db.batch([db.prepare('DELETE FROM rapat_foto WHERE rapat_id=?').bind(id), db.prepare('DELETE FROM rapat_hadir WHERE rapat_id=?').bind(id), db.prepare('DELETE FROM rapat WHERE id=?').bind(id)]);
        return json({ ok: true });
      }
    }
    if (p[2] === 'token' && m === 'POST') { const t = rid(12); await db.prepare('UPDATE rapat SET token=? WHERE id=?').bind(t, id).run(); return json({ token: t }); }
    if (p[2] === 'hadir') {
      if (m === 'POST') {
        const b = await body();
        if (!b.nama) return err('Nama wajib diisi.');
        return json({ id: await insertRow(db, 'rapat_hadir', { rapat_id: id, nama: b.nama.trim(), jabatan: b.jabatan || '', unsur: b.unsur || '', ttd: b.ttd || '' }) });
      }
      if (m === 'PUT' && p[3]) { await updateRow(db, 'rapat_hadir', +p[3], pick(await body(), ['nama', 'jabatan', 'unsur', 'ttd'])); return json({ ok: true }); }
      if (m === 'DELETE' && p[3]) { await db.prepare('DELETE FROM rapat_hadir WHERE id=? AND rapat_id=?').bind(+p[3], id).run(); return json({ ok: true }); }
    }
    if (p[2] === 'foto') {
      if (m === 'POST') {
        const fd = await req.formData();
        const f = fd.get('file');
        if (!f || typeof f === 'string') return err('Foto tidak ditemukan.');
        if (f.size > 8 * 1024 * 1024) return err('Ukuran foto maksimal 8 MB.');
        const fid = await saveFile(db, f.name || 'foto.jpg', f.type || 'image/jpeg', await f.arrayBuffer());
        const nid = await insertRow(db, 'rapat_foto', { rapat_id: id, file_id: fid, keterangan: fd.get('keterangan') || '' });
        return json({ id: nid, file_id: fid });
      }
      if (m === 'PUT' && p[3]) { await updateRow(db, 'rapat_foto', +p[3], pick(await body(), ['keterangan'])); return json({ ok: true }); }
      if (m === 'DELETE' && p[3]) {
        const f = await db.prepare('SELECT file_id FROM rapat_foto WHERE id=?').bind(+p[3]).first();
        if (f) await deleteFile(db, f.file_id);
        await db.prepare('DELETE FROM rapat_foto WHERE id=?').bind(+p[3]).run();
        return json({ ok: true });
      }
    }
  }

  // ---------- HARI PENTING ----------
  const HP = ['nama', 'bulan', 'tgl', 'tahun', 'kategori', 'pesan', 'hashtag', 'aktif'];
  if (p[0] === 'hari') {
    if (m === 'GET') return json((await db.prepare('SELECT * FROM hari_penting ORDER BY bulan, tgl').all()).results);
    if (m === 'POST') { const b = await body(); if (!b.nama || !b.bulan || !b.tgl) return err('Nama, bulan, tanggal wajib.'); const d = pick(b, HP); if (!d.hashtag) d.hashtag = tagOf(d.nama); return json({ id: await insertRow(db, 'hari_penting', d) }); }
    if (m === 'PUT' && p[1]) { await updateRow(db, 'hari_penting', +p[1], pick(await body(), HP)); return json({ ok: true }); }
    if (m === 'DELETE' && p[1]) { await db.prepare('DELETE FROM hari_penting WHERE id=?').bind(+p[1]).run(); return json({ ok: true }); }
  }

  // ---------- PRESTASI SISWA ----------
  const PR = ['nama', 'anggota', 'kelas', 'prestasi', 'tingkat', 'tanggal', 'tgl', 'tahun', 'kategori', 'keterangan', 'piagam_file', 'foto_file', 'dipublikasi', 'caption'];
  if (p[0] === 'prestasi') {
    if (!p[1] && m === 'GET') return json((await db.prepare('SELECT * FROM prestasi ORDER BY tahun DESC, COALESCE(tgl, tanggal) DESC, id DESC').all()).results);
    if (p[1] === 'impor' && m === 'POST') {
      const b = await body(); const rows = Array.isArray(b.rows) ? b.rows : [];
      if (b.ganti) await db.prepare('DELETE FROM prestasi').run();
      const { results: ada } = await db.prepare('SELECT lower(nama)||\'|\'||lower(prestasi)||\'|\'||COALESCE(tahun,\'\') k FROM prestasi').all();
      const seen = new Set(ada.map((x) => x.k)); const st = []; let baru = 0, lewat = 0;
      for (const r of rows) {
        if (!r.nama && !r.prestasi) continue;
        const k = `${String(r.nama || '').toLowerCase()}|${String(r.prestasi || '').toLowerCase()}|${r.tahun ?? ''}`;
        if (seen.has(k)) { lewat++; continue; } seen.add(k); baru++;
        const d = pick(r, PR); const ks = Object.keys(d);
        st.push(db.prepare(`INSERT INTO prestasi (${ks.join(',')}) VALUES (${ks.map(() => '?').join(',')})`).bind(...ks.map((x) => d[x])));
      }
      for (let i = 0; i < st.length; i += 50) await db.batch(st.slice(i, i + 50));
      if (b.ttd && b.ttd.nama) {
        const cur = await getSettings(db);
        if (!cur.kesiswaan_nama) await db.batch([db.prepare('INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind('kesiswaan_nama', b.ttd.nama), db.prepare('INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v').bind('kesiswaan_nip', b.ttd.nip || '')]);
      }
      return json({ baru, lewat });
    }
    if (!p[1] && m === 'POST') { const b = await body(); if (!b.nama || !b.prestasi) return err('Nama siswa/tim dan prestasi wajib diisi.'); return json({ id: await insertRow(db, 'prestasi', pick(b, PR)) }); }
    if (p[1] && m === 'PUT') { await updateRow(db, 'prestasi', +p[1], pick(await body(), PR)); return json({ ok: true }); }
    if (p[1] && m === 'DELETE') {
      const r = await db.prepare('SELECT piagam_file, foto_file FROM prestasi WHERE id=?').bind(+p[1]).first();
      if (r) { await deleteFile(db, r.piagam_file); await deleteFile(db, r.foto_file); }
      await db.prepare('DELETE FROM prestasi WHERE id=?').bind(+p[1]).run(); return json({ ok: true });
    }
  }

  // ---------- GURU & ULANG TAHUN ----------
  const GR = ['nama', 'nip', 'tgl_lahir', 'jk', 'jabatan', 'agama', 'foto_file', 'aktif'];
  if (p[0] === 'guru') {
    if (!p[1] && m === 'GET') {
      const tahun = +(url.searchParams.get('tahun') || new Date().getFullYear());
      const { results } = await db.prepare(`SELECT g.*, u.ig_done, u.wa_done, u.desain FROM guru g LEFT JOIN ucapan u ON u.guru_id=g.id AND u.tahun=? ORDER BY substr(g.tgl_lahir,6,5), g.nama`).bind(tahun).all();
      return json(results);
    }
    if (p[1] === 'impor' && m === 'POST') {
      const b = await body(); const rows = Array.isArray(b.rows) ? b.rows : [];
      if (b.ganti) await db.prepare('DELETE FROM guru').run();
      const { results: ada } = await db.prepare('SELECT id,nip,nama FROM guru').all();
      const byNip = Object.fromEntries(ada.filter((g) => g.nip).map((g) => [g.nip, g.id]));
      const byNama = Object.fromEntries(ada.map((g) => [String(g.nama).toLowerCase(), g.id]));
      const st = []; let baru = 0, ubah = 0;
      for (const r of rows) {
        if (!r.nama) continue;
        const d = pick(r, GR); const id = (d.nip && byNip[d.nip]) || byNama[String(d.nama).toLowerCase()];
        const ks = Object.keys(d).filter((k) => d[k] !== '' && d[k] != null);
        if (id) { ubah++; if (ks.length) st.push(db.prepare(`UPDATE guru SET ${ks.map((k) => k + '=?').join(',')} WHERE id=?`).bind(...ks.map((k) => d[k]), id)); }
        else { baru++; st.push(db.prepare(`INSERT INTO guru (${ks.join(',')}) VALUES (${ks.map(() => '?').join(',')})`).bind(...ks.map((k) => d[k]))); }
      }
      for (let i = 0; i < st.length; i += 50) await db.batch(st.slice(i, i + 50));
      return json({ baru, ubah });
    }
    if (!p[1] && m === 'POST') { const b = await body(); if (!b.nama) return err('Nama wajib diisi.'); return json({ id: await insertRow(db, 'guru', pick(b, GR)) }); }
    if (p[1] && m === 'PUT') { await updateRow(db, 'guru', +p[1], pick(await body(), GR)); return json({ ok: true }); }
    if (p[1] && m === 'DELETE') { await db.batch([db.prepare('DELETE FROM guru WHERE id=?').bind(+p[1]), db.prepare('DELETE FROM ucapan WHERE guru_id=?').bind(+p[1])]); return json({ ok: true }); }
  }
  if (p[0] === 'ucapan' && p[1] && p[2]) {
    const gid = +p[1], th = +p[2];
    if (m === 'GET') {
      const g = await db.prepare('SELECT * FROM guru WHERE id=?').bind(gid).first();
      if (!g) return err('Data guru tidak ditemukan.', 404);
      return json({ guru: g, uc: await db.prepare('SELECT * FROM ucapan WHERE guru_id=? AND tahun=?').bind(gid, th).first() });
    }
    if (m === 'PUT') {
      const b = pick(await body(), ['gaya', 'pesan', 'caption_ig', 'caption_wa', 'desain', 'ig_done', 'wa_done']);
      if (b.desain && typeof b.desain !== 'string') b.desain = JSON.stringify(b.desain);
      b.updated_at = new Date().toISOString();
      const ex = await db.prepare('SELECT id FROM ucapan WHERE guru_id=? AND tahun=?').bind(gid, th).first();
      if (ex) await updateRow(db, 'ucapan', ex.id, b); else await insertRow(db, 'ucapan', { guru_id: gid, tahun: th, ...b });
      return json({ ok: true });
    }
  }

  // ---------- PUBLIKASI ----------
  if (p[0] === 'publikasi') {
    const { results: semua } = await db.prepare('SELECT * FROM hari_penting').all();
    if (!p[1] && m === 'GET') {
      const tahun = +(url.searchParams.get('tahun') || new Date().getFullYear());
      const list = hariUntukTahun(semua, tahun);
      const { results: pubs } = await db.prepare('SELECT hari_id,tema,desain,twibbon_file,ig_done,tiktok_done,caption_ig FROM publikasi WHERE tahun=?').bind(tahun).all();
      const map = Object.fromEntries(pubs.map((x) => [x.hari_id, x]));
      return json(list.map((h) => ({ ...h, pub: map[h.id] || null })));
    }
    if (p[0] === 'publikasi' && p[1] === 'mendatang' && m === 'GET') {
      const now = new Date(Date.now() + 7 * 3600 * 1000); // WIB
      const today = now.toISOString().slice(0, 10);
      const y = now.getUTCFullYear();
      const list = [...hariUntukTahun(semua, y), ...hariUntukTahun(semua, y + 1)].filter((h) => h.tanggal >= today).slice(0, 12);
      const out = [];
      for (const h of list) {
        const pub = await db.prepare('SELECT desain,twibbon_file,ig_done,tiktok_done FROM publikasi WHERE hari_id=? AND tahun=?').bind(h.id, +h.tanggal.slice(0, 4)).first();
        out.push({ ...h, pub: pub || null });
      }
      return json({ today, items: out });
    }
    const hid = +p[1], th = +p[2];
    if (hid && th) {
      const h = semua.find((x) => x.id === hid);
      if (!h) return err('Hari penting tidak ditemukan.', 404);
      if (m === 'GET') {
        const pub = await db.prepare('SELECT * FROM publikasi WHERE hari_id=? AND tahun=?').bind(hid, th).first();
        return json({ hari: { ...h, tanggal: `${th}-${String(h.bulan).padStart(2, '0')}-${String(h.tgl).padStart(2, '0')}` }, pub });
      }
      if (m === 'PUT') {
        const b = pick(await body(), ['tema', 'caption_ig', 'caption_tiktok', 'caption_twibbon', 'desain', 'twibbon_file', 'ig_done', 'tiktok_done', 'ig_link', 'tiktok_link', 'catatan']);
        if (b.desain && typeof b.desain !== 'string') b.desain = JSON.stringify(b.desain);
        b.updated_at = new Date().toISOString();
        const ex = await db.prepare('SELECT id FROM publikasi WHERE hari_id=? AND tahun=?').bind(hid, th).first();
        if (ex) await updateRow(db, 'publikasi', ex.id, b);
        else await insertRow(db, 'publikasi', { hari_id: hid, tahun: th, ...b });
        return json({ ok: true });
      }
    }
  }

  return err('Endpoint tidak dikenal: ' + url.pathname, 404);
}
