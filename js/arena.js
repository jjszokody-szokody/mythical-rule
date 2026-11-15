// Mythical Rule — The Arena Games: 3 tributes per kingdom, last kingdom standing earns an Immortal.
import {THREE,renderer,QS,GQ,M,makePerson,animPerson,makeBanner,Particles,boxG,cloth,colMat,rng} from './gfx.js';
import {SFX,setMode} from './audio.js';
import {G,rnd,pick,clamp} from './game.js';
const A={active:false};export {A};
let scene,cam,sun,crowd,fireRing,ringR=34,parts,spark,blood,torchFire,cornu;
const R0=34;
const $=id=>document.getElementById(id);
function build(){scene=new THREE.Scene();scene.background=new THREE.Color(0x1a1a24);scene.fog=new THREE.Fog(0x2a2630,70,170);
  cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.5,400);addEventListener('resize',()=>{cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();});
  scene.add(new THREE.HemisphereLight(0xffe0c0,0x403028,.7));sun=new THREE.DirectionalLight(0xffd8a8,2.2);sun.position.set(30,60,20);scene.add(sun);
  if(QS.shadow){sun.castShadow=true;sun.shadow.mapSize.set(QS.shadow,QS.shadow);const c=sun.shadow.camera;c.left=-45;c.right=45;c.top=45;c.bottom=-45;c.far=150;sun.shadow.bias=-.0005;}
  const floor=new THREE.Mesh(new THREE.CircleGeometry(R0+1,64),M.sand);floor.rotation.x=-Math.PI/2;floor.receiveShadow=!!QS.shadow;M.sand.map.repeat&&0;
  floor.geometry.attributes.uv.array.forEach((v,i,a)=>a[i]=v*10);scene.add(floor);
  // walls and stands
  const N=48;const wallG=boxG(4.6,6,1.5,3);const wall=new THREE.InstancedMesh(wallG,M.stone,N);const m=new THREE.Matrix4();
  for(let i=0;i<N;i++){const a=i/N*Math.PI*2;m.compose(new THREE.Vector3(Math.cos(a)*(R0+1.8),3,Math.sin(a)*(R0+1.8)),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-a+Math.PI/2),new THREE.Vector3(1,1,1));wall.setMatrixAt(i,m);}
  wall.receiveShadow=wall.castShadow=!!QS.shadow;scene.add(wall);
  const tiers=6;const st=new THREE.InstancedMesh(boxG(5.2,1.2,2.4,3),M.stone,N*tiers);let k=0;for(let t=0;t<tiers;t++)for(let i=0;i<N;i++){const a=i/N*Math.PI*2,r=R0+3.5+t*2.3;m.compose(new THREE.Vector3(Math.cos(a)*r,6+t*1.2,Math.sin(a)*r),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),-a+Math.PI/2),new THREE.Vector3(1+t*.07,1,1));st.setMatrixAt(k++,m);}
  st.receiveShadow=!!QS.shadow;scene.add(st);
  // crowd
  const CN=GQ==='low'?600:1400;const cg=new THREE.CapsuleGeometry(.3,.6,2,5);cg.translate(0,.6,0);const cmat=new THREE.MeshStandardMaterial({roughness:.9});
  cmat.onBeforeCompile=sh=>{sh.uniforms.uT=A.uT;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uT;').replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 ip=instanceMatrix[3];transformed.y+=max(0.,sin(uT*6.+ip.x*1.7+ip.z*2.3))*.35;');};
  crowd=new THREE.InstancedMesh(cg,cmat,CN);const cc=new THREE.Color();const r=rng(5);
  for(let i=0;i<CN;i++){const t=Math.floor(r()*tiers),a=r()*Math.PI*2,rr=R0+3.5+t*2.3+(r()-.5)*1.2;m.compose(new THREE.Vector3(Math.cos(a)*rr,6.6+t*1.2,Math.sin(a)*rr),new THREE.Quaternion(),new THREE.Vector3(1,.9+r()*.3,1));crowd.setMatrixAt(i,m);cc.setHSL(r(),.35+r()*.3,.25+r()*.35);crowd.setColorAt(i,cc);}
  scene.add(crowd);
  // pillars & torches
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.2;const p=new THREE.Mesh(new THREE.CylinderGeometry(.9,1.1,7,10),M.stone);p.position.set(Math.cos(a)*(R0-1.5),3.5,Math.sin(a)*(R0-1.5));p.castShadow=!!QS.shadow;scene.add(p);
    const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.9,.5,.6,10),M.metal);bowl.position.set(p.position.x,7.3,p.position.z);scene.add(bowl);}
  // cover rocks
  for(let i=0;i<6;i++){const a=i/6*Math.PI*2+.5,d=13+(i%2)*5;const rk=new THREE.Mesh(new THREE.DodecahedronGeometry(1.8,0),M.rock);rk.position.set(Math.cos(a)*d,.8,Math.sin(a)*d);rk.scale.set(1.2,.8,1);rk.castShadow=rk.receiveShadow=!!QS.shadow;scene.add(rk);}
  // cornucopia
  cornu=new THREE.Group();const pts=[];for(let i=0;i<=24;i++){const t=i/24;pts.push(new THREE.Vector3(Math.sin(t*2.2)*3.2*t,Math.max(0,(1-Math.cos(t*2.2))*1.6)*t+.2,-t*4));}
  const curve=new THREE.CatmullRomCurve3(pts);const tube=new THREE.TubeGeometry(curve,40,1,16,false);const pos=tube.attributes.position;
  for(let i=0;i<pos.count;i++){const seg=Math.floor(i/17)/40;const c=curve.getPoint(seg);const v=new THREE.Vector3(pos.getX(i),pos.getY(i),pos.getZ(i)).sub(c);v.multiplyScalar(2.2*(1-seg)+.15);pos.setXYZ(i,c.x+v.x,c.y+v.y,c.z+v.z);}tube.computeVertexNormals();
  const horn=new THREE.Mesh(tube,M.gold);horn.castShadow=!!QS.shadow;cornu.add(horn);cornu.position.set(0,1.2,1.8);scene.add(cornu);
  // banners of every kingdom around the rim
  A.bannerG=new THREE.Group();scene.add(A.bannerG);
  // fire ring
  fireRing=new THREE.Mesh(new THREE.TorusGeometry(1,.05,6,96),new THREE.MeshBasicMaterial({color:0xff5a10,transparent:true,opacity:.9}));fireRing.rotation.x=-Math.PI/2;fireRing.position.y=.3;scene.add(fireRing);
  parts=new Particles(400,true,0xff6a1a,scene);spark=new Particles(120,true,0xffe0a0,scene);blood=new Particles(120,false,0x8a1010,scene);torchFire=new Particles(200,true,0xffa040,scene);
  A.built=true;}
