// Mythical Rule — the living world: kingdom buildings, rival kingdoms, citizens, animals, marching armies.
import {THREE,WORLD,H,buildTerrain,buildRoads,buildGrass,buildForests,scene,camera,QS,GQ,buildingModel,makeBanner,makePerson,animPerson,makeAnimal,animAnimal,ANIMALS,Particles,scaffold,M,rng,Kit,kitPlace,segDist,slopeAt,night} from './gfx.js';
import {G,cellCenter,footprint,DAYLEN,built,rnd,pick,clamp,resolvePlayerAttack,aiAttack,aiById,log} from './game.js';
import {BUILDINGS,JOBS,CELL,GRID,HALF,RELIGIONS} from './data.js';
import {SFX} from './audio.js';
export const W={bmap:new Map(),walkers:[],animals:[],armies:[],aiG:{},heroes:[],grid:null,ghost:null,ghostType:null,sel:null,smoke:null,fire:null,dust:null,labels:[]};
export const BASE_Y=1.5;
let glowTex=null;
function glow(color,size){if(!glowTex){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');const g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.3,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);glowTex=new THREE.CanvasTexture(c);}
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex,color,blending:THREE.AdditiveBlending,transparent:true,depthWrite:false}));s.scale.setScalar(size);return s;}
export {glow};

export function setupWorld(){const s=G.s;WORLD.seed=s.seed;const r=rng(s.seed+11);
  WORLD.sites=[{x:0,z:0,r:72,h:BASE_Y,kind:'player'}];WORLD.mountains=[];WORLD.lakes=[];WORLD.roads=[];
  const farFrom=(x,z,m)=>Math.hypot(x,z)>110&&s.ai.every(k=>Math.hypot(x-k.x,z-k.z)>m);
  for(let t=0;t<200&&WORLD.mountains.length<7;t++){const a=r()*6.28,d=120+r()*170;const x=Math.cos(a)*d,z=Math.sin(a)*d;if(!farFrom(x,z,95))continue;if(WORLD.mountains.some(m=>Math.hypot(m.x-x,m.z-z)<80))continue;WORLD.mountains.push({x,z,r:45+r()*45,h:35+r()*45});}
  for(let t=0;t<200&&WORLD.lakes.length<3;t++){const a=r()*6.28,d=95+r()*140;const x=Math.cos(a)*d,z=Math.sin(a)*d;if(!farFrom(x,z,80))continue;if(WORLD.mountains.some(m=>Math.hypot(m.x-x,m.z-z)<m.r+30))continue;if(s.ai.some(k=>segDist(x,z,0,0,k.x,k.z)<30))continue;WORLD.lakes.push({x,z,r:16+r()*16});}
  for(const k of s.ai){const h=Math.max(1,H(k.x,k.z));WORLD.sites.push({x:k.x,z:k.z,r:44,h,kind:k.kind});k.h=h;WORLD.roads.push([0,0,k.x,k.z]);}
  buildTerrain();buildRoads();
  const avoid=(x,z)=>{if(Math.abs(x)<74&&Math.abs(z)<74)return true;for(const st of WORLD.sites)if(Math.hypot(x-st.x,z-st.z)<st.r+6)return true;for(const rd of WORLD.roads)if(segDist(x,z,rd[0],rd[1],rd[2],rd[3])<12)return true;return false;};
  buildForests(avoid);buildGrass();
  if(QS.particles){W.smoke=new Particles(260,false,0x8a8580);W.fire=new Particles(200,true,0xff7a2a);}W.dust=new Particles(160,false,0xb8a888);W.spark=new Particles(80,true,0xffd080);W.mist=new Particles(120,false,0x7aa070);
  for(const k of s.ai)buildAI(k);
  // build grid overlay
  const cv=document.createElement('canvas');cv.width=cv.height=1024;const x=cv.getContext('2d');x.strokeStyle='rgba(255,240,200,.55)';x.lineWidth=2;const cs=1024/GRID;
  for(let i=0;i<=GRID;i++){x.beginPath();x.moveTo(i*cs,0);x.lineTo(i*cs,1024);x.stroke();x.beginPath();x.moveTo(0,i*cs);x.lineTo(1024,i*cs);x.stroke();}
  x.strokeStyle='rgba(255,210,80,.9)';x.lineWidth=6;x.strokeRect(3,3,1018,1018);
  const gt=new THREE.CanvasTexture(cv);W.grid=new THREE.Mesh(new THREE.PlaneGeometry(GRID*CELL,GRID*CELL),new THREE.MeshBasicMaterial({map:gt,transparent:true,depthWrite:false,opacity:.8}));W.grid.rotation.x=-Math.PI/2;W.grid.position.y=BASE_Y+.08;W.grid.visible=false;W.grid.renderOrder=2;scene.add(W.grid);
  W.selMesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),M.select);W.selMesh.rotation.x=-Math.PI/2;W.selMesh.visible=false;W.selMesh.renderOrder=3;scene.add(W.selMesh);
  for(let i=0;i<QS.animals;i++)spawnAnimal();
  // ambient village folk dust motes / zombie mist
}

