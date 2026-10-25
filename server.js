const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'content.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer (memory storage for seamless Cloudinary uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar (JPG, PNG, WebP) yang diizinkan!'), false);
    }
  }
});

// In-Memory Content Cache
let siteContent = null;

function loadContent() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      siteContent = JSON.parse(raw);
      console.log('✅ Local content database loaded successfully');
    } else {
      console.error('❌ Data file not found at:', DATA_FILE);
      siteContent = {};
    }
  } catch (err) {
    console.error('❌ Error reading data file:', err);
    siteContent = {};
  }
}

function saveContent() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(siteContent, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('❌ Error saving content database:', err);
    return false;
  }
}

loadContent();

// Initialize Cloudinary from env or stored integration settings
function getCloudinaryConfig() {
  const settings = siteContent?.integrations?.cloudinary || {};
  return {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || settings.cloudName || '',
    api_key: process.env.CLOUDINARY_API_KEY || settings.apiKey || '',
    api_secret: process.env.CLOUDINARY_API_SECRET || settings.apiSecret || '',
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || settings.uploadPreset || ''
  };
}

function setupCloudinary() {
  const conf = getCloudinaryConfig();
  if (conf.cloud_name && conf.api_key && conf.api_secret) {
    cloudinary.config({
      cloud_name: conf.cloud_name,
      api_key: conf.api_key,
      api_secret: conf.api_secret,
      secure: true
    });
    return true;
  }
  return false;
}

setupCloudinary();

// Helper for Google Apps Script Web App
function getGoogleScriptUrl() {
  return process.env.GOOGLE_SCRIPT_URL || siteContent?.integrations?.googleSheets?.scriptUrl || '';
}

// Admin Token Authentication
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'balekeluarga2026';
const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET || 'bale_keluarga_rinjani_sembalun_2026';

function generateAdminToken() {
  const timestamp = Date.now();
  const signature = crypto.createHmac('sha256', TOKEN_SECRET)
    .update(`${timestamp}:${ADMIN_PASSWORD}`)
    .digest('hex');
  return Buffer.from(`${timestamp}:${signature}`).toString('base64');
}

function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Akses ditolak: Token autentikasi tidak ditemukan.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [timestampStr, signature] = decoded.split(':');
    const timestamp = parseInt(timestampStr, 10);

    // 24 hour token expiration
    if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return res.status(401).json({ status: 'error', message: 'Sesi login telah kedaluwarsa. Silakan login kembali.' });
    }

    const expectedSig = crypto.createHmac('sha256', TOKEN_SECRET)
      .update(`${timestamp}:${ADMIN_PASSWORD}`)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(401).json({ status: 'error', message: 'Token tidak valid.' });
    }

    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Verifikasi token gagal.' });
  }
}

// -------------------------------------------------------------------------
// PUBLIC API ENDPOINTS
// -------------------------------------------------------------------------

// 1. Get All Live Public Content
app.get('/api/content', (req, res) => {
  loadContent();
  // Sanitize response: do not expose private credentials to public
  const publicData = JSON.parse(JSON.stringify(siteContent));
  if (publicData.integrations) {
    if (publicData.integrations.cloudinary) {
      delete publicData.integrations.cloudinary.apiSecret;
      delete publicData.integrations.cloudinary.apiKey;
    }
    if (publicData.integrations.googleSheets) {
      // Keep scriptUrl so frontend can directly verify if needed, or omit
    }
  }
  delete publicData.bookings; // Bookings are only visible to admin
  res.json({ status: 'success', data: publicData });
});

