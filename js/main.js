// Mythical Rule — boot, main loop, camera & touch controls, customize mode, scenarios, arena flow, saving.
import {THREE,initGfx,renderer,scene,camera,GQ,QS,isTouch,setDayTime,uTime,H,M,ANIMALS} from './gfx.js';
import {G,newGame,tick,log,dateStr,MONTH_SEC,DAYLEN,RATE_SEC,EVENT_GAP,rnd,pick,clamp,ri,canAfford,costStr,place,canPlace,buildingAt,demolish,moveBuilding,repairCost,pay,footprint,cellCenter,resolvePlayerAttack,aiAttack,diplo,makeCandidate,arenaKingdoms,arenaResult,law,built,addRes,autoAssign,clampJobs} from './game.js';
import {BUILDINGS,JOBS,CELL,GRID,HALF,RELIGIONS} from './data.js';
import {pickEvent,startEvent,resolveEvent,EVENTS} from './events.js';
import {W,setupWorld,syncBuildings,updateWalkers,updateAnimals,updateArmies,updateWorld,march,syncHeroes,refreshAI,beastRaid,dragonAttack,refreshPlayerBuildings,kStyle,setGhost,placeGhost,showSel,removeAnimal,BASE_Y} from './world.js';
import {A,startArena,updateArena,setArenaInput,skipArena} from './arena.js';
import {initAudio,setMode,setMusic,setSfx,AU,SFX} from './audio.js';
import {$,UI,toast,openSetup,initSetup,initHud,updateHud,openPanel,closePanel,renderPanel,renderCust,modal,closeModal,drawBanner,openKingdomEdit} from './ui.js';
const SAVE='ashencrown_save_v1';
let started=false,last=performance.now(),hudT=0,saveT=0,panelT=0;
const cam={x:0,z:10,dist:95,yaw:.6,pitch:.9,tx:0,tz:10,tdist:95};

// ---------- boot ----------
initGfx($('c'));$('gfxT').value=GQ;$('gfxT').onchange=e=>{localStorage.setItem('ac_gfx',e.target.value);localStorage.setItem('ac_gfx_user','1');location.reload();};
if(/iPhone|iPad|iPod/.test(navigator.userAgent)&&!navigator.standalone)$('iosTip').classList.remove('hidden');
if(localStorage.getItem(SAVE))$('bContinue').classList.remove('hidden');
$('loading').classList.add('hidden');
// title backdrop: a slowly turning view of a castle on a hill
const titleScene=(()=>{const s={seed:7,ai:[]};return s;})();
initSetup();
$('bNew').onclick=()=>{initAudio();SFX.click();if(localStorage.getItem(SAVE)&&!confirm('Start a new kingdom? Your current kingdom will be lost.'))return;$('title').classList.add('hidden');openSetup(cfg=>{newGame(cfg);begin(true);});};
$('bContinue').onclick=()=>{initAudio();SFX.click();try{G.s=JSON.parse(localStorage.getItem(SAVE));migrate(G.s);}catch(e){alert('Save could not be loaded.');return;}$('title').classList.add('hidden');begin(false);};
function migrate(s){s.customJobs=s.customJobs||[];s.buffs=s.buffs||[];s.lastEvents=s.lastEvents||[];s.stats=s.stats||{built:0,battlesWon:0,battlesLost:0};s.marching=null;for(const k of s.ai){k.race=k.race||k.kind;k.style=k.style||(k.kind==='human'?'stone':k.kind);}}
export function save(){if(G.s&&started)try{localStorage.setItem(SAVE,JSON.stringify(G.s));}catch(e){}}
addEventListener('visibilitychange',()=>{if(document.hidden)save();});addEventListener('pagehide',save);

function begin(fresh){$('loading').classList.remove('hidden');$('loading').textContent='Forging the realm…';
  setTimeout(()=>{setupWorld();started=true;syncBuildings(0);syncHeroes();initHud();buildLabels();$('hud').classList.remove('hidden');$('loading').classList.add('hidden');
    if(G.s.ai)for(const k of G.s.ai)if(!k.alive||k.vassal)refreshAI(k);
    cam.x=cam.tx=0;cam.z=cam.tz=8;const near=innerHeight<500?62:85;cam.dist=fresh?150:near;cam.tdist=near;
    if(fresh&&!G.s.tut){tutorial(0);}else toast(`Welcome back, ruler of ${G.s.name}.`,'good');
    setMode('kingdom');window.__ready=true;save();},30);}

// ---------- hooks from simulation ----------
G.hooks.log=(txt,type)=>{if(UI.panel==='log')renderPanel();};
G.hooks.built=b=>{SFX.build();toast(`${BUILDINGS[b.type].icon} ${BUILDINGS[b.type].name} completed!`,'good');if(UI.ctab==='jobs'&&!$('custBar').classList.contains('hidden'))renderCust();};
G.hooks.pop=d=>{if(d>0&&Math.random()<.4)floatText('+1 👥',0,0);};
G.hooks.damaged=b=>{};
G.hooks.march=(side,k,power)=>{if(side==='player'){SFX.horn();march('player',k,power,()=>{const m=resolvePlayerAttack();if(m)battleReport(m);});}
  else{SFX.horn();toast(`⚠ ${k.name} is marching on ${G.s.name}! (strength ${Math.round(power)})`,'bad',6000);march('ai',k,power,()=>{const m=aiAttack(k,power);battleReport(m);});}};
G.hooks.aiwar=k=>{SFX.horn();toast(`⚔ ${k.name} declares WAR on you!`,'bad',6000);updateLabels(true);};
G.hooks.conquered=k=>{refreshAI(k);updateLabels(true);SFX.good();};
G.hooks.battle=()=>{if(UI.panel==='world')renderPanel();};
G.hooks.peaceOffer=k=>{if(G.modal)return;modal(`<div class="ic">🕊️</div><h2>${k.name} Seeks Peace</h2><p>${k.ruler}'s envoy kneels: “This war bleeds us both. Let us end it.”</p><button class="choice" id="pa"><b>Accept peace</b></button><button class="choice" id="pd"><b>Refuse. The war goes on.</b></button>`,c=>{
  c.querySelector('#pa').onclick=()=>{diplo(k,'peace','free');closeModal();toast(`Peace with ${k.name}.`,'good');updateLabels(true);};c.querySelector('#pd').onclick=()=>{k.warSince=G.s.time;closeModal();};});};