A.uT={value:0};
const WEAP=[{n:'Sword',m:1.45},{n:'Spear',m:1.35,r:.6},{n:'Axe',m:1.6}];
export function startArena(tributes,mode,onEnd){if(!A.built)build();A.active=true;A.mode=mode;A.onEnd=onEnd;A.t=-3.5;A.speed=1;A.over=false;A.feed=[];A.input={mx:0,mz:0,atk:false,dodge:false};ringR=R0;A.cdSound=3;
  for(const f of A.fighters||[])scene.remove(f.g);A.fighters=[];A.pickups=[];
  while(A.bannerG.children.length)A.bannerG.remove(A.bannerG.children[0]);
  const ks=[...new Set(tributes.map(t=>t.kid))];
  ks.forEach((kid,i)=>{const t=tributes.find(x=>x.kid===kid);for(let j=0;j<2;j++){const a=(i+j*ks.length)/(ks.length*2)*Math.PI*2;const b=makeBanner(t.c1,t.c2,t.emblem,1.6);b.position.set(Math.cos(a)*(R0+2.6),5.5,Math.sin(a)*(R0+2.6));b.rotation.y=-a-Math.PI/2;A.bannerG.add(b);}});
  const n=tributes.length;tributes.forEach((t,i)=>{const a=i/n*Math.PI*2;const kind=t.kind;
    const g=makePerson({kind,shirt:new THREE.Color(t.c1).getHex(),pants:new THREE.Color(t.c2).getHex(),skin:[0xe8c0a0,0xd8a880,0xb08060,0x8a5a3a][i%4],hair:[0x2a1a10,0x8a6a3a,0x1a1a1a,0xc8a060][i%4],weapon:false,cape:kind==='human'?t.c1:null,armor:t.mine&&t.isPlayer});
    const ring=new THREE.Mesh(new THREE.RingGeometry(.55,.75,20),new THREE.MeshBasicMaterial({color:t.c1,transparent:true,opacity:.85}));ring.rotation.x=-Math.PI/2;ring.position.y=.05;g.add(ring);
    g.position.set(Math.cos(a)*22,0,Math.sin(a)*22);g.rotation.y=Math.atan2(-g.position.x,-g.position.z);scene.add(g);
    const kmul=kind==='zombie'?{hp:1.25,sp:.75,dm:1.1}:kind==='demon'?{hp:1,sp:1.1,dm:1.15}:{hp:1,sp:1,dm:1};
    const hp=(70+t.grit*7)*kmul.hp;A.fighters.push({g,t,kid:t.kid,name:t.name,kname:t.kname,hp,max:hp,str:t.str,agi:t.agi,grit:t.grit,sp:(3.4+t.agi*.22)*kmul.sp,dm:kmul.dm,isPlayer:t.isPlayer,alive:true,cd:rnd(0,.5),atk:0,dodge:0,kills:0,weapon:null,tgt:null,fleeT:0,think:0,deadT:0,mine:t.mine,kind});});
  for(let i=0;i<7;i++){const w=pick(WEAP);const a=i/7*Math.PI*2;const mesh=new THREE.Mesh(new THREE.BoxGeometry(.12,1.1,.2),M.metal);mesh.position.set(Math.cos(a)*4.5,.6,Math.sin(a)*4.5+1);mesh.rotation.z=1.2;scene.add(mesh);A.pickups.push({w,mesh});}
  setMode('arena');SFX.gong();buildHud();}
