/* ============================================================
   ORION LUX – main.js
   All interactivity: cursor · nav · gallery · sizes · lightbox · ticker · reveal
   ============================================================ */

'use strict';

/* ── Custom cursor ─────────────────────────────────────────── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursorDot');
  if (!cursor || !dot) return;

  let mx = -100, my = -100;
  let cx = -100, cy = -100;
  let raf;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top  = my + 'px';
  });

  function animateCursor() {
    cx += (mx - cx) * 0.12;
    cy += (my - cy) * 0.12;
    cursor.style.left = cx + 'px';
    cursor.style.top  = cy + 'px';
    raf = requestAnimationFrame(animateCursor);
  }
  animateCursor();

  const hoverEls = document.querySelectorAll('a, button, .size-btn, .dot');
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
})();


/* ── Navbar scroll state ────────────────────────────────────── */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });
})();


/* ── Mobile menu ────────────────────────────────────────────── */
(function initMobileMenu() {
  const btn  = document.getElementById('burgerBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  let isOpen = false;

  function toggleMenu(open) {
    isOpen = open;
    btn.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open);
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  btn.addEventListener('click', () => toggleMenu(!isOpen));

  // Close on link click
  menu.querySelectorAll('.mobile-menu__link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) toggleMenu(false);
  });
})();


/* ── Smooth scroll for anchor links ─────────────────────────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
})();


/* ── Ticker ─────────────────────────────────────────────────── */
(function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const items = [
    'Moissanita VVS', 'Certificado GRA', 'Plata 925',
    'Brillo superior al diamante', 'Sin minería', 'Envíos a todo el país',
    'Hipoalergénica', 'Garantía de calidad', 'Pedidos personalizados',
  ];

  // Build two copies for seamless loop
  const html = [...items, ...items].map(text =>
    `<span class="ticker__item"><span class="ticker__sep"></span>${text}</span>`
  ).join('');

  track.innerHTML = html;
})();


/* ── Reveal on scroll ───────────────────────────────────────── */
(function initReveal() {
  const els = document.querySelectorAll('.reveal');
  if (!els.length) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  els.forEach(el => io.observe(el));
})();


/* ── Product galleries ──────────────────────────────────────── */
(function initGalleries() {
  document.querySelectorAll('.product-card').forEach(card => {
    const slides = card.querySelectorAll('.product-card__slide');
    const dots   = card.querySelectorAll('.dot');
    const prev   = card.querySelector('.product-card__arrow--prev');
    const next   = card.querySelector('.product-card__arrow--next');
    let current  = 0;
    let autoplay;

    if (!slides.length) return;

    function goTo(index) {
      slides[current].classList.remove('active');
      dots[current]?.classList.remove('active');
      current = (index + slides.length) % slides.length;
      slides[current].classList.add('active');
      dots[current]?.classList.add('active');
    }

    prev?.addEventListener('click', () => { goTo(current - 1); resetAutoplay(); });
    next?.addEventListener('click', () => { goTo(current + 1); resetAutoplay(); });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); resetAutoplay(); });
    });

    // Touch/swipe support
    let touchStartX = 0;
    card.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { goTo(dx < 0 ? current + 1 : current - 1); resetAutoplay(); }
    }, { passive: true });

    // Auto-advance on hover
    function startAutoplay() {
      autoplay = setInterval(() => goTo(current + 1), 3200);
    }
    function stopAutoplay() { clearInterval(autoplay); }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    card.addEventListener('mouseenter', startAutoplay);
    card.addEventListener('mouseleave', stopAutoplay);
  });
})();


/* ── Size / price selector ──────────────────────────────────── */
(function initSizeSelector() {
  document.querySelectorAll('.product-card__sizes').forEach(group => {
    const productId = group.dataset.product;
    const amountEl  = document.querySelector(`.product-card__amount[data-product="${productId}"]`);
    const btns      = group.querySelectorAll('.size-btn');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (!amountEl) return;
        const price = parseInt(btn.dataset.price);

        // Animate price change
        amountEl.classList.add('updating');
        setTimeout(() => {
          amountEl.textContent = price.toLocaleString('es-AR');
          amountEl.classList.remove('updating');
        }, 180);
      });
    });
  });
})();


