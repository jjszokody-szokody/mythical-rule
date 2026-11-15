// Mythical Rule — kingdom state, economy simulation, AI kingdoms, diplomacy and battles.
import {BUILDINGS,JOBS,LAWS,DEFAULT_LAWS,RELIGIONS,STANCES,DECISIONS,KINGDOM_NAMES,RULERS,PERSONALITIES,FIRST,ZOMBIE_NAMES,DEMON_NAMES,COLORS,EMBLEMS,CUSTOM_RATE,DAY_SEC,MONTH_DAYS,MONTHS,GRID,HALF,CELL} from './data.js';
import {rng} from './gfx.js';
export const G={s:null,paused:false,modal:false,hooks:{},fast:false,debug:false};
const P=new URLSearchParams(location.search);G.debug=P.has('debug');G.fast=P.has('fast');
export const MONTH_SEC=()=>G.fast?90:DAY_SEC*MONTH_DAYS;
export const DAYLEN=()=>MONTH_SEC()/MONTH_DAYS;
export const RATE_SEC=()=>G.fast?9:60; // economy rates are per 60 real seconds
export const EVENT_GAP=()=>G.fast?[14,24]:[120,300];
const hook=(n,...a)=>G.hooks[n]&&G.hooks[n](...a);
export const rnd=(a,b)=>a+Math.random()*(b-a), ri=(a,b)=>Math.floor(rnd(a,b+1)), pick=a=>a[Math.floor(Math.random()*a.length)];
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// ---------- new game ----------
export function newGame(cfg){
  const seed=(Math.random()*1e9)|0;const r=rng(seed);
  const s={v:1,seed,name:cfg.name||'Avalon',ruler:cfg.ruler||'',c1:cfg.c1,c2:cfg.c2,emblem:cfg.emblem,bstyle:cfg.bstyle||0,religion:cfg.religion,relName:cfg.relName||RELIGIONS[cfg.religion].name,stance:cfg.stance,
    res:{gold:180,food:140,wood:140,stone:70,iron:20,faith:20,weapons:0},pop:14,happy:62,buildings:[],nextId:1,
    jobs:{farmer:4,woodcutter:3,guard:2,builder:2},customJobs:[],autoJobs:true,laws:{...DEFAULT_LAWS},cds:{},buffs:[],
    time:0,nextEvent:0,monthStart:0,month:0,ai:[],immortals:[],chronicle:[],tut:0,arenaCount:0,arenaWins:0,tribTrain:0,lastEvents:[],growT:0,starveT:0,stats:{built:0,battlesWon:0,battlesLost:0},lowHappyT:0,armyBuff:0};
  s.nextEvent=G.fast?20:rnd(90,150);
  // starting layout
  const add=(type,i,j,rot=0)=>{const b={id:s.nextId++,type,i,j,rot,prog:1,hp:BUILDINGS[type].hp};s.buildings.push(b);return b;};
  add('castle',13,13);add('house',10,13);add('house',10,16);add('house',19,12);add('farm',13,19);add('mill',13,9);add('well',18,17);
  // AI kingdoms
  const used=new Set([cfg.name]);const names=KINGDOM_NAMES.filter(n=>n!==cfg.name);
  const angles=[0,1,2,3,4].map(i=>i/5*Math.PI*2+r()*0.5);const kinds=['human','human','zombie','human','demon'];
  const pers=Object.keys(PERSONALITIES);const cols=[...COLORS].sort(()=>r()-.5);
  kinds.forEach((kind,i)=>{const a=angles[i],d=205+r()*35;
    const k={id:i+1,kind,x:Math.cos(a)*d,z:Math.sin(a)*d,alive:true,status:kind==='human'?'peace':'war',trade:false,immortals:0,truceUntil:0,warSince:0,lastAttack:0,vassal:false};
    if(kind==='human'){k.name=names.splice(Math.floor(r()*names.length),1)[0];k.ruler=RULERS[Math.floor(r()*RULERS.length)];k.pers=pers[Math.floor(r()*pers.length)];k.c1=cols[i*2];k.c2=cols[i*2+1]===cfg.c1?'#f1e7c8':cols[i*2+1];k.emblem=EMBLEMS[Math.floor(r()*EMBLEMS.length)];
      k.army=22+r()*16;k.gold=200;k.rel=Math.round(STANCES[cfg.stance].rel+(k.pers==='aggressive'?-25:k.pers==='honorable'?10:0)+r()*20-10);k.relig=Object.keys(RELIGIONS)[Math.floor(r()*6)];}
    else if(kind==='zombie'){k.name='The Rotlands';k.ruler=ZOMBIE_NAMES[Math.floor(r()*ZOMBIE_NAMES.length)];k.c1='#2c3a26';k.c2='#7a9a5a';k.emblem='💀';k.army=30;k.rel=-100;k.pers='horde';}
    else{k.name='Hellmouth';k.ruler=DEMON_NAMES[Math.floor(r()*DEMON_NAMES.length)];k.c1='#3a0a0a';k.c2='#ff5a1a';k.emblem='😈';k.army=34;k.rel=-80;k.pers='demon';}
    s.ai.push(k);});
  G.s=s;log(`${s.name} is founded under ${s.relName}. Long may you reign.`);
  return s;}

