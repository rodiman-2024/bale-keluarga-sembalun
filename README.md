# Bale Keluarga Homestay Sembalun

Website profil villa dan homestay mewah di Sembalun Lombok yang terintegrasi penuh dengan panel **Admin CMS**, database **Google Sheets**, dan image storage **Cloudinary**.

---

## 🌄 Fitur Utama

- **Desain Luxury Villa & Responsif**: Tampilan modern, bersih, elegan, dan adaptif untuk Desktop, Tablet, dan Smartphone.
- **Identitas Warna Brand**: Disesuaikan dengan palet warna logo resmi (Royal Magenta `#9B328E` & Sunset Amber `#F59E0B`).
- **Quick Booking Bar**: Pemilihan tanggal check-in, check-out, tipe kamar, dan jumlah tamu yang langsung terhubung ke reservasi WhatsApp.
- **Katalog Kamar & Villa**: Informasi lengkap tipe kamar, harga IDR, kapasitas, fasilitas, serta popup detail kamar.
- **Galeri Foto Interaktif**: Filter kategori foto (*Semua*, *Kamar*, *Pemandangan*, *Suasana Malam*, *Fasilitas*) dengan Lightbox.
- **Panel Admin CMS (`/admin`)**:
  - Ubah seluruh teks, harga, kontak, alamat, logo, hero banner, dan identitas warna tanpa menyentuh kode.
  - Tambah, edit, dan hapus kamar, fasilitas, ulasan tamu, serta galeri foto.
  - Unggah foto langsung dari penyimpanan komputer/HP (Internal Storage) atau Cloudinary.
  - Saklar visibilitas (*toggle switch*) untuk menampilkan/menyembunyikan section frontend.
  - Manajemen reservasi tamu masuk dengan tombol chat WhatsApp langsung.
  - Pengaturan SEO meta title & description.
- **Integrasi Database Google Sheets**:
  - Kode backend Google Apps Script siap pakai (`google-apps-script/Code.gs`).
  - Fitur Push & Pull sinkronisasi dua arah.
  - Fallback database lokal (`data/content.json`) agar website selalu aktif.

---

## 🚀 Panduan Menjalankan Proyek

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+)

### 2. Instalasi
```bash
# Clone repository
git clone https://github.com/rodiman-2024/bale-keluarga-homestay-sembalun.git
cd bale-keluarga-homestay-sembalun

# Install dependencies
npm install

# Buat file environment dari template
cp .env.example .env
```

### 3. Menjalankan Server Lokal
```bash
npm start
```
- **Website Frontend**: [http://localhost:3000](http://localhost:3000)
- **Panel Admin CMS**: [http://localhost:3000/admin](http://localhost:3000/admin) *(Password default: `balekeluarga2026`)*

---

## 📊 Struktur Proyek

```text
├── data/
│   └── content.json           # Database lokal & seed data
├── google-apps-script/
│   ├── Code.gs                # Script API Google Sheets
│   └── README.md              # Panduan deploy Google Apps Script
├── public/
│   ├── admin/                 # Panel Admin CMS (HTML, CSS, JS)
│   ├── css/                   # Desain sistem & styles frontend
│   ├── images/                # Asset logo & foto villa
│   ├── js/                    # Logika interaktif frontend
│   └── index.html             # Halaman utama frontend
├── .env.example               # Template environment variables
├── .gitignore
├── package.json
├── README.md
└── server.js                  # Backend API Express
```

---

## 📄 Lisensi
Hak Cipta © 2026 Bale Keluarga Homestay Sembalun.