function buildHud(){const h=$('arenaHud');h.classList.remove('hidden');$('aFight').classList.toggle('hidden',A.mode!=='fight');$('aSkip').classList.toggle('hidden',A.mode==='fight');$('aFeed').innerHTML='';$('aCount').textContent='';
  $('aLabels').innerHTML=A.fighters.map((f,i)=>`<div class="alab ${f.mine?'mine':''}" id="al${i}"><b>${f.isPlayer?'⭐ ':''}${f.name}</b><i><u style="background:${f.t.c1}"></u></i></div>`).join('');}
function feed(txt){const el=document.createElement('div');el.textContent=txt;$('aFeed').prepend(el);setTimeout(()=>el.remove(),6000);while($('aFeed').children.length>5)$('aFeed').lastChild.remove();}
function nearestEnemy(f){let best=null,bd=1e9;for(const o of A.fighters){if(!o.alive||o.kid===f.kid)continue;const d=f.g.position.distanceTo(o.g.position)-(o.hp<o.max*.3?3:0);if(d<bd){bd=d;best=o;}}return best;}
function doAttack(f){if(f.cd>0||f.atk>0)return;f.atk=.35;f.cd=Math.max(.45,.9-f.agi*.04);SFX.swing();
  setTimeout(()=>{if(!f.alive||!A.active)return;const fw=new THREE.Vector3(Math.sin(f.g.rotation.y),0,Math.cos(f.g.rotation.y));const range=2.3+(f.weapon&&f.weapon.r||0);let hit=false;
    for(const o of A.fighters){if(!o.alive||o.kid===f.kid||o.dodge>0)continue;const d=o.g.position.clone().sub(f.g.position);const dist=d.length();if(dist>range)continue;d.normalize();if(d.dot(fw)<.35)continue;
      let dmg=(9+f.str*1.7)*(f.weapon?f.weapon.m:1)*f.dm*rnd(.85,1.15)*(1-o.grit*.035)*(f.isPlayer?1.15:1);o.hp-=dmg;hit=true;o.g.position.addScaledVector(d,.9);o.flash=.15;
      blood.emit(o.g.position.x,1.3,o.g.position.z,{vy:1,life:.6,size:.5,grow:.1,alpha:.9,spread:3});spark.emit(o.g.position.x,1.4,o.g.position.z,{vy:1.5,life:.3,size:.5,grow:0,alpha:1,spread:4});
      if(o.hp<=0)kill(o,f);else if(!o.isPlayer&&Math.random()<.5)o.tgt=f;}
    if(hit)(f.weapon?SFX.clang:SFX.hit)();},160/A.speed);}
