(function () {
  const SUPABASE_URL = "https://krqbvyqqjngmvkwoqckw.supabase.co";
  const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycWJ2eXFxam5nbXZrd29xY2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzAyNjcsImV4cCI6MjEwMjY0NjI2N30.2Ye5AldCBw3cvC5Q-FQHkJc1hNof7Lga4gQDWTZWPhw";
  const CART_KEY = 'reviveGenCart';

  const form = document.getElementById('checkoutForm');
  const layout = document.getElementById('checkoutLayout');
  const message = document.getElementById('checkoutMessage');
  const itemsEl = document.getElementById('checkoutItems');
  const subtotalEl = document.getElementById('checkoutSubtotal');
  const totalEl = document.getElementById('checkoutTotal');
  const button = document.getElementById('placeOrderBtn');

  function cart() {
    try {
      const x = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(x) ? x : [];
    } catch (_) { return []; }
  }

  function money(n) { return '$' + Number(n).toFixed(0); }

  function esc(v) {
    return String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function msg(text, type) {
    message.hidden = false;
    message.className = 'checkout-message ' + type;
    message.textContent = text;
  }

  function render() {
    const c = cart();
    if (!c.length) {
      layout.hidden = true;
      msg('Your cart is empty. Please choose a product before checking out.', 'error');
      return false;
    }

    let subtotal = 0;
    itemsEl.innerHTML = c.map(item => {
      const p = window.ReviveGenCart.products[item.id];
      if (!p) return '';
      const line = p.price * item.qty;
      subtotal += line;
      return `<div class="checkout-item">
        <div><strong>${esc(p.name)}</strong><span>${item.qty} × ${money(p.price)}</span></div>
        <strong>${money(line)}</strong>
      </div>`;
    }).join('');

    subtotalEl.textContent = money(subtotal);
    totalEl.textContent = money(subtotal);
    return true;
  }

  async function submitOrder(data) {
    const items = cart().map(x => ({product_id: x.id, quantity: x.qty}));

    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/place_order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY
      },
      body: JSON.stringify({
        p_customer_name: data.customer_name,
        p_phone: data.phone,
        p_email: data.email || null,
        p_address: data.address,
        p_city: data.city,
        p_notes: data.notes || null,
        p_items: items
      })
    });

    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.message || body.error_description || 'Order submission failed.');
    return body;
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    message.hidden = true;
    if (!render()) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    button.disabled = true;
    button.textContent = 'Placing Order…';

    try {
      const data = Object.fromEntries(new FormData(form).entries());
      const result = await submitOrder(data);

      localStorage.removeItem(CART_KEY);
      layout.hidden = true;
      msg('Order ' + result.order_number + ' placed successfully! Total: ' + money(result.total) + '.', 'success');

      const box = document.createElement('div');
      box.className = 'order-confirmation';
      box.innerHTML =
        '<div class="eyebrow">Order Confirmed</div>' +
        '<h2>Thank you, ' + esc(data.customer_name) + '.</h2>' +
        '<p>Your Revive Gen order has been received.</p>' +
        '<div class="confirmation-number">' + esc(result.order_number) + '</div>' +
        '<p class="confirmation-total">Order total: <strong>' + money(result.total) + '</strong></p>' +
        '<a href="collection.html" class="btn">Continue Shopping</a>';
      message.insertAdjacentElement('afterend', box);

      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = '0';
        el.classList.remove('has-items');
      });
    } catch (err) {
      console.error(err);
      msg('We could not place the order. Please check your connection and try again.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Place Order';
    }
  });

  document.addEventListener('DOMContentLoaded', render);
})();
