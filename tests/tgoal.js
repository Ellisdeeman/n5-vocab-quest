// Study-time tracker / daily-goal regression test (live or local). BROWSER=chromium|webkit URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'chromium';
const R=[];const ok=(name,cond,info='')=>{R.push([cond?'PASS':'FAIL',name,info]);console.log(cond?'PASS':'FAIL',name,info);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{}),userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'});
 await ctx.addInitScript(()=>{window.__ld=(d=new Date())=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');});
 await ctx.addInitScript(()=>{window.__toasts=[];new MutationObserver(ms=>ms.forEach(m=>m.addedNodes.forEach(n=>{if(n.nodeType===1&&/toast/.test(n.className||''))window.__toasts.push(n.textContent)}))).observe(document,{childList:true,subtree:true});});
 const p=await ctx.newPage();p.setDefaultTimeout(8000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 // 22:00 New York on Sep 29 = 02:00 UTC Sep 30 -> "today" must be the LOCAL date 2026-09-29
 await p.clock.install({time:new Date('2026-09-29T22:00:00-04:00')});
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(800);await p.clock.pauseAt(new Date('2026-09-29T22:00:30-04:00'));
 const TS=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('jlptVocabQuest.time.v1')||'{}'));
 const mem=()=>p.evaluate(()=>__N5.TS?__N5.TS():null);
 const today='2026-09-29';
 const secNow=async()=>{const t=await p.evaluate(()=>{const s=(window.__N5.TS&&__N5.TS())||JSON.parse(localStorage.getItem('jlptVocabQuest.time.v1')||'{}');const d=s.days&&s.days[__ld()];return d?d.sec:0});return t;};
 // tap helper keeps user "active": a real tap somewhere neutral + clock advance
 const study=async(sec)=>{for(let i=0;i<sec;i+=5){await p.mouse.move(5,300);await p.dispatchEvent('body','pointerdown').catch(()=>{});await p.clock.runFor(5000);}};
 const home=async()=>{await p.click('#tabHome').catch(async()=>{await p.click('#backBtn').catch(()=>{});await p.click('#tabHome').catch(()=>{});});await p.waitForTimeout(150);};
 const modes=[
  ['meaning quiz',async()=>{await p.click('button.mode[data-m=meaning]');await p.click('.choices button >> nth=0').catch(()=>{});}],
  ['typing',async()=>{await p.click('button.mode[data-m=typing]');await p.fill('#typein','x').catch(()=>{});await p.keyboard.press('Enter').catch(()=>{});}],
  ['listening',async()=>{await p.click('button.mode[data-m=listen]');}],
  ['match',async()=>{await p.click('button.mode[data-m=match]');}],
  ['speed',async()=>{await p.click('button.mode[data-m=speed]');await p.click('#spStart, button:has-text("Start")').catch(()=>{});}],
  ['daily session',async()=>{await p.click('#dailyBtn');}],
  ['due reviews',async()=>{await p.click('#dueBtn');await p.waitForTimeout(150);await p.click('button:has-text("Review everything due")');}],
  ['kana quiz',async()=>{await p.click('#tabLevels');await p.click('.lvcard[data-lv=kana]');await p.click('button.mode[data-km=k2r]');}],
  ['kana speed',async()=>{await p.click('#tabLevels');await p.click('.lvcard[data-lv=kana]');await p.click('button.mode[data-km=speed]');await p.click('button:has-text("Start")').catch(()=>{});}],
 ];
 // seed a few due cards so due reviews exists
 await p.evaluate(()=>{const S=__N5.S();for(let i=0;i<5;i++)S.cards[i]={box:2,due:0,ok:2,bad:0};__N5.save&&__N5.save();});
 for(const [name,enter] of modes){
  await home();const a=await secNow();
  try{await enter();}catch(e){ok(name+' opens',false,(''+e).slice(0,120));continue;}
  await p.waitForTimeout(100);const st=await p.evaluate(()=>document.body.classList.contains('studying'));
  await study(20);const bb=await secNow();
  ok(`${name}: time accumulates`,bb-a>=18&&bb-a<=22,`+${bb-a}s studying=${st}`);
 }
 ok('day key is LOCAL date (22:00 EDT = 02:00Z)',JSON.stringify(Object.keys((await TS()).days))==='["2026-09-29"]',JSON.stringify(Object.keys((await TS()).days)));
 // idle: 90s no input on a quiz -> at most 60s counted
 await home();await p.click('button.mode[data-m=meaning]');await study(5);let a=await secNow();await p.clock.runFor(90000);let bb=await secNow();
 ok('idle pause after ~60s',bb-a>=50&&bb-a<=62,`+${bb-a}s over 90s idle`);
 await study(10);ok('resumes after input',(await secNow())-bb>=8);
 // non-study screen does not count
 await home();a=await secNow();await study(20);ok('home screen not counted',(await secNow())-a===0);
 // hidden tab
 await p.click('button.mode[data-m=meaning]');await study(3);
 await p.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 const flushed=(await TS()).days[today].sec, memS=await secNow();
 ok('flushed to storage on visibilitychange→hidden',flushed===memS,`stored ${flushed} mem ${memS}`);
 a=memS;await p.clock.runFor(20000);ok('hidden not counted',(await secNow())===a);
 await p.evaluate(()=>{delete document.visibilityState;delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
 // throttled timers (iOS low power / background resume): a single 30s gap between ticks must not be counted as 30s of study…
 await study(3);a=await secNow();
 await p.evaluate(()=>{window.dispatchEvent(new Event('pagehide'));});
 ok('flushed on pagehide',(await TS()).days[today].sec===await secNow());
 // goal ring on Home after returning
 await home();const panel=await p.textContent('.goalpanel');const mins=Math.floor((await secNow())/60);
 ok('home goal ring shows minutes',panel.includes(`${mins}/`),panel.replace(/\s+/g,' ').slice(0,80));
 const pill=await p.textContent('#sTime');ok('header pill current',pill.startsWith(mins+'/'),pill);
 await p.click('#tabStats');const sp=await p.textContent('.goalpanel');ok('stats goal panel shows minutes',sp.includes(`${mins}/`));
 ok('stats chart has 7 bars',(await p.$$('#chart .bar')).length===7);
 // goal settings: preset 30
 await home();await p.click('#goalBtn');await p.click('#gMin button[data-m="30"]');await p.click('#gDone');
 ok('preset goal 30 saved',(await TS()).goalMin===30,'goalMin='+(await TS()).goalMin);
 ok('ring uses new goal',(await p.textContent('.goalpanel')).includes('/30'));
 // custom 25 + items/new
 await p.click('#goalBtn');await p.click('#gMin button[data-m=custom]');await p.fill('#gCustom','25');await p.fill('#gItems','7');await p.fill('#gNew','3');await p.click('#gDone');
 let t=await TS();ok('custom goal + items/new saved',t.goalMin===25&&t.goalItems===7&&t.goalNew===3,JSON.stringify([t.goalMin,t.goalItems,t.goalNew]));
 ok('three rings shown',(await p.$$('.goalrings circle')).length===6);
 // then back to preset 10 (custom row open previously)
 await p.click('#goalBtn');await p.click('#gMin button[data-m="10"]');await p.click('#gDone');
 ok('preset after custom saved',(await TS()).goalMin===10,'goalMin='+(await TS()).goalMin);
 // goal settings from Settings tab and Stats tab
 await p.click('#tabSettings');await p.click('#goalSet');await p.click('#gMin button[data-m="20"]');await p.click('#gDone');
 ok('goal from Settings tab saved',(await TS()).goalMin===20);
 await p.click('#tabStats');await p.click('#stGoal');await p.click('#gMin button[data-m="15"]');await p.click('#gDone');
 ok('goal from Stats tab saved',(await TS()).goalMin===15);
 // celebration: goal 1 min, items 0, new 0 — reach it
 await p.evaluate(()=>{const T=__N5.TS();T.goalMin=Math.floor(T.days[__ld()].sec/60)+1;T.goalItems=0;T.goalNew=0;delete T.days[__ld()].met;});
 await p.click('#tabHome');await p.click('button.mode[data-m=meaning]');
 let toast='';p.on('console',()=>{});
 for(let i=0;i<16&&!toast;i++){await study(5);toast=await p.evaluate(()=>window.__toasts.join('|')+[...document.querySelectorAll('.toast')].map(x=>x.textContent).join('|'));}
 ok('goal reached celebration',/Daily goal reached/.test(toast),toast.slice(0,80));
 await home();ok('home shows goal reached',(await p.textContent('.goalpanel')).includes('Goal reached'));
 // streak: seed previous 3 days met
 await p.evaluate(()=>{const T=__N5.TS();for(const k of [1,2,3]){const d=new Date();d.setDate(d.getDate()-k);const s=__ld(d);T.days[s]={sec:T.goalMin*60,items:3,newW:1,met:1};}});
 await p.click('#tabStats');await home();
 ok('goal streak = 4',(await p.textContent('#goalStreak')).trim()==='4',await p.textContent('#goalStreak'));
 // day rollover: 23:59:40 local, study 40s
 await p.clock.setSystemTime(new Date('2026-09-29T23:59:40-04:00'));
 await p.click('button.mode[data-m=meaning]');const before=(await mem()).days['2026-09-29'].sec;await study(40);
 const m2=await mem();ok('rollover splits at local midnight',!!m2.days['2026-09-30']&&m2.days['2026-09-30'].sec>=15&&m2.days['2026-09-29'].sec-before>=15,JSON.stringify([m2.days['2026-09-29'].sec-before,(m2.days['2026-09-30']||{}).sec]));
 await home();ok('pill resets after midnight',(await p.textContent('#sTime')).startsWith('0/'),await p.textContent('#sTime'));
 ok('streak kept after midnight (yesterday met; 4 days)',(await p.textContent('#goalStreak')).trim()==='4',await p.textContent('#goalStreak'));
 // persistence across reload
 const before2=await mem();await p.reload();await p.waitForTimeout(500);const after2=await TS();
 ok('persisted across reload',after2.goalMin===before2.goalMin&&after2.days['2026-09-30'].sec===before2.days['2026-09-30'].sec);
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(r=>r[0]==='PASS').length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e);process.exit(1)});
