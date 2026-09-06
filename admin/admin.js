'use strict';
/* ============================================
   admin.js — Bachelor99 Admin Dashboard
   Plain JS, no build step. Uses API_BASE_URL from config.js.
   ============================================ */
(function () {
  const SESSION_KEY = 'b99_admin_key';
  let adminKey = sessionStorage.getItem(SESSION_KEY) || null;
  let revenueChart = null;

  function base() {
    return (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
  }

  function formatRupees(n) {
    return '₹' + Math.round(n || 0).toLocaleString('en-IN');
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  /* ============================================
     Admin toast
     ============================================ */
  let toastTimer = null;
  function toast(message, type) {
    const el = document.getElementById('adminToast');
    if (!el) return;
    el.textContent = message;
    el.className = `admin-toast ${type || 'success'} show`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ============================================
     API helper — attaches x-admin-key, redirects to login on 401
     ============================================ */
  async function api(path, opts = {}) {
    const response = await fetch(`${base()}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey || '',
        ...(opts.headers || {})
      }
    });

    if (response.status === 401) {
      logout('Your session expired or the key is invalid. Please log in again.');
      throw new Error('Unauthorized');
    }

    let data = null;
    try { data = await response.json(); } catch { /* some endpoints return 204 */ }

    if (!response.ok) {
      throw new Error((data && data.error) || `Request failed (${response.status})`);
    }
    return data;
  }

  /* ============================================
     Auth
     ============================================ */
  function showLogin(errorMsg) {
    document.getElementById('adminApp').hidden = true;
    document.getElementById('loginScreen').hidden = false;
    const errEl = document.getElementById('loginError');
    if (errorMsg) {
      errEl.textContent = errorMsg;
      errEl.hidden = false;
    } else {
      errEl.hidden = true;
    }
  }

  function showApp() {
    document.getElementById('loginScreen').hidden = true;
    document.getElementById('adminApp').hidden = false;
    initAppOnce();
    loadDashboard('7d');
    loadFunnel('7d');
    loadMessages();
    loadCoupons();
  }

  function logout(message) {
    adminKey = null;
    sessionStorage.removeItem(SESSION_KEY);
    showLogin(message);
  }

  async function handleLogin(e) {
    e.preventDefault();
    const keyInput = document.getElementById('loginKey');
    const submitBtn = document.getElementById('loginSubmit');
    const key = keyInput.value.trim();
    if (!key) return;

    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Checking…';
    try {
      const response = await fetch(`${base()}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Incorrect admin key');

      adminKey = key;
      sessionStorage.setItem(SESSION_KEY, key);
      showApp();
    } catch (err) {
      document.getElementById('loginError').textContent = err.message || 'Could not log in. Check your connection.';
      document.getElementById('loginError').hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Unlock Dashboard';
    }
  }

  /* ============================================
     Tabs
     ============================================ */
  let appInitialized = false;
  function initAppOnce() {
    if (appInitialized) return;
    appInitialized = true;

    document.getElementById('adminTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-tab');
      if (!btn) return;
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${tab}`).classList.add('active');
      if (tab === 'orders') loadOrders();
    });

    document.getElementById('logoutBtn').addEventListener('click', () => logout());

    initRangeSelector('dashboardRange', (range) => loadDashboard(range));
    initRangeSelector('funnelRange', (range) => loadFunnel(range));

    document.getElementById('couponForm').addEventListener('submit', handleCreateCoupon);
    document.getElementById('couponsBody').addEventListener('click', handleCouponAction);

    document.getElementById('messagesList').addEventListener('click', handleMessageClick);

    initCalculator();
  }

  function initRangeSelector(containerId, onChange) {
    const container = document.getElementById(containerId);
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-range]');
      if (!btn) return;
      container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      container.dataset.current = btn.dataset.range;
      onChange(btn.dataset.range);
    });
  }

  /* ============================================
     Dashboard
     ============================================ */
  let lastRecentOrders = [];

  async function loadDashboard(range) {
    try {
      const data = await api(`/api/admin/dashboard?range=${range}`);
      const t = data.totals;

      document.getElementById('kpiRevenue').textContent = formatRupees(t.revenue);
      document.getElementById('kpiOrders').textContent = t.salesCount.toLocaleString('en-IN');
      document.getElementById('kpiCustomers').textContent = t.customers.toLocaleString('en-IN');
      document.getElementById('kpiEbooks').textContent = t.ebooksSold.toLocaleString('en-IN');
      document.getElementById('kpiConversion').textContent = `${t.conversionRate}%`;
      document.getElementById('kpiAOV').textContent = formatRupees(t.averageOrderValue);
      document.getElementById('kpiTodayRevenue').textContent = formatRupees(t.todayRevenue);

      renderChart(data.daily);

      lastRecentOrders = data.recentOrders || [];
      renderRecentOrdersTable(lastRecentOrders);
    } catch (err) {
      if (err.message !== 'Unauthorized') toast(err.message, 'error');
    }
  }

  function renderChart(daily) {
    const ctx = document.getElementById('revenueChart');
    if (!ctx || typeof Chart === 'undefined') return;

    const labels = daily.map(d => {
      const dt = new Date(d.date + 'T00:00:00');
      return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    });

    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue (₹)',
            data: daily.map(d => d.revenue),
            borderColor: '#00e5ff',
            backgroundColor: 'rgba(0,229,255,0.12)',
            tension: 0.35, fill: true, yAxisID: 'y', pointRadius: 3
          },
          {
            label: 'Orders',
            data: daily.map(d => d.salesCount),
            borderColor: '#ff2d95',
            backgroundColor: 'rgba(255,45,149,0.1)',
            tension: 0.35, fill: false, yAxisID: 'y1', pointRadius: 3
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { labels: { color: '#9aa7c2' } } },
        scales: {
          x: { ticks: { color: '#5c6884' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y: { position: 'left', ticks: { color: '#5c6884' }, grid: { color: 'rgba(255,255,255,0.04)' } },
          y1: { position: 'right', ticks: { color: '#5c6884' }, grid: { display: false } }
        }
      }
    });
  }

  function renderRecentOrdersTable(orders) {
    const body = document.getElementById('recentOrdersBody');
    if (!orders.length) {
      body.innerHTML = `<tr><td colspan="7" class="table-empty">No paid orders yet in this range.</td></tr>`;
      return;
    }
    body.innerHTML = orders.map(o => `
      <tr>
        <td>${o.orderId}</td>
        <td>${escapeHtml(o.customerName)}</td>
        <td>${escapeHtml(o.email)}</td>
        <td>${o.quantity}</td>
        <td>${formatRupees(o.amount)}</td>
        <td>${o.couponCode ? `<span class="coupon-code-cell">${o.couponCode}</span>` : '—'}</td>
        <td>${formatDate(o.paidAt)}</td>
      </tr>
    `).join('');
  }

  /* ============================================
     Orders tab (reuses dashboard's recent-orders data —
     the backend only exposes the most recent 20 paid orders)
     ============================================ */
  function loadOrders() {
    const body = document.getElementById('ordersBody');
    if (!lastRecentOrders.length) {
      body.innerHTML = `<tr><td colspan="9" class="table-empty">No paid orders yet.</td></tr>`;
      return;
    }
    body.innerHTML = lastRecentOrders.map(o => `
      <tr>
        <td>${o.orderId}</td>
        <td>${escapeHtml(o.customerName)}</td>
        <td>${escapeHtml(o.email)}</td>
        <td>Ebook</td>
        <td>${o.quantity}</td>
        <td>${formatRupees(o.amount)}</td>
        <td>${o.couponCode ? `<span class="coupon-code-cell">${o.couponCode}</span>` : '—'}</td>
        <td><span class="status-pill status-paid">Paid</span></td>
        <td>${formatDate(o.paidAt)}</td>
      </tr>
    `).join('');
  }

  /* ============================================
     Funnel
     ============================================ */
  async function loadFunnel(range) {
    try {
      const data = await api(`/api/admin/funnel?range=${range}`);
      const container = document.getElementById('funnelSteps');
      const maxValue = Math.max(1, ...data.steps.map(s => s.value));

      container.innerHTML = data.steps.map(s => `
        <div class="funnel-step">
          <span class="funnel-step-label">${s.label}</span>
          <div class="funnel-bar-track"><div class="funnel-bar-fill" style="width:${Math.max(2, (s.value / maxValue) * 100)}%"></div></div>
          <span class="funnel-step-value">${s.value.toLocaleString('en-IN')}</span>
        </div>
      `).join('');

      document.getElementById('funnelConversionRate').textContent = `${data.conversionRate}%`;
    } catch (err) {
      if (err.message !== 'Unauthorized') toast(err.message, 'error');
    }
  }

  /* ============================================
     Coupons
     ============================================ */
  async function loadCoupons() {
    try {
      const coupons = await api('/api/admin/coupons');
      renderCoupons(coupons);
    } catch (err) {
      if (err.message !== 'Unauthorized') toast(err.message, 'error');
    }
  }

  function renderCoupons(coupons) {
    const body = document.getElementById('couponsBody');
    if (!coupons.length) {
      body.innerHTML = `<tr><td colspan="7" class="table-empty">No coupons yet — create one above.</td></tr>`;
      return;
    }
    body.innerHTML = coupons.map(c => `
      <tr data-code="${c.code}">
        <td><span class="coupon-code-cell">${c.code}</span></td>
        <td>${c.discountType === 'percent' ? c.discountValue + '% off' : formatRupees(c.discountValue) + ' off'}</td>
        <td>${c.minOrder ? formatRupees(c.minOrder) : '—'}</td>
        <td>${c.usedCount} / ${c.usageLimit || '∞'}</td>
        <td>${c.expiry || '—'}</td>
        <td><span class="status-pill ${c.active ? 'status-active' : 'status-inactive'}">${c.active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button type="button" class="coupon-action-btn" data-action="toggle">${c.active ? 'Disable' : 'Enable'}</button>
          <button type="button" class="coupon-action-btn danger" data-action="delete">Delete</button>
        </td>
      </tr>
    `).join('');
  }

  async function handleCreateCoupon(e) {
    e.preventDefault();
    const errEl = document.getElementById('cpnError');
    errEl.hidden = true;
    const submitBtn = document.getElementById('cpnSubmit');

    const body = {
      code: document.getElementById('cpnCode').value.trim().toUpperCase(),
      discountType: document.getElementById('cpnType').value,
      discountValue: Number(document.getElementById('cpnValue').value),
      minOrder: Number(document.getElementById('cpnMinOrder').value) || 0,
      usageLimit: Number(document.getElementById('cpnUsageLimit').value) || 0,
      expiry: document.getElementById('cpnExpiry').value || null
    };

    if (body.discountType === 'percent' && body.discountValue > 99) {
      errEl.textContent = 'Percent discounts cannot exceed 99%.';
      errEl.hidden = false;
      return;
    }

    submitBtn.disabled = true;
    try {
      await api('/api/admin/coupons', { method: 'POST', body: JSON.stringify(body) });
      document.getElementById('couponForm').reset();
      toast('Coupon created!', 'success');
      loadCoupons();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function handleCouponAction(e) {
    const btn = e.target.closest('.coupon-action-btn');
    if (!btn) return;
    const row = btn.closest('tr');
    const code = row.dataset.code;
    const action = btn.dataset.action;

    try {
      if (action === 'toggle') {
        const isActive = row.querySelector('.status-pill').classList.contains('status-active');
        await api(`/api/admin/coupons/${code}`, { method: 'PATCH', body: JSON.stringify({ active: !isActive }) });
        toast(`Coupon ${isActive ? 'disabled' : 'enabled'}.`, 'success');
        loadCoupons();
      } else if (action === 'delete') {
        if (!confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
        await api(`/api/admin/coupons/${code}`, { method: 'DELETE' });
        toast('Coupon deleted.', 'success');
        loadCoupons();
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') toast(err.message, 'error');
    }
  }

  /* ============================================
     Messages
     ============================================ */
  async function loadMessages() {
    try {
      const messages = await api('/api/admin/messages');
      renderMessages(messages);
      const newCount = messages.filter(m => m.status === 'new').length;
      const badge = document.getElementById('messagesBadge');
      if (newCount > 0) {
        badge.textContent = newCount;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    } catch (err) {
      if (err.message !== 'Unauthorized') toast(err.message, 'error');
    }
  }

  function renderMessages(messages) {
    const list = document.getElementById('messagesList');
    if (!messages.length) {
      list.innerHTML = `<p class="table-empty">No messages yet.</p>`;
      return;
    }
    list.innerHTML = messages.map(m => `
      <div class="message-card status-${m.status}" data-id="${m.id}">
        <div class="message-card-head">
          <div>
            <span class="message-name">${escapeHtml(m.name)}</span>
            <span class="message-badge status-${m.status}">${m.status}</span>
            <div class="message-email">${escapeHtml(m.email)}</div>
          </div>
          <span class="message-date">${formatDate(m.createdAt)}</span>
        </div>
        <div class="message-body">
          <p>${escapeHtml(m.message)}</p>
          <div class="message-actions">
            ${m.status !== 'read' ? '<button type="button" class="coupon-action-btn" data-action="read">Mark Read</button>' : ''}
            ${m.status !== 'replied' ? '<button type="button" class="coupon-action-btn" data-action="replied">Mark Replied</button>' : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  function handleMessageClick(e) {
    const actionBtn = e.target.closest('[data-action]');
    const card = e.target.closest('.message-card');
    if (!card) return;

    if (actionBtn) {
      e.stopPropagation();
      const id = card.dataset.id;
      const status = actionBtn.dataset.action === 'read' ? 'read' : 'replied';
      // Optimistic UI update
      card.className = `message-card status-${status} expanded`;
      const badge = card.querySelector('.message-badge');
      badge.className = `message-badge status-${status}`;
      badge.textContent = status;
      api(`/api/admin/messages/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
        .then(() => { toast('Message updated.', 'success'); loadMessages(); })
        .catch(err => { if (err.message !== 'Unauthorized') toast(err.message, 'error'); });
      return;
    }
    card.classList.toggle('expanded');
  }

  /* ============================================
     Calculator
     ============================================ */
  function initCalculator() {
    const fab = document.getElementById('calcFab');
    const panel = document.getElementById('calcPanel');
    const closeBtn = document.getElementById('calcClose');
    const display = document.getElementById('calcDisplay');
    const keys = document.getElementById('calcKeys');
    let expression = '';

    function render() {
      display.textContent = expression || '0';
    }

    fab.addEventListener('click', () => {
      panel.classList.toggle('open');
      panel.setAttribute('aria-hidden', panel.classList.contains('open') ? 'false' : 'true');
    });
    closeBtn.addEventListener('click', () => {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
    });

    keys.addEventListener('click', (e) => {
      const btn = e.target.closest('.calc-key');
      if (!btn) return;
      const key = btn.dataset.key;

      if (key === 'C') { expression = ''; }
      else if (key === '⌫') { expression = expression.slice(0, -1); }
      else if (key === '=') {
        try {
          if (!/^[0-9+\-*/.%() ]*$/.test(expression)) throw new Error('bad');
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${expression.replace(/%/g, '/100')})`)();
          expression = Number.isFinite(result) ? String(Math.round(result * 100000) / 100000) : 'Error';
        } catch {
          expression = 'Error';
        }
      } else {
        expression = expression === 'Error' ? key : expression + key;
      }
      render();
    });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ============================================
     Boot
     ============================================ */
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    if (adminKey) {
      // Verify the stored key still works before showing the dashboard.
      fetch(`${base()}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: adminKey })
      }).then(r => r.ok ? showApp() : showLogin())
        .catch(() => showLogin('Could not reach the server. Check your connection.'));
    } else {
      showLogin();
    }
  });
})();