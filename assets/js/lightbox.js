window.Lightbox = (() => {
  let currentIndex = 0;
  let currentImages = [];

  let scale = 1;

  let swipeStartX = 0;
  let swipeEndX = 0;

  let isPinching = false;
  let pinchStartDistance = 0;
  let pinchStartScale = 1;

  const MIN_SCALE = 1;
  const MAX_SCALE = 3;

  const elements = {};

  function cacheElements() {
    elements.lightbox = document.getElementById("lightbox");
    elements.image = document.getElementById("lightboxImage");
    elements.close = document.getElementById("lightboxClose");
    elements.prev = document.getElementById("lightboxPrev");
    elements.next = document.getElementById("lightboxNext");
    elements.counter = document.getElementById("lightboxCounter");
  }

  function applyTransform() {
    if (!elements.image) return;

    elements.image.style.transform = `scale(${scale})`;
    elements.image.classList.toggle("is-zoomed", scale > 1);
  }

  function resetZoom() {
    scale = 1;
    applyTransform();
  }

  function zoomTo(newScale) {
    scale = Math.min(Math.max(newScale, MIN_SCALE), MAX_SCALE);

    if (scale <= 1.05) {
      scale = 1;
    }

    applyTransform();
  }

  function getDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function protectImage(img) {
    if (!img) return;

    img.setAttribute("draggable", "false");

    img.addEventListener("dragstart", (e) => {
      e.preventDefault();
    });

    img.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  }

  function update() {
    if (!elements.image || !currentImages.length) return;

    resetZoom();

    elements.image.src = currentImages[currentIndex];
    elements.image.alt = "Geschütztes Galerie-Bild";
    elements.image.setAttribute("draggable", "false");

    elements.counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }

  function open(images, index = 0) {
    currentImages = images;
    currentIndex = index;

    update();

    elements.lightbox.classList.add("open");
    elements.lightbox.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
  }

  function close() {
    elements.lightbox.classList.remove("open");
    elements.lightbox.setAttribute("aria-hidden", "true");

    elements.image.src = "";
    resetZoom();

    document.body.style.overflow = "";
  }

  function next() {
    if (!currentImages.length) return;

    currentIndex = (currentIndex + 1) % currentImages.length;
    update();
  }

  function prev() {
    if (!currentImages.length) return;

    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    update();
  }

  function bindProtection() {
    document.addEventListener("contextmenu", (e) => {
      if (
        e.target.closest(".gallery-grid") ||
        e.target.closest(".lightbox")
      ) {
        e.preventDefault();
      }
    });

    document.addEventListener("dragstart", (e) => {
      if (
        e.target.closest(".gallery-grid") ||
        e.target.closest(".lightbox")
      ) {
        e.preventDefault();
      }
    });
  }

  function bindZoom() {
    elements.image?.addEventListener("dblclick", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (scale === 1) {
        zoomTo(2);
      } else {
        resetZoom();
      }
    });

    elements.image?.addEventListener("wheel", (e) => {
      e.preventDefault();

      const direction = e.deltaY < 0 ? 0.2 : -0.2;
      zoomTo(scale + direction);
    }, { passive: false });

    elements.image?.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        pinchStartDistance = getDistance(e.touches);
        pinchStartScale = scale;
        return;
      }

      if (e.touches.length === 1) {
        swipeStartX = e.touches[0].clientX;
        swipeEndX = swipeStartX;
      }
    }, { passive: true });

    elements.image?.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();

        const distance = getDistance(e.touches);
        const newScale = pinchStartScale * (distance / pinchStartDistance);

        zoomTo(newScale);
        return;
      }

      if (e.touches.length === 1) {
        swipeEndX = e.touches[0].clientX;
      }
    }, { passive: false });

    elements.image?.addEventListener("touchend", () => {
      if (isPinching) {
        isPinching = false;

        if (scale <= 1.05) {
          resetZoom();
        }

        return;
      }

      if (scale > 1) return;

      const diff = swipeStartX - swipeEndX;

      if (Math.abs(diff) < 50) return;

      if (diff > 0) {
        next();
      } else {
        prev();
      }
    });
  }

  function bind() {
    cacheElements();

    if (!elements.lightbox) return;

    protectImage(elements.image);
    bindProtection();
    bindZoom();

    elements.close?.addEventListener("click", close);

    elements.next?.addEventListener("click", (e) => {
      e.stopPropagation();
      next();
    });

    elements.prev?.addEventListener("click", (e) => {
      e.stopPropagation();
      prev();
    });

    elements.lightbox.addEventListener("click", (e) => {
      if (e.target === elements.lightbox) close();
    });

    document.addEventListener("keydown", (e) => {
      if (!elements.lightbox.classList.contains("open")) return;

      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();

      if (
        (e.ctrlKey || e.metaKey) &&
        ["s", "u", "p"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
      }
    });
  }

  return { bind, open };
})();