/* ── Lightbox ───────────────────────────────────────────────── */
(function initLightbox() {
  const lightbox  = document.getElementById('lightbox');
  const imgEl     = document.getElementById('lightboxImg');
  const closeBtn  = document.getElementById('lightboxClose');
  const prevBtn   = document.getElementById('lightboxPrev');
  const nextBtn   = document.getElementById('lightboxNext');
  if (!lightbox || !imgEl || !closeBtn) return;

  let cardImgs = [];
  let currentIndex = 0;

  function showIndex(i) {
    currentIndex = (i + cardImgs.length) % cardImgs.length;
    imgEl.src = cardImgs[currentIndex].src;
    imgEl.alt = cardImgs[currentIndex].alt;
    imgEl.style.display = '';
    if (prevBtn) prevBtn.toggleAttribute('hidden', cardImgs.length <= 1);
    if (nextBtn) nextBtn.toggleAttribute('hidden', cardImgs.length <= 1);
  }

  function openLightbox(card, clickedImg) {
    cardImgs = Array.from(card.querySelectorAll('.product-card__slide img'));
    currentIndex = cardImgs.indexOf(clickedImg);
    if (currentIndex < 0) currentIndex = 0;
    showIndex(currentIndex);
    lightbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => lightbox.style.opacity = '1');
  }

  function closeLightbox() {
    lightbox.setAttribute('hidden', '');
    lightbox.style.opacity = '0';
    document.body.style.overflow = '';
  }

  prevBtn?.addEventListener('click', e => { e.stopPropagation(); showIndex(currentIndex - 1); });
  nextBtn?.addEventListener('click', e => { e.stopPropagation(); showIndex(currentIndex + 1); });

  // Trigger from zoom buttons
  document.querySelectorAll('.product-card__zoom').forEach(btn => {
    btn.addEventListener('click', () => {
      const card   = btn.closest('.product-card');
      const active = card.querySelector('.product-card__slide.active img');
      if (active) openLightbox(card, active);
    });
  });

  // Trigger from clicking images directly
  document.querySelectorAll('.product-card__slide img').forEach(img => {
    img.addEventListener('click', () => {
      const card = img.closest('.product-card');
      openLightbox(card, img);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', e => {
    if (lightbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape')      closeLightbox();
    if (e.key === 'ArrowLeft')   showIndex(currentIndex - 1);
    if (e.key === 'ArrowRight')  showIndex(currentIndex + 1);
  });

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });
})();


/* ── Toast helper ───────────────────────────────────────────── */
function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}


