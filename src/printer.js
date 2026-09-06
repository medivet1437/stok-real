import { ThermalPrinter, bytesToBase64 } from '@devlas/capacitor-thermal-printer';

const STORAGE_KEY = 'stok-real-final-v1';
const BUTTON_ID = 'thermal-print-button';

function getDb() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

const fmt = n => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });
const dt = iso => new Date(iso || Date.now()).toLocaleString('id-ID');

function escPosText(text) {
  return new TextEncoder().encode(String(text ?? ''));
}

function bytes(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

function line(text = '') {
  return escPosText(`${text}\n`);
}

function separator(width = 32) {
  return line('-'.repeat(width));
}

function receiptRows() {
  const db = getDb();
  return (db.checks || []).slice().sort((a,b) =>
    String(b.checkedAt).localeCompare(String(a.checkedAt))
  );
}

function makeTicket(rows) {
  const parts = [
    new Uint8Array([0x1b,0x40]),
    new Uint8Array([0x1b,0x61,0x01]),
    new Uint8Array([0x1b,0x45,0x01]),
    line((getDb().settings?.storeName || 'STOK REAL')),
    new Uint8Array([0x1b,0x45,0x00]),
    line('LAPORAN PEMERIKSAAN STOK'),
    line(dt(new Date().toISOString())),
    new Uint8Array([0x1b,0x61,0x00]),
    separator()
  ];

  rows.forEach((x, i) => {
    parts.push(line(`${i + 1}. ${x.itemName || '-'}`));
    parts.push(line(`Kode : ${x.itemCode || '-'}`));
    parts.push(line(`Sistem: ${fmt(x.system)}`));
    parts.push(line(`Real  : ${fmt(x.real)}`));
    parts.push(line(`Selisih: ${x.diff > 0 ? '+' : ''}${fmt(x.diff)}`));
    parts.push(line(`Status : ${x.locked ? 'TERKUNCI' : 'DRAFT'}`));
    parts.push(line(`Waktu  : ${dt(x.checkedAt)}`));
    parts.push(separator());
  });

  parts.push(line(`Jumlah pemeriksaan: ${rows.length}`));
  parts.push(line('Dicetak dari STOK REAL'));
  parts.push(line(''));
  parts.push(line(''));
  parts.push(new Uint8Array([0x1d,0x56,0x00]));
  return bytes(parts);
}

async function openPrinterDialog() {
  const rows = receiptRows();
  if (!rows.length) {
    alert('Belum ada data pemeriksaan untuk dicetak.');
    return;
  }

  let devices;
  try {
    const result = await ThermalPrinter.list({ transport: 'bluetooth' });
    devices = result.devices || [];
  } catch (e) {
    alert('Bluetooth tidak dapat diakses. Pastikan printer sudah dipasangkan di Pengaturan Bluetooth Android.');
    return;
  }

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:#0008;z-index:9999;display:flex;align-items:flex-end;';
  const sheet = document.createElement('div');
  sheet.style.cssText = 'background:#fff;width:100%;max-height:85vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px;font-family:Arial,sans-serif;';
  sheet.innerHTML = `
    <h2 style="margin:0 0 8px">🖨️ Printer Thermal Bluetooth</h2>
    <p style="font-size:13px;color:#667;margin-top:0">
      Pilih printer yang sudah dipasangkan dengan HP.
    </p>
    <div id="printer-list"></div>
    <button id="printer-cancel" style="width:100%;padding:13px;margin-top:10px;border:0;border-radius:10px;background:#e9eef3;font-weight:700">Batal</button>
  `;
  modal.appendChild(sheet);
  document.body.appendChild(modal);

  const list = sheet.querySelector('#printer-list');
  if (!devices.length) {
    list.innerHTML = '<div style="padding:14px;background:#f7f9fb;border-radius:10px">Tidak ada printer Bluetooth yang terpasang. Pasangkan printer terlebih dahulu melalui Pengaturan Bluetooth Android.</div>';
  } else {
    devices.forEach(device => {
      const b = document.createElement('button');
      b.textContent = `🖨️ ${device.name || 'Printer'}\n${device.address || ''}`;
      b.style.cssText = 'display:block;width:100%;white-space:pre-line;text-align:left;padding:13px;margin:8px 0;border:0;border-radius:10px;background:#1769aa;color:#fff;font-weight:700;';
      b.onclick = async () => {
        b.disabled = true;
        b.textContent = '⏳ Mencetak...';
        try {
          await ThermalPrinter.requestPermission({
            transport: 'bluetooth',
            address: device.address
          });
          await ThermalPrinter.print({
            transport: 'bluetooth',
            address: device.address,
            data: bytesToBase64(makeTicket(rows))
          });
          modal.remove();
          alert('Berhasil dikirim ke printer thermal.');
        } catch (e) {
          b.disabled = false;
          b.textContent = `🖨️ ${device.name || 'Printer'}\n${device.address || ''}`;
          alert('Gagal mencetak: ' + (e?.message || 'Printer tidak merespons.'));
        }
      };
      list.appendChild(b);
    });
  }

  sheet.querySelector('#printer-cancel').onclick = () => modal.remove();
}

function addButton() {
  const toolbar = [...document.querySelectorAll('.toolbar')].find(el =>
    el.querySelector('#share') && !el.querySelector(`#${BUTTON_ID}`)
  );
  if (!toolbar) return;

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.className = 'secondary';
  button.textContent = '🖨️ Cetak Bluetooth';
  button.onclick = openPrinterDialog;
  toolbar.appendChild(button);
}

const observer = new MutationObserver(addButton);
observer.observe(document.body, { childList: true, subtree: true });
addButton();
