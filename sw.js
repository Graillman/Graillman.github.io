/* Suivi Prestation · Pénélope — cache d'application.
   L'appli s'ouvre depuis le cache, donc instantanément et même sans réseau ;
   la version du serveur est récupérée en arrière-plan et servie à l'ouverture
   suivante (stale-while-revalidate).
   Les données ne passent jamais par ici : l'API est en POST vers un autre
   domaine, et les deux cas sont explicitement écartés plus bas. */
const CACHE = 'penelope-app-v15';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg',
               './icon-192.png', './icon-512.png', './icon-maskable.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  // Fichier par fichier : addAll rejette en bloc dès qu'une seule ressource
  // manque, ce qui viderait tout le pré-cache pour un icône absent.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                          // l'API de l'appli est en POST
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // rien du domaine Supabase

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const reseau = fetch(req).then((res) => {
        if (res && res.ok) {
          const copie = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copie));
        }
        return res;
      }).catch(() => hit);
      return hit || reseau;
    }),
  );
});