// ---------- helpers ----------
export function log(txt,type=''){const s=G.s;s.chronicle.unshift({t:s.time,txt,type});if(s.chronicle.length>80)s.chronicle.pop();hook('log',txt,type);}
export function dateStr(t=G.s.time){const ms=MONTH_SEC(),d=DAYLEN();const m=Math.floor(t/ms);const day=Math.floor((t%ms)/d)+1;return `Day ${day} · ${MONTHS[m%12]}${m>=12?' Y'+(1+Math.floor(m/12)):''}`;}
export function canAfford(cost,mult=1){const r=G.s.res;for(const k in cost)if((r[k]||0)<cost[k]*mult)return false;return true;}
export function pay(cost,mult=1){for(const k in cost)G.s.res[k]-=cost[k]*mult;}
export function addRes(o){const s=G.s;for(const k in o){if(k==='pop')s.pop=Math.max(1,s.pop+o[k]);else if(k==='happy')s.happy=clamp(s.happy+o[k],0,100);else if(k==='army')s.armyBuff=Math.max(0,s.armyBuff+o[k]);else s.res[k]=Math.max(0,(s.res[k]||0)+o[k]);}}
export function costStr(c,mult=1){const ic={gold:'🪙',food:'🍖',wood:'🪵',stone:'🪨',iron:'⛓️',faith:'✨'};return Object.entries(c).map(([k,v])=>`${ic[k]||k}${Math.round(v*mult)}`).join(' ')||'Free';}
export const law=id=>LAWS[id].opts.find(o=>o.id===G.s.laws[id]);
export const rel=()=>RELIGIONS[G.s.religion].fx;
export const stance=()=>STANCES[G.s.stance];
export function lawMod(k,def=1){let v=def;for(const id in LAWS){const o=law(id);if(o&&o[k]!==undefined)v=(def===0?v+o[k]:v*o[k]);}return v;}
export function buffMod(k){let v=0;for(const b of G.s.buffs)if(b.until>G.s.time&&b[k])v+=b[k];return v;}
export function built(type){return G.s.buildings.filter(b=>b.type===type&&b.prog>=1&&b.hp>BUILDINGS[type].hp*.35);}
export function count(type){return G.s.buildings.filter(b=>b.type===type).length;}
export function popCap(){let c=0;for(const b of G.s.buildings)if(b.prog>=1)c+=BUILDINGS[b.type].house||0;return c;}
export function slots(job){const J=JOBS[job];if(!J)return 999;if(!J.bld)return 999;let n=0;for(const t of J.bld.split('|'))for(const b of built(t))n+=BUILDINGS[t].jobs[job]||0;return n;}
export function assigned(){let n=0;for(const k in G.s.jobs)n+=G.s.jobs[k];for(const c of G.s.customJobs)n+=c.count;return n;}
export function idle(){return Math.max(0,G.s.pop-assigned());}
export function foodCap(){return 250+built('granary').length*300;}
export function setJob(job,n){const s=G.s;const cj=s.customJobs.find(c=>c.id===job);const cur=cj?cj.count:(s.jobs[job]||0);
  n=Math.max(0,Math.min(n,cj?999:slots(job)));n=Math.min(n,cur+idle());if(cj)cj.count=n;else s.jobs[job]=n;}
