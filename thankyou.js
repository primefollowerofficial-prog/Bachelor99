'use strict';
/* ============================================
   thankyou.js
   Runs on thankyou.html after Cashfree redirects back with ?order_id=...
   Polls the backend's /api/orders/status/:orderId (server-side verified —
   never trusts the URL or frontend for payment truth) and reveals the
   ebook viewer link ONLY when the backend confirms status === "paid".

   This is the security boundary discussed earlier: Cashfree never sends
   the user straight to the ebook viewer. The ebook viewer URL only ever
   reaches the browser after this page gets a "paid" confirmation from
   the backend, straight from Firestore/Cashfree — not from anything the
   user could fake in the address bar.
   ============================================ */

(function () {
  const POLL_INTERVAL_MS = 3000;
  const MAX_POLL_ATTEMPTS = 20; // ~1 minute of polling before we call it "pending"

  let pollCount = 0;
  let pollTimer = null;

  function getOrderIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('order_id');
  }

  function showState(stateId) {
    ['thankyouLoading', 'thankyouSuccess', 'thankyouFailed', 'thankyouPending'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = (id !== stateId);
    });
  }

  function renderSuccess(order) {
    const nameEl = document.getElementById('tyCustomerName');
    const orderIdEl = document.getElementById('tyOrderId');
    const downloadBtn = document.getElementById('tyDownloadBtn');

    if (nameEl) nameEl.textContent = order.customerName || '';
    if (orderIdEl) orderIdEl.textContent = order.orderId || '';
    if (downloadBtn && order.downloadUrl) {
      downloadBtn.href = order.downloadUrl;
      downloadBtn.target = '_blank';
      downloadBtn.rel = 'noopener noreferrer';
    }

    // Cart is fulfilled — clear it so the badge doesn't keep showing
    // a pending purchase after a successful payment.
    if (window.CartStore) CartStore.clear();

    showState('thankyouSuccess');
  }

  async function checkStatus(orderId) {
    const base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
    const response = await fetch(`${base}/api/orders/status/${encodeURIComponent(orderId)}`);
    if (!response.ok) {
      throw new Error('order_lookup_failed');
    }
    return response.json();
  }

  async function poll(orderId) {
    pollCount++;
    try {
      const order = await checkStatus(orderId);

      if (order.status === 'paid') {
        renderSuccess(order);
        return; // stop polling
      }

      if (order.status === 'failed') {
        showState('thankyouFailed');
        return; // stop polling
      }

      // still pending
      if (pollCount >= MAX_POLL_ATTEMPTS) {
        showState('thankyouPending');
        return; // stop auto-polling; user can hit "Check Again"
      }

      showState('thankyouLoading');
      pollTimer = setTimeout(() => poll(orderId), POLL_INTERVAL_MS);
    } catch (err) {
      console.error('[thankyou] status check failed:', err);
      if (pollCount >= MAX_POLL_ATTEMPTS) {
        showState('thankyouPending');
      } else {
        pollTimer = setTimeout(() => poll(orderId), POLL_INTERVAL_MS);
      }
    }
  }

  function init() {
    const orderId = getOrderIdFromUrl();

    if (!orderId) {
      showState('thankyouFailed');
      return;
    }

    showState('thankyouLoading');
    poll(orderId);

    const refreshBtn = document.getElementById('tyRefreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        if (pollTimer) clearTimeout(pollTimer);
        pollCount = 0;
        showState('thankyouLoading');
        poll(orderId);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();