function kill(o,by){o.alive=false;o.hp=0;o.deadT=0;if(by){by.kills++;}SFX.cannon();feed(`💥 ${o.name} of ${o.kname} has fallen${by?` — ${by.name} (${by.kname})`:' to the fire'}`);
  if(o.weapon){const mesh=new THREE.Mesh(new THREE.BoxGeometry(.12,1.1,.2),M.metal);mesh.position.set(o.g.position.x,.15,o.g.position.z);mesh.rotation.z=Math.PI/2;scene.add(mesh);A.pickups.push({w:o.weapon,mesh});}}
function grab(f){for(const p of A.pickups){if(!f.weapon&&p.mesh.position.distanceTo(new THREE.Vector3(f.g.position.x,p.mesh.position.y,f.g.position.z))<1.4){f.weapon=p.w;scene.remove(p.mesh);A.pickups=A.pickups.filter(x=>x!==p);
  const wm=new THREE.Mesh(new THREE.BoxGeometry(.07,f.weapon.n==='Spear'?1.8:1,.14),f.weapon.n==='Axe'?M.beam:M.metal);wm.position.set(0,-.65,.3);wm.rotation.x=Math.PI/2;f.g.userData.armR.add(wm);if(f.isPlayer)feed(`🗡️ You grabbed a ${f.weapon.n}!`);return;}}}
