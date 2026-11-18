document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector("[data-latest-projects]");
  if (!grid || !Array.isArray(window.LATEST_PROJECTS)) return;

  const latestProjects = [...window.LATEST_PROJECTS]
    .filter((project) => project.date && project.title && project.image && project.href)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);

  const dateFormatter = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

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
    const formattedDate = dateFormatter.format(new Date(`${project.date}T12:00:00`));
    meta.textContent = `${project.category} · ${formattedDate}`;

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
});
