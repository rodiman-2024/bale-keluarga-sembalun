/**
 * BALE KELUARGA HOMESTAY SEMBALUN - FRONTEND JAVASCRIPT
 * Handles live content loading, UI interactions, room modals,
 * gallery lightboxes, and reservations.
 */

let siteData = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  initMobileMenu();
  initDateInputs();
  initEventListeners();
  loadSiteContent();
});

// 1. Fetch live content from backend API (connected to local database / Google Sheets)
async function loadSiteContent() {
  try {
    const res = await fetch('/api/content');
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      siteData = json.data;
      renderWebsite(siteData);
    }
  } catch (err) {
    console.error('Error loading content:', err);
  }
}

// 2. Render all dynamic elements
function renderWebsite(data) {
  const { siteSettings, sectionsVisibility, pages, rooms, facilities, gallery, experiences, testimonials, seo } = data;

  // Apply Brand Colors dynamically if set in CMS
  if (siteSettings?.primaryColor) {
    document.documentElement.style.setProperty('--primary', siteSettings.primaryColor);
  }
  if (siteSettings?.secondaryColor) {
    document.documentElement.style.setProperty('--secondary', siteSettings.secondaryColor);
  }

  // SEO & Meta
  if (seo) {
    if (seo.title) {
      document.title = seo.title;
      const metaTitle = document.getElementById('meta-title');
      if (metaTitle) metaTitle.textContent = seo.title;
      const ogTitle = document.getElementById('og-title');
      if (ogTitle) ogTitle.content = seo.title;
    }
    if (seo.description) {
      const metaDesc = document.getElementById('meta-description');
      if (metaDesc) metaDesc.content = seo.description;
      const ogDesc = document.getElementById('og-description');
      if (ogDesc) ogDesc.content = seo.description;
    }
    if (seo.keywords) {
      const metaKw = document.getElementById('meta-keywords');
      if (metaKw) metaKw.content = seo.keywords;
    }
  }

  // Site Settings (Brand info, contacts, links)
  if (siteSettings) {
    const logoUrl = siteSettings.logoUrl || '/images/logo.jpg';
    const navLogo = document.getElementById('nav-logo');
    if (navLogo) navLogo.src = logoUrl;
    const favicon = document.getElementById('favicon-link');
    if (favicon) favicon.href = siteSettings.faviconUrl || logoUrl;

    const navTitle = document.getElementById('nav-title');
    if (navTitle) navTitle.textContent = siteSettings.villaName ? siteSettings.villaName.split(' ')[0] + ' ' + (siteSettings.villaName.split(' ')[1] || '') : 'Bale Keluarga';

    const navPhone = document.getElementById('nav-phone');
    if (navPhone) {
      navPhone.href = `tel:${siteSettings.phone}`;
      navPhone.querySelector('span').textContent = siteSettings.phone;
    }

    // Hero Section
    const heroSec = document.getElementById('home');
    if (heroSec && siteSettings.heroImage) {
      heroSec.style.backgroundImage = `url('${siteSettings.heroImage}')`;
    }
    const heroBadge = document.getElementById('hero-badge');
    if (heroBadge && siteSettings.heroBadge) {
      heroBadge.innerHTML = `<i class="fa-solid fa-star"></i> <span>${siteSettings.heroBadge}</span>`;
    }
    const heroDesc = document.getElementById('hero-desc');
    if (heroDesc && siteSettings.subheadline) {
      heroDesc.textContent = siteSettings.subheadline;
    }

    // Contacts
    const locAddress = document.getElementById('loc-address');
    if (locAddress && siteSettings.address) locAddress.textContent = siteSettings.address;

    const locTimes = document.getElementById('loc-times');
    if (locTimes) locTimes.textContent = `Check-in: Mulai ${siteSettings.checkInTime || '14:00 WITA'} | Check-out: Maksimal ${siteSettings.checkOutTime || '12:00 WITA'}`;

    const cardAddress = document.getElementById('card-address');
    if (cardAddress && siteSettings.address) cardAddress.textContent = siteSettings.address;

    const cardPhone = document.getElementById('card-phone');
    if (cardPhone && siteSettings.phone) cardPhone.textContent = siteSettings.phone;

    const cardEmail = document.getElementById('card-email');
    if (cardEmail && siteSettings.email) cardEmail.textContent = siteSettings.email;

    const cardIg = document.getElementById('card-instagram');
    if (cardIg && siteSettings.instagram) cardIg.textContent = siteSettings.instagram.replace('https://instagram.com/', '@');

    // WhatsApp Direct Buttons
    const cleanWa = (siteSettings.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
    const defaultMsg = encodeURIComponent(siteSettings.whatsappMessage || 'Halo Bale Keluarga Homestay Sembalun, saya ingin info kamar');
    const waLink = `https://wa.me/${cleanWa}?text=${defaultMsg}`;

    const floatingWa = document.getElementById('floating-wa');
    if (floatingWa) floatingWa.href = waLink;

    const waBannerLink = document.getElementById('wa-banner-link');
    if (waBannerLink) {
      waBannerLink.href = waLink;
      waBannerLink.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Chat WhatsApp (${siteSettings.phone || cleanWa})`;
    }

    // Footer
    const footerBrand = document.getElementById('footer-brand');
    if (footerBrand && siteSettings.villaName) footerBrand.textContent = siteSettings.villaName;

    const footerTagline = document.getElementById('footer-tagline');
    if (footerTagline && siteSettings.tagline) footerTagline.textContent = siteSettings.tagline;

    const footerAddress = document.getElementById('footer-address');
    if (footerAddress && siteSettings.address) footerAddress.textContent = siteSettings.address;

    const footerWa = document.getElementById('footer-wa');
    if (footerWa && siteSettings.phone) footerWa.textContent = siteSettings.phone;

    const footerEmail = document.getElementById('footer-email');
    if (footerEmail && siteSettings.email) footerEmail.textContent = siteSettings.email;

    if (siteSettings.mapEmbedUrl) {
      const mapIframe = document.getElementById('map-iframe');
      if (mapIframe) mapIframe.src = siteSettings.mapEmbedUrl;
    }
  }

  // Section Visibility Toggles
  if (sectionsVisibility) {
    toggleSection('home', sectionsVisibility.hero);
    toggleSection('quick-booking-bar', sectionsVisibility.quickBooking);
    toggleSection('about', sectionsVisibility.about);
    toggleSection('rooms', sectionsVisibility.rooms);
    toggleSection('facilities', sectionsVisibility.facilities);
    toggleSection('gallery', sectionsVisibility.gallery);
    toggleSection('experience', sectionsVisibility.experience);
    toggleSection('testimonials', sectionsVisibility.testimonials);
    toggleSection('location', sectionsVisibility.location);
    toggleSection('contact', sectionsVisibility.contact);
  }

  // About Section Details
  if (pages) {
    const aboutPage = pages.find(p => p.id === 'about');
    if (aboutPage) {
      if (aboutPage.heading) {
        const aboutTitle = document.getElementById('about-title');
        if (aboutTitle) {
          aboutTitle.innerHTML = aboutPage.heading.replace('Keagungan Rinjani', '<span class="gradient-text">Keagungan Rinjani</span>');
        }
      }
      if (aboutPage.description) {
        const aboutDesc = document.getElementById('about-desc');
        if (aboutDesc) aboutDesc.textContent = aboutPage.description;
      }
      if (aboutPage.featureList && Array.isArray(aboutPage.featureList)) {
        const featList = document.getElementById('about-features-list');
        if (featList) {
          featList.innerHTML = aboutPage.featureList.map(item => `
            <li class="about-feature-item">
              <i class="fa-solid fa-check"></i>
              <span>${item}</span>
            </li>
          `).join('');
        }
      }
    }
  }

  // Render Rooms
  if (rooms && Array.isArray(rooms)) {
    renderRooms(rooms);
    populateRoomSelectDropdowns(rooms);
  }

  // Render Facilities
  if (facilities && Array.isArray(facilities)) {
    renderFacilities(facilities);
  }

  // Render Experience
  if (experiences && Array.isArray(experiences)) {
    renderExperiences(experiences);
  }

  // Render Gallery
  if (gallery && Array.isArray(gallery)) {
    renderGallery(gallery);
  }

  // Render Testimonials
  if (testimonials && Array.isArray(testimonials)) {
    renderTestimonials(testimonials);
  }
}

function toggleSection(elementId, isVisible) {
  const el = document.getElementById(elementId);
  if (el) {
    el.style.display = isVisible !== false ? '' : 'none';
  }
}

// 3. Render Rooms Cards
function renderRooms(roomsList) {
  const container = document.getElementById('rooms-grid');
  if (!container) return;

  const activeRooms = roomsList.filter(r => r.active !== false);

  if (activeRooms.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Belum ada kamar yang ditampilkan.</p>`;
    return;
  }

  // Find lowest price for mobile bar
  const lowestPrice = Math.min(...activeRooms.map(r => r.price || 500000));
  const mobPrice = document.getElementById('mobile-starting-price');
  if (mobPrice) mobPrice.textContent = `Rp ${lowestPrice.toLocaleString('id-ID')} / malam`;

  container.innerHTML = activeRooms.map(room => {
    const waNumber = (siteData?.siteSettings?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
    const waText = encodeURIComponent(`Halo Bale Keluarga Sembalun, saya ingin reservasi kamar: ${room.name} (${room.priceFormatted || 'Rp ' + room.price.toLocaleString('id-ID')}). Mohon info ketersediaannya.`);
    const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

    return `
      <article class="room-card" data-room-id="${room.id}">
        <div class="room-image-wrap">
          <img src="${room.image || '/images/hero-villa.jpg'}" alt="${room.name}" class="room-image" loading="lazy">
          ${room.badge ? `<span class="room-badge">${room.badge}</span>` : ''}
          <div class="room-price-tag">
            <span class="room-price-val">${room.priceFormatted || 'Rp ' + (room.price ? room.price.toLocaleString('id-ID') : '0')}</span>
            <span class="room-price-period">${room.period || '/ malam'}</span>
          </div>
        </div>

        <div class="room-body">
          <h3 class="room-title">${room.name}</h3>

          <div class="room-meta-specs">
            <div class="room-meta-item">
              <i class="fa-solid fa-users"></i>
              <span>${room.capacity || '4 Tamu'}</span>
            </div>
            <div class="room-meta-item">
              <i class="fa-solid fa-bed"></i>
              <span>${room.bedType || 'King Bed'}</span>
            </div>
            ${room.size ? `
              <div class="room-meta-item">
                <i class="fa-solid fa-maximize"></i>
                <span>${room.size}</span>
              </div>
            ` : ''}
          </div>

          <p class="room-desc">${room.description || ''}</p>

          <div class="room-amenities-pills">
            ${(room.amenities || []).slice(0, 4).map(am => `
              <span class="room-pill">${am}</span>
            `).join('')}
            ${(room.amenities && room.amenities.length > 4) ? `<span class="room-pill">+${room.amenities.length - 4} lainnya</span>` : ''}
          </div>

          <div class="room-actions">
            <button class="btn btn-outline-primary btn-sm btn-detail-room" onclick="openRoomModal('${room.id}')">
              <i class="fa-solid fa-circle-info"></i> Detail Kamar
            </button>
            <a href="${waUrl}" target="_blank" class="btn btn-primary btn-sm">
              <i class="fa-brands fa-whatsapp"></i> Booking
            </a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// 4. Populate Room Selectors in Forms
function populateRoomSelectDropdowns(roomsList) {
  const qbSelect = document.getElementById('qb-room');
  const resSelect = document.getElementById('res-room');
  const footerRooms = document.getElementById('footer-rooms-list');

  const optionsHtml = roomsList.map(r => `<option value="${r.name}">${r.name}</option>`).join('');

  if (qbSelect) qbSelect.innerHTML = optionsHtml;
  if (resSelect) resSelect.innerHTML = optionsHtml;

  if (footerRooms) {
    footerRooms.innerHTML = roomsList.slice(0, 4).map(r => `
      <li><a href="#rooms" class="footer-link">${r.name}</a></li>
    `).join('');
  }
}

// 5. Render Facilities
function renderFacilities(facilitiesList) {
  const container = document.getElementById('facilities-grid');
  if (!container) return;

  const activeFacs = facilitiesList.filter(f => f.active !== false);

  container.innerHTML = activeFacs.map(fac => `
    <div class="facility-card">
      <div class="facility-icon-wrap">
        <i class="fa-solid ${fac.icon || 'fa-star'}"></i>
      </div>
      <h3 class="facility-title">${fac.name}</h3>
      <p class="facility-desc">${fac.description || ''}</p>
    </div>
  `).join('');
}

// 6. Render Experiences
function renderExperiences(expList) {
  const container = document.getElementById('experience-grid');
  if (!container) return;

  container.innerHTML = expList.map(exp => `
    <div class="experience-card">
      <div class="experience-image-wrap">
        <img src="${exp.image || '/images/hero-villa.jpg'}" alt="${exp.title}" class="experience-image" loading="lazy">
        ${exp.distance ? `<div class="experience-distance"><i class="fa-solid fa-location-arrow"></i> ${exp.distance}</div>` : ''}
      </div>
      <div class="experience-body">
        <h3 class="experience-title">${exp.title}</h3>
        <p class="experience-desc">${exp.description}</p>
      </div>
    </div>
  `).join('');
}

// 7. Render Gallery & Filtering
let currentGalleryItems = [];

function renderGallery(galleryList) {
  const container = document.getElementById('gallery-grid');
  if (!container) return;

  currentGalleryItems = galleryList;
  displayGalleryItems(galleryList);

  // Setup tab filter clicks
  const filterBtns = document.querySelectorAll('.gallery-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');
      if (filter === 'all') {
        displayGalleryItems(currentGalleryItems);
      } else {
        const filtered = currentGalleryItems.filter(item => item.category === filter);
        displayGalleryItems(filtered);
      }
    });
  });
}

function displayGalleryItems(items) {
  const container = document.getElementById('gallery-grid');
  if (!container) return;

  if (items.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Belum ada foto dalam kategori ini.</p>`;
    return;
  }

  container.innerHTML = items.map((item, idx) => `
    <div class="gallery-item" onclick="openLightbox('${item.imageUrl}', '${item.title.replace(/'/g, "\\'")}')">
      <img src="${item.imageUrl}" alt="${item.alt || item.title}" class="gallery-item-image" loading="lazy">
      <div class="gallery-item-overlay">
        <span class="gallery-item-category">${item.categoryLabel || item.category}</span>
        <h4 class="gallery-item-title">${item.title}</h4>
      </div>
      <div class="gallery-item-zoom-icon">
        <i class="fa-solid fa-expand"></i>
      </div>
    </div>
  `).join('');
}

// 8. Render Testimonials
function renderTestimonials(testiList) {
  const container = document.getElementById('testimonials-grid');
  if (!container) return;

  container.innerHTML = testiList.map(t => {
    const starsHtml = Array.from({ length: t.rating || 5 }).map(() => '<i class="fa-solid fa-star"></i>').join(' ');

    return `
      <div class="testimonial-card">
        <i class="fa-solid fa-quote-right testimonial-quote-icon"></i>
        <div>
          <div class="testimonial-stars">${starsHtml}</div>
          <p class="testimonial-text">"${t.review}"</p>
        </div>
        <div class="testimonial-author">
          <img src="${t.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}" alt="${t.name}" class="testimonial-avatar">
          <div>
            <div class="testimonial-name">${t.name}</div>
            <div class="testimonial-origin">${t.origin || 'Tamu Terverifikasi'} • ${t.date || '2026'}</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 9. Room Detail Modal Popup
window.openRoomModal = function(roomId) {
  if (!siteData?.rooms) return;
  const room = siteData.rooms.find(r => r.id === roomId);
  if (!room) return;

  const modalBody = document.getElementById('room-modal-body');
  const waNumber = (siteData.siteSettings?.whatsapp || '6281234567890').replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(`Halo Bale Keluarga Sembalun, saya berminat memesan ${room.name} (${room.priceFormatted || 'Rp ' + room.price.toLocaleString('id-ID')}). Mohon info ketersediaannya.`);
  const waUrl = `https://wa.me/${waNumber}?text=${waText}`;

  modalBody.innerHTML = `
    <div style="margin-bottom: 1.5rem; border-radius: var(--radius-md); overflow: hidden; max-height: 340px;">
      <img src="${room.image}" alt="${room.name}" style="width: 100%; height: 340px; object-fit: cover;">
    </div>
    
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.5rem;">
      <div>
        <span class="section-badge" style="margin-bottom: 0.5rem;">${room.badge || 'Akomodasi Pilihan'}</span>
        <h2 style="font-family: var(--font-serif); font-size: 1.8rem; color: var(--dark);">${room.name}</h2>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 1.5rem; font-weight: 700; color: var(--secondary);">${room.priceFormatted || 'Rp ' + room.price.toLocaleString('id-ID')}</div>
        <div style="font-size: 0.85rem; color: var(--text-muted);">${room.period || '/ malam'}</div>
      </div>
    </div>

    <div style="display: flex; gap: 1.5rem; background: var(--bg-main); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; font-size: 0.9rem;">
      <div><i class="fa-solid fa-users" style="color: var(--primary);"></i> <strong>${room.capacity || '4 Tamu'}</strong></div>
      <div><i class="fa-solid fa-bed" style="color: var(--primary);"></i> <strong>${room.bedType || 'King Bed'}</strong></div>
      ${room.size ? `<div><i class="fa-solid fa-maximize" style="color: var(--primary);"></i> <strong>${room.size}</strong></div>` : ''}
      ${room.view ? `<div><i class="fa-solid fa-mountain" style="color: var(--primary);"></i> <strong>${room.view}</strong></div>` : ''}
    </div>

    <h4 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: var(--dark);">Deskripsi Lengkap</h4>
    <p style="color: var(--text-muted); line-height: 1.7; margin-bottom: 1.5rem;">${room.description || ''}</p>

    <h4 style="font-size: 1.1rem; margin-bottom: 0.75rem; color: var(--dark);">Fasilitas Kamar</h4>
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.6rem; margin-bottom: 2rem;">
      ${(room.amenities || []).map(a => `
        <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--dark);">
          <i class="fa-solid fa-check" style="color: var(--primary);"></i>
          <span>${a}</span>
        </div>
      `).join('')}
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 1rem;">
      <button class="btn btn-outline" style="color: var(--dark); border-color: var(--border-light);" onclick="closeModals()">Tutup</button>
      <a href="${waUrl}" target="_blank" class="btn btn-primary">
        <i class="fa-brands fa-whatsapp"></i> Pesan Kamar Ini Sekarang
      </a>
    </div>
  `;

  document.getElementById('room-detail-modal').classList.add('active');
};

// 10. Gallery Lightbox
window.openLightbox = function(imgUrl, caption) {
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-cap');

  img.src = imgUrl;
  cap.textContent = caption || '';
  modal.classList.add('active');
};

function closeModals() {
  document.getElementById('room-detail-modal')?.classList.remove('active');
  document.getElementById('lightbox-modal')?.classList.remove('active');
}

// 11. Event Listeners for Navbar, Forms, Modals
function initEventListeners() {
  // Modal Closes
  document.getElementById('btn-close-room-modal')?.addEventListener('click', closeModals);
  document.getElementById('btn-close-lightbox')?.addEventListener('click', closeModals);
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      closeModals();
    }
  });

  // Quick Booking Form
  const qbForm = document.getElementById('quick-booking-form');
  if (qbForm) {
    qbForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const checkIn = document.getElementById('qb-checkin').value;
      const checkOut = document.getElementById('qb-checkout').value;
      const room = document.getElementById('qb-room').value;
      const guests = document.getElementById('qb-guests').value;

      // Scroll to full reservation form and prefill values
      const resCheckin = document.getElementById('res-checkin');
      const resCheckout = document.getElementById('res-checkout');
      const resRoom = document.getElementById('res-room');
      const resGuests = document.getElementById('res-guests');

      if (resCheckin) resCheckin.value = checkIn;
      if (resCheckout) resCheckout.value = checkOut;
      if (resRoom) resRoom.value = room;
      if (resGuests) resGuests.value = guests;

      const bookingSection = document.getElementById('booking');
      if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
        // Highlight form card
        bookingSection.style.boxShadow = 'var(--shadow-glow)';
        setTimeout(() => {
          bookingSection.style.boxShadow = '';
        }, 2000);
      }
    });
  }

  // Full Reservation Form Submit
  const resForm = document.getElementById('reservation-form');
  if (resForm) {
    resForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btnSubmit = document.getElementById('btn-submit-res');
      const originalText = btnSubmit.innerHTML;
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses Reservasi...`;

      const bookingPayload = {
        guestName: document.getElementById('res-name').value,
        phone: document.getElementById('res-phone').value,
        email: document.getElementById('res-email').value,
        roomName: document.getElementById('res-room').value,
        checkIn: document.getElementById('res-checkin').value,
        checkOut: document.getElementById('res-checkout').value,
        guests: document.getElementById('res-guests').value,
        notes: document.getElementById('res-notes').value
      };

      try {
        const response = await fetch('/api/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload)
        });
        const result = await response.json();

        if (result.status === 'success') {
          alert('✅ ' + result.message + '\n\nAnda akan dialihkan ke WhatsApp untuk konfirmasi instan.');
          resForm.reset();
          initDateInputs();
          // Open WhatsApp in new tab
          if (result.whatsappUrl) {
            window.open(result.whatsappUrl, '_blank');
          }
        } else {
          alert('❌ ' + (result.message || 'Gagal mengirim reservasi. Silakan coba lagi.'));
        }
      } catch (err) {
        alert('❌ Terjadi gangguan koneksi: ' + err.message);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = originalText;
      }
    });
  }
}

// 12. Helper: Date picker defaults (tomorrow & 2 days later)
function initDateInputs() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 3);

  const formatDate = (d) => d.toISOString().split('T')[0];

  const qbCheckin = document.getElementById('qb-checkin');
  const qbCheckout = document.getElementById('qb-checkout');
  const resCheckin = document.getElementById('res-checkin');
  const resCheckout = document.getElementById('res-checkout');

  const minToday = formatDate(today);
  const defIn = formatDate(tomorrow);
  const defOut = formatDate(dayAfter);

  if (qbCheckin) { qbCheckin.min = minToday; qbCheckin.value = defIn; }
  if (qbCheckout) { qbCheckout.min = defIn; qbCheckout.value = defOut; }
  if (resCheckin) { resCheckin.min = minToday; resCheckin.value = defIn; }
  if (resCheckout) { resCheckout.min = defIn; resCheckout.value = defOut; }
}

// 13. Navbar Scroll Effect & Spy
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// 14. Mobile Navigation Drawer
function initMobileMenu() {
  const toggleBtn = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-menu');
  const links = document.querySelectorAll('.nav-link');

  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', () => {
      menu.classList.toggle('open');
      const isOpen = menu.classList.contains('open');
      toggleBtn.innerHTML = isOpen ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    });

    links.forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('open');
        toggleBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
      });
    });
  }
}
