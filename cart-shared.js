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
   Shared toast notifications — used on every page.
   type: 'success' (green), 'error' (red), 'info' (navy, default look)
   ============================================ */
let toastTimer = null;
function showToast(message, type = 'success'){
  const toast = document.getElementById('toast');
  if(!toast) return;
  toast.textContent = message;
  toast.classList.remove('toast-success', 'toast-error', 'toast-info');
  toast.classList.add(`toast-${type}`);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}