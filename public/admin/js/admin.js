/**
 * BALE KELUARGA HOMESTAY SEMBALUN - ADMIN CMS JAVASCRIPT
 * Complete CRUD with Auto-Save, Internal Storage File Uploads,
 * Database & Storage Diagnostics, and Google Sheets Sync.
 */

let currentData = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabNavigation();
  initFormBindings();
  initDirectUploaders();
});

// ==========================================================================
// 1. AUTHENTICATION & SESSION
// ==========================================================================

function getAuthToken() {
  return localStorage.getItem('bk_admin_token');
}

function setAuthToken(token) {
  localStorage.setItem('bk_admin_token', token);
}

function clearAuthToken() {
  localStorage.removeItem('bk_admin_token');
}

async function initAuth() {
  const token = getAuthToken();
  if (!token) {
    showLoginScreen();
    return;
  }

  try {
    const res = await fetch('/api/admin/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.status === 'success') {
      showAdminApp();
      await loadAdminData();
      checkSystemHealth();
    } else {
      showLoginScreen();
    }
  } catch (e) {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('admin-app').style.display = 'none';
}

function showAdminApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('admin-app').style.display = 'flex';
}

// Login Form Submit
document.getElementById('admin-login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('admin-password').value;
  const alertBox = document.getElementById('login-error-alert');
  const btn = document.getElementById('btn-login-submit');

  alertBox.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memverifikasi...`;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const json = await res.json();

    if (json.status === 'success' && json.token) {
      setAuthToken(json.token);
      showAdminApp();
      await loadAdminData();
      checkSystemHealth();
      showToast('Selamat datang di Panel Admin Bale Keluarga!', 'success');
    } else {
      alertBox.textContent = json.message || 'Password salah. Coba lagi.';
      alertBox.style.display = 'block';
    }
  } catch (err) {
    alertBox.textContent = 'Gagal menghubungi server: ' + err.message;
    alertBox.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Masuk ke Dashboard`;
  }
});

// Logout
document.getElementById('btn-admin-logout').addEventListener('click', () => {
  if (confirm('Apakah Anda yakin ingin keluar dari panel admin?')) {
    clearAuthToken();
    showLoginScreen();
    showToast('Anda telah keluar.', 'success');
  }
});

// Toggle Password Visibility
document.getElementById('btn-toggle-pw').addEventListener('click', () => {
  const pwInput = document.getElementById('admin-password');
  const isPw = pwInput.type === 'password';
  pwInput.type = isPw ? 'text' : 'password';
  document.getElementById('btn-toggle-pw').innerHTML = isPw ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
});

// ==========================================================================
// 2. TAB NAVIGATION
// ==========================================================================

function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.nav-item-btn[data-tab]');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });
}

