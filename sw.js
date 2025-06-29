// A minimal service worker
self.addEventListener('install', event => {
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  // Activate event
});
self.addEventListener('fetch', event => {
  // Optionally handle fetch events
});