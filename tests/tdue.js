// Due-review controls: always visible feedback, never a popup/navigation; safe updates; error reporter. BROWSER=webkit URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
const SC={
 fresh:()=>{},
 notdue:()=>{const now=Date.now(),c={};for(let i=0;i<60;i++)c[i]={box:3,due:now+5*3600e3+i*6e4,ok:3,bad:0};localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,levels:['n5']}));},
 due:()=>{const now=Date.now(),c={};for(let i=0;i<60;i++)c[i]={box:3,due:i<25?now-6e4:now+864e5,ok:3,bad:0};localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,levels:['n5']}));},
 kanjionly:()=>{const now=Date.now(),c={};for(let i=0;i<60;i++)c[i]={box:3,due:now+864e5,ok:3,bad:0};localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,levels:['n5']}));localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'一':{box:2,due:now-1000,ok:1,bad:0,l:'n5'},'二':{box:2,due:now-1000,ok:1,bad:0,l:'n5'}},unl:{n5:5}}));},
 // long-time user: v1 fields, old single `daily`, N4 cards (level not loaded at start), kana + kanji keys, time tracker
 upgraded:()=>{const now=Date.now(),c={};for(let i=0;i<300;i++)c[i]={box:1+i%5,due:now-(i%3)*3600e3,ok:2,bad:1};for(let i=0;i<40;i++)c[10000+i]={box:2,due:now-6e4,ok:1,bad:0};
   localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,xp:900,streak:4,lastDay:'2026-09-20',sound:true,romaji:true,speech:true,autoSpeak:false,bestSpeed:12,bestMatch:30,answered:900,notes:{3:'x'},newPerDay:10,dailyTarget:20,daily:{date:'2026-09-28',ids:[1,2,3],pos:1,done:false},dailyHistory:{'2026-09-20':1},unlockedSets:['greet'],levels:['n5']}));
   localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:2,due:now-1000,ok:1,bad:0}}}));
   localStorage.setItem('jlptVocabQuest.time.v1',JSON.stringify({goalMin:15,days:{'2026-09-20':{sec:600,items:30,newW:5}}}));
   localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'一':{box:1,due:now-1000,ok:1,bad:0,l:'n5'}}}));},
};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const [name,seed] of Object.entries(SC)){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();p.setDefaultTimeout(12000);const errs=[],pops=[];let navs=0;
  p.on('pageerror',e=>errs.push(''+e));ctx.on('page',x=>{if(x!==p)pops.push(x.url())});p.on('popup',x=>pops.push(x.url()));p.on('framenavigated',f=>{if(f===p.mainFrame())navs++;});p.on('dialog',d=>d.accept());
  if(name==='kanjionly')await p.route(/kanji-n5\.json/,async r=>{await new Promise(z=>setTimeout(z,2500));r.continue();});
  await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(1200);const nav0=navs;
  const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(300);};
  const back=async()=>{for(let i=0;i<3&&await ev(()=>document.body.classList.contains('studying')||!!document.querySelector('#qhost'));i++){await tap('#backBtn');}await p.waitForTimeout(200);};
  const outcome=async()=>{await p.waitForTimeout(700);return ev(()=>document.querySelector('#nothingDue')?'sheet':document.querySelector('#qhost .choice, #qhost #typein, #qhost #kjGot')?'session':document.querySelector('#qhost')?'qhost':(document.querySelector('.toast')||{}).textContent||'nothing');};
  const exp=async(label,sel,due)=>{await tap(sel);let o=await outcome();if(o==='qhost'){await p.waitForTimeout(2500);o=await outcome();}
    ok(`${name}: ${label} → ${due?'opens a session':'"Nothing due" sheet'}`,due?o==='session':o==='sheet',o);
    if(o==='sheet'){const txt=await p.textContent('#nothingDue');ok(`${name}: ${label} sheet explains when/what`,/Next review in|haven't studied/.test(txt),txt.replace(/\s+/g,' ').slice(0,90));
      if(await p.$('#ndAhead')){await tap('#ndAhead');ok(`${name}: ${label} Review ahead opens a session`,(await outcome())==='session');await back();await p.waitForSelector(sel);await tap(sel);await p.waitForSelector('#nothingDue');}
      await tap('#ndPractice');await p.waitForTimeout(600);ok(`${name}: ${label} Practice anyway opens practice`,await ev(()=>!!document.querySelector('#qhost .choice, #qhost #typein, .kjgrid, #qhost')));await back();}
    else if(o==='session')await back();};
  const d=await ev(()=>({n5:__N5.dueScan(id=>id<10000).ids.length,kj:__N5.kjDueScan('n5').ids.length,all:__N5.totalDue()}));
  // N5 level page
  await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('.duerow[data-key=n5]');
  ok(`${name}: N5 due button never disabled`,await ev(()=>[...document.querySelectorAll('[data-review]')].every(b=>!b.disabled)));
  await exp('N5 level page "Review all due"','.duerow[data-key=n5] button',d.n5>0);
  await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('.duerow[data-key="kanji:n5"]');
  await exp('N5 level page kanji due','.duerow[data-key="kanji:n5"] button',d.kj>0);
  // Review tab
  await tap('#dueBtn');await p.waitForSelector('.duerow[data-key=n5]');
  await exp('Review tab N5 row','.duerow[data-key=n5] button',d.n5>0);
  await tap('#dueBtn');await p.waitForSelector('[data-review=all]');await exp('Review tab everything','[data-review=all]',d.all>0);
  // Home due card
  await tap('#tabHome');await tap('.mode.duecard');ok(`${name}: Home due card opens Review`,await ev(()=>/Review/.test(document.querySelector('.largetitle').textContent)));
  ok(`${name}: badge matches total due`,await ev(()=>{const b=document.querySelector('#dueBadge');const n=__N5.totalDue();return n?+b.textContent===n:b.style.display==='none'}));
  ok(`${name}: no popup / new window`,pops.length===0,JSON.stringify(pops));
  ok(`${name}: no page navigation (reload/new page)`,navs===nav0,`${navs-nav0}`);
  ok(`${name}: no JS errors`,errs.length===0,JSON.stringify(errs.slice(0,2)));
  if(name==='due'){
   // update detected mid-use: no reload; bar shown; controls still work
   await ev(()=>{const of=window.fetch;window.fetch=(u,o)=>/\?build=/.test(String(u))?Promise.resolve(new Response('const BUILD = "ffffffffffff";')):of(u,o);});
   await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('.duerow[data-key=n5]');
   await ev(()=>__N5.checkForUpdate(true));await p.waitForTimeout(800);
   ok('update found after a tap: no reload, "New version ready" bar',navs===nav0&&!!(await p.$('#updBar')));
   await tap('.duerow[data-key=n5] button');ok('due still opens with the update pending',(await outcome())==='session'&&navs===nav0);
   await back();
   // app resumed (foreground, no tap yet) → applies the update = one reload
   const n1=navs;await ev(()=>document.dispatchEvent(new Event('visibilitychange')));await p.waitForTimeout(3500);
   ok('update applied on resume before any tap (single reload)',navs===n1+1,`${navs-n1}`);
   // error reporter
   await p.waitForTimeout(800);await ev(()=>setTimeout(()=>{throw new Error('boom-test')},0));await p.waitForTimeout(400);
   const et=await ev(()=>(document.querySelector('.errtoast')||{}).textContent||'');ok('error reporter shows message + build',/boom-test/.test(et)&&/build [0-9a-f]{8}/.test(et),et.replace(/\s+/g,' ').slice(0,80));
   await tap('.errtoast button');ok('error toast dismissible',!(await p.$('.errtoast')));
   await ev(()=>{Promise.reject(new TypeError('rej-test'));});await p.waitForTimeout(400);ok('unhandled rejections reported too',/rej-test/.test(await ev(()=>(document.querySelector('.errtoast')||{}).textContent||'')));
  }
  await ctx.close();
 }
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));process.exit(1)});
