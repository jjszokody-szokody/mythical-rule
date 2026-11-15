// Mythical Rule — rendering: renderer, quality, PBR textures, terrain, forests, sky, day/night, procedural models.
import * as THREE from 'three';
import {Sky} from 'three/addons/objects/Sky.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export {THREE};

export const isTouch = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window);
const savedQ = localStorage.getItem('ac_gfx');
export const GQ = ['low','medium','high'].includes(savedQ) ? savedQ : (isTouch ? 'medium' : 'high');
const DPR = window.devicePixelRatio || 1;
export const QS = {
  low:   {pr:Math.min(1,DPR), shadow:0, trees:900, seg:110, sky:false, people:14, animals:12, particles:false},
  medium:{pr:Math.min(1.5,DPR), shadow:1024, trees:1900, seg:150, sky:true, people:28, animals:20, particles:true},
  high:  {pr:Math.min(2,DPR), shadow:2048, trees:3200, seg:210, sky:true, people:44, animals:28, particles:true},
}[GQ];

// ---------- seeded random ----------
export function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(x,z){const s=Math.sin(x*127.1+z*311.7)*43758.5453;return s-Math.floor(s);}
function vnoise(x,z){const xi=Math.floor(x),zi=Math.floor(z),xf=x-xi,zf=z-zi;const u=xf*xf*(3-2*xf),v=zf*zf*(3-2*zf);
  const a=hash2(xi,zi),b=hash2(xi+1,zi),c=hash2(xi,zi+1),d=hash2(xi+1,zi+1);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
export function fbm(x,z,o=4){let s=0,a=.5,f=1;for(let i=0;i<o;i++){s+=a*vnoise(x*f,z*f);f*=2.03;a*=.5;}return s;}
function ridge(x,z){let s=0,a=.5,f=1;for(let i=0;i<4;i++){s+=a*(1-Math.abs(vnoise(x*f,z*f)*2-1));f*=2.1;a*=.5;}return s;}
const sstep=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

// ---------- world layout (filled by setupWorld) ----------
export const WORLD = {R:420, sites:[], mountains:[], lakes:[], roads:[], seed:1};
export function segDist(px,pz,x1,z1,x2,z2){const dx=x2-x1,dz=z2-z1;const t=Math.max(0,Math.min(1,((px-x1)*dx+(pz-z1)*dz)/(dx*dx+dz*dz)));return Math.hypot(px-x1-t*dx,pz-z1-t*dz);}
export function H(x,z){
  const d=Math.hypot(x,z);
  let h=(fbm(x*.007+3,z*.007+7)-.45)*22*sstep(40,180,d)+ (fbm(x*.04,z*.04,3)-.5)*2.2;
  h+=sstep(250,390,d)*(30+ridge(x*.011,z*.011)*75);
  for(const m of WORLD.mountains){const dd=Math.hypot(x-m.x,z-m.z);if(dd<m.r){const k=1-dd/m.r;h+=m.h*Math.pow(k,1.5)*(.55+.7*ridge(x*.02+m.x,z*.02));}}
  for(const l of WORLD.lakes){const dd=Math.hypot(x-l.x,z-l.z);if(dd<l.r*1.6){h=h+(-4.5-h)*sstep(l.r*1.6,l.r*.75,dd);}}
  for(const s of WORLD.sites){const dd=Math.hypot(x-s.x,z-s.z);if(dd<s.r+38){h=h+(s.h-h)*sstep(s.r+38,s.r,dd);}}
  return h;
}
export function slopeAt(x,z){const e=1.5;return Math.hypot(H(x+e,z)-H(x-e,z),H(x,z+e)-H(x,z-e))/(2*e);}

// ---------- renderer / scene ----------
export let renderer, scene, camera, sun, hemi, sky=null, stars, uTime={value:0};
export function initRenderer(canvas){
  renderer=new THREE.WebGLRenderer({canvas,antialias:GQ!=='low',powerPreference:'high-performance'});
  renderer.setPixelRatio(QS.pr);renderer.setSize(innerWidth,innerHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.9;
  if(QS.shadow){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
  scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x9aa7a8,.0032);scene.background=new THREE.Color(0x9aa7a8);
  camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.5,3200);
  hemi=new THREE.HemisphereLight(0xc8d8ff,0x3a3020,.55);scene.add(hemi);
  sun=new THREE.DirectionalLight(0xfff0d8,2.2);sun.position.set(80,120,40);scene.add(sun);scene.add(sun.target);
  if(QS.shadow){sun.castShadow=true;sun.shadow.mapSize.set(QS.shadow,QS.shadow);const c=sun.shadow.camera;c.left=-90;c.right=90;c.top=90;c.bottom=-90;c.near=10;c.far=500;sun.shadow.bias=-.0006;sun.shadow.normalBias=.4;}
  if(QS.sky){sky=new Sky();sky.scale.setScalar(1400);const u=sky.material.uniforms;u.turbidity.value=8;u.rayleigh.value=1.8;u.mieCoefficient.value=.006;u.mieDirectionalG.value=.82;scene.add(sky);}
  // stars
  const sp=[];const r=rng(9);for(let i=0;i<900;i++){const th=r()*Math.PI*2,ph=Math.acos(r()*.95);sp.push(Math.sin(ph)*Math.cos(th)*1200,Math.cos(ph)*1200,Math.sin(ph)*Math.sin(th)*1200);}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(sp,3));
  stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:2,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
  addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
  return renderer;
}

// ---------- textures & materials ----------
const TXL=new THREE.TextureLoader();const texCache={};
export function tex(n,srgb=true){const k=n+srgb;if(texCache[k])return texCache[k];const t=TXL.load('tex/'+n+'.jpg');t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=GQ==='high'?8:GQ==='medium'?4:1;return texCache[k]=t;}
function pbr(name,o={}){const m=new THREE.MeshStandardMaterial({map:tex(name+'_c'),roughness:o.rough??.9,metalness:o.metal??0,color:o.color??0xffffff});
  if(GQ!=='low'){m.normalMap=tex(name+'_n',false);m.normalScale=new THREE.Vector2(o.ns??1,o.ns??1);}return m;}
export const M={};
export const night={value:0};
function initMats(){
  M.stone=pbr('stone',{color:0xd8d2c8});M.darkstone=pbr('stone',{color:0x6a6670});M.ruin=pbr('stone',{color:0x5a6455});
  M.obsidian=pbr('darkrock',{color:0x3a2a30,rough:.45,metal:.2});M.plaster=pbr('plaster',{color:0xeee4d0});
  M.wood=pbr('wood',{color:0xc8a27a});M.beam=pbr('wood',{color:0x4a3220});M.thatch=pbr('thatch',{color:0xd8c090,ns:1.4});
  M.slate=pbr('slate',{color:0x7a8090,rough:.7});M.field=pbr('field',{color:0xb09060});M.cobble=pbr('cobble');M.sand=pbr('sand',{color:0xe0c8a0});
  M.rock=pbr('rock');M.bark=pbr('bark',{color:0xa08a78});M.darkbark=pbr('bark',{color:0x3a3430});
  M.metal=new THREE.MeshStandardMaterial({color:0x9aa0a8,metalness:.85,roughness:.35});
  M.gold=new THREE.MeshStandardMaterial({color:0xffc84a,metalness:1,roughness:.25,emissive:0x3a2200});
  M.win=new THREE.MeshStandardMaterial({color:0x22180e,emissive:0xffa040,emissiveIntensity:0,roughness:.6});
  M.fire=new THREE.MeshBasicMaterial({color:0xff8a2a});M.lava=new THREE.MeshStandardMaterial({color:0xff5a10,emissive:0xff3a00,emissiveIntensity:2,roughness:.6});
  M.crop=new THREE.MeshStandardMaterial({color:0x9aa040,roughness:.9});M.hay=new THREE.MeshStandardMaterial({color:0xd8b860,roughness:1});
  M.leaf=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85});M.dirt=pbr('dirt');
  M.ghostOk=new THREE.MeshBasicMaterial({color:0x40ff60,transparent:true,opacity:.35,depthWrite:false});M.ghostBad=new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:.35,depthWrite:false});
  M.select=new THREE.MeshBasicMaterial({color:0xffd34a,transparent:true,opacity:.35,depthWrite:false});
  M.sandstone=pbr('plaster',{color:0xe2c08a});M.marble=pbr('plaster',{color:0xfaf6ee,rough:.5});M.teal=pbr('slate',{color:0x3f9e90,rough:.6});M.terracotta=pbr('slate',{color:0xc8683a});
  M.granite=pbr('darkrock',{color:0x9a949c});M.hide=pbr('thatch',{color:0x9a7452,ns:.8});M.bone=colMat(0xe8e0c8,{roughness:.6});
  M.glowGreen=new THREE.MeshStandardMaterial({color:0x6aff6a,emissive:0x2aff3a,emissiveIntensity:1.5});
  // foliage wind sway
  M.leaf.onBeforeCompile=sh=>{sh.uniforms.uTime=uTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\n#ifdef USE_INSTANCING\nvec4 ip=instanceMatrix[3];float sw=sin(uTime*1.1+ip.x*.07+ip.z*.05)*.5+sin(uTime*2.3+ip.x*.3)*.2;transformed.x+=sw*.05*max(0.,position.y-1.5);transformed.z+=sw*.03*max(0.,position.y-1.5);\n#endif');};
}
const clothCache={};
export function cloth(hex,emis=0){const k=hex+'_'+emis;if(clothCache[k])return clothCache[k];return clothCache[k]=new THREE.MeshStandardMaterial({color:new THREE.Color(hex),roughness:.85,side:THREE.DoubleSide,emissive:emis?new THREE.Color(hex):0x000000,emissiveIntensity:emis});}
const colCache={};
export function colMat(hex,o={}){const k=hex+JSON.stringify(o);if(colCache[k])return colCache[k];return colCache[k]=new THREE.MeshStandardMaterial(Object.assign({color:new THREE.Color(hex),roughness:.8},o));}

// ---------- geometry helpers (uv in world units) ----------
function scaleUV(g,su,sv){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);return g;}
export function boxG(w,h,d,ts=4){const g=new THREE.BoxGeometry(w,h,d);const uv=g.attributes.uv;
  const sp=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++)for(let j=0;j<4;j++){const i=f*4+j;uv.setXY(i,uv.getX(i)*sp[f][0]/ts,uv.getY(i)*sp[f][1]/ts);}return g;}