/* ── Cart ──────────────────────────────────────────────────── */
(function initCart() {
  const WA_NUMBER = '5491133693996';
  const fab       = document.getElementById('cartFab');
  const countEl   = document.getElementById('cartCount');
  const drawer    = document.getElementById('cartDrawer');
  const overlay   = document.getElementById('cartOverlay');
  const closeBtn  = document.getElementById('cartClose');
  const itemsEl   = document.getElementById('cartItems');
  const footerEl  = document.getElementById('cartFooter');
  const totalEl   = document.getElementById('cartTotal');
  const waBtn     = document.getElementById('cartWhatsapp');
  if (!fab || !drawer) return;

  let cart = []; // {id, name, size, price}

  function openDrawer()  { drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; }

  fab.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer(); });

  function renderCart() {
    countEl.textContent = cart.length;
    countEl.dataset.count = cart.length;

    if (!cart.length) {
      itemsEl.innerHTML = '<p class="cart-drawer__empty">Tu carrito está vacío</p>';
      footerEl.style.display = 'none';
      return;
    }

    let total = 0;
    itemsEl.innerHTML = cart.map((item, i) => {
      total += item.price;
      return `<div class="cart-item">
        <div class="cart-item__info">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__detail">${item.size}</div>
        </div>
        <span class="cart-item__price">$${item.price.toLocaleString('es-AR')}</span>
        <button class="cart-item__remove" data-index="${i}" aria-label="Quitar">
          <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>`;
    }).join('');

    totalEl.textContent = total.toLocaleString('es-AR');
    footerEl.style.display = '';

    // Build WhatsApp message
    const lines = cart.map((item, i) => `${i + 1}. ${item.name} — ${item.size} — $${item.price.toLocaleString('es-AR')}`);
    const msg = `Hola! Me interesa hacer un pedido en Orion Lux:\n\n${lines.join('\n')}\n\nTotal: $${total.toLocaleString('es-AR')}`;
    waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

    // Remove buttons
    itemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        cart.splice(parseInt(btn.dataset.index), 1);
        renderCart();
      });
    });
  }

  // Add to cart buttons
  document.querySelectorAll('.btn--add-cart').forEach(btn => {
    btn.addEventListener('click', () => {
      const card   = btn.closest('.product-card');
      if (card.classList.contains('out-of-stock')) return;
      const name   = card.querySelector('.product-card__name')?.textContent?.trim() || '';
      const active = card.querySelector('.size-btn.active');
      const size   = active?.dataset.label || '';
      const price  = parseInt(active?.dataset.price) || 0;

      cart.push({ id: btn.dataset.product, name, size, price });
      renderCart();
      showToast(`${name} agregado al carrito`);

      // Animate fab
      fab.style.transform = 'scale(1.2)';
      setTimeout(() => fab.style.transform = '', 200);
    });
  });

  renderCart();
})();


/* ── Admin panel (stock toggle) ────────────────────────────── */
(function initAdmin() {
  const STORAGE_KEY = 'orion_stock';
  const panel   = document.getElementById('adminPanel');
  const listEl  = document.getElementById('adminList');
  const closeBtn = document.getElementById('adminClose');
  if (!panel || !listEl) return;

  // Load stock state from localStorage
  function getStock() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveStock(stock) { localStorage.setItem(STORAGE_KEY, JSON.stringify(stock)); }

  // Apply stock state to DOM
  function applyStock() {
    const stock = getStock();
    document.querySelectorAll('.product-card[data-product]').forEach(card => {
      const id = card.dataset.product;
      if (stock[id] === false) {
        card.classList.add('out-of-stock');
      } else {
        card.classList.remove('out-of-stock');
      }
    });
  }

  // Build admin list
  function renderAdmin() {
    const stock = getStock();
    const products = [];
    document.querySelectorAll('.product-card[data-product]').forEach(card => {
      products.push({
        id: card.dataset.product,
        name: card.querySelector('.product-card__name')?.textContent?.trim() || card.dataset.product,
      });
    });

    listEl.innerHTML = products.map(p => {
      const inStock = stock[p.id] !== false;
      return `<div class="admin-item">
        <span class="admin-item__name">${p.name}</span>
        <div style="display:flex;align-items:center">
          <button class="admin-item__toggle ${inStock ? 'active' : ''}" data-product="${p.id}" aria-label="Toggle stock"></button>
          <span class="admin-item__label">${inStock ? 'En stock' : 'Sin stock'}</span>
        </div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.admin-item__toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const stock = getStock();
        const id = btn.dataset.product;
        const wasInStock = stock[id] !== false;
        stock[id] = !wasInStock;
        saveStock(stock);
        applyStock();
        renderAdmin();
      });
    });
  }

  // Open admin with ?admin in URL
  if (new URLSearchParams(window.location.search).has('admin')) {
    panel.removeAttribute('hidden');
    renderAdmin();
  }

  closeBtn?.addEventListener('click', () => panel.setAttribute('hidden', ''));

  // Apply on load
  applyStock();
})();