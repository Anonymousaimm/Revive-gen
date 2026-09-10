// Revive Gen — shared site behavior

// ---------- Smooth page-to-page transitions ----------
(function () {
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = REDUCE_MOTION ? 0 : 450; // keep in sync with CSS below

  function isTransitionable(a) {
    if (!a || !a.getAttribute('href')) return false;
    const href = a.getAttribute('href');
    if (href === '#' || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
    if (a.target && a.target !== '' && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    let url;
    try { url = new URL(a.href, window.location.href); } catch (err) { return false; }
    if (url.origin !== window.location.origin) return false;
    // Let same-page anchor links just scroll instead of fading (e.g. a #pyramid link
    // while already on that page), but cross-page anchor links still transition.
    if (url.pathname === window.location.pathname && url.hash) return false;
    return true;
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!isTransitionable(a)) return;
    e.preventDefault();
    const dest = a.href;
    document.documentElement.classList.add('page-leaving');
    window.setTimeout(() => { window.location.href = dest; }, DURATION);
  });

  // Replay the entrance fade when a page is restored from the back/forward cache
  window.addEventListener('pageshow', () => {
    document.documentElement.classList.remove('page-leaving');
  });
})();

// Header background on scroll
const header = document.getElementById('siteHeader');
if (header) {
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  });
}

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const navOverlay = document.getElementById('navOverlay');

function closeNav() {
  navLinks.classList.remove('open');
  navOverlay.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
}

if (navToggle && navLinks && navOverlay) {
  navToggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navOverlay.classList.toggle('open', isOpen);
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
  navOverlay.addEventListener('click', closeNav);
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNav));
}

// Newsletter form (front-end only confirmation)
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
  newsletterForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = newsletterForm.querySelector('button');
    const input = newsletterForm.querySelector('input');
    if (input && input.checkValidity()) {
      btn.textContent = 'Subscribed';
      input.value = '';
      setTimeout(() => { btn.textContent = 'Join'; }, 3500);
    }
  });
}

// Contact form -> opens the visitor's email client with the message pre-filled
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  // Pre-fill the message if arriving from a product page, e.g. contact.html?product=Aurum
  const params = new URLSearchParams(window.location.search);
  const product = params.get('product');
  if (product) {
    const messageField = document.getElementById('message');
    const subjectField = document.getElementById('subject');
    if (subjectField) subjectField.value = `Inquiry about ${product}`;
    if (messageField) {
      messageField.value = `Hi Revive Gen,\n\nI'd like to know more about ${product}.\n\n`;
    }
  }

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const subject = document.getElementById('subject').value.trim() || 'Website inquiry';
    const message = document.getElementById('message').value.trim();

    const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    const mailto = `mailto:hello@revivegen.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  });
}

// ---------- Collection filter (olfactory profile sidebar) ----------
const filterList = document.getElementById('filterList');
if (filterList) {
  const products = document.querySelectorAll('#collectionGrid .product');
  filterList.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    filterList.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    const tag = btn.dataset.filter;
    products.forEach((card) => {
      const tags = (card.dataset.tags || '').split(' ');
      const show = tag === 'all' || tags.includes(tag);
      card.classList.toggle('is-hidden', !show);
    });
  });
}

// ---------- Scroll reveal ----------
// Add class="reveal" (optionally "reveal-stagger" on a parent, with children
// being direct .reveal-item's) to fade + rise elements in as they enter view.
(function () {
  const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('.reveal, .reveal-item');
  if (!items.length) return;

  if (REDUCE_MOTION || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

  items.forEach((el) => io.observe(el));
})();
