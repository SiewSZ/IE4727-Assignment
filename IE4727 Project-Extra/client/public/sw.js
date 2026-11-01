// Service worker: makes Quantum Gear installable and lets people browse while offline.
//   App files and images:      cache first (they never change once built), refreshed in the background
//   Product list / categories: network first, falling back to the last copy saved
//   Pages:                     network first, falling back to the cached app shell
//   Everything else under /api (sign-in, cart, orders, admin): always the network, never cached

const CACHE = "qg-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/Images/Logo.png"];
const CACHEABLE_API = ["/api/products", "/api/categories"];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

// Delete caches from older versions of this file
self.addEventListener("activate", (event) => {
    event.waitUntil(caches.keys()
        .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
        .then(() => self.clients.claim()));
});

async function networkFirst(request, fallbackUrl) {
    const cache = await caches.open(CACHE);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(fallbackUrl || request, response.clone());
        return response;
    } catch {
        return (await cache.match(fallbackUrl || request)) || Response.error();
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(request);
    const refresh = fetch(request).then((response) => {
        if (response.ok) cache.put(request, response.clone());
        return response;
    }).catch(() => cached);
    return cached || refresh;
}

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== location.origin) return;

    if (url.pathname.startsWith("/api/")) {
        if (CACHEABLE_API.includes(url.pathname)) event.respondWith(networkFirst(request));
        return;   // live data: let the browser fetch it normally
    }
    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request, "/"));   // any page falls back to the app, which shows it from cache
        return;
    }
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/Images/") || url.pathname.endsWith(".png")) {
        event.respondWith(cacheFirst(request));
    }
});