function cylG(rt,rb,h,s=10,ts=4){return scaleUV(new THREE.CylinderGeometry(rt,rb,h,s,1),Math.PI*2*Math.max(rt,rb)/ts,h/ts);}
function coneG(r,h,s=10,ts=3){return scaleUV(new THREE.ConeGeometry(r,h,s,1),Math.PI*2*r/ts,Math.hypot(r,h)/ts);}
// gable roof: ridge along x (length w), span d, height h; groups: 0 slopes, 1 gables
function gableG(w,d,h,ov=.4,ts=3){const W=w/2+ov,D=d/2+ov;const p=[],uv=[],n=[];const sl=Math.hypot(D,h);
  const quad=(a,b,c,dd,ua)=>{p.push(...a,...b,...c,...a,...c,...dd);uv.push(...ua[0],...ua[1],...ua[2],...ua[0],...ua[2],...ua[3]);};
  quad([-W,0,D],[W,0,D],[W,h,0],[-W,h,0],[[0,0],[2*W/ts,0],[2*W/ts,sl/ts],[0,sl/ts]]);
  quad([W,0,-D],[-W,0,-D],[-W,h,0],[W,h,0],[[0,0],[2*W/ts,0],[2*W/ts,sl/ts],[0,sl/ts]]);
  const g1=new THREE.BufferGeometry();g1.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g1.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g1.computeVertexNormals();
  const q=[],qu=[];const w2=w/2,d2=d/2;
  q.push(w2,0,d2, w2,0,-d2, w2,h*(d2/D),0,  -w2,0,-d2, -w2,0,d2, -w2,h*(d2/D),0);qu.push(0,0,d/ts,0,d/2/ts,h/ts, 0,0,d/ts,0,d/2/ts,h/ts);
  const g2=new THREE.BufferGeometry();g2.setAttribute('position',new THREE.Float32BufferAttribute(q,3));g2.setAttribute('uv',new THREE.Float32BufferAttribute(qu,2));g2.computeVertexNormals();
  return [g1,g2];}

// part collector: parts merged by material -> few draw calls per building
class Kit{constructor(){this.parts=new Map();this.pm=null;}
  add(mat,g,x=0,y=0,z=0,ry=0,rx=0,rz=0,sx=1,sy=1,sz=1){const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(sx,sy,sz));
    let gg=g.index?g.toNonIndexed():g.clone();gg.applyMatrix4(m);if(this.pm)gg.applyMatrix4(this.pm);for(const k of Object.keys(gg.attributes))if(!['position','normal','uv'].includes(k))gg.deleteAttribute(k);
    if(!gg.attributes.normal)gg.computeVertexNormals();if(!gg.attributes.uv)gg.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(gg.attributes.position.count*2),2));
    if(!this.parts.has(mat))this.parts.set(mat,[]);this.parts.get(mat).push(gg);return this;}
  box(mat,w,h,d,x,y,z,ry=0,ts=4){return this.add(mat,boxG(w,h,d,ts),x,y+h/2,z,ry);}
  merge(){const out=[];for(const [mat,list] of this.parts)out.push({geo:mergeGeometries(list,false),mat});return out;}
  build(shadow=true){return instList(this.merge(),shadow);}}
function instList(list,shadow=true){const g=new THREE.Group();for(const {geo,mat} of list){const m=new THREE.Mesh(geo,mat);m.castShadow=shadow&&!!QS.shadow&&mat!==M.win&&mat!==M.field;m.receiveShadow=!!QS.shadow;g.add(m);}return g;}
export {Kit};

// ---------- banner textures ----------
const bannerCache={};
export function bannerTex(c1,c2,emblem,style=0){const k=c1+c2+emblem+style;if(bannerCache[k])return bannerCache[k];
  const cv=document.createElement('canvas');cv.width=128;cv.height=256;const x=cv.getContext('2d');
  x.fillStyle=c1;x.fillRect(0,0,128,256);x.fillStyle=c2;
  if(style===0){x.fillRect(0,0,128,40);x.fillRect(0,216,128,40);}else if(style===1){x.fillRect(64,0,64,256);}else{x.beginPath();x.moveTo(0,0);x.lineTo(128,0);x.lineTo(0,256);x.fill();}
  x.strokeStyle='#d8b84a';x.lineWidth=8;x.strokeRect(4,4,120,248);
  x.font='64px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",serif';x.textAlign='center';x.textBaseline='middle';x.shadowColor='#000';x.shadowBlur=6;x.fillText(emblem,64,124);
  // cloth weave noise
  const id=x.getImageData(0,0,128,256);for(let i=0;i<id.data.length;i+=4){const n=(Math.random()-.5)*18;id.data[i]+=n;id.data[i+1]+=n;id.data[i+2]+=n;}x.putImageData(id,0,0);
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return bannerCache[k]=t;}
const bannerGeo=new THREE.PlaneGeometry(1.3,2.6,6,10);bannerGeo.translate(.65,-1.3,0);
export function makeBanner(c1,c2,emblem,scale=1,style=0){const g=new THREE.Group();
  const mat=new THREE.MeshStandardMaterial({map:bannerTex(c1,c2,emblem,style),side:THREE.DoubleSide,roughness:.9});
  mat.onBeforeCompile=sh=>{sh.uniforms.uTime=uTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;')
    .replace('#include <begin_vertex>','#include <begin_vertex>\nfloat wv=position.x/1.3;vec4 wp=modelMatrix*vec4(0.,0.,0.,1.);transformed.z+=sin(uTime*3.5+position.x*2.2+position.y*.8+wp.x)*.22*wv;transformed.y+=sin(uTime*2.+position.x*3.)*.04*wv;');};
  const f=new THREE.Mesh(bannerGeo,mat);f.position.y=4.6;f.castShadow=!!QS.shadow&&GQ==='high';g.add(f);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,5,6),M.beam);pole.position.y=2.5;g.add(pole);
  const tip=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),M.gold);tip.position.y=5.05;g.add(tip);
  g.scale.setScalar(scale);g.userData.flag=f;return g;}

// ---------- terrain ----------
export let terrain, waterMeshes=[];
export function buildTerrain(){
  {const og=new THREE.PlaneGeometry(9000,9000).rotateX(-Math.PI/2);const om=new THREE.MeshStandardMaterial({color:0x3e5228,roughness:1});const o=new THREE.Mesh(og,om);o.position.y=-10;scene.add(o);}
  const S=WORLD.R*2+80,seg=QS.seg;const geo=new THREE.PlaneGeometry(S,S,seg,seg);geo.rotateX(-Math.PI/2);
  const pos=geo.attributes.position,n=pos.count;const sw=new Float32Array(n*4),col=new Float32Array(n*3);const c=new THREE.Color();
  for(let i=0;i<n;i++){const x=pos.getX(i),z=pos.getZ(i);const y=H(x,z);pos.setY(i,y);
    const sl=slopeAt(x,z);let g=1,d=0,r=0,k=0;
    r=sstep(.45,.9,sl)+sstep(26,46,y);d=sstep(.6,.85,fbm(x*.02+9,z*.02))*.5+(y<-1?1:0);
    c.setRGB(1,1,1);const fv=fbm(x*.012,z*.012);c.lerp(new THREE.Color(.82,.92,.62),fv*1.2);
    for(const s of WORLD.sites){const dd=Math.hypot(x-s.x,z-s.z);
      if(dd<s.r+10)d+=sstep(s.r+10,s.r*.6,dd)*.22*(fbm(x*.08,z*.08)+.2);
      if(s.kind==='zombie'&&dd<s.r+90){const t=sstep(s.r+90,s.r,dd);k+=t;c.lerp(new THREE.Color(.55,.62,.5),t*.7);}
      if(s.kind==='demon'&&dd<s.r+90){const t=sstep(s.r+90,s.r,dd);k+=t;c.lerp(new THREE.Color(.75,.45,.4),t*.8);}}
    if(y>58){c.lerp(new THREE.Color(1.6,1.6,1.7),sstep(58,75,y));}
    g=Math.max(0,1-r-d-k);const t=g+d+r+k+1e-4;sw.set([g/t,d/t,r/t,k/t],i*4);col.set([c.r,c.g,c.b],i*3);}
  geo.setAttribute('sw',new THREE.BufferAttribute(sw,4));geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
  const T={d:tex('dirt_c'),r:tex('rock_c'),k:tex('darkrock_c')};
  const m=new THREE.MeshStandardMaterial({map:tex('grass_c'),vertexColors:true,roughness:.95});
  if(GQ!=='low'){m.normalMap=tex('grass_n',false);m.normalScale=new THREE.Vector2(.9,.9);}
  m.onBeforeCompile=sh=>{Object.assign(sh.uniforms,{tD:{value:T.d},tR:{value:T.r},tK:{value:T.k}});
    sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute vec4 sw;varying vec4 vSW;varying vec2 vWP;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSW=sw;vWP=(modelMatrix*vec4(position,1.)).xz;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nuniform sampler2D tD,tR,tK;varying vec4 vSW;varying vec2 vWP;')
     .replace('#include <map_fragment>',`vec2 u1=vWP*.16,u2=vWP*.021;
      vec4 cg=mix(texture2D(map,u1),texture2D(map,u2*1.3),.35);vec4 cd=mix(texture2D(tD,u1*.8),texture2D(tD,u2),.3);vec4 cr=mix(texture2D(tR,u1*.4),texture2D(tR,u2*.7),.4);vec4 ck=texture2D(tK,u1*.5);
      vec4 tc=cg*vSW.x+cd*vSW.y+cr*vSW.z+ck*vSW.w;diffuseColor*=vec4(tc.rgb*1.1,1.);`)
     .replace('#include <normal_fragment_maps>',GQ==='low'?'#include <normal_fragment_maps>':'#include <normal_fragment_maps>');
    if(GQ!=='low')sh.fragmentShader=sh.fragmentShader.replace('texture2D( normalMap, vNormalMapUv )','texture2D( normalMap, vWP*.16 )');};
  terrain=new THREE.Mesh(geo,m);terrain.receiveShadow=!!QS.shadow;scene.add(terrain);
  // water
  const wn=tex('water_n',false);wn.repeat.set(6,6);
  const wm=new THREE.MeshStandardMaterial({color:0x1a3540,roughness:.08,metalness:.3,normalMap:wn,normalScale:new THREE.Vector2(.35,.35),transparent:true,opacity:.88});
  for(const l of WORLD.lakes){const w=new THREE.Mesh(new THREE.CircleGeometry(l.r*1.45,48),wm);w.rotation.x=-Math.PI/2;w.position.set(l.x,-1.2,l.z);w.receiveShadow=!!QS.shadow;scene.add(w);waterMeshes.push(w);}
  M.water=wm;
}

