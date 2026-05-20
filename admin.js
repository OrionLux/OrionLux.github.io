/* ============================================================
   ORION LUX – admin.js
   GitHub-backed admin panel. Activated via ?admin in the URL.
   Full-page layout. All edits are local until "Guardar todo".
   ============================================================ */

'use strict';

(function initAdminSystem() {
  if (!new URLSearchParams(window.location.search).has('admin')) return;

  /* ── Config ─────────────────────────────────────────────── */
  const ADMIN_PASSWORD = 'beltranmisalvador';
  const PRODUCTS_PATH  = 'products.json';
  const IMAGES_PATH    = 'images/';

  /* ── State ──────────────────────────────────────────────── */
  let ghToken      = '';
  let ghOwner      = '';
  let ghRepo       = '';
  let ghBranch     = 'master';
  let products     = [];   // working copy — mutated in place
  let productsSha  = '';
  let dirty        = false;  // unsaved changes?

  /* ── Replace entire page with admin UI ─────────────────── */
  document.documentElement.innerHTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Admin — Orion Lux</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Outfit:wght@200;300;400;500&display=swap" rel="stylesheet"/>
  <link rel="stylesheet" href="styles.css"/>
</head>
<body class="adm-page">
  <div id="admRoot"></div>
  <div id="admToastArea"></div>
</body>
</html>`;

  /* ── Helpers ────────────────────────────────────────────── */
  function render(html) {
    document.getElementById('admRoot').innerHTML = html;
  }

  function admToast(msg, isError = false) {
    const area = document.getElementById('admToastArea');
    if (!area) return;
    const t = document.createElement('div');
    t.className = 'adm-toast' + (isError ? ' adm-toast--error' : '');
    t.textContent = msg;
    area.appendChild(t);
    requestAnimationFrame(() => t.classList.add('adm-toast--visible'));
    setTimeout(() => { t.classList.remove('adm-toast--visible'); setTimeout(() => t.remove(), 400); }, 3200);
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function markDirty() {
    dirty = true;
    const btn = document.getElementById('admSaveAll');
    if (btn) { btn.disabled = false; btn.textContent = 'Guardar todo ●'; }
  }

  /* ── GitHub API ─────────────────────────────────────────── */
  async function ghFetch(path, options = {}) {
    const res = await fetch(`https://api.github.com/repos/${ghOwner}/${ghRepo}/${path}`, {
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
  }

  async function saveAllProducts() {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(products, null, 2))));
    await ghFetch(`contents/${PRODUCTS_PATH}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'admin: update products.json',
        content,
        sha: productsSha,
        branch: ghBranch,
      }),
    });
    const updated = await ghFetch(`contents/${PRODUCTS_PATH}`);
    productsSha = updated.sha;
    dirty = false;
  }

  async function uploadImage(filename, base64Data) {
    const path = `${IMAGES_PATH}${filename}`;
    let existingSha;
    try { const ex = await ghFetch(`contents/${path}`); existingSha = ex.sha; } catch {}
    const body = { message: `admin: upload image ${filename}`, content: base64Data, branch: ghBranch };
    if (existingSha) body.sha = existingSha;
    await ghFetch(`contents/${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return path;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ════════════════════════════════════════════════════════
     LOGIN PAGE
  ════════════════════════════════════════════════════════ */
  function renderLogin() {
    render(`
      <div class="adm-login-page">
        <div class="adm-login-card">
          <div class="adm-login__logo">
            <svg width="32" height="32" viewBox="0 0 60 60" fill="none">
              <path d="M30 6 L33 27 L54 30 L33 33 L30 54 L27 33 L6 30 L27 27 Z" fill="currentColor" opacity="0.7"/>
            </svg>
            <span>ORION LUX</span>
          </div>
          <h1 class="adm-login__title">Panel Admin</h1>
          <form id="admLoginForm" class="adm-form" autocomplete="off">
            <div class="adm-field">
              <label class="adm-label">Contraseña</label>
              <input type="password" id="admPassword" class="adm-input" placeholder="••••••••••••" required autocomplete="current-password"/>
            </div>
            <div class="adm-field">
              <label class="adm-label">GitHub Token</label>
              <input type="password" id="admToken" class="adm-input" placeholder="ghp_..." required autocomplete="off"/>
              <p class="adm-hint">Token con permisos <code>contents:write</code>.</p>
            </div>
            <div class="adm-grid-2">
              <div class="adm-field">
                <label class="adm-label">Repositorio (usuario/repo)</label>
                <input type="text" id="admRepoInput" class="adm-input" placeholder="OrionLux/OrionLux.github.io" required/>
              </div>
              <div class="adm-field">
                <label class="adm-label">Branch</label>
                <input type="text" id="admBranchInput" class="adm-input" value="master"/>
              </div>
            </div>
            <button type="submit" class="adm-btn adm-btn--primary adm-btn--full" id="admLoginBtn">
              <span id="admLoginLabel">Ingresar</span>
            </button>
            <p class="adm-error" id="admLoginError" hidden></p>
          </form>
        </div>
      </div>
    `);

    document.getElementById('admLoginForm').addEventListener('submit', async e => {
      e.preventDefault();
      const pw      = document.getElementById('admPassword').value;
      const token   = document.getElementById('admToken').value.trim();
      const repoVal = document.getElementById('admRepoInput').value.trim();
      const branch  = document.getElementById('admBranchInput').value.trim() || 'master';
      const errEl   = document.getElementById('admLoginError');
      const label   = document.getElementById('admLoginLabel');
      const btn     = document.getElementById('admLoginBtn');

      errEl.hidden = true;

      if (pw !== ADMIN_PASSWORD) {
        errEl.textContent = 'Contraseña incorrecta.';
        errEl.hidden = false;
        return;
      }
      if (!repoVal.includes('/')) {
        errEl.textContent = 'Formato: usuario/repositorio';
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
        renderDashboard();
      } catch (err) {
        errEl.textContent = 'Error: ' + err.message;
        errEl.hidden = false;
        label.textContent = 'Ingresar';
        btn.disabled = false;
      }
    });
  }

  /* ════════════════════════════════════════════════════════
     DASHBOARD (product list)
  ════════════════════════════════════════════════════════ */
  function renderDashboard() {
    render(`
      <div class="adm-layout">
        <header class="adm-topbar">
          <div class="adm-topbar__brand">
            <svg width="22" height="22" viewBox="0 0 60 60" fill="none">
              <path d="M30 6 L33 27 L54 30 L33 33 L30 54 L27 33 L6 30 L27 27 Z" fill="currentColor" opacity="0.7"/>
            </svg>
            <span>Orion Lux — Admin</span>
          </div>
          <div class="adm-topbar__actions">
            <button class="adm-btn adm-btn--primary" id="admSaveAll" disabled>Guardar todo</button>
            <button class="adm-btn adm-btn--ghost" id="admExitBtn">← Volver al sitio</button>
          </div>
        </header>

        <main class="adm-main">
          <div class="adm-section-header">
            <h2 class="adm-section-title">Productos</h2>
            <button class="adm-btn adm-btn--primary adm-btn--sm" id="admAddProduct">+ Nuevo producto</button>
          </div>
          <div id="admProductList" class="adm-product-list"></div>
        </main>
      </div>
    `);

    document.getElementById('admExitBtn').addEventListener('click', () => {
      if (dirty && !confirm('Tenés cambios sin guardar. ¿Salir igual?')) return;
      window.location.href = window.location.pathname;
    });

    document.getElementById('admSaveAll').addEventListener('click', async () => {
      const btn = document.getElementById('admSaveAll');
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      try {
        await saveAllProducts();
        btn.textContent = 'Guardar todo';
        admToast('Cambios guardados y publicados.');
      } catch (err) {
        admToast('Error al guardar: ' + err.message, true);
        btn.disabled = false;
        btn.textContent = 'Guardar todo ●';
      }
    });

    document.getElementById('admAddProduct').addEventListener('click', () => {
      renderProductForm(null, -1);
    });

    renderProductList();
  }

  /* ── Product list ───────────────────────────────────────── */
  function renderProductList() {
    const list = document.getElementById('admProductList');
    if (!list) return;

    if (!products.length) {
      list.innerHTML = '<p class="adm-empty">No hay productos. Agregá uno.</p>';
      return;
    }

    list.innerHTML = products.map((p, idx) => `
      <div class="adm-product-row" data-idx="${idx}">
        <img class="adm-product-row__thumb" src="${p.images[0]?.src || ''}" alt="${p.name}"/>
        <div class="adm-product-row__info">
          <div class="adm-product-row__name">${p.name}</div>
          <div class="adm-product-row__cat">${p.category}</div>
          <div class="adm-product-row__sizes">
            ${p.sizes.map(s => `<span class="adm-size-chip ${s.inStock ? '' : 'adm-size-chip--out'}">${s.label} $${parseInt(s.price).toLocaleString('es-AR')}</span>`).join('')}
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
      btn.addEventListener('click', () => renderProductForm(products[parseInt(btn.dataset.edit)], parseInt(btn.dataset.edit)));
    });
    list.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.delete);
        if (!confirm(`¿Eliminar "${products[idx].name}"?`)) return;
        products.splice(idx, 1);
        markDirty();
        renderProductList();
      });
    });
  }

  /* ════════════════════════════════════════════════════════
     PRODUCT FORM (edit or new)
     idx = -1 for new product
  ════════════════════════════════════════════════════════ */
  function renderProductForm(p, idx) {
    const isNew = idx === -1;
    p = p || { id:'', category:'', name:'', description:'', images:[], sizes:[{ label:'', price:0, inStock:true }], inStock:true };

    render(`
      <div class="adm-layout">
        <header class="adm-topbar">
          <div class="adm-topbar__brand">
            <button class="adm-btn adm-btn--ghost adm-btn--sm" id="admBackBtn">← Productos</button>
            <span class="adm-topbar__page">${isNew ? 'Nuevo producto' : 'Editar: ' + p.name}</span>
          </div>
          <div class="adm-topbar__actions">
            <button class="adm-btn adm-btn--primary" id="admSaveAll" ${dirty ? '' : 'disabled'}>${dirty ? 'Guardar todo ●' : 'Guardar todo'}</button>
          </div>
        </header>

        <main class="adm-main adm-main--form">
          <form id="admProductForm" class="adm-form" autocomplete="off">

            <div class="adm-card">
              <h3 class="adm-card__title">Información general</h3>
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
              <div class="adm-field adm-field--inline">
                <label class="adm-label">Producto en stock</label>
                <label class="adm-toggle">
                  <input type="checkbox" id="admProductStock" ${p.inStock ? 'checked' : ''}/>
                  <span class="adm-toggle__track"></span>
                </label>
              </div>
            </div>

            <div class="adm-card">
              <h3 class="adm-card__title">Imágenes</h3>
              <div id="admImageList" class="adm-image-list"></div>
              <label class="adm-btn adm-btn--sm adm-btn--ghost adm-file-label" style="margin-top:12px">
                + Agregar imagen(es)
                <input type="file" id="admImageInput" accept="image/*" multiple style="display:none"/>
              </label>
              <p class="adm-hint" style="margin-top:6px">Se subirán a images/ en el repositorio al guardar.</p>
            </div>

            <div class="adm-card">
              <h3 class="adm-card__title">Tallas y precios</h3>
              <div id="admSizeList" class="adm-size-list"></div>
              <button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" id="admAddSize" style="margin-top:12px">+ Agregar talla</button>
            </div>

            <div class="adm-form__footer">
              <button type="button" class="adm-btn adm-btn--ghost" id="admCancelForm">Cancelar</button>
              <button type="submit" class="adm-btn adm-btn--primary" id="admApplyBtn">
                <span id="admApplyLabel">${isNew ? 'Agregar a la lista' : 'Aplicar cambios'}</span>
              </button>
            </div>
            <p class="adm-hint" style="text-align:right;margin-top:4px">Los cambios no se publican hasta que presiones <strong>Guardar todo</strong>.</p>
            <p class="adm-error" id="admFormError" hidden></p>
          </form>
        </main>
      </div>
    `);

    document.getElementById('admBackBtn').addEventListener('click', () => {
      renderDashboard();
      renderProductList();
    });
    document.getElementById('admCancelForm').addEventListener('click', () => {
      renderDashboard();
      renderProductList();
    });

    // "Guardar todo" also works from the form page
    document.getElementById('admSaveAll').addEventListener('click', async () => {
      const btn = document.getElementById('admSaveAll');
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      try {
        await saveAllProducts();
        btn.textContent = 'Guardar todo';
        admToast('Cambios guardados y publicados.');
      } catch (err) {
        admToast('Error al guardar: ' + err.message, true);
        btn.disabled = false;
        btn.textContent = 'Guardar todo ●';
      }
    });

    /* ── Image state ── */
    let imageItems = p.images.map(img => ({ ...img, file: null, preview: img.src }));

    function renderImageList() {
      const c = document.getElementById('admImageList');
      if (!c) return;
      c.innerHTML = imageItems.length ? imageItems.map((img, i) => `
        <div class="adm-image-item">
          <img class="adm-image-item__thumb" src="${img.preview}" alt=""/>
          <input type="text" class="adm-input adm-image-item__alt" placeholder="Alt text" value="${img.alt || ''}" data-alt="${i}"/>
          <select class="adm-input adm-image-item__fit" data-fit="${i}">
            <option value="contain" ${(img.fit||'contain')==='contain'?'selected':''}>contain</option>
            <option value="cover"   ${img.fit==='cover'?'selected':''}>cover</option>
          </select>
          <button type="button" class="adm-image-item__remove" data-remove="${i}" aria-label="Eliminar">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join('') : '<p class="adm-hint">Sin imágenes.</p>';

      c.querySelectorAll('[data-remove]').forEach(btn => {
        btn.addEventListener('click', () => { imageItems.splice(parseInt(btn.dataset.remove), 1); renderImageList(); });
      });
    }
    renderImageList();

    document.getElementById('admImageInput').addEventListener('change', async e => {
      for (const file of Array.from(e.target.files)) {
        imageItems.push({ src:'', alt: file.name.replace(/\.[^.]+$/,''), fit:'contain', file, base64: await fileToBase64(file), preview: URL.createObjectURL(file) });
      }
      renderImageList();
      e.target.value = '';
    });

    /* ── Size state ── */
    let sizeItems = p.sizes.map(s => ({ ...s }));

    function renderSizeList() {
      const c = document.getElementById('admSizeList');
      if (!c) return;
      c.innerHTML = sizeItems.map((s, i) => `
        <div class="adm-size-row">
          <input type="text"   class="adm-input adm-size-row__label" placeholder="Talla" value="${s.label}" data-slabel="${i}"/>
          <input type="number" class="adm-input adm-size-row__price" placeholder="Precio ARS" value="${s.price}" data-sprice="${i}" min="0"/>
          <label class="adm-toggle" title="${s.inStock?'En stock':'Sin stock'}">
            <input type="checkbox" data-sstock="${i}" ${s.inStock?'checked':''}/>
            <span class="adm-toggle__track"></span>
          </label>
          <span class="adm-size-row__hint">${s.inStock?'En stock':'Sin stock'}</span>
          <button type="button" class="adm-image-item__remove" data-sremove="${i}">
            <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
        </div>
      `).join('');

      c.querySelectorAll('[data-slabel]').forEach(el => el.addEventListener('input', () => { sizeItems[+el.dataset.slabel].label = el.value; }));
      c.querySelectorAll('[data-sprice]').forEach(el => el.addEventListener('input', () => { sizeItems[+el.dataset.sprice].price = parseInt(el.value)||0; }));
      c.querySelectorAll('[data-sstock]').forEach(el => el.addEventListener('change', () => {
        sizeItems[+el.dataset.sstock].inStock = el.checked;
        el.closest('.adm-size-row').querySelector('.adm-size-row__hint').textContent = el.checked ? 'En stock' : 'Sin stock';
      }));
      c.querySelectorAll('[data-sremove]').forEach(btn => btn.addEventListener('click', () => { sizeItems.splice(+btn.dataset.sremove,1); renderSizeList(); }));
    }
    renderSizeList();

    document.getElementById('admAddSize').addEventListener('click', () => { sizeItems.push({label:'',price:0,inStock:true}); renderSizeList(); });

    /* ── Apply (local only) ── */
    document.getElementById('admProductForm').addEventListener('submit', async e => {
      e.preventDefault();
      const errEl = document.getElementById('admFormError');
      const applyBtn = document.getElementById('admApplyBtn');
      const applyLabel = document.getElementById('admApplyLabel');
      errEl.hidden = true;
      applyBtn.disabled = true;
      applyLabel.textContent = 'Procesando…';

      try {
        // Collect current alt/fit values from inputs
        document.querySelectorAll('[data-alt]').forEach(el => { imageItems[+el.dataset.alt].alt = el.value; });
        document.querySelectorAll('[data-fit]').forEach(el => { imageItems[+el.dataset.fit].fit = el.value; });

        // Upload new images to GitHub right away (they need a URL before saving JSON)
        for (const img of imageItems) {
          if (img.file && img.base64) {
            applyLabel.textContent = `Subiendo ${img.file.name}…`;
            const ext = img.file.name.split('.').pop();
            const filename = `${Date.now()}-${slugify(img.file.name.replace(/\.[^.]+$/,''))}.${ext}`;
            img.src = await uploadImage(filename, img.base64);
            img.file = null; img.base64 = null;
          }
        }

        const name = document.getElementById('admName').value.trim();
        const updated = {
          id:          isNew ? slugify(name) || `product-${Date.now()}` : p.id,
          category:    document.getElementById('admCategory').value.trim(),
          name,
          description: document.getElementById('admDesc').value.trim(),
          images:      imageItems.map(({ src, alt, fit }) => ({ src, alt, fit: fit||'contain' })),
          sizes:       sizeItems,
          inStock:     document.getElementById('admProductStock').checked,
        };

        if (isNew) {
          products.push(updated);
        } else {
          products[idx] = updated;
        }

        markDirty();
        admToast(isNew ? 'Producto agregado. Presioná Guardar todo para publicar.' : 'Cambios aplicados. Presioná Guardar todo para publicar.');
        renderDashboard();
        renderProductList();

      } catch (err) {
        errEl.textContent = 'Error: ' + err.message;
        errEl.hidden = false;
        applyBtn.disabled = false;
        applyLabel.textContent = isNew ? 'Agregar a la lista' : 'Aplicar cambios';
      }
    });
  }

  /* ── Boot ───────────────────────────────────────────────── */
  renderLogin();

})();
