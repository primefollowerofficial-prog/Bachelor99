'use strict';

/* ============================================
   Data
   ============================================ */
const testimonialData = [
  { name: 'Amit V.', city: 'Mumbai', text: "I used to survive on instant noodles and chai. This book actually taught me how to make a real meal without burning the kitchen down." },
  { name: 'Priya S.', city: 'Bangalore', text: "The simple ingredient lists are a lifesaver. I don't have to buy a hundred spices I'll never use again. Fast, and actually tastes like food." },
  { name: 'Rohan M.', city: 'Pune', text: "Saved more money in my first week of using this than the book cost. No more ordering out because I'm 'too tired' to cook." },
  { name: 'Karan D.', city: 'Delhi', text: "Finally a cookbook that doesn't assume I own eight different pans. Everything here uses stuff I already had in my kitchen." },
  { name: 'Vivek T.', city: 'Hyderabad', text: "Went from ordering every night to cooking four times a week. The step-by-step photos make it impossible to mess up." },
  { name: 'Aditya R.', city: 'Chennai', text: "Bought this as a joke honestly. Ended up being the most useful ₹99 I've spent this year. My roommates are jealous of my food now." }
];

const reviewsData = [
  { title: 'MUST BUY', body: "I never thought I could make something that looks like the pictures but the step by step guide in this Bachelor 99 book is so simple. The paneer recipes are my favorite so far, really delicious and fast.", name: 'Siddharth Rao', city: 'Bangalore' },
  { title: 'Decent for the price', body: "Good variety of dishes for someone starting out. The cost estimation is mostly accurate for Delhi prices, though some ingredients are a bit more now. Still way cheaper than eating out every night.", name: 'Arjun Mehta', city: 'Delhi' },
  { title: 'Surprisingly useful', body: "Downloaded this expecting a basic PDF and got an actual organized cookbook. The equipment list before each recipe means I know exactly what I need before I start.", name: 'Farhan Ali', city: 'Hyderabad' },
  { title: 'Perfect for beginners', body: "I genuinely did not know how to cook rice properly before this. Every recipe explains the why, not just the steps, which helped me understand cooking instead of just following instructions blindly.", name: 'Neha Kulkarni', city: 'Pune' },
  { title: 'Actually saved me money', body: "Tracked my food spending for a month before and after. Cut my monthly food budget by almost a third once I stopped ordering in every other day.", name: 'Rahul Iyer', city: 'Chennai' },
  { title: 'Simple and practical', body: "No fancy plating nonsense, no ingredients I've never heard of. Just real meals a busy person can actually make on a weeknight.", name: 'Devansh Gupta', city: 'Mumbai' },
  { title: 'Better than expected', body: "Was skeptical for ₹99 but the recipes are genuinely well tested. Tried the soya chunks curry and it came out exactly like the photo, which never happens for me.", name: 'Aryan Kapoor', city: 'Ahmedabad' },
  { title: 'Great for lazy cooks', body: "Most recipes are under 30 minutes which is exactly what I needed after long shifts. The chicken curry recipe alone was worth the price.", name: 'Manish Verma', city: 'Kolkata' },
  { title: 'Worth downloading', body: "Clean layout, easy to read on my phone while cooking. Wish there were a few more vegetarian options but overall very happy with the purchase.", name: 'Sameer Joshi', city: 'Jaipur' }
];

const faqData = [
  { q: 'Are all the recipes really under ₹99?', a: "Most recipes are built to cost around ₹99 or less per meal using common Indian pantry ingredients. A handful of special recipes may cost slightly more, but the book flags those clearly." },
  { q: 'Is this cookbook suitable for complete beginners?', a: "Yes — it's written specifically for people who've never cooked before. Every recipe includes equipment needed, prep time, and step-by-step instructions." },
  { q: "What's included in the Bachelor 99 Survival Cookbook?", a: "99 easy Indian recipes, ingredient and equipment lists, approximate cost per meal, and step-by-step cooking instructions — all in one downloadable PDF." },
  { q: 'How will I receive my eBook after purchase?', a: "You'll get instant access to the PDF download right after checkout — no waiting, no shipping." }
];

