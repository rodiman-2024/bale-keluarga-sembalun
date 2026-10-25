/**
 * =========================================================================
 * BALE KELUARGA HOMESTAY SEMBALUN - GOOGLE APPS SCRIPT DATABASE BACKEND
 * =========================================================================
 * Script ini berfungsi sebagai Database API RESTful untuk website dan CMS
 * Bale Keluarga Homestay Sembalun.
 * 
 * CARA DEPLOY:
 * 1. Buat Google Spreadsheet baru di Google Drive Anda.
 * 2. Klik menu "Extensions" (Ekstensi) > "Apps Script".
 * 3. Hapus semua kode default, lalu paste SELURUH isi file ini ke editor.
 * 4. Klik menu dropdown fungsi, pilih "setupDatabase", lalu klik "Run" (Jalankan)
 *    untuk membuat otomatis semua Sheet & Header kolom!
 * 5. Klik tombol "Deploy" (Terapkan) di kanan atas > "New deployment" (Penerapan baru).
 * 6. Pilih type: "Web app" (Aplikasi web).
 * 7. Konfigurasi:
 *    - Description: "Bale Keluarga API v1"
 *    - Execute as: "Me" (Saya - email Anda)
 *    - Who has access: "Anyone" (Siapa saja, bahkan anonim - PENTING agar API bisa diakses)
 * 8. Klik "Deploy", lalu SALIN "Web app URL" (akhiran /exec).
 * 9. Masukkan Web app URL tersebut ke Panel Admin CMS di menu "Integrasi Google Sheets".
 * =========================================================================
 */

// Helper: Menghasilkan output JSON dengan header CORS
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// -------------------------------------------------------------------------
// GET REQUEST HANDLER
// -------------------------------------------------------------------------
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAllContent";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "getAllContent") {
      var allData = {
        siteSettings: getSiteSettingsData(ss),
        sectionsVisibility: getSectionsVisibilityData(ss),
        pages: getSheetDataAsObjects(ss, "Pages"),
        rooms: getSheetDataAsObjects(ss, "Rooms"),
        facilities: getSheetDataAsObjects(ss, "Facilities"),
        gallery: getSheetDataAsObjects(ss, "Gallery"),
        experiences: getSheetDataAsObjects(ss, "Experiences"),
        testimonials: getSheetDataAsObjects(ss, "Testimonials"),
        navigation: getSheetDataAsObjects(ss, "Navigation"),
        seo: getSeoData(ss),
        bookings: getSheetDataAsObjects(ss, "Bookings")
      };

      return createJsonResponse({
        status: "success",
        timestamp: new Date().toISOString(),
        data: allData
      });
    }

    if (action === "ping") {
      return createJsonResponse({
        status: "success",
        message: "Google Apps Script Bale Keluarga Homestay Sembalun aktif dan terhubung!",
        spreadsheetTitle: ss.getName(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === "getSheet") {
      var sheetName = e.parameter.sheet;
      if (!sheetName) throw new Error("Parameter 'sheet' wajib diisi.");
      var sheetData = getSheetDataAsObjects(ss, sheetName);
      return createJsonResponse({
        status: "success",
        sheet: sheetName,
        data: sheetData
      });
    }

    return createJsonResponse({
      status: "error",
      message: "Action tidak dikenali: " + action
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

// -------------------------------------------------------------------------
// POST REQUEST HANDLER
// -------------------------------------------------------------------------
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Tidak ada data POST yang diterima.");
    }

    var payload = JSON.parse(e.postData.contents);
    var action = payload.action || "saveAllContent";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "saveAllContent") {
      var data = payload.data;
      if (!data) throw new Error("Payload 'data' tidak ditemukan.");

      if (data.siteSettings) saveSiteSettingsData(ss, data.siteSettings);
      if (data.sectionsVisibility) saveSectionsVisibilityData(ss, data.sectionsVisibility);
      if (data.pages) saveSheetObjects(ss, "Pages", data.pages);
      if (data.rooms) saveSheetObjects(ss, "Rooms", data.rooms);
      if (data.facilities) saveSheetObjects(ss, "Facilities", data.facilities);
      if (data.gallery) saveSheetObjects(ss, "Gallery", data.gallery);
      if (data.experiences) saveSheetObjects(ss, "Experiences", data.experiences);
      if (data.testimonials) saveSheetObjects(ss, "Testimonials", data.testimonials);
      if (data.navigation) saveSheetObjects(ss, "Navigation", data.navigation);
      if (data.seo) saveSeoData(ss, data.seo);
      if (data.bookings) saveSheetObjects(ss, "Bookings", data.bookings);

      return createJsonResponse({
        status: "success",
        message: "Seluruh konten berhasil disinkronkan ke Google Sheets!",
        timestamp: new Date().toISOString()
      });
    }

    if (action === "newBooking") {
      var booking = payload.booking;
      if (!booking) throw new Error("Data reservasi tidak ditemukan.");
      appendBooking(ss, booking);
      return createJsonResponse({
        status: "success",
        message: "Reservasi berhasil dicatat ke Google Sheets!",
        bookingId: booking.id
      });
    }

    if (action === "initSetup") {
      setupDatabase();
      return createJsonResponse({
        status: "success",
        message: "Database spreadsheet berhasil diinisialisasi dengan struktur lengkap!"
      });
    }

    return createJsonResponse({
      status: "error",
      message: "Action POST tidak valid: " + action
    });

  } catch (err) {
    return createJsonResponse({
      status: "error",
      message: err.toString()
    });
  }
}

// -------------------------------------------------------------------------
// DATA CONVERTERS & HELPERS
// -------------------------------------------------------------------------

// Membaca sheet berformat Key-Value (seperti SiteSettings & SEO)
function getKeyValueSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return {};
  var values = sheet.getDataRange().getValues();
  var result = {};
  for (var i = 1; i < values.length; i++) {
    var key = values[i][0];
    var val = values[i][1];
    if (key) {
      try {
        result[key] = (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) ? JSON.parse(val) : val;
      } catch (e) {
        result[key] = val;
      }
    }
  }
  return result;
}

