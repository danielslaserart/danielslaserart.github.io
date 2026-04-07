// Welche Galerie wurde geklickt?
const params = new URLSearchParams(window.location.search);
const gallery = params.get("type");

// Richtigen Container holen
const container = document.getElementById("imageGrid");
const title = document.getElementById("galleryTitle");
const description = document.getElementById("galleryDescription");

// Bilder pro Galerie
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

// Texte pro Galerie
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

// Falls Galerie nicht gefunden wird
if (!gallery || !galleries[gallery]) {
  if (title) title.textContent = "Galerie nicht gefunden";
  if (description) description.textContent = "Diese Galerie existiert nicht oder wurde noch nicht angelegt.";
  if (container) {
    container.innerHTML = `
      <div class="image-card">
        <div class="image-fallback">Keine Galerie gefunden</div>
        <div class="card-body">
          <p>Bitte gehe zurück zur Startseite und wähle eine Galerie aus.</p>
        </div>
      </div>
    `;
  }
} else {
  // Titel und Beschreibung setzen
  if (title) title.textContent = galleryInfo[gallery].title;
  if (description) description.textContent = galleryInfo[gallery].description;

  // Bilder anzeigen
  galleries[gallery].forEach((src, index) => {
    const card = document.createElement("div");
    card.className = "image-card";

    const img = document.createElement("img");
    img.src = src;
    img.alt = `${galleryInfo[gallery].title} Bild ${index + 1}`;

    img.onerror = () => {
      img.replaceWith(createFallback(`Bild ${index + 1} fehlt`));
    };

    card.appendChild(img);
    container.appendChild(card);
  });
}

// Platzhalter bei fehlendem Bild
function createFallback(text) {
  const fallback = document.createElement("div");
  fallback.className = "image-fallback";
  fallback.textContent = text;
  return fallback;
}