// ---------- rival kingdoms ----------
export function buildAI(k){if(W.aiG[k.id]){scene.remove(W.aiG[k.id].g);}const r=rng(k.id*977+G.s.seed);const g=new THREE.Group();g.position.set(k.x,k.h,k.z);const kit=new Kit();const kind=k.alive?k.kind:'zombie';const dead=!k.alive;
  kitPlace(kit,'castle',dead?'zombie':k.kind,0,0,0,r()*6.28,.85);const flags=[];
  const n=k.kind==='human'?13:9;for(let i=0;i<n;i++){const a=i/n*6.28+r()*.3,d=18+r()*12;const type=k.kind==='human'?(i%5===0?'manor':i%4===1?'tavern':'house'):'house';kitPlace(kit,type,k.kind==='human'&&!dead?'human':'zombie',Math.cos(a)*d,0,Math.sin(a)*d,-a+Math.PI/2,1);}
  if(k.kind==='human'){for(let i=0;i<3;i++){const a=i*2.1+r(),d=36;kitPlace(kit,'farm','human',Math.cos(a)*d,0,Math.sin(a)*d,-a,.9);}}
  const N=40;for(let i=0;i<N;i++){const a=i/N*6.28;if(i%10===0){kitPlace(kit,'tower',k.kind==='human'?'human':k.kind,Math.cos(a)*44,0,Math.sin(a)*44,0,1.2);flags.push([Math.cos(a)*44,9.5,Math.sin(a)*44]);continue;}if(dead&&i%3===0)continue;
    kitPlace(kit,k.kind==='human'?'wall':'palisade',k.kind==='human'?'human':k.kind,Math.cos(a)*44,0,Math.sin(a)*44,-a+Math.PI/2,1.75);}
  if(k.kind==='zombie'||dead)for(let i=0;i<22;i++){const a=r()*6.28,d=8+r()*30;kitPlace(kit,'grave','zombie',Math.cos(a)*d,0,Math.sin(a)*d,r()*6,1);}
  if(k.kind==='demon'&&!dead)for(let i=0;i<10;i++){const a=r()*6.28,d=14+r()*26;kit.add(M.lava,new THREE.CircleGeometry(2+r()*2.5,14).rotateX(-Math.PI/2),Math.cos(a)*d,.15,Math.sin(a)*d);kit.add(M.obsidian,new THREE.ConeGeometry(.8,5+r()*6,5),Math.cos(a+.3)*(d+3),3,Math.sin(a+.3)*(d+3));}
  const base=kit.build(true);g.add(base);
  if(!dead){const bm=makeBanner(k.vassal?G.s.c1:k.c1,k.vassal?G.s.c2:k.c2,k.vassal?G.s.emblem:k.emblem,2.4);bm.position.set(0,16,0);g.add(bm);
    for(const f of flags.slice(0,4)){const b=makeBanner(k.vassal?G.s.c1:k.c1,k.vassal?G.s.c2:k.c2,k.vassal?G.s.emblem:k.emblem,1.1);b.position.set(...f);g.add(b);}
    if(k.kind==='demon'){const gl=glow(0xff4a10,60);gl.position.y=8;g.add(gl);} if(k.kind==='zombie'){const gl=glow(0x5aff3a,50);gl.material.opacity=.35;gl.position.y=6;g.add(gl);}}
  // inhabitants
  const folk=[];if(!dead){const cnt=GQ==='low'?3:6;for(let i=0;i<cnt;i++){const p=makePerson({kind:k.kind,shirt:k.kind==='human'?new THREE.Color(k.c1).getHex():k.kind==='zombie'?0x4a4a3a:0x2a0a0a,armor:k.kind==='human'&&i%2===0,helmet:i%2===0,weapon:i%2===0});p.position.set(rnd(-30,30),0,rnd(-30,30));p.userData.tgt=new THREE.Vector3(rnd(-30,30),0,rnd(-30,30));g.add(p);folk.push(p);}}
  scene.add(g);W.aiG[k.id]={g,folk,k};}
