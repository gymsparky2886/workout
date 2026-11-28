// Offline cache. Bump the number when you change files, so phones pick up the new version.
const CACHE='workout-v92';
const SHELL=['./','index.html','firebase-config.js','manifest.json?v=39','icon3-180.png','icon3-192.png','icon3-512.png','icon3-maskable-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING'||(e.data&&e.data.type==='SKIP_WAITING'))self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const wait=ms=>new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),ms));
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  // Inject home-screen shortcuts into the manifest without requiring a third upload file.
  if(url.origin===location.origin&&url.pathname.endsWith('manifest.json')){
    e.respondWith((async()=>{
      const hit=await caches.match(req).then(h=>h||caches.match('manifest.json')).catch(()=>null);
      let res;
      try{res=await fetch(req)}catch(err){res=hit}
      if(!res)return res;
      try{
        const m=await res.clone().json();
        const base=url.pathname.replace(/manifest\.json$/,'');
        m.shortcuts=[
          {name:'Today',short_name:'Today',description:'Open today\'s workout',url:base+'index.html#today',icons:[{src:base+'icon3-192.png',sizes:'192x192'}]},
          {name:'Start workout',short_name:'Start',description:'Start today\'s workout',url:base+'index.html#start',icons:[{src:base+'icon3-192.png',sizes:'192x192'}]},
          {name:'Plan',short_name:'Plan',description:'Open your plan',url:base+'index.html#plan',icons:[{src:base+'icon3-192.png',sizes:'192x192'}]},
          {name:'Log protein',short_name:'Protein',description:'Log protein for today',url:base+'index.html#protein',icons:[{src:base+'icon3-192.png',sizes:'192x192'}]}
        ];
        const body=JSON.stringify(m);
        const out=new Response(body,{headers:{'Content-Type':'application/manifest+json','Cache-Control':'no-cache'}});
        return out;
      }catch(err){return res}
    })());
    return;
  }
  // Firebase SDK files and fonts: keep a saved copy, so the app opens offline
  if(url.hostname==='www.gstatic.com'||url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){
    e.respondWith(caches.open(CACHE).then(c=>c.match(req).then(hit=>hit||fetch(req).then(r=>{if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}))));return;
  }
  if(url.origin!==location.origin)return; // sign-in and database traffic go straight to Firebase
  // App files: newest if the internet answers within 2 seconds, otherwise the saved copy
  const net=fetch(req).then(r=>{if(r.ok){const cp=r.clone();caches.open(CACHE).then(c=>c.put(req,cp))}return r});
  e.respondWith(Promise.race([net,wait(2000)]).catch(()=>caches.match(req).then(h=>h||caches.match('index.html')).then(h=>h||net)));
});
