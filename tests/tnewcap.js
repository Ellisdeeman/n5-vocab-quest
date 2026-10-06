// Daily new-words limit: settings (presets/custom/Off), counter on Home + Today's session, cap enforced in every
// mode/set/session/game, "reviews only" card, kanji limit, Pimsleur exclusion, midnight reset (mock clock), sync merge.
// iPhone size (375x667). BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const seedFn=o=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};
  for(let i=0;i<o.seen;i++)cards[i]={box:2,due:now-6e4,ok:2,bad:0,t:now-864e5};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify(Object.assign({cards,xp:100,streak:1,levels:['n5'],autoAdvance:false,unlockAll:true,pathFocus:'n5'},o.S||{})));
  const jc={};(o.kj||'').split('').forEach(c=>jc[c]={box:2,due:now-6e4,ok:2,bad:0,l:'n5'});
  localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:jc}));};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const mk=async(o,clock)=>{const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(seedFn,o);const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('dialog',d=>d.accept());
  if(clock)await p.clock.install({time:clock});
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(900);
  await p.evaluate(()=>Promise.all([__N5.loadLevel('n5'),__N5.loadKanji('n5'),__N5.loadGames('n5')]));
  const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
  const until=async(f,ms=8000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f,a))return true;await W(100);}return false;};
  const st=()=>ev(()=>({nt:__N5.newToday().slice(),ntk:__N5.newTodayK().slice(),cards:Object.keys(__N5.S().cards),kj:Object.keys(__N5.JS().cards)}));
  const cap=()=>ev(()=>!!document.querySelector('#capCard'));
  // answer the current question with 🤷 (fast, always valid) and move on; returns 'cap' / 'end' / true
  const step=async(sel='#qhost button.idk:not([disabled]), #giveBtn:not([disabled])')=>{
   if(!(await until(s=>!!document.querySelector('#capCard')||!!document.querySelector('#kjGot')||!!document.querySelector(s)||!document.querySelector('#qhost .card, #qhost .q'),6000,sel))){if(process.env.DBG)console.log('  STUCK',await ev(()=>(document.querySelector('#view')||document.body).innerHTML.replace(/<svg.*?<\/svg>/g,'').slice(0,1800)));return 'stuck';}
   if(await cap())return 'cap';
   if(await p.$('#kjGot')){await p.tap('#kjGot');await W(150);return true;}
   if(!(await p.$(sel)))return 'end';
   await p.tap(sel);await W(120);if(await p.$('#rtSkip'))await p.tap('#rtSkip');
   const nb=await p.$('#nextBtn');if(nb){await p.tap('#nextBtn');await W(120);}return true;};
  const play=async(n,sel,nq)=>{let r;for(let i=0;i<n;i++){if(nq)await ev(()=>{__N5.sq().length=0;});r=await step(sel);if(r!==true){if(process.env.DBG)console.log("  play stop",i,r);return r;}}return r;};
  return {ctx,p,errs,ev,W,until,st,cap,step,play};};
 // invariant: every vocab card / kanji card that exists now either existed before or is in today's log, and logs ≤ limit
 const noIntro=(a,z,lim,limK)=>{const ex=z.cards.filter(id=>!a.cards.includes(id)&&!z.nt.includes(+id));const exk=z.kj.filter(c=>!a.kj.includes(c)&&!z.ntk.includes(c));
  return {good:!ex.length&&!exk.length&&z.nt.length<=lim&&(limK==null||z.ntk.length<=limK),info:JSON.stringify({ex,exk,nt:z.nt.length,ntk:z.ntk.length})};};

 // ================= A. settings, counter, words cap across modes =================
 {const T=await mk({seen:8,kj:'一二三'});const {p,ev,W,until,st,cap,play}=T;
  await ev(()=>__N5.go(__N5.settingsView));await p.waitForSelector('#newLimSel');
  ok('settings: default limit is 15',await ev(()=>document.querySelector('#newLimSel').value==='15'&&__N5.newLimitV()===15));
  ok('settings: presets 5/10/15/20/30 + Custom + Off',await ev(()=>[...document.querySelectorAll('#newLimSel option')].map(o=>o.value).join()==='5,10,15,20,30,custom,off'));
  ok('settings: kanji has its own limit (default 10)',await ev(()=>document.querySelector('#kjLimSel').value==='10'&&__N5.kjLimitV()===10));
  const fit=await ev(()=>{const r=document.querySelector('#newLimRow'),s=document.querySelector('#newLimSel').getBoundingClientRect();return {ow:document.documentElement.scrollWidth,rw:r.getBoundingClientRect().right,h:s.height};});
  ok('settings: limit row fits 375px, select ≥44px tall',fit.ow<=375&&fit.rw<=375.5&&fit.h>=44,JSON.stringify(fit));
  await p.selectOption('#newLimSel','5');ok('settings: preset 5 saved',await ev(()=>__N5.S().newLimit===5&&JSON.parse(localStorage.getItem('n5VocabQuest.v1')).newLimit===5));
  await p.selectOption('#newLimSel','custom');ok('settings: Custom shows a number box',await ev(()=>!document.querySelector('#newLimNum').hidden));
  await p.fill('#newLimNum','7');await p.dispatchEvent('#newLimNum','change');ok('settings: custom 7 saved',await ev(()=>__N5.S().newLimit===7&&__N5.newLimitV()===7));
  await ev(()=>{__N5.S().autoPace=false;});/* manual cap semantics; Auto pace (tb6) treats Off as a 30/day max */await p.selectOption('#newLimSel','off');ok('settings: Off saved (no limit)',await ev(()=>__N5.S().newLimit==='off'&&__N5.newLeft()===Infinity));
  await p.selectOption('#newLimSel','5');await p.selectOption('#kjLimSel','3');ok('settings: kanji limit 3 saved',await ev(()=>__N5.S().kjLimit===3));
  await ev(()=>__N5.go(()=>{}));await p.tap('.tabbar [data-tab="home"]').catch(()=>ev(()=>__N5.go(__N5.home||(()=>{}))));await W(400);
  ok('Home shows "New today: 0/5"',await until(()=>/New today: 0\/5/.test((document.querySelector('#newToday')||{}).textContent||'')),await ev(()=>(document.querySelector('#newToday')||{}).textContent));
  // lock a Today's session that contains new words (answer 1 item), to test that its new items are held back later
  await ev(()=>__N5.go(()=>__N5.dailySession(undefined,'path')));await W(300);
  ok("Today's session shows the counter",await until(()=>/New today: \d+\/5/.test((document.querySelector('#newToday')||{}).textContent||'')));
  const D0=await ev(()=>{const D=__N5.ensureDaily('path');return {n:D.newCount,items:D.items.length};});
  ok("Today's session plans ≤ allowance new words",D0.n<=5&&D0.n>0,JSON.stringify(D0));
  await play(1);
  // endless quiz over the whole level: introduces at most 5 then serves only seen words
  let a=await st();await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.LV.n5.ids.filter(id=>__N5.isNewWord(id)).slice(0,40),'t')));await W(300);let pr=await play(14,undefined,1);let z=await st();let r=noIntro(a,z,5);
  ok('quiz on new words: exactly 5 introduced, then only those 5 come back',r.good&&z.nt.length===5,pr+' '+r.info);
  a=await st();await ev(()=>__N5.go(()=>__N5.quiz('mixed',__N5.LV.n5.ids,'t')));await W(300);pr=await play(16);z=await st();r=noIntro(a,z,5);
  ok('mixed quiz over the whole level after the cap: reviews only, no new words',pr===true&&r.good&&z.nt.length===5,pr+' '+r.info);
  ok('counter in the quiz session updates (5/5)',await ev(()=>__N5.newTodayText()==='5/5'));
  const unseen=await ev(()=>__N5.LV.n5.ids.filter(id=>__N5.isNewWord(id)).slice(0,60));
  for(const m of ['meaning','reverse','reading','typing','listen','mixed']){a=await st();await ev(([m,u])=>__N5.go(()=>__N5.quiz(m,u,'t')),[m,unseen]);await W(250);
   ok(`${m} on an unseen-only set: "reviews only" card, nothing introduced`,await cap()&&noIntro(a,await st(),5).good);}
  const cc=await ev(()=>{const c=document.querySelector('#capCard');const bs=[...c.querySelectorAll('button')];return {t:c.querySelector('.capmsg').textContent,ids:bs.map(x=>x.id),h:Math.min(...bs.map(x=>x.getBoundingClientRect().height)),ow:document.documentElement.scrollWidth};});
  ok('capped card: friendly message with the limit',cc.t==="You've hit today's 5 new words — reviews only until tomorrow",cc.t);
  ok('capped card: Review due / Practice seen / Raise limit buttons (≥54px, fits)',cc.ids.join()==='capDue,capSeen,capRaise'&&cc.h>=53.9&&cc.ow<=375,JSON.stringify(cc));
  await p.tap('#capSeen');await W(300);ok('Practice seen words starts a question',await until(()=>!!document.querySelector('#qhost button.idk, #giveBtn')));
  a=await st();await play(6);ok('practice seen: no new words',noIntro(a,await st(),5).good);
  await ev(([u])=>__N5.go(()=>__N5.quiz('meaning',u,'t')),[unseen]);await W(250);await p.tap('#capDue');ok('Review due opens the due view',await until(()=>!!document.querySelector('[data-review]')));
  // a themed set (all unseen) via the set page path → quiz → capped
  const setIds=await ev(()=>{const s=__N5.LV.n5.sets.find(s=>s.ids.every(id=>__N5.isNewWord(id)));return s?s.ids:null;});
  if(setIds){await ev(u=>__N5.go(()=>__N5.quiz('mixed',u,'set')),setIds);await W(250);ok('unseen themed set: capped card',await cap());}
  // speed round
  a=await st();await ev(()=>__N5.go(()=>__N5.speed()));await p.tap('#startBtn');await W(200);
  for(let i=0;i<8;i++){if(!(await until(()=>!!document.querySelector('#qhost .choice:not(:disabled)'),4000)))break;await p.tap('#qhost .choice');await W(1200);}
  r=noIntro(a,await st(),5);ok('speed round: only seen words',r.good,r.info);
  await ev(()=>__N5.go(()=>{}));
  // matching pairs
  a=await st();await ev(()=>__N5.go(()=>__N5.match()));await W(300);r=noIntro(a,await st(),5);
  ok('matching pairs: board uses only seen words',r.good&&await ev(()=>document.querySelectorAll('#mgrid .tile').length>=4),r.info);
  await ev(u=>__N5.go(()=>__N5.match(u)),unseen);await W(300);ok('matching pairs on unseen words: capped card',await cap());
  // Today's session (locked earlier with new items): new items held back, reviews still run
  a=await st();await ev(()=>__N5.go(()=>__N5.dailySession(undefined,'path')));await W(300);
  for(let i=0;i<80;i++){const s=await T.step();if(s!==true)break;if(await ev(()=>!!document.querySelector('#homeBtn')))break;}
  r=noIntro(a,await st(),5,3);ok("Today's session: new words held back after the cap, reviews done",r.good,r.info);
  // dailies for a level selection (non-path) built while capped plan 0 new words
  ok('a Today\'s session built while capped has 0 new words',await ev(()=>__N5.buildDaily().newCount===0&&__N5.buildPath().newCount===0));
  // games
  a=await st();await ev(()=>__N5.go(()=>__N5.sniperGame('n5')));await p.tap('#gStart');await until(()=>document.querySelectorAll('#arena .gtarget').length>=3,15000);
  for(let i=0;i<3;i++){await until(()=>__N5.gs&&!__N5.gs.busy,4000);if(await p.$('#gFinal'))break;await p.tap('#gIdk').catch(()=>{});await W(300);}
  r=noIntro(a,await st(),5);ok('sniper: only seen words',r.good&&await ev(()=>__N5.gs.answered>0),r.info);
  a=await st();await ev(()=>__N5.go(()=>__N5.scrambleGame('n5')));await until(()=>!!document.querySelector('#sTray .stile, #capCard'),15000);
  for(let i=0;i<7;i++){if(await p.$('#gFinal')||await cap())break;if(!(await until(()=>!!document.querySelector('.scard .idk:not([disabled])'),4000)))break;await p.tap('.scard .idk');await W(150);if(await p.$('#rtSkip'))await p.tap('#rtSkip');await p.tap('#nextBtn');await W(150);}
  r=noIntro(a,await st(),5);ok('scramble: only seen words',r.good,r.info);
  a=await st();await ev(()=>{const l='n5';__N5.go(()=>__N5.bossFight(l,__N5.bossList(l)[1],()=>{}));});await until(()=>!!document.querySelector('#qhost .choice, #capCard'),15000);
  for(let i=0;i<3;i++){if(!(await until(()=>!!document.querySelector('#qhost button.idk:not([disabled])'),4000)))break;await p.tap('#qhost button.idk');await W(150);if(await p.$('#rtSkip'))await p.tap('#rtSkip');await p.tap('#nextBtn');await W(150);}
  await until(()=>!!document.querySelector('#gFinal'),6000);r=noIntro(a,await st(),5,3);ok('boss battle (unseen set): only seen words / kanji within limit',r.good,r.info);
  a=await st();await ev(()=>__N5.go(()=>__N5.builderGame('n5')));await until(()=>!!document.querySelector('.kbtile, #capCard, #gFinal'),20000);
  for(let i=0;i<7;i++){if(await p.$('#gFinal')||await cap())break;if(!(await until(()=>!!document.querySelector('.kbcard .idk:not([disabled])'),4000)))break;await p.tap('.kbcard .idk');await W(150);if(await p.$('#rtSkip'))await p.tap('#rtSkip');await p.tap('#nextBtn');await W(150);}
  z=await st();r=noIntro(a,z,5,3);ok('kanji builder: new kanji within the kanji limit (3)',r.good,r.info);
  // kanji learn: fill the kanji allowance, then Learn shows the kanji capped card
  await ev(()=>{for(const c of __N5.kjNewFor('n5',5))__N5.kjLearn(c);});
  ok('kanji counter reaches 3/3',await ev(()=>__N5.newTodayText(true)==='3/3'),await ev(()=>__N5.newTodayText(true)));
  await ev(()=>__N5.go(__N5.kanjiPageFn('n5')));await W(300);ok('kanji page says the daily kanji limit is reached',await until(()=>/limit reached/.test(document.querySelector('.hero h2')?.textContent||'')),await ev(()=>(document.querySelector('#view')||{}).innerText?.slice(0,300)));
  await p.tap('#kjLearnBtn');await W(300);ok('kanji Learn: capped card mentions new kanji',await ev(()=>/today's 3 new kanji — reviews only until tomorrow/.test(document.querySelector('#capCard .capmsg')?.textContent||'')));
  ok('kanji cap does not touch the word counter',await ev(()=>__N5.newTodayText()==='5/5'));
  // Pimsleur "Mark lesson done": adds Seen words although capped, doesn't count
  const pm=await ev(()=>{const n0=__N5.newToday().length,c0=Object.keys(__N5.S().cards).length;const res=__N5.pimsAddLesson(1,5,true);return {n0,n1:__N5.newToday().length,created:res&&res.created.length,c1:Object.keys(__N5.S().cards).length-c0};});
  ok('Pimsleur Mark lesson done: not blocked by the cap and not counted',pm.created>0&&pm.c1===pm.created&&pm.n1===pm.n0,JSON.stringify(pm));
  // Home counter at the cap
  await ev(()=>__N5.go(()=>{}));await ev(()=>document.querySelector('#tabHome').click());await W(400);
  ok('Home shows "New today: 5/5" (full)',await until(()=>{const e=document.querySelector('#newToday');return e&&/New today: 5\/5/.test(e.textContent)&&e.classList.contains('full');}));
  // Raise the limit → Settings scrolled to the row
  await ev(([u])=>__N5.go(()=>__N5.quiz('meaning',u,'t')),[unseen]);await W(250);await p.tap('#capRaise');await W(500);
  ok('Raise the limit opens Settings at the limit row',await ev(()=>{const r=document.querySelector('#newLimRow');if(!r)return false;const b=r.getBoundingClientRect();return b.top>=0&&b.bottom<=innerHeight;}));
  await p.selectOption('#newLimSel','10');ok('raising the limit re-opens new words',await ev(()=>__N5.newLeft()===5));
  // Off
  await p.selectOption('#newLimSel','off');a=await st();await ev(u=>__N5.go(()=>__N5.quiz('meaning',u,'t')),unseen);await W(250);
  ok('Off: unseen words are introduced freely',!(await cap())&&await until(()=>!!document.querySelector('#qhost button.idk, #giveBtn')));
  await play(3);ok('Off: counter keeps counting with "no limit"',await ev(()=>/^(8|9) · no limit$/.test(__N5.newTodayText())),await ev(()=>__N5.newTodayText()));
  ok('A: no page errors',!T.errs.length,T.errs.join(' | '));await T.ctx.close();}

 // ================= B. fresh user (nothing seen): every game → capped card =================
 {const T=await mk({seen:0,S:{newLimit:2,kjLimit:1}});const {p,ev,W,until,st,cap,play}=T;
  await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.LV.n5.ids,'t')));await W(300);await play(6,undefined,1);
  ok('fresh: quiz introduces exactly 2 new words',await ev(()=>__N5.newToday().length===2&&Object.keys(__N5.S().cards).length===2));
  await ev(()=>__N5.go(()=>__N5.quiz('typing',__N5.LV.n5.ids.filter(id=>__N5.isNewWord(id)),'t')));await W(250);ok('fresh: typing on the remaining words → capped card',await cap());
  await ev(()=>__N5.go(()=>__N5.sniperGame('n5')));await p.tap('#gStart');ok('fresh: sniper → capped card',await until(()=>!!document.querySelector('#capCard'),10000));
  await ev(()=>{const l='n5';__N5.go(()=>__N5.bossFight(l,__N5.bossList(l)[1],()=>{}));});ok('fresh: boss → capped card',await until(()=>!!document.querySelector('#capCard'),10000));
  const a=await st();await ev(()=>__N5.go(()=>__N5.scrambleGame('n5')));await until(()=>!!document.querySelector('#sTray .stile, #capCard'),15000);
  ok('fresh: scramble → capped card or only the 2 introduced words',(await cap())||noIntro(a,await st(),2).good);
  await ev(()=>__N5.go(()=>__N5.speed()));await p.tap('#startBtn');await W(300);
  for(let i=0;i<6&&!(await cap());i++){if(!(await until(()=>!!document.querySelector('#qhost .choice:not(:disabled)')||!!document.querySelector('#capCard'),4000)))break;if(await cap())break;await p.tap('#qhost .choice');await W(1200);}
  ok('fresh: speed round → only the 2 words, then capped card',noIntro(a,await st(),2).good);
  await ev(()=>__N5.go(()=>__N5.match()));await W(300);ok('fresh: matching pairs → capped card / ≤2 words',(await cap())||noIntro(a,await st(),2).good);
  await ev(()=>__N5.kjLearn(__N5.kjNewFor('n5',1)[0]));await ev(()=>__N5.go(()=>__N5.builderGame('n5')));await until(()=>!!document.querySelector('.kbtile, #capCard, #gFinal'),20000);
  const kb=await ev(()=>({cap:!!document.querySelector('#capCard'),list:(__N5.gs&&__N5.gs.list||[]).map(x=>x[0]).filter(c=>!__N5.JS().cards[c])}));
  ok('fresh: kanji builder → capped card or no unlearned kanji',kb.cap||!kb.list.length,JSON.stringify(kb));
  // Today's session with nothing to review: capped card instead of "done"
  await ev(()=>{const m=__N5.dailies();for(const k in m)delete m[k];const S=__N5.S(),J=__N5.JS(),t=__N5.todayStr();S.cards={};J.cards={};S.newLog[t]=[99998,99999];S.newLogK[t]=['X'];});   // capped, nothing seenawait ev(()=>__N5.go(()=>__N5.dailySession(undefined,'n5')));await W(400);
  const a2=await st();ok("fresh: Today's session (nothing to review, capped) → capped card, nothing introduced",(await cap())&&noIntro(a2,await st(),2,1).good&&a2.cards.length===0&&(await st()).cards.length===0);
  ok('B: no page errors',!T.errs.length,T.errs.join(' | '));await T.ctx.close();}

 // ================= C. midnight reset (mock clock) =================
 {const T=await mk({seen:4,S:{newLimit:2}},new Date('2026-09-30T23:58:00-04:00'));const {p,ev,W,until,cap,play}=T;
  await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.LV.n5.ids.slice(4,80),'t')));await W(300);await play(6,undefined,1);
  const d1=await ev(()=>({t:__N5.todayStr(),n:__N5.newToday().length,left:__N5.newLeft()}));
  ok('clock: capped at 23:58 on Sep 30',d1.t==='2026-09-30'&&d1.n===2&&d1.left===0,JSON.stringify(d1));
  await p.clock.fastForward('04:00');await W(300);
  const d2=await ev(()=>({t:__N5.todayStr(),n:__N5.newToday().length,left:__N5.newLeft(),old:(__N5.S().newLog['2026-09-30']||[]).length}));
  ok('clock: after local midnight the counter resets (0/2), yesterday kept in the log',d2.t==='2026-10-01'&&d2.n===0&&d2.left===2&&d2.old===2,JSON.stringify(d2));
  await ev(()=>document.querySelector('#tabHome').click());await W(500);ok('clock: Home shows New today: 0/2',await until(()=>/New today: 0\/2/.test((document.querySelector('#newToday')||{}).textContent||'')));
  await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.LV.n5.ids.filter(id=>__N5.isNewWord(id)).slice(0,40),'t')));await W(300);
  ok('clock: new words allowed again after midnight',!(await cap())&&await until(()=>!!document.querySelector('#qhost button.idk, #giveBtn')));
  ok('C: no page errors',!T.errs.length,T.errs.join(' | '));await T.ctx.close();}

 // ================= D. sync / backup =================
 {const T=await mk({seen:0,S:{newLimit:5}});const {ev}=T;
  const m=await ev(()=>{const t=__N5.todayStr(),N=__N5;
   const a={newLog:{[t]:[1,2,3],'2026-01-01':[9]},newLogK:{[t]:['一']},newLimit:5},b={newLog:{[t]:[3,4,5]},newLogK:{[t]:['二','一']},newLimit:5};
   const o=N.mergeStore('S',a,b,{},{},{});return {w:o.newLog[t],old:o.newLog['2026-01-01'],k:o.newLogK[t]};});
  ok('sync merge: union of today\'s new words across devices',JSON.stringify(m.w)==='[1,2,3,4,5]'&&JSON.stringify(m.old)==='[9]',JSON.stringify(m));
  ok('sync merge: union of today\'s new kanji',JSON.stringify(m.k)==='["一","二"]',JSON.stringify(m.k));
  const m2=await ev(()=>{const t=__N5.todayStr(),S=__N5.S();const o=__N5.mergeStore('S',{newLog:{[t]:[1,2,3]}},{newLog:{[t]:[3,4,5]}},{},{},{});S.newLog=o.newLog;return {left:__N5.newLeft(),txt:__N5.newTodayText()};});
  ok('sync merge: merged counter respects the cap on both devices (5/5, 0 left)',m2.left===0&&m2.txt==='5/5',JSON.stringify(m2));
  ok('backup payload includes the per-day counter',await ev(()=>{const p=__N5.buildPayload('backup');let s=p.stores['n5VocabQuest.v1'];if(typeof s==='string')s=JSON.parse(s);return !!(s&&s.newLog&&s.newLog[__N5.todayStr()]);}));
  await T.ctx.close();}
 await b.close();
 const pass=R.filter(Boolean).length;console.log(`SUMMARY ${BR} tnewcap ${pass}/${R.length} passed`);process.exit(pass===R.length?0:1);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1);});