G.hooks.fx=(n,d)=>{if(n==='beasts'&&d.b)beastRaid(d.b,d.type,d.n);if(n==='horde'&&d.k){march('ai',d.k,d.k.army*.3,null);}if(n==='dragon')dragonAttack(d);};
G.hooks.flyTo=(x,z)=>{worldSaved=null;cam.tx=x;cam.tz=z;cam.tdist=110;if(isPortrait())closePanel();};
// 3D realm map: the World tab flies the camera high over the whole land so every kingdom is visible in 3D
let worldSaved=null;
G.hooks.worldView=on=>{document.body.classList.toggle('worldmode',!!on);if(on){if(!worldSaved)worldSaved={tx:cam.tx,tz:cam.tz,tdist:cam.tdist};const p=isPortrait();const off=p?110:0;cam.tx=Math.sin(cam.yaw)*off;cam.tz=Math.cos(cam.yaw)*off;cam.tdist=p?560:430;}
  else if(worldSaved){cam.tx=worldSaved.tx;cam.tz=worldSaved.tz;cam.tdist=worldSaved.tdist;worldSaved=null;}updateLabels(true);};
G.hooks.editKingdom=()=>openKingdomEdit(changed=>{log(changed?`By royal decree the kingdom is now known as ${G.s.name}.`:`${G.s.name} raises new banners.`,'good');refreshPlayerBuildings();buildLabels();toast(`👑 Long live ${G.s.name}!`,'good');if(UI.panel)renderPanel();save();});
G.hooks.startArena=()=>{closePanel();arenaIntro();};
G.hooks.selectTool=t=>selectTool(t);
function battleReport(m){const good=/repelled|Victory|surrender|cleansed|sealed/.test(m);toast(m,good?'good':'bad',7000);(good?SFX.good:SFX.bad)();}
const isPortrait=()=>innerHeight>innerWidth||innerWidth<600;

// ---------- labels over rival kingdoms ----------
function buildLabels(){$('labels').innerHTML=`<div class="klab me" id="klMe">${G.s.emblem} <span>${esc2(G.s.name)} (You)</span></div>`+G.s.ai.map(k=>`<div class="klab" id="kl${k.id}">${k.emblem} <span></span><small></small></div>`).join('');for(const k of G.s.ai)$('kl'+k.id).onclick=()=>{UI.hlKing=k.id;UI.panel=null;openPanel('world');};updateLabels(true);}
const esc2=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const KTYPE=k=>k.kind==='zombie'?'Undead':k.kind==='demon'?'Demons':k.kind==='orc'?'Orcs':k.race==='elf'?'Elves':k.race==='dwarf'?'Dwarves':k.style==='timber'?'Northmen':k.style==='sand'?'Sultanate':'Humans';
function updateLabels(text){const v=new THREE.Vector3();const wm=document.body.classList.contains('worldmode');const me=$('klMe');if(me){v.set(0,30,0).project(camera);me.style.display=wm&&v.z<1?'':'none';me.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`;}
  for(const k of G.s.ai){const el=$('kl'+k.id);if(!el)continue;if(text&&el.children[1])el.children[1].textContent=k.alive?` ${KTYPE(k)} · ⚔${Math.round(k.army)}`:'';
  if(text){el.children[0].textContent=k.alive?k.name+(k.vassal?' ⚜':k.status==='war'?' ⚔':k.status==='ally'?' 🤝':''):k.name+' (fallen)';el.className='klab '+(k.vassal?'vassal':k.alive?k.status:'');}
  v.set(k.x,(k.h||0)+24,k.z).project(camera);if(v.z>1||Math.abs(v.x)>1.1||Math.abs(v.y)>1.1){el.style.display='none';continue;}el.style.display='';el.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px) translate(-50%,-50%)`;}}
