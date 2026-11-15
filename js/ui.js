// Mythical Rule — HUD, panels, setup screen, scenario cards and the customize UI.
import {BUILDINGS,BUILD_CATS,JOBS,LAWS,RELIGIONS,STANCES,DECISIONS,EMBLEMS,COLORS,RES,CUSTOM_PRODUCES,CUSTOM_RATE,JOB_ICONS,KINGDOM_NAMES} from './data.js';
import {G,rates,armyPower,defense,popCap,idle,assigned,slots,setJob,autoAssign,canAfford,costStr,dateStr,MONTH_SEC,law,happyTarget,decide,diplo,attack,built,foodCap,clamp} from './game.js';
import {PERSONALITIES,HUMAN_STYLES} from './data.js';
import {bannerTex} from './gfx.js';
import {SFX} from './audio.js';
export const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const UI={panel:null,ctab:'build',ccat:'Homes',tool:null,hlKing:null};
const fmt=n=>n>=1000?(n/1000).toFixed(1)+'k':Math.floor(n);

// ---------- toasts ----------
export function toast(txt,type='',ms=3800){const el=document.createElement('div');el.className='toast '+type;el.textContent=txt;$('toasts').prepend(el);while($('toasts').children.length>4)$('toasts').lastChild.remove();
  setTimeout(()=>{el.style.opacity=0;el.style.transform='translateY(-8px)';setTimeout(()=>el.remove(),500);},ms);}

// ---------- banner drawing ----------
export function drawBanner(cv,c1,c2,em,style){const t=bannerTex(c1,c2,em,style);const x=cv.getContext('2d');x.clearRect(0,0,cv.width,cv.height);x.drawImage(t.image,0,0,cv.width,cv.height);}

