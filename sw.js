/* JLPT Vocab Quest service worker
   - audio/*: cache-first (cached after first play or via "Download all audio"), serves Range requests from cache
   - data/nX.json, data/kanji-nX.json and data/kanji-nX-s.json (stroke paths) ?v=<hash>: cache-first per version (old versions of the same file are dropped); offline falls back to any cached version
   - HTML/navigation: network-first with a 4 s timeout → cached copy (never hangs on a slow network, never pins a stale index.html) */
const AUDIO_REV = 2;   // 2 = Keita/Nanami voice switch (2026-10-06)
const AUDIO_CACHE = "n5vq-audio-v1", PAGE_CACHE = "n5vq-page-v33", DATA_CACHE = "n5vq-data-v1";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== AUDIO_CACHE && k !== PAGE_CACHE && k !== DATA_CACHE) await caches.delete(k);
  try {   // v4 stored N5 audio at audio/w|s|h/…; it now lives under audio/n5/ — drop the orphaned copies
    const ac = await caches.open(AUDIO_CACHE);
    for (const r of await ac.keys()) if (/\/audio\/[wsh]\/[^/]+\.mp3$/.test(new URL(r.url).pathname)) await ac.delete(r);
    // AUDIO_REV changes whenever existing audio files are re-generated in place (same paths, new voice): drop every cached
    // mp3 once so cache-first never serves the old recordings (offline "Download all audio" must be run again).
    const mark = new URL("__audio-rev-" + AUDIO_REV, self.registration.scope).href;
    if (!(await ac.match(mark))) {
      for (const r of await ac.keys()) await ac.delete(r);
      await ac.put(mark, new Response("", { headers: { "Content-Type": "text/plain" } }));
    }
  } catch (e) {}
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
        const r = await fetch(key, { cache: "no-cache" });   // full file (no Range) so it can be cached; revalidate so a stale HTTP-cached copy is never pinned
        if (!r.ok) return r;
        await cache.put(key, r.clone());
        hit = r;
      }
      return withRange(req, hit.clone());
    })().catch(() => fetch(req)));
    return;
  }
  if (/\/data\/(kanji-|games-)?n[1-5](-s)?\.json$/.test(url.pathname)) {
    e.respondWith((async () => {
      const cache = await caches.open(DATA_CACHE);
      const hit = await cache.match(req.url);
      if (hit) return hit;
      try {
        const r = await fetch(req.url);
        if (r.ok) {
          for (const old of await cache.keys()) if (new URL(old.url).pathname === url.pathname && old.url !== req.url) await cache.delete(old);
          await cache.put(req.url, r.clone());
        }
        return r;
      } catch (err) {
        return (await cache.match(req.url, { ignoreSearch: true })) || Response.error();
      }
    })().catch(() => fetch(req)));
    return;
  }
  if (req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith(".html") || url.pathname.endsWith(".webmanifest") || url.pathname.includes("/icons/")) {
    // network-first, but never hang: after 4 s (slow/flaky mobile network) the cached copy is served; the network
    // response still refreshes the cache for next time. Every path resolves to a Response.
    const key = url.origin + url.pathname, isCheck = url.searchParams.has("build");
    e.respondWith((async () => {
      const cached = async () => (await caches.match(key)) || (await caches.match(url.origin + url.pathname.replace(/[^/]*$/, "")));
      const net = fetch(url.href, { cache: "no-cache", credentials: "same-origin" }).then(r => {
        if (r.ok && !isCheck) { const c = r.clone(); caches.open(PAGE_CACHE).then(cache => cache.put(key, c)).catch(() => {}); }
        return r;
      });
      if (isCheck) return net.catch(() => new Response("", { status: 504 }));      // update check: network only
      const timeout = new Promise(res => setTimeout(res, 4000, "timeout"));
      try {
        const first = await Promise.race([net, timeout]);
        if (first !== "timeout") return first;
        const c = await cached(); if (c) return c;
        return await net;                                    // nothing cached yet: keep waiting for the network
      } catch (err) {
        return (await cached()) || new Response("<!doctype html><meta name=viewport content='width=device-width'><p style='font:16px -apple-system;padding:40px;text-align:center'>You're offline and this page isn't saved yet.<br><br><a href='./'>Try again</a></p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
      }
    })());
  }
});
/* Review reminders (push/run.js on GitHub Actions). Payload { title, body, n, kind, tag, url }. Every push shows a
   notification (iOS requires it); same tag + renotify so an hourly repeat alerts again (sound/vibration follow the
   phone's settings for this app) instead of silently replacing the previous one. */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data ? e.data.text() : "" }; }
  const n = +d.n || 0;
  const opts = { body: d.body || (n ? `${n} reviews due — keep your streak going` : "Time for a quick review"), icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    tag: d.tag || "n5vq-due", renotify: true, silent: false, timestamp: d.t || Date.now(), data: { url: d.url || "./?go=due" } };
  e.waitUntil(Promise.all([
    self.registration.showNotification(d.title || "JLPT Quest", opts),
    n > 0 && self.navigator && self.navigator.setAppBadge ? self.navigator.setAppBadge(n).catch(() => {}) : null
  ]));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "./?go=due", self.registration.scope).href;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) if (c.url.startsWith(self.registration.scope)) { c.postMessage({ go: "due" }); return c.focus(); }
    return self.clients.openWindow(url);
  })());
});
