'use strict';
const CACHE='fnc-inspector-pro-v7';
const FILES=['./','./index.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n!==CACHE).map(n=>caches.delete(n)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).origin!==self.location.origin)return;
 e.respondWith(fetch(e.request).then(response=>{if(response.ok&&new URL(e.request.url).pathname.startsWith(new URL(self.registration.scope).pathname)){const clone=response.clone();caches.open(CACHE).then(c=>c.put(e.request,clone)).catch(()=>{})}return response}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
