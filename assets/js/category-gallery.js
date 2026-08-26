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
        Lightbox?.open?.(images, index);
      });

      card.querySelector("[data-customer-photo-button]")?.addEventListener("click", () => {
        const customerPhoto = projectImages?.[1];

        if (customerPhoto) {
          Lightbox?.open?.([customerPhoto], 0);
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