export function setArenaInput(i){Object.assign(A.input,i);}
export function arenaSpeed(s){A.speed=s;}
export function updateArena(rdt){if(!A.active)return;const dt=Math.min(.05,rdt)*A.speed;A.t+=dt;A.uT.value+=rdt;
  if(A.t<0){const c=Math.ceil(-A.t);if(c!==A.cdSound){A.cdSound=c;if(c<=3)SFX.click();}$('aCount').textContent=c<=3?c:'';}else if($('aCount').textContent&&A.t<1.2){$('aCount').textContent='FIGHT!';if(!A.goSaid){A.goSaid=1;SFX.gong();SFX.cheer();}}else $('aCount').textContent='';
  const shrinkStart=G.fast?14:35;if(A.t>shrinkStart)ringR=Math.max(5,R0-(A.t-shrinkStart)*(G.fast?.8:.5));fireRing.scale.setScalar(ringR);fireRing.visible=ringR<R0-.5;
  if(fireRing.visible&&GQ!=='low'||fireRing.visible&&Math.random()<.5){for(let i=0;i<4;i++){const a=Math.random()*Math.PI*2;parts.emit(Math.cos(a)*ringR,.2,Math.sin(a)*ringR,{vy:3,life:.8,size:1.6,grow:.3,alpha:.9,spread:.4});}}
  for(let i=0;i<8;i++){if(Math.random()<dt*8){const a=i/8*Math.PI*2+.2;torchFire.emit(Math.cos(a)*(R0-1.5),7.7,Math.sin(a)*(R0-1.5),{vy:2,life:.7,size:1.4,grow:.2,alpha:.9,spread:.5});}}
  const live=A.fighters.filter(f=>f.alive);
  for(const f of A.fighters){const p=f.g.position;
    if(!f.alive){f.deadT+=dt;f.g.rotation.x=Math.max(-Math.PI/2,-f.deadT*4);p.y=Math.min(.3,f.deadT*.5)-(f.deadT>3?(f.deadT-3)*.3:0);if(f.deadT>6)f.g.visible=false;continue;}
    f.cd-=dt;f.atk=Math.max(0,f.atk-dt);f.dodge=Math.max(0,f.dodge-dt);if(f.flash>0){f.flash-=dt;}
    let mx=0,mz=0,sp=f.sp;
    if(A.t>0){if(f.isPlayer){mx=A.input.mx;mz=A.input.mz;if(A.input.atk){doAttack(f);}if(A.input.dodge&&f.dodge<=0&&!f.dodgeCd){f.dodge=.35;f.dodgeCd=true;setTimeout(()=>f.dodgeCd=false,900);}if(f.dodge>0)sp*=2.6;
        if(Math.hypot(mx,mz)<.1&&A.input.atk){const e=nearestEnemy(f);if(e&&e.g.position.distanceTo(p)<4)f.g.rotation.y=Math.atan2(e.g.position.x-p.x,e.g.position.z-p.z);}}
      else{f.think-=dt;if(f.think<=0){f.think=rnd(.3,.7);if(!f.weapon&&A.pickups.length&&Math.hypot(p.x,p.z)<16&&Math.random()<.6){const pk=A.pickups.reduce((a,b)=>a.mesh.position.distanceTo(p)<b.mesh.position.distanceTo(p)?a:b);f.goal=pk.mesh.position.clone();}else f.goal=null;
          if(!f.tgt||!f.tgt.alive||Math.random()<.25)f.tgt=nearestEnemy(f);if(f.hp<f.max*.25&&Math.random()<.3)f.fleeT=rnd(1,2.2);}
        let goal=f.goal;if(f.fleeT>0){f.fleeT-=dt;if(f.tgt){const d=p.clone().sub(f.tgt.g.position).setY(0).normalize();goal=p.clone().addScaledVector(d,5);}}
        else if(!goal&&f.tgt)goal=f.tgt.g.position;
        if(Math.hypot(p.x,p.z)>ringR-2)goal=new THREE.Vector3(0,0,0);
        if(goal){const d=goal.clone().sub(p).setY(0);const dist=d.length();if(f.tgt&&goal===f.tgt.g.position&&dist<1.9){f.g.rotation.y=Math.atan2(d.x,d.z);doAttack(f);}else if(dist>.3){d.normalize();mx=d.x;mz=d.z;}
          // strafe a little so fights look less static
          if(f.tgt&&dist<4&&Math.random()<.3){mx+=Math.cos(A.t*3+f.str)*.4;mz+=Math.sin(A.t*3+f.agi)*.4;}}}}
    const ml=Math.hypot(mx,mz);if(ml>.05){const k=Math.min(1,ml);p.x+=mx/ml*k*sp*dt;p.z+=mz/ml*k*sp*dt;if(f.atk<=0||!f.isPlayer)f.g.rotation.y=Math.atan2(mx,mz);}
    // separation
    for(const o of live){if(o===f)continue;const dx=p.x-o.g.position.x,dz=p.z-o.g.position.z,d=Math.hypot(dx,dz);if(d<1&&d>0.001){p.x+=dx/d*(1-d)*.5;p.z+=dz/d*(1-d)*.5;}}
    const r=Math.hypot(p.x,p.z);if(r>R0-.5){p.x*=(R0-.5)/r;p.z*=(R0-.5)/r;}if(Math.hypot(p.x-cornu.position.x,p.z-cornu.position.z+1)<2.6){const d=Math.hypot(p.x,p.z-.8)||1;p.x+=p.x/d*.1;p.z+=(p.z-.8)/d*.1;}
    if(r>ringR&&A.t>0){f.hp-=10*dt;if(Math.random()<dt*6)parts.emit(p.x,1,p.z,{vy:2,life:.5,size:1,grow:.2,alpha:.9});if(f.hp<=0)kill(f,null);}
    grab(f);animPerson(f.g,ml>.05?sp*.5:0,dt,f.atk>0?f.atk/.35:0);
    f.g.traverse(o=>{if(o.isMesh&&o.material.emissive&&o.userData.hit!==undefined){}});
    p.y=f.dodge>0?.2:0;}
  parts.update(dt);spark.update(dt);blood.update(dt);torchFire.update(dt);
  // camera
  const me=A.fighters.find(f=>f.isPlayer&&f.alive);let focus;
  if(me)focus=me.g.position;else{if(!A.spec||!A.spec.alive||Math.random()<dt*.15){const l=A.fighters.filter(f=>f.alive);A.spec=l.length?pick(l):null;}focus=A.spec?A.spec.g.position:new THREE.Vector3();}
  if(A.mode==='watch'&&!me){const ang=A.t*.08;const tp=new THREE.Vector3(focus.x*.6+Math.sin(ang)*22,20,focus.z*.6+Math.cos(ang)*22);cam.position.lerp(tp,.04);A.look=(A.look||new THREE.Vector3()).lerp(focus,.06);cam.lookAt(A.look);}
  else{const tp=new THREE.Vector3(focus.x,me?15:18,focus.z+(me?14:16));cam.position.lerp(tp,me?.12:.05);A.look=(A.look||focus.clone()).lerp(focus,me?.2:.06);cam.lookAt(A.look.x,1,A.look.z);}
  // HUD labels
  const v=new THREE.Vector3();A.fighters.forEach((f,i)=>{const el=$('al'+i);if(!el)return;if(!f.alive){el.style.display='none';return;}v.set(f.g.position.x,2.6,f.g.position.z).project(cam);if(v.z>1){el.style.display='none';return;}
    el.style.display='';el.style.transform=`translate(${(v.x*.5+.5)*innerWidth}px,${(-v.y*.5+.5)*innerHeight}px) translate(-50%,-100%)`;el.lastChild.firstChild.style.width=Math.max(0,f.hp/f.max*100)+'%';});
  if(me){$('aHp').style.width=Math.max(0,me.hp/me.max*100)+'%';}$('aPlayer').classList.toggle('hidden',!A.fighters.some(f=>f.isPlayer));
  $('aDead').classList.toggle('hidden',!(A.mode==='fight'&&!me&&!A.over));
  // standings
  const by={};for(const f of A.fighters){by[f.kid]=by[f.kid]||{n:0,c:f.t.c1,name:f.kname,e:f.t.emblem};if(f.alive)by[f.kid].n++;}
  $('aStand').innerHTML=Object.values(by).map(k=>`<span class="${k.n?'':'out'}" title="${k.name}"><i style="background:${k.c}"></i>${k.e} ${k.n}</span>`).join('')+` <em>🔥 ${ringR<R0-.5?'Ring closing':'Fire ring in '+Math.max(0,Math.ceil(shrinkStart-A.t))+'s'}</em>`;
  // end?
  const kids=new Set(live.map(f=>f.kid));if(!A.over&&A.t>0&&kids.size<=1){A.over=true;let champ=live.sort((a,b)=>b.kills-a.kills||b.hp-a.hp)[0];if(!champ){champ=A.fighters.filter(f=>!f.alive).sort((a,b)=>b.deadT-a.deadT).pop();}
    SFX.cheer();SFX.gong();const myDead=A.fighters.filter(f=>f.mine&&!f.alive).length;feed(`🏆 ${champ.name} of ${champ.kname} is the last kingdom standing!`);
    setTimeout(()=>{A.active=false;$('arenaHud').classList.add('hidden');A.onEnd&&A.onEnd(champ.kid,champ.name,champ.kname,myDead,champ.kills);},2600);}
  renderer.render(scene,cam);}
export function skipArena(){A.speed=A.speed>=4?1:A.speed*2;return A.speed;}
