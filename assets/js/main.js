document.addEventListener("DOMContentLoaded", () => {
  // Menü
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector(".menu");

  if (toggle && menu) {
    toggle.addEventListener("click", () => {
      const open = menu.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
  }

  // Karten klickbar
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

  // Admin-Modus / Eigenbesuche ausschließen
  // Aufruf:
  //   ?dlart=hide  = Adminmodus an + eigene Besuche NICHT zählen
  //   ?dlart=show  = Adminmodus aus + wieder normal zählen
  const params = new URLSearchParams(window.location.search);

  if (params.get("dlart") === "hide") {
    localStorage.setItem("excludeVisitorCount", "true");
  }

  if (params.get("dlart") === "show") {
    localStorage.removeItem("excludeVisitorCount");
  }

  const exclude = localStorage.getItem("excludeVisitorCount") === "true";

  // GoatCounter nur für normale Besucher laden
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

  // Besucherzahlen nur im Admin-Modus anzeigen
  if (!exclude) return;

  const box = document.getElementById("visitorCounter");
  const todayEl = document.getElementById("statToday");
  const weekEl = document.getElementById("statWeek");
  const monthEl = document.getElementById("statMonth");
  const totalEl = document.getElementById("statTotal");

  if (!box || !todayEl || !weekEl || !monthEl || !totalEl) return;

  box.style.display = "block";

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const liveStatsUrl = "https://qsnlwppbcczjwxwuhbkv.supabase.co/functions/v1/goatcounter-stats";
  const fallbackCounterUrl = "https://danielslaserart.goatcounter.com/counter/TOTAL.json";
  const refreshIntervalMs = 20_000;
  let refreshInProgress = false;

  const cleanCount = (value) => {
    if (value === null || value === undefined || value === "") return "0";
    return String(value);
  };

  const fetchFallbackCount = async (start = null, end = null) => {
    const url = new URL(fallbackCounterUrl);

    if (start) url.searchParams.set("start", start);
    if (end) url.searchParams.set("end", end);

    const res = await fetch(url.toString(), { cache: "no-store" });

    if (!res.ok) {
      throw new Error(`GoatCounter ${res.status}: ${url.toString()}`);
    }

    const data = await res.json();
    return cleanCount(data.count);
  };

  const fetchLiveStats = async (ranges) => {
    const url = new URL(liveStatsUrl);
    url.searchParams.set("today", ranges.today.toISOString());
    url.searchParams.set("week", ranges.week.toISOString());
    url.searchParams.set("month", ranges.month.toISOString());

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Live-Statistik ${response.status}`);
    }

    const data = await response.json();
    for (const key of ["today", "week", "month", "total"]) {
      if (!Number.isFinite(Number(data[key]))) {
        throw new Error(`Live-Statistik enthält keinen gültigen Wert für ${key}`);
      }
    }

    return data;
  };

  const setStat = async (element, promise) => {
    try {
      element.textContent = await promise;
    } catch (error) {
      console.error("Besucherzähler konnte einen Wert nicht laden:", error);
      element.textContent = "–";
    }
  };

  const refreshStats = async () => {
    if (refreshInProgress || document.hidden) return;
    refreshInProgress = true;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = (now.getDay() + 6) % 7; // Montag = 0
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - day
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Der öffentliche GoatCounter-Zähler dient nur als Rückfalllösung, solange
    // die geschützte API-Abfrage vorübergehend nicht erreichbar ist.
    const endOfRange = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

    try {
      const stats = await fetchLiveStats({
        today: startOfToday,
        week: startOfWeek,
        month: startOfMonth,
      });
      todayEl.textContent = cleanCount(stats.today);
      weekEl.textContent = cleanCount(stats.week);
      monthEl.textContent = cleanCount(stats.month);
      totalEl.textContent = cleanCount(stats.total);
    } catch (error) {
      console.warn("Live-Besucherzahlen nicht erreichbar, nutze Rückfalllösung:", error);
      await Promise.allSettled([
        setStat(todayEl, fetchFallbackCount(formatDate(startOfToday), formatDate(endOfRange))),
        setStat(weekEl, fetchFallbackCount(formatDate(startOfWeek), formatDate(endOfRange))),
        setStat(monthEl, fetchFallbackCount(formatDate(startOfMonth), formatDate(endOfRange))),
        setStat(totalEl, fetchFallbackCount()),
      ]);
    }

    refreshInProgress = false;
  };

  refreshStats();
  window.setInterval(refreshStats, refreshIntervalMs);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refreshStats();
  });
});
