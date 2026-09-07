import { CapacitorThermalPrinter } from '@aybinv7/capacitor-thermal-printer';

const STYLE_ID = 'stok-real-printer-style';

function esc(s = '') {
  return String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r/g, '');
}

function addStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .stok-printer-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
    .stok-printer-btn{border:0;border-radius:10px;padding:10px 14px;font-weight:700;cursor:pointer}
    .stok-printer-btn.primary{background:#111827;color:#fff}
    .stok-printer-btn.secondary{background:#e5e7eb;color:#111827}
    .stok-printer-status{font-size:12px;margin-top:6px;opacity:.8}
    .stok-printer-list{display:grid;gap:8px;margin-top:10px}
    .stok-printer-item{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid #ddd;border-radius:10px}
  `;
  document.head.appendChild(style);
}

function getReportText() {
  const title = document.title || 'STOK REAL';
  const now = new Date().toLocaleString('id-ID');
  const report = document.querySelector('[data-report], .report, #report, main');
  let text = report?.innerText || document.body.innerText || '';
  text = text.replace(/\n{3,}/g, '\n\n');
  return `${title}\n${now}\n${'-'.repeat(32)}\n${text}\n`;
}

async function discover() {
  // The plugin exposes printer discovery through discoverDevices.
  const found = [];
  const handle = await CapacitorThermalPrinter.addListener('discoverDevices', (devices) => {
    if (Array.isArray(devices)) found.push(...devices);
    else if (devices) found.push(devices);
  });
  try {
    await CapacitorThermalPrinter.startScan();
    await new Promise(r => setTimeout(r, 2500));
  } finally {
    try { await handle.remove(); } catch {}
  }
  const unique = new Map();
  found.flat().forEach(d => {
    const address = d?.address || d?.mac || d?.deviceAddress;
    if (address) unique.set(address, {...d, address});
  });
  return [...unique.values()];
}

async function printWithPrinter(address, text) {
  const device = await CapacitorThermalPrinter.connect({ address });
  if (!device) throw new Error('Printer tidak dapat terhubung.');

  await CapacitorThermalPrinter.begin()
    .align('center')
    .bold()
    .text('STOK REAL\n')
    .clearFormatting()
    .align('left')
    .text(esc(text))
    .text('\n\n\n')
    .cutPaper()
    .write();
}

async function showPrinterDialog() {
  addStyle();

  const old = document.getElementById('stok-printer-dialog');
  if (old) old.remove();

  const dlg = document.createElement('div');
  dlg.id = 'stok-printer-dialog';
  dlg.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
  dlg.innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:18px;max-width:460px;width:100%;max-height:80vh;overflow:auto">
      <h3 style="margin:0 0 8px">🖨️ Cetak Bluetooth</h3>
      <div class="stok-printer-status" id="stok-printer-status">Mencari printer Bluetooth...</div>
      <div class="stok-printer-list" id="stok-printer-list"></div>
      <div class="stok-printer-row">
        <button class="stok-printer-btn secondary" id="stok-printer-scan">🔄 Cari Lagi</button>
        <button class="stok-printer-btn secondary" id="stok-printer-close">Tutup</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);

  const status = dlg.querySelector('#stok-printer-status');
  const list = dlg.querySelector('#stok-printer-list');
  const render = (devices) => {
    list.innerHTML = '';
    if (!devices.length) {
      status.textContent = 'Printer tidak ditemukan. Pastikan printer sudah ON dan sudah dipasangkan di Bluetooth Android.';
      return;
    }
    status.textContent = `${devices.length} perangkat ditemukan.`;
    devices.forEach(d => {
      const row = document.createElement('div');
      row.className = 'stok-printer-item';
      row.innerHTML = `<div><b>${esc(d.name || d.alias || 'Bluetooth Printer')}</b><br><small>${esc(d.address)}</small></div>
        <button class="stok-printer-btn primary">Cetak</button>`;
      row.querySelector('button').onclick = async () => {
        try {
          status.textContent = 'Menghubungkan dan mencetak...';
          await printWithPrinter(d.address, getReportText());
          status.textContent = '✅ Berhasil dikirim ke printer.';
        } catch (e) {
          console.error(e);
          status.textContent = '❌ Gagal mencetak: ' + (e?.message || e);
        }
      };
      list.appendChild(row);
    });
  };

  const scan = async () => {
    status.textContent = 'Mencari printer Bluetooth...';
    list.innerHTML = '';
    try { render(await discover()); }
    catch (e) {
      console.error(e);
      status.textContent = '❌ Bluetooth tidak dapat diakses: ' + (e?.message || e);
    }
  };
  dlg.querySelector('#stok-printer-scan').onclick = scan;
  dlg.querySelector('#stok-printer-close').onclick = () => dlg.remove();
  await scan();
}

function injectButton() {
  addStyle();
  const candidates = [...document.querySelectorAll('button')];
  const reportButton = candidates.find(b => /Bagikan|Share/i.test(b.textContent || ''));
  if (!reportButton || document.getElementById('stok-bluetooth-print-btn')) return;
  const btn = document.createElement('button');
  btn.id = 'stok-bluetooth-print-btn';
  btn.className = reportButton.className || 'stok-printer-btn primary';
  btn.textContent = '🖨️ Cetak Bluetooth';
  btn.onclick = showPrinterDialog;
  reportButton.parentElement?.appendChild(btn);
}

new MutationObserver(injectButton).observe(document.documentElement, {childList:true,subtree:true});
window.addEventListener('load', injectButton);
setTimeout(injectButton, 1000);
