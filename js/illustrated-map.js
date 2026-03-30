(function () {
  const root = document.querySelector('[data-illustrated-map]');
  if (!root) return;

  const jsonUrl = root.getAttribute('data-places-url') || './assets/data/places.json';
  const stage = root.querySelector('.illustrated-map-stage');
  const hotspotLayer = root.querySelector('.illustrated-map-hotspots');
  const scrollContent = document.querySelector('.places-scroll-content');

  let places = [];
  let activeId = null;
  let observer = null;

  /**
   * Updates the active state of map hotspots, content cards, and the background image.
   */
  function setActive(id) {
    if (activeId === id) return;
    activeId = id;

    const place = places.find((p) => p.id === id);

    // Update Hotspots
    hotspotLayer.querySelectorAll('.illustrated-map-hotspot').forEach((btn) => {
      const isActive = btn.dataset.placeId === id;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    });

    // Update Cards
    if (scrollContent) {
      scrollContent.querySelectorAll('.place-card').forEach((card) => {
        card.classList.toggle('is-active', card.dataset.placeId === id);
      });
    }

    // Map background image update removed to keep map clean as per requirements
  }

  /**
   * Generates the scrollable content cards dynamically.
   */
  function buildCards() {
    if (!scrollContent) return;
    scrollContent.innerHTML = '';

    places.forEach((place) => {
      const card = document.createElement('div');
      card.className = 'place-card';
      card.dataset.placeId = place.id;

      const imageHtml = place.image
        ? `<div class="place-card-image"><img src="${place.image}" alt="${place.title || ''}" loading="lazy"></div>`
        : '';

      const content = `
        <span class="eyebrow">${place.eyebrow || ''}</span>
        <h3>${place.title || ''}</h3>
        <p>${place.desc || ''}</p>
        ${imageHtml}
      `;
      card.innerHTML = content;
      scrollContent.appendChild(card);
    });
  }

  /**
   * Sets up hotspots on the map.
   */
  function buildHotspots() {
    if (!hotspotLayer) return;
    hotspotLayer.innerHTML = '';

    places.forEach((place) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'illustrated-map-hotspot';
      btn.dataset.placeId = place.id;
      btn.style.left = `${place.x}%`;
      btn.style.top = `${place.y}%`;
      btn.setAttribute('aria-label', place.title || place.id);

      // Clicking a hotspot scrolls the corresponding card into view
      btn.addEventListener('click', () => {
        const card = scrollContent.querySelector(`[data-place-id="${CSS.escape(place.id)}"]`);
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      hotspotLayer.appendChild(btn);
    });
  }

  /**
   * Initializes the Intersection Observer to trigger state changes during scroll.
   */
  function initScrollObserver() {
    // The "trigger zone" is the middle 20% of the viewport
    const options = {
      root: null,
      rootMargin: '-40% 0% -40% 0%',
      threshold: 0
    };

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.dataset.placeId);
        }
      });
    }, options);

    scrollContent.querySelectorAll('.place-card').forEach((card) => {
      observer.observe(card);
    });
  }

  /**
   * Entry point: fetch data and build the UI.
   */
  async function init() {
    try {
      // Add cache-buster to ensure we always get the latest Deetjen-free JSON
      const timestamp = new Date().getTime();
      const fetchUrl = `${jsonUrl}?v=${timestamp}`;
      
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      places = data.places || [];

      buildHotspots();
      buildCards();
      initScrollObserver();

      // Set initial active state to the first place
      if (places.length > 0) {
        setActive(places[0].id);
      }
    } catch (err) {
      console.error("Scrollytelling Map Load Error:", err);
    }
  }

  // Run the initialization
  init();
})();