// ---------- setup screen ----------
const SET={step:0,cfg:{name:'',ruler:'',c1:'#8b1a1a',c2:'#d4ac0d',emblem:'🦁',bstyle:0,religion:'oldgods',relName:'',stance:'neutral'}};
export function openSetup(onDone){SET.step=0;SET.onDone=onDone;SET.cfg.name=KINGDOM_NAMES[Math.floor(Math.random()*KINGDOM_NAMES.length)];$('setup').classList.remove('hidden');renderSetup();}
function renderSetup(){const c=SET.cfg,b=$('sBody');document.querySelectorAll('.steps span').forEach((s,i)=>s.classList.toggle('on',i<=SET.step));
  $('sBack').style.visibility=SET.step?'visible':'hidden';$('sNext').textContent=SET.step===3?'⚔ Begin Your Reign':'Next ▶';
  if(SET.step===0){b.innerHTML=`<div class="lbl">Kingdom name</div><div style="display:flex;gap:6px"><input type="text" id="iName" maxlength="22" value="${esc(c.name)}" style="flex:1"><button class="btn sm dark" id="rName">🎲</button></div>
    <div class="lbl">Your title &amp; name (optional)</div><input type="text" id="iRuler" maxlength="28" placeholder="e.g. King J.J. the Bold" value="${esc(c.ruler)}" style="width:100%">
    <p style="color:#bba882;font-size:13px;line-height:1.5;margin-top:14px">You will rule a medieval kingdom in a land of rival crowns, elves and dwarves, orc warbands, the walking dead of the Rotlands, the demons of the Hellmouth, trolls, unicorns and a dragon. Every month, each kingdom must send three citizens to fight in the Arena. The winner becomes <b style="color:#ffd060">Immortal</b>.</p>`;
    $('iName').oninput=e=>c.name=e.target.value;$('iRuler').oninput=e=>c.ruler=e.target.value;$('rName').onclick=()=>{c.name=KINGDOM_NAMES[Math.floor(Math.random()*KINGDOM_NAMES.length)];renderSetup();};}
  else if(SET.step===1){b.innerHTML=`<div class="flexrow"><div style="flex:1;min-width:220px"><div class="lbl">Primary color</div><div id="c1s">${COLORS.map(x=>`<span class="sw ${x===c.c1?'on':''}" data-c="${x}" style="background:${x}"></span>`).join('')}</div>
    <div class="lbl">Secondary color</div><div id="c2s">${COLORS.map(x=>`<span class="sw ${x===c.c2?'on':''}" data-c="${x}" style="background:${x}"></span>`).join('')}</div>
    <div class="lbl">Banner pattern</div><div class="seg" id="bst">${['Bands','Halves','Diagonal'].map((n,i)=>`<button class="${i===c.bstyle?'on':''}" data-i="${i}">${n}</button>`).join('')}</div></div>
    <div style="text-align:center"><div class="lbl">Your banner</div><canvas id="bannerPrev" width="96" height="192"></canvas></div></div>
    <div class="lbl">Emblem</div><div>${EMBLEMS.map(e=>`<span class="em ${e===c.emblem?'on':''}" data-e="${e}">${e}</span>`).join('')}</div>`;
    drawBanner($('bannerPrev'),c.c1,c.c2,c.emblem,c.bstyle);
    b.querySelectorAll('#c1s .sw').forEach(s=>s.onclick=()=>{c.c1=s.dataset.c;renderSetup();});b.querySelectorAll('#c2s .sw').forEach(s=>s.onclick=()=>{c.c2=s.dataset.c;renderSetup();});
    b.querySelectorAll('.em').forEach(s=>s.onclick=()=>{c.emblem=s.dataset.e;renderSetup();});b.querySelectorAll('#bst button').forEach(s=>s.onclick=()=>{c.bstyle=+s.dataset.i;renderSetup();});}
  else if(SET.step===2){b.innerHTML=`<div class="lbl">Religion of the realm</div>${Object.entries(RELIGIONS).map(([k,r])=>`<button class="opt ${k===c.religion?'on':''}" data-r="${k}"><b>${r.icon} ${r.name}</b><small>${r.desc}</small></button>`).join('')}
    <div class="lbl">Give your faith its own name (optional)</div><input type="text" id="iRel" maxlength="30" placeholder="${esc(RELIGIONS[c.religion].name)}" value="${esc(c.relName)}" style="width:100%">`;
    b.querySelectorAll('.opt').forEach(o=>o.onclick=()=>{c.religion=o.dataset.r;renderSetup();});$('iRel').oninput=e=>c.relName=e.target.value;}
  else{b.innerHTML=`<div class="lbl">Will your kingdom be peaceful?</div>${Object.entries(STANCES).map(([k,s])=>`<button class="opt ${k===c.stance?'on':''}" data-s="${k}"><b>${s.icon} ${s.name}</b><small>${s.desc}</small></button>`).join('')}
    <div style="display:flex;gap:12px;align-items:center;margin-top:12px;background:#0004;padding:10px;border-radius:10px"><canvas id="bannerPrev" width="48" height="96"></canvas><div><b class="serif" style="font-size:20px;color:#f0d79a">${esc(c.name||'Unnamed')}</b><div style="font-size:13px;color:#bba882">${esc(c.ruler||'Your Majesty')} · ${esc(c.relName||RELIGIONS[c.religion].name)} · ${STANCES[c.stance].name}</div></div></div>`;
    drawBanner($('bannerPrev'),c.c1,c.c2,c.emblem,c.bstyle);b.querySelectorAll('.opt').forEach(o=>o.onclick=()=>{c.stance=o.dataset.s;renderSetup();});}}
export function initSetup(){$('sBack').onclick=()=>{SFX.click();SET.step=Math.max(0,SET.step-1);renderSetup();};
  $('sNext').onclick=()=>{SFX.click();if(SET.step===0&&!SET.cfg.name.trim()){SET.cfg.name='Avalon';}if(SET.step<3){SET.step++;renderSetup();}else{$('setup').classList.add('hidden');SET.onDone({...SET.cfg,name:SET.cfg.name.trim().slice(0,22)||'Avalon'});}};}

