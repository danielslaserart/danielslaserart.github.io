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

      const projectImages = card.dataset.projectImages
        ?.split("|")
        .map((src) => src.trim())
        .filter(Boolean);

      img.addEventListener("click", () => {
        if (projectImages?.length) {
          Lightbox?.open?.(projectImages, 0);
          return;
        }

        Lightbox?.open?.(images, index);
      });

      card.querySelector("[data-customer-photo-button]")?.addEventListener("click", () => {
        if (projectImages?.length) {
          Lightbox?.open?.(projectImages, Math.min(1, projectImages.length - 1));
        }
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
