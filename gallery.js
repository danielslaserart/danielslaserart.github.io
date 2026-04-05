// Welche Galerie wurde geklickt?
const params = new URLSearchParams(window.location.search);
const gallery = params.get("type");

// Container holen
const container = document.getElementById("gallery-container");

// Bilder pro Galerie (HIER DEINE BILDER EINTRAGEN)
const galleries = {
  adler: [
    "images/holz-adler-1.jpg",
    "images/holz-adler-2.jpg",
    "images/holz-adler-3.jpg"
  ],
  personalisiert: [
    "images/personalisiert-1.jpg",
    "images/personalisiert-2.jpg"
  ],
  wandbild: [
    "images/wandbild-1.jpg",
    "images/wandbild-2.jpg"
  ],
  tier: [
    "images/tier-1.jpg",
    "images/tier-2.jpg"
  ],
  logo: [
    "images/logo-1.jpg",
    "images/logo-2.jpg"
  ],
  einzel: [
    "images/einzel-1.jpg",
    "images/einzel-2.jpg"
  ]
};

// Bilder anzeigen
if (gallery && galleries[gallery]) {
  galleries[gallery].forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.style.width = "100%";
    img.style.borderRadius = "12px";
    img.style.marginBottom = "16px";

    // Falls Bild fehlt → Platzhalter
    img.onerror = () => {
      img.src = "https://via.placeholder.com/400x300?text=Bild+fehlt";
    };

    container.appendChild(img);
  });
} else {
  container.innerHTML = "<p>Keine Galerie gefunden.</p>";
}