export function buildRoads(){const cv=document.createElement('canvas');cv.width=64;cv.height=4;const x=cv.getContext('2d');const g=x.createLinearGradient(0,0,64,0);g.addColorStop(0,'#000');g.addColorStop(.25,'#fff');g.addColorStop(.75,'#fff');g.addColorStop(1,'#000');x.fillStyle=g;x.fillRect(0,0,64,4);
  const am=new THREE.CanvasTexture(cv);const mat=new THREE.MeshStandardMaterial({map:tex('sand_c'),alphaMap:am,transparent:true,depthWrite:false,roughness:1,color:0xb8a080,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
  for(const rd of WORLD.roads){const [x1,z1,x2,z2]=rd;const L=Math.hypot(x2-x1,z2-z1);const dx=(x2-x1)/L,dz=(z2-z1)/L;const nx=-dz,nz=dx;const p=[],uv=[],idx=[];let n=0;
    for(let t=66;t<L-40;t+=3){const w=2.6+Math.sin(t*.05)*.4;const wob=Math.sin(t*.021)*6+Math.sin(t*.07)*2;const cx=x1+dx*t+nx*wob,cz=z1+dz*t+nz*wob;
      for(const sd of [-1,1]){const px=cx+nx*w*sd,pz=cz+nz*w*sd;p.push(px,H(px,pz)+.12,pz);uv.push(sd<0?0:1,t/5);}if(n)idx.push(n*2-2,n*2-1,n*2,n*2-1,n*2+1,n*2);n++;}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,mat);m.receiveShadow=!!QS.shadow;m.renderOrder=1;scene.add(m);}}
// ---------- forests & rocks ----------
function jitter(g,amt,seed){const r=rng(seed);const p=g.attributes.position;const map=new Map();for(let i=0;i<p.count;i++){const k=p.getX(i).toFixed(2)+p.getY(i).toFixed(2)+p.getZ(i).toFixed(2);if(!map.has(k))map.set(k,[(r()-.5)*amt,(r()-.5)*amt,(r()-.5)*amt]);const j=map.get(k);p.setXYZ(i,p.getX(i)+j[0],p.getY(i)+j[1],p.getZ(i)+j[2]);}g.computeVertexNormals();return g;}
function merged(list){return mergeGeometries(list.map(([g,x,y,z,s=1])=>{const gg=(g.index?g.toNonIndexed():g.clone());gg.scale(s,s,s);gg.translate(x,y,z);for(const k of Object.keys(gg.attributes))if(!['position','normal','uv'].includes(k))gg.deleteAttribute(k);return gg;}));}
export const treeData=[]; // {x,z,s,type,alive}
let treeMeshes=[];
export function buildForests(avoid){
  const r=rng(WORLD.seed*7+3);
  const pineTrunk=cylG(.18,.38,4.5,6,3);pineTrunk.translate(0,2.25,0);
  const pineTop=merged([[jitter(new THREE.ConeGeometry(2.2,3.4,9,2),.35,1),0,3.4,0],[jitter(new THREE.ConeGeometry(1.8,3,9,2),.3,2),0,5.2,0],[jitter(new THREE.ConeGeometry(1.35,2.7,8,2),.25,3),0,6.8,0],[jitter(new THREE.ConeGeometry(.8,2.2,7,1),.15,4),0,8.3,0]]);
  const oakTrunk=merged([[cylG(.28,.5,4,7,3),0,2,0],[cylG(.1,.2,2.2,5,3).rotateZ(.8),.8,3.6,0],[cylG(.1,.2,2,5,3).rotateZ(-.9),-.8,3.5,.2]]);
  const oakTop=merged([[jitter(new THREE.IcosahedronGeometry(2.2,1),.5,5),0,5.6,0],[jitter(new THREE.IcosahedronGeometry(1.7,1),.45,6),1.5,4.9,.6],[jitter(new THREE.IcosahedronGeometry(1.6,1),.45,7),-1.4,5,-.5],[jitter(new THREE.IcosahedronGeometry(1.5,1),.4,8),.2,6.7,-1],[jitter(new THREE.IcosahedronGeometry(1.4,1),.4,9),-.3,4.6,1.4]]);
  const deadTrunk=merged([[cylG(.2,.42,5,6,3),0,2.5,0],[cylG(.05,.14,2.4,4,3).rotateZ(1),1,3.8,0],[cylG(.05,.12,2,4,3).rotateZ(-1.1),-.9,4.2,.1],[cylG(.04,.1,1.6,4,3).rotateX(.9),0,4.6,.7]]);
  const types=[{t:pineTrunk,f:pineTop,list:[]},{t:oakTrunk,f:oakTop,list:[]},{t:deadTrunk,f:null,list:[]}];
  let tries=0;const N=QS.trees;
  while(treeData.length<N&&tries<N*12){tries++;
    const a=r()*Math.PI*2,d=Math.sqrt(r())*360;const x=Math.cos(a)*d,z=Math.sin(a)*d;
    const dens=fbm(x*.011+40,z*.011-20);if(dens<.47&&r()>.12)continue;
    if(avoid(x,z))continue;const y=H(x,z);if(y<-.8||y>62)continue;if(slopeAt(x,z)>.85)continue;
    let type=fbm(x*.006-9,z*.006+4)>.5?0:1;if(y>22)type=0;
    for(const s of WORLD.sites){if((s.kind==='zombie'||s.kind==='demon')&&Math.hypot(x-s.x,z-s.z)<s.r+80)type=2;}
    const s=.75+r()*.75;treeData.push({x,z,y,s,type,rot:r()*6.28,alive:true,c:r()});}
  const leafCols=[[0x2d4a22,0x4a6a2a],[0x3a5a22,0x6a7a2a],[0,0]];
  for(const td of treeData)types[td.type].list.push(td);
  const mtx=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color();
  types.forEach((T,ti)=>{if(!T.list.length)return;
    const tm=new THREE.InstancedMesh(T.t,ti===2?M.darkbark:M.bark,T.list.length);let fm=null;if(T.f){fm=new THREE.InstancedMesh(T.f,M.leaf,T.list.length);}
    T.list.forEach((td,i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),td.rot);mtx.compose(new THREE.Vector3(td.x,td.y-.2,td.z),q,new THREE.Vector3(td.s,td.s*(.9+td.c*.3),td.s));tm.setMatrixAt(i,mtx);
      if(fm){fm.setMatrixAt(i,mtx);c.setHex(leafCols[ti][0]).lerp(new THREE.Color(leafCols[ti][1]),td.c);if(td.c>.93&&ti===1)c.setHex(0x8a6a22);fm.setColorAt(i,c);}td.inst=i;td.mesh=tm;td.fmesh=fm;});
    tm.castShadow=fm?false:!!QS.shadow;tm.receiveShadow=!!QS.shadow;scene.add(tm);treeMeshes.push(tm);
    if(fm){fm.castShadow=!!QS.shadow;fm.receiveShadow=GQ==='high';scene.add(fm);treeMeshes.push(fm);}
    tm.frustumCulled=false;if(fm)fm.frustumCulled=false;});
  // rocks
  const rg=jitter(new THREE.DodecahedronGeometry(1,1),.35,11);const nr=GQ==='low'?120:260;const rm=new THREE.InstancedMesh(rg,M.rock,nr);let ri=0;
  for(let t=0;t<nr*6&&ri<nr;t++){const a=r()*Math.PI*2,d=60+Math.sqrt(r())*340;const x=Math.cos(a)*d,z=Math.sin(a)*d;if(avoid(x,z))continue;const y=H(x,z);if(y<-1)continue;
    const s=(y>20?2.5:.6)+r()*(y>20?4:1.6);q.setFromEuler(new THREE.Euler(r()*3,r()*3,r()*3));mtx.compose(new THREE.Vector3(x,y-s*.3,z),q,new THREE.Vector3(s,s*.7,s*1.1));rm.setMatrixAt(ri++,mtx);}
  rm.count=ri;rm.castShadow=!!QS.shadow;rm.receiveShadow=!!QS.shadow;rm.frustumCulled=false;scene.add(rm);
}
export function buildGrass(){if(GQ==='low')return;const cv=document.createElement('canvas');cv.width=64;cv.height=64;const x=cv.getContext('2d');
  for(let i=0;i<26;i++){const bx=6+Math.random()*52,h=30+Math.random()*32,lean=(Math.random()-.5)*14;const g=x.createLinearGradient(0,64,0,64-h);g.addColorStop(0,'#3e5c1e');g.addColorStop(1,Math.random()<.5?'#94b448':'#7aa23a');x.strokeStyle=g;x.lineWidth=2+Math.random()*2;x.beginPath();x.moveTo(bx,64);x.quadraticCurveTo(bx+lean*.3,64-h*.6,bx+lean,64-h);x.stroke();}
  const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=THREE.LinearFilter;const a=new THREE.PlaneGeometry(1.4,.9);a.translate(0,.45,0);const b=a.clone().rotateY(Math.PI/2);const geo=mergeGeometries([a,b]);{const n=geo.attributes.normal;for(let i=0;i<n.count;i++)n.setXYZ(i,0,1,0);}
  const m=new THREE.MeshStandardMaterial({map:t,alphaTest:.5,side:THREE.DoubleSide,roughness:1});m.onBeforeCompile=sh=>{sh.uniforms.uTime=uTime;sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime;').replace('#include <begin_vertex>','#include <begin_vertex>\nvec4 ip=instanceMatrix[3];transformed.x+=sin(uTime*2.+ip.x*.4+ip.z*.3)*.12*position.y;');};
  const N=GQ==='high'?9000:4500;const im=new THREE.InstancedMesh(geo,m,N);const r=rng(77);const mtx=new THREE.Matrix4(),q=new THREE.Quaternion(),c=new THREE.Color();let n=0;
  for(let t2=0;t2<N*4&&n<N;t2++){const x2=(r()-.5)*360,z2=(r()-.5)*360;if(Math.abs(x2)<64&&Math.abs(z2)<64)continue;const y=H(x2,z2);if(y<-.5||y>24||slopeAt(x2,z2)>.6)continue;if(WORLD.sites.some(s=>s.kind!=='player'&&Math.hypot(x2-s.x,z2-s.z)<s.r+4))continue;
    if(WORLD.roads.some(rd=>segDist(x2,z2,rd[0],rd[1],rd[2],rd[3])<4))continue;if(fbm(x2*.05,z2*.05)<.42)continue;const s=.7+r()*.9;q.setFromAxisAngle(new THREE.Vector3(0,1,0),r()*3);mtx.compose(new THREE.Vector3(x2,y-.05,z2),q,new THREE.Vector3(s,s*(.7+r()*.6),s));im.setMatrixAt(n,mtx);c.setHSL(.22+r()*.06,.4,.45+r()*.2);im.setColorAt(n,c);n++;}
  im.count=n;im.frustumCulled=false;scene.add(im);}
export function removeTree(td){if(!td.alive)return;td.alive=false;const m=new THREE.Matrix4().makeScale(0,0,0);td.mesh.setMatrixAt(td.inst,m);td.mesh.instanceMatrix.needsUpdate=true;if(td.fmesh){td.fmesh.setMatrixAt(td.inst,m);td.fmesh.instanceMatrix.needsUpdate=true;}}

// ---------- sky / day-night ----------
const _sd=new THREE.Vector3();
export function setDayTime(t,focus){ // t in [0,1): 0 = dawn
  const ang=t*Math.PI*2*1.0-0.15; // above horizon for ~65% of day
  const el=Math.sin(ang*0.92+.1);_sd.set(Math.cos(ang)*.8,el,.45).normalize();
  const dl=Math.max(0,Math.min(1,(el+.08)/.35)); // daylight factor
  night.value=1-dl;
  sun.position.copy(focus).addScaledVector(el>-.05?_sd:_sd.clone().set(-_sd.x,.6,-_sd.z).normalize(),220);sun.target.position.copy(focus);
  const warm=Math.max(0,1-Math.abs(el)*3.2);
  sun.color.setRGB(1,.92-warm*.25,.82-warm*.45);sun.intensity=el>-.05?2.4*dl+.15:.75; if(el<=-.05)sun.color.setRGB(.55,.68,1);
  hemi.intensity=.7+.1*dl;hemi.color.setRGB(.45+.35*dl,.55+.29*dl,.9+.05*dl);
  const fogDay=new THREE.Color(0xa7b2b0).lerp(new THREE.Color(0xd8a070),warm*.5),fogNight=new THREE.Color(0x1c2640);
  const fc=fogNight.lerp(fogDay,dl);scene.fog.color.copy(fc);scene.background.copy(fc);scene.fog.density=.0028+.0012*(1-dl);
  if(sky){sky.material.uniforms.sunPosition.value.copy(_sd);sky.visible=dl>.02;renderer.toneMappingExposure=.75+.2*dl;}
  else renderer.toneMappingExposure=.8+.15*dl;
  stars.material.opacity=Math.max(0,1-dl*2.2);stars.position.copy(camera.position);
  M.win.emissiveIntensity=(1-dl)*2.2;
  return dl;
}

// ---------- particles (smoke / fire / dust) ----------
export class Particles{
  constructor(max,additive,color,scn){this.max=max;this.p=[];const g=new THREE.BufferGeometry();this.pos=new Float32Array(max*3);this.al=new Float32Array(max);this.sz=new Float32Array(max);
    g.setAttribute('position',new THREE.BufferAttribute(this.pos,3));g.setAttribute('al',new THREE.BufferAttribute(this.al,1));g.setAttribute('sz',new THREE.BufferAttribute(this.sz,1));
    this.mat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,uniforms:{c:{value:new THREE.Color(color)},pr:{value:QS.pr*innerHeight/2}},
      vertexShader:'attribute float al;attribute float sz;varying float vA;uniform float pr;void main(){vA=al;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=sz*pr/-mv.z;gl_Position=projectionMatrix*mv;}',
      fragmentShader:'uniform vec3 c;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(c,vA*smoothstep(.5,.0,d));}'});
    this.pts=new THREE.Points(g,this.mat);this.pts.frustumCulled=false;(scn||scene).add(this.pts);this.additive=additive;}
  emit(x,y,z,o={}){if(this.p.length>=this.max)this.p.shift();this.p.push({x,y,z,vx:(o.vx??0)+(Math.random()-.5)*(o.spread??.6),vy:o.vy??1.5,vz:(o.vz??0)+(Math.random()-.5)*(o.spread??.6),life:0,max:o.life??3,s0:o.size??1.5,s1:o.grow??4,a:o.alpha??.45});}
  update(dt){let i=0;for(let k=this.p.length-1;k>=0;k--){const q=this.p[k];q.life+=dt;if(q.life>q.max){this.p.splice(k,1);continue;}q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;}
    for(const q of this.p){const t=q.life/q.max;this.pos[i*3]=q.x;this.pos[i*3+1]=q.y;this.pos[i*3+2]=q.z;this.al[i]=q.a*(t<.15?t/.15:1-t);this.sz[i]=q.s0+(q.s1-q.s0)*t;i++;}
    this.pts.geometry.setDrawRange(0,i);for(const k of ['position','al','sz'])this.pts.geometry.attributes[k].needsUpdate=true;}
}

