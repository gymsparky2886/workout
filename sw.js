// Offline cache. Bump the number when you change files, so phones pick up the new version.
const CACHE='workout-v73';
const SHELL=['./','index.html','firebase-config.js','manifest.json?v=38','icon3-180.png','icon3-192.png','icon3-512.png','icon3-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const wait=ms=>new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),ms));
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Firebase SDK files and fonts: keep a saved copy, so the app opens offline
  if(url.hostname==='www.gstatic.com'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}))));return;
  }
  if(url.origin!==location.origin)return; // sign-in and database traffic go straight to Firebase
  // App files: newest if the internet answers within 2 seconds, otherwise the saved copy
  const net=fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r});
  e.respondWith(Promise.race([net,wait(2000)]).catch(()=>caches.match(req).then(h=>h||caches.match('index.html')).then(h=>h||net)));
});