export function refreshAI(k){buildAI(k);}

// ---------- player buildings ----------
function makeB(b){const B=BUILDINGS[b.type];const g=new THREE.Group();const s=G.s;
  const m=buildingModel(b.type,{c1:s.c1,c2:s.c2,emblem:s.emblem,relColor:RELIGIONS[s.religion].color});g.add(m);g.userData.model=m;
  const glows=[];const L=LIGHTS[b.type];if(L)for(const q of L){const s2=glow(0xffa040,q[3]||3);s2.position.set(q[0],q[1],q[2]);s2.material.opacity=0;g.add(s2);glows.push(s2);}
  scene.add(g);return {g,i:-1,j:-1,rot:-1,scaf:null,model:m,smokeT:Math.random()*2,hpT:0,glows};}
const LIGHTS={house:[[0,1.6,2.6,2.6]],manor:[[0,1.8,3.6,3]],tavern:[[0,1.6,3.1,3],[2.8,2.4,3.3,2]],castle:[[-1.6,3,8.4,4],[1.6,3,8.4,4],[0,9,-5,5]],barracks:[[0,2,2.4,3]],gate:[[-1.5,3,1.2,3],[1.5,3,1.2,3]],tower:[[0,4,1.9,2.6]],smithy:[[1.2,1.6,1.8,3.5]],temple:[[0,2.5,4.6,4]],market:[[0,2.2,0,5]]};
export function syncBuildings(dt){const s=G.s;const seen=new Set();
  for(const b of s.buildings){seen.add(b.id);let e=W.bmap.get(b.id);if(!e){e=makeB(b);W.bmap.set(b.id,e);}
    if(e.i!==b.i||e.j!==b.j||e.rot!==b.rot){const c=cellCenter(b.i,b.j,b.type,b.rot);e.g.position.set(c.x,BASE_Y,c.z);e.g.rotation.y=-b.rot*Math.PI/2;e.i=b.i;e.j=b.j;e.rot=b.rot;e.cx=c.x;e.cz=c.z;}
    if(b.prog<1){if(!e.scaf){const B=BUILDINGS[b.type];e.scaf=scaffold(B.w,B.d,Math.min(8,3+B.w*1.4));e.g.add(e.scaf);}e.model.scale.y=.08+.92*b.prog;if(Math.random()<dt*2)W.dust.emit(e.cx+rnd(-2,2),BASE_Y+.5,e.cz+rnd(-2,2),{vy:.6,life:1.5,size:1.5,grow:4,alpha:.3});}
    else if(e.scaf){e.g.remove(e.scaf);e.scaf=null;e.model.scale.y=1;for(let i=0;i<14;i++)W.dust.emit(e.cx+rnd(-3,3),BASE_Y+.5,e.cz+rnd(-3,3),{vy:1,life:2,size:2,grow:6,alpha:.35});}
    const B=BUILDINGS[b.type];const dmg=b.prog>=1&&b.hp<B.hp*.6;
    if(dmg&&W.fire){e.hpT-=dt;if(e.hpT<0){e.hpT=b.hp<B.hp*.35?.08:.25;const h=4+Math.random()*3;W.fire.emit(e.cx+rnd(-2,2),BASE_Y+h*.5,e.cz+rnd(-2,2),{vy:2.2,life:.9,size:1.2,grow:.2,alpha:.8,spread:.5});W.smoke.emit(e.cx+rnd(-2,2),BASE_Y+h,e.cz+rnd(-2,2),{vy:2.4,life:5,size:2,grow:9,alpha:.4});}}
    else if(dmg&&!W.fire&&Math.random()<dt*3)W.dust.emit(e.cx,BASE_Y+5,e.cz,{vy:2,life:3,size:2,grow:6,alpha:.4});
    if(W.smoke&&b.prog>=1&&!dmg&&(b.type==='house'||b.type==='tavern'||b.type==='smithy'||b.type==='manor')){e.smokeT-=dt;if(e.smokeT<0){e.smokeT=.5+Math.random()*.6;const off=b.type==='house'?[1.6,6.4,-1]:b.type==='smithy'?[1.6,7,-1.4]:b.type==='manor'?[3.4,7.6,0]:[-2.2,6.6,-1.2];
      const v=new THREE.Vector3(off[0],off[1],off[2]).applyAxisAngle(new THREE.Vector3(0,1,0),-b.rot*Math.PI/2);W.smoke.emit(e.cx+v.x,BASE_Y+v.y,e.cz+v.z,{vy:1.3,life:4.5,size:.8,grow:5,alpha:.28,spread:.4});}}
    if(e.glows.length){const o=b.prog>=1?night.value*.85:0;for(const gl of e.glows)gl.material.opacity=o*(0.85+Math.sin(performance.now()/180+gl.id)*.15);}}
  for(const [id,e] of W.bmap)if(!seen.has(id)){scene.remove(e.g);W.bmap.delete(id);}
}

