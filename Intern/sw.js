const CACHE="dla-kalkulator-v7-20260721";
const FALLBACK="./index.html?v=7";
const ASSETS=[
  "./?v=7",
  "./index.html?v=7",
  "./style.css?v=7",
  "./app.js?v=7",
  "./manifest.json?v=7"
];
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
});
self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  if(url.hostname.includes("supabase.co")||url.hostname.includes("jsdelivr.net")) return;
  event.respondWith(
    fetch(event.request,{cache:"no-store"})
      .then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        return response;
      })
      .catch(()=>caches.match(event.request).then(cached=>cached||caches.match(FALLBACK)))
  );
});