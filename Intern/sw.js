const CACHE="dla-kalkulator-v15-1-20260724";
const FALLBACK="./index.html?v=15.2";
const ASSETS=[
  "./?v=15.2",
  "./index.html?v=15.2",
  "./style.css?v=15.2",
  "./app.js?v=15.2",
  "./manifest.json?v=15.2",
  "./icon-192.png?v=15.2",
  "./icon-512.png?v=15.2",
  "./icon-maskable-512.png?v=15.2",
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