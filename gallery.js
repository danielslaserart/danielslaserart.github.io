const params = new URLSearchParams(window.location.search);
const gallery = params.get("type");

const container = document.getElementById("imageGrid");
const title = document.getElementById("galleryTitle");
const description = document.getElementById("galleryDescription");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxClose = document.getElementById("lightboxClose");

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
    "images/wandbild-1.jpg",
    "images/wandbild-2.jpg"
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
    "images/einzel-1.jpg",
    "images/einzel-2.jpg"
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
  container.innerHTML = `
    <div class="image-card">
      <div class="image-fallback">Keine Galerie gefunden</div>
    </div>
  `;
} else {
  title.textContent = galleryInfo[gallery].title;
  description.textContent = galleryInfo[gallery].description;

  galleries[gallery].forEach((src, index) => {
    const card = document.createElement("div");
    card.className = "image-card";

    const img = document.createElement("img");
    img.src = src;
    img.alt = `${galleryInfo[gallery].title} Bild ${index + 1}`;
    img.style.cursor = "zoom-in";

    img.addEventListener("click", () => {
      lightboxImage.src = src;
      lightboxImage.alt = img.alt;
      lightbox.classList.add("open");
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

if (lightboxClose) {
  lightboxClose.addEventListener("click", closeLightbox);
}

if (lightbox) {
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});

function closeLightbox() {
  lightbox.classList.remove("open");
  lightboxImage.src = "";
}