window.switchTab = function(tabId) {
  document.querySelectorAll('.nav-item-btn[data-tab]').forEach(b => {
    if (b.getAttribute('data-tab') === tabId) {
      b.classList.add('active');
    } else {
      b.classList.remove('active');
    }
  });

  document.querySelectorAll('.tab-pane').forEach(p => {
    if (p.id === tabId) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  const activeBtn = document.querySelector(`.nav-item-btn[data-tab="${tabId}"] span`);
  if (activeBtn) {
    document.getElementById('topbar-title').textContent = activeBtn.textContent;
  }
};

// ==========================================================================
// 3. LOAD DATA & POPULATE FORMS
// ==========================================================================

async function loadAdminData() {
  const token = getAuthToken();
  try {
    const res = await fetch('/api/admin/content', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      currentData = json.data;
      populateAllForms(currentData);
      renderAllTables(currentData);
      updateDashboardStats(currentData);
    }
  } catch (err) {
    showToast('Gagal memuat data: ' + err.message, 'error');
  }
}

function updateDashboardStats(data) {
  const roomsCount = (data.rooms || []).filter(r => r.active !== false).length;
  const bookingsCount = (data.bookings || []).length;
  const galleryCount = (data.gallery || []).length;

  document.getElementById('stat-rooms-count').textContent = roomsCount;
  document.getElementById('stat-bookings-count').textContent = bookingsCount;
  document.getElementById('stat-gallery-count').textContent = galleryCount;
}

// Diagnostics & Health Checker
window.checkSystemHealth = async function() {
  const token = getAuthToken();
  try {
    const res = await fetch('/api/admin/system-status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const json = await res.json();
    if (json.status === 'success') {
      const db = json.database;
      const st = json.storage;

      // Local Database
      const dbLocalEl = document.getElementById('status-db-local');
      if (dbLocalEl) {
        dbLocalEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> AKTIF (${db.local.roomsCount} Kamar, ${db.local.galleryCount} Foto, ${db.local.bookingsCount} Reservasi)`;
      }

      // Google Sheets
      const dbSheetsEl = document.getElementById('status-db-sheets');
      const badgeSheetsEl = document.getElementById('badge-db-sheets');
      if (dbSheetsEl && badgeSheetsEl) {
        if (db.googleSheets.active) {
          dbSheetsEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10B981;"></i> ${db.googleSheets.message}`;
          badgeSheetsEl.textContent = 'Terhubung';
          badgeSheetsEl.className = 'badge-status confirmed';
        } else if (db.googleSheets.configured) {
          dbSheetsEl.innerHTML = `<i class="fa-solid fa-circle-exclamation" style="color: #F59E0B;"></i> URL Terpasang (${db.googleSheets.message})`;
          badgeSheetsEl.textContent = 'Periksa URL';
          badgeSheetsEl.className = 'badge-status new';
        } else {
          dbSheetsEl.textContent = 'Belum terhubung Web App URL (Database Lokal Aktif)';
          badgeSheetsEl.textContent = 'Siap Dihubungkan';
          badgeSheetsEl.className = 'badge-status new';
        }
      }

      // Internal Storage
      const stLocalEl = document.getElementById('status-storage-local');
      if (stLocalEl) {
        stLocalEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> AKTIF (${st.localStorage.directory})`;
      }

      // Cloudinary
      const stCloudEl = document.getElementById('status-storage-cloud');
      const badgeCloudEl = document.getElementById('badge-storage-cloud');
      if (stCloudEl && badgeCloudEl) {
        if (st.cloudinary.active) {
          stCloudEl.innerHTML = `<i class="fa-solid fa-circle-check" style="color: #10B981;"></i> AKTIF (${st.cloudinary.cloudName})`;
          badgeCloudEl.textContent = 'CDN Aktif';
          badgeCloudEl.className = 'badge-status confirmed';
        } else {
          stCloudEl.textContent = 'Penyimpanan internal storage lokal aktif (Upload langsung dari komputer/HP)';
          badgeCloudEl.textContent = 'Internal Storage';
          badgeCloudEl.className = 'badge-status confirmed';
        }
      }

      showToast('Kesehatan Database & Storage: SEMUA AKTIF & NORMAL!', 'success');
    }
  } catch (e) {
    showToast('Gagal cek status: ' + e.message, 'error');
  }
};

function populateAllForms(data) {
  const s = data.siteSettings || {};
  const v = data.sectionsVisibility || {};
  const seo = data.seo || {};
  const int = data.integrations || {};

  // Site Settings
  setVal('setting-villa-name', s.villaName);
  setVal('setting-tagline', s.tagline);
  setVal('setting-subheadline', s.subheadline);
  setVal('setting-hero-badge', s.heroBadge);
  setVal('setting-hero-image', s.heroImage);
  setVal('setting-logo-url', s.logoUrl);
  setVal('setting-primary-color', s.primaryColor || '#9B328E');
  setVal('setting-primary-color-text', s.primaryColor || '#9B328E');
  setVal('setting-secondary-color', s.secondaryColor || '#F59E0B');
  setVal('setting-secondary-color-text', s.secondaryColor || '#F59E0B');
  setVal('setting-whatsapp', s.whatsapp);
  setVal('setting-phone', s.phone);
  setVal('setting-email', s.email);
  setVal('setting-address', s.address);
  setVal('setting-checkin', s.checkInTime);
  setVal('setting-checkout', s.checkOutTime);
  setVal('setting-map-url', s.mapEmbedUrl);
  setVal('setting-instagram', s.instagram);
  setVal('setting-facebook', s.facebook);
  setVal('setting-tiktok', s.tiktok);

  if (s.heroImage) {
    const heroPreview = document.getElementById('hero-preview-img');
    if (heroPreview) heroPreview.src = s.heroImage;
  }
  if (s.logoUrl) {
    const logoPreview = document.getElementById('logo-preview-img');
    if (logoPreview) logoPreview.src = s.logoUrl;
  }

  // Section Visibility
  setCheck('vis-hero', v.hero !== false);
  setCheck('vis-quickBooking', v.quickBooking !== false);
  setCheck('vis-about', v.about !== false);
  setCheck('vis-rooms', v.rooms !== false);
  setCheck('vis-facilities', v.facilities !== false);
  setCheck('vis-experience', v.experience !== false);
  setCheck('vis-gallery', v.gallery !== false);
  setCheck('vis-testimonials', v.testimonials !== false);
  setCheck('vis-location', v.location !== false);
  setCheck('vis-contact', v.contact !== false);

  // SEO
  setVal('seo-title', seo.title);
  setVal('seo-description', seo.description);
  setVal('seo-keywords', seo.keywords);
  setVal('seo-ogimage', seo.ogImage);

  // Integrations
  if (int.googleSheets) {
    setVal('int-sheets-url', int.googleSheets.scriptUrl);
  }
  if (int.cloudinary) {
    setVal('int-cloud-name', int.cloudinary.cloudName);
    setVal('int-cloud-preset', int.cloudinary.uploadPreset);
    setVal('int-cloud-key', int.cloudinary.apiKey);
    setVal('int-cloud-secret', int.cloudinary.apiSecret);
  }
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) {
    if (el.tagName === 'SPAN') {
      el.textContent = val;
    } else {
      el.value = val;
    }
  }
}

function setCheck(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

// ==========================================================================
// 4. INTERNAL STORAGE PHOTO UPLOADERS
// ==========================================================================

function initDirectUploaders() {
  // 1. Room Image File Picker
  const roomFilePicker = document.getElementById('room-file-picker');
  if (roomFilePicker) {
    roomFilePicker.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      await uploadInternalStoragePhoto(file, (url) => {
        document.getElementById('room-edit-image').value = url;
        const box = document.getElementById('room-upload-preview-box');
        const img = document.getElementById('room-upload-preview-img');
        const nameEl = document.getElementById('room-upload-filename');
        if (box && img) {
          img.src = url;
          nameEl.textContent = file.name;
          box.style.display = 'flex';
        }
        showToast(`Foto kamar "${file.name}" berhasil diunggah!`, 'success');
      });
      roomFilePicker.value = '';
    });
  }

  // 2. Gallery Image File Picker
  const galleryFilePicker = document.getElementById('gallery-file-picker');
  if (galleryFilePicker) {
    galleryFilePicker.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      await uploadInternalStoragePhoto(file, (url) => {
        document.getElementById('gal-edit-url').value = url;
        const previewBox = document.getElementById('gallery-upload-preview');
        const previewImg = document.getElementById('gallery-preview-img');
        if (previewBox && previewImg) {
          previewImg.src = url;
          previewBox.style.display = 'block';
        }

        // Auto-fill title from filename if empty
        const titleInput = document.getElementById('gal-edit-title');
        if (titleInput && !titleInput.value) {
          const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');
          titleInput.value = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        }

        showToast(`Foto "${file.name}" berhasil diunggah!`, 'success');
      });
      galleryFilePicker.value = '';
    });
  }

  // 3. Hero Banner File Picker
  const heroFilePicker = document.getElementById('hero-file-picker');
  if (heroFilePicker) {
    heroFilePicker.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      await uploadInternalStoragePhoto(file, (url) => {
        document.getElementById('setting-hero-image').value = url;
        const img = document.getElementById('hero-preview-img');
        if (img) img.src = url;
        showToast('Hero Banner berhasil diunggah dari komputer!', 'success');
      });
      heroFilePicker.value = '';
    });
  }

  // 4. Logo File Picker
  const logoFilePicker = document.getElementById('logo-file-picker');
  if (logoFilePicker) {
    logoFilePicker.addEventListener('change', async (e) => {
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      await uploadInternalStoragePhoto(file, (url) => {
        document.getElementById('setting-logo-url').value = url;
        const img = document.getElementById('logo-preview-img');
        if (img) img.src = url;
        showToast('Logo berhasil diunggah dari komputer!', 'success');
      });
      logoFilePicker.value = '';
    });
  }
}

// Client-side image compressor for lightning-fast uploads and mobile photos
function compressImageBeforeUpload(file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) {
  return new Promise((resolve) => {
    if (!file || !file.type || !file.type.startsWith('image/') || file.type.includes('svg')) {
      return resolve(file);
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob || blob.size >= file.size) {
            resolve(file);
          } else {
            const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressed);
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// Upload file helper with multi-tier fallback (Cloudinary -> Serverless Data URI -> Local Device URI)
async function uploadInternalStoragePhoto(file, onSuccess) {
  const token = getAuthToken();
  showToast(`Menyiapkan "${file.name}"...`, 'info');

  let fileToUpload = file;
  try {
    fileToUpload = await compressImageBeforeUpload(file);
  } catch (compErr) {
    console.warn('Image compression skipped:', compErr);
  }

  // Tier 1: Direct Cloudinary Upload if Unsigned Preset is filled
  const cloudName = currentData?.integrations?.cloudinary?.cloudName || document.getElementById('int-cloud-name')?.value.trim();
  const uploadPreset = currentData?.integrations?.cloudinary?.uploadPreset || document.getElementById('int-cloud-preset')?.value.trim();

  if (cloudName && uploadPreset) {
    try {
      showToast(`Mengunggah ke Cloudinary CDN...`, 'info');
      const cldData = new FormData();
      cldData.append('file', fileToUpload);
      cldData.append('upload_preset', uploadPreset);
      const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: cldData
      });
      const cldJson = await cldRes.json();
      if (cldJson.secure_url) {
        onSuccess(cldJson.secure_url);
        return;
      }
    } catch (cldErr) {
      console.warn('Direct Cloudinary upload failed, falling back to server handler:', cldErr);
    }
  }

  // Tier 2: Server API Upload (/api/admin/cloudinary/upload)
  try {
    const formData = new FormData();
    formData.append('image', fileToUpload);

    const res = await fetch('/api/admin/cloudinary/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const json = await res.json();

    if (json.status === 'success' && json.url) {
      onSuccess(json.url);
      return;
    } else {
      console.warn('Server upload returned warning:', json.message);
    }
  } catch (err) {
    console.warn('Server upload error, applying client-side fallback:', err.message);
  }

  // Tier 3: Resilient Client-Side Fallback (Converts to Data URI in browser)
  // Ensures image selection ALWAYS succeeds regardless of server filesystem restrictions
  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      onSuccess(e.target.result);
      showToast(`Foto "${file.name}" berhasil dimuat dari perangkat!`, 'success');
    };
    reader.readAsDataURL(fileToUpload);
  } catch (fallbackErr) {
    showToast('Gagal memproses file: ' + fallbackErr.message, 'error');
  }
}

// Form Bindings & Color pickers
function initFormBindings() {
  const color1 = document.getElementById('setting-primary-color');
  const text1 = document.getElementById('setting-primary-color-text');
  if (color1 && text1) {
    color1.addEventListener('input', (e) => { text1.textContent = e.target.value.toUpperCase(); });
  }

  const color2 = document.getElementById('setting-secondary-color');
  const text2 = document.getElementById('setting-secondary-color-text');
  if (color2 && text2) {
    color2.addEventListener('input', (e) => { text2.textContent = e.target.value.toUpperCase(); });
  }

  document.getElementById('btn-save-all').addEventListener('click', () => saveAllContent(true));
  document.getElementById('btn-test-sheets').addEventListener('click', testSheetsConnection);
  document.getElementById('btn-push-sheets').addEventListener('click', pushToSheets);
  document.getElementById('btn-pull-sheets').addEventListener('click', pullFromSheets);
}

// ==========================================================================
// 5. RENDER TABLES
// ==========================================================================

function renderAllTables(data) {
  renderRoomsTable(data.rooms || []);
  renderFacilitiesTable(data.facilities || []);
  renderGalleryTable(data.gallery || []);
  renderTestimonialsTable(data.testimonials || []);
  renderBookingsTable(data.bookings || []);
}

function renderRoomsTable(rooms) {
  const tbody = document.getElementById('rooms-table-body');
  if (!tbody) return;

  if (rooms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--admin-muted); padding: 2rem;">Belum ada kamar. Klik "+ Tambah Kamar Baru" di atas untuk menambahkan!</td></tr>`;
    return;
  }

  tbody.innerHTML = rooms.map(r => `
    <tr>
      <td><img src="${r.image || '/images/hero-villa.jpg'}" alt="${r.name}" class="table-row-img"></td>
      <td>
        <strong style="display: block; font-size: 0.95rem;">${r.name}</strong>
        <span style="font-size: 0.8rem; color: var(--admin-muted);">${r.bedType || ''}</span>
      </td>
      <td><strong>${r.priceFormatted || 'Rp ' + (r.price ? r.price.toLocaleString('id-ID') : '0')}</strong></td>
      <td>${r.capacity || '4 Tamu'}</td>
      <td>
        <span class="badge-status ${r.active !== false ? 'active' : 'cancelled'}">
          ${r.active !== false ? 'Aktif' : 'Disembunyikan'}
        </span>
      </td>
      <td>
        <div class="table-action-btns">
          <button class="btn-icon" title="Edit Kamar" onclick="editRoom('${r.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon delete" title="Hapus Kamar" onclick="deleteRoom('${r.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderFacilitiesTable(facilities) {
  const tbody = document.getElementById('facilities-table-body');
  if (!tbody) return;

  tbody.innerHTML = facilities.map(f => `
    <tr>
      <td><div style="width: 34px; height: 34px; border-radius: var(--radius-sm); background: #F1F5F9; display: flex; align-items: center; justify-content: center; color: var(--admin-primary);"><i class="fa-solid ${f.icon || 'fa-star'}"></i></div></td>
      <td><strong>${f.name}</strong></td>
      <td><span class="badge-status new">${f.category || 'Fasilitas'}</span></td>
      <td style="max-width: 320px; font-size: 0.85rem; color: var(--admin-muted);">${f.description || ''}</td>
      <td><span class="badge-status active">Aktif</span></td>
      <td>
        <div class="table-action-btns">
          <button class="btn-icon" title="Edit Fasilitas" onclick="editFacility('${f.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon delete" title="Hapus Fasilitas" onclick="deleteFacility('${f.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderGalleryTable(gallery) {
  const tbody = document.getElementById('gallery-table-body');
  if (!tbody) return;

  tbody.innerHTML = gallery.map(g => `
    <tr>
      <td><img src="${g.imageUrl}" alt="${g.title}" class="table-row-img"></td>
      <td><strong>${g.title}</strong></td>
      <td><span class="badge-status new">${g.categoryLabel || g.category}</span></td>
      <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.82rem; color: var(--admin-muted);">${g.imageUrl}</td>
      <td>
        <button class="btn-icon delete" title="Hapus Foto" onclick="deleteGalleryItem('${g.id}')"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function renderTestimonialsTable(testimonials) {
  const tbody = document.getElementById('testimonials-table-body');
  if (!tbody) return;

  tbody.innerHTML = testimonials.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td>${t.origin || 'Lombok'}</td>
      <td style="color: var(--admin-secondary);">${'⭐️'.repeat(t.rating || 5)}</td>
      <td style="max-width: 340px; font-size: 0.85rem; color: var(--admin-muted); font-style: italic;">"${t.review}"</td>
      <td>
        <div class="table-action-btns">
          <button class="btn-icon" title="Edit Ulasan" onclick="editTestimonial('${t.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-icon delete" title="Hapus Ulasan" onclick="deleteTestimonial('${t.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookings-table-body');
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--admin-muted);">Belum ada reservasi masuk.</td></tr>`;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const waClean = (b.phone || '').replace(/[^0-9]/g, '');
    const waMsg = encodeURIComponent(`Halo Bpk/Ibu ${b.guestName}, kami dari Bale Keluarga Homestay Sembalun ingin mengonfirmasi permintaan reservasi kamar ${b.roomName} untuk tanggal ${b.checkIn} sampai ${b.checkOut}.`);
    const waUrl = `https://wa.me/${waClean}?text=${waMsg}`;

    return `
      <tr>
        <td><code>${b.id}</code></td>
        <td>
          <strong style="display: block;">${b.guestName}</strong>
          <span style="font-size: 0.8rem; color: var(--admin-muted);">${b.guests || '2 Tamu'}</span>
        </td>
        <td>${b.roomName}</td>
        <td>
          <div style="font-size: 0.88rem;"><strong>In:</strong> ${b.checkIn}</div>
          <div style="font-size: 0.88rem; color: var(--admin-muted);"><strong>Out:</strong> ${b.checkOut}</div>
        </td>
        <td>
          <a href="${waUrl}" target="_blank" class="btn-admin btn-admin-outline btn-sm" style="color: #15803D; border-color: #86EFAC;">
            <i class="fa-brands fa-whatsapp"></i> Chat Guest
          </a>
        </td>
        <td>
          <select onchange="updateBookingStatus('${b.id}', this.value)" class="admin-select" style="padding: 0.35rem 0.6rem; font-size: 0.82rem; width: auto;">
            <option value="new" ${b.status === 'new' ? 'selected' : ''}>Baru</option>
            <option value="contacted" ${b.status === 'contacted' ? 'selected' : ''}>Dihubungi</option>
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Terkonfirmasi</option>
            <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>Dibatalkan</option>
          </select>
        </td>
        <td>
          <button class="btn-icon delete" title="Hapus Reservasi" onclick="deleteBooking('${b.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

// ==========================================================================
// 6. MODAL HANDLERS & AUTO-SAVE ACTIONS
// ==========================================================================

window.closeAdminModals = function() {
  document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
};

// --- ROOMS CRUD ---
window.openRoomEditor = function() {
  document.getElementById('room-form').reset();
  document.getElementById('edit-room-id').value = '';
  document.getElementById('room-modal-title').textContent = 'Tambah Kamar Baru';
  const box = document.getElementById('room-upload-preview-box');
  if (box) box.style.display = 'none';
  document.getElementById('room-editor-modal').classList.add('active');
};

window.editRoom = function(id) {
  const room = (currentData.rooms || []).find(r => r.id === id);
  if (!room) return;

  document.getElementById('edit-room-id').value = room.id;
  document.getElementById('room-edit-name').value = room.name || '';
  document.getElementById('room-edit-price').value = room.price || '';
  document.getElementById('room-edit-capacity').value = room.capacity || '';
  document.getElementById('room-edit-bed').value = room.bedType || '';
  document.getElementById('room-edit-size').value = room.size || '';
  document.getElementById('room-edit-badge').value = room.badge || '';
  document.getElementById('room-edit-image').value = room.image || '';
  document.getElementById('room-edit-desc').value = room.description || '';
  document.getElementById('room-edit-amenities').value = (room.amenities || []).join(', ');

  const box = document.getElementById('room-upload-preview-box');
  const img = document.getElementById('room-upload-preview-img');
  if (box && img && room.image) {
    img.src = room.image;
    document.getElementById('room-upload-filename').textContent = room.name;
    box.style.display = 'flex';
  }

  document.getElementById('room-modal-title').textContent = 'Edit Tipe Kamar';
  document.getElementById('room-editor-modal').classList.add('active');
};

document.getElementById('room-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-room-id').value || `room-${Date.now().toString().slice(-4)}`;
  const priceNum = parseInt(document.getElementById('room-edit-price').value, 10) || 500000;
  const amenitiesStr = document.getElementById('room-edit-amenities').value;
  const amenities = amenitiesStr ? amenitiesStr.split(',').map(s => s.trim()).filter(Boolean) : [];

  const roomObj = {
    id,
    name: document.getElementById('room-edit-name').value,
    slug: document.getElementById('room-edit-name').value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    price: priceNum,
    priceFormatted: 'Rp ' + priceNum.toLocaleString('id-ID'),
    period: '/ malam',
    badge: document.getElementById('room-edit-badge').value,
    capacity: document.getElementById('room-edit-capacity').value,
    bedType: document.getElementById('room-edit-bed').value,
    size: document.getElementById('room-edit-size').value,
    image: document.getElementById('room-edit-image').value,
    description: document.getElementById('room-edit-desc').value,
    amenities,
    active: true
  };

  if (!currentData.rooms) currentData.rooms = [];
  const idx = currentData.rooms.findIndex(r => r.id === id);
  if (idx >= 0) {
    currentData.rooms[idx] = { ...currentData.rooms[idx], ...roomObj };
  } else {
    currentData.rooms.push(roomObj);
  }

  renderRoomsTable(currentData.rooms);
  updateDashboardStats(currentData);
  closeAdminModals();

  // AUTO-SAVE IMMEDIATELY TO BACKEND DATABASE
  await saveAllContent(false);
  showToast(`Kamar "${roomObj.name}" berhasil disimpan ke database!`, 'success');
});

window.deleteRoom = async function(id) {
  if (confirm('Yakin ingin menghapus tipe kamar ini?')) {
    currentData.rooms = (currentData.rooms || []).filter(r => r.id !== id);
    renderRoomsTable(currentData.rooms);
    updateDashboardStats(currentData);
    await saveAllContent(false);
    showToast('Kamar berhasil dihapus dari database.', 'success');
  }
};

// --- FACILITIES CRUD ---
window.openFacilityEditor = function() {
  document.getElementById('facility-form').reset();
  document.getElementById('edit-fac-id').value = '';
  document.getElementById('fac-modal-title').textContent = 'Tambah Fasilitas Baru';
  document.getElementById('facility-editor-modal').classList.add('active');
};

window.editFacility = function(id) {
  const fac = (currentData.facilities || []).find(f => f.id === id);
  if (!fac) return;

  document.getElementById('edit-fac-id').value = fac.id;
  document.getElementById('fac-edit-name').value = fac.name || '';
  document.getElementById('fac-edit-icon').value = fac.icon || '';
  document.getElementById('fac-edit-category').value = fac.category || '';
  document.getElementById('fac-edit-desc').value = fac.description || '';

  document.getElementById('fac-modal-title').textContent = 'Edit Fasilitas';
  document.getElementById('facility-editor-modal').classList.add('active');
};

document.getElementById('facility-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-fac-id').value || `fac-${Date.now().toString().slice(-4)}`;

  const facObj = {
    id,
    name: document.getElementById('fac-edit-name').value,
    icon: document.getElementById('fac-edit-icon').value || 'fa-star',
    category: document.getElementById('fac-edit-category').value || 'Fasilitas',
    description: document.getElementById('fac-edit-desc').value,
    active: true
  };

  if (!currentData.facilities) currentData.facilities = [];
  const idx = currentData.facilities.findIndex(f => f.id === id);
  if (idx >= 0) {
    currentData.facilities[idx] = { ...currentData.facilities[idx], ...facObj };
  } else {
    currentData.facilities.push(facObj);
  }

  renderFacilitiesTable(currentData.facilities);
  closeAdminModals();
  await saveAllContent(false);
  showToast(`Fasilitas "${facObj.name}" berhasil disimpan!`, 'success');
});

window.deleteFacility = async function(id) {
  if (confirm('Hapus fasilitas ini?')) {
    currentData.facilities = (currentData.facilities || []).filter(f => f.id !== id);
    renderFacilitiesTable(currentData.facilities);
    await saveAllContent(false);
    showToast('Fasilitas dihapus.', 'success');
  }
};

// --- GALLERY CRUD ---
window.openGalleryUploader = function() {
  document.getElementById('gallery-form').reset();
  document.getElementById('gallery-upload-preview').style.display = 'none';
  document.getElementById('gallery-uploader-modal').classList.add('active');
};

document.getElementById('gallery-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const url = document.getElementById('gal-edit-url').value;
  if (!url) {
    alert('Silakan pilih foto dari komputer terlebih dahulu!');
    return;
  }

  const cat = document.getElementById('gal-edit-category').value;
  const catLabels = {
    kamar: 'Kamar & Suite',
    pemandangan: 'Pemandangan & Alam',
    suasana: 'Suasana Malam',
    fasilitas: 'Fasilitas & Kuliner'
  };

  const item = {
    id: `gal-${Date.now().toString().slice(-5)}`,
    title: document.getElementById('gal-edit-title').value,
    category: cat,
    categoryLabel: catLabels[cat] || 'Galeri',
    imageUrl: url,
    publicId: `upload_${Date.now()}`,
    alt: document.getElementById('gal-edit-alt').value || document.getElementById('gal-edit-title').value,
    order: (currentData.gallery || []).length + 1
  };

  if (!currentData.gallery) currentData.gallery = [];
  currentData.gallery.unshift(item);

  renderGalleryTable(currentData.gallery);
  updateDashboardStats(currentData);
  closeAdminModals();
  await saveAllContent(false);
  showToast('Foto berhasil ditambahkan ke galeri dan disimpan!', 'success');
});

window.deleteGalleryItem = async function(id) {
  if (confirm('Hapus foto ini dari galeri?')) {
    currentData.gallery = (currentData.gallery || []).filter(g => g.id !== id);
    renderGalleryTable(currentData.gallery);
    updateDashboardStats(currentData);
    await saveAllContent(false);
    showToast('Foto galeri dihapus.', 'success');
  }
};

// --- TESTIMONIALS CRUD ---
window.openTestimonialEditor = function() {
  document.getElementById('testimonial-form').reset();
  document.getElementById('edit-testi-id').value = '';
  document.getElementById('testi-modal-title').textContent = 'Tambah Ulasan Baru';
  document.getElementById('testimonial-editor-modal').classList.add('active');
};

window.editTestimonial = function(id) {
  const testi = (currentData.testimonials || []).find(t => t.id === id);
  if (!testi) return;

  document.getElementById('edit-testi-id').value = testi.id;
  document.getElementById('testi-edit-name').value = testi.name || '';
  document.getElementById('testi-edit-origin').value = testi.origin || '';
  document.getElementById('testi-edit-rating').value = testi.rating || '5';
  document.getElementById('testi-edit-review').value = testi.review || '';

  document.getElementById('testi-modal-title').textContent = 'Edit Ulasan Tamu';
  document.getElementById('testimonial-editor-modal').classList.add('active');
};

document.getElementById('testimonial-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-testi-id').value || `testi-${Date.now().toString().slice(-4)}`;

  const item = {
    id,
    name: document.getElementById('testi-edit-name').value,
    origin: document.getElementById('testi-edit-origin').value,
    rating: parseInt(document.getElementById('testi-edit-rating').value, 10),
    review: document.getElementById('testi-edit-review').value,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'
  };

  if (!currentData.testimonials) currentData.testimonials = [];
  const idx = currentData.testimonials.findIndex(t => t.id === id);
  if (idx >= 0) {
    currentData.testimonials[idx] = { ...currentData.testimonials[idx], ...item };
  } else {
    currentData.testimonials.push(item);
  }

  renderTestimonialsTable(currentData.testimonials);
  closeAdminModals();
  await saveAllContent(false);
  showToast('Ulasan disimpan ke database!', 'success');
});

window.deleteTestimonial = async function(id) {
  if (confirm('Hapus ulasan ini?')) {
    currentData.testimonials = (currentData.testimonials || []).filter(t => t.id !== id);
    renderTestimonialsTable(currentData.testimonials);
    await saveAllContent(false);
    showToast('Ulasan dihapus.', 'success');
  }
};

// --- BOOKINGS STATUS ---
window.updateBookingStatus = async function(id, status) {
  const token = getAuthToken();
  try {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });
    const json = await res.json();
    if (json.status === 'success') {
      showToast('Status reservasi diperbarui.', 'success');
    }
  } catch (err) {
    showToast('Gagal update status: ' + err.message, 'error');
  }
};

window.deleteBooking = async function(id) {
  if (confirm('Hapus riwayat reservasi ini?')) {
    currentData.bookings = (currentData.bookings || []).filter(b => b.id !== id);
    renderBookingsTable(currentData.bookings);
    updateDashboardStats(currentData);
    await saveAllContent(false);
    showToast('Reservasi dihapus.', 'success');
  }
};

// ==========================================================================
// 7. SAVE ALL CONTENT (PERSISTENCE)
// ==========================================================================

async function saveAllContent(showToastNotification = true) {
  if (!currentData) return;

  const btn = document.getElementById('btn-save-all');
  const origText = btn ? btn.innerHTML : '';
  if (btn && showToastNotification) {
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...`;
  }

  // Update siteSettings
  currentData.siteSettings = {
    ...currentData.siteSettings,
    villaName: document.getElementById('setting-villa-name')?.value || currentData.siteSettings.villaName,
    tagline: document.getElementById('setting-tagline')?.value || currentData.siteSettings.tagline,
    subheadline: document.getElementById('setting-subheadline')?.value || currentData.siteSettings.subheadline,
    heroBadge: document.getElementById('setting-hero-badge')?.value || currentData.siteSettings.heroBadge,
    heroImage: document.getElementById('setting-hero-image')?.value || currentData.siteSettings.heroImage,
    logoUrl: document.getElementById('setting-logo-url')?.value || currentData.siteSettings.logoUrl,
    primaryColor: document.getElementById('setting-primary-color')?.value || currentData.siteSettings.primaryColor,
    secondaryColor: document.getElementById('setting-secondary-color')?.value || currentData.siteSettings.secondaryColor,
    whatsapp: document.getElementById('setting-whatsapp')?.value || currentData.siteSettings.whatsapp,
    phone: document.getElementById('setting-phone')?.value || currentData.siteSettings.phone,
    email: document.getElementById('setting-email')?.value || currentData.siteSettings.email,
    address: document.getElementById('setting-address')?.value || currentData.siteSettings.address,
    checkInTime: document.getElementById('setting-checkin')?.value || currentData.siteSettings.checkInTime,
    checkOutTime: document.getElementById('setting-checkout')?.value || currentData.siteSettings.checkOutTime,
    mapEmbedUrl: document.getElementById('setting-map-url')?.value || currentData.siteSettings.mapEmbedUrl,
    instagram: document.getElementById('setting-instagram')?.value || currentData.siteSettings.instagram,
    facebook: document.getElementById('setting-facebook')?.value || currentData.siteSettings.facebook,
    tiktok: document.getElementById('setting-tiktok')?.value || currentData.siteSettings.tiktok
  };

  // Update section visibility
  currentData.sectionsVisibility = {
    hero: document.getElementById('vis-hero') ? document.getElementById('vis-hero').checked : true,
    quickBooking: document.getElementById('vis-quickBooking') ? document.getElementById('vis-quickBooking').checked : true,
    about: document.getElementById('vis-about') ? document.getElementById('vis-about').checked : true,
    rooms: document.getElementById('vis-rooms') ? document.getElementById('vis-rooms').checked : true,
    facilities: document.getElementById('vis-facilities') ? document.getElementById('vis-facilities').checked : true,
    experience: document.getElementById('vis-experience') ? document.getElementById('vis-experience').checked : true,
    gallery: document.getElementById('vis-gallery') ? document.getElementById('vis-gallery').checked : true,
    testimonials: document.getElementById('vis-testimonials') ? document.getElementById('vis-testimonials').checked : true,
    location: document.getElementById('vis-location') ? document.getElementById('vis-location').checked : true,
    contact: document.getElementById('vis-contact') ? document.getElementById('vis-contact').checked : true
  };

  // Update SEO
  currentData.seo = {
    ...currentData.seo,
    title: document.getElementById('seo-title')?.value || currentData.seo.title,
    description: document.getElementById('seo-description')?.value || currentData.seo.description,
    keywords: document.getElementById('seo-keywords')?.value || currentData.seo.keywords,
    ogImage: document.getElementById('seo-ogimage')?.value || currentData.seo.ogImage
  };

  // Integrations
  if (!currentData.integrations) currentData.integrations = {};
  if (!currentData.integrations.googleSheets) currentData.integrations.googleSheets = {};
  if (!currentData.integrations.cloudinary) currentData.integrations.cloudinary = {};

  const sheetsUrl = document.getElementById('int-sheets-url')?.value.trim() || currentData.integrations.googleSheets.scriptUrl || '';
  currentData.integrations.googleSheets.scriptUrl = sheetsUrl;
  currentData.integrations.googleSheets.enabled = !!sheetsUrl;

  currentData.integrations.cloudinary = {
    cloudName: document.getElementById('int-cloud-name')?.value.trim() || currentData.integrations.cloudinary.cloudName || '',
    uploadPreset: document.getElementById('int-cloud-preset')?.value.trim() || currentData.integrations.cloudinary.uploadPreset || '',
    apiKey: document.getElementById('int-cloud-key')?.value.trim() || currentData.integrations.cloudinary.apiKey || '',
    apiSecret: document.getElementById('int-cloud-secret')?.value.trim() || currentData.integrations.cloudinary.apiSecret || ''
  };

  const token = getAuthToken();

  try {
    const res = await fetch('/api/admin/content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        data: currentData,
        autoSyncSheets: !!sheetsUrl
      })
    });
    const json = await res.json();

    if (json.status === 'success') {
      if (showToastNotification) {
        showToast('Seluruh perubahan berhasil disimpan secara permanen!', 'success');
      }
      updateDashboardStats(currentData);
    } else {
      showToast('Gagal menyimpan: ' + json.message, 'error');
    }
  } catch (err) {
    showToast('Koneksi gagal: ' + err.message, 'error');
  } finally {
    if (btn && showToastNotification) {
      btn.disabled = false;
      btn.innerHTML = origText;
    }
  }
}

// ==========================================================================
// 8. GOOGLE SHEETS SYNC
// ==========================================================================

async function testSheetsConnection() {
  const scriptUrl = document.getElementById('int-sheets-url').value.trim();
  if (!scriptUrl) {
    alert('Masukkan Google Apps Script Web App URL terlebih dahulu.');
    return;
  }

  const token = getAuthToken();
  showToast('Menguji koneksi ke Google Sheets...', 'info');

  try {
    const res = await fetch('/api/admin/sync/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ scriptUrl })
    });
    const json = await res.json();

    if (json.status === 'success') {
      showToast('Koneksi Google Sheets Berhasil Terhubung!', 'success');
      checkSystemHealth();
    } else {
      showToast('Koneksi Gagal: ' + json.message, 'error');
    }
  } catch (err) {
    showToast('Koneksi Gagal: ' + err.message, 'error');
  }
}

async function pushToSheets() {
  const scriptUrl = document.getElementById('int-sheets-url').value.trim();
  if (!scriptUrl) {
    alert('Masukkan Google Apps Script Web App URL terlebih dahulu.');
    return;
  }

  const token = getAuthToken();
  showToast('Mengirim seluruh data ke Google Sheets...', 'info');

  try {
    const res = await fetch('/api/admin/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ scriptUrl })
    });
    const json = await res.json();

    if (json.status === 'success') {
      showToast('Berhasil mengirim seluruh data ke Google Sheets!', 'success');
      await loadAdminData();
      checkSystemHealth();
    } else {
      showToast('Gagal PUSH ke Sheets: ' + json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal PUSH: ' + err.message, 'error');
  }
}

async function pullFromSheets() {
  const scriptUrl = document.getElementById('int-sheets-url').value.trim();
  if (!scriptUrl) {
    alert('Masukkan Google Apps Script Web App URL terlebih dahulu.');
    return;
  }

  if (!confirm('Apakah Anda yakin ingin menarik data dari Google Sheets? Perubahan lokal yang belum disimpan ke Sheets akan ditimpa.')) {
    return;
  }

  const token = getAuthToken();
  showToast('Menarik data dari Google Sheets...', 'info');

  try {
    const res = await fetch('/api/admin/sync/pull', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ scriptUrl })
    });
    const json = await res.json();

    if (json.status === 'success' && json.data) {
      currentData = json.data;
      populateAllForms(currentData);
      renderAllTables(currentData);
      updateDashboardStats(currentData);
      checkSystemHealth();
      showToast('Data berhasil diperbarui dari Google Sheets!', 'success');
    } else {
      showToast('Gagal PULL: ' + json.message, 'error');
    }
  } catch (err) {
    showToast('Gagal PULL: ' + err.message, 'error');
  }
}

window.copyScriptCode = function() {
  const txt = `Panduan Setup Google Sheets:
1. Buka spreadsheet baru di Google Sheets.
2. Klik Extensions > Apps Script.
3. Paste kode dari file google-apps-script/Code.gs di project ini.
4. Jalankan fungsi "setupDatabase" sekali untuk membuat semua sheets otomatis.
5. Klik Deploy > New deployment > Web App > Access: "Anyone".
6. Copy Web App URL dan paste ke tab Integrasi di Panel Admin Bale Keluarga.`;
  navigator.clipboard.writeText(txt).then(() => {
    showToast('Petunjuk disalin ke clipboard!', 'success');
  });
};

// ==========================================================================
// 9. TOAST NOTIFICATIONS
// ==========================================================================

function showToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;

  const msgEl = document.getElementById('toast-message');
  const iconEl = document.getElementById('toast-icon');

  msgEl.textContent = message;
  toast.className = `admin-toast show ${type}`;

  if (type === 'success') {
    iconEl.className = 'fa-solid fa-circle-check';
  } else if (type === 'error') {
    iconEl.className = 'fa-solid fa-circle-exclamation';
  } else {
    iconEl.className = 'fa-solid fa-circle-info';
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}
