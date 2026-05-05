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

  const currency = (value) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const save = () => localStorage.setItem('dlaCart', JSON.stringify(cart));

  function renderProducts() {
    if (!grid) return;
    const active = document.querySelector('[data-filter].active')?.dataset.filter || 'Alle';
    const query = (searchInput?.value || '').trim().toLowerCase();
    const visible = products.filter(p => (active === 'Alle' || p.category === active) && [p.name, p.category, p.description].join(' ').toLowerCase().includes(query));
    grid.innerHTML = visible.map(product => `
      <article class="card product-card">
        <div class="product-image-wrap">
          <img src="${product.image}" alt="${product.name}" loading="lazy" onerror="this.parentElement.classList.add('missing-image')">
          <span class="product-badge">${product.badge}</span>
        </div>
        <div class="card-body product-body">
          <p class="product-category">${product.category}</p>
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="product-options">${product.options.map(option => `<span>${option}</span>`).join('')}</div>
          <div class="product-footer">
            <strong>ab ${currency(product.price)}</strong>
            <button class="btn btn-primary" type="button" data-add="${product.id}">In den Warenkorb</button>
          </div>
        </div>
      </article>
    `).join('') || '<div class="card"><div class="card-body">Keine Produkte gefunden.</div></div>';
  }

  function renderCart() {
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    if (cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartTotal) cartTotal.textContent = currency(total);
    if (!cartList) return;
    cartList.innerHTML = cart.length ? cart.map(item => `
      <div class="cart-item">
        <div>
          <strong>${item.name}</strong>
          <small>${item.qty} × ${currency(item.price)}</small>
        </div>
        <div class="cart-actions">
          <button type="button" data-dec="${item.id}" aria-label="Menge reduzieren">−</button>
          <button type="button" data-inc="${item.id}" aria-label="Menge erhöhen">+</button>
          <button type="button" data-remove="${item.id}" aria-label="Entfernen">×</button>
        </div>
      </div>
    `).join('') : '<p>Dein Warenkorb ist noch leer.</p>';
    save();
  }

  document.addEventListener('click', (event) => {
    const addId = event.target.closest('[data-add]')?.dataset.add;
    const incId = event.target.closest('[data-inc]')?.dataset.inc;
    const decId = event.target.closest('[data-dec]')?.dataset.dec;
    const removeId = event.target.closest('[data-remove]')?.dataset.remove;
    if (addId) {
      const product = products.find(p => p.id === addId);
      const existing = cart.find(item => item.id === addId);
      if (existing) existing.qty += 1;
      else cart.push({ id: product.id, name: product.name, price: product.price, qty: 1 });
      renderCart();
      document.getElementById('warenkorb')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (incId) { const item = cart.find(i => i.id === incId); if (item) item.qty += 1; renderCart(); }
    if (decId) { const item = cart.find(i => i.id === decId); if (item) item.qty -= 1; if (item?.qty <= 0) cart.splice(cart.indexOf(item), 1); renderCart(); }
    if (removeId) { const idx = cart.findIndex(i => i.id === removeId); if (idx > -1) cart.splice(idx, 1); renderCart(); }
  });

  filterButtons.forEach(button => button.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    renderProducts();
  }));
  searchInput?.addEventListener('input', renderProducts);

  orderForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!cart.length) { alert('Bitte lege zuerst ein Produkt in den Warenkorb.'); return; }
    const data = new FormData(orderForm);
    const orderText = cart.map(item => `- ${item.qty}x ${item.name} (${currency(item.price)} / Stück)`).join('\n');
    const message = encodeURIComponent(`Hallo Daniel 👋

ich möchte eine Shop-Anfrage senden:

${orderText}

Gesamt: ${cartTotal.textContent}

Name: ${data.get('name') || ''}
E-Mail/Telefon: ${data.get('contact') || ''}

Personalisierungswunsch:
${data.get('details') || ''}

Versand: ${data.get('delivery') || 'Versand gewünscht'}`);
    window.location.href = `https://wa.me/4915147906749?text=${message}`;
  });

  renderProducts();
  renderCart();
});
