'use strict';
/* ============================================
   cart.js
   Runs only on cart.html. Renders the filled/empty state,
   handles quantity +/-, remove, and opens the Buy Now checkout modal
   (the same modal markup/checkout.js now included on this page).
   ============================================ */

const PRICE_PER_UNIT = 99; // display-only; backend recalculates the real price

function formatRupees(n) {
  return '₹' + n.toLocaleString('en-IN');
}

function renderCart() {
  const qty = CartStore.getQty();
  const filledEl = document.getElementById('cartFilled');
  const emptyEl = document.getElementById('cartEmpty');

  if (qty <= 0) {
    if (filledEl) filledEl.hidden = true;
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (filledEl) filledEl.hidden = false;
  if (emptyEl) emptyEl.hidden = true;

  const qtyValueEl = document.getElementById('cartQtyValue');
  const subtotalEl = document.getElementById('cartSubtotal');
  const totalEl = document.getElementById('cartTotal');

  if (qtyValueEl) qtyValueEl.textContent = String(qty);
  const total = PRICE_PER_UNIT * qty;
  if (subtotalEl) subtotalEl.textContent = formatRupees(total);
  if (totalEl) totalEl.textContent = formatRupees(total);
}

function init() {
  renderCart();

  const minusBtn = document.getElementById('cartQtyMinus');
  const plusBtn = document.getElementById('cartQtyPlus');
  const removeBtn = document.getElementById('cartRemove');
  const buyNowBtn = document.getElementById('cartBuyNowBtn');

  if (minusBtn) {
    minusBtn.addEventListener('click', () => {
      const current = CartStore.getQty();
      if (current > 1) {
        CartStore.setQty(current - 1);
        renderCart();
      }
    });
  }

  if (plusBtn) {
    plusBtn.addEventListener('click', () => {
      const current = CartStore.getQty();
      CartStore.setQty(current + 1);
      renderCart();
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      CartStore.clear();
      renderCart();
      if (window.showToast) showToast('Removed from cart', 'info');
    });
  }

  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', () => {
      const qty = CartStore.getQty();
      if (qty <= 0) return;
      // The checkout modal markup + checkout.js are now included on
      // cart.html itself, so this always opens directly here.
      if (window.Checkout) {
        window.Checkout.open(qty);
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', init);