// ---------- procedural buildings ----------
const geoCache={};
function crenel(k,mat,w,d,y,size=.6){const nx=Math.max(2,Math.round(w/1.2)),nz=Math.max(2,Math.round(d/1.2));
  for(let i=0;i<nx;i+=1){if(i%2)continue;const x=-w/2+size/2+i*(w-size)/(nx-1);k.box(mat,size,size,.5,x,y,d/2-.25);k.box(mat,size,size,.5,x,y,-d/2+.25);}
  for(let i=0;i<nz;i+=1){if(i%2)continue;const z=-d/2+size/2+i*(d-size)/(nz-1);k.box(mat,.5,size,size,w/2-.25,y,z);k.box(mat,.5,size,size,-w/2+.25,y,z);}}
function roundTower(k,mat,roofMat,r,h,x,z,roofH=3){k.add(mat,cylG(r,r*1.08,h,12),x,h/2,z);
  for(let i=0;i<10;i++){if(i%2)continue;const a=i/10*Math.PI*2;k.box(mat,.6,.7,.6,x+Math.cos(a)*(r-.2),h,z+Math.sin(a)*(r-.2),-a);}
  if(roofMat)k.add(roofMat,coneG(r*1.25,roofH,12),x,h+roofH/2+.3,z);
  for(let i=0;i<3;i++){const a=i*2.1+.5;k.box(M.win,.3,.7,.1,x+Math.cos(a)*(r+.02),h*.55+i*.8,z+Math.sin(a)*(r+.02),-a+Math.PI/2);}}
function windows(k,w,d,y,n=2,h=.8){for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n;k.box(M.win,.5,h,.08,x,y,d/2+.02);k.box(M.win,.5,h,.08,x,y,-d/2-.02);}}
function barrel(k,x,z,s=1){k.add(M.wood,cylG(.38*s,.33*s,.9*s,10,2),x,.45*s+.5,z);k.add(M.metal,cylG(.39*s,.39*s,.06,10),x,.75*s+.5,z);k.add(M.metal,cylG(.36*s,.36*s,.06,10),x,.2*s+.5,z);}
function woodpile(k,x,z,ry=0){for(let i=0;i<3;i++)for(let j=0;j<3-i;j++)k.add(M.bark,cylG(.16,.16,1.4,6).rotateZ(Math.PI/2).rotateY(ry),x+Math.cos(ry)*0,.66+i*.28,z+(j-1+i*.5)*.32);}
function cart(k,x,z,ry=0){const c=Math.cos(ry),s=Math.sin(ry);k.add(M.wood,boxG(1.4,.4,2.2).rotateY(ry),x,.95,z);for(const sx of [-1,1])for(const sz of [-.6,.6])k.add(M.beam,cylG(.38,.38,.1,12).rotateZ(Math.PI/2).rotateY(ry),x+c*sx*.75+s*sz,.4,z-s*sx*.75+c*sz);
  k.add(M.beam,boxG(.08,.08,1.6).rotateY(ry),x+s*1.8,.75,z+c*1.8);k.add(M.hay,boxG(1.2,.5,1.6).rotateY(ry),x,1.4,z);}
function timberHouse(k,w,d,h,x=0,z=0,roof=M.thatch){k.box(M.stone,w+.2,.6,d+.2,x,0,z);k.box(M.plaster,w,h,d,x,.5,z);
  // timber frame
  for(const sx of [-1,1])for(const sz of [-1,1])k.box(M.beam,.22,h,.22,x+sx*w/2,.5,z+sz*d/2);
  k.box(M.beam,w+.1,.18,.24,x,.5+h*.5,z+d/2);k.box(M.beam,w+.1,.18,.24,x,.5+h*.5,z-d/2);k.box(M.beam,w+.2,.2,.24,x,.5+h-.1,z+d/2);k.box(M.beam,w+.2,.2,.24,x,.5+h-.1,z-d/2);
  k.box(M.beam,.14,h*.5,.2,x-w/4,.5,z+d/2+.02,0);k.add(M.beam,boxG(.14,h*.7,.2),x+w/4,.5+h*.5,z+d/2+.03,0,0,.6);
  windows(k,w,d,.5+h*.62,Math.max(1,Math.round(w/2)),.6);k.box(M.beam,.8,1.3,.1,x,.5,z+d/2+.04);
  const [g1,g2]=gableG(w,d,h*.75,.45);k.add(roof,g1,x,.5+h,z);k.add(M.plaster,g2,x,.5+h,z);}
export function buildingModel(type,o={}){
  const c1=o.c1||'#8b1a1a',c2=o.c2||'#d4ac0d',kind=o.kind||'human';
  const key=type+kind;let base;
  if(!geoCache[key]){const k=new Kit();buildParts(k,type,kind);geoCache[key]=k.merge();}
  base=instList(geoCache[key],true);const g=new THREE.Group();g.add(base);
  const B=o.def;
  // kingdom-colored cloth / banners
  const flags=FLAGS[type]||[];if(kind==='human')for(const f of flags){const b=makeBanner(c1,c2,o.emblem||'👑',f[3]||1,o.bstyle||0);b.position.set(f[0],f[1],f[2]);b.rotation.y=f[4]||0;g.add(b);}
  if(type==='market'){for(let i=0;i<3;i++){const cm=cloth(i%2?c1:c2);const aw=new THREE.Mesh(new THREE.PlaneGeometry(2.6,2),cm);aw.rotation.x=-1.05;aw.position.set(-3.6+i*3.6,2.6,.2);aw.castShadow=!!QS.shadow;g.add(aw);}}
  if(type==='training'||type==='arena'){const cm=cloth(c1);}
  if(type==='temple'&&o.relColor){const gl=new THREE.Mesh(new THREE.SphereGeometry(.5,12,8),new THREE.MeshStandardMaterial({color:o.relColor,emissive:o.relColor,emissiveIntensity:1.6}));gl.position.set(0,11.2,0);g.add(gl);}
  return g;}
const FLAGS={castle:[[0,17.5,0,1.4],[-7,13,-7,1],[7,13,7,1],[7,13,-7,1],[-7,13,7,1]],barracks:[[5,2.6,2.2,.8]],tower:[[0,8.6,0,.8]],gate:[[-3,8,0,.7],[3,8,0,.7]],arena:[[-7,7.5,-7,.8],[7,7.5,7,.8],[7,7.5,-7,.8],[-7,7.5,7,.8]],training:[[5.4,0,5.4,.7]],temple:[],manor:[[2.6,6,0,.6]]};
const STY=()=>({human:[M.stone,M.slate],stone:[M.stone,M.slate],timber:[M.wood,M.thatch],sand:[M.sandstone,M.terracotta],elf:[M.marble,M.teal],dwarf:[M.granite,M.darkstone],orc:[M.darkbark,M.hide],zombie:[M.ruin,M.darkstone],demon:[M.obsidian,M.obsidian]});
function orcFort(k){k.add(M.dirt,new THREE.CircleGeometry(12,20).rotateX(-Math.PI/2),0,.08,0);
  for(let i=0;i<34;i++){const a=i/34*Math.PI*2;k.add(M.darkbark,cylG(.45,.5,6+(i*7)%3,6),Math.cos(a)*11,3,Math.sin(a)*11,0,0,(i%2-.5)*.12);k.add(M.darkbark,coneG(.45,1.2,6),Math.cos(a)*11,6.6+(i*7)%3*.5,Math.sin(a)*11);}
  for(let y=0;y<4;y++)for(const [x,z] of [[-2.5,-2.5],[2.5,-2.5],[-2.5,2.5],[2.5,2.5]])k.add(M.darkbark,cylG(.5,.5,4,6),x,2+y*4,z,0,0,(y%2)*.08);
  k.box(M.beam,6.4,.5,6.4,0,15.6,0);k.add(M.hide,coneG(4.6,4,6),0,18.1,0,.3);for(let i=0;i<4;i++){k.add(M.bone,coneG(.25,2.2,5),Math.cos(i*1.57+.78)*3.4,16.6,Math.sin(i*1.57+.78)*3.4,0,0,i%2?.6:-.6);}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2+.3;k.add(M.beam,cylG(.15,.15,4,5),Math.cos(a)*7,2,Math.sin(a)*7);k.add(M.bone,new THREE.SphereGeometry(.45,8,6),Math.cos(a)*7,4.3,Math.sin(a)*7);k.add(M.bone,coneG(.12,.6,4),Math.cos(a)*7+.4,4.6,Math.sin(a)*7,0,0,-.8);k.add(M.bone,coneG(.12,.6,4),Math.cos(a)*7-.4,4.6,Math.sin(a)*7,0,0,.8);}
  k.add(M.rock,cylG(1.6,1.8,.6,10),0,.3,7.5);k.add(M.fire,coneG(1.1,2.2,7),0,1.6,7.5);}
