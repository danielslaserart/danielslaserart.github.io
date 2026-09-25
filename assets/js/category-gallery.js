document.addEventListener("DOMContentLoaded", () => {
  const galleries = document.querySelectorAll("[data-gallery-preview]");
  if (!galleries.length) return;

  const isSpecialProjectsPage = window.location.pathname
    .toLowerCase()
    .endsWith("/besondere-projekte.html");

  if (!isSpecialProjectsPage) {
    document.querySelectorAll(".gallery-card .image-caption > p").forEach((description, index) => {
      if (!description.textContent.trim()) return;

      description.classList.add("mobile-collapsible-description");
      description.id ||= `gallery-description-${index + 1}`;

      const toggle = document.createElement("button");
      toggle.className = "description-toggle-button";
      toggle.type = "button";
      toggle.textContent = "Mehr lesen ↓";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", description.id);

      toggle.addEventListener("click", () => {
        const isExpanded = description.classList.toggle("is-expanded");
        toggle.textContent = isExpanded
          ? "Weniger anzeigen ↑"
          : "Mehr lesen ↓";
        toggle.setAttribute("aria-expanded", String(isExpanded));
      });

      description.insertAdjacentElement("afterend", toggle);
    });
  }

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
        const additionalViews = projectImages?.slice(1);

        if (additionalViews?.length) {
          Lightbox?.open?.(additionalViews, 0);
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