// 2. Submit Reservation Inquiry from Frontend
app.post('/api/booking', async (req, res) => {
  try {
    const { guestName, phone, email, roomName, checkIn, checkOut, guests, notes } = req.body;

    if (!guestName || !phone || !checkIn || !checkOut) {
      return res.status(400).json({ status: 'error', message: 'Nama, No WhatsApp/HP, Check-in, dan Check-out wajib diisi.' });
    }

    const newBooking = {
      id: `BK-${Date.now().toString().slice(-6)}`,
      guestName: guestName.trim(),
      phone: phone.trim(),
      email: email ? email.trim() : '-',
      roomName: roomName || 'General Inquiry',
      checkIn,
      checkOut,
      guests: guests || '2 Tamu',
      notes: notes || '-',
      status: 'new',
      createdAt: new Date().toISOString()
    };

    if (!siteContent.bookings) {
      siteContent.bookings = [];
    }
    siteContent.bookings.unshift(newBooking);
    saveContent();

    // Prepare WhatsApp Message Link
    const waNumber = (siteContent.siteSettings?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `Halo Bale Keluarga Homestay Sembalun,\n\nSaya ingin konfirmasi reservasi kamar:\n` +
      `• Kode Reservasi: ${newBooking.id}\n` +
      `• Nama: ${newBooking.guestName}\n` +
      `• Tipe Kamar: ${newBooking.roomName}\n` +
      `• Check-in: ${newBooking.checkIn}\n` +
      `• Check-out: ${newBooking.checkOut}\n` +
      `• Jumlah Tamu: ${newBooking.guests}\n` +
      `• Catatan Khusus: ${newBooking.notes}\n\n` +
      `Mohon informasikan ketersediaan dan total pembayarannya. Terima kasih!`
    );
    const waUrl = `https://wa.me/${waNumber}?text=${message}`;

    // Optionally sync new booking directly to Google Sheets in background
    const scriptUrl = getGoogleScriptUrl();
    if (scriptUrl) {
      try {
        fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'newBooking', booking: newBooking })
        }).catch(e => console.warn('Background Sheets sync error:', e.message));
      } catch (e) {}
    }

    res.json({
      status: 'success',
      message: 'Reservasi Anda telah diterima! Tim Bale Keluarga akan segera merespons.',
      booking: newBooking,
      whatsappUrl: waUrl
    });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ status: 'error', message: 'Gagal memproses reservasi: ' + err.message });
  }
});

// -------------------------------------------------------------------------
// ADMIN AUTHENTICATION
// -------------------------------------------------------------------------

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const currentPassword = process.env.ADMIN_PASSWORD || 'balekeluarga2026';

  if (!password) {
    return res.status(400).json({ status: 'error', message: 'Password wajib dimasukkan.' });
  }

  if (password === currentPassword) {
    const token = generateAdminToken();
    return res.json({
      status: 'success',
      message: 'Login berhasil! Selamat datang di Panel Admin Bale Keluarga.',
      token,
      admin: { name: 'Admin Bale Keluarga', role: 'Super Admin' }
    });
  } else {
    return res.status(401).json({ status: 'error', message: 'Password yang Anda masukkan salah.' });
  }
});

app.get('/api/admin/verify', verifyAdminToken, (req, res) => {
  res.json({ status: 'success', message: 'Token valid.' });
});