function floatText(t,x,z,y=8){const v=new THREE.Vector3(x,y,z).project(camera);if(v.z>1)return;const el=document.createElement('div');el.className='flt';el.textContent=t;el.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px)`;$('hud').appendChild(el);
  requestAnimationFrame(()=>{el.style.transform+=' translateY(-50px)';el.style.opacity=0;});setTimeout(()=>el.remove(),1500);}

// ---------- camera ----------
function updateCamera(dt){const k=1-Math.pow(.0005,dt);cam.x+=(cam.tx-cam.x)*k;cam.z+=(cam.tz-cam.z)*k;cam.dist+=(cam.tdist-cam.dist)*k;
  const pitch=.55+.55*clamp((cam.dist-25)/220,0,1);const gy=Math.max(BASE_Y,H(cam.x,cam.z));
  camera.position.set(cam.x+Math.sin(cam.yaw)*Math.cos(pitch)*cam.dist,gy+Math.sin(pitch)*cam.dist,cam.z+Math.cos(cam.yaw)*Math.cos(pitch)*cam.dist);
  const ch=H(camera.position.x,camera.position.z)+4;if(camera.position.y<ch)camera.position.y=ch;camera.lookAt(cam.x,gy+1,cam.z);}
function pan(dx,dy){const s=cam.dist*.0022;const cy=Math.cos(cam.yaw),sy=Math.sin(cam.yaw);cam.tx+=(-dx*cy-dy*sy)*s;cam.tz+=(dx*sy-dy*cy)*s;const r=Math.hypot(cam.tx,cam.tz);if(r>340){cam.tx*=340/r;cam.tz*=340/r;}}
function zoom(f){cam.tdist=clamp(cam.tdist*f,18,document.body.classList.contains('worldmode')?620:320);}

// ---------- input ----------
const ptrs=new Map();let gesture=null,mouseBtn=0;
const cv=$('c');
cv.addEventListener('pointerdown',e=>{if(!started||A.active)return;cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,t:performance.now()});mouseBtn=e.button;
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];gesture={d:Math.hypot(a.x-b.x,a.y-b.y),ang:Math.atan2(b.y-a.y,b.x-a.x),mx:(a.x+b.x)/2,my:(a.y+b.y)/2};}});
cv.addEventListener('pointermove',e=>{if(!started||A.active)return;const p=ptrs.get(e.pointerId);
  if(!p){if(e.pointerType==='mouse'&&UI.tool)hoverPlace(e.clientX,e.clientY);return;}
  const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
  if(ptrs.size===1){if(Math.hypot(p.x-p.sx,p.y-p.sy)>7)p.moved=true;if(p.moved){if(mouseBtn===2||e.shiftKey)cam.yaw-=dx*.006;else pan(dx,dy);}if(e.pointerType==='mouse'&&UI.tool)hoverPlace(e.clientX,e.clientY);}
  else if(ptrs.size===2&&gesture){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y),ang=Math.atan2(b.y-a.y,b.x-a.x),mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    zoom(gesture.d/Math.max(10,d));let da=ang-gesture.ang;if(da>Math.PI)da-=2*Math.PI;if(da<-Math.PI)da+=2*Math.PI;cam.yaw-=da;pan(mx-gesture.mx,my-gesture.my);gesture={d,ang,mx,my};for(const q of ptrs.values())q.moved=true;}});
const endPtr=e=>{const p=ptrs.get(e.pointerId);if(!p)return;ptrs.delete(e.pointerId);if(ptrs.size<2)gesture=null;if(!p.moved&&performance.now()-p.t<500&&ptrs.size===0&&mouseBtn!==2)tap(e.clientX,e.clientY,e.pointerType);};
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);gesture=null;});
cv.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(e.deltaY*.0012));},{passive:false});cv.addEventListener('contextmenu',e=>e.preventDefault());
const keys={};addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;keys[e.code]=true;if(A.active){if(e.code==='Space'||e.code==='KeyJ')setArenaInput({atk:true});if(e.code==='ShiftLeft'||e.code==='KeyK')setArenaInput({dodge:true});e.preventDefault&&e.code==='Space'&&e.preventDefault();return;}
  if(e.code==='KeyR'&&UI.tool){ghost.rot=(ghost.rot+1)%4;refreshGhost();}if(e.code==='Escape'){if(UI.tool)selectTool(null);else if(selB)selectB(null);else closePanel();}
  if((e.code==='Delete'||e.code==='Backspace')&&selB)doDemolish();});
addEventListener('keyup',e=>{keys[e.code]=false;if(A.active){if(e.code==='Space'||e.code==='KeyJ')setArenaInput({atk:false});if(e.code==='ShiftLeft'||e.code==='KeyK')setArenaInput({dodge:false});}});
function keyCam(dt){const s=500*dt;if(keys.KeyW||keys.ArrowUp)pan(0,s);if(keys.KeyS||keys.ArrowDown)pan(0,-s);if(keys.KeyA||keys.ArrowLeft)pan(s,0);if(keys.KeyD||keys.ArrowRight)pan(-s,0);if(keys.KeyQ)cam.yaw+=dt*1.5;if(keys.KeyE)cam.yaw-=dt*1.5;if(keys.Equal)zoom(1-dt);if(keys.Minus)zoom(1+dt);}

const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
function groundAt(x,y,h=BASE_Y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);const o=ray.ray.origin,d=ray.ray.direction;
  if(h!==null){if(Math.abs(d.y)<1e-4)return null;const t=(h-o.y)/d.y;if(t<0)return null;return {x:o.x+d.x*t,z:o.z+d.z*t};}}
function worldAt(x,y){ndc.set(x/innerWidth*2-1,-(y/innerHeight)*2+1);ray.setFromCamera(ndc,camera);const o=ray.ray.origin.clone(),d=ray.ray.direction;for(let t=0;t<900;t+=2){const px=o.x+d.x*t,pz=o.z+d.z*t,py=o.y+d.y*t;if(py<H(px,pz))return {x:px,z:pz};}return null;}
const toCell=(x,z)=>({i:Math.floor(x/CELL+HALF),j:Math.floor(z/CELL+HALF)});
function screenOf(x,y,z){const v=new THREE.Vector3(x,y,z).project(camera);return {x:(v.x*.5+.5)*innerWidth,y:(-v.y*.5+.5)*innerHeight,ok:v.z<1};}

// ---------- tapping ----------
function tap(x,y,type){if(G.modal)return;initAudio();
  if(custOn){if(UI.tool){const g=groundAt(x,y);if(!g)return;const [w,d]=footprint(UI.tool,ghost.rot);ghost.i=Math.round(g.x/CELL+HALF-w/2);ghost.j=Math.round(g.z/CELL+HALF-d/2);refreshGhost();
      if(type==='mouse')confirmPlace();return;}
    if(moving){const g=groundAt(x,y);if(!g)return;const [w,d]=footprint(moving.type,moving.rot);moving.ni=Math.round(g.x/CELL+HALF-w/2);moving.nj=Math.round(g.z/CELL+HALF-d/2);refreshMove();if(type==='mouse')confirmMove();return;}
    const g=groundAt(x,y);if(g){const c=toCell(g.x,g.z);const b=buildingAt(c.i,c.j);selectB(b);}return;}
  // animals
  let best=null,bd=40;for(const a of W.animals){const p=a.g.position;const s=screenOf(p.x,p.y+1,p.z);if(!s.ok)continue;const d=Math.hypot(s.x-x,s.y-y);if(d<bd){bd=d;best=a;}}
  if(best){animalInfo(best);return;}
  const g=groundAt(x,y);if(g&&Math.abs(g.x)<HALF*CELL&&Math.abs(g.z)<HALF*CELL){const c=toCell(g.x,g.z);const b=buildingAt(c.i,c.j);if(b){buildingInfo(b);return;}}
  for(const k of G.s.ai){const s=screenOf(k.x,(k.h||0)+8,k.z);if(s.ok&&Math.hypot(s.x-x,s.y-y)<70){UI.hlKing=k.id;UI.panel=null;openPanel('world');return;}}
  $('info').classList.add('hidden');}
function infoCard(html,bind){const el=$('info');el.innerHTML=html+`<button class="x" style="position:absolute;right:4px;top:4px" id="iX">✕</button>`;el.classList.remove('hidden');$('iX').onclick=()=>el.classList.add('hidden');if(bind)bind(el);}
function buildingInfo(b){const B=BUILDINGS[b.type];const jobs=B.jobs?Object.entries(B.jobs).map(([j,n])=>`${JOBS[j].icon} ${n} ${JOBS[j].name}${n>1?'s':''}`).join(', '):'';const dmg=b.hp<B.hp;
  infoCard(`<b class="serif" style="font-size:17px;color:#f0d79a">${B.icon} ${B.name}</b><div style="font-size:13px;color:#d8c8a8;margin:4px 0">${B.desc}</div>
   <div style="font-size:12px;color:#bba882">${b.prog<1?`🏗️ Under construction: ${Math.floor(b.prog*100)}%`:`Condition: ${Math.round(b.hp/B.hp*100)}%${b.hp<B.hp*.35?' — <b style="color:#ff8a7a">ruined, not working</b>':''}`}${jobs?' · '+jobs:''}</div>
   <div class="acts">${dmg&&b.prog>=1?`<button class="grn" id="iRep">🔨 Repair (${costStr(repairCost(b))})</button>`:''}<button id="iEdit">⚒ Edit in Customize</button></div>`,el=>{
   const r=el.querySelector('#iRep');if(r)r.onclick=()=>{const c=repairCost(b);if(!canAfford(c)){toast('Not enough resources to repair.','bad');return;}pay(c);b.repairing=true;SFX.build();toast('Builders are repairing it.','good');el.classList.add('hidden');};
   el.querySelector('#iEdit').onclick=()=>{el.classList.add('hidden');setCust(true);selectB(b);};});}
function mythInfo(a,A2){const p=a.g.position.clone();const force=(G.s.jobs.soldier||0)+(G.s.jobs.guard||0)+(G.s.jobs.hunter||0);
  if(a.type==='unicorn')infoCard(`<b class="serif" style="font-size:17px;color:#e8d0ff">🦄 A Unicorn</b><div style="font-size:13px;color:#d8c8a8;margin:4px 0">A shimmering unicorn grazes at the forest edge. Your people whisper that it is a sign from the heavens.</div>
   <div class="acts"><button class="grn" id="mA">🙏 Let it bless the land</button><button class="red" id="mB" ${force?'':'disabled'}>🏹 Hunt it for its horn</button></div>`,el=>{
   el.querySelector('#mA').onclick=()=>{el.classList.add('hidden');addRes({faith:40});G.s.happy=Math.min(100,G.s.happy+8);const m='The unicorn bows its head and vanishes in light. +40 faith, +8 happiness.';toast(m,'good');log(m,'good');SFX.good();floatText('+40 ✨',p.x,p.z,p.y+3);removeAnimal(a);};
   el.querySelector('#mB').onclick=()=>{el.classList.add('hidden');addRes({gold:90,faith:-30});G.s.happy=Math.max(0,G.s.happy-15);const m='The unicorn falls. Its horn sells for 90 gold, but the realm feels cursed. −30 faith, −15 happiness.';toast(m,'bad');log(m,'bad');SFX.bad();removeAnimal(a);};});
  else infoCard(`<b class="serif" style="font-size:17px;color:#c8d8b8">👹 Forest Troll</b><div style="font-size:13px;color:#d8c8a8;margin:4px 0">A towering troll stomps through the woods. Trolls hoard treasure, and they smash anything in their way.</div>
   <div class="acts"><button class="red" id="mA" ${force>=4?'':'disabled'}>⚔️ Slay it (${force} fighters)</button><button id="mB">🍖 Feed it 40 food to leave</button></div>${force>=4?'':'<div style="font-size:12px;color:#ff8a7a">You need at least 4 soldiers, guards or hunters.</div>'}`,el=>{
   el.querySelector('#mA').onclick=()=>{el.classList.add('hidden');const dead=Math.random()<.6?ri(1,3):0;G.s.pop=Math.max(3,G.s.pop-dead);clampJobs();addRes({gold:70,iron:15});const m=`The troll is slain! Its hoard holds 70 gold and 15 iron.${dead?` ${dead} brave fighters died.`:''}`;toast(m,'good');log(m,'good');SFX.clang();floatText('+70 🪙',p.x,p.z,p.y+5);removeAnimal(a);};
   el.querySelector('#mB').onclick=()=>{el.classList.add('hidden');if(!canAfford({food:40})){toast('Not enough food','bad');return;}pay({food:40});const m='The troll gobbles the food and lumbers off into the mountains.';toast(m);log(m);removeAnimal(a);};});}
function animalInfo(a){const A2=ANIMALS[a.type];if(A2.myth)return mythInfo(a,A2);const hunters=(G.s.jobs.hunter||0)+(G.s.jobs.soldier||0)+(G.s.jobs.guard||0);
  infoCard(`<b class="serif" style="font-size:17px;color:#f0d79a">${A2.icon} ${A2.name}</b><div style="font-size:13px;color:#d8c8a8;margin:4px 0">${A2.danger?`Dangerous (${'⚠'.repeat(A2.danger)}). `:'Harmless. '}Hunting it gives about ${A2.food} food${A2.danger?' and pelts':''}.</div>
   <div class="acts"><button class="grn" id="iHunt" ${hunters?'':'disabled'}>🏹 Send hunters</button></div>${hunters?'':'<div style="font-size:12px;color:#ff8a7a">You need hunters, guards or soldiers. Build a Hunter\'s Lodge.</div>'}`,el=>{
   el.querySelector('#iHunt').onclick=()=>{el.classList.add('hidden');const p=a.g.position.clone();const risk=A2.danger*.09;let msg=`The hunt succeeds: +${A2.food} food`;addRes({food:A2.food});if(A2.danger){addRes({gold:A2.danger*6});msg+=`, +${A2.danger*6} gold from pelts`;}
     if(Math.random()<risk&&G.s.pop>3){G.s.pop--;clampJobs();msg+='. A hunter was killed.';}floatText(`+${A2.food} 🍖`,p.x,p.z,p.y+3);removeAnimal(a);toast(msg,'good');SFX.coin();log(msg);};});}

// ---------- customize mode ----------
let custOn=false,selB=null,moving=null;const ghost={i:0,j:0,rot:0};
function setCust(on){custOn=on;$('bCustom').classList.toggle('on',on);$('bCustom').textContent=on?'✓ Done':'⚒ Customize';$('custBar').classList.toggle('hidden',!on);$('nav').classList.toggle('hidden',on);W.grid.visible=on;$('info').classList.add('hidden');
  if(G.s.tut<TUT.length&&!$('tip').classList.contains('hidden'))$('tip').classList.toggle('cust',on);if(on){closePanel();UI.ctab=UI.ctab||'build';renderCust();cam.tdist=Math.min(cam.tdist,110);if(Math.hypot(cam.tx,cam.tz)>70){cam.tx=0;cam.tz=8;}}else{selectTool(null);selectB(null);}placeActRow();}
$('bCustom').onclick=()=>{initAudio();SFX.click();setCust(!custOn);if(custOn&&G.s.tut<=3)tutorial(4);else if(G.s.tut<TUT.length)tutorial(G.s.tut);};
document.querySelectorAll('#custBar .tabs button').forEach(b=>b.onclick=()=>{SFX.click();if(b.dataset.t==='done'){setCust(false);return;}UI.ctab=b.dataset.t;if(UI.ctab!=='build')selectTool(null);renderCust();placeActRow();});
function nearFree(t,i0,j0,rot){for(let r=0;r<GRID;r++)for(let di=-r;di<=r;di++)for(let dj=-r;dj<=r;dj++){if(Math.max(Math.abs(di),Math.abs(dj))!==r)continue;if(canPlace(t,i0+di,j0+dj,rot))return {i:i0+di,j:j0+dj};}return {i:i0,j:j0};}
function selectTool(t){UI.tool=t;selectB(null);setGhost(t,ghost.rot);if(t){const g=groundAt(innerWidth/2,innerHeight*.4)||{x:0,z:0};const [w,d]=footprint(t,ghost.rot);const f=nearFree(t,clamp(Math.round(g.x/CELL+HALF-w/2),0,GRID-w),clamp(Math.round(g.z/CELL+HALF-d/2),0,GRID-d),ghost.rot);ghost.i=f.i;ghost.j=f.j;refreshGhost();}renderCustIfBuild();actRow();}
function renderCustIfBuild(){if(UI.ctab==='build'&&custOn)renderCust();}
function refreshGhost(){if(!UI.tool)return;placeGhost(ghost.i,ghost.j,ghost.rot,canPlace(UI.tool,ghost.i,ghost.j,ghost.rot)&&canAfford(BUILDINGS[UI.tool].cost));actRow();}
function hoverPlace(x,y){const g=groundAt(x,y);if(!g)return;const [w,d]=footprint(UI.tool,ghost.rot);const ni=Math.round(g.x/CELL+HALF-w/2),nj=Math.round(g.z/CELL+HALF-d/2);if(ni!==ghost.i||nj!==ghost.j){ghost.i=ni;ghost.j=nj;refreshGhost();}}
function confirmPlace(){const t=UI.tool;const r=place(t,ghost.i,ghost.j,ghost.rot);if(typeof r==='string'){toast(r,'bad');SFX.bad();return;}SFX.build();syncBuildings(0);toast(`${BUILDINGS[t].icon} ${BUILDINGS[t].name} placed. Builders are on it.`,'good');
  if(G.s.tut===4)tutorial(5);if(!BUILDINGS[t].repeat){selectTool(null);}else refreshGhost();renderCustIfBuild();}
function selectB(b){selB=b;moving=null;showSel(b);if(b&&UI.tool){UI.tool=null;setGhost(null);}actRow();}
function refreshMove(){if(!moving)return;placeGhost(moving.ni,moving.nj,moving.rot,canPlace(moving.type,moving.ni,moving.nj,moving.rot,moving.b.id));actRow();}
function confirmMove(){if(moveBuilding(moving.b,moving.ni,moving.nj,moving.rot)){SFX.build();const b=moving.b;moving=null;setGhost(null);selectB(b);}else{toast('That spot is blocked.','bad');}}
function doDemolish(){const b=selB;if(!b)return;if(BUILDINGS[b.type].fixed){toast('The castle cannot be demolished.','bad');return;}demolish(b);SFX.hit();selectB(null);toast(`${BUILDINGS[b.type].name} demolished (resources partly refunded).`);}
function actRow(){const el=$('actRow');if(!custOn){el.classList.add('hidden');return;}let h='';
  if(UI.tool){const B=BUILDINGS[UI.tool];const ok=canPlace(UI.tool,ghost.i,ghost.j,ghost.rot);const af=canAfford(B.cost);
    h=`<span class="lbl2">${B.icon} ${B.name}: ${!af?'<span style="color:#ff8a7a">not enough resources</span>':!ok?'<span style="color:#ff8a7a">blocked, tap another spot</span>':isTouch?'tap the ground to move':'click to place'}</span><button class="btn sm dark" id="aRot">↻ Rotate</button><button class="btn sm gold" id="aOk" ${ok&&af?'':'disabled'}>✓ Place</button><button class="btn sm dark" id="aNo">✕</button>`;}
  else if(moving){h=`<span class="lbl2">Moving ${BUILDINGS[moving.type].name}: tap a new spot</span><button class="btn sm dark" id="mRot">↻</button><button class="btn sm gold" id="mOk">✓ Move here</button><button class="btn sm dark" id="mNo">✕</button>`;}
  else if(selB){const B=BUILDINGS[selB.type];h=`<span class="lbl2">${B.icon} ${B.name}${selB.prog<1?` (${Math.floor(selB.prog*100)}%)`:''}</span>${B.fixed?'':`<button class="btn sm dark" id="sMove">✥ Move</button><button class="btn sm dark" id="sRot">↻ Rotate</button>`}${selB.hp<B.hp&&selB.prog>=1?`<button class="btn sm" id="sRep">🔨 Repair</button>`:''}${B.fixed?'':`<button class="btn sm" id="sDel">🗑 Remove</button>`}<button class="btn sm dark" id="sNo">✕</button>`;}
  else h=`<span class="lbl2">Pick a building below, or tap one of yours to move, rotate or remove it.</span>`;
  el.innerHTML=h;el.classList.remove('hidden');placeActRow();
  const on=(id,f)=>{const b=$(id);if(b)b.onclick=()=>{SFX.click();f();};};
  on('aRot',()=>{ghost.rot=(ghost.rot+1)%4;setGhost(UI.tool,ghost.rot);refreshGhost();});on('aOk',confirmPlace);on('aNo',()=>selectTool(null));
  on('mRot',()=>{moving.rot=(moving.rot+1)%4;setGhost(moving.type,moving.rot);refreshMove();});on('mOk',confirmMove);on('mNo',()=>{moving=null;setGhost(null);selectB(selB);});
  on('sMove',()=>{const b=selB;moving={b,type:b.type,rot:b.rot,ni:b.i,nj:b.j};setGhost(b.type,b.rot);refreshMove();});on('sRot',()=>{const b=selB;const nr=(b.rot+1)%4;if(!moveBuilding(b,b.i,b.j,nr)){toast('No room to rotate here.','bad');}else showSel(b);});
  on('sRep',()=>{const c=repairCost(selB);if(!canAfford(c)){toast('Need '+costStr(c),'bad');return;}pay(c);selB.repairing=true;toast('Repairing…','good');});on('sDel',doDemolish);on('sNo',()=>selectB(null));}
function placeActRow(){const el=$('actRow');if(el.classList.contains('hidden'))return;const cb=$('custBar');const r=cb.getBoundingClientRect();el.style.bottom=(innerHeight-r.top+6)+'px';el.style.top='auto';}
addEventListener('resize',placeActRow);

// ---------- nav & settings ----------
document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>{initAudio();openPanel(b.dataset.p);if(G.s.tut===5&&b.dataset.p)tutorial(6);});
$('pClose').onclick=closePanel;
$('bKing').onclick=()=>{SFX.click();G.hooks.editKingdom();};$('topL').onclick=()=>{SFX.click();G.hooks.editKingdom();};
$('bSet').onclick=()=>{SFX.click();modal(`<h2>⚙ Settings</h2>
  <div class="lbl">Graphics quality</div><div class="seg" id="gq">${['low','medium','high'].map(q=>`<button data-q="${q}" class="${q===GQ?'on':''}">${q[0].toUpperCase()+q.slice(1)}</button>`).join('')}</div><div style="font-size:12px;color:#bba882;margin-top:4px">Low is smoothest on older phones. High has shadows, more trees and the richest lighting.</div>
  <div class="lbl">Sound</div><div class="seg"><button id="sMus" class="${AU.music?'on':''}">🎵 Music ${AU.music?'on':'off'}</button><button id="sSfx" class="${AU.sfx?'on':''}">🔊 Effects ${AU.sfx?'on':'off'}</button></div>
  <div class="lbl">Kingdom</div><button class="choice" id="sSave"><b>💾 Save now</b><small>The game also saves automatically.</small></button><button class="choice" id="sTut"><b>🎓 Replay the tutorial</b></button><button class="choice" id="sQuit"><b>🏰 Back to title</b></button><button class="choice" id="sNew"><b style="color:#ff8a7a">🔥 Abandon kingdom &amp; start over</b></button>
  <button class="btn gold" id="sClose" style="width:100%;margin:10px 0 0">Close</button>`,c=>{
  c.querySelectorAll('#gq button').forEach(b=>b.onclick=()=>{save();localStorage.setItem('ac_gfx',b.dataset.q);localStorage.setItem('ac_gfx_user','1');location.reload();});
  $('sMus').onclick=()=>{setMusic(!AU.music);$('bSet').onclick();};$('sSfx').onclick=()=>{setSfx(!AU.sfx);$('bSet').onclick();};
  $('sSave').onclick=()=>{save();toast('Kingdom saved.','good');closeModal();};$('sTut').onclick=()=>{closeModal();tutorial(0);};$('sQuit').onclick=()=>{save();location.reload();};
  $('sNew').onclick=()=>{if(confirm('Abandon '+G.s.name+' forever?')){localStorage.removeItem(SAVE);started=false;location.reload();}};$('sClose').onclick=closeModal;});};
$('bHelp').onclick=()=>{SFX.click();modal(`<h2>📖 How to Rule</h2><p style="font-size:14px">
<b>Camera:</b> drag to move, pinch or scroll to zoom, two-finger twist (or right-drag, Q/E) to rotate.<br>
<b>⚒ Customize</b> (top right): build, move, rotate and remove buildings on the grid around your castle; assign citizens to jobs; invent new jobs.<br>
<b>Resources:</b> farmers feed everyone; houses let your population grow; taxes and merchants bring gold; soldiers cost gold each day.<br>
<b>👑 Rule:</b> royal decisions like festivals, hunts and levies. <b>📜 Laws:</b> taxes, rations, work hours, conscription, curfew, religion and more, each with trade-offs.<br>
<b>🌍 World:</b> rival kingdoms (each with its own personality), the zombie Rotlands and the demon Hellmouth. Gift, trade, ally, demand tribute, declare war and send your army. Beaten kingdoms become your vassals.<br>
<b>Scenarios:</b> every 2–5 minutes something happens: wolves, plague, hordes, fires, rebels. Choose wisely.<br>
<b>🏟️ The Arena:</b> every month (3 minutes) each kingdom sends 3 tributes. Fight as your champion (joystick + ⚔️ attack + 💨 dodge, or WASD + Space + Shift) or watch. The last kingdom standing wins and its champion becomes <b style="color:#ffd060">Immortal</b>: +30% army strength forever.<br>
<b>Tap</b> an animal to hunt it, a building for info and repairs, a kingdom's name for diplomacy.</p><button class="btn gold" id="hClose" style="width:100%">Got it</button>`,c=>{$('hClose').onclick=closeModal;});};

