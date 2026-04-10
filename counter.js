const SUPABASE_URL = "https://qsnlwppbcczjwxwuhbkv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_R0Y-88wMebNVn580N5DvlQ_1xYezwhU";
const OWNER_SECRET = "daniel123";

const COUNTER_BOX = document.getElementById("admin-visitor-counter");
const COUNTER_VALUE = document.getElementById("visitor-count-value");

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
    throw new Error(`Supabase Fehler: ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function countVisit() {
  const owner = isOwner();
  if (owner) return;

  const visitorId = getVisitorId();
  const page = window.location.pathname || "/";
  const now = Date.now();

  const lastKey = `dla_last_count_${page}`;
  const lastCount = Number(localStorage.getItem(lastKey) || "0");

  // dieselbe Person nur alle 12 Stunden erneut zählen
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

async function loadCount() {
  if (!isOwner()) return;

  const data = await supabaseFetch("/rest/v1/visits?select=id", {
    method: "GET"
  });

  if (COUNTER_BOX && COUNTER_VALUE) {
    COUNTER_VALUE.textContent = Array.isArray(data) ? data.length : 0;
    COUNTER_BOX.style.display = "block";
  }
}

(async () => {
  try {
    await countVisit();
    await loadCount();
  } catch (err) {
    console.error(err);
  }
})();