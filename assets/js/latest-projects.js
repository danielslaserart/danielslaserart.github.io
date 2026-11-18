document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("[data-latest-projects]");
  if (!grid) return;

  const categoryPages = [
    { url: "lasergravur-holz.html", name: "Holzgravuren" },
    { url: "personalisierte-geschenke.html", name: "Personalisierte Geschenke" },
    { url: "lederlabels.html", name: "Lederlabels & Kunstleder" },
    { url: "wandbilder-dekoration.html", name: "Wandbilder & Dekoration" },
    { url: "folien-textildesign.html", name: "Folien & Textildesign" },
    { url: "kreative-einzelstuecke.html", name: "Kreative Einzelstücke" },
    { url: "besondere-projekte.html", name: "Besondere Projekte" }
  ];

  const loadProjects = async () => {
    const responses = await Promise.allSettled(
      categoryPages.map(async (category) => {
        const response = await fetch(category.url);
        if (!response.ok) throw new Error(`${category.url}: ${response.status}`);

        const html = await response.text();
        const documentFromCategory = new DOMParser().parseFromString(html, "text/html");

        return [...documentFromCategory.querySelectorAll("[data-project-date]")]
          .map((project) => {
            const image = project.querySelector("img");
            const heading = project.querySelector("h2, h3");
            const description = project.querySelector(".image-caption p, p:not(.section-kicker)");

            return {
              date: project.dataset.projectDate,
              title: heading?.textContent.trim(),
              category: category.name,
              image: image?.getAttribute("src"),
              alt: image?.getAttribute("alt"),
              description: description?.textContent.trim(),
              href: project.id ? `${category.url}#${project.id}` : category.url
            };
          })
          .filter((project) => project.date && project.title && project.image);
      })
    );

    const latestProjects = responses
      .filter((response) => response.status === "fulfilled")
      .flatMap((response) => response.value)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 4);

    latestProjects.forEach((project) => {
    const article = document.createElement("article");
    article.className = "card latest-project-card";

    const imageLink = document.createElement("a");
    imageLink.className = "latest-project-image";
    imageLink.href = project.href;
    imageLink.setAttribute("aria-label", `${project.title} ansehen`);

    const badge = document.createElement("span");
    badge.className = "gallery-new-badge";
    badge.textContent = "Neu";

    const image = document.createElement("img");
    image.src = project.image;
    image.alt = project.alt || project.title;
    image.loading = "lazy";

    imageLink.append(badge, image);

    const body = document.createElement("div");
    body.className = "card-body latest-project-body";

      const meta = document.createElement("p");
      meta.className = "latest-project-meta";
      meta.textContent = project.category;

    const heading = document.createElement("h2");
    heading.textContent = project.title;

    const description = document.createElement("p");
    description.textContent = project.description || "";

    const link = document.createElement("a");
    link.className = "btn btn-secondary latest-project-link";
    link.href = project.href;
    link.textContent = "Projekt ansehen";

      body.append(meta, heading, description, link);
      article.append(imageLink, body);
      grid.append(article);
    });
  };

  loadProjects().catch(() => {
    grid.innerHTML = '<p class="latest-project-error">Die neuesten Arbeiten konnten gerade nicht geladen werden.</p>';
  });
});
