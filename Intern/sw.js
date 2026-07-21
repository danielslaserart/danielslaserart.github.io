const CACHE="dla-kalkulator-v8-20260721";
const FALLBACK="./index.html?v=8";
const ASSETS=["./?v=8","./index.html?v=8","./style.css?v=8","./app.js?v=8","./manifest.json?v=8"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{if(e.request.method!=="GET")return;const u=new URL(e.request.url);if(u.hostname.includes("supabase.co")||u.hostname.includes("jsdelivr.net"))return;e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const c=r.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match(FALLBACK))))});