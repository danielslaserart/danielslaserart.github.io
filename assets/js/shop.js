document.addEventListener('DOMContentLoaded', () => {

  const products = window.SHOP_PRODUCTS || [];
  const grid = document.getElementById('shopGrid');
  const cartList = document.getElementById('cartList');
  const cartCount = document.getElementById('cartCount');
  const cartTotal = document.getElementById('cartTotal');
  const filterButtons = document.querySelectorAll('[data-filter]');
  const searchInput = document.getElementById('shopSearch');
  const orderForm = document.getElementById('orderForm');

  const cart = JSON.parse(localStorage.getItem('dlaCart') || '[]');

  const currency = (value) =>
    value.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR'
    });

  const save = () =>
    localStorage.setItem('dlaCart', JSON.stringify(cart));

  function createColorModal() {
    if (document.getElementById('colorPreviewModal')) return;

    const modal = document.createElement('div');

    modal.className = 'color-preview-modal';
    modal.id = 'colorPreviewModal';

    modal.innerHTML = `
      <div class="color-preview-dialog">

        <button class="color-preview-close" type="button">
          ×
        </button>

        <div class="color-preview-head">
          <p class="badge" id="colorPreviewBadge"></p>
          <h2 id="colorPreviewTitle"></h2>
          <p id="colorPreviewText"></p>
        </div>

        <div class="color-preview-grid" id="colorPreviewGrid"></div>

      </div>
    `;

    document.body.appendChild(modal);
  }

  function openColorModal(preview) {

    createColorModal();

    const modal = document.getElementById('colorPreviewModal');
    const modalGrid = document.getElementById('colorPreviewGrid');

    document.getElementById('colorPreviewBadge').textContent =
      preview.badge || '';

    document.getElementById('colorPreviewTitle').textContent =
      preview.title || '';

    document.getElementById('colorPreviewText').textContent =
      preview.text || '';

    modalGrid.innerHTML = (preview.items || []).map((item) => `
      <article class="color-preview-card">

        <div class="color-preview-image-wrap">

          <img
            src="${item.image}"
            alt="${item.name}"
            loading="lazy"
            draggable="false"
            oncontextmenu="return false"
          >

          <span class="shop-preview-protection-layer"></span>

        </div>

        <strong>${item.name}</strong>

      </article>
    `).join('');

    modal.classList.add('open');

    document.body.style.overflow = 'hidden';
  }

  function closeColorModal() {

    const modal = document.getElementById('colorPreviewModal');

    if (!modal) return;

    modal.classList.remove('open');

    document.body.style.overflow = '';
  }

  function createImageLightbox() {

    if (document.getElementById('imageLightbox')) return;

    const lightbox = document.createElement('div');

    lightbox.id = 'imageLightbox';
    lightbox.className = 'image-lightbox';

    lightbox.innerHTML = `
      <button class="close-lightbox" type="button">
        ×
      </button>

      <div class="shop-lightbox-image-wrap">

        <img
          id="lightboxImage"
          src=""
          alt="Großansicht"
          draggable="false"
          oncontextmenu="return false"
        >

        <span class="shop-lightbox-watermark">
          Daniels Laser Art
        </span>

        <span class="shop-lightbox-protection-layer"></span>

      </div>
    `;

    document.body.appendChild(lightbox);
  }

  function openImageLightbox(img) {

    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');

    if (!lightbox || !lightboxImage) return;

    lightboxImage.src = img.src;
    lightbox.style.display = 'flex';
    lightbox.classList.add('open');
  }

  function closeImageLightbox() {

    const lightbox = document.getElementById('imageLightbox');

    if (!lightbox) return;

    lightbox.style.display = 'none';
    lightbox.classList.remove('open');
  }

  function renderProducts() {

    if (!grid) return;

    const active =
      document.querySelector('[data-filter].active')?.dataset.filter ||
      'Alle';

    const query =
      (searchInput?.value || '').trim().toLowerCase();

    const visible = products.filter((product) => {

      const searchable = [
        product.name,
        product.category,
        product.description
      ].join(' ').toLowerCase();

      return (
        (active === 'Alle' || product.category === active) &&
        searchable.includes(query)
      );
    });

    grid.innerHTML = visible.map(product => `

      <article class="card product-card">

        <div class="product-image-wrap">

          <img
            src="${product.image}"
            alt="${product.name}"
            loading="lazy"
            draggable="false"
            oncontextmenu="return false"
          >

          <span class="shop-preview-protection-layer"></span>

          <span class="product-badge">
            ${product.badge}
          </span>

        </div>

        <div class="card-body product-body">

          <p class="product-category">
            ${product.category}
          </p>

          <h3>${product.name}</h3>

          <p>${product.description}</p>

          <div class="product-options">
            ${product.options.map(option =>
              `<span>${option}</span>`
            ).join('')}
          </div>

          ${product.preview ? `
            <button
              class="btn btn-secondary color-preview-btn"
              type="button"
              data-preview='${encodeURIComponent(JSON.stringify(product.preview))}'
            >
              ${product.preview.button || 'Varianten ansehen'}
            </button>
          ` : ''}

          <div class="product-footer">

            <strong>
              ab ${currency(product.price)}
            </strong>

            <button
              class="btn btn-primary"
              type="button"
              data-add="${product.id}"
            >
              In den Warenkorb
            </button>

          </div>

        </div>

      </article>

    `).join('');
  }

  function renderCart() {

    const total = cart.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    if (cartCount) {
      cartCount.textContent = cart.reduce(
        (sum, item) => sum + item.qty,
        0
      );
    }

    if (cartTotal) {
      cartTotal.textContent = currency(total);
    }

    if (!cartList) return;

    cartList.innerHTML = cart.length
      ? cart.map(item => `
        <div class="cart-item">

          <div>
            <strong>${item.name}</strong>
            <small>
              ${item.qty} × ${currency(item.price)}
            </small>
          </div>

          <div class="cart-actions">

            <button data-dec="${item.id}">
              −
            </button>

            <button data-inc="${item.id}">
              +
            </button>

            <button data-remove="${item.id}">
              ×
            </button>

          </div>

        </div>
      `).join('')
      : '<p>Dein Warenkorb ist noch leer.</p>';

    save();
  }

  document.addEventListener('click', (event) => {

    const zoomImg =
      event.target.closest('.color-preview-card img');

    const closeZoomBtn =
      event.target.closest('.close-lightbox');

    const zoomModal =
      event.target.closest('#imageLightbox');

    const colorBtn =
      event.target.closest('[data-preview]');

    const closeColorBtn =
      event.target.closest('.color-preview-close');

    const colorModal =
      event.target.closest('#colorPreviewModal');

    const addId =
      event.target.closest('[data-add]')?.dataset.add;

    const incId =
      event.target.closest('[data-inc]')?.dataset.inc;

    const decId =
      event.target.closest('[data-dec]')?.dataset.dec;

    const removeId =
      event.target.closest('[data-remove]')?.dataset.remove;

    if (zoomImg) {
      openImageLightbox(zoomImg);
      return;
    }

    if (
      closeZoomBtn ||
      (zoomModal && event.target.id === 'imageLightbox')
    ) {
      closeImageLightbox();
      return;
    }

    if (colorBtn) {

      const preview = JSON.parse(
        decodeURIComponent(colorBtn.dataset.preview || '{}')
      );

      openColorModal(preview);

      return;
    }

    if (
      closeColorBtn ||
      (colorModal && event.target.id === 'colorPreviewModal')
    ) {
      closeColorModal();
      return;
    }

    if (addId) {

      const product =
        products.find(p => p.id === addId);

      if (!product) return;

      const existing =
        cart.find(item => item.id === addId);

      if (existing) {
        existing.qty += 1;
      } else {
        cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          qty: 1
        });
      }

      renderCart();
    }

    if (incId) {

      const item = cart.find(i => i.id === incId);

      if (item) item.qty += 1;

      renderCart();
    }

    if (decId) {

      const item = cart.find(i => i.id === decId);

      if (item) item.qty -= 1;

      if (item?.qty <= 0) {
        cart.splice(cart.indexOf(item), 1);
      }

      renderCart();
    }

    if (removeId) {

      const idx =
        cart.findIndex(i => i.id === removeId);

      if (idx > -1) {
        cart.splice(idx, 1);
      }

      renderCart();
    }
  });

  document.addEventListener('contextmenu', (event) => {

    if (
      event.target.closest('img') ||
      event.target.closest('.shop-lightbox-image-wrap')
    ) {
      event.preventDefault();
    }
  });

  document.addEventListener('dragstart', (event) => {

    if (event.target.tagName === 'IMG') {
      event.preventDefault();
    }
  });

  document.addEventListener('keydown', (event) => {

    if (event.key === 'Escape') {
      closeImageLightbox();
      closeColorModal();
    }
  });

  filterButtons.forEach(button => {

    button.addEventListener('click', () => {

      filterButtons.forEach(b =>
        b.classList.remove('active')
      );

      button.classList.add('active');

      renderProducts();
    });
  });

  searchInput?.addEventListener('input', renderProducts);

  orderForm?.addEventListener('submit', (event) => {

    event.preventDefault();

    if (!cart.length) {

      alert('Bitte lege zuerst ein Produkt in den Warenkorb.');

      return;
    }

    const data = new FormData(orderForm);

    const orderText = cart.map(item =>
      `- ${item.qty}x ${item.name}`
    ).join('\n');

    const message = encodeURIComponent(`
Hallo Daniel 👋

${orderText}

Name: ${data.get('name') || ''}
Kontakt: ${data.get('contact') || ''}

Wunsch:
${data.get('details') || ''}
    `);

    window.location.href =
      `https://wa.me/4915147906749?text=${message}`;
  });

  createImageLightbox();

  renderProducts();
  renderCart();

});