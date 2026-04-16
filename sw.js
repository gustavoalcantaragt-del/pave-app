// ============================================================
// sw.js — PAVE Service Worker
// Feature 4.4 — PWA Fase 4
// Estratégia: Cache-first para assets estáticos,
//             Network-first para API Supabase
// ============================================================

const CACHE_NAME   = 'pave-v1';
const STATIC_CACHE = 'pave-static-v1';
const API_ORIGINS  = ['supabase.co', 'supabase.io'];

// Assets para pré-cache no install
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/css/pav-design-system.css',
    '/js/utils-premium.js',
    '/js/config.js',
    '/js/calculos.js',
    '/js/api.js',
    '/js/caixa-premium.js',
    '/js/dashboard-premium.js',
    '/js/catalogo-premium.js',
    '/js/simulador-premium.js',
    '/js/configuracoes-premium.js',
    '/js/notifications.js',
    '/js/clientes.js',
    '/js/calendario.js',
    '/js/tabs-premium.js',
    '/assets/favicon.svg',
    '/offline.html'
];

// ── INSTALL ───────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE_URLS.filter(u => !u.includes('CDN'))))
            .catch(() => { /* ignora erros de assets opcionais */ })
            .then(() => self.skipWaiting())
    );
});

// ── ACTIVATE ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

// ── FETCH ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Requisições Supabase → Network-first (nunca servir do cache)
    if (API_ORIGINS.some(o => url.hostname.includes(o))) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ error: 'offline' }), {
                    headers: { 'Content-Type': 'application/json' }
                })
            )
        );
        return;
    }

    // CDN externas (Chart.js, jsPDF etc.) → Network-first com fallback cache
    if (url.hostname !== self.location.hostname) {
        event.respondWith(
            fetch(event.request)
                .then(res => {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    return res;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Assets locais → Cache-first com atualização em background
    event.respondWith(
        caches.match(event.request).then(cached => {
            const network = fetch(event.request).then(res => {
                const clone = res.clone();
                caches.open(STATIC_CACHE).then(c => c.put(event.request, clone));
                return res;
            });
            return cached || network.catch(() =>
                // Se offline e sem cache → página offline para navegação
                event.request.mode === 'navigate'
                    ? caches.match('/offline.html')
                    : new Response('', { status: 503 })
            );
        })
    );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────────────
self.addEventListener('push', event => {
    let data = { title: 'PAVE', body: 'Você tem notificações pendentes.' };
    try { data = event.data.json(); } catch (e) { /* dados não-JSON */ }

    event.waitUntil(
        self.registration.showNotification(data.title || 'PAVE', {
            body:    data.body    || 'Verifique suas contas.',
            icon:    data.icon    || '/assets/icon-192.png',
            badge:   data.badge   || '/assets/icon-192.png',
            tag:     data.tag     || 'pave-notif',
            data:    data.url     ? { url: data.url } : {},
            actions: data.actions || [
                { action: 'view', title: 'Ver Contas' },
                { action: 'close', title: 'Fechar' }
            ],
            requireInteraction: data.requireInteraction || false,
            vibrate: [200, 100, 200]
        })
    );
});

// ── NOTIFICATION CLICK ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'close') return;

    const targetUrl = event.notification.data?.url || '/index.html#bills';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            for (const client of clientList) {
                if ('focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NAVIGATE', url: targetUrl });
                    return;
                }
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// ── SYNC (Background Sync) ────────────────────────────────────────────────────
self.addEventListener('sync', event => {
    if (event.tag === 'pave-sync-bills') {
        event.waitUntil(syncPendingBills());
    }
});

async function syncPendingBills() {
    // Placeholder para sincronização offline de lançamentos pendentes
    // Será expandido quando o IndexedDB offline queue for implementado
    const clients_ = await clients.matchAll({ type: 'window' });
    clients_.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE' }));
}
