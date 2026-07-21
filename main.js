/* ============================================================
   ORION LUX – main.js
   ============================================================ */

'use strict';

/* ── Meta Pixel helper ──────────────────────────────────────── */
function trackPixel(event, params) {
  if (typeof fbq === 'function') fbq('track', event, params);
}

/* ── UTM capture ────────────────────────────────────────────── */
const _utmParams = (function() {
  const sp = new URLSearchParams(window.location.search);
  const keys = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'];
  const found = {};
  keys.forEach(k => { if (sp.has(k)) found[k] = sp.get(k); });
  return found;
})();

/* ── Custom cursor ─────────────────────────────────────────── */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const dot    = document.getElementById('cursorDot');
  if (!cursor || !dot) return;

  let mx = -100, my = -100;
  let cx = -100, cy = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px'; dot.style.top = my + 'px';
  });

  (function animateCursor() {
    cx += (mx - cx) * 0.12; cy += (my - cy) * 0.12;
    cursor.style.left = cx + 'px'; cursor.style.top = cy + 'px';
    requestAnimationFrame(animateCursor);
  })();

  document.addEventListener('mouseover', e => {
    if (e.target.closest('a, button, .size-btn, .dot'))
      document.body.classList.add('cursor-hover');
    else
      document.body.classList.remove('cursor-hover');
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
  menu.querySelectorAll('.mobile-menu__link').forEach(link => {
    link.addEventListener('click', () => toggleMenu(false));
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen) toggleMenu(false);
  });
})();


/* ── Smooth scroll ──────────────────────────────────────────── */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - navH, behavior: 'smooth' });
    });
  });
})();


/* ── Ticker ─────────────────────────────────────────────────── */
(function initTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const items = ['Moissanita VVS','Certificado GRA','Plata 925','Brillo superior al diamante','Sin minería','Envíos a todo el país','Hipoalergénica','Garantía de calidad','Pedidos personalizados'];
  track.innerHTML = [...items, ...items].map(t =>
    `<span class="ticker__item"><span class="ticker__sep"></span>${t}</span>`
  ).join('');
})();


/* ── Reveal on scroll ───────────────────────────────────────── */
function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.visible)');
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}


/* ── Toast ──────────────────────────────────────────────────── */
function showToast(msg, duration = 2800) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), duration);
}


