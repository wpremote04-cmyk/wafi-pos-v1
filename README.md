# WAFI PRINTING — Aplikasi Penjualan Percetakan

Aplikasi kasir sederhana, offline, dan siap dipakai dari Visual Studio Code.

## Fitur
- Kasir / pesanan baru
- Produk dan harga bisa ditambah, edit, hapus
- Keranjang banyak item
- Diskon
- Pembayaran Cash / Transfer / QRIS / Debit
- Hitung kembalian
- Cetak nota thermal 80mm melalui dialog Print browser
- Riwayat transaksi
- Pencarian transaksi
- Laporan omzet hari ini dan bulan ini
- Pengaturan nama toko, alamat, nomor HP, footer nota
- Backup data JSON
- Data tersimpan otomatis di LocalStorage browser

## Cara menjalankan
1. Extract ZIP.
2. Buka folder di Visual Studio Code.
3. Buka `index.html`.
4. Cara paling mudah: install extension **Live Server** di VS Code.
5. Klik kanan `index.html` → **Open with Live Server**.
6. Aplikasi terbuka di browser.

Tidak membutuhkan database/server untuk versi ini.

## Cara cetak
Saat transaksi disimpan, aplikasi otomatis membuka halaman nota.
Pilih printer pada dialog browser.
Untuk printer thermal pilih ukuran kertas 80mm jika tersedia.
Untuk printer A4/A3, versi berikutnya dapat ditambahkan modul cetak invoice sesuai ukuran.

## Catatan data
Data disimpan di browser komputer tersebut. Gunakan tombol **Backup Data** secara berkala.
Jika browser/cache dihapus, data LocalStorage dapat ikut terhapus.