// ---------- citizens walking to work ----------
function jobSite(job){const J=JOBS[job];const s=G.s;let list=[];
  if(J&&J.bld)for(const t of J.bld.split('|'))list=list.concat(built(t));
  if(job==='builder'){list=s.buildings.filter(b=>b.prog<1||b.hp<BUILDINGS[b.type].hp);if(!list.length)list=built('house');}
  if(job==='soldier'&&built('training').length&&Math.random()<.4)list=built('training');
  if(job==='guard'){const w=built('wall').concat(built('gate'),built('tower'));if(w.length&&Math.random()<.6)list=w;}
  if(job==='idle'){list=built('market').concat(built('well'),built('tavern'),built('garden'));if(!list.length)list=built('castle');}
  if(!list.length)list=s.buildings.filter(b=>b.prog>=1);const b=pick(list);if(!b)return {x:0,z:12};const c=cellCenter(b.i,b.j,b.type,b.rot);const [w,d]=footprint(b.type,b.rot);
  const side=Math.floor(Math.random()*4);const ox=side<2?(side?1:-1)*(w*CELL/2+.8):rnd(-w,w)*1.5,oz=side>=2?(side===3?1:-1)*(d*CELL/2+.8):rnd(-d,d)*1.5;return {x:c.x+ox,z:c.z+oz};}
function homeSite(){const h=built('house').concat(built('manor'));if(!h.length)return {x:rnd(-6,6),z:12};const b=pick(h);const c=cellCenter(b.i,b.j,b.type,b.rot);return {x:c.x+rnd(-3,3),z:c.z+(Math.random()<.5?-1:1)*5};}
let walkerT=0,walkerKey='';
function jobList(){const s=G.s;const l=[];for(const j in s.jobs)for(let i=0;i<s.jobs[j];i++)l.push(j);for(const c of s.customJobs)for(let i=0;i<c.count;i++)l.push('c:'+c.id);while(l.length<s.pop)l.push('idle');return l;}
function walkerLook(job){const J=JOBS[job];const sk=[0xe8c0a0,0xd8a880,0xb08060,0x8a5a3a,0xf0d0b0][Math.floor(Math.random()*5)];const hair=[0x2a1a10,0x5a3a20,0x8a6a3a,0xc8a060,0x1a1a1a][Math.floor(Math.random()*5)];
  if(job==='soldier')return {shirt:new THREE.Color(G.s.c1).getHex(),armor:true,helmet:true,weapon:true,skin:sk,cape:G.s.c1};
  if(job==='guard')return {shirt:new THREE.Color(G.s.c2).getHex(),helmet:true,weapon:true,skin:sk};
  if(job==='priest')return {shirt:0xe8e0d0,hood:true,skin:sk};
  return {shirt:J?J.color:[0x6a5a4a,0x5a6a7a,0x7a4a3a,0x4a5a3a][Math.floor(Math.random()*4)],pants:0x3a3028,hair,skin:sk,tool:job!=='idle'&&job!=='merchant',hood:Math.random()<.2};}
