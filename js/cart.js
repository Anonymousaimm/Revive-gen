// Revive Gen — shopping cart
(function () {
  const STORAGE_KEY = 'reviveGenCart';

  const PRODUCTS = {
    aurum: { id: 'aurum', name: 'Aurum', price: 165, number: 'No. 01', type: 'Amber · Citrus', url: 'product-aurum.html' },
    'ember-bloom': { id: 'ember-bloom', name: 'Ember Bloom', price: 178, number: 'No. 02', type: 'Floral · Woody', url: 'product-ember-bloom.html' },
    'velvet-oud': { id: 'velvet-oud', name: 'Velvet Oud', price: 210, number: 'No. 03', type: 'Oud · Musk', url: 'product-velvet-oud.html' }
  };

  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(cart) ? cart : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function money(value) {
    return '$' + Number(value).toFixed(0);
  }

  function updateCartCount() {
    const count = getCart().reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count;
      el.classList.toggle('has-items', count > 0);
    });
  }

  function addToCart(id, qty) {
    const product = PRODUCTS[id];
    if (!product) return;

    const cart = getCart();
    const existing = cart.find(item => item.id === id);

    if (existing) {
      existing.qty += qty;
    } else {
      cart.push({ id: product.id, qty });
    }

    saveCart(cart);
    showToast(product.name + ' added to cart');
  }

  function changeQty(id, delta) {
    const cart = getCart();
    const item = cart.find(x => x.id === id);
    if (!item) return;

    item.qty += delta;
    const cleaned = cart.filter(x => x.qty > 0);
    saveCart(cleaned);
    renderCart();
  }

  function removeItem(id) {
    saveCart(getCart().filter(x => x.id !== id));
    renderCart();
  }

  function showToast(message) {
    let toast = document.getElementById('cartToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cartToast';
      toast.className = 'cart-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window.__reviveToastTimer);
    window.__reviveToastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function renderCart() {
    const container = document.getElementById('cartItems');
    const empty = document.getElementById('cartEmpty');
    const content = document.getElementById('cartContent');
    if (!container || !empty || !content) return;

    const cart = getCart();

    if (!cart.length) {
      empty.hidden = false;
      content.hidden = true;
      return;
    }

    empty.hidden = true;
    content.hidden = false;

    let subtotal = 0;

    container.innerHTML = cart.map(item => {
      const p = PRODUCTS[item.id];
      if (!p) return '';
      const lineTotal = p.price * item.qty;
      subtotal += lineTotal;

      return `
        <article class="cart-item">
          <div class="cart-item-mark" aria-hidden="true">
            <span>${p.number}</span>
            <svg viewBox="0 0 60 100">
              <path d="M20 16 h20 l4 8 v64 a4 4 0 0 1 -4 4 h-20 a4 4 0 0 1 -4 -4 v-64 z" fill="none" stroke="#c6a15b" stroke-width="1"/>
              <rect x="24" y="4" width="12" height="10" fill="none" stroke="#c6a15b" stroke-width="1"/>
            </svg>
          </div>
          <div class="cart-item-info">
            <a href="${p.url}"><h3>${p.name}</h3></a>
            <span>${p.type}</span>
            <strong>${money(p.price)}</strong>
          </div>
          <div class="cart-item-actions">
            <div class="qty-control" aria-label="Quantity">
              <button type="button" data-action="decrease" data-id="${p.id}" aria-label="Decrease quantity">−</button>
              <span>${item.qty}</span>
              <button type="button" data-action="increase" data-id="${p.id}" aria-label="Increase quantity">+</button>
            </div>
            <button type="button" class="remove-item" data-action="remove" data-id="${p.id}">Remove</button>
            <strong class="line-total">${money(lineTotal)}</strong>
          </div>
        </article>
      `;
    }).join('');

    const subtotalEl = document.getElementById('cartSubtotal');
    const totalEl = document.getElementById('cartTotal');
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    if (totalEl) totalEl.textContent = money(subtotal);
  }

  document.addEventListener('click', function (e) {
    const addButton = e.target.closest('[data-add-to-cart]');
    if (addButton) {
      e.preventDefault();
      e.stopPropagation();
      const qty = Math.max(1, Number(addButton.dataset.quantity || 1));
      addToCart(addButton.dataset.addToCart, qty);
      return;
    }

    const actionButton = e.target.closest('[data-action]');
    if (!actionButton) return;

    const id = actionButton.dataset.id;
    const action = actionButton.dataset.action;

    if (action === 'increase') changeQty(id, 1);
    if (action === 'decrease') changeQty(id, -1);
    if (action === 'remove') removeItem(id);
  });

  window.ReviveGenCart = {
    add: addToCart,
    get: getCart,
    products: PRODUCTS
  };

  document.addEventListener('DOMContentLoaded', function () {
    updateCartCount();
    renderCart();
  });
})();
