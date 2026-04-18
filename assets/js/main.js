document.addEventListener("DOMContentLoaded", () => {

  // 🔹 Menü
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".menu");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // 🔹 Karten klickbar
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

  // 🔹 Admin-Modus
  const params = new URLSearchParams(window.location.search);

  if (params.get("dlart") === "hide") {
    localStorage.setItem("excludeVisitorCount", "true");
  }

  if (params.get("dlart") === "show") {
    localStorage.removeItem("excludeVisitorCount");
  }

  const exclude = localStorage.getItem("excludeVisitorCount") === "true";

  // 🔹 GoatCounter laden
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

  // 🔹 Footer Stats (nur für dich)
  if (exclude) {
    const box = document.getElementById("visitorCounter");
    const todayEl = document.getElementById("statToday");
    const weekEl = document.getElementById("statWeek");
    const monthEl = document.getElementById("statMonth");
    const totalEl = document.getElementById("statTotal");

    if (!box || !todayEl || !weekEl || !monthEl || !totalEl) return;

    box.style.display = "block";

    const now = new Date();

    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const day = (now.getDay() + 6) % 7;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const fetchCount = async (start = null, end = null) => {
      let url = "https://danielslaserart.goatcounter.com/counter/TOTAL.json";

      const query = new URLSearchParams();
      if (start) query.set("start", start);
      if (end) query.set("end", end);

      if (query.toString()) {
        url += `?${query.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Fehler beim Laden");

      const data = await res.json();
      return data.count ?? "–";
    };

    Promise.all([
      fetchCount(formatDate(startOfToday), formatDate(now)),
      fetchCount(formatDate(startOfWeek), formatDate(now)),
      fetchCount(formatDate(startOfMonth), formatDate(now)),
      fetchCount()
    ])
      .then(([today, week, month, total]) => {
        todayEl.textContent = today;
        weekEl.textContent = week;
        monthEl.textContent = month;
        totalEl.textContent = total;
      })
      .catch((err) => {
        console.error(err);
      });
  }

});
