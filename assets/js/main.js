document.addEventListener("DOMContentLoaded", () => {
  // Zeitlich begrenzter Urlaubshinweis (Europe/Berlin, 15.–19.10.2026)
  const berlinDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date());
  const holidayKey = "dla-holiday-dismissed-2026";
  const header = document.querySelector(".site-header");
  const holidayPreview = new URLSearchParams(window.location.search).get("urlaub") === "vorschau";
  if (header && (holidayPreview || (berlinDay >= "2026-10-15" && berlinDay < "2026-10-20"))
      && (holidayPreview || sessionStorage.getItem(holidayKey) !== "yes")) {
    const notice = document.createElement("aside");
    notice.className = "holiday-notice";
    notice.setAttribute("aria-label", "Urlaubsinformation");
    notice.innerHTML = `<div class="holiday-notice-inner">
      <div class="holiday-notice-copy">
        <strong>🌴 Kurze Urlaubspause</strong>
        <p>Vom 15.10. bis einschließlich 19.10.2026 bin ich im Urlaub.
        Ab dem <strong>20.10.2026</strong> bin ich wieder für euch da und beantworte eure Anfragen.</p>
      </div>
      <button type="button" class="holiday-notice-close" aria-label="Urlaubshinweis schließen">×</button>
    </div>`;
    header.insertAdjacentElement("afterend", notice);
    notice.querySelector(".holiday-notice-close").addEventListener("click", () => {
      sessionStorage.setItem(holidayKey, "yes");
      notice.remove();
    });
  }

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
