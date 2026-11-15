// Mythical Rule — procedural WebAudio music and sound effects (no audio files).
let ctx=null,master,musicBus,sfxBus,rev,mode='kingdom',timer=null,step=0;
export const AU={music:localStorage.getItem('ac_music')!=='0',sfx:localStorage.getItem('ac_sfx')!=='0'};
function impulse(sec=3.2){const n=ctx.sampleRate*sec,b=ctx.createBuffer(2,n,ctx.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/n,2.6);}return b;}
export function initAudio(){if(ctx){if(ctx.state==='suspended')ctx.resume();return;}
  try{ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){return;}
  master=ctx.createGain();master.gain.value=.8;master.connect(ctx.destination);
  rev=ctx.createConvolver();rev.buffer=impulse();const rg=ctx.createGain();rg.gain.value=.55;rev.connect(rg);rg.connect(master);
  musicBus=ctx.createGain();musicBus.gain.value=AU.music?.32:0;musicBus.connect(master);musicBus.connect(rev);
  sfxBus=ctx.createGain();sfxBus.gain.value=AU.sfx?.7:0;sfxBus.connect(master);const sr=ctx.createGain();sr.gain.value=.25;sfxBus.connect(sr);sr.connect(rev);
  wind();timer=setInterval(tick,250);}
export function setMusic(on){AU.music=on;localStorage.setItem('ac_music',on?'1':'0');if(musicBus)musicBus.gain.setTargetAtTime(on?.32:0,ctx.currentTime,.3);}
export function setSfx(on){AU.sfx=on;localStorage.setItem('ac_sfx',on?'1':'0');if(sfxBus)sfxBus.gain.setTargetAtTime(on?.7:0,ctx.currentTime,.1);}
export function setMode(m){if(m!==mode){mode=m;step=0;}}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function voice(freq,t,dur,{type='sawtooth',vol=.1,cut=900,att=.8,rel=1.5,det=7,bus=musicBus}={}){if(!ctx)return;
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+att);g.gain.setValueAtTime(vol,t+Math.max(att,dur-rel));g.gain.linearRampToValueAtTime(0,t+dur);
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=cut;f.Q.value=.7;f.connect(g);g.connect(bus);
  for(const d of [-det,det]){const o=ctx.createOscillator();o.type=type;o.frequency.value=freq;o.detune.value=d;o.connect(f);o.start(t);o.stop(t+dur+.05);}}
function pluck(freq,t,vol=.12,bus=musicBus){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='triangle';o.frequency.value=freq;f.type='lowpass';f.frequency.setValueAtTime(3200,t);f.frequency.exponentialRampToValueAtTime(400,t+1.2);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0008,t+2.2);o.connect(f);f.connect(g);g.connect(bus);o.start(t);o.stop(t+2.3);}
function drum(t,freq=70,vol=.5,bus=musicBus){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.setValueAtTime(freq*2.2,t);o.frequency.exponentialRampToValueAtTime(freq,t+.12);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+.7);o.connect(g);g.connect(bus);o.start(t);o.stop(t+.75);
  noise(t,.12,vol*.3,1800,bus);}
function noise(t,dur,vol,freq=1000,bus=sfxBus,type='bandpass'){if(!ctx)return;const n=ctx.createBufferSource();const b=ctx.createBuffer(1,ctx.sampleRate*dur,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;n.buffer=b;
  const f=ctx.createBiquadFilter();f.type=type;f.frequency.value=freq;const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);n.connect(f);f.connect(g);g.connect(bus);n.start(t);}