/* Gallery images shared between homepage gallery and fullscreen viewer */
const galleryImages = [
  { src: 'images/Ebook1.png', alt: 'Bachelor 99 Survival Cookbook cover', duration: 3000 },
  { src: 'images/book1.png', alt: 'Recipe preview 1', duration: 5000 },
  { src: 'images/book2.png', alt: 'Recipe preview 2', duration: 5000 },
  { src: 'images/book3.png', alt: 'Recipe preview 3', duration: 5000 },
  { src: 'images/book4.png', alt: 'Recipe preview 4', duration: 5000 },
  { src: 'images/book5.png', alt: 'Recipe preview 5', duration: 5000 },
  { src: 'images/book6.png', alt: 'Recipe preview 6', duration: 5000 },
  { src: 'images/book7.png', alt: 'Recipe preview 7', duration: 5000 }
];

/* ============================================
   Navbar scroll effect
   ============================================ */
const navbar = document.getElementById('navbar');
function handleNavScroll(){
  if(window.scrollY > 20){ navbar.classList.add('scrolled'); }
  else{ navbar.classList.remove('scrolled'); }
}
window.addEventListener('scroll', handleNavScroll, { passive: true });
handleNavScroll();

/* Mobile menu */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
  const isOpen = mobileMenu.classList.toggle('open');
  hamburger.classList.toggle('open', isOpen);
  hamburger.setAttribute('aria-expanded', String(isOpen));
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
}));

/* ============================================
   Toast notifications
   ============================================ */
/* showToast() now lives in cart-shared.js so it also works on thankyou.html */

/* ============================================
   Scroll-triggered reveal animations
   ============================================ */
function initializeScrollAnimations(){
  const targets = document.querySelectorAll('[data-reveal]');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  targets.forEach(t => observer.observe(t));
}

/* ============================================
   Fullscreen viewer (used by both the main gallery
   and the "Straight From the Book" showcase grid)
   ============================================ */
const FullscreenViewer = (() => {
  const lightbox = document.getElementById('lightbox');
  const viewport = document.getElementById('lightboxViewport');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');

  let images = [];
  let currentIndex = 0;
  let scale = 1, panX = 0, panY = 0;
  let isDragging = false, dragStartX = 0, dragStartY = 0;
  let onCloseCallback = null;

  function applyTransform(){
    lightboxImg.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
  }
  function resetTransform(){
    scale = 1; panX = 0; panY = 0;
    applyTransform();
  }

  function render(){
    const img = images[currentIndex];
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt || '';
    resetTransform();
  }

  function open(imgList, index, onClose){
    images = imgList;
    currentIndex = index;
    onCloseCallback = onClose || null;
    render();
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if(typeof onCloseCallback === 'function') onCloseCallback();
  }
  function nav(delta){
    currentIndex = (currentIndex + delta + images.length) % images.length;
    render();
  }

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => nav(-1));
  nextBtn.addEventListener('click', () => nav(1));
  lightbox.addEventListener('click', (e) => { if(e.target === lightbox) close(); });

  document.addEventListener('keydown', (e) => {
    if(!lightbox.classList.contains('open')) return;
    if(e.key === 'Escape') close();
    if(e.key === 'ArrowLeft') nav(-1);
    if(e.key === 'ArrowRight') nav(1);
  });

  // Desktop: wheel zoom
  viewport.addEventListener('wheel', (e) => {
    if(!lightbox.classList.contains('open')) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    scale = Math.min(4, Math.max(1, scale + delta));
    if(scale === 1){ panX = 0; panY = 0; }
    applyTransform();
  }, { passive: false });

  // Desktop: click-drag pan when zoomed
  lightboxImg.addEventListener('mousedown', (e) => {
    if(scale <= 1) return;
    isDragging = true;
    dragStartX = e.clientX - panX;
    dragStartY = e.clientY - panY;
  });
  window.addEventListener('mousemove', (e) => {
    if(!isDragging) return;
    panX = e.clientX - dragStartX;
    panY = e.clientY - dragStartY;
    applyTransform();
  });
  window.addEventListener('mouseup', () => { isDragging = false; });

  // Mobile: pinch-to-zoom + double-tap
  let pinchStartDist = 0, pinchStartScale = 1;
  let lastTapTime = 0;

  function getDist(touches){
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  }

  viewport.addEventListener('touchstart', (e) => {
    if(e.touches.length === 2){
      pinchStartDist = getDist(e.touches);
      pinchStartScale = scale;
    } else if(e.touches.length === 1){
      const now = Date.now();
      if(now - lastTapTime < 300){
        scale = scale > 1 ? 1 : 2;
        panX = 0; panY = 0;
        applyTransform();
      }
      lastTapTime = now;
      dragStartX = e.touches[0].clientX - panX;
      dragStartY = e.touches[0].clientY - panY;
      isDragging = scale > 1;
    }
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if(e.touches.length === 2 && pinchStartDist){
      const dist = getDist(e.touches);
      scale = Math.min(4, Math.max(1, pinchStartScale * (dist / pinchStartDist)));
      if(scale === 1){ panX = 0; panY = 0; }
      applyTransform();
    } else if(e.touches.length === 1 && isDragging){
      panX = e.touches[0].clientX - dragStartX;
      panY = e.touches[0].clientY - dragStartY;
      applyTransform();
    }
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    isDragging = false;
    pinchStartDist = 0;
  });

  return { open, close, get isOpen(){ return lightbox.classList.contains('open'); } };
})();