// Check Database and Storage Live Status
app.get('/api/admin/system-status', verifyAdminToken, async (req, res) => {
  loadContent();
  const conf = getCloudinaryConfig();
  const sheetsUrl = getGoogleScriptUrl();
  const hasCloudinary = !!(conf.cloud_name && conf.api_key && conf.api_secret);
  const imagesDir = path.join(__dirname, 'public', 'images');
  const hasLocalDir = fs.existsSync(imagesDir);

  let sheetsStatus = {
    configured: !!sheetsUrl,
    url: sheetsUrl || '',
    active: false,
    message: sheetsUrl ? 'Belum ditest' : 'Belum dikonfigurasi (Database Lokal Aktif)'
  };

  if (sheetsUrl) {
    try {
      const pingUrl = sheetsUrl.includes('?') ? `${sheetsUrl}&action=ping` : `${sheetsUrl}?action=ping`;
      const pingResp = await fetch(pingUrl, { signal: AbortSignal.timeout(4000) });
      const pingJson = await pingResp.json();
      if (pingJson.status === 'success') {
        sheetsStatus.active = true;
        sheetsStatus.message = 'Terhubung ke Google Spreadsheet (' + (pingJson.spreadsheetTitle || 'Active') + ')';
      } else {
        sheetsStatus.message = 'Google Apps Script merespons error: ' + (pingJson.message || 'Error');
      }
    } catch (e) {
      sheetsStatus.message = 'Gagal menghubungi Google Apps Script: ' + e.message;
    }
  }

  res.json({
    status: 'success',
    database: {
      local: {
        active: fs.existsSync(DATA_FILE),
        dataFile: DATA_FILE,
        roomsCount: (siteContent?.rooms || []).length,
        facilitiesCount: (siteContent?.facilities || []).length,
        galleryCount: (siteContent?.gallery || []).length,
        bookingsCount: (siteContent?.bookings || []).length
      },
      googleSheets: sheetsStatus
    },
    storage: {
      localStorage: {
        active: hasLocalDir,
        directory: imagesDir,
        message: 'Penyimpanan Internal Storage Komputer / Server AKTIF (Gambar disimpan di /public/images/)'
      },
      cloudinary: {
        configured: !!conf.cloud_name,
        active: hasCloudinary,
        cloudName: conf.cloud_name || '',
        message: hasCloudinary ? 'Cloudinary CDN AKTIF' : (conf.cloud_name ? 'Cloudinary parsial (kurang api_secret)' : 'Belum diisi (Menggunakan Internal Storage Lokal)')
      }
    }
  });
});

// -------------------------------------------------------------------------
// ADMIN CMS CRUD & MANAGEMENT ENDPOINTS (PROTECTED)
// -------------------------------------------------------------------------

// Get all data including bookings and credentials for CMS editor
app.get('/api/admin/content', verifyAdminToken, (req, res) => {
  loadContent();
  res.json({ status: 'success', data: siteContent });
});

// Update Entire Content or Specific Sheet
app.put('/api/admin/content', verifyAdminToken, async (req, res) => {
  try {
    const { data, autoSyncSheets } = req.body;
    if (!data) {
      return res.status(400).json({ status: 'error', message: 'Payload data tidak boleh kosong.' });
    }

    // Merge or replace
    siteContent = { ...siteContent, ...data };
    saveContent();

    let sheetsSyncResult = null;
    if (autoSyncSheets) {
      const scriptUrl = getGoogleScriptUrl();
      if (scriptUrl) {
        try {
          const resp = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'saveAllContent', data: siteContent })
          });
          const json = await resp.json();
          sheetsSyncResult = json;
          siteContent.integrations.googleSheets.lastSync = new Date().toISOString();
          saveContent();
        } catch (e) {
          sheetsSyncResult = { status: 'warning', message: 'Tersimpan lokal, namun sync Google Sheets gagal: ' + e.message };
        }
      }
    }

    res.json({
      status: 'success',
      message: 'Perubahan berhasil disimpan!',
      sheetsSync: sheetsSyncResult,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Gagal menyimpan: ' + err.message });
  }
});

// Manage Bookings
app.get('/api/admin/bookings', verifyAdminToken, (req, res) => {
  res.json({ status: 'success', bookings: siteContent.bookings || [] });
});

app.put('/api/admin/bookings/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;
  if (!siteContent.bookings) siteContent.bookings = [];

  const booking = siteContent.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ status: 'error', message: 'Data reservasi tidak ditemukan.' });
  }

  if (status) booking.status = status;
  if (notes !== undefined) booking.notes = notes;
  saveContent();

  res.json({ status: 'success', message: 'Status reservasi diperbarui.', booking });
});

app.delete('/api/admin/bookings/:id', verifyAdminToken, (req, res) => {
  const { id } = req.params;
  if (!siteContent.bookings) siteContent.bookings = [];
  siteContent.bookings = siteContent.bookings.filter(b => b.id !== id);
  saveContent();
  res.json({ status: 'success', message: 'Data reservasi dihapus.' });
});

// -------------------------------------------------------------------------
// GOOGLE SHEETS SYNC ENDPOINTS
// -------------------------------------------------------------------------

