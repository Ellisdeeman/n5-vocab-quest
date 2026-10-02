// Kanaatro music: starts only from the Start tap, variants (normal / boss / shop) cross-fade smoothly, in-game mute,
// global sound mute, Settings music volume (Off/Soft/Normal), pauses when hidden, stops on leaving, no errors.
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8770/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<300;i++)cards[i]={box:2,due:now+3*D,ok:3,bad:1,f:{st:2,sp:null,s:4,d:5,lr:now-6*D,due:now+3*D}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],sound:true,newLimit:'off'}));});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(600);
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms),D=()=>ev(()=>__N5.kmDebug());
 const until=async(f,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(100);}return false;};
 await ev(()=>{window.__kaSeed=11;__N5.gOpen('n5','kanaatro',__N5.home);});await p.waitForSelector('#kaStart');await W(400);
 let d=await D();ok('no music on the intro screen (waits for a tap)',!d.running&&!d.want,JSON.stringify(d));
 ok('in-game music toggle is in the top bar (≥44px)',await ev(()=>{const r=document.querySelector('#kaMus').getBoundingClientRect();return r.width>=44&&r.height>=44;}));
 await p.tap('#kaStart');await p.waitForSelector('#kaGo');await W(1800);
 d=await D();ok('Start tap starts the music: scheduler running, context running, notes scheduled, master → Soft level',d.running&&d.want&&d.ctx==='running'&&d.scheduled>10&&d.master>0.12&&d.gainTarget===0.2&&d.variant==='normal',JSON.stringify(d));
 const c1=d.scheduled;await W(1200);d=await D();ok('keeps scheduling (generative sequencer advancing)',d.scheduled>c1&&d.bars>=1,JSON.stringify({c1,c2:d.scheduled,bars:d.bars}));
 // boss cross-fade
 await ev(()=>{const K=__N5.KA;K.blind=2;__N5.kaBlindScreen(K);});
 const lps=[];for(let i=0;i<8;i++){lps.push(Math.round((await D()).lp));await W(150);}
 const mono=lps.every((x,i)=>!i||x>=lps[i-1]-1),mid=lps.some(x=>x>2700&&x<5100);
 ok('boss: filter opens smoothly (monotonic ramp with intermediate values, no jump)',mono&&mid&&lps[0]<4000,lps.join(','));
 await until(()=>__N5.kmDebug().variant==='boss',6000);d=await D();
 ok('boss variant takes over on the bar line (faster tempo, tritone drone faded in)',d.variant==='boss'&&d.bpm===90&&d.groups.drone>0.5,JSON.stringify(d));
 // shop
 await ev(()=>{const K=__N5.KA;K.blind=1;__N5.kaShop(K);});await W(300);
 await until(()=>__N5.kmDebug().variant==='shop'&&__N5.kmDebug().lp<1500,8000);d=await D();
 ok('shop: mellower variant, low-passed, drone faded out',d.variant==='shop'&&d.lp<1500&&d.groups.drone<0.1&&d.bpm===70,JSON.stringify(d));
 // in-game mute
 await p.tap('#kaMus');await W(1400);let a=await D();await W(600);let b2=await D();
 ok('in-game mute: master fades to silence and the sequencer stops creating notes',a.gainTarget===0&&a.master<0.02&&b2.scheduled===a.scheduled&&await ev(()=>__N5.S().kaMusicMute===true&&document.querySelector('#kaMus').classList.contains('off')),JSON.stringify({a,b:b2.scheduled}));
 await p.tap('#kaMus');await W(1200);d=await D();ok('unmute resumes',d.gainTarget===0.2&&d.master>0.1&&d.scheduled>b2.scheduled,JSON.stringify(d));
 // global sound mute
 await ev(()=>{__N5.S().sound=false;__N5.kmTick();});await W(1200);d=await D();ok('respects the global sound mute',d.gainTarget===0&&d.master<0.03,JSON.stringify(d));
 await ev(()=>{__N5.S().sound=true;__N5.kmTick();});
 // volume setting
 await ev(()=>{__N5.S().musicVol='normal';__N5.kmTick();});await W(1200);d=await D();ok('music volume Normal (louder than Soft)',d.gainTarget===0.38&&d.master>0.25,JSON.stringify(d));
 await ev(()=>{__N5.S().musicVol='off';__N5.kmTick();});await W(1200);d=await D();ok('music volume Off silences it',d.gainTarget===0&&d.master<0.03,JSON.stringify(d));
 await ev(()=>{__N5.S().musicVol='soft';__N5.kmTick();});
 // hidden
 await ev(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'hidden'});document.dispatchEvent(new Event('visibilitychange'));});await W(1300);a=await D();await W(500);b2=await D();
 ok('pauses when the app is backgrounded',a.gainTarget===0&&a.master<0.03&&a.scheduled===b2.scheduled,JSON.stringify(a));
 await ev(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'visible'});document.dispatchEvent(new Event('visibilitychange'));});await W(1200);d=await D();
 ok('resumes when visible again',d.gainTarget===0.2&&d.scheduled>b2.scheduled,JSON.stringify(d));
 // CPU proxy
 let mx=0;for(let i=0;i<10;i++){mx=Math.max(mx,(await D()).active);await W(300);}ok('light: live audio sources stay small (<160)',mx<160,'max '+mx);
 // leaving the game
 await ev(()=>__N5.go(__N5.home));await W(2200);d=await D();ok('leaving the game fades out and stops the sequencer',!d.running&&!d.want&&d.master<0.02,JSON.stringify(d));
 // settings control
 await p.tap('.tabbar [data-tab="settings"]');await W(500);
 ok('Settings has Game music Off/Soft/Normal',await ev(()=>document.querySelectorAll('#musVolSeg button').length===3&&document.querySelector('#musVolSeg button.on').dataset.mv==='soft'));
 await p.tap('#musVolSeg [data-mv="normal"]');await W(200);ok('picking Normal saves it',await ev(()=>__N5.S().musicVol==='normal'));
 await p.tap('#musVolSeg [data-mv="soft"]');
 ok('no page errors',!errs.length,errs.join('|'));
 console.log(`SUMMARY ${BR} tkamusic ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('FAIL crashed',e);process.exit(1);});
