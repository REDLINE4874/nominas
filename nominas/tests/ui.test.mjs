// Prueba de humo de la UI con jsdom y Supabase simulado. Uso: node tests/ui.test.mjs (requiere jsdom)
import {JSDOM} from 'jsdom';import fs from 'fs';import path from 'path';import assert from 'assert';
const root=path.resolve(new URL('..',import.meta.url).pathname);
const PID='p1',F={profiles:[{id:'u1',rol:'administrador',nombre:'Admin'}],
 ejecutivos:[{id:'e1',nombre:'Ana',esquema:'BASE',horario:'9-3',activo:true},{id:'e2',nombre:'Beto',esquema:'COMISIONISTA',horario:null,activo:true}],
 administrativos:[{id:'a1',nombre:'Carla',activo:true}],
 mov_ejecutivos:[{id:'m1',periodo_id:PID,ejecutivo_id:'e1',ventas:6,bonos:'100',faltas:1,retardos:2},{id:'m2',periodo_id:PID,ejecutivo_id:'e2',ventas:5,bonos:'100',faltas:1,retardos:1}],
 mov_administrativos:[{id:'m3',periodo_id:PID,admin_id:'a1',ventas:5,salario_base:'1500'}],nominas:[],nomina_detalle:[],nomina_auditoria:[]};
const calls=[];
const mk=t=>{let single=false;const b={select:()=>b,eq:()=>b,order:()=>b,upsert:(o)=>{calls.push(['upsert',t,o]);return b},insert:(o)=>{calls.push(['insert',t,o]);return b},update:(o)=>{calls.push(['update',t,o]);return b},maybeSingle:()=>{single=true;return b},
 then:(ok,ko)=>Promise.resolve({data:single?(F[t][0]??null):F[t],error:null}).then(ok,ko)};return b};
const win=new JSDOM(fs.readFileSync(root+'/index.html','utf8').replace(/<script[^>]*src[^>]*><\/script>/g,''),{runScripts:'outside-only',url:'http://localhost/index.html',pretendToBeVisual:true}).window;
const reload=[];win.matchMedia=()=>({matches:false});win.HTMLDialogElement.prototype.showModal=function(){this.open=true};win.HTMLDialogElement.prototype.close=function(){this.open=false};
win.supabase={createClient:()=>({from:mk,rpc:async(n,a)=>{calls.push(['rpc',n,a]);return{data:n==='get_periodo'?PID:null,error:null}},functions:{invoke:async(n,o)=>{calls.push(['fn',n,o]);return{data:{ok:true},error:null}}},
 auth:{getSession:async()=>({data:{session:{user:{id:'u1',email:'a@b.c'}}}}),onAuthStateChange(){},signOut:async()=>{}}})};
win.CFG={SUPABASE_URL:'http://x',SUPABASE_ANON_KEY:'k'};
win.eval(['calculations','supabase','utils','periodo','dashboard','plantillas','movimientos','nominas','historial','ajustes','app','auth'].map(f=>fs.readFileSync(`${root}/js/${f}.js`,'utf8').replace(/^if\(typeof module.*$/m,'')).join('\n'));// un solo eval: emula el ámbito compartido de <script> clásicos
const wait=()=>new Promise(r=>setTimeout(r,50)),$=s=>win.document.querySelector(s),txt=()=>$('#main').textContent;let n=0;const ok=m=>console.log('ok',++n,m);
await wait();assert(!$('#app').hidden);ok('sesión válida muestra la app');
assert.match(txt(),/\$7,350\.00|7,350/);assert.match(txt(),/Vista previa/);ok('dashboard: total $7,350 (2000+1850+3500) en vista previa');
for(const v of['ejecutivos','administrativos','movimientos','nomina','historial','config']){$(`[data-v=${v}]`).click();await wait();assert(!/Error|undefined/.test(txt()),v+': '+txt().slice(0,120));}
ok('todas las vistas renderizan sin errores');
$('[data-v=nomina]').click();await wait();assert.match(txt(),/Ana/);assert.match(txt(),/\$2,000\.00/);assert.match(txt(),/\$1,850\.00/);assert.match(txt(),/\$3,500\.00/);ok('vista previa de nómina con pagos esperados');
win.confirm=()=>true;$('#gen').click();await wait();assert(calls.some(c=>c[0]==='rpc'&&c[1]==='generar_nomina'&&c[2].p_periodo===PID));ok('generar llama a la RPC con el periodo');
$('[data-v=movimientos]').click();await wait();const card=win.document.querySelector('.mov');card.querySelector('[data-k="Ventas"]').value='-2';card.querySelector('.sv').click();await wait();
assert(!calls.some(c=>c[0]==='upsert'));assert.match($('#toast').textContent,/entero no negativo/);ok('ventas negativas bloqueadas en el cliente');
card.querySelector('[data-k="Ventas"]').value='3';card.querySelector('.sv').click();await wait();assert.equal(calls.find(c=>c[0]==='upsert')[2].ventas,3);ok('captura valida envía upsert');
$('[data-v=ejecutivos]').click();await wait();$('#nw').click();await wait();$('#fn').value='Nuevo';$('#fe').value='COMISIONISTA';$('#fe').dispatchEvent(new win.Event('change'));$('#df').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait();
const ins=calls.find(c=>c[0]==='insert'&&c[1]==='ejecutivos');assert.deepEqual(ins[2],{nombre:'Nuevo',esquema:'COMISIONISTA',horario:null});ok('alta de comisionista sin horario');
$('[data-v=config]').click();await wait();$('#ue').value='x@y.co';$('#up').value='12345678';$('#nu').dispatchEvent(new win.Event('submit',{cancelable:true}));await wait();assert.equal(calls.find(c=>c[0]==='fn')[2].body.rol,'operador');ok('formulario de usuario invoca la función');
console.log('UI OK');
