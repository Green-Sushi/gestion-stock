// Service Worker pour Green Sushi Stock PWA
const CACHE_NAME = 'green-sushi-v1';

// Fichiers à mettre en cache pour le fonctionnement hors ligne
const CACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

// Installation du service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache ouvert');
        return cache.addAll(CACHE_ASSETS);
      })
  );
});

// Activation et nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Supprimer les caches obsolètes
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Stratégie de cache : Cache First, puis réseau
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Le fichier est dans le cache, on le retourne
        if (response) {
          return response;
        }
        
        // Sinon, on fait la requête au réseau
        return fetch(event.request)
          .then((response) => {
            // Si la réponse n'est pas valide, on retourne simplement
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // On clone la réponse car elle ne peut être utilisée qu'une fois
            const responseToCache = response.clone();
            
            // On ajoute la réponse au cache pour les futures requêtes
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
      .catch(() => {
        // En cas d'erreur, on peut retourner une page offline
        // Pour simplifier, on ne le fait pas dans cette version
      })
  );
});