'use strict';
/* ============================================
   thankyou.js
   Runs on thankyou.html after Cashfree redirects back with ?order_id=...
   Polls the backend's /api/orders/status/:orderId (server-side verified —
   never trusts the URL or frontend for payment truth) and reveals the
   ebook viewer link ONLY when the backend confirms status === "paid".
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

  /* ----- Confetti celebration (runs for ~3 seconds) ----- */
  function runConfettiCelebration() {
    const overlay = document.getElementById('celebrateOverlay');
    const canvas = document.getElementById('celebrateCanvas');
    if (!overlay || !canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#149FE3', '#2439B8', '#FFC93C', '#FF7A45', '#22C55E'];
    const particles = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      size: 6 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: 2 + Math.random() * 3,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    }));

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');

    let animId;
    let running = true;

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height + 20) p.y = -20;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      animId = requestAnimationFrame(draw);
    }
    draw();

    // Runs for ~3 seconds, then fades out and stops
    setTimeout(() => {
      overlay.classList.add('fade-out');
      setTimeout(() => {
        running = false;
        cancelAnimationFrame(animId);
        overlay.classList.remove('show', 'fade-out');
        overlay.setAttribute('aria-hidden', 'true');
      }, 300);
    }, 3000);
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
    runConfettiCelebration();
    if (typeof showToast === 'function') {
      showToast('ORDER COMPLETED', 'success');
    }
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
        if (typeof showToast === 'function') showToast('PAYMENT FAILED', 'error');
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

    const contactBtn = document.getElementById('tyContactBtn');
    if (contactBtn) {
      contactBtn.addEventListener('click', () => {
        if (window.ContactUs) window.ContactUs.open();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();