function buildParts(k,type,kind){
  const [S,R]=STY()[kind]||STY().human;if(type==='castle'&&kind==='orc'){orcFort(k);return;}
  switch(type){
  case 'castle':{const ts=4;
    k.box(M.cobble,20,.4,20,0,0,0);
    k.box(S,9,13,9,0,0,0,0,ts);crenel(k,S,9,9,13.3);windows(k,9,9,8,3,1.2);windows(k,9,9,4,2,1);if(kind!=='sand'&&kind!=='elf')k.add(R,coneG(3,4,8),0,15.5,0,Math.PI/8);k.box(S,3.5,2,3.5,0,13,0);
    const tRoof=kind==='zombie'||kind==='sand'||kind==='dwarf'?null:R;for(const [x,z] of [[-7,-7],[7,-7],[-7,7],[7,7]])roundTower(k,S,tRoof,2.1,kind==='dwarf'?7:kind==='elf'?13:10,x,z,kind==='elf'?7:4);
    if(kind==='sand'){k.add(M.gold,new THREE.SphereGeometry(3.4,16,10,0,Math.PI*2,0,Math.PI/2),0,15,0);k.add(M.gold,coneG(.3,2,6),0,19.2,0);for(const [x,z] of [[-7,-7],[7,-7],[-7,7],[7,7]]){k.add(M.marble,new THREE.SphereGeometry(2.2,12,8,0,Math.PI*2,0,Math.PI/2),x,10.3,z);k.add(M.gold,coneG(.15,1.2,5),x,12.9,z);}
      for(const [x,z] of [[-11,9],[11,9]]){k.add(S,cylG(.9,1.1,16,10),x,8,z);k.add(M.marble,new THREE.SphereGeometry(1.2,10,8,0,Math.PI*2,0,Math.PI/2),x,16,z);}}
    if(kind==='elf'){k.box(S,5,9,5,0,13,0);k.add(R,coneG(3.4,9,8),0,26.5,0);k.add(M.gold,coneG(.2,2.5,5),0,32,0);for(const [x,z] of [[-7,-7],[7,-7],[-7,7],[7,7]])k.add(M.gold,coneG(.12,1.6,5),x,21.4,z);
      for(const [x,z] of [[-10,0],[10,0],[0,-10]]){k.add(S,cylG(.6,.8,18,8),x,9,z);k.add(R,coneG(1.1,6,8),x,21,z);}
      for(let i=0;i<8;i++){const a=i/8*Math.PI*2;k.add(M.leaf,jitter(new THREE.IcosahedronGeometry(1.4,1),.3,i),Math.cos(a)*10.5,1,Math.sin(a)*10.5);}}
    if(kind==='dwarf'){k.add(M.granite,jitter(new THREE.DodecahedronGeometry(11,1),2,77),0,1,-21,0,0,0,1.4,1.1,.8);k.add(M.granite,jitter(new THREE.DodecahedronGeometry(7,1),1.6,78),-14,0,-15);k.add(M.granite,jitter(new THREE.DodecahedronGeometry(6,1),1.5,79),14,0,-16);
      k.box(S,10,9,3,0,0,10);crenel(k,S,10,3,9.2,.6);k.box(colMat(0x0a0806),4.4,6,.2,0,0,11.55);k.add(M.gold,new THREE.TorusGeometry(2.6,.25,6,20,Math.PI),0,6,11.6);k.box(M.gold,10.4,.4,3.4,0,7.6,10);
      for(const x of [-4,4]){k.box(S,1.6,7,1.6,x,0,12.2);k.add(M.gold,new THREE.OctahedronGeometry(.6),x,7.6,12.2);}k.add(M.fire,new THREE.BoxGeometry(2,.4,.8),0,.2,12.4);}
    if(kind==='timber'){for(let i=0;i<6;i++){k.add(M.beam,boxG(.25,2.4,.25),-3+i*1.2,14.2,4.6,0,0,(i%2-.5)*.6);}k.add(M.darkbark,coneG(.3,2.5,5),0,15.5,4.8,0,.9);}
    for(const [x,z,w,d] of [[0,-7,12,1.4],[0,7,12,1.4],[-7,0,1.4,12],[7,0,1.4,12]]){k.box(S,w,6.5,d,x,0,z);crenel(k,S,w,d,6.8,.55);}
    k.box(M.beam,3,3.6,.4,0,0,7.75);k.add(S,cylG(1.7,1.7,1.5,10,4).rotateX(Math.PI/2),0,3.6,7.55);
    if(kind==='zombie'){k.box(S,3,1.4,2,-5,0,9,.5);k.box(S,1.6,1,1.4,6,0,-9.5,1.2);k.box(S,1.2,.8,1.2,10,0,2,.3);}
    if(kind==='demon'){for(let i=0;i<8;i++){const a=i/8*Math.PI*2;k.add(M.obsidian,coneG(.9,9+((i*7)%4)*2,6),Math.cos(a)*11.5,4.5+((i*7)%4),Math.sin(a)*11.5);}k.add(M.lava,new THREE.CircleGeometry(2.4,16).rotateX(-Math.PI/2),0,.45,11);}
    break;}
  case 'house':timberHouse(k,5.2,4.2,3,0,0);k.box(M.stone,.7,2,.7,1.6,3.2,-1);if(kind==='human'||kind==='stone'){barrel(k,2.3,2.5,.9);woodpile(k,-3.1,0,0);}break;
  case 'manor':k.box(M.stone,10.4,.5,6.4,0,0,0);k.box(S,10,4,6,0,.4,0);windows(k,10,6,2,4,1);windows(k,10,6,3.6,4,.8);k.box(M.beam,1.2,2,.1,0,.4,3.04);
    {const [g1,g2]=gableG(10,6,3,.5);k.add(R,g1,0,4.4,0);k.add(S,g2,0,4.4,0);}k.box(S,.9,2.4,.9,3.4,5,0);break;
  case 'farm':{k.add(M.field,boxG(11.2,.25,11.2,4),0,.1,0);const cg=new THREE.ConeGeometry(.22,.9,4);
    for(let i=0;i<9;i++)for(let j=0;j<14;j++){if(i<3&&j>9)continue;k.add(M.crop,cg,-4.8+i*1.2,.65,-5+j*.75,(i*j)%3);}
    for(let i=0;i<12;i++){k.box(M.beam,.14,1,.14,-5.6+i*1.02,0,5.6);k.box(M.beam,.14,1,.14,-5.6+i*1.02,0,-5.6);}k.box(M.beam,11.4,.1,.1,0,.8,5.6);k.box(M.beam,11.4,.1,.1,0,.8,-5.6);
    timberHouse(k,3.2,2.8,2.2,-3.6,3.8,M.thatch);cart(k,3.2,4.2,1.57);for(let i=0;i<3;i++)k.add(M.hay,cylG(.55,.55,.9,10).rotateZ(Math.PI/2),-1+i*1.2,.55,4.6);break;}
  case 'hunter':k.box(M.stone,5,.4,4,0,0,0);k.box(M.wood,4.6,2.6,3.6,0,.4,0,0,3);{const [g1,g2]=gableG(4.6,3.6,2,.5);k.add(M.thatch,g1,0,3,0);k.add(M.wood,g2,0,3,0);}
    windows(k,4.6,3.6,1.8,2,.5);for(let i=0;i<3;i++){k.box(M.beam,.1,1.4,.1,-1+i,0,2.6);}k.box(M.beam,2.4,.1,.1,0,1.3,2.6);k.add(colMat(0x7a5a3a),new THREE.PlaneGeometry(.7,.9),-.5,1,2.62);k.add(colMat(0x8a6a4a),new THREE.PlaneGeometry(.7,.9),.6,1,2.62);break;
  case 'granary':k.box(M.stone,5,.5,5,0,0,0);k.add(M.wood,cylG(2,2.1,4.5,14,3),0,2.75,0);k.add(M.thatch,coneG(2.6,2.6,14),0,6.3,0);k.box(M.beam,.9,1.6,.1,0,.5,2.08);break;
  case 'mill':k.box(M.stone,11.6,.3,7.6,0,0,0);k.box(M.wood,7,3.4,5,-1.6,.3,-.5,0,3);{const [g1,g2]=gableG(7,5,2.2,.5);k.add(M.thatch,g1,-1.6,3.7,-.5);k.add(M.wood,g2,-1.6,3.7,-.5);}
    windows(k,7,5,2.4,3,.5);for(let i=0;i<4;i++)for(let j=0;j<3-i%2;j++)k.add(M.bark,cylG(.35,.35,3.4,8).rotateZ(Math.PI/2),3.9,.4+i*.6,-1.5+j*.8+i%2*.4);
    k.add(M.metal,cylG(.9,.9,.08,18).rotateX(Math.PI/2),2.5,1.3,2.6);k.box(M.beam,2.4,.9,.8,2.5,0,2.4);break;
  case 'quarry':{k.add(M.rock,new THREE.CircleGeometry(5.6,20).rotateX(-Math.PI/2),0,.06,0);const rg=jitter(new THREE.DodecahedronGeometry(1,0),.3,21);
    for(let i=0;i<9;i++){const a=i*.7,d=2+i%3*1.3;k.add(M.rock,rg,Math.cos(a)*d,.5,Math.sin(a)*d,a,0,0,1+i%3*.4,.8,1);}
    for(let i=0;i<5;i++)k.box(M.stone,1.1,.7,.8,-4+i*.3,0+i%2*.7,4.2-i%2*.4);
    k.box(M.beam,.3,6,.3,3.5,0,-3.5);k.add(M.beam,boxG(.25,5,.25),3.5,5.8,-1.6,0,1.1,0);k.box(M.wood,1.4,.6,1.4,-3.8,0,-3.6);break;}
  case 'mine':k.add(M.rock,jitter(new THREE.SphereGeometry(4,10,8,0,Math.PI*2,0,Math.PI/2),.5,31),0,0,-1.2,0,0,0,1,.9,1);k.box(M.beam,.4,3,.4,-1.1,0,2.4);k.box(M.beam,.4,3,.4,1.1,0,2.4);k.box(M.beam,3,.4,.5,0,2.9,2.4);
    k.box(colMat(0x0a0806),1.8,2.8,.2,0,0,2.3);k.box(M.wood,1.2,.7,.8,2.6,.25,3.2);k.box(M.metal,4,.08,.1,0,0,3.3);k.add(M.iron||M.metal,new THREE.DodecahedronGeometry(.3),2.6,1.1,3.2);break;
  case 'smithy':k.box(M.stone,6,.4,6,0,0,0);k.box(S,5,3,4,0,.4,-.6);{const [g1,g2]=gableG(5,4,1.8,.4);k.add(R,g1,0,3.4,-.6);k.add(S,g2,0,3.4,-.6);}k.box(S,1.2,3.5,1.2,1.6,3.4,-1.4);
    k.box(M.beam,.25,2.6,.25,-2.2,0,2.3);k.box(M.beam,.25,2.6,.25,2.2,0,2.3);k.add(M.thatch,boxG(5,.25,2.2),0,2.7,1.8,0,-.25);k.box(M.metal,.9,.8,.5,-1,.4,1.6);k.box(M.stone,1.4,1,1.2,1.2,.4,1.6);k.add(M.fire,new THREE.BoxGeometry(.9,.15,.7),1.2,1.45,1.6);windows(k,5,4,2.2,2,.6);break;
  case 'market':k.add(M.cobble,boxG(11.6,.25,11.6),0,.12,0);for(let i=0;i<3;i++){const x=-3.6+i*3.6;for(const [dx,dz] of [[-1.2,-.4],[1.2,-.4],[-1.2,1.1],[1.2,1.1]])k.box(M.beam,.15,2.4,.15,x+dx,0,dz);k.box(M.wood,2.6,.9,1,x,0,-.1);
    for(let j=0;j<3;j++)k.box(j%2?M.hay:colMat([0xaa3322,0x447722,0xcc9922][j]),.5,.3,.5,x-.7+j*.7,.9,-.1);}
    k.add(M.stone,cylG(1,1.2,1,12),0,.75,-4);cart(k,3.6,-3.4,.5);barrel(k,-4.6,-4,1);k.box(M.wood,1,.8,1,-4,0,4);k.box(M.wood,.8,.8,.8,-3.1,0,4.3);k.add(M.wood,cylG(.4,.4,.9,10),4,.7,4);k.add(M.wood,cylG(.4,.4,.9,10),4.9,.7,4.2);break;
  case 'tavern':timberHouse(k,6,5,3.4,0,0,M.thatch);barrel(k,-2.6,3,1);barrel(k,-1.9,3.2,1);barrel(k,-2.25,3.1,.7);k.box(M.wood,2,.12,.5,1,.95,3.3);k.box(M.beam,.15,.45,.4,.2,.5,3.3);k.box(M.beam,.15,.45,.4,1.8,.5,3.3);k.box(M.stone,.8,2.4,.8,-2.2,3.9,-1.2);k.box(M.beam,.1,1.4,.1,2.8,1.8,2.9);k.box(colMat(0xaa7733),.9,.7,.08,2.8,1.9,3.3);break;
  case 'temple':k.box(M.stone,11.4,.6,11.4,0,0,0);k.box(M.stone,10.4,.4,10.4,0,.6,0);k.box(S,7,5,8,0,1,0);
    for(let i=0;i<4;i++){k.add(M.stone,cylG(.35,.4,5,10),-3+i*2,3.5,4.6);}k.box(S,8,.6,1.6,0,6,4.6);{const [g1,g2]=gableG(8,9.6,2.6,.3);k.add(R,g1.rotateY(Math.PI/2),0,6,0);k.add(S,g2.rotateY(Math.PI/2),0,6,0);}
    k.box(S,2.2,4,2.2,0,6,-2.4);k.add(R,coneG(1.8,3.6,8),0,11.8,-2.4);k.box(M.win,.6,2.2,.08,0,2,4.04);windows(k,7,8,3.4,3,1.4);break;
  case 'well':k.add(M.stone,cylG(1.2,1.25,1,14),0,.5,0);k.add(M.water||colMat(0x1a3540),new THREE.CircleGeometry(1,14).rotateX(-Math.PI/2),0,.8,0);k.box(M.beam,.15,2.4,.15,-1,0,0);k.box(M.beam,.15,2.4,.15,1,0,0);
    {const [g1]=gableG(2.4,1.6,.7,.15);k.add(M.thatch,g1,0,2.4,0);}k.add(M.wood,cylG(.12,.12,2,8).rotateZ(Math.PI/2),0,1.9,0);break;
  case 'garden':k.add(colMat(0x4a7a2a),boxG(7.6,.2,7.6),0,.1,0);for(let i=0;i<14;i++){const a=i*1.3,d=1.3+(i%4)*.8;k.add(colMat([0xcc3355,0xeecc33,0xffffff,0x9955cc][i%4]),new THREE.SphereGeometry(.28,6,5),Math.cos(a)*d,.35,Math.sin(a)*d);}
    k.add(M.leaf,jitter(new THREE.IcosahedronGeometry(1.3,1),.3,41),-2.2,2.6,-2.2);k.add(M.bark,cylG(.15,.22,2,6),-2.2,1,-2.2);k.add(M.stone,cylG(.8,.9,.5,12),1.5,.35,1.5);k.add(M.water||colMat(0x1a3540),new THREE.CircleGeometry(.65,12).rotateX(-Math.PI/2),1.5,.62,1.5);break;
  case 'statue':k.box(M.stone,2,1.2,2,0,0,0);k.box(M.stone,1.4,.4,1.4,0,1.2,0);k.add(M.stone,cylG(.32,.4,1.6,8),0,2.4,0);k.add(M.stone,new THREE.SphereGeometry(.3,10,8),0,3.5,0);k.add(M.gold,coneG(.3,.35,6),0,3.9,0);
    k.add(M.stone,cylG(.06,.06,2.4,5),.55,2.6,0);k.add(M.stone,cylG(.11,.11,.9,6).rotateZ(.5),-.45,2.6,0);break;
  case 'barracks':k.box(M.stone,11.6,.4,7.6,0,0,0);k.box(S,10,3.6,5,0,.4,-.6);windows(k,10,5,2.4,5,.6);{const [g1,g2]=gableG(10,5,2,.5);k.add(R,g1,0,4,-.6);k.add(S,g2,0,4,-.6);}
    k.box(M.beam,1.2,2.2,.1,0,.4,1.94);for(let i=0;i<5;i++){k.add(M.metal,cylG(.04,.04,2.4,5),-4+i*.5,1.4,2.6,0,0,.15);}k.box(M.beam,3,.15,.15,-3,1.6,2.6);break;
  case 'training':k.add(M.dirt,boxG(11.6,.15,11.6),0,.08,0);for(let i=0;i<12;i++){k.box(M.beam,.15,1.1,.15,-5.7+i*1.04,0,-5.7);k.box(M.beam,.15,1.1,.15,-5.7,0,-5.7+i*1.04);}k.box(M.beam,11.6,.1,.1,0,.95,-5.7);k.box(M.beam,.1,.1,11.6,-5.7,.95,0);
    for(const [x,z] of [[-2,-2],[1,-2.5],[2.5,1],[-1.5,2]]){k.box(M.beam,.15,1.8,.15,x,0,z);k.add(M.hay,cylG(.35,.32,1,8),x,1.6,z);k.add(M.hay,new THREE.SphereGeometry(.25,8,6),x,2.35,z);k.box(M.hay,1.2,.2,.2,x,1.8,z);}
    k.box(M.wood,1.2,.5,2,-4,0,4);k.add(colMat(0xcc3322),cylG(.6,.6,.1,16).rotateX(Math.PI/2),4,1.6,-4);k.box(M.beam,.2,1.6,.2,4,0,-4.15);break;
  case 'arena':{k.add(M.sand,new THREE.CircleGeometry(6,28).rotateX(-Math.PI/2),0,.12,0);const N=20;for(let i=0;i<N;i++){const a=i/N*Math.PI*2;const x=Math.cos(a)*7.2,z=Math.sin(a)*7.2;
      k.add(S,boxG(2.4,4.8,1.2),x,2.4,z,-a+Math.PI/2);if(i%2===0)k.box(M.win,.6,1,.1,Math.cos(a)*7.85,1.6,Math.sin(a)*7.85,-a+Math.PI/2);k.add(S,boxG(2.4,.6,.8),Math.cos(a)*7.4,5.1,Math.sin(a)*7.4,-a+Math.PI/2);
      k.add(M.stone,boxG(2.2,.4,1),Math.cos(a)*6.4,.8,Math.sin(a)*6.4,-a+Math.PI/2);k.add(M.stone,boxG(2.2,.4,1),Math.cos(a)*6.7,1.6,Math.sin(a)*6.7,-a+Math.PI/2);}break;}
  case 'wall':k.box(S,4,4.2,1.6,0,0,0);crenel(k,S,4,1.6,4.2,.55);k.box(S,1.9,4.9,1.9,-1.95,0,0);k.box(S,1.9,4.9,1.9,1.95,0,0);break;
  case 'palisade':k.add(M.bark,cylG(.4,.42,4,7),-1.8,2,0);k.add(M.bark,cylG(.4,.42,4,7),1.8,2,0);for(let i=0;i<6;i++)k.add(M.bark,cylG(.3,.32,3.6,6),-1.65+i*.66,1.8,0);for(let i=0;i<6;i++)k.add(M.bark,coneG(.3,.6,6),-1.65+i*.66,3.9,0);k.box(M.beam,4,.2,.15,0,1.6,.3);break;
  case 'tower':roundTower(k,S,R,1.7,7,0,0,3);k.box(M.beam,.9,1.6,.1,0,0,1.72);break;
  case 'gate':roundTower(k,S,R,1.4,7.2,-2.6,0,2.5);roundTower(k,S,R,1.4,7.2,2.6,0,2.5);k.box(S,3.8,2.2,2,0,4.6,0);crenel(k,S,3.8,2,6.8,.5);k.add(S,cylG(1.6,1.6,2,10,4).rotateX(Math.PI/2),0,4.4,0);
    k.box(M.beam,3,4,.3,0,0,.5);k.box(M.metal,3.1,.12,.32,0,1,.5);k.box(M.metal,3.1,.12,.32,0,2.8,.5);break;
  case 'longhouse':k.box(M.stone,9,.5,4.6,0,0,0);k.box(M.wood,8.4,2.4,4,0,.5,0,0,3);{const [g1,g2]=gableG(8.4,4,3.4,.6);k.add(M.thatch,g1,0,2.9,0);k.add(M.wood,g2,0,2.9,0);}
    for(const sx of [-1,1]){k.add(M.beam,boxG(.2,1.6,.2),sx*4.4,6.6,.35,0,0,.5);k.add(M.beam,boxG(.2,1.6,.2),sx*4.4,6.6,-.35,0,0,-.5);}k.box(M.beam,1,1.6,.1,0,.5,2.02);windows(k,8.4,4,1.8,3,.4);break;
  case 'domehouse':k.box(M.sandstone,4.4,.4,4.4,0,0,0);k.box(M.sandstone,4,3,4,0,.4,0,0,3);k.add(kind==='sand'?M.marble:M.terracotta,new THREE.SphereGeometry(1.9,12,8,0,Math.PI*2,0,Math.PI/2),0,3.4,0);k.box(M.beam,.9,1.5,.1,0,.4,2.02);
    k.add(M.sandstone,new THREE.CylinderGeometry(.45,.45,.1,10,1,false,0,Math.PI).rotateX(Math.PI/2).rotateZ(Math.PI/2),0,1.9,2.03);windows(k,4,4,2.3,2,.5);k.box(colMat(0xaa3322),1.8,.08,1.2,1.2,2.4,2.4);break;
  case 'elfhouse':k.add(M.marble,cylG(2.2,2.3,.4,14),0,.2,0);k.add(M.marble,cylG(1.6,1.8,5.5,12),0,3.15,0);k.add(M.teal,coneG(2.2,4.5,12),0,8.15,0);k.add(M.gold,coneG(.08,1,5),0,10.8,0);
    for(let i=0;i<3;i++){const a=i*2.1;k.box(M.win,.35,.9,.08,Math.cos(a)*1.72,3.4,Math.sin(a)*1.72,-a+Math.PI/2);}k.box(M.beam,.8,1.6,.1,0,.4,1.78);
    k.add(M.leaf,jitter(new THREE.IcosahedronGeometry(1,1),.25,5),1.6,1,1.2);k.add(M.leaf,jitter(new THREE.IcosahedronGeometry(.8,1),.25,6),-1.7,.8,.9);break;
  case 'dwarfhouse':k.add(M.rock,jitter(new THREE.SphereGeometry(3,10,7,0,Math.PI*2,0,Math.PI/2),.4,9),0,0,-.6,0,0,0,1.2,.9,1);k.box(M.granite,2.6,2.6,.8,0,0,2);k.box(colMat(0x0a0806),1.1,1.7,.1,0,0,2.42);
    k.box(M.gold,2.8,.25,.9,0,2.6,2);k.box(M.win,.5,.5,.08,-.9,1.4,2.42);k.box(M.win,.5,.5,.08,.9,1.4,2.42);k.box(M.granite,.7,1.8,.7,1.4,2,-1.2);break;
  case 'hut':k.add(M.dirt,new THREE.CircleGeometry(2.6,12).rotateX(-Math.PI/2),0,.06,0);k.add(M.hide,coneG(2.3,4,8),0,2,0);for(let i=0;i<5;i++){const a=i/5*Math.PI*2;k.add(M.beam,cylG(.06,.06,1.2,4),Math.cos(a)*.3,4.2,Math.sin(a)*.3,0,Math.cos(a)*.4,Math.sin(a)*.4);}
    k.box(colMat(0x1a120a),.9,1.3,.1,0,0,2.05,0);k.add(M.bone,new THREE.SphereGeometry(.25,6,5),0,1.6,2.15);break;
  case 'grave':k.box(M.darkstone,.7,1,.25,0,0,0);k.box(M.dirt,.9,.2,1.8,0,0,1);break;
  }
}
export function kitPlace(k,type,kind,x,y,z,ry=0,sc=1){k.pm=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),ry),new THREE.Vector3(sc,sc,sc));buildParts(k,type,kind);k.pm=null;}
// construction scaffold
export function scaffold(w,d,h){const k=new Kit();const W=w*4-1,D=d*4-1;for(const sx of [-1,1])for(const sz of [-1,1])k.box(M.beam,.15,h,.15,sx*W/2,0,sz*D/2);
  for(let y=1;y<h;y+=1.6){k.box(M.beam,W,.12,.12,0,y,D/2);k.box(M.beam,W,.12,.12,0,y,-D/2);k.box(M.beam,.12,.12,D,W/2,y,0);k.box(M.beam,.12,.12,D,-W/2,y,0);}return k.build(false);}