// ---------- tutorial ----------
const TUT=[
 {t:()=>`👑 <b>Hail, ${G.s.ruler||'ruler'} of ${G.s.name}!</b> Your castle stands at the heart of the realm, surrounded by forests full of deer, wolves and bears.`},
 {t:()=>`🖐 <b>Drag</b> to look around, <b>pinch</b> to zoom and <b>twist two fingers</b> to rotate. ${isTouch?'':'(Mouse: drag, scroll wheel, right-drag. Keys: WASD, Q/E.)'}`},
 {t:()=>`📊 Your resources are at the top. Food keeps people alive, houses let the population grow, and gold pays your soldiers. Tap any of them for details.`,hl:'resBar'},
 {t:()=>`⚒ Tap <b>Customize</b> in the top right. That's where you build, move and remove buildings, and assign jobs.`,hl:'bCustom',wait:true},
 {t:()=>`🏗️ Pick a building from the bar (try a <b>House</b> or a <b>Farm</b>), tap an empty spot on the grid, then tap <b>✓ Place</b>. Builders will raise it.`,wait:true},
 {t:()=>`👷 The <b>Jobs</b> tab lets you move citizens between jobs, and <b>New Job</b> lets you invent your own. Tap <b>✓ Done</b>, then open <b>📜 Laws</b> or <b>👑 Rule</b> at the bottom.`,hl:'nav',wait:true},
 {t:()=>`🌍 <b>World</b> lists the other kingdoms: make alliances, trade or declare war. Beware the zombie <b>Rotlands</b> and the demon <b>Hellmouth</b>.`},
 {t:()=>`⚔ Every month (3 minutes) the <b>Arena Games</b> are held. The countdown is in the top left. The winner's champion becomes <b>Immortal</b>.`,hl:'kArena'},
 {t:()=>`📜 Every few minutes a <b>scenario</b> will test your rule, each with several choices. Long live ${G.s.name}!`},
];
function tutorial(i){document.querySelectorAll('.hl-el').forEach(e=>e.classList.remove('hl-el'));G.s.tut=i;const el=$('tip');if(i>=TUT.length){el.classList.add('hidden');G.s.tut=99;save();return;}
  const T=TUT[i];el.innerHTML=`<p>${T.t()}</p><div style="display:flex;justify-content:space-between;align-items:center"><button class="btn sm dark" id="tSkip">Skip tutorial</button><span style="font-size:11px;color:#9a8a6a">${i+1}/${TUT.length}</span>${T.wait?'':`<button class="btn sm gold" id="tNext">Next ▶</button>`}</div>`;el.classList.remove('hidden');
  if(T.hl&&$(T.hl))$(T.hl).classList.add('hl-el');$('tSkip').onclick=()=>tutorial(99);if($('tNext'))$('tNext').onclick=()=>{SFX.click();tutorial(i+1);};
  el.classList.toggle('cust',custOn);el.style.bottom=custOn?'auto':'';el.style.top=custOn?'calc(max(10px,env(safe-area-inset-top)) + 110px)':'';}
