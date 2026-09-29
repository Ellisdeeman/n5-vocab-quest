// Regressions for the iPhone kanji bugs (Sep 2026). BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const mk=async(vp)=>{const ctx=await b.newContext({viewport:vp,deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});const p=await ctx.newPage();p.setDefaultTimeout(12000);p.errs=[];p.on('pageerror',e=>p.errs.push(''+e));p.on('dialog',d=>d.accept());return {ctx,p};};
 let {ctx,p}=await mk({width:375,height:667});const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(900);
 ok('header fits a 375 px screen',await ev(()=>document.documentElement.scrollWidth<=innerWidth),''+await ev(()=>document.documentElement.scrollWidth));
 // 1) start-up with today's level session containing kanji (used to crash → blank Home)
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForFunction(()=>/Kanji · 79/.test(document.querySelector('#kjOpen').textContent));
 await p.waitForTimeout(300);await p.evaluate(()=>{const d=__N5.dailies();delete d.n5;});
 const dj=await ev(()=>__N5.ensureDaily('n5').items.filter(i=>i.j).length);ok('N5 Today\'s session has kanji items',dj>0,''+dj);
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await tap('#dailyBtn');await p.waitForTimeout(500);await tap('#backBtn').catch(()=>{});
 await p.reload();await p.waitForTimeout(1500);
 ok('app starts (Home renders) with kanji in today\'s session',await ev(()=>/Today/.test(document.querySelector('#view').innerText)&&!!document.querySelector('#dailyBtn')));
 ok('no start-up error',p.errs.length===0,JSON.stringify(p.errs));
 // 2) continuing the session right after reopening: kanji must load, not be skipped
 await ev(()=>{const D=__N5.dailies().n5;const i=D.items.findIndex(x=>x.j&&x.mode==='learn');const [x]=D.items.splice(i,1);D.pos=Math.max(1,D.pos);D.items.splice(D.pos,0,x);localStorage.setItem('n5VocabQuest.v1',JSON.stringify(__N5.S()));});
 await p.route(/kanji-n5\.json/,async r=>{await new Promise(z=>setTimeout(z,1200));r.continue();});
 await p.reload();await p.waitForTimeout(300);
 const before=await ev(()=>({pos:__N5.dailies().n5.pos,n:__N5.dailies().n5.items.length,loaded:__N5.KJL.n5.loaded}));
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('#dailyBtn');await tap('#dailyBtn');
 await p.waitForSelector('#kjGot',{timeout:15000}).catch(()=>{});
 ok('session waits for the kanji list and shows the learn card (not skipped)',!!(await p.$('#kjGot')),JSON.stringify(before));
 await p.unroute(/kanji-n5\.json/);
 await tap('#backBtn').catch(()=>{});
 // 3) learn card: readings de-duplicated, strokes lazy-loaded, sheet fits, Done inside the sheet
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('#kjOpen');await tap('#kjOpen');await p.waitForSelector('.kjtile');
 await tap('.kjtile[data-c="会"]').catch(async()=>{await tap('.kjtile:nth-child(40)');});
 await p.waitForSelector('.modal .kjst');
 const kun=await ev(()=>[...document.querySelectorAll('.modal .kjrd')][1].textContent.replace('KUN','').trim().split('、'));
 ok('kun readings have no duplicates',new Set(kun).size===kun.length,kun.join('、'));
 await ev(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>0))));
 const box=await ev(()=>{const b=document.querySelector('.modal .box').getBoundingClientRect(),d=document.querySelector('#kjClose').getBoundingClientRect();return {bt:Math.round(b.top),bb:Math.round(b.bottom),dt:Math.round(d.top),db:Math.round(d.bottom),h:innerHeight}});
 ok('Done button inside the visible sheet',box.db<=box.bb&&box.bb<=box.h&&box.bt>=0,JSON.stringify(box));
 await tap('#kjClose');
 // 4) strokes animate using measured lengths (no pathLength), and a dash per stroke
 await tap('.kjtile[data-c="九"]');await p.waitForSelector('.modal .kjst');
 const an=await ev(()=>[...document.querySelectorAll('.modal .kjst')].map(x=>({pl:x.hasAttribute('pathLength'),anim:x.classList.contains('anim'),da:x.style.strokeDasharray})));
 ok('stroke animation uses measured dash lengths',an.every(a=>!a.pl&&a.anim&&parseFloat(a.da)>2),JSON.stringify(an));
 await tap('#kjStep');await tap('#kjStep');ok('Step wraps: after last stroke label returns to 1',/Step 1\/2/.test(await p.textContent('#kjStep')));
 await tap('#kjClose');
 await ctx.close();
 // 5) failed kanji fetch → level page offers retry and recovers
 ({ctx,p}=await mk({width:320,height:568}));
 let fail=true;await p.route(/kanji-n4\.json/,r=>fail?r.abort():r.continue());
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(900);
 ok('320 px header fits',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.tap('#tabLevels');await p.waitForTimeout(200);await p.tap('.lvlist .lvcard[data-lv=n4]');await p.waitForSelector('#kjOpen');
 await p.waitForFunction(()=>/retry/.test(document.querySelector('#kjOpen').textContent),null,{timeout:12000}).catch(()=>{});
 ok('failed kanji load shows "tap to retry"',/retry/.test(await p.textContent('#kjOpen')));
 fail=false;await p.tap('#kjOpen');await p.waitForSelector('.kjtile',{timeout:12000}).catch(()=>{});
 ok('retry loads the kanji grid',await p.evaluate(()=>document.querySelectorAll('.kjtile').length===166));
 await p.tap('.kjtile:last-child');await p.waitForSelector('.modal .kjst');
 await p.evaluate(()=>Promise.all(document.getAnimations().filter(a=>!a.effect||!a.effect.target||!a.effect.target.classList.contains('kjst')).map(a=>a.finished.catch(()=>0))));
 const box2=await p.evaluate(()=>{const b=document.querySelector('.modal .box').getBoundingClientRect(),d=document.querySelector('#kjClose').getBoundingClientRect();return {bb:Math.round(b.bottom),db:Math.round(d.bottom),h:innerHeight,sw:document.documentElement.scrollWidth}});
 ok('320x568: Done visible, no overflow',box2.db<=box2.bb&&box2.bb<=box2.h&&box2.sw<=320,JSON.stringify(box2));
 ok('no page errors',p.errs.length===0,JSON.stringify(p.errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));process.exit(1)});