export function clampJobs(){const s=G.s;for(const j in s.jobs){if(s.jobs[j]>slots(j))s.jobs[j]=slots(j);}
  let over=assigned()-s.pop;const order=['builder','trainer','innkeeper','merchant','priest','smith','miner','mason','hunter','soldier','guard','woodcutter','farmer'];
  for(const c of s.customJobs){while(over>0&&c.count>0){c.count--;over--;}}
  for(const j of order){while(over>0&&(s.jobs[j]||0)>0){s.jobs[j]--;over--;}}}
export function autoAssign(){const s=G.s;let free=idle();if(free<=0)return;
  const fill=(j,max=99)=>{while(free>0&&(s.jobs[j]||0)<Math.min(slots(j),max)){s.jobs[j]=(s.jobs[j]||0)+1;free--;}};
  const net=rates().food;if(net<1)fill('farmer');fill('hunter',net<0?99:1);
  if((s.jobs.builder||0)<2&&s.buildings.some(b=>b.prog<1))fill('builder',2);
  for(const j of ['farmer','woodcutter','mason','guard','priest','merchant','miner','innkeeper','smith','trainer','soldier','hunter'])fill(j);
  if(free>0&&(s.jobs.builder||0)<3)fill('builder',3);}

// ---------- army ----------
export function armyPower(){const s=G.s,j=s.jobs;const sol=Math.min(j.soldier||0,slots('soldier')),gd=Math.min(j.guard||0,slots('guard'));
  let cust=0;for(const c of s.customJobs)if(c.prod==='army')cust+=c.count*2.2;
  const wf=1+Math.min(.6,(s.res.weapons||0)/((sol+gd)*8+4)*.6);const tf=1+Math.min(.15,(j.trainer||0)*.075);
  const mult=stance().army*lawMod('army')*(rel().army||1)*(1+.3*s.immortals.filter(m=>m.mine).length);
  return Math.round(((sol*3+gd*1.5+cust)*wf*tf)*mult+s.armyBuff+buffMod('army'));}
export function defense(){let d=0;for(const b of G.s.buildings)if(b.prog>=1&&b.hp>BUILDINGS[b.type].hp*.35)d+=BUILDINGS[b.type].def||0;
  let cust=0;for(const c of G.s.customJobs)if(c.prod==='def')cust+=c.count*1.5;return Math.round(d+cust+armyPower());}
export function allyHelp(){return G.s.ai.filter(k=>k.alive&&k.status==='ally').reduce((a,k)=>a+k.army*.25,0);}

// ---------- rates (per day) ----------
export function rates(){const s=G.s,out={gold:0,food:0,wood:0,stone:0,iron:0,faith:0,weapons:0,joy:0};
  const hm=s.happy<25?.75:s.happy<45?.9:s.happy>80?1.12:1;const pm=lawMod('prod')*hm*(buffMod('prod')+1);const R=rel();
  for(const j in s.jobs){const J=JOBS[j];if(!J)continue;const n=Math.min(s.jobs[j],slots(j));for(const k in J.prod){let v=J.prod[k]*n*pm;
      if(k==='food'&&j==='farmer')v*=R.food||1;if(j==='hunter')v*=(R.hunt||1)*lawMod('hunt');if(k==='wood')v*=R.wood||1;if(k==='faith')v*=(R.faith||1)*lawMod('faith');if(k==='gold')v*=R.gold||1;
      if(j==='merchant')v*=lawMod('trade')*(1+.15*s.ai.filter(a=>a.trade&&a.alive).length);out[k]=(out[k]||0)+v;}
    if(J.use)for(const k in J.use)out[k]-=J.use[k]*n*pm;if(J.upkeep)out.gold-=J.upkeep*n;}
  for(const c of s.customJobs){const v=CUSTOM_RATE[c.prod]*c.count*pm;if(c.prod in out)out[c.prod]+=v;}
  if(s.res.iron<=0&&out.weapons>0){out.weapons=0;out.iron=Math.max(0,out.iron);}
  out.gold+=s.pop*law('tax').gold*(R.gold||1);out.gold-=law('arena').cost||0;
  out.gold+=s.ai.filter(a=>a.trade&&a.alive).length*6*lawMod('trade');out.gold+=s.ai.filter(a=>a.vassal&&a.alive).length*15;
  out.faith+=built('statue').length*.5+built('temple').length*.5;
  out.food-=s.pop*law('ration').eat;return out;}
