document.addEventListener("DOMContentLoaded", () => {
  const galleries = document.querySelectorAll("[data-gallery-preview]");
  if (!galleries.length) return;

  Lightbox?.bind?.();

  galleries.forEach((gallery) => {
    const cards = Array.from(gallery.querySelectorAll("[data-gallery-card]"));
    const images = cards
      .map((card) => card.querySelector("img[data-lightbox-src]")?.dataset.lightboxSrc)
      .filter(Boolean);

    cards.forEach((card, index) => {
      const img = card.querySelector("img[data-lightbox-src]");
      if (!img) return;

      img.addEventListener("click", () => {
        Lightbox?.open?.(images, index);
      });

      img.onerror = () => {
        const fallback = document.createElement("div");
        fallback.className = "image-fallback";
        fallback.textContent = img.alt || "Daniels Laser Art";
        img.replaceWith(fallback);
      };
    });
  });
});