// Test Connection
app.post('/api/admin/sync/test', verifyAdminToken, async (req, res) => {
  const { scriptUrl } = req.body;
  const targetUrl = scriptUrl || getGoogleScriptUrl();

  if (!targetUrl) {
    return res.status(400).json({ status: 'error', message: 'Google Apps Script URL belum dimasukkan.' });
  }

  try {
    const url = targetUrl.includes('?') ? `${targetUrl}&action=ping` : `${targetUrl}?action=ping`;
    const response = await fetch(url);
    const result = await response.json();
    return res.json({ status: 'success', message: 'Koneksi ke Google Sheets berhasil!', details: result });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Koneksi ke Google Sheets gagal: ' + err.message });
  }
});

// Pull all data from Google Sheets into local website database
app.post('/api/admin/sync/pull', verifyAdminToken, async (req, res) => {
  const targetUrl = req.body.scriptUrl || getGoogleScriptUrl();

  if (!targetUrl) {
    return res.status(400).json({ status: 'error', message: 'Google Apps Script URL belum dikonfigurasi.' });
  }

  try {
    const url = targetUrl.includes('?') ? `${targetUrl}&action=getAllContent` : `${targetUrl}?action=getAllContent`;
    const response = await fetch(url);
    const result = await response.json();

    if (result.status === 'success' && result.data) {
      // Merge sheets data
      const sheetsData = result.data;
      if (sheetsData.siteSettings && Object.keys(sheetsData.siteSettings).length > 0) {
        siteContent.siteSettings = { ...siteContent.siteSettings, ...sheetsData.siteSettings };
      }
      if (sheetsData.sectionsVisibility && Object.keys(sheetsData.sectionsVisibility).length > 0) {
        siteContent.sectionsVisibility = { ...siteContent.sectionsVisibility, ...sheetsData.sectionsVisibility };
      }
      if (Array.isArray(sheetsData.rooms) && sheetsData.rooms.length > 0) siteContent.rooms = sheetsData.rooms;
      if (Array.isArray(sheetsData.facilities) && sheetsData.facilities.length > 0) siteContent.facilities = sheetsData.facilities;
      if (Array.isArray(sheetsData.gallery) && sheetsData.gallery.length > 0) siteContent.gallery = sheetsData.gallery;
      if (Array.isArray(sheetsData.navigation) && sheetsData.navigation.length > 0) siteContent.navigation = sheetsData.navigation;
      if (sheetsData.seo && Object.keys(sheetsData.seo).length > 0) siteContent.seo = { ...siteContent.seo, ...sheetsData.seo };
      if (Array.isArray(sheetsData.bookings) && sheetsData.bookings.length > 0) siteContent.bookings = sheetsData.bookings;

      if (!siteContent.integrations) siteContent.integrations = {};
      if (!siteContent.integrations.googleSheets) siteContent.integrations.googleSheets = {};
      siteContent.integrations.googleSheets.lastSync = new Date().toISOString();
      siteContent.integrations.googleSheets.enabled = true;
      siteContent.integrations.googleSheets.scriptUrl = targetUrl;

      saveContent();

      return res.json({
        status: 'success',
        message: 'Data berhasil ditarik (PULL) dari Google Sheets!',
        data: siteContent
      });
    } else {
      return res.status(500).json({ status: 'error', message: 'Gagal membaca response Google Sheets: ' + (result.message || 'Format tidak valid') });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Gagal sinkronisasi dari Google Sheets: ' + err.message });
  }
});

// Push local data into Google Sheets
app.post('/api/admin/sync/push', verifyAdminToken, async (req, res) => {
  const targetUrl = req.body.scriptUrl || getGoogleScriptUrl();

  if (!targetUrl) {
    return res.status(400).json({ status: 'error', message: 'Google Apps Script URL belum dikonfigurasi.' });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveAllContent',
        data: siteContent
      })
    });
    const result = await response.json();

    if (result.status === 'success') {
      if (!siteContent.integrations) siteContent.integrations = {};
      if (!siteContent.integrations.googleSheets) siteContent.integrations.googleSheets = {};
      siteContent.integrations.googleSheets.lastSync = new Date().toISOString();
      siteContent.integrations.googleSheets.enabled = true;
      siteContent.integrations.googleSheets.scriptUrl = targetUrl;
      saveContent();

      return res.json({
        status: 'success',
        message: 'Seluruh data berhasil dikirim (PUSH) ke Google Sheets!',
        details: result
      });
    } else {
      return res.status(500).json({ status: 'error', message: 'Google Sheets melaporkan error: ' + result.message });
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: 'Gagal mengirim data ke Google Sheets: ' + err.message });
  }
});

