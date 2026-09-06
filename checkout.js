'use strict';
/* ============================================
   Checkout modal — Buy Now flow
   Frontend never decides the price; the backend (Railway) recomputes
   ₹99 × quantity (and any coupon discount) server-side and creates the
   Cashfree order.

   FIX APPLIED: backend's /api/orders/create expects firstName and
   lastName as separate fields. This form only has a single "Full Name"
   input, so we split it here before sending: first word -> firstName,
   the rest -> lastName. If there's no space (single word name),
   the same word is used for both so the backend's "lastName required"
   check still passes.
   ============================================ */
const Checkout = (() => {
  const DISPLAY_PRICE = 99; // display-only; backend is the source of truth

  let overlay, modal, closeBtn, form, nameInput, emailInput, phoneInput,
      errorEl, totalEl, qtyLabelEl, submitBtn, submitLabel,
      couponToggle, couponRow, couponInput, couponApplyBtn, couponMessage;
  let currentQty = 1;
  let appliedCoupon = null; // { code, discountAmount } | null
  let cashfreeSdkPromise = null;

  function cacheEls(){
    overlay = document.getElementById('checkoutOverlay');
    modal = overlay ? overlay.querySelector('.checkout-modal') : null;
    closeBtn = document.getElementById('checkoutClose');
    form = document.getElementById('checkoutForm');
    nameInput = document.getElementById('checkoutName');
    emailInput = document.getElementById('checkoutEmail');
    phoneInput = document.getElementById('checkoutPhone');
    errorEl = document.getElementById('checkoutError');
    totalEl = document.getElementById('checkoutTotal');
    qtyLabelEl = document.getElementById('checkoutQtyLabel');
    submitBtn = document.getElementById('checkoutSubmit');
    submitLabel = submitBtn ? submitBtn.querySelector('.checkout-submit-label') : null;
    couponToggle = document.getElementById('couponToggle');
    couponRow = document.getElementById('couponRow');
    couponInput = document.getElementById('couponInput');
    couponApplyBtn = document.getElementById('couponApplyBtn');
    couponMessage = document.getElementById('couponMessage');
  }

  function formatRupees(n){ return '₹' + n.toLocaleString('en-IN'); }

  function showError(msg){
    if(!errorEl) return;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }
  function hideError(){
    if(!errorEl) return;
    errorEl.hidden = true;
    errorEl.textContent = '';
  }

  function setLoading(isLoading){
    if(!submitBtn) return;
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
    if(submitLabel) submitLabel.textContent = isLoading ? 'Processing…' : 'BUY NOW';
  }

  // Splits "John Smith" -> { firstName: "John", lastName: "Smith" }
  // Splits "Cher" -> { firstName: "Cher", lastName: "Cher" } (backend requires both)
  function splitName(fullName){
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  function apiBase(){
    return (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
  }

  function baseAmount(){ return DISPLAY_PRICE * currentQty; }

  function updateTotalDisplay(){
    if(!totalEl) return;
    const base = baseAmount();
    if(appliedCoupon){
      const final = Math.max(0, base - appliedCoupon.discountAmount);
      totalEl.innerHTML = `<span class="coupon-strike">${formatRupees(base)}</span> ${formatRupees(final)}`;
    } else {
      totalEl.textContent = formatRupees(base);
    }
  }

  function resetCouponUI(){
    appliedCoupon = null;
    if(couponInput) couponInput.value = '';
    if(couponRow) couponRow.hidden = true;
    if(couponMessage){ couponMessage.hidden = true; couponMessage.className = 'coupon-message'; couponMessage.textContent = ''; }
    if(couponApplyBtn){ couponApplyBtn.disabled = false; couponApplyBtn.textContent = 'Apply'; }
  }

  async function handleApplyCoupon(){
    const code = couponInput.value.trim();
    if(!code){ return; }
    couponApplyBtn.disabled = true;
    couponApplyBtn.textContent = 'Checking…';
    try{
      const response = await fetch(`${apiBase()}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, amount: baseAmount() })
      });
      const data = await response.json();
      if(data.valid){
        appliedCoupon = { code: data.code, discountAmount: data.discountAmount };
        couponMessage.hidden = false;
        couponMessage.className = 'coupon-message coupon-message--success';
        couponMessage.textContent = `Coupon applied — you saved ${formatRupees(data.discountAmount)}!`;
        updateTotalDisplay();
      } else {
        appliedCoupon = null;
        couponMessage.hidden = false;
        couponMessage.className = 'coupon-message coupon-message--error';
        couponMessage.textContent = data.error || 'Invalid coupon code.';
        updateTotalDisplay();
      }
    }catch(err){
      appliedCoupon = null;
      couponMessage.hidden = false;
      couponMessage.className = 'coupon-message coupon-message--error';
      couponMessage.textContent = 'Could not check that coupon right now.';
      updateTotalDisplay();
    }finally{
      couponApplyBtn.disabled = false;
      couponApplyBtn.textContent = 'Apply';
    }
  }

  function open(qty){
    if(!overlay) return;
    currentQty = Math.max(1, parseInt(qty, 10) || 1);
    qtyLabelEl.textContent = `${currentQty} ${currentQty > 1 ? 'copies' : 'copy'}`;
    resetCouponUI();
    updateTotalDisplay();
    hideError();
    setLoading(false);
    form.reset();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => nameInput && nameInput.focus(), 250);

    // Funnel tracking: a checkout was started.
    if (window.trackEvent) window.trackEvent('checkout_start');
  }

  function close(){
    if(!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function loadCashfreeSdk(){
    if(window.Cashfree) return Promise.resolve(window.Cashfree);
    if(cashfreeSdkPromise) return cashfreeSdkPromise;
    cashfreeSdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve(window.Cashfree);
      script.onerror = () => reject(new Error('Could not load the payment SDK. Please check your connection and try again.'));
      document.head.appendChild(script);
    });
    return cashfreeSdkPromise;
  }

  async function startCashfreeCheckout(paymentSessionId, mode){
    const CashfreeSDK = await loadCashfreeSdk();
    const cashfree = CashfreeSDK({ mode: mode === 'production' ? 'production' : 'sandbox' });
    cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_self'
    });
  }

  async function handleSubmit(e){
    e.preventDefault();
    hideError();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneDigits = phoneInput.value.replace(/\D/g, '');

    if(!fullName){ return showError('Please enter your full name.'); }
    if(!/^\S+@\S+\.\S+$/.test(email)){ return showError('Please enter a valid email address.'); }
    if(phoneDigits.length !== 10){ return showError('Please enter a valid 10-digit phone number.'); }

    const { firstName, lastName } = splitName(fullName);

    setLoading(true);
    try{
      const response = await fetch(`${apiBase()}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName, lastName, email, phone: phoneDigits, quantity: currentQty,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined
        })
      });
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || 'Could not start checkout. Please try again.');

      await startCashfreeCheckout(data.paymentSessionId, data.mode);
      // On success, Cashfree's SDK navigates the browser to the return_url —
      // no further action needed here.
    }catch(err){
      setLoading(false);
      const msg = err.message || 'Something went wrong. Please try again.';
      showError(msg);
      if (window.showToast) showToast(msg, 'error');
    }
  }

  function init(){
    cacheEls();
    if(!overlay) return;
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });
    document.addEventListener('keydown', (e) => {
      if(e.key === 'Escape' && overlay.classList.contains('open')) close();
    });
    form.addEventListener('submit', handleSubmit);
    phoneInput.addEventListener('input', () => {
      phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    });
    if(couponToggle){
      couponToggle.addEventListener('click', () => {
        couponRow.hidden = !couponRow.hidden;
        if(!couponRow.hidden) couponInput.focus();
      });
    }
    if(couponApplyBtn) couponApplyBtn.addEventListener('click', handleApplyCoupon);
    if(couponInput){
      couponInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter'){ e.preventDefault(); handleApplyCoupon(); }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open, close };
})();

// Top-level `const` does NOT attach to `window` automatically in classic
// scripts — cart.js checks `window.Checkout` before calling .open(), so
// without this line, Buy Now on cart.html silently does nothing (no error,
// the check just always evaluates false).
window.Checkout = Checkout;