export function happyTarget(){const s=G.s;let h=55+lawMod('happy',0)+stance().happy+(rel().happy||0);
  let bh=0;for(const b of built('well').concat(built('garden'),built('statue'),built('temple'),built('tavern'),built('arena'),built('manor')))bh+=BUILDINGS[b.type].happy||0;h+=Math.min(22,bh);
  const r=rates();h+=Math.min(12,(r.joy||0)*.6);if(s.res.food<=0)h-=25;else if(s.res.food>s.pop*4)h+=4;
  h-=s.ai.filter(a=>a.alive&&a.status==='war'&&a.kind==='human').length*3;h+=s.immortals.filter(m=>m.mine).length*3;h+=buffMod('happy');
  if(idle()>s.pop*.35)h-=6;return clamp(h,0,100);}

// ---------- main tick ----------
export function tick(dt){const s=G.s;if(!s)return;s.time+=dt;const D=DAYLEN();const r=rates();
  for(const k of ['gold','food','wood','stone','iron','faith','weapons'])s.res[k]=Math.max(0,s.res[k]+(r[k]||0)*dt/RATE_SEC());
  if(s.res.food>foodCap())s.res.food-= (s.res.food-foodCap())*.02*dt;
  s.happy+=(happyTarget()-s.happy)*Math.min(1,dt*.08);
  // growth
  const cap=popCap();
  if(s.res.food>3&&s.pop<cap&&s.happy>=30){s.growT+=dt*law('ration').grow*(.5+s.happy/100)*(G.fast?3:1);if(s.growT>22){s.growT=0;s.pop++;if(s.autoJobs)autoAssign();hook('pop',+1);}}
  if(s.pop>cap+2){s.growT=0;if(Math.random()<dt*.02){s.pop--;log('A family left: not enough housing.','bad');}}
  if(s.res.food<=0){s.starveT+=dt;if(s.starveT>15){s.starveT=0;if(s.pop>3){s.pop--;clampJobs();log('A citizen died of hunger.','bad');hook('pop',-1);}}}else s.starveT=0;
  if(s.happy<22){s.lowHappyT+=dt;}else s.lowHappyT=Math.max(0,s.lowHappyT-dt);
  // construction & repair
  const bld=(s.jobs.builder||0);let active=s.buildings.filter(b=>b.prog<1);
  for(const b of active){const B=BUILDINGS[b.type];const tot=Object.values(B.cost).reduce((a,v)=>a+v,0);const time=(8+tot/7)*(G.fast?.4:1);b.prog=Math.min(1,b.prog+dt/time*(1+bld*.6)/Math.max(1,active.length*.7));
    if(b.prog>=1){b.hp=B.hp;log(`${B.name} completed.`,'good');hook('built',b);s.stats.built++;if(s.autoJobs)autoAssign();}}
  for(const b of s.buildings){const B=BUILDINGS[b.type];if(b.prog>=1&&b.hp<B.hp&&b.repairing){b.hp=Math.min(B.hp,b.hp+dt*B.hp*.04*(1+bld*.3));if(b.hp>=B.hp)b.repairing=false;}}
  s.buffs=s.buffs.filter(b=>b.until>s.time);if(s.armyBuff>0)s.armyBuff=Math.max(0,s.armyBuff-dt*.01);
  aiTick(dt);
  clampJobs();}