// ---------- people ----------
const pGeo={boot:new THREE.BoxGeometry(.2,.16,.32),belt:new THREE.CylinderGeometry(.34,.34,.08,10),neck:new THREE.CylinderGeometry(.09,.1,.14,8),shoulders:new THREE.SphereGeometry(.36,10,6,0,Math.PI*2,0,Math.PI*.4),cape:new THREE.PlaneGeometry(.62,1.25,1,4).translate(0,-.62,0),leg:new THREE.CapsuleGeometry(.13,.55,3,6),arm:new THREE.CapsuleGeometry(.1,.5,3,6),torso:new THREE.CylinderGeometry(.27,.33,.85,8),head:new THREE.SphereGeometry(.22,12,10),hair:new THREE.SphereGeometry(.235,10,8,0,Math.PI*2,0,Math.PI*.55),
  helm:new THREE.SphereGeometry(.26,10,8,0,Math.PI*2,0,Math.PI*.55),hood:new THREE.ConeGeometry(.3,.5,8),skirt:new THREE.CylinderGeometry(.33,.42,.45,8),horn:new THREE.ConeGeometry(.06,.3,6),sword:new THREE.BoxGeometry(.06,.9,.12),eye:new THREE.SphereGeometry(.04,6,4)};
pGeo.leg.translate(0,-.4,0);pGeo.arm.translate(0,-.33,0);
export function makePerson(o={}){
  const kind=o.kind||'human';const g=new THREE.Group();
  const race=o.race||'human';const skin=colMat(kind==='zombie'?0x7a9a6a:kind==='demon'?0xa02818:kind==='orc'?0x5f7a38:race==='elf'?0xf0d8c0:(o.skin??0xd8a880),{roughness:.7});
  const shirt=colMat(o.shirt??0x6a4a2a),pants=colMat(o.pants??0x3a3028),hair=colMat(o.hair??0x3a2410);
  const legL=new THREE.Mesh(pGeo.leg,pants),legR=new THREE.Mesh(pGeo.leg,pants);legL.position.set(-.13,.75,0);legR.position.set(.13,.75,0);
  const torso=new THREE.Mesh(pGeo.torso,shirt);torso.position.y=1.2;const skirt=new THREE.Mesh(pGeo.skirt,shirt);skirt.position.y=.82;
  const armL=new THREE.Mesh(pGeo.arm,o.armor?M.metal:shirt),armR=new THREE.Mesh(pGeo.arm,o.armor?M.metal:shirt);armL.position.set(-.37,1.55,0);armR.position.set(.37,1.55,0);
  const head=new THREE.Mesh(pGeo.head,skin);head.position.y=1.85;
  const boot=colMat(0x2a1c12);const bL=new THREE.Mesh(pGeo.boot,boot),bR=new THREE.Mesh(pGeo.boot,boot);bL.position.set(0,-.78,.04);bR.position.set(0,-.78,.04);legL.add(bL);legR.add(bR);
  const belt=new THREE.Mesh(pGeo.belt,colMat(0x3a2414));belt.position.y=.86;const neck=new THREE.Mesh(pGeo.neck,skin);neck.position.y=1.66;
  const sh=new THREE.Mesh(pGeo.shoulders,o.armor?M.metal:shirt);sh.position.y=1.56;
  g.add(legL,legR,torso,skirt,armL,armR,head,belt,neck,sh);
  if(o.cape){const c=new THREE.Mesh(pGeo.cape,cloth(o.cape));c.position.set(0,1.62,-.3);c.rotation.x=.12;g.add(c);g.userData_cape=c;}
  if(o.armor){const ch=new THREE.Mesh(pGeo.torso,M.metal);ch.scale.set(1.08,.8,1.12);ch.position.y=1.28;g.add(ch);}
  if(kind==='human'||kind==='orc'&&o.helmet){if(o.helmet){const h=new THREE.Mesh(pGeo.helm,M.metal);h.position.y=1.9;g.add(h);}else if(o.hood){const h=new THREE.Mesh(pGeo.hood,shirt);h.position.y=2.02;g.add(h);}else{const h=new THREE.Mesh(pGeo.hair,hair);h.position.y=1.88;h.rotation.x=-.25;g.add(h);}}
  if(kind==='demon'){for(const s of [-1,1]){const h=new THREE.Mesh(pGeo.horn,colMat(0x1a1010));h.position.set(s*.13,2.08,0);h.rotation.z=-s*.4;g.add(h);}
    for(const s of [-1,1]){const e=new THREE.Mesh(pGeo.eye,new THREE.MeshBasicMaterial({color:0xffcc00}));e.position.set(s*.08,1.9,.19);g.add(e);}}
  if(kind==='zombie'){for(const s of [-1,1]){const e=new THREE.Mesh(pGeo.eye,new THREE.MeshBasicMaterial({color:0xccff66}));e.position.set(s*.08,1.88,.19);g.add(e);}}
  if(kind==='orc'){for(const s of [-1,1]){const t=new THREE.Mesh(pGeo.horn,M.bone);t.position.set(s*.09,1.76,.17);t.rotation.x=-2.6;t.scale.setScalar(.7);g.add(t);const e=new THREE.Mesh(pGeo.eye,new THREE.MeshBasicMaterial({color:0xff3a1a}));e.position.set(s*.08,1.9,.19);g.add(e);}g.scale.set(1.18,1.1,1.18);}
  if(race==='elf'){for(const s of [-1,1]){const e=new THREE.Mesh(pGeo.horn,skin);e.position.set(s*.22,1.92,0);e.rotation.z=-s*1.1;g.add(e);}g.scale.set(.92,1.1,.92);}
  if(race==='dwarf'){const b=new THREE.Mesh(pGeo.hood,hair);b.rotation.x=Math.PI;b.position.set(0,1.62,.12);b.scale.set(.75,.9,.6);g.add(b);g.scale.set(1.15,.78,1.15);}
  let weapon=null;if(o.weapon){weapon=new THREE.Mesh(pGeo.sword,M.metal);weapon.position.set(0,-.6,.25);weapon.rotation.x=Math.PI/2;armR.add(weapon);}
  if(o.tool){weapon=new THREE.Mesh(new THREE.BoxGeometry(.05,.7,.05),M.beam);weapon.position.set(0,-.55,.15);weapon.rotation.x=1.2;armR.add(weapon);}
  if(GQ==='high')g.traverse(m=>{if(m.isMesh)m.castShadow=true;});
  g.userData={legL,legR,armL,armR,head,torso,phase:Math.random()*6,kind,weapon,race};
  if(kind==='zombie'){armL.rotation.x=-1.4;armR.rotation.x=-1.3;}
  return g;}
