document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const gallery = params.get("type");

  const container = document.getElementById("imageGrid");
  const title = document.getElementById("galleryTitle");
  const description = document.getElementById("galleryDescription");

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");
  const lightboxCounter = document.getElementById("lightboxCounter");

  if (!container || !title || !description) {
    return;
  }

  let currentIndex = 0;
  let currentImages = [];
  let touchStartX = 0;
  let touchEndX = 0;
  let isSwiping = false;

  const galleries = {
    gravur: [
      "images/gravuren/ygdrasil1.jpg",
      "images/gravuren/ygdrasil2.jpg",
      "images/gravuren/ygdrasil3.jpg"
    ],
    personalisiert: [
      "images/personalisiert/brettchen-Anna.jpg",
      "images/personalisiert/brettchen-tattoogirl.jpg"
    ],
    leinwand: [
      "images/leinwand/portrait.jpg",
      "images/leinwand/portrait2.jpg",
      "images/leinwand/portrait3.jpg",
      "images/leinwand/natsu.jpg",
      "images/leinwand/natsu2.jpg",
      "images/leinwand/tanchiro.jpg",
      "images/leinwand/tanchiro2.jpg",
      "images/leinwand/tanchiro3.jpg"
    ],
    plott: [
      "images/plott/tier-1.jpg",
      "images/plott/tier-2.jpg"
    ],
    "3d": [
      "images/3d/logo-1.jpg",
      "images/3d/logo-2.jpg"
    ],
    einzel: [
      "images/einzelstück/einzelstück1.jpg",
      "images/einzelstück/einzelstück2.jpg",
      "images/einzelstück/einzelstück3.jpg",
      "images/leinwand/portrait.jpg"
    ]
  };

  const galleryInfo = {
    gravur: {
      title: "Lasergravur auf Holz",
      description: "Detailreiche Gravur auf Holz mit starkem Kontrast und individueller Gestaltung."
    },
    personalisiert: {
      title: "Personalisierte Gravur",
      description: "Ideal als Geschenk mit Namen, Datum oder besonderer Botschaft"
    },
    leinwand: {
      title: "Modernes Wandbild / Leinwand gravuren",
      description: "Kreative Arbeiten für Dekoration, Zuhause oder besondere Räume."
    },
    plott: {
      title: "Plotterarbeiten",
      description: "Alles an geplotteten sachen, ob Aufkleber oder Textil plott für Kleidung."
    },
    "3d": {
      title: "3D Drucke",
      description: "Hier findest du alles was mit 3D Prints zu tun hat"
    },
    einzel: {
      title: "Kreative Einzelstücke",
      description: "Jedes Design kann nach Wunsch angepasst und einzigartig angefertigt werden."
    }
  };

  function createFallback(text) {
    const fallback = document.createElement("div");
    fallback.className = "image-fallback";
    fallback.textContent = text;
    return fallback;
  }

  function updateLightbox() {
    if (!lightboxImage || !lightboxCounter || !currentImages.length) return;

    lightboxImage.src = currentImages[currentIndex];
    lightboxImage.alt = `${galleryInfo[gallery].title} Bild ${currentIndex + 1}`;
    lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }

  function openLightbox(index) {
    if (!lightbox || !lightboxImage || !currentImages.length) return;

    currentIndex = index;
    updateLightbox();
    lightbox.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImage) return;

    lightbox.classList.remove("open");
    lightboxImage.src = "";
    document.body.style.overflow = "";
  }

  function nextImage() {
    if (!currentImages.length) return;
    currentIndex = (currentIndex + 1) % currentImages.length;
    updateLightbox();
  }

  function prevImage() {
    if (!currentImages.length) return;
    currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
    updateLightbox();
  }

  function handleSwipe() {
    const swipeDistance = touchEndX - touchStartX;
    const minSwipeDistance = 50;

    if (Math.abs(swipeDistance) < minSwipeDistance) return;

    isSwiping = true;

    if (swipeDistance < 0) {
      nextImage();
    } else {
      prevImage();
    }

    setTimeout(() => {
      isSwiping = false;
    }, 100);
  }

  if (!gallery || !galleries[gallery]) {
    title.textContent = "Galerie nicht gefunden";
    description.textContent = "Diese Galerie existiert nicht oder wurde noch nicht angelegt.";
    container.innerHTML = `
      <div class="image-card">
        <div class="image-fallback">Keine Galerie gefunden</div>
      </div>
    `;
    return;
  }

  title.textContent = galleryInfo[gallery].title;
  description.textContent = galleryInfo[gallery].description;
  currentImages = galleries[gallery];

  currentImages.forEach((src, index) => {
    const card = document.createElement("div");
    card.className = "image-card";

    const img = document.createElement("img");
    img.src = src;
    img.alt = `${galleryInfo[gallery].title} Bild ${index + 1}`;
    img.style.cursor = "zoom-in";
    img.loading = "lazy";

    img.addEventListener("click", () => {
      openLightbox(index);
    });

    img.onerror = () => {
      img.replaceWith(createFallback(`Bild ${index + 1} fehlt`));
    };

    card.appendChild(img);
    container.appendChild(card);
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", (e) => {
      e.stopPropagation();
      prevImage();
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener("click", (e) => {
      e.stopPropagation();
      nextImage();
    });
  }

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (isSwiping) return;
      if (e.target === lightbox) closeLightbox();
    });

    lightbox.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchEndX = touchStartX;
    }, { passive: true });

    lightbox.addEventListener("touchmove", (e) => {
      touchEndX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener("touchend", () => {
      handleSwipe();
    }, { passive: true });
  }

  document.addEventListener("keydown", (e) => {
    if (!lightbox || !lightbox.classList.contains("open")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") nextImage();
    if (e.key === "ArrowLeft") prevImage();
  });
});