// ---------- HUD ----------
export function initHud(){const s=G.s;$('kName').textContent=s.name;drawBanner($('miniBanner'),s.c1,s.c2,s.emblem,s.bstyle);
  $('resBar').innerHTML=RES.map(r=>`<div class="chip" id="r_${r.id}" title="${r.name}">${r.icon}<span></span><small></small></div>`).join('');
  RES.forEach(r=>$('r_'+r.id).onclick=()=>toast(resHelp(r.id)));}
function resHelp(id){const r=rates();return {gold:`Gold ${r.gold>=0?'+':''}${r.gold.toFixed(1)}/day. Taxes, merchants and trade. Soldiers cost upkeep.`,food:`Food ${r.food>=0?'+':''}${r.food.toFixed(1)}/day. Storage ${foodCap()} (build Granaries).`,wood:'Wood: woodcutters at Lumber Mills.',stone:'Stone: stonecutters at Quarries.',iron:'Iron: miners at Iron Mines. Blacksmiths forge it into weapons.',faith:'Faith: priests at Temples. Spend it in scenarios and against demons.',pop:`Population ${G.s.pop}/${popCap()}. ${idle()} idle. Build houses for more.`,happy:`Happiness → ${Math.round(happyTarget())}. Laws, food, temples, taverns and gardens matter. Low happiness = rebellion.`,army:`Army strength ${armyPower()} · Defense ${defense()} (walls, towers, guards).`}[id];}
export function updateHud(){const s=G.s;if(!s)return;const r=rates();
  const set=(id,v,rate,warn)=>{const el=$('r_'+id);if(!el)return;el.children[0].textContent=v;el.children[1].innerHTML=rate===undefined?'':`<span class="${rate>=0?'up':'dn'}">${rate>=0?'+':''}${Math.abs(rate)<10?rate.toFixed(1):Math.round(rate)}</span>`;el.classList.toggle('warn',!!warn);};
  set('gold',fmt(s.res.gold),r.gold,s.res.gold<5&&r.gold<0);set('food',fmt(s.res.food),r.food,s.res.food<s.pop*2&&r.food<0);set('wood',fmt(s.res.wood),r.wood);set('stone',fmt(s.res.stone),r.stone);set('iron',fmt(s.res.iron),r.iron);set('faith',fmt(s.res.faith),r.faith);
  set('pop',`${s.pop}/${popCap()}`,undefined,s.pop>=popCap());set('happy',Math.round(s.happy)+'%',undefined,s.happy<30);set('army',armyPower());
  $('kDate').textContent=dateStr();const left=Math.max(0,MONTH_SEC()-(s.time-s.monthStart));$('kArena').textContent=`⚔ Arena in ${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}`;
  if(UI.panel&&!$('panel').classList.contains('hidden')&&(UI.panel==='rule'||UI.panel==='arena'))UI.refreshT=(UI.refreshT||0)+1;}

