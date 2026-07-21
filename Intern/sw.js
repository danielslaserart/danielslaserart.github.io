const CACHE="dla-kalkulator-v9-20260721";
const FALLBACK="./index.html?v=9";
const ASSETS=["./?v=9","./index.html?v=9","./style.css?v=9","./app.js?v=9","./manifest.json?v=9"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  if(u.hostname.includes("supabase.co")||u.hostname.includes("jsdelivr.net"))return;
  e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match(FALLBACK))));
});