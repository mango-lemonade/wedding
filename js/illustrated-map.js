/**
 * Illustrated Map — Explore on Demand
 *
 * Desktop  → hover a dot → Quick-Look card fades in (top-right of map)
 * Mobile   → tap a dot  → bottom drawer slides up
 *
 * Data source: places.json (id must match SVG dot id: "dot-{id}")
 */
(function () {
  'use strict';

  const root = document.querySelector('[data-illustrated-map]');
  if (!root) return;

  const jsonUrl = root.getAttribute('data-places-url') || './assets/data/places.json';

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const svgEl        = root.querySelector('.illustrated-map-art');
  const quicklook    = document.getElementById('map-quicklook');
  const invite       = document.getElementById('map-invite');
  const drawer       = document.getElementById('map-drawer');
  const drawerOverlay = document.getElementById('map-drawer-overlay');
  const drawerClose  = document.getElementById('map-drawer-close');
  const drawerEye    = document.getElementById('map-drawer-eyebrow');
  const drawerTitle  = document.getElementById('map-drawer-title');
  const drawerDesc   = document.getElementById('map-drawer-desc');
  const drawerImgWrap = document.getElementById('map-drawer-image');
  const drawerImg    = document.getElementById('map-drawer-img');
  const drawerPrev   = document.getElementById('map-drawer-prev');
  const drawerNext   = document.getElementById('map-drawer-next');

  // ── State ─────────────────────────────────────────────────────────────────
  let places = [];
  let hasInteracted = false;
  let quicklookTimer = null;
  let currentIndex = -1;

  // Detect mobile device primarily by layout width so touch-enabled laptops still get desktop UX
  const isMobile = () => window.innerWidth <= 768;

  // ── Invite prompt ─────────────────────────────────────────────────────────
  function dismissInvite() {
    if (hasInteracted || !invite) return;
    hasInteracted = true;
    invite.classList.add('is-hidden');
  }

  // ── Active dot state ──────────────────────────────────────────────────────
  function setActiveDot(id) {
    if (!svgEl) return;
    svgEl.querySelectorAll('.map-interactable').forEach((g) => {
      g.classList.toggle('is-active', g.id === `dot-${id}`);
    });
  }

  function clearActiveDot() {
    if (!svgEl) return;
    svgEl.querySelectorAll('.map-interactable').forEach((g) => g.classList.remove('is-active'));
  }

  // ── Quick-Look card (desktop hover) ───────────────────────────────────────
  function showQuicklook(place) {
    if (!quicklook) return;
    clearTimeout(quicklookTimer);

    const pos = place.imagePosition || 'center';
    const captionHtml = place.captionHtml || '';
    const imageHtml = place.image
      ? `<div class="map-quicklook-image">
           <img src="${place.image}" alt="${place.title || ''}" style="object-position: ${pos}" loading="lazy">
           ${captionHtml}
         </div>`
      : '';

    quicklook.innerHTML = `
      <span class="map-quicklook-eyebrow">${place.eyebrow || ''}</span>
      <div class="map-quicklook-title">${place.title || ''}</div>
      <div class="map-quicklook-desc">${place.desc || ''}</div>
      ${imageHtml}
    `;
    quicklook.setAttribute('aria-hidden', 'false');
    // Force reflow so transition fires
    quicklook.offsetHeight; // eslint-disable-line no-unused-expressions
    quicklook.classList.add('is-visible');
  }

  function hideQuicklook(delay = 0) {
    if (!quicklook) return;
    clearTimeout(quicklookTimer);
    quicklookTimer = setTimeout(() => {
      quicklook.classList.remove('is-visible');
      quicklook.setAttribute('aria-hidden', 'true');
    }, delay);
  }

  // ── Mobile drawer ─────────────────────────────────────────────────────────
  function openDrawer(place) {
    if (!drawer) return;

    currentIndex = places.findIndex(p => p.id === place.id);

    // Update nav buttons
    if (drawerPrev) {
      drawerPrev.style.opacity = currentIndex > 0 ? '1' : '0.3';
      drawerPrev.style.pointerEvents = currentIndex > 0 ? 'auto' : 'none';
    }
    if (drawerNext) {
      if (currentIndex < places.length - 1) {
        drawerNext.textContent = 'Next →';
      } else {
        drawerNext.textContent = 'Done';
      }
      drawerNext.style.opacity = '1';
      drawerNext.style.pointerEvents = 'auto';
    }

    drawerEye.textContent   = place.eyebrow || '';
    drawerTitle.textContent = place.title   || '';
    drawerDesc.textContent  = place.desc    || '';

    const drawerCaption = document.getElementById('map-drawer-caption');
    if (place.image) {
      drawerImg.src = place.image;
      drawerImg.alt = place.title || '';
      drawerImg.style.objectPosition = place.imagePosition || 'center';
      drawerImgWrap.style.display = '';
      if (drawerCaption) {
        drawerCaption.innerHTML = place.captionHtml || '';
      }
    } else {
      drawerImgWrap.style.display = 'none';
    }

    drawerOverlay.classList.add('is-open');
    drawerOverlay.style.display = 'block';
    drawer.setAttribute('aria-hidden', 'false');
    drawer.classList.add('is-open');
    
    // Scroll map to top of viewport smoothly so it isn't covered by drawer
    const stickyNavHeight = document.querySelector('.page-nav')?.offsetHeight || 40;
    const mapTop = root.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: mapTop - stickyNavHeight - 16,
      behavior: 'smooth'
    });

    // Lock body scroll after smooth scroll completes (approx 400ms)
    setTimeout(() => {
      if (drawer.classList.contains('is-open')) {
        document.body.style.overflow = 'hidden';
      }
    }, 400);
  }

  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawerOverlay.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    clearActiveDot();
    document.body.style.overflow = '';
    // Hide overlay after transition
    setTimeout(() => {
      if (!drawer.classList.contains('is-open')) {
        drawerOverlay.style.display = 'none';
      }
    }, 350);
  }

  // ── Build hotspot listeners ───────────────────────────────────────────────
  function buildHotspots() {
    if (!svgEl) return;

    places.forEach((place) => {
      const dot = svgEl.querySelector(`#dot-${place.id}`);
      if (!dot) return;

      // ── Desktop: hover ────────────────────────────────────────────────────
      dot.addEventListener('mouseenter', () => {
        if (isMobile()) return;
        dismissInvite();
        setActiveDot(place.id);
        showQuicklook(place);
      });

      dot.addEventListener('mouseleave', () => {
        if (isMobile()) return;
        clearActiveDot();
        // Small delay so mousing into the card keeps it open
        hideQuicklook(120);
      });

      // ── Mobile: tap ───────────────────────────────────────────────────────
      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        dismissInvite();
        if (isMobile()) {
          setActiveDot(place.id);
          openDrawer(place);
        }
      });

      // Touch start — give tactile feel via active class
      dot.addEventListener('touchstart', () => {
        dot.classList.add('is-hovered');
      }, { passive: true });

      dot.addEventListener('touchend', () => {
        setTimeout(() => dot.classList.remove('is-hovered'), 300);
      }, { passive: true });
    });

    // Keep quicklook open when mouse enters it
    if (quicklook) {
      quicklook.addEventListener('mouseenter', () => clearTimeout(quicklookTimer));
      quicklook.addEventListener('mouseleave', () => hideQuicklook(80));
    }
  }

  // ── Drawer close listeners ────────────────────────────────────────────────
  function initDrawerControls() {
    if (drawerClose)   drawerClose.addEventListener('click', closeDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && drawer.classList.contains('is-open')) {
        closeDrawer();
      }
    });

    if (drawerPrev) {
      drawerPrev.addEventListener('click', () => {
        if (currentIndex > 0) {
          const p = places[currentIndex - 1];
          clearActiveDot();
          setActiveDot(p.id);
          openDrawer(p);
        }
      });
    }

    if (drawerNext) {
      drawerNext.addEventListener('click', () => {
        if (currentIndex < places.length - 1) {
          const p = places[currentIndex + 1];
          clearActiveDot();
          setActiveDot(p.id);
          openDrawer(p);
        } else {
          closeDrawer();
        }
      });
    }
  }

  // ── Entry point ───────────────────────────────────────────────────────────
  async function init() {
    try {
      const url = `${jsonUrl}?v=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      places = data.places || [];

      buildHotspots();
      initDrawerControls();
    } catch (err) {
      console.error('Illustrated map load error:', err);
    }
  }

  init();
})();