function saveKeyValueSheetData(ss, sheetName, dataObj) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();
  var rows = [["Key", "Value"]];
  for (var key in dataObj) {
    var val = dataObj[key];
    if (typeof val === 'object' && val !== null) {
      rows.push([key, JSON.stringify(val)]);
    } else {
      rows.push([key, val]);
    }
  }
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  formatHeaderRow(sheet);
}

function getSiteSettingsData(ss) { return getKeyValueSheetData(ss, "SiteSettings"); }
function saveSiteSettingsData(ss, data) { saveKeyValueSheetData(ss, "SiteSettings", data); }
function getSeoData(ss) { return getKeyValueSheetData(ss, "SEO"); }
function saveSeoData(ss, data) { saveKeyValueSheetData(ss, "SEO", data); }
function getSectionsVisibilityData(ss) { return getKeyValueSheetData(ss, "SectionsVisibility"); }
function saveSectionsVisibilityData(ss, data) { saveKeyValueSheetData(ss, "SectionsVisibility", data); }

// Membaca Sheet berbentuk Tabel (Row = Record, Column = Property)
function getSheetDataAsObjects(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var list = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var item = {};
    var hasContent = false;
    for (var c = 0; c < headers.length; c++) {
      var header = headers[c];
      var cellVal = row[c];
      if (cellVal !== "" && cellVal !== null) hasContent = true;

      // Parsing boolean & JSON jika ada
      if (typeof cellVal === "string" && (cellVal.startsWith("[") || cellVal.startsWith("{"))) {
        try { item[header] = JSON.parse(cellVal); } catch (e) { item[header] = cellVal; }
      } else if (cellVal === "TRUE" || cellVal === true) {
        item[header] = true;
      } else if (cellVal === "FALSE" || cellVal === false) {
        item[header] = false;
      } else {
        item[header] = cellVal;
      }
    }
    if (hasContent) list.push(item);
  }
  return list;
}

// Menyimpan Array of Objects ke Sheet Berbentuk Tabel
function saveSheetObjects(ss, sheetName, items) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  sheet.clearContents();

  if (!items || items.length === 0) {
    sheet.getRange(1, 1).setValue("id");
    return;
  }

  // Ambil semua unique headers dari objek
  var headerSet = {};
  items.forEach(function(item) {
    Object.keys(item).forEach(function(k) { headerSet[k] = true; });
  });
  var headers = Object.keys(headerSet);

  var rows = [headers];
  items.forEach(function(item) {
    var row = [];
    headers.forEach(function(h) {
      var val = item[h];
      if (val === undefined || val === null) {
        row.push("");
      } else if (typeof val === "object") {
        row.push(JSON.stringify(val));
      } else {
        row.push(val);
      }
    });
    rows.push(row);
  });

  sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
  formatHeaderRow(sheet);
}