/* ── Build product card HTML ────────────────────────────────── */
function buildProductCard(p, index) {
  const slides = p.images.map((img, i) =>
    `<div class="product-card__slide${i === 0 ? ' active' : ''}">
      <img src="${img.src}" alt="${img.alt}" style="width:100%;height:100%;object-fit:${img.fit || 'contain'};"/>
    </div>`
  ).join('');

  const dots = p.images.map((_, i) =>
    `<button class="dot${i === 0 ? ' active' : ''}" aria-label="Imagen ${i + 1}"></button>`
  ).join('');

  const sizeBtns = p.sizes.map((s, i) => {
    const cls = ['size-btn'];
    if (i === 0) cls.push('active');
    if (!s.inStock) cls.push('size-out');
    const stockAttr = (s.stock != null) ? ` data-stock="${s.stock}"` : '';
    return `<button class="${cls.join(' ')}" data-price="${s.price}" data-label="${s.label}"${stockAttr}${!s.inStock ? ' disabled' : ''}>${s.label}</button>`;
  }).join('');

  const outClass = !p.inStock ? ' out-of-stock' : '';

  return `<article class="product-card reveal${outClass}" data-product="${p.id}" style="--delay:${(index * 0.1).toFixed(1)}s">
    <div class="product-card__gallery">
      <div class="product-card__slides">${slides}</div>
      <div class="product-card__nav">
        <button class="product-card__arrow product-card__arrow--prev" aria-label="Imagen anterior">
          <svg viewBox="0 0 20 20" fill="none"><polyline points="13,4 7,10 13,16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <div class="product-card__dots">${dots}</div>
        <button class="product-card__arrow product-card__arrow--next" aria-label="Imagen siguiente">
          <svg viewBox="0 0 20 20" fill="none"><polyline points="7,4 13,10 7,16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <span class="product-card__badge">GRA Cert.</span>
      ${(p.inStock && p.sizes.some(s => s.stock != null && s.stock <= 3))
        ? `<span class="product-card__stock-badge">¡Quedan ${Math.min(...p.sizes.filter(s => s.inStock && s.stock != null).map(s => s.stock))}!</span>`
        : ''}
      <button class="product-card__zoom" aria-label="Ver imagen ampliada">
        <svg viewBox="0 0 20 20" fill="none"><path d="M8 13A5 5 0 1 0 8 3a5 5 0 0 0 0 10z" stroke="currentColor" stroke-width="1.5"/><path d="M17 17l-3.5-3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M6 8h4M8 6v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>
    </div>
    <div class="product-card__body">
      <div class="product-card__meta">
        <span class="product-card__category">${p.category}</span>
        <h3 class="product-card__name">${p.name}</h3>
        <p class="product-card__desc">${p.description}</p>
      </div>
      <div class="product-card__options">
        <p class="product-card__option-label">Tamaño</p>
        <div class="product-card__sizes" data-product="${p.id}">${sizeBtns}</div>
      </div>
      <div class="product-card__footer">
        <div class="product-card__price">
          <span class="product-card__currency">ARS</span>
          <span class="product-card__amount" data-product="${p.id}">${(p.sizes[0]?.price || 0).toLocaleString('es-AR')}</span>
        </div>
        <div class="product-card__actions">
          <button class="btn btn--primary btn--add-cart" data-product="${p.id}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            Agregar
          </button>
          <a href="https://www.instagram.com/joyasorionlux/" target="_blank" rel="noopener" class="btn btn--insta">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </a>
        </div>
      </div>
    </div>
  </article>`;
}


/* ── Gallery init (called after cards are rendered) ─────────── */
function initGalleries() {
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
    dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAutoplay(); }));

    let touchStartX = 0;
    card.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) { goTo(dx < 0 ? current + 1 : current - 1); resetAutoplay(); }
    }, { passive: true });

    function startAutoplay() { autoplay = setInterval(() => goTo(current + 1), 3200); }
    function stopAutoplay()  { clearInterval(autoplay); }
    function resetAutoplay() { stopAutoplay(); startAutoplay(); }

    card.addEventListener('mouseenter', startAutoplay);
    card.addEventListener('mouseleave', stopAutoplay);
  });
}


/* ── Size / price selector ──────────────────────────────────── */
function initSizeSelector() {
  document.querySelectorAll('.product-card__sizes').forEach(group => {
    const productId = group.dataset.product;
    const amountEl  = document.querySelector(`.product-card__amount[data-product="${productId}"]`);
    const btns      = group.querySelectorAll('.size-btn');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        btns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const price = parseInt(btn.dataset.price) || 0;
        const card  = btn.closest('.product-card');
        const name  = card?.querySelector('.product-card__name')?.textContent?.trim() || '';
        trackPixel('ViewContent', {
          content_name: name + ' — ' + btn.dataset.label,
          content_ids: [card?.dataset.product || ''],
          content_type: 'product',
          value: price / 100,
          currency: 'ARS'
        });
        if (!amountEl) return;
        amountEl.classList.add('updating');
        setTimeout(() => {
          amountEl.textContent = price.toLocaleString('es-AR');
          amountEl.classList.remove('updating');
        }, 180);
      });
    });
  });
}


