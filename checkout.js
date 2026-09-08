'use strict';
/* ============================================
   Checkout modal — Buy Now flow
   Frontend never decides the price; the backend (Railway) recomputes
   ₹99 × quantity (and any coupon discount) server-side and creates the
   Cashfree order.

   Email verification (Brevo OTP) added: user must verify their email
   before Buy Now will submit. Verification state resets if the user
   edits the email after verifying.
   ============================================ */
const Checkout = (() => {
  const DISPLAY_PRICE = 99; // display-only; backend is the source of truth

  let overlay, modal, closeBtn, form, nameInput, emailInput, phoneInput,
      errorEl, totalEl, qtyLabelEl, submitBtn, submitLabel,
      couponToggle, couponRow, couponInput, couponApplyBtn, couponMessage,
      emailVerifyBtn, otpRow, otpInput, otpVerifyBtn, emailVerifyMessage;
  let currentQty = 1;
  let appliedCoupon = null; // { code, discountAmount } | null
  let cashfreeSdkPromise = null;

  // Email verification state
  let emailVerified = false;
  let verifiedEmail = null;

  // ---------------- Draft persistence ----------------
  // Saves whatever the user has typed so an accidental close (backdrop
  // click, Escape, browser back) doesn't wipe out a filled form. Cleared
  // once an order is successfully created (payment is about to start).
  const DRAFT_KEY = 'b99_checkout_draft';

  function saveDraft(){
    try{
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        name: nameInput ? nameInput.value : '',
        email: emailInput ? emailInput.value : '',
        phone: phoneInput ? phoneInput.value : '',
        emailVerified,
        verifiedEmail
      }));
    }catch(err){ /* localStorage unavailable — silently skip */ }
  }

  function loadDraft(){
    try{
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    }catch(err){
      return null;
    }
  }

  function clearDraft(){
    try{ localStorage.removeItem(DRAFT_KEY); }catch(err){ /* ignore */ }
  }

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

    emailVerifyBtn = document.getElementById('emailVerifyBtn');
    otpRow = document.getElementById('otpRow');
    otpInput = document.getElementById('otpInput');
    otpVerifyBtn = document.getElementById('otpVerifyBtn');
    emailVerifyMessage = document.getElementById('emailVerifyMessage');
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

  function apiBase(){
    return (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
  }

  function isValidEmail(email){
    return /^\S+@\S+\.\S+$/.test(email);
  }

  /* ---------------- Email OTP verification ---------------- */

  function showVerifyMessage(msg, type){
    if(!emailVerifyMessage) return;
    emailVerifyMessage.textContent = msg;
    emailVerifyMessage.hidden = false;
    emailVerifyMessage.className = `email-verify-message email-verify-message--${type}`;
  }
  function hideVerifyMessage(){
    if(!emailVerifyMessage) return;
    emailVerifyMessage.hidden = true;
    emailVerifyMessage.textContent = '';
  }

  function resetEmailVerification(){
    emailVerified = false;
    verifiedEmail = null;
    if(otpRow) otpRow.hidden = true;
    if(otpInput) otpInput.value = '';
    hideVerifyMessage();
    if(emailVerifyBtn){
      emailVerifyBtn.disabled = false;
      emailVerifyBtn.textContent = 'Verify';
    }
  }

  async function handleEmailVerifyClick(){
    const email = emailInput.value.trim();
    if(!isValidEmail(email)){
      showVerifyMessage('Please enter a valid email address first.', 'error');
      return;
    }
    emailVerifyBtn.disabled = true;
    emailVerifyBtn.textContent = 'Sending…';
    hideVerifyMessage();
    try{
      const response = await fetch(`${apiBase()}/api/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || 'Could not send verification code.');

      otpRow.hidden = false;
      otpInput.focus();
      showVerifyMessage('OTP sent to your email.', 'success');
    }catch(err){
      showVerifyMessage(err.message || 'Could not send verification code.', 'error');
    }finally{
      emailVerifyBtn.disabled = false;
      emailVerifyBtn.textContent = 'Verify';
    }
  }

  async function handleOtpVerifyClick(){
    const email = emailInput.value.trim();
    const otp = otpInput.value.trim();
    if(!otp){
      showVerifyMessage('Please enter the OTP.', 'error');
      return;
    }
    otpVerifyBtn.disabled = true;
    otpVerifyBtn.textContent = 'Verifying…';
    try{
      const response = await fetch(`${apiBase()}/api/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await response.json();
      if(!response.ok || !data.verified) throw new Error(data.error || 'Incorrect code.');

      emailVerified = true;
      verifiedEmail = email;
      otpRow.hidden = true;
      showVerifyMessage('Verified successfully', 'success');
      emailVerifyBtn.textContent = 'Verified';
      emailVerifyBtn.disabled = true;
      saveDraft();
    }catch(err){
      showVerifyMessage(err.message || 'Incorrect code. Please try again.', 'error');
    }finally{
      otpVerifyBtn.disabled = false;
      otpVerifyBtn.textContent = 'Verify OTP';
    }
  }

  /* ---------------- Coupons ---------------- */

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

  /* ---------------- Modal open/close ---------------- */

  function open(qty){
    if(!overlay) return;
    currentQty = Math.max(1, parseInt(qty, 10) || 1);
    qtyLabelEl.textContent = `${currentQty} ${currentQty > 1 ? 'copies' : 'copy'}`;
    resetCouponUI();
    resetEmailVerification();
    updateTotalDisplay();
    hideError();
    setLoading(false);
    form.reset();

    // Restore anything the user had typed before an accidental close.
    const draft = loadDraft();
    if(draft){
      if(nameInput && draft.name) nameInput.value = draft.name;
      if(emailInput && draft.email) emailInput.value = draft.email;
      if(phoneInput && draft.phone) phoneInput.value = draft.phone;
      // Only restore the "verified" badge if it's still the same email —
      // the backend independently re-checks this at order time regardless.
      if(draft.emailVerified && draft.verifiedEmail && draft.verifiedEmail === draft.email){
        emailVerified = true;
        verifiedEmail = draft.verifiedEmail;
        if(otpRow) otpRow.hidden = true;
        if(emailVerifyBtn){
          emailVerifyBtn.textContent = 'Verified';
          emailVerifyBtn.disabled = true;
        }
        showVerifyMessage('Verified successfully', 'success');
      }
    }

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

  // Splits "John Smith" -> { firstName: "John", lastName: "Smith" }
  function splitName(fullName){
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return { firstName: '', lastName: '' };
    if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  async function handleSubmit(e){
    e.preventDefault();
    hideError();

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phoneDigits = phoneInput.value.replace(/\D/g, '');

    if(!fullName){ return showError('Please enter your full name.'); }
    if(!isValidEmail(email)){ return showError('Please enter a valid email address.'); }
    if(phoneDigits.length !== 10){ return showError('Please enter a valid 10-digit phone number.'); }

    // Block submission until the current email has been OTP-verified.
    if(!emailVerified || verifiedEmail !== email){
      return showError('Please verify your email first.');
    }

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

      // Order created successfully — the user is heading to Cashfree next,
      // so there's no more need to keep a local draft around.
      clearDraft();

      await startCashfreeCheckout(data.paymentSessionId, data.mode);
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
      saveDraft();
    });

    // If the user edits the email after verifying, require re-verification.
    emailInput.addEventListener('input', () => {
      if(emailVerified && emailInput.value.trim() !== verifiedEmail){
        resetEmailVerification();
      }
      saveDraft();
    });

    nameInput.addEventListener('input', saveDraft);

    if(emailVerifyBtn) emailVerifyBtn.addEventListener('click', handleEmailVerifyClick);
    if(otpVerifyBtn) otpVerifyBtn.addEventListener('click', handleOtpVerifyClick);
    if(otpInput){
      otpInput.addEventListener('keydown', (e) => {
        if(e.key === 'Enter'){ e.preventDefault(); handleOtpVerifyClick(); }
      });
    }

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

window.Checkout = Checkout;