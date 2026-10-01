// "I don't know" must always be a miss, in every mode. BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};
   for(let i=0;i<120;i++)cards[i]={box:i<40?3:i<80?1:0,due:i%2?now-6e4:now+864e5,ok:3,bad:0};
   localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,xp:500,streak:2,levels:['n5'],autoAdvance:false,pathFocus:'n5'}));
   const kc={};'あいうえおかきくけこアイウエオ'.split('').forEach((c,i)=>kc[c]={box:i%3+1,due:i%2?now-6e4:now+864e5,ok:2,bad:0});
   localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:kc}));
   const jc={};'一二三四五六七八九十'.split('').forEach((c,i)=>jc[c]={box:i%3+1,due:i%2?now-6e4:now+864e5,ok:2,bad:0,l:'n5'});
   localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:jc,unl:{n5:10}}));});
 const p=await ctx.newPage();p.setDefaultTimeout(12000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('dialog',d=>d.accept());
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(1200);
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};
 const snap=()=>ev(()=>({v:JSON.parse(JSON.stringify(__N5.S().cards)),k:JSON.parse(JSON.stringify(__N5.KS().cards)),j:JSON.parse(JSON.stringify(__N5.JS().cards)),xp:__N5.S().xp,score:(document.querySelector('#score')||{}).textContent||'',sscore:(document.querySelector('#sscore')||{}).textContent||'',items:(()=>{const T=__N5.TS().days[__N5.todayStr()];return T?T.items:0})()}));
 const skipLearn=async()=>{for(let i=0;i<12&&await p.$('#kjGot');i++)await tap('#kjGot');};
 async function checkIdk(name,{btn='button.idk',finite=false,queue=null}={}){
  await skipLearn();
  await p.waitForSelector(`${btn}:not([disabled])`);
  await ev(()=>__N5.combo(3));const a=await snap();
  await tap(btn);await p.waitForTimeout(150);const z=await snap();
  const ch=[];for(const kind of ['v','k','j'])for(const id in z[kind]){const o=a[kind][id],n=z[kind][id];if(!o||o.box!==n.box||o.bad!==n.bad||o.ok!==n.ok)ch.push({kind,id,o:o||{box:0,ok:0,bad:0},n});}
  const c=ch[0]||{};const mb=b=>b>=2?1:0;
  ok(`${name}: exactly one item graded`,ch.length===1,JSON.stringify(ch.map(x=>x.id)));
  // FSRS: a miss is rated Again → back to (re)learning (box ≤ 1), bad+1, ok unchanged
  ok(`${name}: SRS miss (Again, box reset, bad+1, ok unchanged)`,c.n&&c.n.rt===1&&c.n.box<=Math.min(1,c.o.box||0)+(c.o.box>=1?0:0)&&c.n.box<=1&&c.n.bad===(c.o.bad||0)+1&&c.n.ok===(c.o.ok||0),JSON.stringify([c.o,c.n]));
  const tr=c.n?[c.n.f,c.n.L].filter(Boolean).sort((x,y)=>(y.lr||0)-(x.lr||0))[0]:null;   // the track that was just graded
  ok(`${name}: reviewed again soon, not instantly due`,!!tr&&tr.due>Date.now()+30e3&&tr.due<Date.now()+11*60e3,JSON.stringify(tr));
  ok(`${name}: no XP`,z.xp===a.xp,`${a.xp}->${z.xp}`);
  ok(`${name}: combo broken`,await ev(()=>__N5.combo())===0);
  ok(`${name}: counts as a review attempt for the daily goal`,z.items===a.items+1);
  ok(`${name}: shown as not-correct`,await ev(()=>!document.querySelector('#fb .reveal.ok')&&!!document.querySelector('.idknote')));
  if(finite){const m=a.score.match(/(\d+)\/(\d+)/),n=z.score.match(/(\d+)\/(\d+)/);ok(`${name}: re-queued in the session`,m&&n&&+n[2]===+m[2]+1,`${a.score} -> ${z.score}`);}
  else if(queue){const q=await ev(qq=>__N5[qq]().map(x=>''+x.id),queue);ok(`${name}: re-queued (comes back soon)`,q.includes(''+c.id),JSON.stringify(q));}
  if(a.score&&/\//.test(a.score)&&!finite){ok(`${name}: correct count unchanged`,+z.score.split('/')[0]===+a.score.split('/')[0],`${a.score}->${z.score}`);}
  if(a.sscore)ok(`${name}: speed score unchanged`,z.sscore===a.sscore);
  return c;
 }
 const home=async()=>{await tap('#tabHome');};
 // vocab endless modes from Home
 for(const m of ['meaning','reverse','reading','listen','typing']){await home();await tap(`.mode[data-m=${m}]`);await checkIdk(`vocab ${m}`,{btn:m==='typing'?'#giveBtn':(await p.$('#giveBtn'))?'#giveBtn':'button.idk',queue:'sq'});await tap('#backBtn');}
 await home();await tap('.mode[data-m=speed]');await tap('#startBtn');await checkIdk('vocab speed',{queue:'sq'});await tap('#backBtn');
 // kana modes (Kana level page)
 for(const m of ['k2r','r2k','listen','type']){await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=kana]');await p.waitForSelector(`button.mode[data-km=${m}]`);await tap(`button.mode[data-km=${m}]`);
   await checkIdk(`kana ${m}`,{btn:m==='type'?'#giveBtn':'button.idk',queue:'kq'});await tap('#backBtn');}
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=kana]');await tap('button.mode[data-km=speed]');await tap('#startBtn');await checkIdk('kana speed',{queue:'kq'});await tap('#backBtn');
 // kanji practice modes
 for(const m of ['k2m','k2r','m2k','wr']){await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForFunction(()=>/Kanji · 79/.test(document.querySelector('#kjOpen').textContent));await tap('#kjOpen');await p.waitForSelector(`button.mode[data-km=${m}]`);await tap(`button.mode[data-km=${m}]`);
   await checkIdk(`kanji ${m}`,{finite:true});await tap('#backBtn');}
 // kanji learn session: IDK on the first quiz after the learn cards → no unlock credit
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await p.waitForSelector('#kjOpen');await tap('#kjOpen');await p.waitForSelector('#kjLearnBtn');
 const un0=await ev(()=>__N5.kjUnlockedCount('n5'));await tap('#kjLearnBtn');const lc=await checkIdk('kanji learn-session quiz',{finite:true});
 ok('kanji IDK on a new kanji stays at box 0 (not credited as a first pass)',lc.n&&lc.n.box===0,JSON.stringify(lc.n));
 await tap('#nextBtn');
 for(let i=0;i<30&&!(await p.$('#dueBack'));i++){await skipLearn();if(await p.$('#dueBack'))break;await p.waitForSelector('button.idk:not([disabled])');await tap('button.idk');await tap('#nextBtn');}
 ok('all-IDK learn session: summary shows 0 correct',/^0\//.test((await p.textContent('#qhost p')).trim()),(await p.textContent('#qhost p')).trim());
 ok('all-IDK learn session: no batch unlock',await ev(()=>__N5.kjUnlockedCount('n5'))===un0);
 await tap('#dueBack');
 // level Today's session, Home path
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');await tap('#dailyBtn');await checkIdk('N5 Today\'s session',{finite:true,btn:'button.idk, #giveBtn'});
 ok('level session correct count unchanged',await ev(()=>__N5.dailies().n5.correct===0));await tap('#backBtn');
 await home();await p.waitForSelector('#dailyBtn:not([disabled])');await tap('#dailyBtn');await checkIdk('Home path session',{finite:true,btn:'button.idk, #giveBtn'});
 ok('path session correct count unchanged',await ev(()=>__N5.dailies().path.correct===0));await tap('#backBtn');
 // Due Reviews
 for(const key of ['n5','kanji:n5','kana:h','all']){await home();await tap('#dueBtn');const sel=`[data-review="${key}"]`;await p.waitForSelector(sel);if(await p.$eval(sel,e=>e.disabled)){ok(`due ${key} has items`,false);continue;}
   await tap(sel);await checkIdk(`Due Reviews ${key}`,{finite:true,btn:'button.idk, #giveBtn'});await tap('#backBtn');}
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));process.exit(1)});
