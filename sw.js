/* N5 Vocab Quest service worker
   - audio/*: cache-first (cached after first play or via "Download all audio"), serves Range requests from cache
   - HTML/navigation: network-first, falls back to cache only when offline (never pins a stale index.html) */
const AUDIO_CACHE = "n5vq-audio-v1", PAGE_CACHE = "n5vq-page-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== AUDIO_CACHE && k !== PAGE_CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
async function withRange(req, full) {
  const range = req.headers.get("range");
  if (!range) return full;
  const buf = await full.arrayBuffer(), m = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const size = buf.byteLength, start = m[1] ? +m[1] : 0, end = Math.min(m[2] ? +m[2] : size - 1, size - 1);
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": full.headers.get("Content-Type") || "audio/mpeg", "Content-Range": `bytes ${start}-${end}/${size}`,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.includes("/audio/") && url.pathname.endsWith(".mp3")) {
    e.respondWith((async () => {
      const cache = await caches.open(AUDIO_CACHE), key = url.origin + url.pathname;
      let hit = await cache.match(key);
      if (!hit) {
        const r = await fetch(key);               // full file (no Range) so it can be cached
        if (!r.ok) return r;
        await cache.put(key, r.clone());
        hit = r;
      }
      return withRange(req, hit.clone());
    })().catch(() => fetch(req)));
    return;
  }
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html")) {
    e.respondWith(fetch(url.href, { cache: "no-cache", credentials: "same-origin" }).then(r => {
      if (r.ok) { const c = r.clone(); caches.open(PAGE_CACHE).then(cache => cache.put(url.origin + url.pathname, c)); }
      return r;
    }).catch(async () => (await caches.match(url.origin + url.pathname)) || (await caches.match(url.origin + url.pathname.replace(/[^/]*$/, ""))) || Response.error()));
  }
});