const _setCust=setCust;

// ---------- scenarios ----------
function runEvent(e){if(!e)return;const c=startEvent(e);SFX.event();setMode('tension');G.modal=true;
  const show=()=>modal(`<div class="ic">${e.icon}</div><h2>${e.title}</h2><p>${e.text(c)}</p>${e.opts.map((o,i)=>{const ok=!o.can||o.can(c);return `<button class="choice" data-i="${i}" ${ok?'':'disabled'}><b>${o.t}</b>${o.hint?`<small>${o.hint}</small>`:''}</button>`;}).join('')}`,card=>{
    card.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{SFX.click();const r=resolveEvent(e,c,+b.dataset.i);modal(`<div class="ic">${e.icon}</div><h2>${e.title}</h2><p>${r}</p><button class="btn gold" id="evOk" style="width:100%">Continue</button>`,cc=>{$('evOk').onclick=()=>{closeModal();setMode('kingdom');updateLabels(true);if(UI.panel)renderPanel();};});});});
  show();}
window.__dbg={G,W,event:id=>{const e=EVENTS.find(e=>e.id===id)||pickEvent();if(!(e.w()>0))return false;runEvent(e);return true;},arena:()=>arenaIntro(),res:()=>addRes({gold:999,wood:999,stone:999,iron:200,food:500,faith:200}),place:(t,i,j,r=0)=>place(t,i,j,r),tick:s=>tick(s),setCust,selectTool,confirmPlace,ghost,cam,selectB,save,freeSpot:(t)=>{const g=groundAt(innerWidth/2,innerHeight*.35)||{x:0,z:0};const [w,d]=footprint(t,0);const f=nearFree(t,Math.round(g.x/CELL+HALF-w/2)+1,Math.round(g.z/CELL+HALF-d/2),0);const c=cellCenter(f.i,f.j,t,0);return Object.assign(screenOf(c.x,BASE_Y,c.z),f);},cellScreen:(i,j,t='house')=>{const c=cellCenter(i,j,t,0);return screenOf(c.x,BASE_Y,c.z);},march:(id)=>{const k=G.s.ai.find(x=>x.id===id);G.hooks.march('ai',k,20);}};

