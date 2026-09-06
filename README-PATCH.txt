# Patch STOK REAL — Printer Thermal Bluetooth

File yang perlu ditempatkan pada repository:
- package.json — tambahkan dependency `@devlas/capacitor-thermal-printer`
- index.html — memuat `src/printer.js`
- src/printer.js — tombol Cetak Bluetooth dan koneksi printer thermal ESC/POS

Fungsi:
1. Buka menu Laporan.
2. Tombol `🖨️ Cetak Bluetooth` muncul di samping Bagikan.
3. Printer harus sudah dipasangkan melalui Pengaturan Bluetooth Android.
4. Pilih printer.
5. Aplikasi mengirim laporan pemeriksaan stok sebagai ESC/POS.

Setelah file masuk ke repository, GitHub Actions yang sudah ada akan menjalankan `npm install`, build Vite, `npx cap add android`, dan build APK.