function appendBooking(ss, booking) {
  var sheet = ss.getSheetByName("Bookings");
  if (!sheet) {
    saveSheetObjects(ss, "Bookings", [booking]);
    return;
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var newRow = [];
  headers.forEach(function(h) {
    var val = booking[h];
    newRow.push(val !== undefined ? val : "");
  });
  sheet.appendRow(newRow);
}

function formatHeaderRow(sheet) {
  var headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setFontWeight("bold");
  headerRange.setBackground("#9B328E"); // Warna ungu khas Bale Keluarga
  headerRange.setFontColor("#FFFFFF");
  sheet.setFrozenRows(1);
}

// -------------------------------------------------------------------------
// AUTO DATABASE SETUP FUNCTION (Jalankan sekali di Google Apps Script)
// -------------------------------------------------------------------------
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. SiteSettings Sheet
  var defaultSettings = {
    villaName: "Bale Keluarga Homestay Sembalun",
    tagline: "Luxury Mountain Retreat & Authentic Family Warmth",
    subheadline: "Nikmati ketenangan 1.156 mdpl di kaki Gunung Rinjani dengan pemandangan spektakuler, udara sejuk pegunungan, kebun strawberry alami, dan kenyamanan villa berstandar premium.",
    logoUrl: "/images/logo.jpg",
    faviconUrl: "/images/logo.jpg",
    heroImage: "/images/hero-villa.jpg",
    heroBadge: "⭐️ Pilihan #1 Liburan Keluarga di Sembalun",
    primaryColor: "#9B328E",
    secondaryColor: "#F59E0B",
    darkColor: "#1E293B",
    phone: "+62 812-3456-7890",
    whatsapp: "6281234567890",
    whatsappMessage: "Halo Bale Keluarga Homestay Sembalun, saya ingin reservasi kamar untuk tanggal: ",
    email: "balekeluarga.sembalun@gmail.com",
    address: "Jl. Pariwisata Sembalun, Desa Sembalun Bumbung, Kec. Sembalun, Lombok Timur, NTB 83656",
    checkInTime: "14:00 WITA",
    checkOutTime: "12:00 WITA",
    mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3946.0614838637775!2d116.52763327572778!3d-8.493393285942475!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dcc4999f8c148bb%3A0xe54b4df9d1cf26c9!2sSembalun%2C%20East%20Lombok%20Regency%2C%20West%20Nusa%20Tenggara!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid",
    instagram: "https://instagram.com/balekeluarga.sembalun",
    facebook: "https://facebook.com/balekeluargasembalun",
    tiktok: "https://tiktok.com/@balekeluarga.sembalun",
    ratingScore: "4.9",
    ratingCount: "240+ Ulasan Puas",
    elevation: "1.156 mdpl",
    temperature: "14°C - 22°C"
  };
  saveSiteSettingsData(ss, defaultSettings);

  // 2. SectionsVisibility
  var defaultVisibility = {
    hero: true,
    quickBooking: true,
    about: true,
    rooms: true,
    facilities: true,
    gallery: true,
    experience: true,
    testimonials: true,
    location: true,
    contact: true
  };
  saveSectionsVisibilityData(ss, defaultVisibility);

  // 3. SEO Sheet
  var defaultSeo = {
    title: "Bale Keluarga Homestay Sembalun | Villa Mewah Pegunungan di Kaki Gunung Rinjani",
    description: "Bale Keluarga Homestay Sembalun menawarkan penginapan villa pegunungan mewah dan hangat di Sembalun Lombok dengan pemandangan langsung Gunung Rinjani, kebun strawberry, water heater, dan fasilitas keluarga lengkap.",
    keywords: "Bale Keluarga Homestay Sembalun, homestay sembalun, villa sembalun lombok, penginapan sembalun rinjani, hotel bukit pergasingan",
    ogImage: "/images/hero-villa.jpg",
    canonicalUrl: "https://balekeluargasembalun.com"
  };
  saveSeoData(ss, defaultSeo);

  // 4. Rooms Sheet
  var defaultRooms = [
    {
      id: "room-1",
      name: "Grand Rinjani Family Suite",
      slug: "grand-rinjani-family-suite",
      price: 850000,
      priceFormatted: "Rp 850.000",
      period: "/ malam",
      badge: "Pilihan Terfavorit",
      capacity: "4 - 6 Orang",
      bedType: "2 King Size Bed + Daybed",
      size: "56 m²",
      view: "Direct Mount Rinjani & Valley View",
      image: "/images/room-family-suite.jpg",
      gallery: ["/images/room-family-suite.jpg", "/images/breakfast-view.jpg", "/images/hero-villa.jpg"],
      description: "Suite keluarga termewah dengan dinding kaca lebar panorama Gunung Rinjani langsung dari tempat tidur. Dilengkapi perapian estetik, balkon pribadi, dan kamar mandi luas dengan pemanas air.",
      amenities: ["Private Balcony with Rinjani View", "Water Heater 24 Jam", "High-Speed Wi-Fi", "Smart TV with Netflix", "Perapian Estetik & Heater", "Free Sarapan Keluarga 4 Pax", "Free Petik Strawberry", "Coffee & Tea Maker"],
      featured: true,
      active: true,
      order: 1
    },
    {
      id: "room-2",
      name: "Pergasingan Sunrise Deluxe Villa",
      slug: "pergasingan-sunrise-deluxe-villa",
      price: 650000,
      priceFormatted: "Rp 650.000",
      period: "/ malam",
      badge: "Best Mountain View",
      capacity: "2 - 3 Orang",
      bedType: "1 Super King Bed / Twin Option",
      size: "42 m²",
      view: "Bukit Pergasingan & Pine Forest",
      image: "/images/room-rinjani-deluxe.jpg",
      gallery: ["/images/room-rinjani-deluxe.jpg", "/images/breakfast-view.jpg", "/images/night-bonfire.jpg"],
      description: "Kamar deluxe bernuansa kayu jati alami dengan teras santai berhiaskan bunga warna-warni menatap matahari terbit dari balik perbukitan.",
      amenities: ["Teras Pribadi dengan View Bukit", "Water Heater 24 Jam", "High-Speed Wi-Fi", "Free Sarapan Khas Sembalun 2 Pax", "Coffee & Tea Maker", "Private Bathroom & Hot Shower"],
      featured: true,
      active: true,
      order: 2
    },
    {
      id: "room-3",
      name: "Cozy Strawberry Wooden Cottage",
      slug: "cozy-strawberry-wooden-cottage",
      price: 500000,
      priceFormatted: "Rp 500.000",
      period: "/ malam",
      badge: "Family Friendly",
      capacity: "2 - 4 Orang",
      bedType: "1 Queen Bed + 1 Single Bed",
      size: "38 m²",
      view: "Strawberry Farm & Garden View",
      image: "/images/hero-villa.jpg",
      gallery: ["/images/hero-villa.jpg", "/images/strawberry-garden.jpg"],
      description: "Cottage kayu tradisional modern tepat di tepi kebun strawberry dengan suasana hening dan udara segar sejuk khas Sembalun.",
      amenities: ["Akses Langsung Kebun Strawberry", "Water Heater 24 Jam", "High-Speed Wi-Fi", "Free Sarapan Hangat 2 Pax", "Meja Kerja & Balkon Santai"],
      featured: false,
      active: true,
      order: 3
    }
  ];
  saveSheetObjects(ss, "Rooms", defaultRooms);

  // 5. Facilities Sheet
  var defaultFacilities = [
    { id: "fac-1", name: "Water Heater 24 Jam", icon: "fa-shower", category: "Kenyamanan", description: "Mandi air hangat bertekanan stabil kapan saja.", active: true, order: 1 },
    { id: "fac-2", name: "Wi-Fi Cepat Pegunungan", icon: "fa-wifi", category: "Konektivitas", description: "Koneksi internet stabil berkecepatan tinggi di seluruh area.", active: true, order: 2 },
    { id: "fac-3", name: "Kebun Strawberry Organik", icon: "fa-seedling", category: "Rekreasi", description: "Bebas petik buah strawberry segar langsung dari pohon.", active: true, order: 3 },
    { id: "fac-4", name: "Area Api Unggun & BBQ Night", icon: "fa-fire", category: "Aktivitas", description: "Stone fire pit & peralatan BBQ lengkap.", active: true, order: 4 },
    { id: "fac-5", name: "Sarapan Hangat & Kopi Lombok", icon: "fa-mug-hot", category: "Kuliner", description: "Sarapan lezat setiap pagi dipadu kopi khas Sembalun.", active: true, order: 5 },
    { id: "fac-6", name: "Parkir Luas & Aman", icon: "fa-square-parking", category: "Fasilitas", description: "Area parkir luas dengan pengawasan 24 jam.", active: true, order: 6 },
    { id: "fac-7", name: "Paket Trekking Rinjani & Tour", icon: "fa-mountain", category: "Petualangan", description: "Guide resmi & porter terpercaya untuk Rinjani & Pergasingan.", active: true, order: 7 },
    { id: "fac-8", name: "Dapur Bersama Lengkap", icon: "fa-kitchen-set", category: "Fasilitas", description: "Dapur bersama dengan kulkas, kompor, dispenser, alat masak.", active: true, order: 8 }
  ];
  saveSheetObjects(ss, "Facilities", defaultFacilities);

  // 6. Gallery Sheet
  var defaultGallery = [
    { id: "gal-1", title: "Bale Keluarga Panorama Villa & Rinjani", category: "pemandangan", categoryLabel: "Pemandangan & Alam", imageUrl: "/images/hero-villa.jpg", publicId: "bale_keluarga_hero_exterior", alt: "Exterior Bale Keluarga Sembalun", order: 1 },
    { id: "gal-2", title: "Grand Family Suite Bedroom", category: "kamar", categoryLabel: "Kamar & Suite", imageUrl: "/images/room-family-suite.jpg", publicId: "bale_keluarga_family_suite", alt: "Grand Family Suite Interior", order: 2 },
    { id: "gal-3", title: "Malam Api Unggun di Bawah Bintang Sembalun", category: "suasana", categoryLabel: "Suasana Malam", imageUrl: "/images/night-bonfire.jpg", publicId: "bale_keluarga_night_bonfire", alt: "Api unggun malam Bale Keluarga", order: 3 },
    { id: "gal-4", title: "Sarapan Pagi di Balkon Menatap Lembah", category: "fasilitas", categoryLabel: "Fasilitas & Kuliner", imageUrl: "/images/breakfast-view.jpg", publicId: "bale_keluarga_breakfast_view", alt: "Sarapan balkon Sembalun", order: 4 },
    { id: "gal-5", title: "Pergasingan Sunrise Deluxe Room", category: "kamar", categoryLabel: "Kamar & Suite", imageUrl: "/images/room-rinjani-deluxe.jpg", publicId: "bale_keluarga_deluxe_room", alt: "Deluxe room dengan teras pribadi", order: 5 },
    { id: "gal-6", title: "Petik Strawberry Segar di Kebun Homestay", category: "pemandangan", categoryLabel: "Pemandangan & Alam", imageUrl: "/images/strawberry-garden.jpg", publicId: "bale_keluarga_strawberry_harvest", alt: "Kebun Strawberry Sembalun", order: 6 }
  ];
  saveSheetObjects(ss, "Gallery", defaultGallery);

  // 7. Navigation Sheet
  var defaultNav = [
    { id: "nav-1", label: "Beranda", link: "#home", order: 1, active: true },
    { id: "nav-2", label: "Tentang", link: "#about", order: 2, active: true },
    { id: "nav-3", label: "Kamar & Villa", link: "#rooms", order: 3, active: true },
    { id: "nav-4", label: "Fasilitas", link: "#facilities", order: 4, active: true },
    { id: "nav-5", label: "Galeri", link: "#gallery", order: 5, active: true },
    { id: "nav-6", label: "Lokasi", link: "#location", order: 6, active: true },
    { id: "nav-7", label: "Kontak", link: "#contact", order: 7, active: true }
  ];
  saveSheetObjects(ss, "Navigation", defaultNav);

  // 8. Bookings Sheet
  var defaultBookings = [
    {
      id: "BK-BOOK-001",
      guestName: "Ahmad Fauzi",
      phone: "+62 813-9876-5432",
      email: "ahmad.fauzi@gmail.com",
      roomName: "Grand Rinjani Family Suite",
      checkIn: "2026-11-10",
      checkOut: "2026-11-12",
      guests: "4 Dewasa, 2 Anak",
      notes: "Minta extra selimut dan info paket trekking Bukit Pergasingan",
      status: "confirmed",
      createdAt: "2026-10-24T10:15:00Z"
    }
  ];
  saveSheetObjects(ss, "Bookings", defaultBookings);

  // Hapus sheet default "Sheet1" jika ada
  var sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    try { ss.deleteSheet(sheet1); } catch (e) {}
  }
}