// ---------- arena flow ----------
function arenaIntro(){if(A.active)return;closePanel();setCust(false);$('info').classList.add('hidden');SFX.horn();
  const s=G.s;const cands=[];for(let i=0;i<6;i++)cands.push(makeCandidate());const L=law('arena');let sel=L.random?[0,1,2].map(()=>Math.floor(Math.random()*6)):[];
  if(L.random){sel=[...new Set(sel)];while(sel.length<3){const r=Math.floor(Math.random()*6);if(!sel.includes(r))sel.push(r);}}
  const ks=arenaKingdoms();
  const render=()=>modal(`<div class="ic">🏟️</div><h2>The Arena Games of ${dateStr().split('·')[1]}</h2><p style="font-size:14px">The horns sound across the realm. <b>${ks.length} kingdoms</b> each send three tributes: ${ks.map(k=>`${k.emblem} ${k.name}`).join(', ')}.<br>${L.random?'<b>The Reaping has chosen your tributes.</b>':'<b>Choose your three tributes.</b>'}</p>
    <div>${cands.map((c,i)=>`<button class="cand ${sel.includes(i)?'on':''}" data-i="${i}" ${L.random?'disabled':''}><b>${c.name}</b> <small style="color:#bba882">${c.job}</small>${sel.indexOf(i)===0?' <small style="color:#ffd060">⭐ champion</small>':''}<div class="bars">${['str','agi','grit'].map(k=>`<div>${{str:'💪',agi:'🏃',grit:'🛡️'}[k]}<i><u style="width:${c[k]*10}%"></u></i>${c[k]}</div>`).join('')}</div></button>`).join('')}</div>
    <div style="font-size:12px;color:#bba882;margin:6px 0">💪 strength = damage · 🏃 agility = speed · 🛡️ grit = health. The first one you pick is your champion.</div>
    <button class="choice" id="aF" ${sel.length===3?'':'disabled'}><b>⚔️ Fight as my champion</b><small>Joystick + attack + dodge (WASD, Space, Shift on a computer)</small></button>
    <button class="choice" id="aW" ${sel.length===3?'':'disabled'}><b>👁 Watch the games</b><small>Your tributes fight on their own</small></button>
    ${L.random?'':`<button class="btn sm dark" id="aAuto">Pick the strongest for me</button>`}`,c=>{
    c.querySelectorAll('.cand').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;if(sel.includes(i))sel=sel.filter(x=>x!==i);else if(sel.length<3)sel.push(i);render();});
    if($('aAuto'))$('aAuto').onclick=()=>{sel=cands.map((c,i)=>[c.str+c.agi+c.grit,i]).sort((a,b)=>b[0]-a[0]).slice(0,3).map(x=>x[1]);render();};
    const go=mode=>{closeModal();const trib=[];const R=RELIGIONS[s.religion].fx;const mult=(R.trib||1)*L.trib;
      sel.forEach((i,n)=>{const c=cands[i];trib.push({kid:0,kname:s.name,name:c.name,str:c.str*mult,agi:c.agi*mult,grit:c.grit*mult,c1:s.c1,c2:s.c2,emblem:s.emblem,kind:'human',mine:true,isPlayer:mode==='fight'&&n===0});});
      for(const k of ks.slice(1)){const lv=(k.kind==='human'?4.6:5)+Math.min(3,s.arenaCount*.4)+k.imm*.5;for(let j=0;j<3;j++){const st=()=>clamp(Math.round(lv+rnd(-2,2.5)),1,10);trib.push({kid:k.id,kname:k.name,name:k.race==='elf'?pick(['Elowen','Faelar','Sylas','Arwen','Thranduil','Nimue']):k.race==='dwarf'?pick(['Gimrik','Brokka','Dwalin','Hilda','Thorgar','Balin']):k.kind==='orc'?pick(['Gorbag','Snaga','Urzog','Muzgash','Bolg','Shagrat']):k.kind==='human'?pick(['Brann','Sela','Corvin','Isha','Darro','Mirel','Tavish','Odile','Gareth','Ysolde','Kade','Lyra']):k.kind==='zombie'?pick(['Rotjaw','Hollow','Moaner','Grim','Bones','Shamble']):pick(['Imp','Scorch','Vexa','Cinder','Hex','Brim']),str:st(),agi:st(),grit:st(),c1:k.c1,c2:k.c2,emblem:k.emblem,kind:k.kind,race:k.race,mine:false,isPlayer:false});}}
      $('hud').classList.add('hidden');$('tip').classList.add('hidden');startArena(trib,mode,arenaEnd);};
    $('aF').onclick=()=>go('fight');$('aW').onclick=()=>go('watch');});
  render();}
