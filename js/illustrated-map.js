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

    // Update SVG Circles intrinsically embedded in the SVG map
    const stage = document.querySelector('.illustrated-map-art');
    if (stage) {
      places.forEach((place) => {
        const circle = stage.querySelector(`#dot-${place.id}`);
        if (circle) {
          if (place.id === id) {
            circle.classList.add('is-active');
          } else {
            circle.classList.remove('is-active');
          }
        }
      });
    }

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
    scrollContent.innerHTML = '<div class="places-scroll-spacer"></div>';

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
   * Sets up native SVG circle listeners on the map.
   */
  function buildHotspots() {
    const stage = document.querySelector('.illustrated-map-art');
    if (!stage) return;

    places.forEach((place) => {
      const circle = stage.querySelector(`#dot-${place.id}`);
      if (circle) {
        // Clicking a native SVG dot scrolls the corresponding card into view
        circle.addEventListener('click', () => {
          const card = scrollContent.querySelector(`[data-place-id="${CSS.escape(place.id)}"]`);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      }
    });
  }

  /**
   * Initializes the Intersection Observer to trigger state changes during scroll.
   */
  function initScrollObserver() {
    // Widen trigger zone to the middle 40% of the viewport to prevent 0-state flicker gap between cards
    const options = {
      root: null,
      rootMargin: '-30% 0% -30% 0%',
      threshold: 0
    };

    observer = new IntersectionObserver((entries) => {
      let newlyActive = null;
      let clearActive = false;

      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          newlyActive = entry.target.dataset.placeId;
        } else {
          if (activeId === entry.target.dataset.placeId) {
            clearActive = true;
          }
        }
      });

      if (newlyActive) {
        setActive(newlyActive);
      } else if (clearActive) {
        setActive(null);
      }
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
    } catch (err) {
      console.error("Scrollytelling Map Load Error:", err);
    }
  }

  // Run the initialization
  init();
})();