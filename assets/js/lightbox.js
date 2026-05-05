window.Lightbox = (() => {
  let currentIndex = 0;
  let currentImages = [];

  const elements = {};

  function cacheElements() {
    elements.lightbox = document.getElementById("lightbox");
    elements.image = document.getElementById("lightboxImage");
    elements.close = document.getElementById("lightboxClose");
    elements.prev = document.getElementById("lightboxPrev");
    elements.next = document.getElementById("lightboxNext");
    elements.counter = document.getElementById("lightboxCounter");
  }

  function update() {
    if (!elements.image || !currentImages.length) return;
    elements.image.src = currentImages[currentIndex];
    elements.counter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }

  function open(images, index = 0) {
    currentImages = images;
    currentIndex = index;
    update();
    elements.lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function close() {
    elements.lightbox.classList.remove("open");
    elements.image.src = "";
    document.body.style.overflow = "";
  }

  function next() {
    currentIndex = (currentIndex + 1) % currentImages.length;
    update();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    update();
  }

 function bind() {
  cacheElements();
  if (!elements.lightbox) return;

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
  });

  let startX = 0;
  let endX = 0;

  elements.image?.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    endX = startX;
  }, { passive: true });

  elements.image?.addEventListener("touchmove", (e) => {
    endX = e.touches[0].clientX;
  }, { passive: true });

  elements.image?.addEventListener("touchend", () => {
    const diff = startX - endX;

    if (Math.abs(diff) < 50) return;

    if (diff > 0) {
      next();
    } else {
      prev();
    }
  });
}

  return { bind, open };
})();
