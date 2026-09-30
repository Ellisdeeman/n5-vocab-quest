// UI sound effects test (Analog default vs Classic). BROWSER=webkit|chromium URL=...
// Renders every sound offline and measures length, peak, attack and high-frequency energy ("harshness").
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const SHORT=['good','bad','click','idk','tick','unlock','hit'],CELEB=['level','goal'],CMP=['bad','combo','click','tick','unlock','hit'];
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:375,height:667},hasTouch:true,serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{window.__AC={osc:0,src:0,filt:0};const P=(window.AudioContext||window.webkitAudioContext).prototype;
  const w=(k,m)=>{const f=P[m];P[m]=function(...a){__AC[k]++;return f.apply(this,a)}};w('osc','createOscillator');w('src','createBufferSource');w('filt','createBiquadFilter');});
 const p=await ctx.newPage();p.setDefaultTimeout(10000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(900);
 const ev=(f,a)=>p.evaluate(f,a);
 // 1. offline renders
 const names=await ev(()=>__N5.SFX_NAMES);
 ok('sound list covers correct/wrong/tap/combo/level/goal/boss hit/unlock',['good','bad','click','combo','level','goal','hit','unlock'].every(n=>names.includes(n)),names.join(','));
 const r=await ev(async()=>{const o={};for(const n of __N5.SFX_NAMES){o[n]={a:await __N5.sfxRender(n,'analog'),c:await __N5.sfxRender(n,'classic')};}return o;});
 for(const n of names){const a=r[n].a,c=r[n].c,f=x=>`dur ${x.dur.toFixed(2)}s peak ${x.peak.toFixed(2)} attack ${x.attack3ms.toFixed(2)} hf ${x.hf.toFixed(3)}`;
  console.log('INFO',n.padEnd(7),'analog',f(a),'| classic',f(c));
  ok(`${n}: both styles render sound`,a.peak>0.02&&c.peak>0.02);
  ok(`${n}: analog not clipping (peak<0.9)`,a.peak<0.9,a.peak);
  ok(`${n}: analog soft/dark (hf<0.06)`,a.hf<0.06,a.hf);
  ok(`${n}: analog soft attack (≤0.6 of peak in 3 ms)`,a.attack3ms<=0.6,a.attack3ms);
  if(SHORT.includes(n))ok(`${n}: short (<0.4 s)`,a.dur<0.4,a.dur);
  else if(CELEB.includes(n))ok(`${n}: celebration < 1.6 s`,a.dur<1.6,a.dur);
  else ok(`${n}: < 0.8 s`,a.dur<0.8,a.dur);
  if(CMP.includes(n))ok(`${n}: analog less harsh than classic`,a.hf<c.hf,`${a.hf} vs ${c.hf}`);}
 // 2. sound off → no AudioContext is ever made, even on taps
 await ev(()=>{__N5.S().sound=false;__N5.gsave();});
 await p.tap('.tabbar [data-tab="stats"]');await p.waitForTimeout(200);await ev(()=>{for(const n of __N5.SFX_NAMES)__N5.sfx[n]();});
 ok('sound off: no AudioContext created by taps or sfx calls',await ev(()=>__N5.sfxActx()===null&&__AC.osc===0));
 // 3. sound on → first tap wakes the context (iOS unlock), sfx plays
 await ev(()=>{__N5.S().sound=true;__N5.gsave();});
 await p.tap('.tabbar [data-tab="home"]');await p.waitForTimeout(300);
 const st=await ev(()=>{const c=__N5.sfxActx();return c&&c.state});
 ok('sound on: first tap creates/wakes the audio context',!!st&&st!=='closed',st);
 ok('first tap left context running (not suspended)',st==='running',st);
 // 4. settings: Analog + Soft are the defaults, switching saves
 await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('#sfxSeg');await ev(()=>document.querySelector('#sfxSeg').scrollIntoView({block:'center'}));await p.waitForTimeout(200);
 ok('settings: Analog selected by default',await ev(()=>document.querySelector('#sfxSeg .on').dataset.sfx==='analog'&&!__N5.S().sfxStyle));
 ok('settings: Soft volume by default',await ev(()=>document.querySelector('#sfxVolSeg .on').dataset.v==='soft'));
 const tgt=await ev(()=>[...document.querySelectorAll('#sfxSeg button,#sfxVolSeg button')].map(x=>{const q=x.getBoundingClientRect();return Math.min(q.width,q.height)}));
 ok('settings sound buttons ≥44px',tgt.every(x=>x>=44),JSON.stringify(tgt));
 ok('settings fits 375px',await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 let a0=await ev(()=>({...__AC}));await ev(()=>__N5.sfx.good());let a1=await ev(()=>({...__AC}));
 ok('analog style plays through the analog voices (noise mallet/filters)',a1.src>a0.src||a1.filt>a0.filt,JSON.stringify([a0,a1]));
 await p.tap('#sfxSeg [data-sfx="classic"]');await p.waitForTimeout(200);
 ok('switch to Classic saves',await ev(()=>__N5.S().sfxStyle==='classic'&&JSON.parse(localStorage.getItem('n5VocabQuest.v1')).sfxStyle==='classic'));
 a0=await ev(()=>({...__AC}));await ev(()=>__N5.sfx.bad());a1=await ev(()=>({...__AC}));
 ok('classic style plays plain oscillators only',a1.osc>a0.osc&&a1.src===a0.src&&a1.filt===a0.filt,JSON.stringify([a0,a1]));
 await p.tap('#sfxVolSeg [data-v="loud"]');await p.waitForTimeout(150);
 ok('volume Loud saves',await ev(()=>__N5.S().sfxVol==='loud'&&JSON.parse(localStorage.getItem('n5VocabQuest.v1')).sfxVol==='loud'));
 await p.reload();await p.waitForTimeout(900);await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('#sfxSeg');
 ok('choices persist after reload',await ev(()=>document.querySelector('#sfxSeg .on').dataset.sfx==='classic'&&document.querySelector('#sfxVolSeg .on').dataset.v==='loud'));
 await p.tap('#sfxSeg [data-sfx="analog"]');await p.tap('#sfxVolSeg [data-v="soft"]');await p.waitForTimeout(150);
 ok('switch back to Analog/Soft',await ev(()=>__N5.S().sfxStyle==='analog'&&__N5.S().sfxVol==='soft'));
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('FAIL crash',e.message);process.exit(1)});