// ---------- panels ----------
export function openPanel(p){if(UI.panel===p&&!$('panel').classList.contains('hidden')){closePanel();return;}if(G.hooks.worldView&&(p==='world')!==(UI.panel==='world'))G.hooks.worldView(p==='world');UI.panel=p;$('panel').classList.remove('hidden');document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.p===p));renderPanel();SFX.click();}
export function closePanel(){if(UI.panel==='world'&&G.hooks.worldView)G.hooks.worldView(false);UI.panel=null;$('panel').classList.add('hidden');document.querySelectorAll('#nav button').forEach(b=>b.classList.remove('on'));}
export function renderPanel(){const p=UI.panel;if(!p)return;const s=G.s;const B=$('pBody');const sc=B.scrollTop;
  const T={rule:'👑 Rule the Realm',laws:'📜 Laws of '+s.name,world:'🗺️ The Realm Map',arena:'🏟️ The Arena',log:'📖 Chronicle'};$('pTitle').textContent=T[p];
  if(p==='rule'){const r=rates();B.innerHTML=`<button class="btn dark" id="bKEdit" style="width:100%;margin-bottom:8px">🎨 Change name, colors &amp; banner</button><div class="grid2">
      <div class="stat"><small>Population</small><b>👥 ${s.pop} / ${popCap()}</b><small>${idle()} idle · ${assigned()} working</small></div>
      <div class="stat"><small>Happiness</small><b>😊 ${Math.round(s.happy)}%</b><small>heading to ${Math.round(happyTarget())}%</small></div>
      <div class="stat"><small>Food per day</small><b style="color:${r.food<0?'#ff8a7a':'#9fe870'}">🍖 ${r.food>=0?'+':''}${r.food.toFixed(1)}</b><small>${Math.floor(s.res.food)} / ${foodCap()} stored</small></div>
      <div class="stat"><small>Gold per day</small><b style="color:${r.gold<0?'#ff8a7a':'#9fe870'}">🪙 ${r.gold>=0?'+':''}${r.gold.toFixed(1)}</b><small>Tax: ${law('tax').name}</small></div>
      <div class="stat"><small>Army strength</small><b>⚔️ ${armyPower()}</b><small>${s.jobs.soldier||0} soldiers · ⚒️ ${Math.floor(s.res.weapons)} weapons</small></div>
      <div class="stat"><small>Defense</small><b>🛡️ ${defense()}</b><small>walls, towers &amp; guards</small></div></div>
    ${s.immortals.filter(m=>m.mine).length?`<div class="stat" style="margin-top:6px;border-color:#d8a84a"><small>Your Immortals</small><b>⚜ ${s.immortals.filter(m=>m.mine).map(m=>esc(m.name)).join(', ')}</b><small>+30% army each</small></div>`:''}
    <div class="sec">Royal decisions</div><div class="grid2">${DECISIONS.map(d=>{const cd=Math.max(0,(s.cds[d.id]||0)-s.time);const ok=!cd&&canAfford(d.cost);return `<button class="dec" data-d="${d.id}" ${ok?'':'disabled'}><b>${d.icon} ${d.name}</b><small>${d.desc}</small><em>${cd?'⏳ '+Math.ceil(cd)+'s':costStr(d.cost)}</em></button>`;}).join('')}</div>`;
    $('bKEdit').onclick=()=>G.hooks.editKingdom();B.querySelectorAll('.dec').forEach(b=>b.onclick=()=>{const m=decide(b.dataset.d);toast(m,'good');SFX.coin();renderPanel();});}
  else if(p==='laws'){B.innerHTML=`<div style="font-size:12px;color:#bba882">Your laws shape happiness, production, faith and war. Changes take effect immediately.</div>`+Object.entries(LAWS).map(([id,L])=>{const cur=s.laws[id];const o=L.opts.find(x=>x.id===cur);
      return `<div class="law"><div class="t">${L.icon} ${L.name}</div><div class="seg">${L.opts.map(x=>`<button data-l="${id}" data-o="${x.id}" class="${x.id===cur?'on':''}">${x.name}</button>`).join('')}</div><div class="d">${o.desc}</div></div>`;}).join('');
    B.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{s.laws[b.dataset.l]=b.dataset.o;SFX.click();toast(`New law: ${LAWS[b.dataset.l].name} → ${b.textContent}`);renderPanel();});}
  else if(p==='world'){const my=armyPower();B.innerHTML=`<div style="font-size:12px;color:#bba882">Your army ⚔️ ${my} · defense 🛡️ ${defense()}${s.marching?' · <b style="color:#ffd060">army marching…</b>':''}</div>`+s.ai.map(k=>{
      const st=!k.alive?'dead':k.vassal?'vassal':k.status;const stn={war:'AT WAR',peace:'Peace',ally:'Ally',vassal:'Vassal',dead:'Fallen',truce:'Truce'}[st];const relw=Math.abs(k.rel)/2;
      const typ=k.kind==='human'?`${k.race==='elf'?'🧝 Elves':k.race==='dwarf'?'⛏️ Dwarves':HUMAN_STYLES[k.style]||'Humans'} · ${PERSONALITIES[k.pers].name}`:k.kind==='zombie'?'🧟 Undead horde':k.kind==='orc'?'👹 Orc warband':'😈 Demon realm';
      let acts='';if(k.alive&&!k.vassal){if(k.kind==='human'){acts+=`<button data-a="gift">🎁 Gift 50🪙</button>`;acts+=k.trade?`<button data-a="endtrade">End trade</button>`:`<button data-a="trade">⚖️ Trade</button>`;
          if(k.status!=='ally'&&k.status!=='war')acts+=`<button class="grn" data-a="ally">🤝 Alliance</button>`;if(k.status!=='war')acts+=`<button class="red" data-a="war">⚔️ Declare war</button>`;else acts+=`<button data-a="peace">🕊️ Offer peace</button>`;
          if(k.status!=='ally')acts+=`<button data-a="tribute">💰 Demand tribute</button>`;}
        else acts+=`<button data-a="truce">${k.kind==='demon'?'🩸 Offer sacrifice (✨40 🪙60)':k.kind==='orc'?'🍖 Pay the warlord (✨40 🪙60)':'🕯️ Ward the dead (✨40 🪙60)'}</button>`;
        if(k.status==='war')acts+=`<button class="red" data-a="atk" data-f=".5">⚔️ Attack (half army)</button><button class="red" data-a="atk" data-f="1">⚔️ All-out attack</button>`;}
      acts+=`<button data-a="fly">📍 Show</button>`;
      return `<div class="king ${UI.hlKing===k.id?'hl':''}" data-k="${k.id}"><div class="h"><div class="em2" style="background:${k.c1}">${k.emblem}</div><div class="n"><b>${esc(k.name)}</b><small>${esc(k.ruler)} · ${typ}</small></div><span class="st ${st}">${stn}</span></div>
        ${k.alive?`<div class="relbar"><i style="left:50%;width:${relw}%;${k.rel<0?`transform:translateX(-100%);background:#d84a2a`:'background:#5aa04a'}"></i></div><div style="font-size:12px;color:#bba882">Relations ${Math.round(k.rel)} · Army ⚔️ ${Math.round(k.army)} ${k.army>my?'<span style="color:#ff8a7a">(stronger than you)</span>':'<span style="color:#9fe870">(weaker)</span>'}${k.immortals?` · ⚜ ${k.immortals} Immortal`:''}${k.trade?' · trading':''}${k.truceUntil>s.time?' · truce':''}</div>`:'<div style="font-size:12px;color:#9a8a6a">This realm has fallen.</div>'}
        <div class="acts">${acts}</div></div>`;}).join('');
    B.querySelectorAll('.king').forEach(el=>{const k=s.ai.find(x=>x.id==el.dataset.k);el.querySelectorAll('.acts button').forEach(b=>b.onclick=()=>{SFX.click();const a=b.dataset.a;
      if(a==='fly'){G.hooks.flyTo&&G.hooks.flyTo(k.x,k.z);return;}
      if(a==='war'&&!confirm(`Declare war on ${k.name}?`))return;
      let res;if(a==='atk')res=attack(k,+b.dataset.f);else res=diplo(k,a);toast(res[1],res[0]?(a==='war'||a==='atk'?'bad':'good'):'bad',4500);if(res[0]&&(a==='war'||a==='atk'))SFX.horn();renderPanel();});});
    if(UI.hlKing){const el=B.querySelector('.king.hl');if(el)el.scrollIntoView({block:'center'});UI.hlKing=null;return;}}
  else if(p==='arena'){const left=Math.max(0,MONTH_SEC()-(s.time-s.monthStart));const alive=s.ai.filter(k=>k.alive).length+1;
    B.innerHTML=`<div class="stat" style="text-align:center"><small>The next Arena Games begin in</small><b style="font-size:28px">⏳ ${Math.floor(left/60)}:${String(Math.floor(left%60)).padStart(2,'0')}</b><small>${alive} kingdoms × 3 tributes = ${alive*3} fighters</small></div>
     <p style="font-size:13px;line-height:1.5;color:#e8dcc0">At the end of each month every kingdom sends <b>three citizens</b> to fight in the great Arena. You can fight as your champion or watch. The <b>last kingdom standing</b> wins, and its champion becomes <b style="color:#ffd060">Immortal</b>: a hero who cannot die and gives that kingdom's armies <b>+30% strength</b> in war.</p>
     <div class="grid2"><div class="stat"><small>Tribute training</small><b>🎯 +${s.tribTrain}</b><small>Decisions, Training Ground, Arena</small></div><div class="stat"><small>Selection law</small><b>${law('arena').name}</b><small>change in Laws</small></div>
     <div class="stat"><small>Games held</small><b>🏟️ ${s.arenaCount}</b></div><div class="stat"><small>Your victories</small><b>🏆 ${s.arenaWins}</b></div></div>
     <div class="sec">Immortals of the realm</div>${s.immortals.length?s.immortals.map(m=>`<div class="logl">⚜ <b>${esc(m.name)}</b> — ${m.mine?esc(s.name):esc(m.kingdom||'')}</div>`).join(''):'<div style="color:#9a8a6a;font-size:13px">None yet. Glory awaits.</div>'}
     ${G.debug?'<button class="btn sm" id="dbgArena">Debug: start Arena now</button>':''}`;
    if($('dbgArena'))$('dbgArena').onclick=()=>G.hooks.startArena();}
  else if(p==='log'){B.innerHTML=s.chronicle.map(c=>`<div class="logl ${c.type}"><i>${dateStr(c.t)}</i>${esc(c.txt)}</div>`).join('');}
  B.scrollTop=sc;}