/* ============================================
   Main product gallery — click zones + autoplay
   ============================================ */
function initializeGallery(){
  const mainImage = document.getElementById('mainImage');
  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  const prevBtn = document.getElementById('galPrev');
  const nextBtn = document.getElementById('galNext');
  const zoneLeft = document.getElementById('zoneLeft');
  const zoneCenter = document.getElementById('zoneCenter');
  const zoneRight = document.getElementById('zoneRight');

  let currentIndex = 0;
  let autoplayTimer = null;
  let autoplayPaused = false;

  function setImage(index, { userInitiated = false } = {}){
    currentIndex = (index + galleryImages.length) % galleryImages.length;
    const img = galleryImages[currentIndex];
    mainImage.style.opacity = 0;
    setTimeout(() => {
      mainImage.src = img.src;
      mainImage.alt = img.alt;
      mainImage.style.opacity = 1;
    }, 150);
    thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
    if(FullscreenViewer.isOpen){
      // keep fullscreen viewer in sync if it happens to be open on this gallery
    }
    if(userInitiated) restartAutoplay();
  }

  function scheduleNext(){
    clearTimeout(autoplayTimer);
    if(autoplayPaused || document.hidden) return;
    const duration = galleryImages[currentIndex].duration || 5000;
    autoplayTimer = setTimeout(() => {
      setImage(currentIndex + 1);
      scheduleNext();
    }, duration);
  }
  function restartAutoplay(){
    clearTimeout(autoplayTimer);
    scheduleNext();
  }
  function pauseAutoplay(){ autoplayPaused = true; clearTimeout(autoplayTimer); }
  function resumeAutoplay(){ autoplayPaused = false; scheduleNext(); }

  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => setImage(i, { userInitiated: true })));
  prevBtn.addEventListener('click', () => setImage(currentIndex - 1, { userInitiated: true }));
  nextBtn.addEventListener('click', () => setImage(currentIndex + 1, { userInitiated: true }));

  // Left/right/center click zones on the main image
  zoneLeft.addEventListener('click', () => setImage(currentIndex - 1, { userInitiated: true }));
  zoneRight.addEventListener('click', () => setImage(currentIndex + 1, { userInitiated: true }));
  zoneCenter.addEventListener('click', () => {
    pauseAutoplay();
    FullscreenViewer.open(galleryImages, currentIndex, () => {
      resumeAutoplay();
    });
  });
  // Keep the fullscreen viewer's index in sync when it navigates
  document.getElementById('lightboxNext').addEventListener('click', () => {});
  document.getElementById('lightboxPrev').addEventListener('click', () => {});

  // Pause autoplay when the tab is hidden, resume when visible
  document.addEventListener('visibilitychange', () => {
    if(document.hidden){ clearTimeout(autoplayTimer); }
    else if(!autoplayPaused){ scheduleNext(); }
  });

  scheduleNext();
}

/* ============================================
   Showcase grid — opens the fullscreen viewer
   ============================================ */
function initializeShowcase(){
  const items = Array.from(document.querySelectorAll('.showcase-item'));
  const images = items.map(item => ({
    src: item.dataset.src,
    alt: item.querySelector('img').alt
  }));
  items.forEach((item, i) => {
    item.addEventListener('click', () => FullscreenViewer.open(images, i));
  });
}

/* ============================================
   Search
   ============================================ */