// ---------- buildings ----------
export function footprint(type,rot){const B=BUILDINGS[type];return rot%2?[B.d,B.w]:[B.w,B.d];}
export function cellCenter(i,j,type,rot){const [w,d]=footprint(type,rot);return {x:(i+w/2-HALF)*CELL,z:(j+d/2-HALF)*CELL};}
export function occupancy(ignoreId){const o=new Int32Array(GRID*GRID);for(const b of G.s.buildings){if(b.id===ignoreId)continue;const [w,d]=footprint(b.type,b.rot);for(let x=0;x<w;x++)for(let z=0;z<d;z++){const ii=b.i+x,jj=b.j+z;if(ii>=0&&jj>=0&&ii<GRID&&jj<GRID)o[jj*GRID+ii]=b.id;}}return o;}
export function canPlace(type,i,j,rot,ignoreId){const [w,d]=footprint(type,rot);if(i<0||j<0||i+w>GRID||j+d>GRID)return false;const o=occupancy(ignoreId);for(let x=0;x<w;x++)for(let z=0;z<d;z++)if(o[(j+z)*GRID+i+x])return false;return true;}
export function buildingAt(i,j){if(i<0||j<0||i>=GRID||j>=GRID)return null;const id=occupancy()[j*GRID+i];return id?G.s.buildings.find(b=>b.id===id):null;}
export function place(type,i,j,rot){const B=BUILDINGS[type];if(!canAfford(B.cost))return 'Not enough resources';if(!canPlace(type,i,j,rot))return 'Space is blocked';
  pay(B.cost);const b={id:G.s.nextId++,type,i,j,rot,prog:G.debug&&P.has('instant')?1:0,hp:B.hp};G.s.buildings.push(b);if(G.s.autoJobs&&(G.s.jobs.builder||0)<1)autoAssign();return b;}
export function demolish(b){const B=BUILDINGS[b.type];if(B.fixed)return false;G.s.buildings=G.s.buildings.filter(x=>x!==b);const refund=b.prog>=1?.5:.9;for(const k in B.cost)G.s.res[k]+=Math.floor(B.cost[k]*refund);clampJobs();return true;}
export function moveBuilding(b,i,j,rot){if(!canPlace(b.type,i,j,rot,b.id))return false;b.i=i;b.j=j;b.rot=rot;return true;}
export function repairCost(b){const B=BUILDINGS[b.type];const f=1-b.hp/B.hp;const c={};for(const k in B.cost)c[k]=Math.ceil(B.cost[k]*.5*f);if(!Object.keys(c).length)c.gold=Math.ceil(40*f);return c;}
export function damageBuilding(b,frac){const B=BUILDINGS[b.type];b.hp=Math.max(B.hp*.05,b.hp-B.hp*frac);b.repairing=false;hook('damaged',b);}
export function randomBuilding(filter){const l=G.s.buildings.filter(b=>b.prog>=1&&(!filter||filter(b)));return l.length?pick(l):null;}

// ---------- decisions ----------
export function decide(id){const s=G.s;const D=DECISIONS.find(d=>d.id===id);if((s.cds[id]||0)>s.time)return 'Not ready yet';if(!canAfford(D.cost))return 'Not enough resources';pay(D.cost);s.cds[id]=s.time+D.cd*(G.fast?.2:1);let msg='';
  switch(id){case 'festival':s.buffs.push({id,until:s.time+DAYLEN()*2,happy:15});msg='The kingdom feasts and dances! +15 happiness.';break;
    case 'prayer':addRes({faith:40});s.buffs.push({id,until:s.time+DAYLEN()*.5,prod:-.2});msg='Bells ring across the land. +40 faith.';break;
    case 'levy':s.buffs.push({id,until:s.time+DAYLEN()*2,army:8});msg='Peasants take up spears. +8 army for 2 days.';break;
    case 'hunt':{const f=ri(35,60);addRes({food:f});msg=`The royal hunt returns with ${f} food.`;if(Math.random()<.15&&s.pop>4){s.pop--;msg+=' A hunter was killed by a bear.';}break;}
    case 'alms':addRes({happy:8,faith:10});msg='The poor bless your name.';break;
    case 'tribute_train':s.tribTrain++;msg='Your future tributes train hard. (+1 stat)';break;
    case 'sell_wood':addRes({gold:40});msg='Sold timber for 40 gold.';break;case 'buy_food':addRes({food:60});msg='Bought 60 grain.';break;
    case 'buy_iron':addRes({iron:25});msg='Bought 25 iron.';break;case 'sell_stone':addRes({gold:40});msg='Sold stone for 40 gold.';break;}
  log(msg,'good');return msg;}