export function animPerson(p,speed,dt,attack=0){const u=p.userData;u.phase+=dt*speed*5.5;const s=Math.sin(u.phase)*Math.min(1,speed*.6);
  u.legL.rotation.x=s*.7;u.legR.rotation.x=-s*.7;
  if(u.kind!=='zombie'){u.armL.rotation.x=-s*.5;u.armR.rotation.x=attack>0?-2.4+attack*3.2:s*.5;}else{u.armR.rotation.x=attack>0?-2+attack*2:-1.3+s*.1;}
  u.torso.position.y=1.2+Math.abs(s)*.04;}

// ---------- animals ----------
const aGeo={body:new THREE.SphereGeometry(1,12,8),leg:new THREE.CylinderGeometry(.08,.06,1,6),head:new THREE.SphereGeometry(.5,10,8),ear:new THREE.ConeGeometry(.1,.25,5),snout:new THREE.CylinderGeometry(.12,.18,.45,8),tusk:new THREE.ConeGeometry(.04,.25,5)};
aGeo.leg.translate(0,-.5,0);
export const ANIMALS={deer:{name:'Deer',icon:'🦌',col:0x8a5a32,size:1,food:30,danger:0,speed:4},wolf:{name:'Wolf',icon:'🐺',col:0x6a6460,size:.85,food:12,danger:2,speed:5},
  boar:{name:'Boar',icon:'🐗',col:0x4a3426,size:.8,food:25,danger:1,speed:3.5},bear:{name:'Bear',icon:'🐻',col:0x3a2616,size:1.5,food:45,danger:3,speed:3},
  unicorn:{name:'Unicorn',icon:'🦄',col:0xf4f0ff,size:1.1,food:0,faith:40,danger:0,speed:5,myth:true},troll:{name:'Forest Troll',icon:'👹',col:0x6a7a6a,size:2.4,food:0,gold:60,danger:5,speed:2.6,myth:true}};
