// ===== Generator desain otomatis berbasis Canvas =====
import { BULAN, HARI, parseD, loadImg } from './core.js';

export const FORMATS = {
  feed: { label: 'Feed IG 4:5', w: 1080, h: 1350 },
  story: { label: 'Story / TikTok 9:16', w: 1080, h: 1920 },
  square: { label: 'Persegi 1:1', w: 1080, h: 1080 },
  twibbon: { label: 'Twibbon', w: 1080, h: 1080 },
};

export const THEMES = {
  merah: { name: 'Merah Putih', bg: ['#c62828', '#7a0b0b'], ink: '#ffffff', sub: '#ffe9e9', acc: '#ffd54f', card: 'rgba(255,255,255,.12)', motif: 'flag' },
  navy: { name: 'Navy Emas', bg: ['#173a66', '#0a1d36'], ink: '#ffffff', sub: '#d6e2f3', acc: '#e0a826', card: 'rgba(255,255,255,.09)', motif: 'dots' },
  hijau: { name: 'Hijau Santri', bg: ['#0f6b45', '#053321'], ink: '#ffffff', sub: '#d8f0e3', acc: '#e8c25a', card: 'rgba(255,255,255,.1)', motif: 'star' },
  pastel: { name: 'Pastel', bg: ['#fff4ea', '#fde0d2'], ink: '#5a1f2d', sub: '#7a4a52', acc: '#d9536f', card: 'rgba(255,255,255,.6)', motif: 'petal' },
  gelap: { name: 'Elegan Gelap', bg: ['#2a2a2e', '#0b0b0d'], ink: '#ffffff', sub: '#cfcfd4', acc: '#d4af37', card: 'rgba(255,255,255,.07)', motif: 'lines' },
};

export function autoTheme(h) {
  const n = h.nama || '';
  if (/Kemerdekaan|Pahlawan|Pancasila|Sumpah Pemuda|Bela Negara|Kebangkitan|Kedaulatan|Konstitusi|TNI|Bhayangkara/i.test(n)) return 'merah';
  if (/Idul|Isra|Maulid|Islam|Santri/i.test(n)) return 'hijau';
  if (/Ibu|Kartini|Anak|Keluarga|Valentine/i.test(n)) return 'pastel';
  if (/Natal|Paskah|Wafat|Kenaikan|Nyepi|Waisak|Imlek/i.test(n)) return 'gelap';
  return 'navy';
}
export const prefixOf = (n) => (/Wafat|Isra|AIDS|Narkotika|Kesaktian|Maulid|Kenaikan/i.test(n) ? 'Memperingati' : 'Selamat');

let fontsReady = null;
function fonts() {
  fontsReady ||= Promise.all(['900 80px Poppins', '800 40px Poppins', '700 30px Poppins', '600 30px Poppins', '400 30px Poppins', 'italic 700 40px "Playfair Display"'].map((f) => document.fonts.load(f).catch(() => {})));
  return fontsReady;
}

function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/); const lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur); return lines;
}
function fitTitle(ctx, text, maxW, maxLines, start, min = 50) {
  for (let s = start; s >= min; s -= 4) { ctx.font = `900 ${s}px Poppins`; const lines = wrap(ctx, text, maxW); if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) return { size: s, lines }; }
  ctx.font = `900 ${min}px Poppins`; return { size: min, lines: wrap(ctx, text, maxW) };
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