// ---------- diplomacy ----------
export function aiById(id){return G.s.ai.find(a=>a.id===id);}
export function diplo(k,action,arg){const s=G.s;const Pp=PERSONALITIES[k.pers]||{};let msg='',ok=true;
  switch(action){
  case 'gift':{const g=arg||50;if(s.res.gold<g)return [false,'Not enough gold'];s.res.gold-=g;const d=Math.round(g/5*(Pp.gold||1));k.rel=clamp(k.rel+d,-100,100);msg=`${k.name} accepts your gift (+${d} relations).`;break;}
  case 'trade':{if(k.rel<5)return [false,`${k.name} doesn't trust you enough (needs relations 5+).`];if(!built('market').length)return [false,'You need a Market to trade.'];k.trade=true;k.rel=clamp(k.rel+5,-100,100);msg=`Trade route opened with ${k.name}: +6 gold/day.`;break;}
  case 'endtrade':k.trade=false;k.rel-=8;msg=`Trade with ${k.name} ended.`;break;
  case 'ally':{const need=k.pers==='cautious'?50:k.pers==='aggressive'?60:40;if(k.rel<need){k.rel-=3;return [false,`${k.ruler} refuses. (Needs relations ${need}+, you have ${Math.round(k.rel)})`];}k.status='ally';k.rel=clamp(k.rel+10,-100,100);msg=`⚜ Alliance sworn with ${k.name}! Their armies will defend you.`;break;}
  case 'war':{if(k.status==='ally'){for(const o of s.ai)if(o!==k&&o.kind==='human')o.rel-=15;}k.status='war';k.trade=false;k.rel=clamp(k.rel-40,-100,100);k.warSince=s.time;msg=`⚔ You declared war on ${k.name}!`;
    for(const o of s.ai)if(o!==k&&o.kind==='human'&&o.status!=='war'){o.rel+=(s.stance==='warlike'?-4:-8);}break;}
  case 'peace':{const cost=Math.round(40+k.army*1.5);if(arg!=='free'&&s.res.gold<cost)return [false,`They demand ${cost} gold for peace.`];
    const want=k.pers==='aggressive'?.45:.7;if(arg!=='free'&&armyPower()<k.army*want&&Math.random()<.5){k.rel-=5;return [false,`${k.ruler} laughs at your envoy. "Peace? We are winning!"`];}
    if(arg!=='free')s.res.gold-=cost;k.status='peace';k.rel=Math.max(k.rel,-10);msg=`Peace signed with ${k.name}.`;break;}
  case 'truce':{const cost=arg||{faith:40,gold:60};if(!canAfford(cost))return [false,'They want '+costStr(cost)];pay(cost);k.truceUntil=s.time+DAYLEN()*3;msg=k.kind==='demon'?`${k.ruler} accepts your offering. The demons will stay away for 3 days.`:`The dead are quiet for 3 days.`;break;}
  case 'tribute':{if(armyPower()<k.army*1.3){k.rel-=12;return [false,`${k.ruler} refuses and is insulted (−12). Your army is too weak to scare them.`];}const g=Math.round(30+k.army);s.res.gold+=g;k.rel-=20;msg=`${k.name} pays you ${g} gold tribute out of fear.`;break;}
  }
  log(msg,'diplo');return [ok,msg];}

// battle: attacker power vs defender power; returns {win, aLoss, dLoss}
export function battle(a,d){const ratio=a/Math.max(1,d)*rnd(.8,1.25);const win=ratio>1;
  const aLoss=clamp((win?.12:.35)/Math.sqrt(Math.max(.2,ratio)),0.05,.8),dLoss=clamp((win?.4:.12)*Math.sqrt(ratio),0.05,.85);return {win,aLoss,dLoss,ratio};}
export function holyMod(k){return (k.kind==='zombie'||k.kind==='demon')?(rel().holy||1)*(law('faith').holy||1):1;}
// player sends an attack (fraction of soldiers)
export function attack(k,frac){const s=G.s;const pw=Math.round(armyPower()*frac);if(pw<3)return [false,'You need soldiers to attack. Build Barracks and assign soldiers.'];
  if(k.status!=='war')return [false,'You are not at war with them.'];if(s.marching)return [false,'Your army is already marching.'];
  s.marching={target:k.id,power:pw,frac,start:s.time};hook('march','player',k,pw);return [true,`Your army (${pw} strength) marches on ${k.name}!`];}
