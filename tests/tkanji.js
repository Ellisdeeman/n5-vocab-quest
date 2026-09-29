// Kanji section regression test (touch). BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const SHOT=process.env.SHOT;
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};for(let i=0;i<50;i++)cards[i]={box:3,due:now+864e5,ok:3,bad:0};localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,xp:100,streak:2,levels:['n5']}));localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:3,due:now+864e5,ok:3,bad:0}}}));});
 const p=await ctx.newPage();p.setDefaultTimeout(10000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(900);
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(200);};
 const correctIdx=()=>ev(()=>{const N=__N5,KJ=N.KJ,host=document.querySelector('#qhost');const qt=host.querySelector('.qtype').textContent,pr=host.querySelector('.prompt').textContent.trim();
   const opts=[...host.querySelectorAll('.choice')].map(b=>b.textContent.replace(/^\d/,'').trim());
   if(/mean\?/.test(qt))return opts.indexOf(KJ[pr].mean);
   if(/read\?/.test(qt)&&/kanji/.test(qt)){const k=KJ[pr];return opts.findIndex(o=>o===[(k.on||[]).slice(0,2).join('・'),(k.kun||[]).slice(0,2).map(r=>r.replace('.','(')+(r.includes('.')?')':'')).join('・')].filter(Boolean).join(' / '));}
   if(/means/.test(qt)){return opts.findIndex(o=>KJ[o]&&KJ[o].mean===pr);}
   const rd=new Set();for(const c in KJ)for(const e of (KJ[c].ex||[]))if(e[1]===pr)rd.add(e[2]);const hits=opts.map((o,i)=>rd.has(o)?i:-1).filter(i=>i>=0);return hits.length===1?hits[0]:(hits.length>1?-2:-1);});
 const runSession=async(mode='correct',max=80)=>{let q=0,learn=0,bad=0;for(let i=0;i<max;i++){if(await p.$('#dueBack'))break;
   if(await p.$('#kjGot')){learn++;await tap('#kjGot');continue;}
   if(mode==='idk'){await tap('button.idk');}else{const k=await correctIdx();if(k<0){bad++;console.log('  UNANS',await ev(()=>JSON.stringify({qt:document.querySelector('.qtype').textContent,pr:document.querySelector('.prompt').textContent,sub:(document.querySelector('.sub')||{}).textContent,opts:[...document.querySelectorAll('.choice')].map(b=>b.textContent)})));await tap('button.idk');}else {await tap(`.choice[data-i="${k}"]`);if(await p.$('.choice.wrong'))console.log('  WRONG',await ev(()=>({qt:document.querySelector('.qtype').textContent,pr:document.querySelector('.prompt').textContent,sub:(document.querySelector('.sub')||{}).textContent,opts:[...document.querySelectorAll('.choice')].map(b=>b.textContent)})).then(JSON.stringify));}}
   q++;await p.waitForSelector('#nextBtn');await tap('#nextBtn');}return {q,learn,bad};};
 const before=await ev(()=>({v:Object.keys(__N5.S().cards).length,k:Object.keys(__N5.KS().cards).length}));
 // level page → kanji card
 await tap('.lvgrid .lvcard[data-lv=n5]');await p.waitForSelector('#kjOpen');
 await p.waitForFunction(()=>/Kanji · 79/.test(document.querySelector('#kjOpen').textContent));ok('N5 level page shows Kanji card (79)',true);
 await tap('#kjOpen');await p.waitForSelector('.kjtile');
 const tiles=await ev(()=>({n:document.querySelectorAll('.kjtile').length,un:document.querySelectorAll('.kjtile:not(.locked)').length,first:[...document.querySelectorAll('.kjtile')].slice(0,5).map(x=>x.textContent).join('')}));
 ok('kanji grid 79, first batch of 5 unlocked, easiest first',tiles.n===79&&tiles.un===5&&tiles.first==='一人十二九',JSON.stringify(tiles));
 if(SHOT)await p.screenshot({path:SHOT+'kanji-section.png'});
 await tap('.kjtile[data-c="九"]');const svgN=await ev(()=>document.querySelectorAll('.modal .kjsvg .kjst').length);
 ok('tile opens learn card with stroke order (九 = 2 strokes)',svgN===2,''+svgN);
 await tap('#kjStep');ok('step-by-step stroke display',await ev(()=>document.querySelectorAll('.modal .kjsvg .kjst').length)===1);
 ok('learn card shows readings + example words',await ev(()=>/KUN/.test(document.querySelector('.modal').textContent)&&document.querySelectorAll('.modal .kjexrow').length>0));
 await tap('#kjClose');
 // learn session
 await tap('#kjLearnBtn');await p.waitForSelector('#kjGot');
 if(SHOT){await p.waitForTimeout(1500);await p.screenshot({path:SHOT+'kanji-learn-light.png'});}
 let r=await runSession('correct');
 ok('learn session: 5 learn cards + quiz, all answerable',r.learn===5&&r.q>=10&&r.bad===0,JSON.stringify(r));
 const un2=await ev(()=>__N5.kjUnlockedCount('n5'));ok('next batch unlocked after learning',un2===10,''+un2+' '+JSON.stringify(await ev(()=>__N5.JS().cards)));
 await tap('#dueBack');ok('back to kanji section',await ev(()=>/Kanji · N5/.test(document.querySelector('.largetitle').textContent)));
 // practice m2k: look-alike distractors + IDK
 await tap('button.mode[data-km=m2k]');await p.waitForSelector('.choice');
 for(let i=0;i<12;i++){const has=await ev(()=>{const pr=document.querySelector('.prompt').textContent.trim();const k=Object.values(__N5.KJ).find(x=>x.mean===pr);return k.la.length>0});if(has)break;await tap('button.idk');await p.waitForSelector('#nextBtn');await tap('#nextBtn');await p.waitForSelector('.choice');}
 const la=await ev(()=>{const N=__N5,pr=document.querySelector('.prompt').textContent.trim();const k=Object.values(N.KJ).find(x=>x.mean===pr);const opts=[...document.querySelectorAll('.choice')].map(b=>b.textContent.replace(/^\d/,'').trim());return {c:k.c,la:k.la,opts,hit:opts.filter(o=>k.la.includes(o)).length}});
 ok('meaning→kanji uses look-alike wrong answers',la.hit>=1,JSON.stringify(la));
 const c0=la.c,box0=await ev(c=>__N5.JS().cards[c].box,c0);
 await tap('button.idk');const idk=await ev(c=>({box:__N5.JS().cards[c].box,note:!!document.querySelector('.idknote'),shake:!!document.querySelector('.shake'),right:!!document.querySelector('.choice.right')}),c0);
 ok('I don\'t know: reveals, box reset (miss), no shake',idk.box===(box0>=2?1:0)&&idk.note&&!idk.shake&&idk.right,JSON.stringify(idk));
 if(SHOT)await p.screenshot({path:SHOT+'kanji-quiz-idk.png'});
 await tap('#backBtn');
 for(const m of ['k2m','k2r','wr']){await tap(`button.mode[data-km=${m}]`);await p.waitForSelector('.choice');const t=await p.textContent('.qtype');await tap('.choice[data-i="0"]');await p.waitForSelector('#nextBtn');ok(`practice mode ${m} works`,true,t.trim().slice(0,40));await tap('#backBtn');}
 // due reviews
 await ev(()=>{const J=__N5.JS();J.cards['一'].due=Date.now()-1000;J.cards['人'].due=Date.now()-1000;localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify(J));});
 await tap('#dueBtn');await p.waitForSelector('.duerow[data-key="kanji:n5"]');
 const dueN=await ev(()=>+(document.querySelector('.duerow[data-key="kanji:n5"] .duen')||{textContent:0}).textContent);
 ok('Due Reviews lists Kanji · N5 row',dueN>=2,''+dueN);
 ok('badge includes kanji',await ev(()=>+document.querySelector('#dueBadge').textContent===__N5.totalDue()));
 await tap('[data-review="kanji:n5"]');r=await runSession('correct');ok('kanji due session completes',r.q>=2&&r.bad===0,JSON.stringify(r));
 await tap('#dueBack');await p.waitForSelector('.duerow');ok('kanji due cleared',await ev(()=>!(document.querySelector('.duerow[data-key="kanji:n5"] .duen'))));
 // everything due includes kanji
 await ev(()=>{const J=__N5.JS();J.cards['十'].due=Date.now()-1000;});await tap('#tabHome');await tap('#dueBtn');await p.waitForSelector('[data-review=all]');
 await tap('[data-review=all]');const hasKj=await ev(()=>!!document.querySelector('.kjprompt')||/kanji|word/i.test(document.querySelector('.qtype').textContent));r=await runSession('correct');
 ok('Review everything due includes kanji',hasKj&&r.q>=1,JSON.stringify(r));await tap('#dueBack');
 // level Today's session has kanji
 const d5=await ev(()=>{const D=__N5.ensureDaily('n5');return {j:D.items.filter(i=>i.j).length,learn:D.items.filter(i=>i.j&&i.mode==='learn').length,kn:D.kanjiNew}});
 ok('N5 Today\'s session includes new kanji',d5.learn>0&&d5.kn>0,JSON.stringify(d5));
 // path: kana mastered → N5 frontier → kanji in path; toggle off
 await ev(()=>{const K=__N5.KS(),now=Date.now();for(const id in __N5.KITEMS)if(__N5.KITEMS[id].g!=='ext')K.cards[id]={box:5,due:now+864e5,ok:5,bad:0};delete __N5.S().dailies.path;});
 await tap('#tabStats');await tap('#tabHome');await p.waitForFunction(()=>__N5.dailies().path,null,{timeout:15000});
 let pd=await ev(()=>{const D=__N5.dailies().path;return {stage:D.stage,kj:D.items.filter(i=>i.j).length,kn:D.kanjiNew}});
 ok('Home path at N5 mixes in N5 kanji',pd.stage==='n5'&&pd.kn>0,JSON.stringify(pd));
 ok('hero mentions kanji',/kanji/.test(await p.textContent('.hero')));
 await tap('#tabSettings');await tap('#pathKj');await tap('#tabHome');
 pd=await ev(()=>{const D=__N5.dailies().path;return {kj:D.items.filter(i=>i.j).length}});ok('Settings toggle removes kanji from path',pd.kj===0,JSON.stringify(pd));
 ok('toggle persisted',await ev(()=>JSON.parse(localStorage.getItem('n5VocabQuest.v1')).pathKanji===false));
 // stats
 await tap('#tabStats');ok('Stats shows kanji progress',await ev(()=>/Kanji/.test(document.querySelector('#view').textContent)&&document.querySelectorAll('.kjstat').length===5));
 if(SHOT)await p.screenshot({path:SHOT+'kanji-stats.png',fullPage:false});
 // goals count kanji answers
 ok('kanji answers counted in daily goal items',await ev(()=>{const T=__N5.TS(),d=__N5.todayStr();return T.days[d]&&T.days[d].items>=15}));
 // progress intact
 const after=await ev(()=>({v:Object.keys(__N5.S().cards).filter(k=>+k<50).length,k:!!__N5.KS().cards['あ']}));ok('existing vocab & kana progress intact',after.v===50&&after.k);
 // reload persistence + dark mode learn card
 await p.reload();await p.waitForTimeout(800);ok('kanji progress persists',await ev(()=>Object.keys(__N5.JS().cards).length>=5));
 if(SHOT){await p.emulateMedia({colorScheme:'dark'});await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('#kjOpen');await tap('#kjOpen');await p.waitForSelector('.kjtile');await p.screenshot({path:SHOT+'kanji-section-dark.png'});await tap('.kjtile[data-c="九"]');await p.waitForTimeout(1500);await p.screenshot({path:SHOT+'kanji-card-dark.png'});}
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));process.exit(1)});
