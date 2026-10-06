// SW upgrade + offline test: old cached build (FROM=old3|old2) with progress → new build. Needs /tmp/swt/serve.py on :8768
const pw=require('playwright-core'),fs=require('fs');
const U='http://localhost:8768/';const BR=process.env.BROWSER||'webkit';const FROM=process.env.FROM||'old3';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
const root=r=>fs.writeFileSync('/tmp/swt/ROOT',r);
(async()=>{
 root(FROM);
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',...(BR==='chromium'?{isMobile:true}:{})});
 let p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};
 await p.goto(U);await p.waitForTimeout(1000);
 await ev(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForTimeout(1000);
 ok(`${FROM}: old SW controls the page`,await ev(()=>!!navigator.serviceWorker.controller));
 const oldBuild=await ev(()=>__N5.BUILD);
 // progress under the old build
 await ev(()=>{const now=Date.now(),S=__N5.S();for(let i=0;i<400;i++)S.cards[i]={box:2,due:now+864e5,ok:2,bad:0};localStorage.setItem('n5VocabQuest.v1',JSON.stringify(S));
   localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'一':{box:2,due:now-1000,ok:2,bad:0,l:'n5'},'人':{box:1,due:now+864e5,ok:1,bad:0,l:'n5'}},unl:{n5:5}}));});
 if(FROM==='old3'){await ev(()=>__N5.loadKanji('n5'));}
 const cachesBefore=await ev(()=>caches.keys());
 // deploy new build while the old one is open (Home Screen app kept in memory)
 root('new');
 await ev(()=>__N5.checkForUpdate&&__N5.checkForUpdate(true)).catch(()=>{});
 await p.waitForFunction(b=>window.__N5&&__N5.BUILD!==b,oldBuild,{timeout:20000}).catch(()=>{});
 let nb=await ev(()=>window.__N5&&__N5.BUILD).catch(()=>null);
 if(nb===oldBuild){await p.reload();await p.waitForTimeout(1000);nb=await ev(()=>__N5.BUILD);}
 ok(`${FROM}: open old app picks up the new build`,nb&&nb!==oldBuild,`${oldBuild}->${nb}`);
 for(let i=0;i<30;i++){const st=await ev(async()=>{const r=await navigator.serviceWorker.getRegistration();return {a:r&&r.active&&r.active.scriptURL,w:!!(r&&r.waiting),i:!!(r&&r.installing),k:await caches.keys()}});if(st.k.includes('n5vq-page-v21'))break;if(i%5==0)console.log('  sw',JSON.stringify(st));await p.waitForTimeout(1000);if(i==10){await p.reload();await p.waitForTimeout(800);}}
 const keys=await ev(()=>caches.keys());ok(`${FROM}: SW v21 active, old page cache dropped`,keys.includes('n5vq-page-v21')&&!keys.some(k=>/page-v([2-9]|1[0-9]|20)$/.test(k)),JSON.stringify(cachesBefore)+' -> '+JSON.stringify(keys));
 ok(`${FROM}: progress intact`,await ev(()=>Object.keys(__N5.S().cards).length>=400&&!!__N5.JS().cards['一']));
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForFunction(()=>/Kanji · 79/.test((document.querySelector('#kjOpen')||{}).textContent||''));
 await tap('#kjOpen');await p.waitForSelector('.kjtile');await tap('.kjtile[data-c="九"]');await p.waitForSelector('.modal .kjsvg .kjst');
 ok(`${FROM}: learn card draws strokes after upgrade`,await ev(()=>document.querySelectorAll('.modal .kjst').length===2));
 await tap('#kjClose');await tap('.kjtile[data-c="合"]').catch(()=>{});
 // cached kanji data: new versions stored, old dropped
 const dk=await ev(async()=>{const c=await caches.open('n5vq-data-v1');return (await c.keys()).map(r=>new URL(r.url).pathname+new URL(r.url).search).filter(u=>/kanji-n5/.test(u))});
 ok(`${FROM}: data cache holds only the new kanji-n5 files`,dk.length===2&&dk.some(u=>/-s\.json/.test(u)),JSON.stringify(dk));
 // slow network (server takes 15 s): the SW serves the cached page after ~4 s instead of a white screen that never loads
 fs.writeFileSync('/tmp/swt/DELAY','15');const ts=Date.now();await p.reload({waitUntil:'load',timeout:30000}).catch(e=>console.log('  slow nav',e.message.slice(0,60)));
 await p.waitForFunction(()=>window.__N5,null,{timeout:30000}).catch(()=>{});const slow=Date.now()-ts;fs.writeFileSync('/tmp/swt/DELAY','0');
 ok('slow network: cached app shows within ~6 s (SW navigation timeout)',slow<7500,slow+'ms');
 await p.waitForTimeout(12000);
 // games data: open N5 games online once (the SW caches data/games-n5.json)
 await tap('.tabbar [data-tab="home"]');await tap('button.mode[data-m="games"]');await tap('button.gtile[data-gl="n5"][data-game="scramble"]');
 ok('online: N5 Sentence Scramble loads',await p.waitForSelector('#sTray .stile',{timeout:15000}).then(()=>true,()=>false));await tap('#backBtn');
 // offline: cached level works, uncached strokes fall back to the static character, uncached list shows retry
 root('offline');
 await p.reload().catch(e=>console.log('  offline nav',e.message.slice(0,80)));await p.waitForTimeout(1200);
 ok('offline: app loads from cache',await ev(()=>!!window.__N5));
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForFunction(()=>/Kanji · 79/.test((document.querySelector('#kjOpen')||{}).textContent||''));
 await tap('#kjOpen');await p.waitForSelector('.kjtile');await tap('.kjtile[data-c="九"]');await p.waitForSelector('.modal .kjsvg .kjst');ok('offline: cached N5 strokes still animate',true);
 await tap('#kjClose');
 await tap('.tabbar [data-tab="home"]');await tap('button.mode[data-m="games"]');await tap('button.gtile[data-gl="n5"][data-game="scramble"]');
 ok('offline: N5 Sentence Scramble works from cache',await p.waitForSelector('#sTray .stile',{timeout:15000}).then(()=>true,()=>false));await tap('#backBtn');
 await tap('button.gtile[data-gl="n5"][data-game="builder"]');ok('offline: N5 Kanji Builder works from cache',await p.waitForSelector('.kbtile',{timeout:15000}).then(()=>true,()=>false));await tap('#backBtn');
 await tap('button.gtile[data-gl="n5"][data-game="sniper"]');await tap('#gStart');ok('offline: N5 Listening Sniper works from cache',await p.waitForSelector('#arena .gtarget',{timeout:15000}).then(()=>true,()=>false));await tap('#backBtn');
 // N4 list/strokes never fetched → offline fallback
 await ev(()=>__N5.go?0:0);
 const n4=await ev(async()=>{const ok=await __N5.loadKanji('n4');return ok});
 ok('offline: uncached kanji list fails cleanly',n4===false);
 root('new');
 const n4b=await ev(()=>__N5.loadKanji('n4'));ok('back online: kanji list loads on retry',n4b===true);
 // open an N4 card directly via the kanji page
 await tap('#tabLevels');
 root('new');await tap('.lvlist .lvcard[data-lv=n4]');await p.waitForSelector('#kjOpen');root('offline');
 await p.waitForFunction(()=>/Kanji · 166/.test(document.querySelector('#kjOpen').textContent));await tap('#kjOpen');await p.waitForSelector('.kjtile');
 await tap('.kjtile:nth-child(3)');await p.waitForSelector('.modal .kjglyph');await p.waitForFunction(()=>/connection/.test(document.querySelector('.modal .kjsvgwrap').textContent),null,{timeout:15000}).catch(()=>{});
 ok('offline: stroke order falls back to the static character',await ev(()=>!!document.querySelector('.modal .kjglyph')&&/connection/.test(document.querySelector('.modal .kjsvgwrap').textContent)&&document.querySelector('#kjStep').disabled));
 ok('offline: Done still closes the card',(await tap('#kjClose'),!(await p.$('.modal'))));
 root('new');
 // offline-only noise WebKit reports itself: its automatic SW update check failing, the SW's deliberate Response.error() for an uncached file,
 // and an uncached word MP3 failing to load while offline (the game falls back to speech)
 const real=errs.filter(e=>!/sw\.js load failed|Response served by service worker is an error|FetchEvent\.respondWith received an error: TypeError: Load failed|Cannot load http.*\/audio\/.*\.mp3/.test(e));
 ok('no page errors (besides expected offline network noise)',real.length===0,JSON.stringify(real.slice(0,3)));
 console.log('SUMMARY',BR,FROM,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));process.exit(1)});
