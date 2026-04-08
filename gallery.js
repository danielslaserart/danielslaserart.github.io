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

let currentIndex = 0;
let currentImages = [];
let touchStartX = 0;
let touchEndX = 0;

const galleries = {
  gravur: [
    "images/holz-adler-1.jpg",
    "images/holz-adler-2.jpg",
    "images/holz-adler-3.jpg"
  ],
  personalisiert: [
    "images/personalisiert-1.jpg",
    "images/personalisiert-2.jpg"
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
    "images/tier-1.jpg",
    "images/tier-2.jpg"
  ],
  "3d": [
    "images/logo-1.jpg",
    "images/logo-2.jpg"
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
    description: "Hier findest du detailreiche Gravuren auf Holz."
  },
  personalisiert: {
    title: "Personalisierte Gravur",
    description: "Individuelle Geschenkideen mit Namen, Datum oder Botschaft."
  },
  leinwand: {
    title: "Modernes Wandbild",
    description: "Kreative Arbeiten für Dekoration, Zuhause oder besondere Räume."
  },
  plott: {
    title: "Plotterarbeiten",
    description: "Saubere Linien und starke Motive mit persönlichem Stil."
  },
  "3d": {
    title: "3D Drucke",
    description: "Modelle, Schilder und kreative Umsetzungen."
  },
  einzel: {
    title: "Kreative Einzelstücke",
    description: "Einzigartige Arbeiten nach deinen eigenen Vorstellungen."
  }
};

if (!gallery || !galleries[gallery]) {
  if (title) title.textContent = "Galerie nicht gefunden";
  if (description) description.textContent = "Diese Galerie existiert nicht oder wurde noch nicht angelegt.";
  if (container) {
    container.innerHTML = `
      <div class="image-card">
        <div class="image-fallback">Keine Galerie gefunden</div>
      </div>
    `;
  }
} else {
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

    img.addEventListener("click", () => {
      currentIndex = index;
      openLightbox();
    });

    img.onerror = () => {
      img.replaceWith(createFallback(`Bild ${index + 1} fehlt`));
    };

    card.appendChild(img);
    container.appendChild(card);
  });
}

function createFallback(text) {
  const fallback = document.createElement("div");
  fallback.className = "image-fallback";
  fallback.textContent = text;
  return fallback;
}

function updateLightbox() {
  if (!currentImages.length) return;
  lightboxImage.src = currentImages[currentIndex];
  lightboxImage.alt = `${galleryInfo[gallery].title} Bild ${currentIndex + 1}`;
  if (lightboxCounter) {
    lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
  }
}

function openLightbox() {
  updateLightbox();
  lightbox.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
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

  if (swipeDistance < 0) {
    nextImage();
  } else {
    prevImage();
  }
}

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
    if (e.target === lightbox) closeLightbox();
  });

  lightbox.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  lightbox.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
}

document.addEventListener("keydown", (e) => {
  if (!lightbox.classList.contains("open")) return;

  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowRight") nextImage();
  if (e.key === "ArrowLeft") prevImage();
});

window.nextImage = nextImage;
window.prevImage = prevImage;