function arenaEnd(kid,champ,kname,myDead,kills){const s=G.s;arenaResult(kid,champ,myDead);if(kid!==0){const k=s.ai.find(x=>x.id===kid);if(k)s.immortals.push({name:champ,kingdom:kname,mine:false,month:s.month});}
  s.monthStart=s.time;s.month++;syncHeroes();$('hud').classList.remove('hidden');setMode('kingdom');save();
  const mine=kid===0;
  modal(`<div class="ic">${mine?'🏆':'⚜'}</div><h2>${mine?'VICTORY!':'The Games Are Over'}</h2><p style="text-align:center;font-size:16px"><b style="color:#ffd060;font-size:20px">${champ}</b> of <b>${kname}</b><br>is the last kingdom standing with ${kills} kill${kills===1?'':'s'}, and is now</p>
   <div style="text-align:center;font-size:34px;font-weight:900;letter-spacing:.2em;color:#ffe39a;text-shadow:0 0 20px #ff9a2a" class="serif">IMMORTAL</div>
   <p>${mine?`${champ} returns home a living legend. The people celebrate, and your armies fight with <b>+30% strength</b> while the Immortal leads them.`:`${kname} grows stronger with an Immortal leading its armies.`}${myDead?` <br><span style="color:#ffb0a0">${myDead} of your tributes did not come home.</span>`:' All your tributes survived!'}</p>
   <button class="btn gold" id="arOk" style="width:100%">Return to ${s.name}</button>`,c=>{$('arOk').onclick=()=>{closeModal();if(mine){cam.tx=0;cam.tz=14;cam.tdist=40;}};});}
