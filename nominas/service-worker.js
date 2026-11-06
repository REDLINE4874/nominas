const V='nominas-v10',SHELL=['./','index.html','manifest.json','css/styles.css','js/config.js','js/calculations.js','js/supabase.js','js/utils.js','js/periodo.js','js/dashboard.js','js/plantillas.js','js/movimientos.js','js/nominas.js','js/historial.js','js/ajustes.js','js/app.js','js/auth.js','login.html','assets/icons/icon-192.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);
 if(e.request.method!=='GET'||u.origin!==location.origin)return; // Supabase y CDN: siempre red, nunca cachÃ© (datos privados)
 e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))))});