function wind(){const n=ctx.createBufferSource();const b=ctx.createBuffer(1,ctx.sampleRate*4,ctx.sampleRate);const d=b.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3;}n.buffer=b;n.loop=true;
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=500;const g=ctx.createGain();g.gain.value=.05;const lfo=ctx.createOscillator();lfo.frequency.value=.07;const lg=ctx.createGain();lg.gain.value=.04;lfo.connect(lg);lg.connect(g.gain);n.connect(f);f.connect(g);g.connect(musicBus);n.start();lfo.start();}
// kingdom: slow D dorian / aeolian progression with harp arpeggios and a lone horn
const PROG=[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,61],[50,57,62,65],[43,50,55,58],[45,52,57,60],[45,52,56,61]];
const MEL=[74,72,69,72,74,77,76,72,69,67,69,72,74];
function tick(){if(!ctx||ctx.state!=='running')return;const t=ctx.currentTime+.05;
  if(mode==='kingdom'){if(step%32===0){const ch=PROG[(step/32|0)%PROG.length];ch.forEach((m,i)=>voice(mtof(m-12+(i?12:0)),t,8.4,{vol:i?.035:.05,cut:i?900:500,att:2.2,rel:3}));}
    if(step%2===0&&Math.random()<.55){const ch=PROG[(step/32|0)%PROG.length];const m=ch[(step/2|0)%4]+12*(1+(Math.random()<.4));pluck(mtof(m),t,.07);}
    if(step%64===40&&Math.random()<.7){let tt=t;for(let i=0;i<4;i++){const m=MEL[(step/64+i*3|0)%MEL.length]-12;voice(mtof(m),tt,2.4,{type:'triangle',vol:.06,cut:1400,att:.4,rel:1,det:3});tt+=1.6;}}}
  else if(mode==='arena'){if(step%2===0)drum(t,step%8===0?55:75,step%8===0?.55:.3);if(step%8===4)drum(t,95,.35);
    if(step%16===0){const r=[38,38,41,36][(step/16|0)%4];voice(mtof(r),t,3.8,{vol:.08,cut:700,att:.1,rel:.8});voice(mtof(r+7),t,3.8,{vol:.05,cut:800,att:.1,rel:.8});}
    if(step%32===16)for(let i=0;i<3;i++)voice(mtof([62,65,69][i]),t+i*.5,1.4,{type:'square',vol:.03,cut:1600,att:.05,rel:.5,det:4});}
  else if(mode==='tension'){if(step%16===0){voice(mtof(38),t,4,{vol:.07,cut:400,att:1,rel:1.5});voice(mtof(39),t,4,{vol:.04,cut:500,att:1.5,rel:1.5});}if(step%4===0)drum(t,48,.25);}
  step++;}
export const SFX={
  click(){if(!ctx)return;const t=ctx.currentTime;pluck(880,t,.05,sfxBus);},
  build(){if(!ctx)return;const t=ctx.currentTime;for(let i=0;i<3;i++){noise(t+i*.16,.08,.4,900);drum(t+i*.16,180,.15,sfxBus);}},
  coin(){if(!ctx)return;const t=ctx.currentTime;pluck(1320,t,.08,sfxBus);pluck(1760,t+.08,.08,sfxBus);},
  horn(){if(!ctx)return;const t=ctx.currentTime;voice(mtof(50),t,2.2,{vol:.16,cut:1100,att:.15,rel:.8,bus:sfxBus});voice(mtof(57),t+.6,1.8,{vol:.12,cut:1100,att:.15,rel:.8,bus:sfxBus});},
  event(){if(!ctx)return;const t=ctx.currentTime;drum(t,60,.5,sfxBus);voice(mtof(45),t,2.5,{vol:.1,cut:700,att:.05,rel:1.5,bus:sfxBus});voice(mtof(48),t,2.5,{vol:.08,cut:700,att:.05,rel:1.5,bus:sfxBus});},
  good(){if(!ctx)return;const t=ctx.currentTime;[62,66,69,74].forEach((m,i)=>pluck(mtof(m),t+i*.09,.09,sfxBus));},
  bad(){if(!ctx)return;const t=ctx.currentTime;[57,56,53].forEach((m,i)=>voice(mtof(m),t+i*.25,.6,{vol:.08,cut:900,att:.02,rel:.3,bus:sfxBus}));},
  clang(){if(!ctx)return;const t=ctx.currentTime;noise(t,.18,.35,3500);[1200,1730,2410].forEach(f=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f*(0.9+Math.random()*.2);g.gain.setValueAtTime(.06,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+.4);});},
  swing(){if(!ctx)return;noise(ctx.currentTime,.15,.15,1400,sfxBus,'highpass');},
  cannon(){if(!ctx)return;const t=ctx.currentTime;drum(t,38,.9,sfxBus);noise(t,1.2,.35,200,sfxBus,'lowpass');},
  gong(){if(!ctx)return;const t=ctx.currentTime;[110,164,221,293].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.frequency.value=f;g.gain.setValueAtTime(.12/(i+1),t);g.gain.exponentialRampToValueAtTime(.001,t+4);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+4);});},
  cheer(){if(!ctx)return;const t=ctx.currentTime;const n=ctx.createBufferSource();const b=ctx.createBuffer(1,ctx.sampleRate*2.5,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/d.length);n.buffer=b;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=1100;f.Q.value=.6;const g=ctx.createGain();g.gain.value=.4;n.connect(f);f.connect(g);g.connect(sfxBus);n.start(t);},
  howl(){if(!ctx)return;const t=ctx.currentTime;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.setValueAtTime(400,t);o.frequency.linearRampToValueAtTime(700,t+.6);o.frequency.linearRampToValueAtTime(520,t+2);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.08,t+.3);g.gain.linearRampToValueAtTime(0,t+2.1);o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+2.2);},
  hit(){if(!ctx)return;const t=ctx.currentTime;drum(t,120,.25,sfxBus);noise(t,.1,.2,700);},
};
