/* STOK REAL — Native export/share fix for Android Capacitor 7
   Intercepts PDF/XLSX/CSV/Backup buttons and creates real files in
   the Android app cache, then opens the native Android share sheet.
   No printer dependency. Existing data model is untouched.
*/
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const KEY = 'stok-real-final-v1';

function loadDB() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {items:[], imports:[], checks:[], settings:{storeName:'STOK REAL'}};
  } catch {
    return {items:[], imports:[], checks:[], settings:{storeName:'STOK REAL'}};
  }
}
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('id-ID',{maximumFractionDigits:2});
const dt = iso => new Date(iso || Date.now()).toLocaleString('id-ID');

function rows() {
  const db = loadDB();
  return db.checks.slice().sort((a,b)=>String(b.checkedAt).localeCompare(String(a.checkedAt)));
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i=0; i<bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function textToBase64(text) {
  return bytesToBase64(new TextEncoder().encode(text));
}

async function writeAndShare(filename, base64, mime, title) {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await Filesystem.writeFile({
    path: `STOK_REAL/${safe}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true
  });
  await Share.share({
    title: title || filename,
    text: `STOK REAL — ${filename}`,
    files: [result.uri],
    dialogTitle: 'Pilih aplikasi untuk membuka / menyimpan file'
  });
}

async function exportCSVNative() {
  const a = rows();
  const s = 'Tanggal,Kode,Nama,Sistem,Real,Selisih,Status\n' +
    a.map(x => [
      dt(x.checkedAt), x.itemCode, x.itemName, x.system, x.real, x.diff,
      x.locked ? 'Terkunci' : 'Draft'
    ].map(v => '"' + String(v ?? '').replaceAll('"','""') + '"').join(',')).join('\n');
  await writeAndShare(
    'stok-real.csv',
    textToBase64(s),
    'text/csv',
    'STOK REAL — CSV'
  );
}

async function exportXLSXNative() {
  const a = rows().map(x => ({
    Tanggal: dt(x.checkedAt),
    Kode: x.itemCode,
    Nama: x.itemName,
    Sistem: x.system,
    Real: x.real,
    Selisih: x.diff,
    Status: x.locked ? 'Terkunci' : 'Draft'
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(a), 'Pengecekan');
  const base64 = XLSX.write(wb, {bookType:'xlsx', type:'base64'});
  await writeAndShare(
    'stok-real.xlsx',
    base64,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'STOK REAL — XLSX'
  );
}

async function exportPDFNative() {
  const db = loadDB();
  const d = new jsPDF();
  d.setFontSize(16);
  d.text(db.settings?.storeName || 'STOK REAL', 14, 16);
  d.setFontSize(10);
  d.text('Laporan Pengecekan Stok', 14, 24);
  let y = 34;
  rows().forEach(x => {
    const line = `${dt(x.checkedAt)} | ${x.itemCode} | ${x.itemName} | ${x.system} -> ${x.real} | ${x.diff}`;
    d.text(line.slice(0,110), 14, y);
    y += 6;
    if (y > 280) { d.addPage(); y = 16; }
  });
  const dataUrl = d.output('datauristring');
  const base64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
  await writeAndShare('stok-real.pdf', base64, 'application/pdf', 'STOK REAL — PDF');
}

async function backupNative() {
  const db = loadDB();
  const filename = `STOKREAL_BACKUP_${new Date().toISOString().slice(0,10)}.json`;
  await writeAndShare(
    filename,
    textToBase64(JSON.stringify(db, null, 2)),
    'application/json',
    'STOK REAL — Backup'
  );
}

function toast(msg, bad=false) {
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText =
    `position:fixed;left:50%;bottom:92px;transform:translateX(-50%);` +
    `background:${bad ? '#b3261e' : '#1b7f52'};color:#fff;padding:12px 16px;` +
    `border-radius:12px;z-index:99999;font-weight:700;max-width:90%;` +
    `text-align:center;box-shadow:0 4px 18px rgba(0,0,0,.25)`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2800);
}

async function run(fn) {
  try {
    toast('Menyiapkan file...');
    await fn();
  } catch (e) {
    console.error('STOK REAL export error', e);
    toast('Gagal membuat/membagikan file: ' + (e?.message || e), true);
  }
}

document.addEventListener('click', e => {
  const b = e.target.closest('#pdf,#xlsx,#csv,#share,#b');
  if (!b) return;

  // Stop main.js browser-download handlers.
  e.preventDefault();
  e.stopImmediatePropagation();

  if (b.id === 'pdf') return run(exportPDFNative);
  if (b.id === 'xlsx') return run(exportXLSXNative);
  if (b.id === 'csv') return run(exportCSVNative);
  if (b.id === 'b') return run(backupNative);

  // Share button remains a text share, but use native Capacitor Share directly.
  if (b.id === 'share') {
    const text = rows().map(x =>
      `${dt(x.checkedAt)} | ${x.itemCode} | ${x.itemName} | Sistem ${x.system} | Real ${x.real} | Selisih ${x.diff}`
    ).join('\n');
    return run(() => Share.share({title:'STOK REAL', text}));
  }
}, true);
