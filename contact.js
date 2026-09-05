'use strict';
/* ============================================
   Contact Us modal — shared across index.html, cart.html, thankyou.html
   Sends messages to the backend's /api/contact endpoint, which stores
   them in Firestore so they show up in your admin dashboard.
   ============================================ */
const ContactUs = (() => {
  let overlay, closeBtn, form, nameInput, emailInput, messageInput,
      errorEl, submitBtn, submitLabel;

  function cacheEls(){
    overlay = document.getElementById('contactOverlay');
    closeBtn = document.getElementById('contactClose');
    form = document.getElementById('contactForm');
    nameInput = document.getElementById('contactName');
    emailInput = document.getElementById('contactEmail');
    messageInput = document.getElementById('contactMessage');
    errorEl = document.getElementById('contactError');
    submitBtn = document.getElementById('contactSubmit');
    submitLabel = submitBtn ? submitBtn.querySelector('.contact-submit-label') : null;
  }

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
    if(submitLabel) submitLabel.textContent = isLoading ? 'Sending…' : 'Send Message';
  }

  function open(){
    if(!overlay) return;
    hideError();
    setLoading(false);
    if(form) form.reset();
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

  async function handleSubmit(e){
    e.preventDefault();
    hideError();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const message = messageInput.value.trim();

    if(!name){ return showError('Please enter your name.'); }
    if(!/^\S+@\S+\.\S+$/.test(email)){ return showError('Please enter a valid email address.'); }
    if(!message){ return showError('Please enter a message.'); }

    setLoading(true);
    try{
      const base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
      const response = await fetch(`${base}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      });
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || 'Could not send your message. Please try again.');

      close();
      if(typeof showToast === 'function'){
        showToast('MESSAGE SENT', 'success');
      }
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
  }

  document.addEventListener('DOMContentLoaded', init);

  return { open, close };
})();

window.ContactUs = ContactUs;