// Grammar (Batch 2): N5 grammar hub, lessons + audio, drills (particle / choice / conjugation typing / sentence order),
// own FSRS "Grammar" track (flog g<id>, revLog), daily new-grammar limit (default 2), due reviews + Review tab, settings,
// sync merge rules. iPhone-size viewport with touch. BROWSER=webkit|chromium URL=… PART=1|2 (default both)
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const PART=process.env.PART||'12';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const SH='/workspace/n5-game/';
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const errs=[];
 const open=async(seedFn,arg,scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seedFn})(${JSON.stringify(arg)})}
   window.__played=[];const _pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return _pl.call(this).catch(()=>{});};`);
  const p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errs.push(''+e));
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForSelector('#smartStart:not([disabled])',{timeout:20000});await p.waitForTimeout(400);
  const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
  const until=async(f,ms=8000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f,a))return true;await W(100);}return false;};
  const tap=async s=>{await p.tap(s);await W(250);};
  const fits=()=>ev(()=>document.documentElement.scrollWidth<=innerWidth);
  return {ctx,p,ev,W,until,tap,fits};};
 const seed=o=>{const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<6;i++)cards[i]={box:3,due:now+5*D,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-6*D,due:now+5*D}};
  const S={cards,levels:['n5'],autoAdvance:false,retype:false,newLimit:10,pathFocus:'n5',xp:50};
  if(o.gdue){S.gcards={};for(const id of o.gdue)S.gcards[id]={g:1,ok:2,bad:0,t:now-4*D,box:3,due:now-1000,f:{st:2,sp:null,s:3,d:5,lr:now-4*D,due:now-1000}};}
  if(o.kana)localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:2,due:now-1000,ok:2,bad:0,f:{st:2,sp:null,s:3,d:5,lr:now-4*D,due:now-1000}}}}));
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify(S));};
 // answer the current drill on screen; right=true answers correctly. Returns the drill kind.
 const answer=async(T,right)=>{
  const info=await T.ev(()=>{const c=document.querySelector('#qhost .grcard');if(!c)return null;const t=document.querySelector('#qhost .qtype').textContent;
    const p=__N5.GR_DATA.find(x=>t.includes(x.t));return {k:c.dataset.k,id:p&&p.id,t};});
  if(!info)return null;
  const d=await T.ev(([id,k,txt])=>{const p=__N5.GR[id];const q=document.querySelector('#qhost .grq'),hint=document.querySelector('#qhost .grhint');
    return p.d.find(x=>x.k===k&&(k==='o'?hint&&hint.textContent===x.en:k==='c'?q.textContent===x.q&&document.querySelector('.grform b').textContent===x.f:k==='p'?q.textContent.replace('＿＿','＿')===x.s:q.textContent===x.q));},[info.id,info.k,info.t]);
  if(!d)throw new Error('drill not found '+JSON.stringify(info));
  if(info.k==='p'||info.k==='m'){const idx=await T.ev(([a,right])=>[...document.querySelectorAll('#qhost .choice')].findIndex(b=>(b.textContent.slice(1)===a)===right),[d.a,right]);await T.p.tap(`#qhost .choice >> nth=${idx}`);}
  else if(info.k==='c'){await T.p.fill('#typein',right?d.a[0]:'ああ');await T.p.tap('#checkBtn');}
  else{const order=right?d.t:d.t.slice().reverse();for(const t of order){const idx=await T.ev(t=>[...document.querySelectorAll('#grPool .grtile')].findIndex(b=>!b.disabled&&b.textContent===t),t);await T.p.tap(`#grPool .grtile >> nth=${idx}`);}await T.p.tap('#checkBtn');}
  await T.W(200);return info.k;};
 const nextB=async T=>{await T.p.tap('#nextBtn');await T.W(250);};
 let T;
 if(PART.includes('1')){
 // ---- 1. data integrity + audio files ----
 T=await open(seed,{});
 const di=await T.ev(()=>{const G=__N5.GR_DATA,bad=[];const kinds={p:0,m:0,c:0,o:0};const ids=new Set();
   for(const p of G){if(ids.has(p.id))bad.push('dup '+p.id);ids.add(p.id);
    if(!p.t||!p.p||!p.cat||!p.l.length)bad.push('fields '+p.id);if(p.ex.length<2)bad.push('ex '+p.id);if(p.d.length<2)bad.push('drills '+p.id);
    for(const e of p.ex)if(e.length!==3||!e.every(x=>x&&x.length))bad.push('exfmt '+p.id);
    for(const d of p.d){kinds[d.k]++;
     if(d.k==='p'&&(!d.s.includes('＿')||d.s.split('＿').length!==2))bad.push('blank '+p.id);
     if((d.k==='p'||d.k==='m')&&(!d.o.includes(d.a)||new Set(d.o).size!==d.o.length||d.o.length<2))bad.push('opts '+p.id+' '+(d.s||d.q));
     if(d.k==='c'&&(!d.a.length||!d.a.every(a=>/^[ぁ-んー]+$/.test(a))||!d.f))bad.push('conj '+p.id+' '+d.q);
     if(d.k==='o'&&(d.t.length<2||new Set(d.t).size!==d.t.length||(d.alt||[]).some(a=>a.slice().sort().join()!==d.t.slice().sort().join())))bad.push('order '+p.id);}}
   return {n:G.length,bad,kinds,cats:new Set(G.map(p=>p.cat)).size,drills:G.reduce((a,p)=>a+p.d.length,0)};});
 ok(`data: ${di.n} grammar points (40–60), ${di.cats} categories, ${di.drills} drills`,di.n>=40&&di.n<=60&&di.cats>=8,JSON.stringify(di));
 ok('data: every point has lesson, ≥2 examples, ≥2 drills; answers in options; blanks/tiles/conjugations valid',!di.bad.length,JSON.stringify(di.bad));
 ok('data: all four drill types present (particle, choice, conjugation typing, sentence order)',di.kinds.p>=40&&di.kinds.c>=40&&di.kinds.o>=15&&di.kinds.m>=20,JSON.stringify(di.kinds));
 const au=await T.ev(async()=>{const paths=[];for(const p of __N5.GR_DATA){p.ex.forEach((e,i)=>paths.push(`audio/gr/${p.id}-${i+1}.mp3`));p.d.forEach((d,i)=>{if(d.k==='p'||d.k==='o')paths.push(`audio/gr/${p.id}-d${i+1}.mp3`);});}
   const miss=[];for(let i=0;i<paths.length;i+=24)await Promise.all(paths.slice(i,i+24).map(async u=>{const r=await fetch(u,{method:'HEAD'});if(!r.ok)miss.push(u);}));return {n:paths.length,miss};});
 ok(`audio: all ${au.n} example + drill sentence files exist`,au.n>150&&!au.miss.length,JSON.stringify(au.miss.slice(0,5)));
 // ---- 2. Home tile → hub ----
 ok('Home Study grid has a Grammar tile',await T.ev(()=>/Grammar/.test(document.querySelector('[data-m="grammar"]').textContent)&&/52 N5 points/.test(document.querySelector('[data-m="grammar"]').textContent)));
 await T.tap('[data-m="grammar"]');
 ok('hub: 52 points in categories, statuses, next-up hero',await T.until(()=>document.querySelectorAll('.grrow').length===52&&document.querySelectorAll('.grcat').length>=8&&/Next: は — the topic/.test(document.querySelector('.hero').textContent)&&/2 of 2 new points left today/.test(document.querySelector('#grSub').textContent)));
 ok('hub fits 390px',await T.fits());
 await T.p.screenshot({path:SH+'shot-grammar-hub.png'});
 // ---- 3. lesson + audio ----
 await T.tap('#grNext');
 ok('lesson: pattern, explanation, examples with kana + English + 🔈',await T.until(()=>{const l=document.querySelector('#grLesson');return l&&l.dataset.g==='wa'&&/X は Y です/.test(l.querySelector('.grpat').textContent)&&l.querySelectorAll('.grex li').length===3&&l.querySelectorAll('.grex [data-sap]').length===3;}));
 ok('lesson: start button + note about the daily limit',await T.ev(()=>/Start drills/.test(document.querySelector('#grGo').textContent)&&/2 of 2 new left today/.test(document.querySelector('#grNote').textContent)));
 await T.tap('.grex li .grsay');
 ok('🔈 plays the pre-generated example audio',await T.until(()=>window.__played.some(s=>/audio\/gr\/wa-1\.mp3$/.test(s))));
 ok('lesson fits 390px',await T.fits());
 await T.p.screenshot({path:SH+'shot-grammar-lesson.png',fullPage:true});
 // ---- 4. learn drills: all correct → Good, joins the Grammar track ----
 const fl0=await T.ev(()=>__N5.FLOG.e.length);
 await T.tap('#grGo');
 ok('drill session starts (learn: every drill of the point)',await T.until(()=>!!document.querySelector('#qhost .grcard')&&/1\/5/.test(document.querySelector('#qhost .qtype').textContent)));
 await T.p.screenshot({path:SH+'shot-grammar-particle.png'});
 let kinds=[];
 for(let n=0;n<10;n++){const k=await answer(T,true);if(!k)break;kinds.push(k);
  if(n===0){ok('particle drill: correct choice fills the blank, feedback + sentence audio + lesson link',await T.ev(()=>document.querySelector('#gblank.filled').textContent==='は'&&/Correct/.test(document.querySelector('#fb').textContent)&&!!document.querySelector('#fb [data-sap]')&&!!document.querySelector('#fb .grlink')));
   await T.tap('#fb .grlink');ok('lesson link opens the lesson as a sheet (session keeps going)',await T.until(()=>!!document.querySelector('#grModal .grpat')));await T.tap('#grModalClose');}
  await nextB(T);}
 ok('learn session ran all 5 drills (particle, choice, order)',kinds.length===5&&kinds.includes('p')&&kinds.includes('m')&&kinds.includes('o'),kinds.join());
 ok('finish card: Good rating + next review list',await T.until(()=>{const f=document.querySelector('#grFinish');return f&&/5\/5/.test(f.textContent)&&/Good/.test(f.querySelector('.grres').textContent)&&!!f.querySelector('.nextrev')&&/文 は — the topic/.test(f.querySelector('.nextrev').textContent);}));
 await T.p.screenshot({path:SH+'shot-grammar-finish.png'});
 const st=await T.ev(fl0=>{const c=__N5.gcards().wa,S=__N5.S();return {g:c&&c.g,due:c&&c.due>Date.now(),f:!!(c&&c.f&&c.f.s),log:S.newLogG[__N5.todayStr()],flog:__N5.FLOG.e.slice(fl0).map(e=>e[0]),left:__N5.newLeftG()};},fl0);
 ok('FSRS: grammar card created on its own track (S.gcards, c.g=1, scheduled in the future)',st.g===1&&st.due&&st.f,JSON.stringify(st));
 ok('daily log + optimizer review log use the grammar key (gwa)',JSON.stringify(st.log)==='["wa"]'&&st.flog.includes('gwa')&&st.left===1,JSON.stringify(st));
 // ---- 5. second point with one mistake → Hard ----
 await T.ev(()=>__N5.go(()=>__N5.grLesson('ga')));await T.W(300);await T.tap('#grGo');
 let first=true;for(let n=0;n<10;n++){const k=await answer(T,!first);if(!k)break;first=false;await nextB(T);}
 ok('one mistake → Hard',await T.until(()=>/Hard/.test(document.querySelector('#grFinish .grres').textContent)));
 // ---- 6. limit reached → third point is practice only ----
 await T.ev(()=>__N5.go(()=>__N5.grLesson('wo')));await T.W(300);
 ok('3rd new point today: limit reached note, practice button',await T.ev(()=>/Practice drills/.test(document.querySelector('#grGo').textContent)&&/limit reached \(2\)/.test(document.querySelector('#grNote').textContent)));
 await T.p.screenshot({path:SH+'shot-grammar-limit.png'});
 await T.tap('#grGo');for(let n=0;n<10;n++){const k=await answer(T,true);if(!k)break;await nextB(T);}
 ok('practice is not scheduled (no card, log still 2)',await T.until(()=>/not scheduled/.test(document.querySelector('#grFinish').textContent))&&await T.ev(()=>!__N5.gcards().wo&&__N5.S().newLogG[__N5.todayStr()].length===2));
 ok('hub reflects statuses + limit',await T.ev(()=>{__N5.go(__N5.grammarHome);const st=id=>document.querySelector(`.grrow[data-g="${id}"] .grst`).textContent;return st('wa')==='Learning'&&st('ga')!=='New'&&st('wo')==='New'&&/0 of 2/.test(document.querySelector('#grSub').textContent);}));
 // ---- 7. conjugation typing with live romaji → kana ----
 await T.ev(()=>__N5.go(()=>__N5.grSession(['masu'],'learn','test',__N5.grammarHome)));await T.W(300);
 ok('conjugation drill shows base + target form + input',await T.ev(()=>document.querySelector('#qhost .grcard').dataset.k==='c'&&document.querySelector('.grq').textContent==='たべる'&&/polite/.test(document.querySelector('.grform').textContent)));
 await T.p.tap('#typein');await T.p.keyboard.type('tabemasu');await T.W(150);
 ok('romaji converts to kana as you type',await T.ev(()=>document.querySelector('#typein').value==='たべます'),await T.ev(()=>document.querySelector('#typein').value));
 await T.p.screenshot({path:SH+'shot-grammar-conjugation.png'});
 await T.p.keyboard.press('Enter');await T.W(250);
 ok('Enter checks; typed answer accepted',await T.ev(()=>/Correct/.test(document.querySelector('#fb').textContent)&&document.querySelector('#typein').classList.contains('ok')));
 await T.p.keyboard.press('Enter');await T.W(250);
 await T.p.fill('#typein','ikimasita');await T.tap('#checkBtn');
 ok('wrong conjugation: shows the right form + what you wrote',await T.ev(()=>/Not quite/.test(document.querySelector('#fb').textContent)&&/いきます/.test(document.querySelector('#fb').textContent)&&/You wrote/.test(document.querySelector('#fb').textContent)));
 // ---- 8. sentence order (tiles) + keyboard ----
 await T.ev(()=>__N5.go(()=>__N5.grSession(['kara'],'learn','test',__N5.grammarHome)));await T.W(300);
 await T.ev(()=>{});await T.p.keyboard.press('1');await T.W(200);
 ok('key 1 answers a choice drill',await T.ev(()=>!!document.querySelector('#qhost .choice.right')));
 await T.p.keyboard.press('Enter');await T.W(200);await answer(T,true);await nextB(T);
 ok('order drill: tiles + empty answer row, Check disabled',await T.ev(()=>document.querySelector('#qhost .grcard').dataset.k==='o'&&document.querySelectorAll('#grPool .grtile').length===4&&document.querySelector('#checkBtn').disabled&&/Tap the pieces/.test(document.querySelector('#grAns').textContent)));
 await T.p.tap('#grPool .grtile >> nth=0');await T.W(150);
 const placed1=await T.ev(()=>document.querySelectorAll('#grAns .grtile').length);
 await T.p.tap('#grAns .grtile');await T.W(150);
 ok('tap places a tile; tapping it again puts it back',placed1===1&&await T.ev(()=>document.querySelectorAll('#grAns .grtile').length===0));
 await answer(T,false);
 ok('wrong order → ❌ and the correct sentence is shown',await T.ev(()=>/Not quite/.test(document.querySelector('#fb').textContent)&&/うちから えきまで じてんしゃで いきます/.test(document.querySelector('#fb .grsent').textContent)&&document.querySelector('#grAns').classList.contains('bad')));
 await T.p.screenshot({path:SH+'shot-grammar-order.png'});
 ok('drill screens fit 390px',await T.fits());
 // ---- 9. settings row ----
 await T.ev(()=>__N5.go(__N5.home));await T.W(300);await T.tap('.tabbar [data-tab="settings"]');
 ok('settings: daily new grammar limit row, default 2',await T.until(()=>{const s=document.querySelector('#grLimSel');return s&&s.value==='2'&&/new grammar/i.test(document.querySelector('#grLimRow').textContent);}));
 await T.p.selectOption('#grLimSel','3');await T.W(200);
 ok('changing it updates the limit',await T.ev(()=>__N5.S().grLimit===3&&__N5.grLimitV()===3&&__N5.newLeftG()===1));
 // ---- 10. sync merge rules ----
 const mg=await T.ev(()=>{const a={gcards:{wa:{g:1,t:1,ok:1,bad:0,due:5,f:{st:2,due:5}}},newLogG:{'2026-10-06':['wa']}},bb={gcards:{ga:{g:1,t:2,ok:1,bad:0,due:6,f:{st:2,due:6}}},newLogG:{'2026-10-06':['ga']}};
   const o=__N5.mergeStore('S',a,bb,{},{},{});return {k:Object.keys(o.gcards).sort(),l:o.newLogG['2026-10-06']};});
 ok('sync: grammar cards merge per point; new-grammar log unions per day',JSON.stringify(mg.k)==='["ga","wa"]'&&JSON.stringify(mg.l)==='["ga","wa"]',JSON.stringify(mg));
 const bk=await T.ev(()=>{const p=__N5.buildPayload('backup');return JSON.stringify(p).includes('"gcards"');});
 ok('backup payload includes grammar cards',bk);
 await T.ctx.close();
 }
 if(PART.includes('2')){
 // ---- 11. due grammar: Review tab, Home, Smart Start, review session ----
 T=await open(seed,{gdue:['wa','no']});
 ok('Home: due badge + Grammar tile badge count grammar',await T.ev(()=>/2/.test(document.querySelector('[data-m="grammar"] .badge').textContent)&&__N5.totalDue()===2));
 ok('Smart Start: due includes grammar',await T.ev(()=>{const p=__N5.smartPlan(__N5.S().dailies&&__N5.S().dailies.path);return p.k==='due'&&/2 grammar/.test(p.line);}));
 await T.tap('.tabbar [data-tab="review"]');
 ok('Review tab: total + Grammar panel row',await T.until(()=>/2 due/.test(document.querySelector('#dueTotal').textContent)&&!!document.querySelector('.duerow[data-key="grammar"]')&&/2 grammar/.test(document.querySelector('.hero').textContent)));
 await T.p.evaluate(()=>document.querySelector('.duerow[data-key="grammar"]').scrollIntoView({block:'center'}));await T.W(200);
 await T.p.screenshot({path:SH+'shot-grammar-review-tab.png'});
 const fl0=await T.ev(()=>__N5.FLOG.e.length);
 await T.tap('[data-review="grammar"]');
 ok('grammar review: 3 drills per due point',await T.until(()=>!!document.querySelector('#qhost .grcard')&&/0\/6/.test(document.querySelector('#score').textContent)));
 await T.W(700);await T.p.screenshot({path:SH+'shot-grammar-review.png'});
 for(let n=0;n<10;n++){const k=await answer(T,true);if(!k)break;await nextB(T);}
 const rv=await T.ev(fl0=>{const G=__N5.gcards(),S=__N5.S(),d=S.revLog&&S.revLog[__N5.todayStr()]||{};return {due:__N5.grDueScan().ids.length,wa:G.wa.due>Date.now()+864e5,flog:__N5.FLOG.e.slice(fl0).map(e=>e[0]),rl:d.gramg,rlp:d['gramg+'],fin:!!document.querySelector('#grFinish')};},fl0);
 ok('reviews graded on the Grammar track: rescheduled > 1 day, flog g-keys, revLog gramg',rv.fin&&rv.due===0&&rv.wa&&rv.flog.includes('gwa')&&rv.flog.includes('gno')&&rv.rl===2&&rv.rlp===2,JSON.stringify(rv));
 await T.ctx.close();
 // ---- 12. "Review everything due": kana → grammar chain ----
 T=await open(seed,{gdue:['wa'],kana:true});
 await T.ev(()=>__N5.startDueReview('all'));
 ok('everything due starts with kana',await T.until(()=>/Kana due/.test(document.querySelector('.topbar').textContent)));
 for(let n=0;n<4;n++){if(await T.ev(()=>!!document.querySelector('#qhost .grcard')))break;
  await T.ev(()=>{const b=document.querySelector('#qhost .idk:not([disabled]), #qhost #giveBtn:not([disabled])');if(b)b.click();});await T.W(300);
  await T.ev(()=>{const b=document.querySelector('#nextBtn');if(b)b.click();});await T.W(400);}
 ok('…then continues with grammar reviews',await T.until(()=>!!document.querySelector('#qhost .grcard')&&/Grammar due/.test(document.querySelector('.topbar').textContent)));
 await T.ctx.close();
 // ---- 13. only grammar due → straight to grammar; nothing due sheet offers grammar ----
 T=await open(seed,{gdue:['he']},'dark');
 await T.ev(()=>__N5.startDueReview('all'));
 ok('only grammar due → "everything due" goes straight to grammar',await T.until(()=>!!document.querySelector('#qhost .grcard')));
 await T.W(700);await T.p.screenshot({path:SH+'shot-grammar-drill-dark.png'});
 for(let n=0;n<5;n++){const k=await answer(T,true);if(!k)break;await nextB(T);}
 await T.ev(()=>__N5.startDueReview('grammar'));
 ok('nothing due → sheet; Practice anyway opens Grammar',await T.until(()=>!!document.querySelector('#nothingDue')));
 await T.tap('#ndPractice');ok('…Grammar hub',await T.until(()=>document.querySelectorAll('.grrow').length===52));
 await T.p.screenshot({path:SH+'shot-grammar-hub-dark.png'});
 await T.ctx.close();
 }
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} tgrammar ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
