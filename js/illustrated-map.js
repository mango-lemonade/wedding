(function () {
  const root = document.querySelector('[data-illustrated-map]');
  if (!root) return;

  const jsonUrl = root.getAttribute('data-places-url') || 'assets/data/places.json';
  const stage = root.querySelector('.illustrated-map-stage');
  const hotspotLayer = root.querySelector('.illustrated-map-hotspots');
  const panel = root.querySelector('.illustrated-map-panel');
  const eyebrowEl = root.querySelector('.illustrated-map-panel-eyebrow');
  const titleEl = root.querySelector('.illustrated-map-panel-title');
  const descEl = root.querySelector('.illustrated-map-panel-desc');
  const imgWrap = root.querySelector('.illustrated-map-panel-image-wrap');
  const imgEl = root.querySelector('.illustrated-map-panel-image');

  const canFineHover = () =>
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let places = [];
  let activeId = null;
  let hideTimer = null;

  function cancelHideHover() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function scheduleHideHover() {
    if (!canFineHover()) return;
    cancelHideHover();
    hideTimer = window.setTimeout(() => {
      hideTimer = null;
      setActive(null);
    }, 160);
  }

  function clearPanelPosition() {
    if (!panel) return;
    panel.style.removeProperty('--panel-left-px');
    panel.style.removeProperty('--panel-top-px');
  }

  /** Keep popup fully inside .illustrated-map-stage; flip above/below pin when needed. */
  function positionPanel(hotspotEl) {
    if (!hotspotEl || !stage || !panel) return;
    const leftPct = parseFloat(hotspotEl.style.left);
    const topPct = parseFloat(hotspotEl.style.top);
    if (Number.isNaN(leftPct) || Number.isNaN(topPct)) return;

    const apply = () => {
      if (!panel.classList.contains('is-open') || panel.classList.contains('is-centered')) return;
      const inset = 10;
      const gap = 14;
      const stageW = stage.clientWidth;
      const stageH = stage.clientHeight;
      if (!stageW || !stageH) return;

      const pinX = (leftPct / 100) * stageW;
      const pinY = (topPct / 100) * stageH;

      const pw = panel.offsetWidth;
      const ph = panel.offsetHeight;
      if (!pw || !ph) return;

      const topIfAbove = pinY - gap - ph;
      const topIfBelow = pinY + gap;
      let preferBelow = topPct < 32;

      let top;
      let below = preferBelow;
      if (preferBelow) {
        top = topIfBelow;
        if (top + ph > stageH - inset) {
          below = false;
          top = topIfAbove;
        }
      } else {
        top = topIfAbove;
        if (top < inset) {
          below = true;
          top = topIfBelow;
        }
      }

      top = Math.max(inset, Math.min(top, stageH - ph - inset));

      let left = pinX - pw / 2;
      left = Math.max(inset, Math.min(left, stageW - pw - inset));

      panel.classList.toggle('is-flipped', below);
      panel.style.setProperty('--panel-left-px', `${Math.round(left)}px`);
      panel.style.setProperty('--panel-top-px', `${Math.round(top)}px`);
    };

    requestAnimationFrame(() => requestAnimationFrame(apply));
  }

  function setPanelContent(place) {
    if (!place) {
      eyebrowEl.textContent = '';
      titleEl.textContent = '';
      descEl.textContent = '';
      if (imgWrap) imgWrap.hidden = true;
      if (imgEl) imgEl.removeAttribute('src');
      return;
    }
    eyebrowEl.textContent = place.eyebrow || '';
    titleEl.textContent = place.title || '';
    descEl.textContent = place.desc || '';
    if (imgWrap && imgEl) {
      if (place.image) {
        imgEl.onload = null;
        imgEl.src = place.image;
        imgEl.alt = place.title || '';
        imgWrap.hidden = false;
        const repositionForImage = () => {
          const id = place.id;
          const btn = hotspotLayer.querySelector(`[data-place-id="${CSS.escape(id)}"]`);
          if (btn && activeId === id) positionPanel(btn);
        };
        imgEl.onload = repositionForImage;
        if (imgEl.complete) requestAnimationFrame(repositionForImage);
      } else {
        imgEl.removeAttribute('src');
        imgWrap.hidden = true;
      }
    }
  }

  function syncHotspotUi(id) {
    hotspotLayer.querySelectorAll('.illustrated-map-hotspot').forEach((btn) => {
      const on = btn.dataset.placeId === id;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  /**
   * @param {string|null} id
   * @param {{ fromHover?: boolean, positionEl?: HTMLElement, centered?: boolean }} [opts]
   */
  function setActive(id, opts = {}) {
    const { fromHover = false, positionEl = null, centered = false } = opts;
    if (fromHover && !canFineHover()) return;

    activeId = id;
    const place = id ? places.find((p) => p.id === id) : null;

    syncHotspotUi(id);

    if (!place) {
      cancelHideHover();
      panel.classList.remove('is-open', 'is-flipped', 'is-centered');
      clearPanelPosition();
      setPanelContent(null);
      return;
    }

    setPanelContent(place);

    if (centered) {
      clearPanelPosition();
      panel.classList.add('is-centered');
      panel.classList.remove('is-flipped');
      panel.classList.add('is-open');
      return;
    }

    panel.classList.remove('is-centered');
    panel.classList.add('is-open');
    const el =
      positionEl ||
      hotspotLayer.querySelector(`[data-place-id="${CSS.escape(id)}"]`);
    if (el) positionPanel(el);
  }

  function build(loaded) {
    places = loaded.places || [];
    hotspotLayer.innerHTML = '';

    places.forEach((place) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'illustrated-map-hotspot';
      btn.dataset.placeId = place.id;
      btn.style.left = `${place.x}%`;
      btn.style.top = `${place.y}%`;
      btn.setAttribute('aria-label', place.title || place.id);
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', 'map-detail');

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cancelHideHover();
        if (!canFineHover()) {
          if (activeId === place.id) setActive(null);
          else setActive(place.id, { positionEl: btn });
        }
      });

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          setActive(null);
        }
      });

      btn.addEventListener('pointerenter', () => {
        if (canFineHover()) {
          cancelHideHover();
          setActive(place.id, { fromHover: true, positionEl: btn });
        }
      });

      btn.addEventListener('pointerleave', () => {
        if (canFineHover()) scheduleHideHover();
      });

      btn.addEventListener('focus', () => {
        setActive(place.id, { positionEl: btn });
      });

      btn.addEventListener('blur', () => {
        window.setTimeout(() => {
          const a = document.activeElement;
          if (!stage || !stage.contains(a)) setActive(null);
        }, 0);
      });

      hotspotLayer.appendChild(btn);
    });

    panel.classList.remove('is-open', 'is-centered', 'is-flipped');
    setPanelContent(null);

    if (panel) {
      panel.addEventListener('pointerenter', cancelHideHover);
      panel.addEventListener('pointerleave', () => {
        if (canFineHover()) scheduleHideHover();
      });
    }

    if (stage) {
      stage.addEventListener('click', (e) => {
        if (!canFineHover()) {
          const t = e.target;
          if (t.closest('.illustrated-map-hotspot')) return;
          if (t.closest('.illustrated-map-panel')) return;
          setActive(null);
        }
      });
    }
  }

  window.addEventListener('resize', () => {
    if (!activeId || !panel.classList.contains('is-open')) return;
    if (panel.classList.contains('is-centered')) return;
    const btn = hotspotLayer.querySelector(`[data-place-id="${CSS.escape(activeId)}"]`);
    if (btn) positionPanel(btn);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (panel && panel.classList.contains('is-open')) setActive(null);
  });

  fetch(jsonUrl)
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then(build)
    .catch(() => {
      eyebrowEl.textContent = '';
      titleEl.textContent = 'Map unavailable';
      descEl.textContent =
        'We could not load place data. If you opened this file from disk, try viewing the site through a local server so the map can load its data file.';
      if (imgWrap) imgWrap.hidden = true;
      panel.classList.remove('is-flipped');
      clearPanelPosition();
      panel.classList.add('is-centered', 'is-open');
    });
})();
