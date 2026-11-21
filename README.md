# HUMAS SMA Negeri 1 Purwoasri

Sistem informasi Hubungan Masyarakat SMA Negeri 1 Purwoasri.
Berjalan gratis di **Cloudflare Pages + D1** (database), kode disimpan di **GitHub**.

## Fitur

| Menu | Isi |
|---|---|
| **Beranda** | Ringkasan agenda, capaian program kerja, rapat terbaru, dan **pengingat publikasi** hari penting. |
| **Agenda** | Kalender & daftar kegiatan (hari nasional otomatis tampil merah), unduh PDF berkop. Bisa dilihat publik tanpa login. |
| **Program Kerja** | Program kerja Humas per tahun ajaran per bidang: tujuan, sasaran, waktu, PJ, anggaran, indikator, status, % capaian. Unduh PDF berkop + tanda tangan Kepala Sekolah. |
| **Prestasi** | Tabel prestasi siswa sesuai format sekolah (No, Nama Siswa, Kelas, Prestasi, Tingkat, Tanggal, Tahun, Keterangan + anggota tim) dikelompokkan per tahun · **Input manual** · **Impor Excel** langsung dari file DATA SISWA PRESTASI (bisa pilih sheet; baris anggota tim, tahun per kelompok, tanggal teks seperti "14-15 Maret 2025" dibaca otomatis; data yang sama tidak dobel) · **Template Excel** untuk input massal · Ekspor Excel & PDF berkop dengan tanda tangan Kepala Sekolah dan Waka Kesiswaan · Filter tahun/tingkat/bidang · Grafik per tahun · Poster "Selamat & Sukses" + caption IG · Simpan piagam. Bisa dilihat publik (tanpa kolom keterangan). |
| **Rapat** | Notulen (pembukaan, pembahasan, keputusan, tindak lanjut, penutup) tersimpan otomatis · **Tanda tangan digital peserta** lewat QR/link dari HP masing-masing (atau langsung di perangkat notulis) · TTD pimpinan & notulis · Unggah foto dokumentasi · **Laporan PDF & Word (.docx) lengkap dengan kop surat resmi**: notulen, daftar hadir bertanda tangan, dan dokumentasi foto. |
| **Publikasi** | Daftar hari nasional, hari besar keagamaan (2026–2027 sesuai SKB 3 Menteri), internasional & daerah · Pengingat H-7 · **Desain otomatis** (Feed IG 4:5, Story/TikTok 9:16, persegi, twibbon) dalam 5 gaya warna · Video 6 detik untuk TikTok/Reels · Caption IG, TikTok, dan twibbon siap salin · Unggah desain sendiri (mis. dari ChatGPT) · **Halaman twibbon publik** untuk siswa/guru/wali murid · Catatan status sudah diunggah atau belum. |
| **Ulang Tahun** | Impor daftar guru & tendik dari Excel (kolom NAMA + NIP; tanggal lahir dibaca dari 8 digit pertama NIP, sapaan Bapak/Ibu dari digit ke-15) · Pengingat ulang tahun hari ini & 7 hari ke depan di Beranda · **Ucapan dibuat otomatis** (gaya Umum, Islami, Kristiani, Hangat, Formal — tombol "Buatkan ucapan lain") · Kartu ucapan otomatis (Feed, Story, Persegi) dengan foto atau inisial · Caption Instagram & pesan WhatsApp siap kirim · Status sudah diucapkan. |
| **Pengaturan** | Identitas sekolah, Kepala Sekolah & NIP, kop surat, logo, akun media sosial, hashtag tetap, akun petugas. |

Pertama kali membuka menu **Ulang Tahun**, klik **Impor Excel** dan pilih file `DAFTAR_GURU.xlsx`. Data guru sengaja **tidak** disimpan di kode GitHub (NIP & tanggal lahir adalah data pribadi), melainkan langsung di database.

Halaman publik: `/ttd.html?t=…` (tanda tangan peserta rapat) dan `/twibbon.html?h=…&y=…` (pasang twibbon).

---

## Cara memasang (sekali saja, ±15 menit)

Gunakan akun **ahmadhasyim@sman1purwoasri.sch.id** untuk GitHub dan Cloudflare.