export function updateWalkers(dt){const s=G.s;walkerT-=dt;
  const want=Math.min(QS.people,s.pop);const jl=jobList();
  if(walkerT<=0){walkerT=4;const key=want+'|'+jl.length+'|'+JSON.stringify(s.jobs)+s.customJobs.map(c=>c.count).join();if(key!==walkerKey){walkerKey=key;
      while(W.walkers.length>want){const w=W.walkers.pop();scene.remove(w.g);}
      const step=jl.length/Math.max(1,want);for(let i=0;i<want;i++){const job=jl[Math.floor(i*step)]||'idle';const jb=job.startsWith('c:')?'custom':job;let w=W.walkers[i];
        if(!w||w.job!==jb){if(w)scene.remove(w.g);const g=makePerson(walkerLook(jb));const h=homeSite();g.position.set(h.x,BASE_Y,h.z);scene.add(g);w={g,job:jb,state:'home',t:Math.random()*4,home:h,tgt:null};W.walkers[i]=w;}}}}
  const nt=night.value>.6;
  for(const w of W.walkers){w.t-=dt;const p=w.g.position;
    if(w.tgt){const dx=w.tgt.x-p.x,dz=w.tgt.z-p.z,d=Math.hypot(dx,dz);const sp=w.job==='soldier'?2.6:2;if(d<.4){w.tgt=null;w.t=rnd(3,8);animPerson(w.g,0,dt);}else{p.x+=dx/d*sp*dt;p.z+=dz/d*sp*dt;w.g.rotation.y=Math.atan2(dx,dz);animPerson(w.g,sp,dt);}}
    else{animPerson(w.g,0,dt,w.job!=='idle'&&w.state==='work'&&w.job!=='guard'?(Math.sin(performance.now()/300+w.t)*.5+.5)*.6:0);
      if(w.t<=0){if(w.state==='work'||w.state==='home'&&nt&&w.job!=='guard'){w.state=w.state==='work'?'home':'home';w.home=homeSite();w.tgt=w.home;if(w.state==='home'&&nt)w.g.visible=true;}
        else{w.state='work';w.tgt=jobSite(w.job);w.g.visible=true;}}}
    if(nt&&w.state==='home'&&!w.tgt&&w.job!=='guard')w.g.visible=false;else w.g.visible=true;
    p.y=BASE_Y;}
}

// ---------- animals ----------
function forestPoint(minD=100){for(let t=0;t<60;t++){const a=Math.random()*6.28,d=minD+Math.random()*(320-minD);const x=Math.cos(a)*d,z=Math.sin(a)*d;const y=H(x,z);if(y<0||y>30||slopeAt(x,z)>.6)continue;if(WORLD.sites.some(s=>Math.hypot(x-s.x,z-s.z)<s.r+10))continue;return {x,z};}return {x:150,z:0};}
export function spawnAnimal(type,at,raid){type=type||pick(['deer','deer','deer','boar','boar','wolf','wolf','bear']);const g=makeAnimal(type);const p=at||forestPoint();g.position.set(p.x,H(p.x,p.z),p.z);scene.add(g);
  const a={g,type,home:{x:p.x,z:p.z},tgt:null,t:Math.random()*5,raid,alive:true};W.animals.push(a);return a;}
export function removeAnimal(a){a.alive=false;scene.remove(a.g);W.animals=W.animals.filter(x=>x!==a);setTimeout(()=>{if(W.animals.length<QS.animals)spawnAnimal();},G.fast?5000:60000);}
export function beastRaid(b,type,n){const c=cellCenter(b.i,b.j,b.type,b.rot);const a0=Math.atan2(c.z,c.x)+rnd(-.6,.6);
  for(let i=0;i<n;i++){const st={x:Math.cos(a0)*110+rnd(-8,8),z:Math.sin(a0)*110+rnd(-8,8)};const a=spawnAnimal(type,st,{x:c.x+rnd(-5,5),z:c.z+rnd(-5,5)});a.raidT=12;}
  if(type==='wolf')SFX.howl();}
