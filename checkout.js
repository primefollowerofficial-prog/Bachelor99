'use strict';
/* ============================================
   Checkout modal — Buy Now flow
   Frontend never decides the price; the backend (Railway) recomputes
   ₹99 × quantity server-side and creates the Cashfree order.
   ============================================ */
const Checkout = (() => {
  const DISPLAY_PRICE = 99; // display-only; backend is the source of truth

  let overlay, modal, closeBtn, form, nameInput, emailInput, phoneInput,
      errorEl, totalEl, qtyLabelEl, submitBtn, submitLabel;
  let currentQty = 1;
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

  function open(qty){
    if(!overlay) return;
    currentQty = Math.max(1, parseInt(qty, 10) || 1);
    qtyLabelEl.textContent = `${currentQty} ${currentQty > 1 ? 'copies' : 'copy'}`;
    totalEl.textContent = formatRupees(DISPLAY_PRICE * currentQty);
    hideError();
    setLoading(false);
    form.reset();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => nameInput && nameInput.focus(), 250);
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

    const customerName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneDigits = phoneInput.value.replace(/\D/g, '');

    if(!customerName){ return showError('Please enter your full name.'); }
    if(!/^\S+@\S+\.\S+$/.test(email)){ return showError('Please enter a valid email address.'); }
    if(phoneDigits.length !== 10){ return showError('Please enter a valid 10-digit phone number.'); }

    setLoading(true);
    try{
      const base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
      const response = await fetch(`${base}/api/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, email, phone: phoneDigits, quantity: currentQty })
      });
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || 'Could not start checkout. Please try again.');

      await startCashfreeCheckout(data.paymentSessionId, data.mode);
      // On success, Cashfree's SDK navigates the browser to the return_url —
      // no further action needed here.
    }catch(err){
      setLoading(false);
      showError(err.message || 'Something went wrong. Please try again.');
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
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open, close };
})();