function makeTroll(){const p=makePerson({kind:'orc',skin:0x6a7a6a,shirt:0x8a7450,pants:0x5a4a32});p.traverse(m=>{if(m.isMesh&&m.material.color&&m.material.color.getHex()===0x5f7a38)m.material=colMat(0xa0a890,{roughness:.9});});
  const club=new THREE.Mesh(new THREE.CylinderGeometry(.16,.07,1.4,6),M.darkbark);club.position.set(0,-.8,.3);club.rotation.x=Math.PI/2;p.userData.armR.add(club);p.scale.set(2.6,2.3,2.6);
  const u=p.userData;return {g:p,legs:[u.legL,u.armR,u.armL,u.legR]};}
export function makeAnimal(type){const A=ANIMALS[type];if(type==='troll'){const t=makeTroll();const g=new THREE.Group();g.add(t.g);g.userData={legs:t.legs,phase:0,type,biped:true};return g;}const g=new THREE.Group();const m=colMat(A.col,{roughness:.95});const dark=colMat(0x1a1410);
  const s=A.size;const body=new THREE.Mesh(aGeo.body,m);body.scale.set(.45*s,.42*s,(type==='bear'?.8:.75)*s);body.position.y=(type==='boar'?.65:type==='bear'?1:.95)*s;g.add(body);
  const legs=[];const lh=(type==='deer'?1:type==='wolf'?.75:type==='boar'?.5:.75)*s;
  for(const [x,z] of [[-.22,.45],[.22,.45],[-.22,-.45],[.22,-.45]]){const l=new THREE.Mesh(aGeo.leg,type==='deer'?m:dark);l.scale.set(type==='bear'?2.2:1.2,lh,type==='bear'?2.2:1.2);l.position.set(x*s,body.position.y-.05,z*s);g.add(l);legs.push(l);}
  const head=new THREE.Mesh(aGeo.head,m);head.scale.set(.6*s,.6*s,(type==='wolf'?1:.8)*s);head.position.set(0,body.position.y+(type==='deer'?.55:.2)*s,.8*s);g.add(head);
  const sn=new THREE.Mesh(aGeo.snout,type==='deer'?m:dark);sn.rotation.x=Math.PI/2;sn.scale.setScalar(s*(type==='wolf'?1.1:1));sn.position.set(0,head.position.y-.08*s,head.position.z+.35*s);g.add(sn);
  for(const sx of [-1,1]){const e=new THREE.Mesh(aGeo.ear,m);e.scale.setScalar(s);e.position.set(sx*.15*s,head.position.y+.25*s,head.position.z-.05);e.rotation.z=-sx*.3;g.add(e);}
  if(type==='deer'){for(const sx of [-1,1]){const a=new THREE.Mesh(new THREE.CylinderGeometry(.025,.04,.6,5),colMat(0xd8c8a8));a.position.set(sx*.15,head.position.y+.5,head.position.z-.1);a.rotation.z=-sx*.5;g.add(a);
    const b=a.clone();b.scale.setScalar(.6);b.position.y+=.18;b.position.x+=sx*.12;b.rotation.z=sx*.4;g.add(b);}}
  if(type==='boar')for(const sx of [-1,1]){const t=new THREE.Mesh(aGeo.tusk,colMat(0xeeeedd));t.position.set(sx*.1,sn.position.y-.02,sn.position.z+.15);t.rotation.x=-.9;g.add(t);}
  if(type==='unicorn'){const h=new THREE.Mesh(new THREE.ConeGeometry(.06,.75,6),M.gold);h.position.set(0,head.position.y+.38,head.position.z+.22);h.rotation.x=.6;g.add(h);
    const mane=new THREE.Mesh(new THREE.BoxGeometry(.08,.35,.9),colMat(0xd8b8ff));mane.position.set(0,body.position.y+.42,.35);mane.rotation.x=-.5;g.add(mane);const tl=new THREE.Mesh(new THREE.ConeGeometry(.12,.8,6),colMat(0xd8b8ff));tl.rotation.x=-2.4;tl.position.set(0,body.position.y+.05,-.85);g.add(tl);
    const gl=new THREE.Mesh(new THREE.SphereGeometry(1.3,10,8),new THREE.MeshBasicMaterial({color:0xcab0ff,transparent:true,opacity:.12,depthWrite:false}));gl.position.y=body.position.y;g.add(gl);}
  if(type==='wolf'){const t=new THREE.Mesh(new THREE.ConeGeometry(.12,.7,6),m);t.rotation.x=-2;t.position.set(0,body.position.y+.1,-.75);g.add(t);}
  if(GQ==='high')g.traverse(o=>{if(o.isMesh)o.castShadow=true;});
  g.userData={legs,phase:Math.random()*6,type};return g;}
export function animAnimal(a,speed,dt){const u=a.userData;if(u.biped){u.phase+=dt*speed*2;const s=Math.sin(u.phase)*Math.min(1,speed*.5);u.legs[0].rotation.x=s*.6;u.legs[3].rotation.x=-s*.6;u.legs[1].rotation.x=-s*.5;u.legs[2].rotation.x=s*.5;return;}u.phase+=dt*speed*3;const s=Math.sin(u.phase)*Math.min(1,speed*.5);u.legs[0].rotation.x=s*.6;u.legs[3].rotation.x=s*.6;u.legs[1].rotation.x=-s*.6;u.legs[2].rotation.x=-s*.6;}

// ---------- flying mythical creatures: dragon & griffin ----------
function wingGeo(span,chord){const g=new THREE.BufferGeometry();const p=[0,0,chord*.5, span*.45,0,chord*.35, span,0,-chord*.1, span*.55,0,-chord*.45, span*.25,0,-chord*.6, 0,0,-chord*.5];
  const idx=[0,1,5,1,4,5,1,3,4,1,2,3];g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return g;}
export function makeFlyer(type){const g=new THREE.Group();const dragon=type==='dragon';const sc=dragon?1:.45;
  const body=colMat(dragon?0x7a1a12:0xb08850,{roughness:.55,metalness:dragon?.2:0}),belly=colMat(dragon?0xc8a050:0xf0e8d8),wingM=new THREE.MeshStandardMaterial({color:dragon?0x5a1010:0x9a7040,side:THREE.DoubleSide,roughness:.7});
  const b=new THREE.Mesh(new THREE.SphereGeometry(1,14,10),body);b.scale.set(1.3,1.2,3.2);g.add(b);const bl=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),belly);bl.scale.set(1.05,.9,2.6);bl.position.y=-.35;g.add(bl);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.45,.8,3,8),body);neck.rotation.x=1.1;neck.position.set(0,.9,3.6);g.add(neck);
  const head=new THREE.Group();head.position.set(0,1.8,5);g.add(head);const hm=new THREE.Mesh(new THREE.BoxGeometry(.9,.75,1.8),dragon?body:belly);head.add(hm);
  if(dragon){for(const s of [-1,1]){const h=new THREE.Mesh(new THREE.ConeGeometry(.15,1.2,5),M.bone);h.position.set(s*.35,.5,-.6);h.rotation.x=-2.2;head.add(h);const e=new THREE.Mesh(new THREE.SphereGeometry(.1,6,4),new THREE.MeshBasicMaterial({color:0xffd02a}));e.position.set(s*.4,.2,.4);head.add(e);}}
  else{const bk=new THREE.Mesh(new THREE.ConeGeometry(.25,.8,6),M.gold);bk.rotation.x=Math.PI/2;bk.position.z=1.2;head.add(bk);}
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.7,dragon?7:3,8),body);tail.rotation.x=-Math.PI/2;tail.position.set(0,0,dragon?-6.4:-4.2);g.add(tail);
  if(dragon)for(let i=0;i<6;i++){const sp=new THREE.Mesh(new THREE.ConeGeometry(.2,.7,4),belly);sp.position.set(0,1.1-i*.08,2-i*1.3);g.add(sp);}
  const wg=wingGeo(dragon?9:7,dragon?5:3.6);const wL=new THREE.Mesh(wg,wingM),wR=new THREE.Mesh(wg,wingM);wR.scale.x=-1;wL.position.set(.8,.7,.5);wR.position.set(-.8,.7,.5);g.add(wL,wR);
  for(const [x,z] of [[.6,1.6],[-.6,1.6],[.6,-1.6],[-.6,-1.6]]){const l=new THREE.Mesh(new THREE.CylinderGeometry(.18,.12,1.4,6),body);l.position.set(x,-1.1,z);l.rotation.x=.9;g.add(l);}
  g.scale.setScalar(sc);if(GQ!=='low')g.traverse(m=>{if(m.isMesh)m.castShadow=true;});g.userData={wL,wR,head,phase:Math.random()*6,type};return g;}
export function animFlyer(f,dt,flap=1){const u=f.userData;u.phase+=dt*(u.type==='dragon'?2.6:4.5)*flap;const a=Math.sin(u.phase)*.75;u.wL.rotation.z=a;u.wR.rotation.z=-a;}
export function initGfx(canvas){initRenderer(canvas);initMats();}