// -------------------------------------------------------------------------
// CLOUDINARY IMAGE STORAGE ENDPOINTS
// -------------------------------------------------------------------------

// Upload image to Cloudinary (or local fallback if Cloudinary not yet configured)
app.post('/api/admin/cloudinary/upload', verifyAdminToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'File gambar wajib dipilih.' });
    }

    const conf = getCloudinaryConfig();
    const hasCloudinary = conf.cloud_name && conf.api_key && conf.api_secret;

    if (hasCloudinary) {
      // Direct Cloudinary Upload via Server SDK
      setupCloudinary();
      const folder = req.body.folder || 'balekeluarga_sembalun';

      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      const result = await uploadPromise;

      return res.json({
        status: 'success',
        message: 'Gambar berhasil diupload ke Cloudinary!',
        storage: 'cloudinary',
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        width: result.width,
        height: result.height,
        thumbnailUrl: cloudinary.url(result.public_id, { width: 300, height: 200, crop: 'fill', quality: 'auto' })
      });
    } else {
      // Local Fallback Storage when Cloudinary keys are not yet filled
      const ext = path.extname(req.file.originalname) || '.jpg';
      const filename = `upload_${Date.now()}_${Math.floor(Math.random() * 1000)}${ext}`;
      const uploadPath = path.join(__dirname, 'public', 'images', filename);

      fs.writeFileSync(uploadPath, req.file.buffer);

      return res.json({
        status: 'success',
        message: 'Gambar disimpan ke server lokal (Catatan: Masukkan Cloudinary API Key di menu Integrasi untuk upload langsung ke cloud).',
        storage: 'local',
        url: `/images/${filename}`,
        publicId: filename,
        format: ext.replace('.', ''),
        width: 1200,
        height: 800,
        thumbnailUrl: `/images/${filename}`
      });
    }
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ status: 'error', message: 'Gagal mengupload gambar: ' + err.message });
  }
});

// Delete Image from Cloudinary
app.post('/api/admin/cloudinary/delete', verifyAdminToken, async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) {
    return res.status(400).json({ status: 'error', message: 'publicId gambar wajib dikirim.' });
  }

  const conf = getCloudinaryConfig();
  if (conf.cloud_name && conf.api_key && conf.api_secret) {
    try {
      setupCloudinary();
      const result = await cloudinary.uploader.destroy(publicId);
      return res.json({ status: 'success', message: 'Gambar berhasil dihapus dari Cloudinary.', result });
    } catch (err) {
      return res.status(500).json({ status: 'error', message: 'Gagal menghapus dari Cloudinary: ' + err.message });
    }
  } else {
    // If local file
    const localPath = path.join(__dirname, 'public', 'images', publicId);
    if (fs.existsSync(localPath)) {
      try { fs.unlinkSync(localPath); } catch (e) {}
    }
    return res.json({ status: 'success', message: 'Gambar lokal dihapus.' });
  }
});

// SPA Route Fallback
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Export app for Vercel Serverless
module.exports = app;

// Start Server locally if not running in Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🌄 BALE KELUARGA HOMESTAY SEMBALUN - SERVER RUNNING`);
    console.log(`🌐 Website Frontend: http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel CMS: http://localhost:${PORT}/admin`);
    console.log(`===================================================`);
  });
}
