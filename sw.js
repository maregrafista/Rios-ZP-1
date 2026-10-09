// Service worker do Rios ZP-1. VERSAO é reescrita por tools/atualizar.py a cada atualização de dados.
const VERSAO='2026-10-09-191215';
const CACHE='rios-zp1-'+VERSAO;
const CORE=['./','index.html','styles.css','app.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('rios-zp1-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Rede primeiro (dados sempre frescos); o cache serve de reserva quando não há internet.
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin||u.pathname.includes('/files/'))return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const cp=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,cp)));}return r;})
    .catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||(e.request.mode==='navigate'?caches.match('index.html'):new Response('Sem conexão e sem cópia guardada.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})))));
});