function initializeSearch(){
  const searchBtn = document.getElementById('searchBtn');
  const panel = document.getElementById('searchPanel');
  const closeBtn = document.getElementById('searchClose');
  const input = document.getElementById('searchInput');
  const result = document.getElementById('searchResult');
  const chips = document.querySelectorAll('.search-chip');
  const viewProductBtn = document.getElementById('searchViewProduct');

  function open(){
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    setTimeout(() => input.focus(), 200);
  }
  function close(){
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    input.value = '';
    result.hidden = true;
  }
  function search(query){
    if(!query.trim()){
      result.hidden = true;
      return;
    }
    // Only one product exists — always surface it, regardless of query.
    result.hidden = false;
  }

  searchBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && panel.classList.contains('open')) close();
  });
  panel.addEventListener('click', (e) => { if(e.target === panel) close(); });

  input.addEventListener('input', () => search(input.value));

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      search(input.value);
      input.focus();
    });
  });

  viewProductBtn.addEventListener('click', () => {
    close();
    document.getElementById('product').scrollIntoView({ behavior: 'smooth' });
  });
}

/* ============================================
   Quantity selector + purchase buttons
   ============================================ */
function initializePurchase(){
  const qtyValue = document.getElementById('qtyValue');
  let qty = 1;
  document.getElementById('qtyMinus').addEventListener('click', () => {
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = qty;
  });
  document.getElementById('qtyPlus').addEventListener('click', () => {
    qty = Math.min(20, qty + 1);
    qtyValue.textContent = qty;
  });

  document.getElementById('addToCartBtn').addEventListener('click', () => {
    CartStore.add(qty);
    showToast(`ADDED TO CART (${qty} ${qty > 1 ? 'copies' : 'copy'})`, 'success');
  });
  document.getElementById('buyNowBtn').addEventListener('click', () => {
    if(CartStore.getQty() < 1) CartStore.add(qty);
    window.location.href = 'cart.html';
  });
  document.getElementById('mpbBuyBtn').addEventListener('click', () => {
    if(CartStore.getQty() < 1) CartStore.add(qty);
    window.location.href = 'cart.html';
  });
  document.getElementById('getCookbookBtn').addEventListener('click', () => {
    document.getElementById('product').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('contactBtn').addEventListener('click', () => {
    if(window.ContactUs) window.ContactUs.open();
  });
}

/* ============================================
   Accordions
   ============================================ */
function initializeAccordions(){
  const items = document.querySelectorAll('.accordion-item');
  items.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      items.forEach(i => { i.classList.remove('open'); i.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false'); });
      if(!isOpen){
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ============================================
   Countdown (persisted via localStorage)
   ============================================ */
function initializeCountdown(){
  const STORAGE_KEY = 'bachelor99_sale_end';
  const DURATION_MS = 24 * 60 * 60 * 1000;
  let endTime = parseInt(localStorage.getItem(STORAGE_KEY), 10);

  if(!endTime || isNaN(endTime)){
    endTime = Date.now() + DURATION_MS;
    localStorage.setItem(STORAGE_KEY, String(endTime));
  }

  const hoursEl = document.getElementById('cHours');
  const minsEl = document.getElementById('cMinutes');
  const secsEl = document.getElementById('cSeconds');
  const box = document.querySelector('.countdown-box');
  const label = document.querySelector('.countdown-label');

  function pad(n){ return String(n).padStart(2, '0'); }

  function update(){
    const remaining = Math.max(0, endTime - Date.now());
    if(remaining <= 0){
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      box.classList.add('expired');
      label.textContent = 'Offer expired';
      clearInterval(intervalId);
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    hoursEl.textContent = pad(h);
    minsEl.textContent = pad(m);
    secsEl.textContent = pad(s);
  }

  update();
  const intervalId = setInterval(update, 1000);
}

/* ============================================
   Testimonial carousel
   ============================================ */
function initializeTestimonials(){
  const track = document.getElementById('testimonialTrack');
  track.innerHTML = testimonialData.map(t => `
    <div class="t-card">
      <span class="stars" aria-hidden="true">★★★★★</span>
      <p>"${t.text}"</p>
      <p class="t-name">${t.name} — ${t.city}</p>
    </div>
  `).join('');

  const prevBtn = document.getElementById('testPrev');
  const nextBtn = document.getElementById('testNext');

  function scrollByCard(direction){
    const card = track.querySelector('.t-card');
    if(!card) return;
    const gap = 20;
    const amount = (card.offsetWidth + gap) * direction;
    track.scrollBy({ left: amount, behavior: 'smooth' });
  }
  prevBtn.addEventListener('click', () => scrollByCard(-1));
  nextBtn.addEventListener('click', () => scrollByCard(1));
}

/* ============================================
   Reviews list + add review form
   ============================================ */
function initializeReviews(){
  const list = document.getElementById('reviewsList');

  function renderReviews(){
    list.innerHTML = reviewsData.map(r => `
      <div class="review-item" data-reveal>
        <span class="stars" aria-hidden="true">★★★★★</span>
        <h4>${escapeHTML(r.title)}</h4>
        <p>${escapeHTML(r.body)}</p>
        <p class="rev-meta">${escapeHTML(r.name)} — ${escapeHTML(r.city)}</p>
      </div>
    `).join('');
    // Re-observe newly injected reveal items
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){ entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    list.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  }
  renderReviews();

  document.getElementById('addReviewBtn').addEventListener('click', () => {
    document.getElementById('writeReview').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // Star selector
  let selectedRating = 0;
  const starButtons = document.querySelectorAll('#starSelector button');
  starButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.star, 10);
      starButtons.forEach(b => b.classList.toggle('active', parseInt(b.dataset.star, 10) <= selectedRating));
    });
  });

  // Form validation + submission
  const form = document.getElementById('reviewForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('reviewName');
    const title = document.getElementById('reviewTitle');
    const body = document.getElementById('reviewBody');
    let valid = true;

    [name, title, body].forEach(field => {
      const row = field.closest('.form-row');
      if(!field.value.trim()){
        row.classList.add('error');
        valid = false;
      } else {
        row.classList.remove('error');
      }
    });

    if(!valid){
      showToast('Please fill in all fields before submitting.', 'error');
      return;
    }

    // Prepend a new review card (frontend-only demo, not persisted)
    reviewsData.unshift({
      title: title.value.trim(),
      body: body.value.trim(),
      name: name.value.trim(),
      city: 'Your City'
    });
    renderReviews();

    form.reset();
    selectedRating = 0;
    starButtons.forEach(b => b.classList.remove('active'));

    showToast('REVIEW ADDED', 'success');
  });
}

function escapeHTML(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================
   Chat widget
   ============================================ */
function initializeChat(){
  const fab = document.getElementById('chatFab');
  const panel = document.getElementById('chatPanel');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const body = document.getElementById('chatBody');
  const queriesOverlay = document.getElementById('chatQueriesOverlay');
  const queriesList = document.getElementById('chatQueriesList');
  const queriesClose = document.getElementById('chatQueriesClose');
  const mobilePurchaseBar = document.getElementById('mobilePurchaseBar');
  let isOpen = false;
  let hasGreeted = false;

  function openChat(){
    isOpen = true;
    panel.classList.add('open');
    fab.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
    if(mobilePurchaseBar) mobilePurchaseBar.classList.add('chat-open-hide');
    if(!hasGreeted){
      hasGreeted = true;
      addMessage("Hi there 👋 How can I help you today?", 'bot', { withQueriesButton: true });
    }
  }
  function closeChat(){
    isOpen = false;
    panel.classList.remove('open');
    fab.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
    closeQueries();
    if(mobilePurchaseBar) mobilePurchaseBar.classList.remove('chat-open-hide');
  }

  // Chat opens ONLY on click — hover just enlarges the button (handled in CSS)
  fab.addEventListener('click', () => { isOpen ? closeChat() : openChat(); });

  const fabLabel = document.getElementById('chatFabLabel');
  if(fabLabel){
    fab.addEventListener('mouseenter', () => { if(!isOpen) fabLabel.textContent = 'Chat with us'; });
    fab.addEventListener('mouseleave', () => { fabLabel.textContent = 'Chat'; });
  }

  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape' || !isOpen) return;
    if(queriesOverlay.classList.contains('open')) closeQueries();
    else closeChat();
  });
  document.addEventListener('click', (e) => {
    if(isOpen && !panel.contains(e.target) && !fab.contains(e.target)){
      closeChat();
    }
  });

  const conversation = [];

  function addMessage(text, sender, opts = {}){
    const msg = document.createElement('div');
    msg.className = `chat-msg ${sender}`;
    msg.textContent = text;
    body.appendChild(msg);

    if(opts.withQueriesButton){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chat-queries-btn';
      btn.innerHTML = 'Queries <span aria-hidden="true">↗</span>';
      btn.addEventListener('click', openQueries);
      body.appendChild(btn);
    }
    body.scrollTop = body.scrollHeight;
  }

  function addTypingIndicator(){
    const msg = document.createElement('div');
    msg.className = 'chat-msg bot chat-typing';
    msg.id = 'chatTyping';
    msg.innerHTML = 'AI is thinking<span class="chat-typing-dots"><span></span><span></span><span></span></span>';
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }
  function removeTypingIndicator(){
    const el = document.getElementById('chatTyping');
    if(el) el.remove();
  }

  /* ----- Popular questions overlay ----- */
  queriesList.innerHTML = faqData.map((item, i) => `
    <button type="button" class="chat-query-item" data-index="${i}">${item.q}</button>
  `).join('');

  function openQueries(){
    queriesOverlay.classList.add('open');
    queriesOverlay.setAttribute('aria-hidden', 'false');
  }
  function closeQueries(){
    queriesOverlay.classList.remove('open');
    queriesOverlay.setAttribute('aria-hidden', 'true');
  }
  queriesClose.addEventListener('click', closeQueries);
  queriesOverlay.addEventListener('click', (e) => { if(e.target === queriesOverlay) closeQueries(); });

  queriesList.querySelectorAll('.chat-query-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = faqData[parseInt(btn.dataset.index, 10)];
      closeQueries();
      addMessage(item.q, 'user');
      addTypingIndicator();
      const delay = 900 + Math.random() * 700;
      setTimeout(() => {
        removeTypingIndicator();
        addMessage(item.a, 'bot');
      }, delay);
    });
  });

  input.addEventListener('input', () => {
    form.classList.toggle('has-text', input.value.trim().length > 0);
  });

  async function sendToBackend(userText){
    conversation.push({ role: 'user', content: userText });
    addTypingIndicator();
    try{
      const base = (typeof API_BASE_URL !== 'undefined') ? API_BASE_URL : 'http://localhost:3000';
      const response = await fetch(`${base}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation })
      });
      if(!response.ok) throw new Error('Bad response from server');
      const data = await response.json();
      removeTypingIndicator();
      const reply = data && data.reply ? data.reply : "Sorry, I couldn't get a response right now.";
      addMessage(reply, 'bot');
      conversation.push({ role: 'assistant', content: reply });
    }catch(err){
      removeTypingIndicator();
      addMessage("Sorry, I'm having trouble connecting right now. Please try again in a moment, or tap Queries above for quick answers.", 'bot');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    input.value = '';
    form.classList.remove('has-text');
    sendToBackend(text);
  });
}

/* ============================================
   Sticky mobile purchase bar
   ============================================ */
function initializeMobilePurchaseBar(){
  const bar = document.getElementById('mobilePurchaseBar');
  const trigger = document.getElementById('product');
  if(!trigger) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      bar.classList.toggle('visible', !entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
  }, { threshold: 0 });
  observer.observe(trigger);
}

/* ============================================
   Init
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Reveal-animation setup MUST run first and MUST NOT be skipped —
  // everything on the page depends on it to become visible at all.
  // If any other initializer below throws, this has already run,
  // so the page never gets stuck fully blank again.
  safeInit('scrollAnimations', initializeScrollAnimations);

  safeInit('search', initializeSearch);
  safeInit('gallery', initializeGallery);
  safeInit('showcase', initializeShowcase);
  safeInit('purchase', initializePurchase);
  safeInit('accordions', initializeAccordions);
  safeInit('countdown', initializeCountdown);
  safeInit('testimonials', initializeTestimonials);
  safeInit('reviews', initializeReviews);
  safeInit('chat', initializeChat);
  safeInit('mobilePurchaseBar', initializeMobilePurchaseBar);

  // Safety net: if for any reason an element never gets picked up by the
  // IntersectionObserver (e.g. zero-height container at load time), force
  // it visible after 2s so the page can never get stuck blank.
  setTimeout(() => {
    document.querySelectorAll('[data-reveal]:not(.in-view)').forEach(el => {
      el.classList.add('in-view');
    });
  }, 2000);
});

function safeInit(name, fn){
  try{
    fn();
  }catch(err){
    console.error(`[init:${name}] failed — continuing with the rest of the page.`, err);
  }
}