### 1. Unggah ke GitHub
1. Masuk ke <https://github.com> → klik **New repository** → beri nama `humas-smanesa` → **Private** → **Create repository**.
2. Di halaman repo yang masih kosong, klik **uploading an existing file**.
3. Ekstrak ZIP ini, lalu **seret seluruh isi folder** `humas-smanesa` (folder `public`, `functions`, file `README.md`, dst.) ke halaman tersebut → **Commit changes**.
   > Pastikan struktur foldernya tetap: `functions/api/[[path]].js` dan `public/index.html`.

### 2. Buat database D1 di Cloudflare
1. Masuk ke <https://dash.cloudflare.com> → menu **Storage & databases → D1 SQL database** → **Create**.
2. Nama: `humas-smanesa-db` → **Create**. (Tabel dibuat otomatis oleh aplikasi, tidak perlu menjalankan SQL.)

### 3. Buat proyek Cloudflare Pages
1. Menu **Workers & Pages → Create → Pages → Connect to Git** → hubungkan akun GitHub → pilih repo `humas-smanesa`.
2. Pengaturan build:
   - Framework preset: **None**
   - Build command: *(kosongkan)*
   - Build output directory: **`public`**
3. Klik **Save and Deploy**.

### 4. Hubungkan database (penting!)
1. Buka proyek Pages → **Settings → Bindings → Add → D1 database**.
2. Variable name: **`DB`** (huruf besar) → pilih `humas-smanesa-db` → **Save**.
3. Buka tab **Deployments** → titik tiga pada deployment terakhir → **Retry deployment** (binding baru aktif setelah deploy ulang).

### 5. Mulai pakai
1. Buka alamat `https://humas-smanesa.pages.dev` (atau nama yang diberikan Cloudflare).
2. Saat pertama dibuka akan muncul **Buat Akun Admin** → isi username & password.
3. Masuk ke **Pengaturan** → lengkapi NIP Kepala Sekolah, nama/NIP Waka Humas, dan (disarankan) unggah **logo sekolah PNG transparan** serta **kop surat resolusi tinggi**.

### 6. (Opsional) Pakai subdomain sekolah
Proyek Pages → **Custom domains → Set up a custom domain** → misalnya `humas.sman1purwoasri.sch.id`.
Lalu di pengelola DNS domain sekolah (panel hosting), tambahkan record **CNAME** `humas` → `humas-smanesa.pages.dev`.

---

## Pembaruan
Setiap ada perubahan file di GitHub (edit/unggah ulang), Cloudflare otomatis memasang versi baru dalam ±1 menit. Data di database tidak hilang.

## Catatan teknis
- Foto, desain, dan twibbon disimpan di D1 (dipotong per ±900 KB), jadi **tidak perlu R2/kartu kredit**. Foto rapat dikompres otomatis ±200–400 KB. Kuota gratis D1: 5 GB.
- Hari besar keagamaan yang tanggalnya berubah (Idulfitri, Iduladha, Waisak, Imlek, Nyepi, dll.) sudah terisi untuk 2026 dan 2027. Untuk 2028, tambahkan lewat **Publikasi → Kelola daftar hari** setelah SKB 3 Menteri terbit.
- Unggah otomatis langsung ke Instagram/TikTok memerlukan akun bisnis + persetujuan aplikasi Meta/TikTok, sehingga sistem ini menyediakan: unduh desain/video, salin caption, dan tombol **Bagikan langsung** (di HP membuka aplikasi IG/TikTok dengan gambar terlampir).
- Pustaka yang dipakai (sudah disertakan di `public/vendor`, tidak butuh internet tambahan): docx (Word), html2pdf.js (PDF), qrcode-generator (QR).

## Struktur
```
public/            → tampilan (HTML, CSS, JS)
  index.html       → aplikasi utama
  ttd.html         → halaman tanda tangan peserta rapat
  twibbon.html     → halaman twibbon publik
  js/              → modul: main, rapat, laporan, publikasi, designer, pengaturan
  assets/kop.png   → kop surat bawaan
functions/api/[[path]].js → API + database (Cloudflare Pages Functions)
```