/* ── Lightbox ───────────────────────────────────────────────── */
function initLightbox() {
  const lightbox = document.getElementById('lightbox');
  const imgEl    = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn  = document.getElementById('lightboxPrev');
  const nextBtn  = document.getElementById('lightboxNext');
  if (!lightbox || !imgEl || !closeBtn) return;

  let cardImgs = [], currentIndex = 0;

  function showIndex(i) {
    currentIndex = (i + cardImgs.length) % cardImgs.length;
    imgEl.src = cardImgs[currentIndex].src;
    imgEl.alt = cardImgs[currentIndex].alt;
    imgEl.style.display = '';
    prevBtn?.toggleAttribute('hidden', cardImgs.length <= 1);
    nextBtn?.toggleAttribute('hidden', cardImgs.length <= 1);
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

  document.addEventListener('click', e => {
    const zoomBtn = e.target.closest('.product-card__zoom');
    const img     = e.target.closest('.product-card__slide img');

    if (zoomBtn && !window.matchMedia('(pointer: coarse)').matches) {
      const card   = zoomBtn.closest('.product-card');
      const active = card.querySelector('.product-card__slide.active img');
      if (active) openLightbox(card, active);
    } else if (img && !window.matchMedia('(pointer: coarse)').matches) {
      const card = img.closest('.product-card');
      openLightbox(card, img);
    }
  });

  document.addEventListener('keydown', e => {
    if (lightbox.hasAttribute('hidden')) return;
    if (e.key === 'Escape')    closeLightbox();
    if (e.key === 'ArrowLeft') showIndex(currentIndex - 1);
    if (e.key === 'ArrowRight') showIndex(currentIndex + 1);
  });

  closeBtn.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
}


/* ── Cart ──────────────────────────────────────────────────── */
function initCart() {
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

  let cart = [];

  function openDrawer()  { drawer.classList.add('open'); overlay.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('open'); document.body.style.overflow = ''; }

  waBtn?.addEventListener('click', () => {
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    trackPixel('InitiateCheckout', {
      content_ids: cart.map(i => i.id),
      num_items: cart.length,
      value: total / 100,
      currency: 'ARS'
    });
  });

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

    const lines = cart.map((item, i) => `${i + 1}. ${item.name} — ${item.size} — $${item.price.toLocaleString('es-AR')}`);
    const utmSuffix = Object.keys(_utmParams).length
      ? '\n\n[' + Object.entries(_utmParams).map(([k,v]) => `${k}=${v}`).join(', ') + ']'
      : '';
    waBtn.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Me interesa hacer un pedido en Orion Lux:\n\n${lines.join('\n')}\n\nTotal: $${total.toLocaleString('es-AR')}${utmSuffix}`)}`;

    itemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
      btn.addEventListener('click', () => { cart.splice(parseInt(btn.dataset.index), 1); renderCart(); });
    });
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn--add-cart');
    if (!btn) return;
    const card = btn.closest('.product-card');
    if (card.classList.contains('out-of-stock')) return;
    const name   = card.querySelector('.product-card__name')?.textContent?.trim() || '';
    const active = card.querySelector('.size-btn.active');
    const size   = active?.dataset.label || '';
    const price  = parseInt(active?.dataset.price) || 0;
    cart.push({ id: btn.dataset.product, name, size, price });
    trackPixel('AddToCart', {
      content_name: name + ' — ' + size,
      content_ids: [btn.dataset.product],
      content_type: 'product',
      value: price / 100,
      currency: 'ARS'
    });
    renderCart();
    showToast(`${name} agregado al carrito`);
    fab.style.transform = 'scale(1.2)';
    setTimeout(() => fab.style.transform = '', 200);
  });

  renderCart();
}


/* ── Bootstrap: fetch products.json then render everything ──── */
(async function bootstrap() {
  const grid = document.querySelector('.products__grid');
  if (!grid) return;

  let products;
  try {
    const res = await fetch('products.json?' + Date.now());
    products = await res.json();
  } catch (e) {
    console.error('Could not load products.json', e);
    return;
  }

  // Expose globally so admin.js can access
  window.__products = products;

  grid.innerHTML = products.map((p, i) => buildProductCard(p, i)).join('');

  initGalleries();
  initSizeSelector();
  initLightbox();
  initCart();
  initReveal();
})();
