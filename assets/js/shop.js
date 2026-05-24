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

  let currentPreviewImages = [];
  let currentPreviewIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;

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
    const previewItems = preview.items || [];

    modal.classList.remove('has-many-items');
    modalGrid.classList.remove('many-items');

    if (previewItems.length > 2) {
      modal.classList.add('has-many-items');
      modalGrid.classList.add('many-items');
    }

    document.getElementById('colorPreviewBadge').textContent =
      preview.badge || '';

    document.getElementById('colorPreviewTitle').textContent =
      preview.title || '';

    document.getElementById('colorPreviewText').textContent =
      preview.text || '';

    modalGrid.innerHTML = previewItems.map((item) => `
      <article class="color-preview-card">

        <div class="color-preview-image-wrap">

          <img
            src="${item.image}"
            alt="${item.name}"
            data-title="${item.name || ''}"
            data-caption="${item.description || ''}"
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

      <button
        class="close-lightbox"
        type="button"
        style="
          position:fixed;
          top:18px;
          right:14px;
          width:56px;
          height:56px;
          border:none;
          border-radius:50%;
          background:rgba(0,0,0,0.78);
          color:#fff;
          font-size:2.2rem;
          z-index:999999999;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        "
      >
        ×
      </button>

      <button
        class="shop-lightbox-prev"
        type="button"
        aria-label="Vorheriges Bild"
        style="
          position:fixed;
          left:6px;
          top:50%;
          transform:translateY(-50%);
          width:58px;
          height:58px;
          border:none;
          border-radius:50%;
          background:rgba(0,0,0,0.78);
          color:#fff;
          font-size:3rem;
          font-weight:700;
          line-height:1;
          z-index:999999999;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        "
      >
        ‹
      </button>

      <button
        class="shop-lightbox-next"
        type="button"
        aria-label="Nächstes Bild"
        style="
          position:fixed;
          right:6px;
          top:50%;
          transform:translateY(-50%);
          width:58px;
          height:58px;
          border:none;
          border-radius:50%;
          background:rgba(0,0,0,0.78);
          color:#fff;
          font-size:3rem;
          font-weight:700;
          line-height:1;
          z-index:999999999;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
        "
      >
        ›
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

  function updateLightboxImage() {

    const img = currentPreviewImages[currentPreviewIndex];
    const lightbox = document.getElementById('imageLightbox');
    const lightboxImage = document.getElementById('lightboxImage');

    if (!img || !lightbox || !lightboxImage) return;

    const title = img.getAttribute('data-title') || img.alt || '';
    const caption = img.getAttribute('data-caption') || '';

    lightboxImage.src = img.src;
    lightboxImage.alt = title || 'Großansicht';

    let infoBox = document.getElementById('shopLightboxInfo');

    if (!infoBox) {
      infoBox = document.createElement('div');
      infoBox.id = 'shopLightboxInfo';
      lightbox.appendChild(infoBox);
    }

    infoBox.innerHTML = `
      <h3 style="margin:0 0 5px;color:#fff4ea;font-size:1.05rem;line-height:1.2;">
        ${title}
      </h3>
      <p style="margin:0;color:rgba(255,255,255,0.82);font-size:0.9rem;line-height:1.45;">
        ${caption}
      </p>
    `;

    infoBox.setAttribute(
      'style',
      `
        position:fixed !important;
        left:50% !important;
        bottom:72px !important;
        transform:translateX(-50%) !important;
        width:min(720px,88vw) !important;
        padding:14px 18px !important;
        border-radius:20px !important;
        background:rgba(12,6,14,0.94) !important;
        border:1px solid rgba(255,190,120,0.28) !important;
        text-align:center !important;
        z-index:999999 !important;
        box-shadow:0 14px 38px rgba(0,0,0,0.45) !important;
        color:white !important;
        pointer-events:none !important;
        display:${title || caption ? 'block' : 'none'} !important;
      `
    );
  }

  function openImageLightbox(img) {

    const lightbox = document.getElementById('imageLightbox');

    if (!lightbox || !img) return;

    const cards = Array.from(document.querySelectorAll('.color-preview-card'));

    currentPreviewImages = cards
      .map(card => card.querySelector('img'))
      .filter(Boolean);

    const currentCard = img.closest('.color-preview-card');
    const foundIndex = currentCard ? cards.indexOf(currentCard) : 0;

    currentPreviewIndex = foundIndex >= 0 ? foundIndex : 0;

    updateLightboxImage();

    lightbox.style.display = 'flex';
    lightbox.classList.add('open');

    const prevBtn = document.querySelector('.shop-lightbox-prev');
    const nextBtn = document.querySelector('.shop-lightbox-next');

    if (prevBtn && nextBtn) {

      prevBtn.style.display = 'flex';
      nextBtn.style.display = 'flex';

      prevBtn.style.visibility = 'visible';
      nextBtn.style.visibility = 'visible';

      prevBtn.style.opacity = '1';
      nextBtn.style.opacity = '1';
    }
  }

  function showNextImage() {

    if (!currentPreviewImages.length) return;

    currentPreviewIndex =
      (currentPreviewIndex + 1) % currentPreviewImages.length;

    updateLightboxImage();
  }

  function showPrevImage() {

    if (!currentPreviewImages.length) return;

    currentPreviewIndex =
      (currentPreviewIndex - 1 + currentPreviewImages.length) %
      currentPreviewImages.length;

    updateLightboxImage();
  }

  function closeImageLightbox() {

    const lightbox = document.getElementById('imageLightbox');
    const infoBox = document.getElementById('shopLightboxInfo');

    if (!lightbox) return;

    lightbox.style.display = 'none';
    lightbox.classList.remove('open');

    if (infoBox) {
      infoBox.style.display = 'none';
    }
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

          <div class="product-size-hover product-size-hover-image">

            <button
              class="product-size-info-btn"
              type="button"
              aria-label="Größe anzeigen"
            >
              i
            </button>

            <div class="product-size-tooltip">
             
              <p>${product.sizeInfo || 'Größe bitte in products.js bei sizeInfo eintragen.'}</p>
            </div>

          </div>

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

            <div class="price-size-row">

              <strong>
                ab ${currency(product.price)}
              </strong>

              <div class="product-size-hover product-size-hover-price">

                <button
                  class="product-size-info-btn"
                  type="button"
                  aria-label="Größe anzeigen"
                >
                  i
                </button>

                <div class="product-size-tooltip">
                  
                  <p>${product.sizeInfo || 'Größe bitte in products.js bei sizeInfo eintragen.'}</p>
                </div>

              </div>

            </div>

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

    const sizeBtn = event.target.closest('.product-size-info-btn');

    document.querySelectorAll('.product-size-hover.is-open').forEach((box) => {
      if (!sizeBtn || box !== sizeBtn.closest('.product-size-hover')) {
        box.classList.remove('is-open');
      }
    });

    if (sizeBtn) {
      event.preventDefault();
      event.stopPropagation();

      const box = sizeBtn.closest('.product-size-hover');
      if (box) {
        box.classList.toggle('is-open');
      }

      return;
    }

    const closeZoomBtn =
      event.target.closest('.close-lightbox');

    const nextZoomBtn =
      event.target.closest('.shop-lightbox-next');

    const prevZoomBtn =
      event.target.closest('.shop-lightbox-prev');

    const clickedLightboxBackground =
      event.target.id === 'imageLightbox';

    if (nextZoomBtn) {
      showNextImage();
      return;
    }

    if (prevZoomBtn) {
      showPrevImage();
      return;
    }

    if (closeZoomBtn || clickedLightboxBackground) {
      closeImageLightbox();
      return;
    }

    const colorBtn =
      event.target.closest('[data-preview]');

    if (colorBtn) {
      const preview = JSON.parse(
        decodeURIComponent(colorBtn.dataset.preview || '{}')
      );

      openColorModal(preview);
      return;
    }

    const closeColorBtn =
      event.target.closest('.color-preview-close');

    const colorModal =
      event.target.closest('#colorPreviewModal');

    if (
      closeColorBtn ||
      (colorModal && event.target.id === 'colorPreviewModal')
    ) {
      closeColorModal();
      return;
    }

    const previewCard =
      event.target.closest('.color-preview-card');

    if (previewCard) {
      const zoomImg = previewCard.querySelector('img');

      if (zoomImg) {
        openImageLightbox(zoomImg);
        return;
      }
    }

    const addId =
      event.target.closest('[data-add]')?.dataset.add;

    const incId =
      event.target.closest('[data-inc]')?.dataset.inc;

    const decId =
      event.target.closest('[data-dec]')?.dataset.dec;

    const removeId =
      event.target.closest('[data-remove]')?.dataset.remove;

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

    const lightbox = document.getElementById('imageLightbox');
    const isLightboxOpen =
      lightbox && lightbox.classList.contains('open');

    if (event.key === 'Escape') {
      closeImageLightbox();
      closeColorModal();

      document.querySelectorAll('.product-size-hover.is-open').forEach((box) => {
        box.classList.remove('is-open');
      });
    }

    if (isLightboxOpen && event.key === 'ArrowRight') {
      showNextImage();
    }

    if (isLightboxOpen && event.key === 'ArrowLeft') {
      showPrevImage();
    }
  });

  document.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0].screenX;
  });

  document.addEventListener('touchend', (event) => {
    touchEndX = event.changedTouches[0].screenX;

    const lightbox = document.getElementById('imageLightbox');

    if (!lightbox || !lightbox.classList.contains('open')) return;

    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        showNextImage();
      } else {
        showPrevImage();
      }
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