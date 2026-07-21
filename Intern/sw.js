const CACHE="dla-kalkulator-v5-20260721";
const ASSETS=["./?v=5","./index.html?v=5","./style.css?v=5","./app.js?v=5","./manifest.json?v=5"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  if(e.request.url.includes("supabase.co")||e.request.url.includes("jsdelivr.net"))return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();
    caches.open(CACHE).then(c=>c.put(e.request,copy));
    return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match("./index.html?v=5"))));
});