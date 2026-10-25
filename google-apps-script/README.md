# Panduan Setup Google Sheets Database - Bale Keluarga Homestay Sembalun

Sistem ini menggunakan Google Sheets sebagai database utama melalui Google Apps Script Web App. Frontend dan CMS berkomunikasi secara aman melalui backend API Express.

---

## ⚡ Langkah Cepat (Hanya 2 Menit):

### Langkah 1: Buat Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) di browser Anda.
2. Beri nama spreadsheet Anda, contoh: `Database Bale Keluarga Sembalun`.

### Langkah 2: Buka Apps Script Editor
1. Di menu atas spreadsheet, klik **Extensions** (Ekstensi) > **Apps Script**.
2. Beri nama project di pojok kiri atas: `Bale Keluarga API`.
3. Hapus semua kode default di file `Code.gs`.
4. Buka file [Code.gs](file:///d:/landingpage%202/google-apps-script/Code.gs) di folder project ini, salin (**Copy**) seluruh isinya dan tempel (**Paste**) ke editor Apps Script.
5. Klik ikon **Save** (Disket / Ctrl+S).

### Langkah 3: Inisialisasi Database Otomatis
1. Di toolbar atas Apps Script editor, pilih dropdown fungsi (biasanya tertulis `myFunction`), lalu pilih:
   👉 **`setupDatabase`**
2. Klik tombol **Run** (Jalankan).
3. Jika muncul popup *Authorization required* (Izin Diperlukan):
   - Klik **Review permissions**
   - Pilih akun Google Anda
   - Klik **Advanced** (Lanjutan) di kiri bawah
   - Klik **Go to Bale Keluarga API (unsafe)**
   - Klik **Allow** (Izinkan).
4. Selesai! Buka tab spreadsheet Anda. Anda akan melihat 8 sheet telah otomatis dibuat dengan rapi:
   - `SiteSettings`
   - `SectionsVisibility`
   - `Pages`
   - `Rooms`
   - `Facilities`
   - `Gallery`
   - `Navigation`
   - `SEO`
   - `Bookings`

### Langkah 4: Deploy sebagai Web App
1. Di pojok kanan atas Apps Script, klik tombol biru **Deploy** > **New deployment**.
2. Klik ikon gerigi (Select type) > pilih **Web app**.
3. Atur konfigurasi berikut:
   - **Description**: `Bale Keluarga API v1`
   - **Execute as**: `Me (email anda)`
   - **Who has access**: **`Anyone`** *(Sangat penting: pilih "Anyone" agar API dapat membaca dan menyimpan data)*.
4. Klik **Deploy**.
5. Salin (**Copy**) **Web app URL** yang muncul (format: `https://script.google.com/macros/s/AKfycb.../exec`).

### Langkah 5: Hubungkan ke Panel Admin Website
1. Buka website Bale Keluarga Anda di browser, lalu buka panel admin: `http://localhost:3000/admin`.
2. Masuk menggunakan password admin (default: `balekeluarga2026`).
3. Buka menu **Integrasi & API**.
4. Tempelkan URL Web App pada kolom **Google Apps Script Web App URL**.
5. Klik **Tes Koneksi & Sinkronkan Sekarang**.
6. Data website dan Google Sheets kini terhubung dua arah secara realtime!