function background(ctx, W, H, T, photo) {
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H); g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (photo) { // foto latar dengan overlay
    const s = Math.max(W / photo.width, H / photo.height); const pw = photo.width * s, ph = photo.height * s;
    ctx.globalAlpha = 0.28; ctx.drawImage(photo, (W - pw) / 2, (H - ph) / 2, pw, ph); ctx.globalAlpha = 1;
    const o = ctx.createLinearGradient(0, 0, 0, H); o.addColorStop(0, T.bg[0] + 'cc'); o.addColorStop(1, T.bg[1] + 'f2'); ctx.fillStyle = o; ctx.fillRect(0, 0, W, H);
  }
  ctx.save();
  if (T.motif === 'flag') {
    ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(W, H * 0.62); ctx.lineTo(W, H * 0.72); ctx.lineTo(W * 0.0, H * 1.02); ctx.lineTo(0, H * 0.92); ctx.closePath(); ctx.globalAlpha = 0.12; ctx.fill();
    ctx.globalAlpha = 0.1; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(W * 0.92, H * 0.08, 90 + i * 70, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  } else if (T.motif === 'dots') {
    ctx.fillStyle = T.acc; ctx.globalAlpha = 0.16; for (let y = 40; y < H * 0.3; y += 34) for (let x = W - 300; x < W; x += 34) { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 0.08; ctx.beginPath(); ctx.arc(-80, H * 0.85, 420, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
  } else if (T.motif === 'star') {
    ctx.strokeStyle = T.acc; ctx.globalAlpha = 0.13; ctx.lineWidth = 2;
    for (let y = 0; y < H + 120; y += 150) for (let x = (y / 150) % 2 ? 75 : 0; x < W + 120; x += 150) { for (let k = 0; k < 2; k++) { ctx.save(); ctx.translate(x, y); ctx.rotate(k * Math.PI / 4); ctx.strokeRect(-34, -34, 68, 68); ctx.restore(); } }
  } else if (T.motif === 'petal') {
    ctx.fillStyle = T.acc; ctx.globalAlpha = 0.12; for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(W - 60, 80); ctx.rotate(i * Math.PI / 4); ctx.beginPath(); ctx.ellipse(0, 110, 60, 120, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha = 0.1; ctx.beginPath(); ctx.arc(60, H - 60, 260, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.strokeStyle = T.acc; ctx.globalAlpha = 0.15; ctx.lineWidth = 2; for (let i = -H; i < W; i += 46) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + H * 0.5, H); ctx.stroke(); }
  }
  ctx.restore();
}

function header(ctx, W, T, logo, s, y, scale = 1) {
  const lh = 96 * scale; let x = 70;
  if (logo) { const lw = (logo.width / logo.height) * lh; ctx.drawImage(logo, x, y, lw, lh); x += lw + 22; }
  ctx.fillStyle = T.ink; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.font = `800 ${36 * scale}px Poppins`; ctx.fillText((s.nama_sekolah || '').toUpperCase(), x, y + 12 * scale);
  ctx.fillStyle = T.sub; ctx.font = `400 ${25 * scale}px Poppins`; ctx.fillText('Kabupaten Kediri · Jawa Timur', x, y + 56 * scale);
}
function footer(ctx, W, H, T, s, hh = 92) {
  ctx.fillStyle = T.acc; ctx.fillRect(0, H - hh, W, hh);
  const dark = T.motif === 'petal' ? '#fff' : '#10223d';
  ctx.fillStyle = dark; ctx.textBaseline = 'middle'; ctx.textAlign = 'center'; ctx.font = '600 28px Poppins';
  const parts = [s.instagram && '◎ @' + s.instagram, s.tiktok && '♪ @' + s.tiktok, s.website].filter(Boolean);
  ctx.fillText(parts.join('     '), W / 2, H - hh / 2);
}

function info(h, tahun) { const d = parseD(h.tanggal); return { tgl: `${HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`, day: d.getDate(), bulan: BULAN[d.getMonth()] }; }

// opts: { hari, tahun, tema, theme, format, settings, logo(Image), photo(Image) }
export async function render(canvas, o) {
  await fonts();
  const F = FORMATS[o.format]; const T = THEMES[o.theme] || THEMES.navy; const s = o.settings; const h = o.hari;
  canvas.width = F.w; canvas.height = F.h; const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, F.w, F.h);
  if (o.format === 'twibbon') return twibbon(ctx, F.w, F.h, T, o);
  const W = F.w, H = F.h; const I = info(h, o.tahun);
  background(ctx, W, H, T, o.photo && !o.photoCard ? o.photo : null);
  const story = o.format === 'story', sq = o.format === 'square';
  let y = story ? 120 : 64;
  header(ctx, W, T, o.logo, s, y, sq ? 0.85 : 1);
  y += sq ? 120 : story ? 330 : 165; // story: area aman di bawah UI TikTok/IG

  // nomor tanggal besar transparan
  ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = T.ink; ctx.font = `900 ${story ? 640 : sq ? 420 : 520}px Poppins`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText(String(I.day), W + 30, story ? 1720 : sq ? 900 : 1120); ctx.restore();

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = T.sub; ctx.font = `600 ${sq ? 28 : 32}px Poppins`;
  ctx.fillText(`Keluarga Besar ${s.nama_sekolah} mengucapkan`, 70, y); y += sq ? 72 : 92;
  ctx.fillStyle = T.acc; ctx.font = `italic 700 ${sq ? 58 : story ? 84 : 72}px "Playfair Display"`; ctx.fillText(prefixOf(h.nama), 70, y); y += 18;
  const t = fitTitle(ctx, h.nama.toUpperCase(), W - 140, story ? 4 : 3, story ? 150 : sq ? 104 : 124);
  ctx.fillStyle = T.ink; ctx.font = `900 ${t.size}px Poppins`;
  for (const l of t.lines) { y += t.size * 1.02; ctx.fillText(l, 70, y); }
  y += sq ? 26 : 36;
  // pita tanggal
  ctx.font = `700 ${sq ? 30 : 34}px Poppins`; const tw = ctx.measureText(I.tgl).width + 60;
  ctx.fillStyle = T.acc; rr(ctx, 70, y, tw, sq ? 58 : 66, 33); ctx.fill();
  ctx.fillStyle = T.motif === 'petal' ? '#fff' : '#10223d'; ctx.textBaseline = 'middle'; ctx.fillText(I.tgl, 100, y + (sq ? 29 : 33)); ctx.textBaseline = 'alphabetic';
  y += sq ? 100 : story ? 110 : 120;

  // foto kartu (opsional)
  const footH = story ? 130 : 92;
  if (o.photo && o.photoCard) {
    const ph = story ? 560 : sq ? 0 : 300;
    if (ph) { const pw = W - 140; ctx.save(); rr(ctx, 70, y, pw, ph, 28); ctx.clip(); const sc = Math.max(pw / o.photo.width, ph / o.photo.height); ctx.drawImage(o.photo, 70 + (pw - o.photo.width * sc) / 2, y + (ph - o.photo.height * sc) / 2, o.photo.width * sc, o.photo.height * sc); ctx.restore(); ctx.strokeStyle = T.acc; ctx.lineWidth = 5; rr(ctx, 70, y, pw, ph, 28); ctx.stroke(); y += ph + 50; }
  }
  // kutipan pesan
  const msg = (o.tema || h.pesan || '').trim();
  if (msg) {
    ctx.font = `italic 700 ${sq ? 34 : story ? 46 : 40}px "Playfair Display"`;
    const lines = wrap(ctx, '“' + msg + '”', W - 220).slice(0, story ? 6 : 4);
    const lh = sq ? 48 : story ? 64 : 56; const bh = lines.length * lh + 70;
    const room = H - footH - 40 - y; const by = story ? y : y + Math.max(0, (room - bh) / 2);
    ctx.fillStyle = T.card; rr(ctx, 70, by, W - 140, bh, 26); ctx.fill();
    ctx.fillStyle = T.acc; ctx.fillRect(70, by + 24, 8, bh - 48);
    ctx.fillStyle = T.ink; lines.forEach((l, i) => ctx.fillText(l, 110, by + 52 + lh * 0.55 + i * lh));
  }
  footer(ctx, W, H, T, s, footH);
}

function twibbon(ctx, W, H, T, o) {
  const s = o.settings, h = o.hari;
  const cx = W / 2, cy = H / 2 + 10, R = 395;
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, T.bg[0]); g.addColorStop(1, T.bg[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  background(ctx, W, H, T, null);
  // lubang foto
  ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.lineWidth = 16; ctx.strokeStyle = T.acc; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = T.ink; ctx.setLineDash([4, 14]); ctx.beginPath(); ctx.arc(cx, cy, R + 34, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  // pita atas
  ctx.save(); ctx.fillStyle = T.acc; rr(ctx, 120, 40, W - 240, 96, 48); ctx.fill();
  ctx.fillStyle = T.motif === 'petal' ? '#fff' : '#10223d'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const t = fitTitle(ctx, (prefixOf(h.nama) + ' ' + h.nama).toUpperCase(), W - 300, 1, 46, 22); ctx.font = `900 ${t.size}px Poppins`; ctx.fillText(t.lines[0], W / 2, 90); ctx.restore();
  // pita bawah
  ctx.fillStyle = T.bg[1]; rr(ctx, 150, H - 150, W - 300, 110, 30); ctx.fill(); ctx.strokeStyle = T.acc; ctx.lineWidth = 4; rr(ctx, 150, H - 150, W - 300, 110, 30); ctx.stroke();
  if (o.logo) { const lh = 80, lw = (o.logo.width / o.logo.height) * lh; ctx.drawImage(o.logo, 180, H - 135, lw, lh); }
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 34px Poppins'; ctx.fillText(s.nama_sekolah.toUpperCase(), W / 2 + 30, H - 112);
  ctx.fillStyle = T.acc === '#d9536f' ? '#ffd3dc' : T.acc; ctx.font = '600 26px Poppins'; ctx.fillText(`${h.hashtag || ''}${o.tahun}  •  @${s.instagram || ''}`, W / 2 + 30, H - 72);
  // tahun di sisi
  ctx.save(); ctx.translate(W - 70, cy); ctx.rotate(Math.PI / 2); ctx.fillStyle = T.ink; ctx.globalAlpha = 0.9; ctx.font = '900 64px Poppins'; ctx.textAlign = 'center'; ctx.fillText(String(o.tahun), 0, 0); ctx.restore();
}

// ---- video pendek untuk TikTok/Reels dari desain story ----
export async function recordVideo(sourceCanvas, seconds = 6) {
  const W = 1080, H = 1920; const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const types = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'];
  const mime = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
  if (!mime) throw new Error('Browser ini tidak mendukung perekaman video. Gunakan Google Chrome terbaru.');
  const stream = c.captureStream(30); const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((r) => (rec.onstop = r));
  rec.start(); const t0 = performance.now();
  await new Promise((resolve) => {
    const frame = () => {
      const t = (performance.now() - t0) / 1000; if (t > seconds) return resolve();
      const z = 1.12 - 0.12 * Math.min(1, t / seconds); const a = Math.min(1, t / 0.8);
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.globalAlpha = a;
      x.drawImage(sourceCanvas, (W - W * z) / 2, (H - H * z) / 2, W * z, H * z); x.globalAlpha = 1;
      if (t > seconds - 0.6) { x.fillStyle = `rgba(0,0,0,${(t - (seconds - 0.6)) / 0.6 * 0.5})`; x.fillRect(0, 0, W, H); }
      requestAnimationFrame(frame);
    };
    frame();
  });
  rec.stop(); await done;
  return { blob: new Blob(chunks, { type: mime.split(';')[0] }), ext: mime.includes('mp4') ? 'mp4' : 'webm' };
}

export async function getImages(settings) {
  const logo = await loadImg(settings.logo_file ? '/api/file/' + settings.logo_file : '/assets/logo-jatim.png').catch(() => null);
  return { logo };
}

// ================= Kartu ulang tahun =================
function seeded(str) { let h = 2166136261; for (const c of str) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; }; }
function confetti(ctx, W, H, T, seed, by = 300, sc = 1) {
  const rnd = seeded(seed); const cols = [T.acc, '#ffffff', '#ff7a90', '#5ec8f2', '#9be38a'];
  ctx.save();
  for (let i = 0; i < 70; i++) {
    const x = rnd() * W, y = rnd() * H; if (y > H * 0.25 && y < H * 0.85 && x > W * 0.12 && x < W * 0.88) continue;
    ctx.globalAlpha = 0.55 + rnd() * 0.4; ctx.fillStyle = cols[Math.floor(rnd() * cols.length)];
    ctx.translate(x, y); ctx.rotate(rnd() * Math.PI); if (rnd() > 0.5) ctx.fillRect(-9, -4, 18, 8); else { ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill(); } ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // balon
  const bal = [[W - 95, by - 70, '#ff7a90'], [W - 190, by + 10, T.acc], [W - 70, by + 80, '#5ec8f2'], [120, by + 30, '#ff7a90']];
  for (const [bx0, by0, c] of bal) { const bx = bx0, byy = by0;
    ctx.save(); ctx.translate(bx, byy); ctx.scale(sc, sc); ctx.translate(-bx, -byy); const by = byy;
    ctx.globalAlpha = 0.9; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(bx, by + 70); ctx.quadraticCurveTo(bx - 15, by + 110, bx + 5, by + 160); ctx.stroke();
    const g = ctx.createRadialGradient(bx - 18, by - 22, 6, bx, by, 75); g.addColorStop(0, '#ffffffcc'); g.addColorStop(0.25, c); g.addColorStop(1, c);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, 52, 66, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx - 8, by + 72); ctx.lineTo(bx + 8, by + 72); ctx.lineTo(bx, by + 62); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function initials(n) { return n.replace(/^(Dra?s?\.|Hj?\.|M\.|Moh\.)\s*/i, '').split(',')[0].split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase(); }

// o: { nama (tampilan), sapaan, sub, tglLabel, umur, showAge, pesan, theme, format, settings, logo, foto(Image) }
export async function renderUltah(canvas, o) {
  await fonts();
  const F = FORMATS[o.format] || FORMATS.feed; const T = THEMES[o.theme] || THEMES.navy; const s = o.settings;
  const W = F.w, H = F.h; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  const story = o.format === 'story', sq = o.format === 'square';
  let y = story ? 400 : sq ? 210 : 255;
  const R = sq ? 125 : story ? 230 : 165; const cy = y + (sq ? 92 : story ? 140 : 112) + (sq ? 40 : 60) + R;
  background(ctx, W, H, T, null); confetti(ctx, W, H, T, o.nama, cy, sq ? 0.8 : story ? 1.2 : 1);
  header(ctx, W, T, o.logo, s, story ? 120 : 56, sq ? 0.8 : 0.9);
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = T.acc; ctx.font = `italic 700 ${sq ? 62 : story ? 96 : 78}px "Playfair Display"`; ctx.fillText('Selamat', W / 2, y);
  y += sq ? 92 : story ? 140 : 112; ctx.fillStyle = T.ink; ctx.font = `900 ${sq ? 84 : story ? 124 : 104}px Poppins`; ctx.fillText('ULANG TAHUN', W / 2, y);
  // foto / inisial
  ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, R + 14, 0, Math.PI * 2); ctx.fillStyle = T.acc; ctx.fill();
  ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, Math.PI * 2); ctx.clip();
  if (o.foto) { const sc = Math.max((2 * R) / o.foto.width, (2 * R) / o.foto.height); ctx.drawImage(o.foto, W / 2 - (o.foto.width * sc) / 2, cy - (o.foto.height * sc) / 2.4, o.foto.width * sc, o.foto.height * sc); }
  else { const g = ctx.createLinearGradient(0, cy - R, 0, cy + R); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e9eef6'); ctx.fillStyle = g; ctx.fillRect(W / 2 - R, cy - R, 2 * R, 2 * R); ctx.fillStyle = T.bg[1]; ctx.font = `800 ${R * 0.8}px Poppins`; ctx.textBaseline = 'middle'; ctx.fillText(initials(o.nama), W / 2, cy + 6); ctx.textBaseline = 'alphabetic'; }
  ctx.restore();
  if (o.showAge && o.umur) { const bx = W / 2 + R * 0.72, by = cy + R * 0.72; ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(bx, by, sq ? 50 : 62, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.textBaseline = 'middle'; ctx.font = `800 ${sq ? 22 : 26}px Poppins`; ctx.fillText('ke-', bx, by - (sq ? 16 : 20)); ctx.font = `900 ${sq ? 38 : 46}px Poppins`; ctx.fillText(String(o.umur), bx, by + (sq ? 12 : 16)); ctx.textBaseline = 'alphabetic'; }
  y = cy + R + (sq ? 96 : story ? 150 : 118);
  // nama
  ctx.textAlign = 'left'; const t = fitTitle(ctx, o.nama, W - 160, 2, sq ? 54 : story ? 74 : 62, 34); ctx.textAlign = 'center';
  ctx.fillStyle = T.sub; ctx.font = `600 ${sq ? 28 : 32}px Poppins`; ctx.fillText(o.sapaan, W / 2, y - t.size * 0.82 - 14);
  ctx.fillStyle = T.ink; ctx.font = `800 ${t.size}px Poppins`; t.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * t.size * 1.12)); y += (t.lines.length - 1) * t.size * 1.12;
  if (o.sub) { y += sq ? 40 : 48; ctx.fillStyle = T.sub; ctx.font = `400 ${sq ? 24 : 28}px Poppins`; ctx.fillText(o.sub, W / 2, y); }
  y += sq ? 30 : 40;
  ctx.font = `700 ${sq ? 26 : 30}px Poppins`; const pw = ctx.measureText(o.tglLabel).width + 56; ctx.fillStyle = T.acc; rr(ctx, W / 2 - pw / 2, y, pw, sq ? 50 : 58, 29); ctx.fill();
  ctx.fillStyle = T.motif === 'petal' ? '#fff' : '#10223d'; ctx.textBaseline = 'middle'; ctx.fillText(o.tglLabel, W / 2, y + (sq ? 25 : 29)); ctx.textBaseline = 'alphabetic';
  y += sq ? 80 : story ? 120 : 98;
  const footH = story ? 130 : sq ? 80 : 92;
  if (o.pesan) {
    ctx.font = `italic 700 ${sq ? 28 : story ? 42 : 34}px "Playfair Display"`; const lh = sq ? 40 : story ? 60 : 48;
    const maxL = Math.max(1, Math.floor((H - footH - 50 - y - 40) / lh));
    let lines = wrap(ctx, o.pesan, W - 220); if (lines.length > maxL) { lines = lines.slice(0, maxL); lines[maxL - 1] = lines[maxL - 1].replace(/[\s,.;]*\S*$/, '…'); }
    const bh = lines.length * lh + 44; ctx.fillStyle = T.card; rr(ctx, 80, y, W - 160, bh, 24); ctx.fill();
    ctx.fillStyle = T.ink; lines.forEach((l, i) => ctx.fillText(l, W / 2, y + 22 + lh * 0.78 + i * lh));
  }
  footer(ctx, W, H, T, s, footH);
}

// ================= Poster prestasi =================
function trophy(ctx, cx, cy, r, T) {
  ctx.save();
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, '#fff3c4'); g.addColorStop(0.45, T.acc); g.addColorStop(1, '#a8740b');
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 16; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate((i * Math.PI) / 8); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(-r * 0.12, 0); ctx.lineTo(r * 0.12, 0); ctx.lineTo(0, -r * 1.4); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = g; ctx.strokeStyle = g; ctx.lineWidth = r * 0.09;
  ctx.beginPath(); ctx.arc(cx - r * 0.55, cy - r * 0.35, r * 0.28, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + r * 0.55, cy - r * 0.35, r * 0.28, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.72); ctx.lineTo(cx + r * 0.6, cy - r * 0.72); ctx.quadraticCurveTo(cx + r * 0.58, cy + r * 0.15, cx, cy + r * 0.28); ctx.quadraticCurveTo(cx - r * 0.58, cy + r * 0.15, cx - r * 0.6, cy - r * 0.72); ctx.fill();
  ctx.fillRect(cx - r * 0.09, cy + r * 0.25, r * 0.18, r * 0.3);
  rr(ctx, cx - r * 0.42, cy + r * 0.52, r * 0.84, r * 0.2, r * 0.05); ctx.fill();
  rr(ctx, cx - r * 0.55, cy + r * 0.7, r * 1.1, r * 0.18, r * 0.05); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = `900 ${r * 0.42}px Poppins`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', cx, cy - r * 0.3);
  ctx.restore();
}
// o: { nama, anggota[], kelas, prestasi, tingkat, tanggal, theme, format, settings, logo, foto }
export async function renderPrestasi(canvas, o) {
  await fonts();
  const F = FORMATS[o.format] || FORMATS.feed; const T = THEMES[o.theme] || THEMES.navy; const s = o.settings;
  const W = F.w, H = F.h; canvas.width = W; canvas.height = H; const ctx = canvas.getContext('2d');
  const story = o.format === 'story', sq = o.format === 'square';
  background(ctx, W, H, T, null);
  header(ctx, W, T, o.logo, s, story ? 120 : 56, sq ? 0.8 : 0.9);
  let y = story ? 520 : sq ? 200 : 240;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = T.acc; ctx.font = `italic 700 ${sq ? 56 : story ? 86 : 70}px "Playfair Display"`; ctx.fillText('Selamat & Sukses', W / 2, y);
  const R = sq ? 120 : story ? 210 : 160; const cy = y + (sq ? 40 : 60) + R;
  if (o.foto) {
    ctx.save(); ctx.beginPath(); ctx.arc(W / 2, cy, R + 14, 0, Math.PI * 2); ctx.fillStyle = T.acc; ctx.fill(); ctx.beginPath(); ctx.arc(W / 2, cy, R, 0, Math.PI * 2); ctx.clip();
    const sc = Math.max((2 * R) / o.foto.width, (2 * R) / o.foto.height); ctx.drawImage(o.foto, W / 2 - (o.foto.width * sc) / 2, cy - (o.foto.height * sc) / 2.4, o.foto.width * sc, o.foto.height * sc); ctx.restore();
    trophy(ctx, W / 2 + R * 0.8, cy + R * 0.7, R * 0.32, T);
  } else trophy(ctx, W / 2, cy, R, T);
  y = cy + R + (sq ? 70 : story ? 120 : 92);
  ctx.textAlign = 'left'; const t = fitTitle(ctx, o.nama.toUpperCase(), W - 160, 2, sq ? 54 : story ? 74 : 62, 30); ctx.textAlign = 'center';
  ctx.fillStyle = T.ink; ctx.font = `900 ${t.size}px Poppins`; t.lines.forEach((l, i) => ctx.fillText(l, W / 2, y + i * t.size * 1.1)); y += (t.lines.length - 1) * t.size * 1.1;
  const sub = [o.kelas && 'Kelas ' + o.kelas, o.anggota && o.anggota.length ? o.anggota.length + ' anggota tim' : ''].filter(Boolean).join(' · ');
  if (sub) { y += sq ? 40 : 48; ctx.fillStyle = T.sub; ctx.font = `600 ${sq ? 26 : 30}px Poppins`; ctx.fillText(sub, W / 2, y); }
  y += sq ? 56 : 72;
  ctx.font = `800 ${sq ? 34 : story ? 46 : 40}px Poppins`; const pl = wrap(ctx, o.prestasi.toUpperCase(), W - 180).slice(0, story ? 5 : sq ? 3 : 4); const lh = sq ? 44 : story ? 58 : 52;
  ctx.fillStyle = T.card; rr(ctx, 70, y - lh + 4, W - 140, pl.length * lh + 34, 22); ctx.fill();
  ctx.fillStyle = T.acc; pl.forEach((l, i) => ctx.fillText(l, W / 2, y + 10 + i * lh)); y += pl.length * lh + (sq ? 50 : 66);
  const pill = [o.tingkat && 'Tingkat ' + o.tingkat.replace(/^tingkat\s*/i, ''), o.tanggal].filter(Boolean).join('  •  ');
  if (pill) { ctx.font = `700 ${sq ? 24 : 28}px Poppins`; const pw = Math.min(W - 140, ctx.measureText(pill).width + 56); ctx.fillStyle = T.acc; rr(ctx, W / 2 - pw / 2, y - 6, pw, sq ? 48 : 56, 28); ctx.fill(); ctx.fillStyle = T.motif === 'petal' ? '#fff' : '#10223d'; ctx.textBaseline = 'middle'; ctx.fillText(pill, W / 2, y + (sq ? 18 : 22)); ctx.textBaseline = 'alphabetic'; y += sq ? 70 : 90; }
  if (o.anggota && o.anggota.length && !sq) {
    ctx.fillStyle = T.sub; ctx.font = `400 ${story ? 28 : 24}px Poppins`;
    const names = o.anggota.slice(0, story ? 12 : 6).join(' · ') + (o.anggota.length > (story ? 12 : 6) ? ' · dkk.' : '');
    wrap(ctx, names, W - 200).slice(0, story ? 5 : 3).forEach((l, i) => ctx.fillText(l, W / 2, y + i * (story ? 40 : 34)));
  }
  footer(ctx, W, H, T, s, story ? 130 : sq ? 80 : 92);
}
