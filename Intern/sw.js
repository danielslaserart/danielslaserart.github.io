const CACHE="dla-kalkulator-v2-5-0-20260724";
const FALLBACK="./index.html?v=3.0.1";
const ASSETS=[
  "./?v=3.0.1",
  "./index.html?v=3.0.1",
  "./style.css?v=3.0.1",
  "./app.js?v=3.0.1",
  "./manifest.json?v=3.0.1",
  "./icon-192.png?v=3.0.1",
  "./icon-512.png?v=3.0.1",
  "./icon-maskable-512.png?v=3.0.1",
  "./briefkopf-logo.png?v=3.0.1",
  "/assets/images/hero/background.webp"
];

self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(asset => cache.add(asset)))
    )
  );
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

  if(url.hostname.includes("supabase.co") || url.hostname.includes("jsdelivr.net")) return;

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