'use strict';
/* ============================================
   cart-shared.js
   Shared cart logic used on EVERY page (index.html, cart.html, thankyou.html).
   There is only ever one product (the ebook), so the "cart" is really just
   a quantity stored in localStorage, plus helpers to keep the header cart
   badge in sync everywhere.

   NOTE: named CartStore (not CartShared) because the existing script.js
   already calls CartStore.add(qty) and CartStore.getQty() on the homepage —
   this file has to match that exactly or Add to Cart / Buy Now on
   index.html silently breaks.
   ============================================ */
const CartStore = (() => {
  const STORAGE_KEY = 'b99_cart_qty';

  function getQty() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const qty = parseInt(raw, 10);
    return Number.isFinite(qty) && qty > 0 ? qty : 0;
  }

  function setQty(qty) {
    const clean = Math.max(0, parseInt(qty, 10) || 0);
    if (clean === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(clean));
    }
    updateBadge();
    return clean;
  }

  function add(qty = 1) {
    const current = getQty();
    const next = current > 0 ? current + Math.max(1, qty) : Math.max(1, qty);
    return setQty(next);
  }

  function clear() {
    setQty(0);
  }

  function updateBadge() {
    const badge = document.getElementById('cartBadge');
    if (!badge) return;
    const qty = getQty();
    if (qty > 0) {
      badge.textContent = String(qty);
      badge.hidden = false;
    } else {
      badge.hidden = true;
    }
  }

  document.addEventListener('DOMContentLoaded', updateBadge);

  return { getQty, setQty, add, clear };
})();

/* ============================================
   Global Toast
   Small bottom toast used on EVERY page for quick feedback
   ("Added to cart", "Review added", "Order completed", errors, etc).
   Creates the #toast element itself if a page doesn't already have one,
   so this works on any page that includes this file.
   type: 'success' (green, default) | 'error' (red) | 'info' (navy)
   ============================================ */
let toastTimer = null;
function showToast(message, type) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.remove('toast--success', 'toast--error', 'toast--info');
  toast.classList.add(`toast--${type || 'success'}`);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}
window.showToast = showToast;

/* ============================================
   Global Contact Widget
   A small rounded floating "Contact Us" button + modal form, available on
   every page. Submits straight to the backend's /api/contact endpoint,
   which saves the message into the "contactMessages" Firestore collection
   (visible from the admin dashboard).
   ============================================ */
const ContactWidget = (() => {
  let overlay, modal, closeBtn, form, nameInput, emailInput, messageInput, errorEl, submitBtn, submitLabel;

  function buildMarkup() {
    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'contact-fab';
    fab.id = 'contactFabGlobal';
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v12H7l-3 3V4z"/></svg>
      <span>Contact Us</span>
    `;
    document.body.appendChild(fab);

    const overlayEl = document.createElement('div');
    overlayEl.className = 'contact-overlay';
    overlayEl.id = 'contactOverlay';
    overlayEl.setAttribute('aria-hidden', 'true');
    overlayEl.innerHTML = `
      <div class="contact-modal" role="dialog" aria-modal="true" aria-label="Contact us">
        <button type="button" class="contact-close" id="contactCloseGlobal" aria-label="Close">✕</button>
        <h3 class="contact-title">Facing an issue?</h3>
        <p class="contact-subtitle">Send us a message and we'll get back to you on email.</p>
        <form id="contactFormGlobal" class="contact-form" novalidate>
          <label class="contact-field">
            <span>Full Name</span>
            <input type="text" id="contactNameGlobal" name="name" required placeholder="e.g. Rahul Sharma">
          </label>
          <label class="contact-field">
            <span>Email Address</span>
            <input type="email" id="contactEmailGlobal" name="email" required placeholder="you@example.com">
          </label>
          <label class="contact-field">
            <span>Message</span>
            <textarea id="contactMessageGlobal" name="message" rows="4" required placeholder="How can we help?"></textarea>
          </label>
          <p class="contact-error" id="contactErrorGlobal" hidden></p>
          <button type="submit" class="btn btn-primary btn-shine contact-submit" id="contactSubmitGlobal">
            <span class="contact-submit-label">SEND MESSAGE</span>
          </button>
        </form>
      </div>
    `;
    document.body.appendChild(overlayEl);

    fab.addEventListener('click', open);
    return overlayEl;
  }

  function cacheEls() {
    overlay = document.getElementById('contactOverlay');
    modal = overlay ? overlay.querySelector('.contact-modal') : null;
    closeBtn = document.getElementById('contactCloseGlobal');
    form = document.getElementById('contactFormGlobal');
    nameInput = document.getElementById('contactNameGlobal');
    emailInput = document.getElementById('contactEmailGlobal');
    messageInput = document.getElementById('contactMessageGlobal');
    errorEl = document.getElementById('contactErrorGlobal');
    submitBtn = document.getElementById('contactSubmitGlobal');
    submitLabel = submitBtn ? submitBtn.querySelector('.contact-submit-label') : null;
  }

  function showError(msg) {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function hideError() {
    if (!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }
  function setLoading(isLoading) {
    if (!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
    if (submitLabel) submitLabel.textContent = isLoading ? 'Sending…' : 'SEND MESSAGE';
  }

  function open() {
    if (!overlay) return;
    hideError();
    setLoading(false);
    form.reset();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => nameInput && nameInput.focus(), 250);
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    hideError();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if (!name) return showError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email)) return showError('Please enter a valid email address.');
    if (!message) return showError('Please enter a message.');

    setLoading(true);
    try {
      const base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
      const response = await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not send your message. Please try again.');

      close();
      showToast('Message sent! We\u2019ll get back to you soon.', 'success');
    } catch (err) {
      showError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function init() {
    buildMarkup();
    cacheEls();
    if (!overlay) return;
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    form.addEventListener('submit', handleSubmit);
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open, close };
})();
window.ContactWidget = ContactWidget;

/* ============================================
   Confetti burst
   Lightweight, dependency-free "you won something" celebration —
   used on thankyou.html when a payment is confirmed. Runs for ~3s then
   removes itself from the DOM.
   ============================================ */
function fireConfetti() {
  const colors = ['#149FE3', '#2439B8', '#FFC93C', '#FF7A45', '#22C55E'];
  const container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  const pieceCount = 90;
  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 2.4 + Math.random() * 1.1;
    const rotation = Math.random() * 360;
    const drift = (Math.random() - 0.5) * 160;
    const size = 6 + Math.random() * 6;
    const isCircle = Math.random() > 0.5;

    piece.style.left = `${left}vw`;
    piece.style.background = color;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * (isCircle ? 1 : 0.4)}px`;
    piece.style.borderRadius = isCircle ? '50%' : '2px';
    piece.style.animationDelay = `${delay}s`;
    piece.style.animationDuration = `${duration}s`;
    piece.style.setProperty('--rot', `${rotation}deg`);
    piece.style.setProperty('--drift', `${drift}px`);
    container.appendChild(piece);
  }

  setTimeout(() => container.remove(), 3200);
}
window.fireConfetti = fireConfetti;

/* ============================================
   Funnel event tracking
   Fire-and-forget calls to the backend's /api/track/event, used to build
   the admin conversion funnel (visit -> product_view -> buy_click ->
   checkout_start -> purchase, purchase tracked separately server-side).
   ============================================ */
function trackEvent(eventName, page) {
  try {
    const base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
    fetch(`${base}/api/track/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, page: page || document.body.dataset.page || 'unknown' }),
      keepalive: true
    }).catch(() => {});
  } catch (err) {
    // never let analytics break the page
  }
}
window.trackEvent = trackEvent;