// ---------- customize UI ----------
export function renderCust(){const s=G.s;const B=$('cBody');const _pl=B.querySelector('.pal')?.scrollLeft||0,_jt=B.scrollTop||0,_cl=B.querySelector('.cats')?.scrollLeft||0;try{renderCust_(s,B);}finally{const p=B.querySelector('.pal');if(p)p.scrollLeft=_pl;B.scrollTop=_jt;const c=B.querySelector('.cats');if(c)c.scrollLeft=_cl;}}
function renderCust_(s,B){document.querySelectorAll('#custBar .tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===UI.ctab));
  if(UI.ctab==='build'){B.innerHTML=`<div class="cats">${BUILD_CATS.map(c=>`<button class="${c===UI.ccat?'on':''}" data-c="${c}">${c}</button>`).join('')}</div>
    <div class="pal">${Object.entries(BUILDINGS).filter(([k,b])=>b.cat===UI.ccat).map(([k,b])=>{const ok=canAfford(b.cost);const jobs=b.jobs?Object.entries(b.jobs).map(([j,n])=>`${n} ${JOBS[j].name.toLowerCase()}s`).join(', '):'';
      return `<button class="bc ${UI.tool===k?'on':''} ${ok?'':'no'}" data-b="${k}"><div class="i">${b.icon}</div><b>${b.name}</b><small>${costStr(b.cost)}</small><em>${b.desc}</em></button>`;}).join('')}</div>`;
    B.querySelectorAll('.cats button').forEach(b=>b.onclick=()=>{UI.ccat=b.dataset.c;renderCust();});
    B.querySelectorAll('.bc').forEach(b=>b.onclick=()=>{SFX.click();G.hooks.selectTool(UI.tool===b.dataset.b?null:b.dataset.b);});}
  else if(UI.ctab==='jobs'){const list=Object.entries(JOBS).filter(([k,j])=>slots(k)>0||(s.jobs[k]||0)>0||!j.bld);
    B.innerHTML=`<div class="jobs"><div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;gap:6px;flex-wrap:wrap"><span>👥 ${s.pop} citizens · <b style="color:${idle()?'#ffd060':'#9fe870'}">${idle()} idle</b></span><span><label><input type="checkbox" id="autoJ" ${s.autoJobs?'checked':''}> Auto-assign new citizens</label> <button class="btn sm dark" id="bAuto">Fill jobs</button></span></div>
     ${list.map(([k,j])=>{const sl=slots(k);const n=s.jobs[k]||0;const pr=Object.entries(j.prod).map(([r,v])=>`+${v} ${r}`).join(', ');return `<div class="job"><div class="i">${j.icon}</div><div class="n"><b>${j.name}</b><small>${pr?pr+'/day':''}${j.upkeep?` · costs ${j.upkeep}🪙/day`:''}${j.desc?' '+j.desc:''}${j.bld?` · ${sl>=999?'':sl+' slots'}`:''}</small></div><div class="c"><button data-j="${k}" data-d="-1">−</button><b>${n}${j.bld?'/'+sl:''}</b><button data-j="${k}" data-d="1">+</button></div></div>`;}).join('')}
     ${s.customJobs.map(c=>`<div class="job"><div class="i">${c.icon}</div><div class="n"><b>${esc(c.name)}</b><small>Custom · +${CUSTOM_RATE[c.prod]} ${CUSTOM_PRODUCES[c.prod]}/day each <a data-del="${c.id}" style="color:#ff8a7a;margin-left:6px;cursor:pointer">remove</a></small></div><div class="c"><button data-j="${c.id}" data-d="-1">−</button><b>${c.count}</b><button data-j="${c.id}" data-d="1">+</button></div></div>`).join('')}
     <div style="font-size:12px;color:#bba882;margin-top:8px">Jobs need buildings: build Farms, Mills, Quarries, Barracks… in 🏗️ Build. Create your own jobs in ✨ New Job.</div></div>`;
    B.querySelectorAll('.job .c button').forEach(b=>{let hold;const act=()=>{const id=b.dataset.j;const cj=s.customJobs.find(c=>c.id===id);const cur=cj?cj.count:(s.jobs[id]||0);setJob(id,cur+ +b.dataset.d);renderCust();};
      b.onclick=()=>{SFX.click();act();};});
    B.querySelectorAll('[data-del]').forEach(a=>a.onclick=()=>{s.customJobs=s.customJobs.filter(c=>c.id!==a.dataset.del);renderCust();});
    $('autoJ').onchange=e=>{s.autoJobs=e.target.checked;};$('bAuto').onclick=()=>{autoAssign();renderCust();toast('Idle citizens assigned to open jobs.');};}
  else if(UI.ctab==='newjob'){UI.nj=UI.nj||{name:'',icon:JOB_ICONS[0],prod:'food'};const nj=UI.nj;
    B.innerHTML=`<div class="jobs"><div class="lbl" style="margin-top:4px">Create a new job for your kingdom</div>
     <input type="text" id="njName" maxlength="20" placeholder="Job name, e.g. Fisherman, Bard, Alchemist" value="${esc(nj.name)}" style="width:100%">
     <div class="lbl">Icon</div><div>${JOB_ICONS.map(i=>`<span class="em ${i===nj.icon?'on':''}" data-i="${i}" style="width:36px;height:36px;font-size:20px">${i}</span>`).join('')}</div>
     <div class="lbl">What does it produce?</div><div class="seg">${Object.entries(CUSTOM_PRODUCES).map(([k,v])=>`<button data-p="${k}" class="${k===nj.prod?'on':''}">${v}</button>`).join('')}</div>
     <div style="font-size:12px;color:#bba882;margin:8px 0">Each worker makes +${CUSTOM_RATE[nj.prod]} ${CUSTOM_PRODUCES[nj.prod]} per day. Custom jobs need no building, so any idle citizen can take one.</div>
     <button class="btn gold sm" id="njMake" style="width:100%">✨ Create job</button></div>`;
    $('njName').oninput=e=>nj.name=e.target.value;B.querySelectorAll('.em').forEach(e=>e.onclick=()=>{nj.icon=e.dataset.i;renderCust();});B.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{nj.prod=b.dataset.p;renderCust();});
    $('njMake').onclick=()=>{const name=(nj.name||'').trim();if(!name){toast('Give the job a name first.','bad');return;}const id='c'+Date.now().toString(36);s.customJobs.push({id,name:name.slice(0,20),icon:nj.icon,prod:nj.prod,count:0});setJob(id,Math.min(2,idle()));SFX.good();toast(`New job created: ${nj.icon} ${name}`,'good');UI.nj=null;UI.ctab='jobs';renderCust();};}}

