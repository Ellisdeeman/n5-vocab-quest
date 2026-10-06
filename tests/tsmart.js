// Smart Home Start: one big Start button at the top of Home; picks due reviews (mixed tracks) → today's new items
// (within caps) → grammar → a reading story (once a day) → practice (goal not met) → Kanaatro (goal met); explanation line; existing cards stay below. BROWSER=… URL=…
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const errs=[];
 const open=async(seedFn,arg,scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seedFn})(${JSON.stringify(arg)})}`);
  const p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errs.push(''+e));
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForSelector('#smartStart:not([disabled])',{timeout:20000});await p.waitForTimeout(400);
  const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
  const until=async(f,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(100);}return false;};
  return {ctx,p,ev,W,until};};
 const seed=o=>{const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<(o.words||0);i++)cards[i]={box:3,due:o.due?now-36e5:now+5*D,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-6*D,due:o.due?now-36e5:now+5*D}};
  const S={cards,levels:['n5'],autoAdvance:false,newLimit:o.newLimit||10,pathFocus:'n5',xp:50};
  if(o.kana){localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:2,due:now-1000,ok:2,bad:0,f:{st:2,sp:null,s:3,d:5,lr:now-4*D,due:now-1000}}}}));}
  if(o.kanji){localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'一':{box:2,due:now-1000,ok:2,bad:0,l:'n5',f:{st:2,sp:null,s:3,d:5,lr:now-4*D,due:now-1000}}}}));}
  if(o.goal!=null){const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('jlptVocabQuest.time.v1',JSON.stringify({goalMin:5,goalItems:0,goalNew:0,days:{[k]:{sec:o.goal*60,items:0,newW:0}}}));}
  if(o.grFull){const d=new Date(),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');S.newLogG={[k]:['wa','ga']};}
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify(S));};
 const info=ev=>ev(()=>{const b=document.querySelector('#smartStart'),l=document.querySelector('#smartLine'),box=document.querySelector('#smartBox');const r=b.getBoundingClientRect();
   return {plan:box.dataset.plan,btn:b.textContent.trim(),line:l.textContent.trim(),h:r.height,w:r.width,top:r.top,first:box.compareDocumentPosition(document.querySelector('#flHome'))&4,daily:!!document.querySelector('#dailyBtn'),fl:!!document.querySelector('#flHome'),sw:document.documentElement.scrollWidth,iw:innerWidth};});
 // ---- 1. due reviews (words + kanji + kana) ----
 let T=await open(seed,{words:6,due:true,kana:true,kanji:true});let I=await info(T.ev);
 ok('due: plan = reviews, button names the count',I.plan==='due'&&/Review 8 due/.test(I.btn),JSON.stringify(I));
 ok('due: line explains the mix and time',/6 words/.test(I.line)&&/1 kanji/.test(I.line)&&/1 kana/.test(I.line)&&/min/.test(I.line),I.line);
 ok('big button (≥54px, full width) at the top of Home, above the existing cards',I.h>=54&&I.w>=300&&I.top<200&&I.first&&I.daily&&I.fl,JSON.stringify(I));
 ok('fits 375px',I.sw<=I.iw);
 await T.p.screenshot({path:'/workspace/n5-game/shot-smartstart-due.png'});
 await T.p.tap('#smartStart');
 ok('tap → mixed due review session ("Everything due")',await T.until(()=>/Everything due/.test(document.querySelector('#view').innerText)&&!!document.querySelector('#qhost')));
 await T.ctx.close();
 // ---- 2. nothing due → today's new items ----
 T=await open(seed,{words:6,due:false});I=await info(T.ev);
 ok('nothing due: plan = new items from today\'s path',I.plan==='new'&&/Learn new words/.test(I.btn)&&/new word/.test(I.line)&&/of 10 new words left today/.test(I.line),JSON.stringify(I));
 await T.p.screenshot({path:'/workspace/n5-game/shot-smartstart-new.png'});
 await T.p.tap('#smartStart');
 ok("tap → Today's session",await T.until(()=>/Today's session/.test(document.querySelector('#view').innerText)&&!!document.querySelector('#qhost')));
 await T.ev(()=>__N5.go(__N5.home));await T.W(400);
 await T.ev(()=>{const D=__N5.S().dailies.path;D.pos=1;__N5.go(__N5.home);});await T.W(400);
 I=await info(T.ev);ok('part-way: "Continue today\'s lesson"',I.plan==='new'&&/Continue today's lesson/.test(I.btn),JSON.stringify(I));
 await T.ev(()=>{const st=JSON.parse(localStorage.getItem('jlptVocabQuest.kanji.v1')||'{"cards":{}}').cards;for(const c in st)if(st[c].due<=Date.now())window.kjGradeT(c,true,{rating:4,quiet:true});const D=__N5.S().dailies.path;D.done=true;__N5.go(__N5.home);});await T.W(400);
 I=await info(T.ev);ok('path done → new grammar comes next (after new words)',I.plan==='grammar'&&/Grammar: /.test(I.btn)&&/New grammar point 1 of/.test(I.line)&&/2 of 2 new grammar left today/.test(I.line),JSON.stringify(I));
 await T.p.screenshot({path:'/workspace/n5-game/shot-grammar-smartstart.png'});
 await T.p.tap('#smartStart');ok('tap → first grammar lesson',await T.until(()=>!!document.querySelector('#grLesson[data-g="wa"]')));
 await T.ev(()=>{const S=__N5.S();S.newLogG={[__N5.todayStr()]:['wa','ga']};__N5.go(__N5.home);});await T.W(400);
 I=await info(T.ev);ok('grammar done → a reading story comes next',I.plan==='reading'&&/Reading: My Family/.test(I.btn)&&/Story 1 of \d+/.test(I.line)&&/questions/.test(I.line),JSON.stringify(I));
 await T.p.screenshot({path:'/workspace/n5-game/shot-reading-smartstart.png'});
 await T.p.tap('#smartStart');ok('tap → story 1',await T.until(()=>!!document.querySelector('#rdStory')));
 await T.ev(()=>{const S=__N5.S();S.rdDay={[__N5.todayStr()]:['r01']};__N5.go(__N5.home);});await T.W(400);
 I=await info(T.ev);ok('path done + goal not met → plan = practice',I.plan==='practice'&&/Practice/.test(I.btn)&&/goal/.test(I.line),JSON.stringify(I));
 await T.p.screenshot({path:'/workspace/n5-game/shot-smartstart-practice.png'});
 await T.p.tap('#smartStart');
 ok('tap → practice quiz of seen words',await T.until(()=>!!document.querySelector('#qhost .choice, #qhost input, #qhost .flcard')));
 await T.ctx.close();
 // ---- 3. caps reached with nothing due → no "Learn new words" ----
 T=await open(seed,{words:6,due:false,newLimit:1});
 await T.ev(()=>{const S=__N5.S(),t=__N5.todayStr();S.newLog={[t]:[9000]};S.newLogK={[t]:['x','y','z','w','v','u','s','r','q','p']};delete S.dailies;__N5.go(__N5.home);});await T.W(500);
 I=await info(T.ev);ok('daily limits reached → does not offer new words',I.plan!=='new'||!/new word/.test(I.line),JSON.stringify(I));
 await T.ctx.close();
 // ---- 4. goal met → Kanaatro ----
 T=await open(seed,{words:6,due:false,goal:6,grFull:true},'dark');
 await T.ev(()=>{const S=__N5.S();S.rdDay={[__N5.todayStr()]:['r01']};__N5.go(__N5.home);const D=S.dailies.path;D.done=true;__N5.go(__N5.home);});await T.W(400);
 I=await info(T.ev);ok('goal met → suggests a game of Kanaatro',I.plan==='game'&&/Kanaatro/.test(I.btn)&&/goal met/i.test(I.line),JSON.stringify(I));
 await T.p.screenshot({path:'/workspace/n5-game/shot-smartstart-game-dark.png'});
 await T.p.tap('#smartStart');ok('tap → Kanaatro intro',await T.until(()=>!!document.querySelector('#kaStart')));
 await T.ctx.close();
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} tsmart ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