export function updateAnimals(dt,cam){for(const a of [...W.animals]){const p=a.g.position;const A=ANIMALS[a.type];const far=Math.hypot(p.x-cam.x,p.z-cam.z)>260;if(far&&Math.random()>.1)continue;const ddt=far?dt*10:dt;
    if(a.raid){const dx=a.raid.x-p.x,dz=a.raid.z-p.z,d=Math.hypot(dx,dz);if(d>2){const sp=A.speed*1.6;p.x+=dx/d*sp*ddt;p.z+=dz/d*sp*ddt;a.g.rotation.y=Math.atan2(dx,dz);animAnimal(a.g,sp,ddt);}
      else{a.raidT-=ddt;a.g.rotation.y+=Math.sin(performance.now()/200)*.05;animAnimal(a.g,1.5,ddt);if(Math.random()<ddt*2)W.dust.emit(p.x,p.y+.3,p.z,{vy:.8,life:1,size:1,grow:3,alpha:.35});if(a.raidT<=0){a.raid=null;a.home=forestPoint(100);a.tgt=a.home;}}}
    else if(a.tgt){const dx=a.tgt.x-p.x,dz=a.tgt.z-p.z,d=Math.hypot(dx,dz);const sp=A.speed*(a.flee?2:.35);if(d<1){a.tgt=null;a.flee=false;a.t=rnd(2,7);}else{p.x+=dx/d*sp*ddt;p.z+=dz/d*sp*ddt;a.g.rotation.y=Math.atan2(dx,dz);animAnimal(a.g,sp,ddt);}}
    else{a.t-=ddt;animAnimal(a.g,0,ddt);if(a.t<=0){const tx=a.home.x+rnd(-25,25),tz=a.home.z+rnd(-25,25);if(H(tx,tz)>-.5&&Math.hypot(tx,tz)>85)a.tgt={x:tx,z:tz};else a.t=1;}}
    p.y=H(p.x,p.z);}}

// ---------- marching armies ----------
export function march(side,k,power,onArrive){const s=G.s;const from=side==='player'?{x:0,z:14}:{x:k.x,z:k.z},to=side==='player'?{x:k.x,z:k.z}:{x:0,z:0};
  const n=clamp(Math.round(power/4),3,GQ==='low'?6:12);const g=new THREE.Group();const units=[];const kind=side==='player'?'human':k.kind;const c1=side==='player'?s.c1:k.c1,c2=side==='player'?s.c2:k.c2,em=side==='player'?s.emblem:k.emblem;
  for(let i=0;i<n;i++){const u=makePerson({kind,shirt:new THREE.Color(kind==='human'?c1:kind==='zombie'?'#4a4a3a':'#3a0a0a').getHex(),armor:kind==='human',helmet:kind==='human',weapon:true,cape:kind==='human'?c1:null});u.userData.off={x:(i%4-1.5)*1.6,z:-Math.floor(i/4)*1.8};g.add(u);units.push(u);}
  if(kind==='human'){const b=makeBanner(c1,c2,em,.9);b.position.set(0,1,1.5);g.add(b);}
  if(kind==='demon'){const gl=glow(0xff4a10,10);gl.position.y=2;g.add(gl);}
  scene.add(g);const dist=Math.hypot(to.x-from.x,to.z-from.z);const dur=G.fast?Math.min(14,dist/12):dist/9;
  const a={g,units,from,to,t:0,dur,onArrive,side,k,power,state:'march',clashT:0};W.armies.push(a);return a;}
export function updateArmies(dt){for(const a of [...W.armies]){if(a.state==='march'){a.t+=dt/a.dur;const t=Math.min(1,a.t);const x=a.from.x+(a.to.x-a.from.x)*t,z=a.from.z+(a.to.z-a.from.z)*t;const ang=Math.atan2(a.to.x-a.from.x,a.to.z-a.from.z);
      a.g.position.set(x,0,z);a.g.rotation.y=ang;for(const u of a.units){const wp=u.getWorldPosition(new THREE.Vector3());u.position.set(u.userData.off.x,H(wp.x,wp.z)+0,u.userData.off.z);animPerson(u,a.k&&a.k.kind==='zombie'?.8:2.2,dt);}
      if(Math.random()<dt*4)W.dust.emit(x+rnd(-3,3),H(x,z)+.3,z+rnd(-3,3),{vy:.7,life:2,size:2,grow:5,alpha:.25});
      if(t>=1){a.state='clash';a.clashT=4;if(a.onArrive)a.onArrive(a);}}
    else{a.clashT-=dt;const p=a.g.position;for(const u of a.units){animPerson(u,0,dt,(Math.sin(performance.now()/150+u.userData.off.x)*.5+.5));}
      if(Math.random()<dt*10){W.spark.emit(p.x+rnd(-4,4),H(p.x,p.z)+1.5,p.z+rnd(-4,4),{vy:2,life:.4,size:.6,grow:.1,alpha:1,spread:4});W.dust.emit(p.x+rnd(-5,5),H(p.x,p.z)+.5,p.z+rnd(-5,5),{vy:1,life:2,size:2,grow:6,alpha:.35});}
      if(a.clashT<=0){scene.remove(a.g);W.armies=W.armies.filter(x=>x!==a);}}}}

