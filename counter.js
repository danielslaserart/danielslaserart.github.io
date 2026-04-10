const SUPABASE_URL = "https://qsnlwppbcczjwxwuhbkv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_R0Y-88wMebNVn580N5DvlQ_1xYezwhU";
const OWNER_SECRET = "daniel123";


const PANEL = document.getElementById("admin-stats-panel");
const CONTENT = document.getElementById("admin-stats-content");
const TOGGLE = document.getElementById("admin-stats-toggle");

const EL_TOTAL = document.getElementById("stat-total");
const EL_TODAY = document.getElementById("stat-today");
const EL_WEEK = document.getElementById("stat-week");
const EL_PAGE = document.getElementById("stat-page");
const EL_PAGE_PATH = document.getElementById("stat-page-path");

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setCookie(name, value, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function isOwner() {
  const adminFromUrl = getQueryParam("admin");
  if (adminFromUrl === OWNER_SECRET) {
    setCookie("dla_owner", "1");
    return true;
  }
  return getCookie("dla_owner") === "1";
}

function getVisitorId() {
  let id = localStorage.getItem("dla_visitor_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dla_visitor_id", id);
  }
  return id;
}

function formatNumber(value) {
  return new Intl.NumberFormat("de-DE").format(value || 0);
}

function startOfTodayISO() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfWeekISO() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Montag = Wochenstart
  now.setDate(now.getDate() - diff);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase Fehler ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function countVisit() {
  if (isOwner()) return;

  const visitorId = getVisitorId();
  const page = window.location.pathname || "/";
  const now = Date.now();
  const lastKey = `dla_last_count_${page}`;
  const lastCount = Number(localStorage.getItem(lastKey) || "0");

  if (now - lastCount < 12 * 60 * 60 * 1000) return;

  await supabaseFetch("/rest/v1/visits", {
    method: "POST",
    headers: {
      "Prefer": "return=minimal"
    },
    body: JSON.stringify([{
      visitor_id: visitorId,
      page_path: page,
      counted_at: new Date().toISOString()
    }])
  });

  localStorage.setItem(lastKey, String(now));
}

async function fetchCount(path) {
  const data = await supabaseFetch(path, { method: "GET" });
  return Array.isArray(data) ? data.length : 0;
}

async function loadStats() {
  if (!isOwner() || !PANEL) return;

  const page = window.location.pathname || "/";
  const todayISO = startOfTodayISO();
  const weekISO = startOfWeekISO();

  const [total, today, week, pageCount] = await Promise.all([
    fetchCount("/rest/v1/visits?select=id"),
    fetchCount(`/rest/v1/visits?select=id&counted_at=gte.${encodeURIComponent(todayISO)}`),
    fetchCount(`/rest/v1/visits?select=id&counted_at=gte.${encodeURIComponent(weekISO)}`),
    fetchCount(`/rest/v1/visits?select=id&page_path=eq.${encodeURIComponent(page)}`)
  ]);

  EL_TOTAL.textContent = formatNumber(total);
  EL_TODAY.textContent = formatNumber(today);
  EL_WEEK.textContent = formatNumber(week);
  EL_PAGE.textContent = formatNumber(pageCount);
  EL_PAGE_PATH.textContent = page;

  PANEL.style.display = "block";
}

function setupPanelToggle() {
  if (!TOGGLE || !CONTENT) return;

  const saved = localStorage.getItem("dla_admin_panel_collapsed") === "1";

  function apply(collapsed) {
    CONTENT.style.display = collapsed ? "none" : "block";
    TOGGLE.textContent = collapsed ? "+" : "−";
  }

  apply(saved);

  TOGGLE.addEventListener("click", () => {
    const collapsed = CONTENT.style.display !== "none";
    localStorage.setItem("dla_admin_panel_collapsed", collapsed ? "1" : "0");
    apply(collapsed);
  });
}

(async () => {
  try {
    setupPanelToggle();
    await countVisit();
    await loadStats();
  } catch (err) {
    console.error(err);
  }
})();
