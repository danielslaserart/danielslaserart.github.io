// --- Menü & Navigation ---
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".menu");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  document.querySelectorAll("[data-link]").forEach((card) => {
    const go = () => {
      const href = card.getAttribute("data-link");
      if (href) window.location.href = href;
    };

    card.addEventListener("click", go);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        go();
      }
    });
  });
});


// --- Besucherzähler + versteckter Admin-Modus ---
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);

  // 🔒 Admin-Modus (versteckt)
  if (params.get("dlart") === "hide") {
    localStorage.setItem("excludeVisitorCount", "true");
  }

  if (params.get("dlart") === "show") {
    localStorage.removeItem("excludeVisitorCount");
  }

  const exclude = localStorage.getItem("excludeVisitorCount") === "true";

  // 👉 GoatCounter nur laden, wenn du NICHT ausgeschlossen bist
  if (!exclude) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.setAttribute(
      "data-goatcounter",
      "https://danielslaserart.goatcounter.com/count"
    );
    document.head.appendChild(script);
  }

  // 👀 Besucherzahl nur für dich anzeigen
  if (exclude) {
    const counterBox = document.getElementById("visitorCounter");
    const counterText = document.getElementById("visitorCount");

    if (!counterBox || !counterText) return;

    counterBox.style.display = "block";

    fetch("https://danielslaserart.goatcounter.com/counter/TOTAL.json")
      .then((res) => res.json())
      .then((data) => {
        counterText.textContent = data.count;
      })
      .catch(() => {
        counterText.textContent = "–";
      });
  }
});