// ---------- immortal heroes near the castle ----------
export function syncHeroes(){const mine=G.s.immortals.filter(m=>m.mine).slice(-4);while(W.heroes.length>mine.length){scene.remove(W.heroes.pop().g);}
  for(let i=W.heroes.length;i<mine.length;i++){const g=makePerson({shirt:0xd4ac0d,armor:true,helmet:true,weapon:true,skin:0xe0b090});g.traverse(o=>{if(o.isMesh&&o.material===M.metal)o.material=M.gold;});const gl=glow(0xffd060,5);gl.position.y=1.4;g.add(gl);
    g.position.set(-6+i*4,BASE_Y,13.5);g.scale.setScalar(1.25);scene.add(g);W.heroes.push({g,gl});}}
export function updateWorld(dt,cam){const t=performance.now()/1000;
  for(const id in W.aiG){const A=W.aiG[id];for(const p of A.folk){const u=p.userData;const d=p.position.distanceTo(u.tgt);if(d<1)u.tgt.set(rnd(-30,30),0,rnd(-30,30));else{p.position.addScaledVector(u.tgt.clone().sub(p.position).normalize(),dt*(A.k.kind==='zombie'?.7:1.6));p.lookAt(u.tgt.x,p.position.y,u.tgt.z);}
      p.position.y=0;animPerson(p,A.k.kind==='zombie'?.7:1.6,dt);}
    if(A.k.kind==='zombie'&&A.k.alive&&W.mist&&Math.random()<dt*3)W.mist.emit(A.k.x+rnd(-40,40),A.k.h+.5,A.k.z+rnd(-40,40),{vy:.2,life:8,size:6,grow:14,alpha:.18,spread:1});
    if(A.k.kind==='demon'&&A.k.alive&&W.fire&&Math.random()<dt*6)W.fire.emit(A.k.x+rnd(-30,30),A.k.h+.3,A.k.z+rnd(-30,30),{vy:3,life:1.2,size:1.4,grow:.2,alpha:.8});}
  for(const h of W.heroes){h.g.rotation.y=Math.sin(t*.4)*.6;h.gl.material.opacity=.6+Math.sin(t*3)*.3;}
  if(W.smoke)W.smoke.update(dt);if(W.fire)W.fire.update(dt);W.dust.update(dt);W.spark.update(dt);W.mist.update(dt);}

// ---------- customize helpers ----------
export function setGhost(type,rot){if(W.ghost){scene.remove(W.ghost);W.ghost=null;}W.ghostType=type;if(!type)return;
  const g=new THREE.Group();const m=buildingModel(type,{c1:G.s.c1,c2:G.s.c2,emblem:G.s.emblem});m.traverse(o=>{if(o.isMesh){o.material=M.ghostOk;o.castShadow=false;}});g.add(m);
  const B=BUILDINGS[type];const fp=new THREE.Mesh(new THREE.PlaneGeometry(B.w*CELL-.3,B.d*CELL-.3),M.ghostOk);fp.rotation.x=-Math.PI/2;fp.position.y=.12;g.add(fp);g.userData.m=m;
  scene.add(g);W.ghost=g;W.ghost.visible=false;}
export function placeGhost(i,j,rot,ok){if(!W.ghost)return;const c=cellCenter(i,j,W.ghostType,rot);W.ghost.position.set(c.x,BASE_Y,c.z);W.ghost.rotation.y=-rot*Math.PI/2;W.ghost.visible=true;const mat=ok?M.ghostOk:M.ghostBad;W.ghost.traverse(o=>{if(o.isMesh)o.material=mat;});}
export function showSel(b){if(!b){W.selMesh.visible=false;return;}const [w,d]=footprint(b.type,b.rot);const c=cellCenter(b.i,b.j,b.type,b.rot);W.selMesh.scale.set(w*CELL,d*CELL,1);W.selMesh.position.set(c.x,BASE_Y+.15,c.z);W.selMesh.visible=true;}