// arena controls
(function(){const joy=$('joy'),kn=$('joyK');let jid=null,cx=0,cy=0;
  joy.addEventListener('pointerdown',e=>{jid=e.pointerId;joy.setPointerCapture(jid);const r=joy.getBoundingClientRect();cx=r.left+r.width/2;cy=r.top+r.height/2;mv(e);});
  const mv=e=>{if(e.pointerId!==jid)return;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy),m=50;if(d>m){dx*=m/d;dy*=m/d;}kn.style.transform=`translate(${dx}px,${dy}px)`;setArenaInput({mx:dx/m,mz:dy/m});};
  joy.addEventListener('pointermove',mv);const up=e=>{if(e.pointerId!==jid)return;jid=null;kn.style.transform='';setArenaInput({mx:0,mz:0});};joy.addEventListener('pointerup',up);joy.addEventListener('pointercancel',up);
  const hold=(id,k)=>{const b=$(id);b.addEventListener('pointerdown',e=>{e.preventDefault();setArenaInput({[k]:true});});const off=()=>setArenaInput({[k]:false});b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);};
  hold('aAtk','atk');hold('aDodge','dodge');
  $('aSkip').onclick=()=>{const s=skipArena();$('aSkip').textContent=`⏩ Speed ×${s}`;};$('aDeadSkip').onclick=()=>{skipArena();skipArena();$('aDeadSkip').textContent='⏩ Fast-forwarding…';};})();
function arenaKeys(){if(!A.active)return;let mx=0,mz=0;if(keys.KeyW||keys.ArrowUp)mz-=1;if(keys.KeyS||keys.ArrowDown)mz+=1;if(keys.KeyA||keys.ArrowLeft)mx-=1;if(keys.KeyD||keys.ArrowRight)mx+=1;if(mx||mz||A._kb){setArenaInput({mx,mz});A._kb=!!(mx||mz);}}

// ---------- adaptive quality ----------
let fpsAcc=0,fpsN=0,slowT=0;
function perf(dt){fpsAcc+=dt;fpsN++;if(fpsAcc>3){const fps=fpsN/fpsAcc;fpsAcc=0;fpsN=0;if(fps<20&&GQ!=='low'&&!localStorage.getItem('ac_gfx_user')){slowT++;if(slowT>=4){localStorage.setItem('ac_gfx',GQ==='high'?'medium':'low');toast('Your device is struggling, so graphics will be one step lower next launch (change anytime in ⚙ Settings).');slowT=-99;}}else slowT=Math.max(0,slowT-1);}}

// ---------- main loop ----------
function loop(now){requestAnimationFrame(loop);let dt=Math.min(.1,(now-last)/1000);last=now;uTime.value+=dt;
  if(A.active){arenaKeys();updateArena(dt);return;}
  if(!started||!G.s){renderer.render(scene,camera);return;}
  const s=G.s;keyCam(dt);
  const paused=G.modal;const calm=G.debug&&location.search.includes('calm');if(!paused){tick(dt);if(calm){s.nextEvent=s.time+999;s.monthStart=Math.max(s.monthStart,s.time-MONTH_SEC()+60);}
    if(s.time>=s.nextEvent){const [a,b]=EVENT_GAP();s.nextEvent=s.time+rnd(a,b);if(!A.active)runEvent(pickEvent());}
    if(s.time-s.monthStart>=MONTH_SEC()&&!G.modal){arenaIntro();}}
  updateCamera(dt);const dl=setDayTime(((s.time/(RATE_SEC()*2))+.08)%1,new THREE.Vector3(cam.x,0,cam.z));scene.fog.density*=clamp(120/cam.dist,.3,1);
  syncBuildings(dt);updateWalkers(dt);updateAnimals(dt,cam);updateArmies(paused?0:dt);updateWorld(dt,cam);
  hudT+=dt;if(hudT>.25){hudT=0;updateHud();updateLabels(false);if(custOn&&(selB||moving))actRow();}
  panelT+=dt;if(panelT>2){panelT=0;if(UI.panel==='rule'||UI.panel==='arena')renderPanel();if(custOn&&UI.ctab==='build')renderCust();updateLabels(true);}
  saveT+=dt;if(saveT>10){saveT=0;save();}
  perf(dt);renderer.render(scene,camera);}
requestAnimationFrame(loop);
// title backdrop: render an empty foggy scene until a game starts
camera.position.set(0,40,90);camera.lookAt(0,0,0);
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(()=>{});
window.__boot=true;