export function resolvePlayerAttack(){const s=G.s,m=s.marching;if(!m)return;s.marching=null;const k=aiById(m.target);if(!k||!k.alive)return;
  const ally=s.ai.filter(a=>a.alive&&a.status==='ally'&&a!==k).reduce((t,a)=>t+a.army*.2,0);
  const atk=(m.power+ally)*(s.stance==='warlike'?1.1:1)*holyMod(k);const def=k.army*(k.kind==='human'?1.15:1)*(1+.3*k.immortals);const r=battle(atk,def);
  const lostSold=Math.round((s.jobs.soldier||0)*m.frac*r.aLoss);s.jobs.soldier=Math.max(0,(s.jobs.soldier||0)-lostSold);s.pop=Math.max(3,s.pop-lostSold);k.army=Math.max(0,k.army*(1-r.dLoss));
  let msg;if(r.win){s.stats.battlesWon++;const loot=Math.round((40+k.army*.8)*(s.stance==='warlike'?1.5:1));s.res.gold+=loot;s.res.food+=Math.round(loot*.6);s.happy=clamp(s.happy+(s.stance==='warlike'?8:3),0,100);
    msg=`Victory at ${k.name}! Looted ${loot} gold. Lost ${lostSold} soldiers.`;
    if(k.army<8){k.alive=k.kind==='human'?true:false;if(k.kind==='human'){k.vassal=true;k.status='vassal';k.army=10;msg+=` ${k.name} surrenders and becomes your vassal (+15 gold/day)!`;}else{msg+=k.kind==='zombie'?' The Rotlands are cleansed by fire!':' The Hellmouth is sealed!';}hook('conquered',k);}
  }else{s.stats.battlesLost++;s.happy=clamp(s.happy-6,0,100);msg=`Defeat at ${k.name}. Your army retreats, ${lostSold} soldiers lost.`;}
  log(msg,r.win?'good':'bad');hook('battle',msg,r.win);return msg;}

// AI attacks player
export function aiAttack(k,power){const s=G.s;const ally=allyHelp();const def=(defense()+ally)*(k.kind!=='human'?holyMod(k):1);const r=battle(power*(1+.3*k.immortals),def);
  let msg;const sol=s.jobs.soldier||0;const lost=Math.round(sol*(r.win?r.dLoss:r.dLoss*.6));s.jobs.soldier=Math.max(0,sol-lost);s.pop=Math.max(3,s.pop-lost);
  k.army=Math.max(0,k.army-power*r.aLoss);
  if(r.win){const n=ri(1,3);let names=[];for(let i=0;i<n;i++){const b=randomBuilding(b=>b.type!=='castle');if(b){damageBuilding(b,rnd(.4,.8));names.push(BUILDINGS[b.type].name);}}
    const steal={gold:Math.round(s.res.gold*.2),food:Math.round(s.res.food*.2)};s.res.gold-=steal.gold;s.res.food-=steal.food;const civ=k.kind==='zombie'?ri(1,3):ri(0,2);s.pop=Math.max(3,s.pop-civ);s.happy=clamp(s.happy-10,0,100);
    msg=`${k.name} broke through your defenses! Damaged: ${names.join(', ')||'nothing'}. Stolen: 🪙${steal.gold} 🍖${steal.food}. Lost ${lost} soldiers${civ?` and ${civ} citizens`:''}.${k.kind==='zombie'&&civ?' The dead rise…':''}`;}
  else{msg=`Your defenders repelled ${k.name}'s attack! (${Math.round(def)} vs ${Math.round(power)})${lost?` Lost ${lost} soldiers.`:''}`;s.happy=clamp(s.happy+3,0,100);s.stats.battlesWon++;}
  clampJobs();log(msg,r.win?'bad':'good');hook('battle',msg,!r.win);return msg;}

