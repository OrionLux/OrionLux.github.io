/* ============================================================
   ORION LUX – admin.js
   GitHub-backed admin panel. Activated via ?admin in the URL.
   ============================================================ */

'use strict';

(function initAdminSystem() {
  if (!new URLSearchParams(window.location.search).has('admin')) return;

  /* ── Config ─────────────────────────────────────────────── */
  const ADMIN_PASSWORD  = 'beltranmisalvador';
  const GH_REPO_OWNER   = '';   // filled after login
  const PRODUCTS_PATH   = 'products.json';
  const IMAGES_PATH     = 'images/';

  /* ── State ──────────────────────────────────────────────── */
  let ghToken   = '';
  let ghOwner   = '';
  let ghRepo    = '';
  let ghBranch  = 'master';
  let products  = [];
  let productsSha = '';   // SHA of products.json for update API

  /* ── Inject overlay shell ───────────────────────────────── */
  const overlay = document.createElement('div');
  overlay.id = 'adminOverlay';
  overlay.innerHTML = `
    <div class="adm-modal" id="admModal">
      <div class="adm-modal__inner" id="admModalInner"></div>
    </div>`;
  document.body.appendChild(overlay);

  /* ── Helpers ────────────────────────────────────────────── */
  function setModal(html) {
    document.getElementById('admModalInner').innerHTML = html;
  }

  function admToast(msg, isError = false) {
    const t = document.createElement('div');
    t.className = 'adm-toast' + (isError ? ' adm-toast--error' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('adm-toast--visible'));
    setTimeout(() => { t.classList.remove('adm-toast--visible'); setTimeout(() => t.remove(), 400); }, 3000);
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function fmtPrice(n) { return parseInt(n).toLocaleString('es-AR'); }

  /* ── GitHub API ─────────────────────────────────────────── */
  async function ghFetch(path, options = {}) {
    const url = `https://api.github.com/repos/${ghOwner}/${ghRepo}/${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${ghToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(options.headers || {}),
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error ${res.status}`);
    }
    return res.json();
  }

  async function loadProducts() {
    const data = await ghFetch(`contents/${PRODUCTS_PATH}`);
    productsSha = data.sha;
    products = JSON.parse(atob(data.content.replace(/\n/g, '')));
    return products;
  }

  async function saveProducts(newProducts, commitMsg) {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(newProducts, null, 2))));
    await ghFetch(`contents/${PRODUCTS_PATH}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: commitMsg || 'admin: update products.json',
        content,
        sha: productsSha,
        branch: ghBranch,
      }),
    });
    // Refresh SHA after save
    const updated = await ghFetch(`contents/${PRODUCTS_PATH}`);
    productsSha = updated.sha;
    products = newProducts;
  }

  async function uploadImage(filename, base64Data) {
    const path = `${IMAGES_PATH}${filename}`;
    // Check if file already exists (get its SHA if so)
    let existingSha;
    try {
      const existing = await ghFetch(`contents/${path}`);
      existingSha = existing.sha;
    } catch { /* new file */ }

    const body = {
      message: `admin: upload image ${filename}`,
      content: base64Data,
      branch: ghBranch,
    };
    if (existingSha) body.sha = existingSha;

    await ghFetch(`contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return `${IMAGES_PATH}${filename}`;
  }

  /* ── File → base64 ──────────────────────────────────────── */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ════════════════════════════════════════════════════════
     STEP 1 – Login screen
  ════════════════════════════════════════════════════════ */
  function renderLogin() {
    setModal(`
      <div class="adm-login">
        <div class="adm-login__logo">
          <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
            <path d="M30 6 L33 27 L54 30 L33 33 L30 54 L27 33 L6 30 L27 27 Z" fill="currentColor" opacity="0.7"/>
          </svg>
          <span>ORION LUX</span>
        </div>
        <h2 class="adm-login__title">Panel Admin</h2>
        <form id="admLoginForm" class="adm-form" autocomplete="off">
          <div class="adm-field">
            <label class="adm-label">Contraseña</label>
            <input type="password" id="admPassword" class="adm-input" placeholder="••••••••••••" required autocomplete="current-password"/>
          </div>
          <div class="adm-field">
            <label class="adm-label">GitHub Token</label>
            <input type="password" id="admToken" class="adm-input" placeholder="ghp_..." required autocomplete="off"/>
            <p class="adm-hint">Token con permisos <code>contents:write</code> en el repositorio.</p>
          </div>
          <div class="adm-field">
            <label class="adm-label">Repositorio (usuario/repo)</label>
            <input type="text" id="admRepoInput" class="adm-input" placeholder="SuaveSuavitel/orion-web" required/>
          </div>
          <div class="adm-field">
            <label class="adm-label">Branch</label>
            <input type="text" id="admBranchInput" class="adm-input" value="master"/>
          </div>
          <button type="submit" class="adm-btn adm-btn--primary" id="admLoginBtn">
            <span id="admLoginLabel">Ingresar</span>
          </button>
          <p class="adm-error" id="admLoginError" hidden></p>
        </form>
      </div>
    `);

    document.getElementById('admLoginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const pw      = document.getElementById('admPassword').value;
      const token   = document.getElementById('admToken').value.trim();
      const repoVal = document.getElementById('admRepoInput').value.trim();
      const branch  = document.getElementById('admBranchInput').value.trim() || 'master';
      const errEl   = document.getElementById('admLoginError');
      const btn     = document.getElementById('admLoginBtn');
      const label   = document.getElementById('admLoginLabel');

      errEl.hidden = true;

      if (pw !== ADMIN_PASSWORD) {
        errEl.textContent = 'Contraseña incorrecta.';
        errEl.hidden = false;
        return;
      }

      if (!repoVal.includes('/')) {
        errEl.textContent = 'Formato incorrecto. Usá usuario/repositorio.';
        errEl.hidden = false;
        return;
      }

      [ghOwner, ghRepo] = repoVal.split('/');
      ghToken  = token;
      ghBranch = branch;

      label.textContent = 'Conectando…';
      btn.disabled = true;

      try {
        await loadProducts();
        renderPanel();
      } catch (err) {
        errEl.textContent = 'Error al conectar: ' + err.message;
        errEl.hidden = false;
        label.textContent = 'Ingresar';
        btn.disabled = false;
      }
    });
  }

  /* ════════════════════════════════════════════════════════
     STEP 2 – Main panel
  ════════════════════════════════════════════════════════ */
  function renderPanel() {
    setModal(`
      <div class="adm-panel">
        <div class="adm-panel__header">
          <div class="adm-panel__title">
            <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
              <path d="M30 6 L33 27 L54 30 L33 33 L30 54 L27 33 L6 30 L27 27 Z" fill="currentColor" opacity="0.7"/>
            </svg>
            Panel Admin
          </div>
          <button class="adm-close" id="admPanelClose" aria-label="Cerrar">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>

        <div class="adm-panel__body">
          <div class="adm-section-header">
            <h3 class="adm-section-title">Productos</h3>
            <button class="adm-btn adm-btn--sm adm-btn--primary" id="admAddProduct">+ Nuevo producto</button>
          </div>
          <div id="admProductList" class="adm-product-list"></div>
        </div>
      </div>
    `);

    document.getElementById('admPanelClose').addEventListener('click', () => {
      overlay.remove();
      const url = new URL(window.location.href);
      url.searchParams.delete('admin');
      window.history.replaceState({}, '', url);
    });

    document.getElementById('admAddProduct').addEventListener('click', () => renderAddProduct());

    renderProductList();
  }

  /* ── Product list ───────────────────────────────────────── */
  function renderProductList() {
    const list = document.getElementById('admProductList');
    if (!list) return;

    list.innerHTML = products.map((p, idx) => `
      <div class="adm-product-row" data-idx="${idx}">
        <div class="adm-product-row__info">
          <img class="adm-product-row__thumb" src="${p.images[0]?.src || ''}" alt="${p.name}"/>
          <div>
            <div class="adm-product-row__name">${p.name}</div>
            <div class="adm-product-row__cat">${p.category}</div>
          </div>
        </div>
        <div class="adm-product-row__actions">
          <span class="adm-stock-badge ${p.inStock ? 'adm-stock-badge--in' : 'adm-stock-badge--out'}">
            ${p.inStock ? 'En stock' : 'Sin stock'}
          </span>
          <button class="adm-btn adm-btn--sm adm-btn--ghost" data-edit="${idx}">Editar</button>
          <button class="adm-btn adm-btn--sm adm-btn--danger" data-delete="${idx}">Eliminar</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', () => renderEditProduct(parseInt(btn.dataset.edit)));
    });

    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => confirmDeleteProduct(parseInt(btn.dataset.delete)));
    });
  }

  /* ── Confirm delete ─────────────────────────────────────── */
  function confirmDeleteProduct(idx) {
    const p = products[idx];
    if (!confirm(`¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`)) return;
    const updated = products.filter((_, i) => i !== idx);
    saveProducts(updated, `admin: remove product ${p.id}`)
      .then(() => { admToast('Producto eliminado.'); renderProductList(); })
      .catch(err => admToast('Error: ' + err.message, true));
  }

  /* ════════════════════════════════════════════════════════
     Edit product
  ════════════════════════════════════════════════════════ */
  function renderEditProduct(idx) {
    const p = products[idx];
    renderProductForm(p, false, async (updated) => {
      const newProducts = [...products];
      newProducts[idx] = updated;
      await saveProducts(newProducts, `admin: update product ${updated.id}`);
      admToast('Producto guardado.');
      renderPanel();
      // Reload page products
      reloadPageProducts();
    });
  }

  /* ════════════════════════════════════════════════════════
     Add product
  ════════════════════════════════════════════════════════ */
  function renderAddProduct() {
    const blank = {
      id: '',
      category: '',
      name: '',
      description: '',
      images: [],
      sizes: [{ label: '', price: 0, inStock: true }],
      inStock: true,
    };
    renderProductForm(blank, true, async (updated) => {
      const newProducts = [...products, updated];
      await saveProducts(newProducts, `admin: add product ${updated.id}`);
      admToast('Producto creado.');
      renderPanel();
      reloadPageProducts();
    });
  }

  /* ════════════════════════════════════════════════════════
     Shared product form
  ════════════════════════════════════════════════════════ */
  function renderProductForm(p, isNew, onSave) {
    const title = isNew ? 'Nuevo producto' : `Editar: ${p.name}`;

    setModal(`
      <div class="adm-panel">
        <div class="adm-panel__header">
          <div class="adm-panel__title">${title}</div>
          <button class="adm-close" id="admFormBack" aria-label="Volver">
            <svg viewBox="0 0 20 20" fill="none"><path d="M13 4L7 10L13 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="adm-panel__body">
          <form id="admProductForm" class="adm-form" autocomplete="off">

            <!-- Basic info -->
            <div class="adm-grid-2">
              <div class="adm-field">
                <label class="adm-label">Nombre</label>
                <input type="text" id="admName" class="adm-input" value="${p.name}" required/>
              </div>
              <div class="adm-field">
                <label class="adm-label">Categoría</label>
                <input type="text" id="admCategory" class="adm-input" value="${p.category}" placeholder="Aretes · Studs"/>
              </div>
            </div>

            <div class="adm-field">
              <label class="adm-label">Descripción</label>
              <textarea id="admDesc" class="adm-input adm-textarea" rows="3">${p.description}</textarea>
            </div>

            <!-- Stock toggle for whole product -->
            <div class="adm-field adm-field--inline">
              <label class="adm-label">Producto en stock</label>
              <label class="adm-toggle">
                <input type="checkbox" id="admProductStock" ${p.inStock ? 'checked' : ''}/>
                <span class="adm-toggle__track"></span>
              </label>
            </div>

            <!-- Images -->
            <div class="adm-field">
              <label class="adm-label">Imágenes</label>
              <div id="admImageList" class="adm-image-list"></div>
              <label class="adm-btn adm-btn--sm adm-btn--ghost adm-file-label" style="margin-top:8px">
                + Agregar imagen(es)
                <input type="file" id="admImageInput" accept="image/*" multiple style="display:none"/>
              </label>
              <p class="adm-hint">Las imágenes se subirán al repositorio en images/.</p>
            </div>

            <!-- Sizes -->
            <div class="adm-field">
              <label class="adm-label">Tallas y precios</label>
              <div id="admSizeList" class="adm-size-list"></div>
              <button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" id="admAddSize" style="margin-top:8px">+ Agregar talla</button>
            </div>

            <div class="adm-form__footer">
              <button type="button" class="adm-btn adm-btn--ghost" id="admFormBack2">Cancelar</button>
              <button type="submit" class="adm-btn adm-btn--primary" id="admSaveBtn">
                <span id="admSaveLabel">${isNew ? 'Crear producto' : 'Guardar cambios'}</span>
              </button>
            </div>
            <p class="adm-error" id="admFormError" hidden></p>
          </form>
        </div>
      </div>
    `);

    document.getElementById('admFormBack').addEventListener('click', renderPanel);
    document.getElementById('admFormBack2').addEventListener('click', renderPanel);

    // ── Image list state ──
    let imageItems = p.images.map(img => ({ ...img, file: null, preview: img.src }));

    function renderImageList() {
      const container = document.getElementById('admImageList');
      if (!container) return;
      container.innerHTML = imageItems.map((img, i) => `
        <div class="adm-image-item" data-i="${i}">
          <img class="adm-image-item__thumb" src="${img.preview}" alt=""/>
          <input type="text" class="adm-input adm-image-item__alt" placeholder="Alt text" value="${img.alt || ''}" data-alt="${i}"/>
          <select class="adm-input adm-image-item__fit" data-fit="${i}">
            <option value="contain" ${(img.fit || 'contain') === 'contain' ? 'selected' : ''}>contain</option>
            <option value="cover"   ${img.fit === 'cover'   ? 'selected' : ''}>cover</option>
          </select>
          <button type="button" class="adm-image-item__remove" data-remove="${i}" aria-label="Eliminar imagen">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join('');

      container.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => {
          imageItems.splice(parseInt(btn.dataset.remove), 1);
          renderImageList();
        });
      });
    }

    renderImageList();

    document.getElementById('admImageInput').addEventListener('change', async e => {
      const files = Array.from(e.target.files);
      for (const file of files) {
        const b64   = await fileToBase64(file);
        const preview = URL.createObjectURL(file);
        imageItems.push({ src: '', alt: file.name.replace(/\.[^.]+$/, ''), fit: 'contain', file, base64: b64, preview });
      }
      renderImageList();
      e.target.value = '';
    });

    // ── Size list state ──
    let sizeItems = p.sizes.map(s => ({ ...s }));

    function renderSizeList() {
      const container = document.getElementById('admSizeList');
      if (!container) return;
      container.innerHTML = sizeItems.map((s, i) => `
        <div class="adm-size-row" data-i="${i}">
          <input type="text"   class="adm-input adm-size-row__label" placeholder="Talla (ej: 7)" value="${s.label}" data-slabel="${i}"/>
          <input type="number" class="adm-input adm-size-row__price" placeholder="Precio ARS" value="${s.price}" data-sprice="${i}" min="0"/>
          <label class="adm-toggle adm-size-row__stock" title="En stock">
            <input type="checkbox" data-sstock="${i}" ${s.inStock ? 'checked' : ''}/>
            <span class="adm-toggle__track"></span>
          </label>
          <span class="adm-size-row__hint">${s.inStock ? 'En stock' : 'Sin stock'}</span>
          <button type="button" class="adm-image-item__remove" data-sremove="${i}" aria-label="Eliminar talla">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join('');

      // Live update sizeItems on input
      container.querySelectorAll('[data-slabel]').forEach(el => {
        el.addEventListener('input', () => { sizeItems[parseInt(el.dataset.slabel)].label = el.value; });
      });
      container.querySelectorAll('[data-sprice]').forEach(el => {
        el.addEventListener('input', () => { sizeItems[parseInt(el.dataset.sprice)].price = parseInt(el.value) || 0; });
      });
      container.querySelectorAll('[data-sstock]').forEach(el => {
        el.addEventListener('change', () => {
          const i = parseInt(el.dataset.sstock);
          sizeItems[i].inStock = el.checked;
          const hint = el.closest('.adm-size-row').querySelector('.adm-size-row__hint');
          if (hint) hint.textContent = el.checked ? 'En stock' : 'Sin stock';
        });
      });
      container.querySelectorAll('[data-sremove]').forEach(btn => {
        btn.addEventListener('click', () => { sizeItems.splice(parseInt(btn.dataset.sremove), 1); renderSizeList(); });
      });
    }

    renderSizeList();

    document.getElementById('admAddSize').addEventListener('click', () => {
      sizeItems.push({ label: '', price: 0, inStock: true });
      renderSizeList();
    });

    // ── Form submit ──
    document.getElementById('admProductForm').addEventListener('submit', async e => {
      e.preventDefault();
      const errEl   = document.getElementById('admFormError');
      const saveBtn = document.getElementById('admSaveBtn');
      const label   = document.getElementById('admSaveLabel');

      errEl.hidden = true;
      saveBtn.disabled = true;
      label.textContent = 'Guardando…';

      try {
        // Collect alt/fit from rendered inputs
        document.querySelectorAll('[data-alt]').forEach(el => {
          imageItems[parseInt(el.dataset.alt)].alt = el.value;
        });
        document.querySelectorAll('[data-fit]').forEach(el => {
          imageItems[parseInt(el.dataset.fit)].fit = el.value;
        });

        // Upload any new images
        for (const img of imageItems) {
          if (img.file && img.base64) {
            label.textContent = `Subiendo ${img.file.name}…`;
            const ext      = img.file.name.split('.').pop();
            const filename = `${Date.now()}-${slugify(img.file.name.replace(/\.[^.]+$/, ''))}.${ext}`;
            img.src = await uploadImage(filename, img.base64);
          }
        }

        const name = document.getElementById('admName').value.trim();
        const updated = {
          id:          isNew ? slugify(name) || `product-${Date.now()}` : p.id,
          category:    document.getElementById('admCategory').value.trim(),
          name,
          description: document.getElementById('admDesc').value.trim(),
          images:      imageItems.map(({ src, alt, fit }) => ({ src, alt, fit: fit || 'contain' })),
          sizes:       sizeItems,
          inStock:     document.getElementById('admProductStock').checked,
        };

        await onSave(updated);
      } catch (err) {
        errEl.textContent = 'Error: ' + err.message;
        errEl.hidden = false;
        saveBtn.disabled = false;
        label.textContent = isNew ? 'Crear producto' : 'Guardar cambios';
      }
    });
  }

  /* ── Reload visible page products without full refresh ───── */
  function reloadPageProducts() {
    const grid = document.querySelector('.products__grid');
    if (!grid || typeof window.buildProductCard !== 'function') {
      // Fall back to full reload after short delay so GitHub propagates
      setTimeout(() => window.location.reload(), 1500);
      return;
    }
    grid.innerHTML = products.map((p, i) => window.buildProductCard(p, i)).join('');
    if (typeof window.initGalleries === 'function') window.initGalleries();
    if (typeof window.initSizeSelector === 'function') window.initSizeSelector();
    if (typeof window.initReveal === 'function') window.initReveal();
  }

  /* ── Boot ───────────────────────────────────────────────── */
  renderLogin();

})();
