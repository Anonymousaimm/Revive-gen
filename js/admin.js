// Revive Gen — Step 3 Admin Dashboard
(function () {
  const SUPABASE_URL = 'https://krqbvyqqjngmvkwoqckw.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtycWJ2eXFxam5nbXZrd29xY2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNzAyNjcsImV4cCI6MjEwMjY0NjI2N30.2Ye5AldCBw3cvC5Q-FQHkJc1hNof7Lga4gQDWTZWPhw';
  const SESSION_KEY = 'reviveGenAdminSession';

  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const notice = document.getElementById('adminNotice');
  const ordersBody = document.getElementById('ordersBody');
  const emptyOrders = document.getElementById('emptyOrders');
  const modalBackdrop = document.getElementById('orderModalBackdrop');
  const modalClose = document.getElementById('modalClose');

  let session = null;
  let orders = [];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }
  function money(v) { return '$' + Number(v || 0).toFixed(0); }
  function authHeaders() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + session.access_token,
      'Content-Type': 'application/json'
    };
  }
  function showNotice(text, error) {
    notice.hidden = false;
    notice.textContent = text;
    notice.className = 'admin-notice' + (error ? ' error' : '');
  }
  function clearNotice() { notice.hidden = true; }

  async function signIn(email, password) {
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {'apikey': SUPABASE_KEY, 'Content-Type': 'application/json'},
      body: JSON.stringify({email, password})
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error_description || data.msg || 'Sign in failed.');
    session = data;
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  }

  async function api(path, options = {}) {
    const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, {
      ...options,
      headers: {...authHeaders(), ...(options.headers || {})}
    });
    if (r.status === 401) {
      signOut();
      throw new Error('Your session has expired. Please sign in again.');
    }
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error(body?.message || body?.hint || 'Request failed.');
    return body;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    clearNotice();
    loadOrders();
  }

  function showLogin() {
    dashboardView.hidden = true;
    loginView.hidden = false;
  }

  function signOut() {
    session = null;
    localStorage.removeItem(SESSION_KEY);
    showLogin();
  }

  async function loadOrders() {
    try {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Loading…';

      // RLS ensures only the admin user can receive these rows.
      orders = await api('orders?select=*&order=created_at.desc');
      renderOrders();
      clearNotice();
    } catch (err) {
      showNotice(err.message, true);
    } finally {
      refreshBtn.disabled = false;
      refreshBtn.textContent = 'Refresh';
    }
  }

  function renderOrders() {
    const total = orders.length;
    const pending = orders.filter(o => String(o.status || '').toLowerCase() === 'pending').length;
    const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    document.getElementById('statOrders').textContent = total;
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statRevenue').textContent = money(revenue);

    emptyOrders.hidden = total !== 0;
    ordersBody.innerHTML = orders.map((o, i) => `
      <tr>
        <td><span class="order-number">${esc(o.order_number || '#' + o.id)}</span></td>
        <td class="order-customer"><strong>${esc(o.customer_name)}</strong><span>${esc(o.phone)}</span></td>
        <td>${esc(o.city)}</td>
        <td>${money(o.total)}</td>
        <td>
          <select class="status-select" data-index="${i}">
            ${['pending','confirmed','shipped','delivered','cancelled'].map(s =>
              `<option value="${s}" ${String(o.status).toLowerCase() === s ? 'selected' : ''}>${s[0].toUpperCase()+s.slice(1)}</option>`
            ).join('')}
          </select>
        </td>
        <td><button class="view-order" data-index="${i}">View</button></td>
      </tr>
    `).join('');

    ordersBody.querySelectorAll('.status-select').forEach(el => {
      el.addEventListener('change', () => updateStatus(orders[Number(el.dataset.index)], el.value, el));
    });
    ordersBody.querySelectorAll('.view-order').forEach(el => {
      el.addEventListener('click', () => openOrder(orders[Number(el.dataset.index)]));
    });
  }

  async function updateStatus(order, status, select) {
    select.disabled = true;
    try {
      await api('orders?id=eq.' + encodeURIComponent(order.id), {
        method: 'PATCH',
        headers: {'Prefer': 'return=minimal'},
        body: JSON.stringify({status})
      });
      order.status = status;
      renderOrders();
      showNotice('Order ' + (order.order_number || order.id) + ' updated to ' + status + '.', false);
      setTimeout(clearNotice, 2200);
    } catch (err) {
      select.value = order.status;
      showNotice(err.message, true);
    } finally {
      select.disabled = false;
    }
  }

  async function openOrder(order) {
    document.getElementById('modalOrderNumber').textContent = order.order_number || ('Order #' + order.id);
    document.getElementById('modalContent').innerHTML = '<p style="color:var(--muted);font-size:12px">Loading order details…</p>';
    modalBackdrop.hidden = false;

    try {
      const items = await api('order_items?order_id=eq.' + encodeURIComponent(order.id) + '&select=*&order=id.asc');

      const details = [
        ['Customer', order.customer_name],
        ['Phone', order.phone],
        ['Email', order.email || '—'],
        ['City', order.city],
        ['Address', order.address],
        ['Notes', order.notes || '—'],
        ['Status', order.status || 'pending'],
        ['Date', order.created_at ? new Date(order.created_at).toLocaleString() : '—']
      ];

      document.getElementById('modalContent').innerHTML = `
        <div class="detail-grid">
          ${details.map(([label, value]) => `<div class="detail-box"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`).join('')}
        </div>
        <div class="admin-kicker">Products</div>
        <div class="detail-items">
          ${items.length ? items.map(item => `
            <div class="detail-item">
              <span>${esc(item.product_name)} × ${esc(item.quantity)}</span>
              <strong>${money(item.line_total)}</strong>
            </div>
          `).join('') : '<div class="empty-orders">No line items found.</div>'}
        </div>
        <div class="modal-total"><span>Total</span><strong>${money(order.total)}</strong></div>
      `;
    } catch (err) {
      document.getElementById('modalContent').innerHTML =
        '<div class="admin-notice error">' + esc(err.message) + '</div>';
    }
  }

  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    loginError.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing In…';

    try {
      await signIn(
        document.getElementById('adminEmail').value.trim(),
        document.getElementById('adminPassword').value
      );
      showDashboard();
    } catch (err) {
      loginError.hidden = false;
      loginError.textContent = err.message;
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In';
    }
  });

  logoutBtn.addEventListener('click', signOut);
  refreshBtn.addEventListener('click', loadOrders);
  modalClose.addEventListener('click', () => { modalBackdrop.hidden = true; });
  modalBackdrop.addEventListener('click', e => {
    if (e.target === modalBackdrop) modalBackdrop.hidden = true;
  });

  // Restore the session after a page refresh.
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (saved?.access_token) {
      session = saved;
      showDashboard();
    }
  } catch (_) {}
})();
