document.addEventListener("DOMContentLoaded", () => {

  // ------------------------------
  // 🔹 Menü & Navigation
  // ------------------------------
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

  // ------------------------------
  // 🔹 Admin-Modus (versteckt)
  // ------------------------------
  const params = new URLSearchParams(window.location.search);

  if (params.get("dlart") === "hide") {
    localStorage.setItem("excludeVisitorCount", "true");
  }

  if (params.get("dlart") === "show") {
    localStorage.removeItem("excludeVisitorCount");
  }

  const exclude = localStorage.getItem("excludeVisitorCount") === "true";

  // ------------------------------
  // 🔹 GoatCounter laden (nur wenn du NICHT ausgeschlossen bist)
  // ------------------------------
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

  // ------------------------------
  // 🔹 Footer-Statistik (nur für dich)
  // ------------------------------
  if (exclude) {
    const box = document.getElementById("visitorCounter");
    if (!box) return;

    box.style.display = "block";

    const todayEl = document.getElementById("statToday");
    const weekEl = document.getElementById("statWeek");
    const monthEl = document.getElementById("statMonth");
    const totalEl = document.getElementById("statTotal");

    const now = new Date();

    // Datum formatieren YYYY-MM-DD
    const formatDate = (date) => {
      return date.toISOString().split("T")[0];
    };

    // Startpunkte berechnen
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const day = (now.getDay() + 6) % 7; // Montag = 0
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - day);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Funktion zum Laden der Stats
    const fetchCount = async (start = null, end = null) => {
      let url = "https://danielslaserart.goatcounter.com/counter/TOTAL.json";

      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      return data.count ?? "–";
    };

    // Alle Werte gleichzeitig laden
    Promise.all([
      fetchCount(formatDate(startOfToday), formatDate(now)),
      fetchCount(formatDate(startOfWeek), formatDate(now)),
      fetchCount(formatDate(startOfMonth), formatDate(now)),
      fetchCount()
    ])
      .then(([today, week, month, total]) => {
        if (todayEl) todayEl.textContent = today;
        if (weekEl) weekEl.textContent = week;
        if (monthEl) monthEl.textContent = month;
        if (totalEl) totalEl.textContent = total;
      })
      .catch((err) => {
        console.error("GoatCounter Fehler:", err);
        if (todayEl) todayEl.textContent = "–";
        if (weekEl) weekEl.textContent = "–";
        if (monthEl) monthEl.textContent = "–";
        if (totalEl) totalEl.textContent = "–";
      });
  }

});
