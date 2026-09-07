# STOK REAL — Batch Signature v1

Fitur ini mengubah alur persetujuan agar pemeriksaan tidak perlu ditandatangani satu per satu.

## Perubahan
- Setelah menyimpan cek barang, hasil tetap tersimpan sebagai **Menunggu persetujuan**.
- Dialog tanda tangan otomatis per barang ditutup.
- Di **Riwayat Pengecekan**, setiap hasil yang belum dikunci mendapat checkbox.
- Tombol **Pilih semua yang menunggu** memilih seluruh pemeriksaan pending.
- Tombol **Tanda tangan & sahkan** membuka satu form tanda tangan untuk seluruh pilihan.
- Satu tanda tangan pemeriksa + satu tanda tangan penjaga dipakai untuk semua pemeriksaan yang dipilih.
- Setiap pemeriksaan tetap disimpan sebagai record individual; hanya proses pengesahannya yang batch.
- Data lama tidak diubah.

## Instalasi
1. Jangan ubah `package.json`.
2. Upload `src/batch-approval.js`.
3. Replace `index.html` dengan file `index.html` dari patch ini.
4. Commit ke `main`.
5. Jalankan Build APK seperti biasa.

Patch ini **tidak menyentuh fitur printer** dan tidak menambah dependency npm.