// ---------- AI ----------
let aiDayT=0;
function aiTick(dt){const s=G.s;aiDayT+=dt;const D=RATE_SEC();if(aiDayT<D/4)return;const step=aiDayT/D;aiDayT=0;const day=s.time/D;
  for(const k of s.ai){if(!k.alive)continue;const Pp=PERSONALITIES[k.pers]||{aggro:1};
    const grow=(k.kind==='zombie'?3.2:k.kind==='demon'?2.8:2.2+(k.pers==='aggressive'?1:0))*step*(1+day/30);k.army=Math.min(k.army+grow,60+day*6);
    if(k.vassal){k.army=Math.min(k.army,20);continue;}
    if(k.kind==='human'){
      const base=stance().rel+(k.pers==='aggressive'?-15:k.pers==='honorable'?5:0)+(k.trade?15:0)+(k.status==='ally'?20:0)+(k.relig===s.religion?10:0);k.rel+=(base-k.rel)*.02*step*4;
      if(k.status==='peace'&&k.rel<-35&&day>4&&Math.random()<.06*Pp.aggro*stance().aggro*step*4){k.status='war';k.warSince=s.time;k.trade=false;log(`⚔ ${k.ruler} of ${k.name} declares WAR on you!`,'bad');hook('aiwar',k);}
      if(k.status==='war'&&s.time-k.lastAttack>D*rnd(1.2,2.2)&&day>3&&Math.random()<.25*step*4){k.lastAttack=s.time;const pw=k.army*rnd(.35,.6);k.army-=pw*.2;hook('march','ai',k,pw);}
      if(k.status==='war'&&s.time-k.warSince>D*4&&k.army<armyPower()*.8&&Math.random()<.05*step*4){hook('peaceOffer',k);}
    }else{if(k.truceUntil>s.time)continue;const gap=k.kind==='zombie'?2.2:3;const first=G.fast?1.2:4;
      if(day>first&&s.time-k.lastAttack>D*gap*rnd(.8,1.3)&&Math.random()<.3*step*4){k.lastAttack=s.time;const pw=k.army*rnd(.3,.5)*(day<10?.6:1);hook('march','ai',k,pw);}}}
  // AI vs AI flavor
  if(Math.random()<.04*step*4){const hs=s.ai.filter(k=>k.alive&&k.kind==='human'&&!k.vassal);const ev=s.ai.filter(k=>k.alive&&k.kind!=='human');if(hs.length&&ev.length){const a=pick(ev),b=pick(hs);const l=a.army*.2;b.army=Math.max(5,b.army-l*rnd(.5,1));a.army*=.85;log(`${a.name} raided ${b.name}. Smoke rises on the horizon.`,'world');}}}

// ---------- arena helpers ----------
export function makeCandidate(){const s=G.s;const t=s.tribTrain;const bonus=(built('training').length?.5:0)+(built('arena').length?.5:0);
  const st=()=>clamp(Math.round(rnd(2,7)+bonus+t*.5),1,10);return {name:pick(FIRST),str:st(),agi:st(),grit:st(),job:pick(['Farmer','Hunter','Smith','Soldier','Woodcutter','Miner','Baker','Shepherd','Guard','Scribe'])};}
export function arenaKingdoms(){return [{id:0,name:G.s.name,kind:'human',c1:G.s.c1,c2:G.s.c2,emblem:G.s.emblem,mine:true,imm:G.s.immortals.filter(m=>m.mine).length}].concat(G.s.ai.filter(k=>k.alive).map(k=>({id:k.id,name:k.name,kind:k.kind,c1:k.c1,c2:k.c2,emblem:k.emblem,imm:k.immortals})));}
export function arenaResult(winnerKid,champ,myDead){const s=G.s;s.arenaCount++;s.pop=Math.max(3,s.pop-myDead);clampJobs();s.tribTrain=0;
  if(winnerKid===0){s.arenaWins++;s.immortals.push({name:champ,mine:true,month:s.month});s.happy=clamp(s.happy+15,0,100);log(`🏆 ${champ} of ${s.name} won the Arena and is now IMMORTAL! Your armies fight with +30% strength.`,'good');
    for(const k of s.ai)if(k.kind==='human'&&k.alive)k.rel+=k.pers==='honorable'?5:-3;}
  else{const k=aiById(winnerKid);if(k){k.immortals++;k.army+=10;log(`${champ} of ${k.name} won the Arena and became Immortal. ${k.name} grows stronger.`,'bad');}if(built('arena').length)s.happy=clamp(s.happy+3,0,100);}
  if(myDead)log(`${myDead} of your tributes fell in the arena.`,'bad');}
