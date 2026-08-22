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

const chatResponses = [
  "Thanks! The AI assistant will be connected here soon.",
];

const faqData = [
  { q: 'Are all the recipes really under ₹99?', a: "Most recipes are built to cost around ₹99 or less per meal using common Indian pantry ingredients. A handful of special recipes may cost slightly more, but the book flags those clearly." },
  { q: 'How long does returns take?', a: "Since this is a digital product, there's no physical return — but if the guide isn't for you, reach out within 7 days and we'll sort it out." },
  { q: 'Is this cookbook suitable for complete beginners?', a: "Yes — it's written specifically for people who've never cooked before. Every recipe includes equipment needed, prep time, and step-by-step instructions." },
  { q: "What's included in the Bachelor 99 Survival Cookbook?", a: "99 easy Indian recipes, ingredient and equipment lists, approximate cost per meal, and step-by-step cooking instructions — all in one downloadable PDF." },
  { q: 'How will I receive my eBook after purchase?', a: "You'll get instant access to the PDF download right after checkout — no waiting, no shipping." }
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

/* Search icon: simple focus-style placeholder action */
document.getElementById('searchBtn').addEventListener('click', () => {
  showToast('Search coming soon!');
});

/* ============================================
   Toast notifications
   ============================================ */
let toastTimer = null;
function showToast(message){
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

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
   Gallery
   ============================================ */
function initializeGallery(){
  const mainImage = document.getElementById('mainImage');
  const thumbs = Array.from(document.querySelectorAll('.thumb'));
  const prevBtn = document.getElementById('galPrev');
  const nextBtn = document.getElementById('galNext');
  let currentIndex = 0;

  function setImage(index){
    currentIndex = (index + thumbs.length) % thumbs.length;
    const src = thumbs[currentIndex].dataset.src;
    mainImage.style.opacity = 0;
    setTimeout(() => {
      mainImage.src = src;
      mainImage.style.opacity = 1;
    }, 150);
    thumbs.forEach((t, i) => t.classList.toggle('active', i === currentIndex));
  }

  thumbs.forEach((thumb, i) => thumb.addEventListener('click', () => setImage(i)));
  prevBtn.addEventListener('click', () => setImage(currentIndex - 1));
  nextBtn.addEventListener('click', () => setImage(currentIndex + 1));
}

/* ============================================
   Showcase lightbox
   ============================================ */
function initializeLightbox(){
  const items = Array.from(document.querySelectorAll('.showcase-item'));
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  const closeBtn = document.getElementById('lightboxClose');
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  let currentIndex = 0;

  function open(index){
    currentIndex = index;
    lightboxImg.src = items[currentIndex].dataset.src;
    lightboxImg.alt = items[currentIndex].querySelector('img').alt;
    lightbox.classList.add('open');
    lightbox.setAttribute('aria-hidden', 'false');
  }
  function close(){
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  }
  function nav(delta){
    currentIndex = (currentIndex + delta + items.length) % items.length;
    lightboxImg.src = items[currentIndex].dataset.src;
  }

  items.forEach((item, i) => item.addEventListener('click', () => open(i)));
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
    showToast('Bachelor 99 has been added to your cart!');
  });
  document.getElementById('buyNowBtn').addEventListener('click', () => {
    showToast('Checkout is coming soon!');
  });
  document.getElementById('mpbBuyBtn').addEventListener('click', () => {
    showToast('Checkout is coming soon!');
  });
  document.getElementById('getCookbookBtn').addEventListener('click', () => {
    document.getElementById('product').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('contactBtn').addEventListener('click', () => {
    showToast("Message sent! We'll get back to you soon.");
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
      showToast('Please fill in all fields before submitting.');
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

    showToast('✓ Review added successfully! Thanks for sharing your experience.');
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
  const faqList = document.getElementById('faqList');
  let isOpen = false;

  // Render FAQ list
  faqList.innerHTML = faqData.map((item, i) => `
    <div class="faq-item" data-index="${i}">
      <button type="button" class="faq-question" aria-expanded="false">
        <span>${item.q}</span>
        <span class="chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 18l6-6-6-6"/></svg>
        </span>
      </button>
      <div class="faq-answer"><p>${item.a}</p></div>
    </div>
  `).join('');

  faqList.querySelectorAll('.faq-item').forEach(item => {
    const trigger = item.querySelector('.faq-question');
    trigger.addEventListener('click', () => {
      const isItemOpen = item.classList.contains('open');
      faqList.querySelectorAll('.faq-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if(!isItemOpen){
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      }
    });
  });

  function openChat(){
    isOpen = true;
    panel.classList.add('open');
    fab.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    fab.setAttribute('aria-expanded', 'true');
  }
  function closeChat(){
    isOpen = false;
    panel.classList.remove('open');
    fab.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    fab.setAttribute('aria-expanded', 'false');
  }

  fab.addEventListener('click', () => { isOpen ? closeChat() : openChat(); });

  const isDesktop = window.matchMedia('(hover: hover) and (min-width: 860px)').matches;
  if(isDesktop){
    fab.addEventListener('mouseenter', openChat);
  }

  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && isOpen) closeChat();
  });
  document.addEventListener('click', (e) => {
    if(isOpen && !panel.contains(e.target) && !fab.contains(e.target)){
      closeChat();
    }
  });

  function addMessage(text, sender){
    body.hidden = false;
    const msg = document.createElement('div');
    msg.className = `chat-msg ${sender}`;
    msg.textContent = text;
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  input.addEventListener('input', () => {
    form.classList.toggle('has-text', input.value.trim().length > 0);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if(!text) return;
    addMessage(text, 'user');
    input.value = '';
    form.classList.remove('has-text');
    setTimeout(() => {
      addMessage(chatResponses[0], 'bot');
    }, 500);
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
  initializeGallery();
  initializeLightbox();
  initializePurchase();
  initializeAccordions();
  initializeCountdown();
  initializeTestimonials();
  initializeReviews();
  initializeChat();
  initializeMobilePurchaseBar();
  initializeScrollAnimations();
});