// ---------- modal ----------
// edit the kingdom's name, ruler, colors, banner pattern and emblem at any time
export function openKingdomEdit(onSave){const s=G.s;const c={name:s.name,ruler:s.ruler||'',c1:s.c1,c2:s.c2,emblem:s.emblem,bstyle:s.bstyle||0};
  const draw=()=>{modal(`<h2>🎨 Your Kingdom</h2><div class="lbl">Kingdom name</div><div style="display:flex;gap:6px"><input type="text" id="kN" maxlength="22" value="${esc(c.name)}" style="flex:1"><button class="btn sm dark" id="kR">🎲</button></div>
    <div class="lbl">Ruler</div><input type="text" id="kRu" maxlength="28" placeholder="e.g. King J.J. the Bold" value="${esc(c.ruler)}" style="width:100%">
    <div class="flexrow"><div style="flex:1;min-width:200px"><div class="lbl">Primary color</div><div id="k1">${COLORS.map(x=>`<span class="sw ${x===c.c1?'on':''}" data-c="${x}" style="background:${x}"></span>`).join('')}</div>
    <div class="lbl">Secondary color</div><div id="k2">${COLORS.map(x=>`<span class="sw ${x===c.c2?'on':''}" data-c="${x}" style="background:${x}"></span>`).join('')}</div>
    <div class="lbl">Banner pattern</div><div class="seg" id="kb">${['Bands','Halves','Diagonal'].map((n,i)=>`<button class="${i===c.bstyle?'on':''}" data-i="${i}">${n}</button>`).join('')}</div></div>
    <div style="text-align:center"><div class="lbl">Banner</div><canvas id="kPrev" width="96" height="192"></canvas></div></div>
    <div class="lbl">Emblem</div><div>${EMBLEMS.map(e=>`<span class="em ${e===c.emblem?'on':''}" data-e="${e}">${e}</span>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:14px"><button class="btn dark" id="kX" style="flex:1">Cancel</button><button class="btn gold" id="kOk" style="flex:2">👑 Proclaim</button></div>`,card=>{
      const keep=()=>{c.name=$('kN').value;c.ruler=$('kRu').value;};drawBanner($('kPrev'),c.c1,c.c2,c.emblem,c.bstyle);
      $('kR').onclick=()=>{keep();c.name=KINGDOM_NAMES[Math.floor(Math.random()*KINGDOM_NAMES.length)];draw();};
      card.querySelectorAll('#k1 .sw').forEach(x=>x.onclick=()=>{keep();c.c1=x.dataset.c;draw();});card.querySelectorAll('#k2 .sw').forEach(x=>x.onclick=()=>{keep();c.c2=x.dataset.c;draw();});
      card.querySelectorAll('#kb button').forEach(x=>x.onclick=()=>{keep();c.bstyle=+x.dataset.i;draw();});card.querySelectorAll('.em').forEach(x=>x.onclick=()=>{keep();c.emblem=x.dataset.e;draw();});
      $('kX').onclick=()=>closeModal();
      $('kOk').onclick=()=>{keep();const nm=c.name.trim()||s.name;const changed=nm!==s.name;Object.assign(s,{name:nm,ruler:c.ruler.trim(),c1:c.c1,c2:c.c2,emblem:c.emblem,bstyle:c.bstyle});closeModal();initHud();SFX.good&&SFX.good();if(changed)G.hooks.log&&0;onSave&&onSave(changed);};});};
  draw();}
export function modal(html,onBind){G.modal=true;$('modal').classList.remove('hidden');$('mCard').innerHTML=html;$('mCard').scrollTop=0;if(onBind)onBind($('mCard'));}
export function closeModal(){G.modal=false;$('modal').classList.add('hidden');}
