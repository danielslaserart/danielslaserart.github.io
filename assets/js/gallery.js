document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const galleryKey = params.get("type");

  const container = document.getElementById("imageGrid");
  const title = document.getElementById("galleryTitle");
  const description = document.getElementById("galleryDescription");

  if (!container || !title || !description || !window.GALLERIES) return;

  Lightbox.bind();

  const gallery = window.GALLERIES[galleryKey];

  if (!gallery) {
    title.textContent = "Galerie nicht gefunden";
    description.textContent = "Diese Galerie existiert nicht oder wurde noch nicht angelegt.";
    container.innerHTML = '<div class="card"><div class="card-body">Keine Galerie gefunden.</div></div>';
    return;
  }

  title.textContent = gallery.title;
  description.textContent = gallery.description;

  gallery.images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "card gallery-card";

    const img = document.createElement("img");
    img.src = item.src;
    img.alt = item.text || `${gallery.title} – individuelles Motiv ${index + 1}`;
    img.loading = "lazy";

    img.onerror = () => {
      const fallback = document.createElement("div");
      fallback.className = "image-fallback";
      fallback.textContent = gallery.title;
      img.replaceWith(fallback);
    };

    img.addEventListener("click", () => {
      const imageList = gallery.images.map((image) => image.src);
      Lightbox.open(imageList, index);
    });

    const caption = document.createElement("div");
    caption.className = "image-caption";
    caption.textContent = item.text || "";

    const imageWrap = document.createElement("div");
imageWrap.className = "gallery-image-wrap";

imageWrap.appendChild(img);

card.appendChild(imageWrap);
card.appendChild(caption);
    container.appendChild(card);
  });
});