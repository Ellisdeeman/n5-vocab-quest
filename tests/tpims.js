// Pimsleur words + "Done, repeat tomorrow" test (touch, iPhone size). BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,c?'':i);};
const LINK='https://example.com/pimsleur';
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:375,height:667},hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(l=>{window.open=()=>({});if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};for(let i=0;i<50;i++)cards[i]={box:3,due:now+864e5,ok:3,bad:0,t:now-864e5};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5']}));localStorage.setItem('jlptVocabQuest.audioLesson.v1',JSON.stringify({url:l,cur:4,min:30}));},LINK);
 const p=await ctx.newPage();p.setDefaultTimeout(10000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 p.on('dialog',d=>d.accept());
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('#alCard');await p.waitForTimeout(500);
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};
 const sec=()=>ev(()=>{const T=__N5.TS(),d=__N5.todayStr();return (T.days[d]||{sec:0}).sec});
 const nCards=()=>ev(()=>Object.keys(__N5.S().cards).length);
 const ids4=await ev(()=>__N5.pimsLessonIds(1,4));
 ok('data: Level 1 has 30 lessons, labelled unofficial',await ev(()=>Object.keys(__N5.PIMS.levels[1].lessons).length===30&&/unofficial/i.test(__N5.PIMS.meta.label)&&/not affiliated/i.test(__N5.PIMS.meta.label)));
 ok('lesson 4 has matched vocab + Pimsleur-set words',ids4.some(i=>i<50000)&&ids4.some(i=>i>=50000),JSON.stringify(ids4));
 ok('Pimsleur words are real app words (pm level, audio path)',await ev(ids=>ids.filter(i=>i>=50000).every(i=>__N5.WORDS[i]&&__N5.WORDS[i].lvl==='pm'&&__N5.wordAudioPath(__N5.WORDS[i]).startsWith('pm/w/')),ids4));
 ok('home shows Pimsleur words link',!!(await p.$('#pimsOpen'))&&/Lesson 4/.test(await p.textContent('#pimsOpen')));
 // pre-existing reviewed card for one lesson word must not be touched
 const keep=ids4.find(i=>i<50000);await ev(id=>{const S=__N5.S();S.cards[id]={box:4,due:Date.now()+9e8,ok:6,bad:1,t:Date.now()-5e3};__N5.gsave();},keep);
 const c0=await nCards(),s0=await sec();
 await tap('#alOpen');await p.waitForSelector('#alRepeat');
 ok('opened lesson shows Mark lesson done + Done, repeat tomorrow',!!(await p.$('#alDone'))&&/repeat tomorrow/i.test(await p.textContent('#alRepeat')));
 ok('buttons fit 375px',await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 const h=await ev(()=>[...document.querySelectorAll('#alCard .btn:not(.small)')].map(b=>b.getBoundingClientRect().height));ok('primary buttons ≥54px',h.length===2&&h.every(x=>x>=53.5),JSON.stringify(h));
 await tap('#alDone');
 ok('mark done advances to Lesson 5',await ev(()=>__N5.AL().cur===5));
 ok('mark done adds 30 min',(await sec())-s0===1800);
 ok('all lesson-4 words now in Seen',await ev(ids=>ids.every(i=>__N5.S().cards[i]),ids4));
 const created=await ev(()=>__N5.AL().log[__N5.todayStr()].pw||[]);
 ok('new cards are new SRS items (box 0, due now, unreviewed)',created.length>0&&await ev(ids=>ids.every(i=>{const c=__N5.S().cards[i];return c.box===0&&c.ok===0&&c.bad===0&&!c.t&&c.due<=Date.now()}),created));
 ok('existing reviewed card untouched',await ev(id=>{const c=__N5.S().cards[id];return c.box===4&&c.ok===6},keep));
 ok('card count grew by the words created',(await nCards())-c0===created.length);
 ok('repeat count 1 recorded, words-added set recorded',await ev(()=>__N5.AL().rep['1:4']===1&&__N5.AL().padd['1:4'].length>0));
 ok('card says words added',/Pimsleur word/.test(await p.textContent('#alCard')));
 const cA=await nCards();await ev(()=>__N5.pimsAddLesson(1,4));ok('adding the same lesson again is idempotent',(await nCards())===cA);
 // review one created word, then undo: only unreviewed created words go
 const rv=created[0];await ev(id=>{const S=__N5.S();Object.assign(S.cards[id],{box:1,ok:1,t:Date.now()});__N5.gsave();},rv);
 await tap('#alUndo');
 ok('undo: back to Lesson 4, minutes removed',await ev(()=>__N5.AL().cur===4&&!__N5.AL().log[__N5.todayStr()])&&(await sec())===s0);
 ok('undo removes words added only by that action (unreviewed)',await ev(({ids,rv})=>ids.filter(i=>i!==rv).every(i=>!__N5.S().cards[i]),{ids:created,rv}));
 ok('undo keeps a word reviewed since',await ev(id=>!!__N5.S().cards[id],rv));
 ok('undo keeps pre-existing card',await ev(id=>__N5.S().cards[id].box===4,keep));
 ok('undo resets the repeat count',await ev(()=>!__N5.AL().rep['1:4']));
 // repeat option
 await tap('#alOpen');await p.waitForSelector('#alRepeat');await tap('#alRepeat');
 ok('repeat: lesson number stays 4',await ev(()=>__N5.AL().cur===4));
 ok('repeat: minutes count, today complete',(await sec())-s0===1800&&await ev(()=>!!__N5.AL().log[__N5.todayStr()]&&__N5.AL().log[__N5.todayStr()].rep===1));
 ok('repeat: goal met by the lesson',await ev(()=>__N5.goalMet()));
 ok('repeat: words added too',await ev(ids=>ids.every(i=>__N5.S().cards[i]),ids4));
 ok('repeat: card promises Repeat of Lesson 4 tomorrow',/Repeat of Lesson 4/.test(await p.textContent('#alCard')));
 await tap('#alUndo');ok('undo repeat: lesson still 4, minutes removed, count reset',await ev(()=>__N5.AL().cur===4&&!__N5.AL().rep['1:4'])&&(await sec())===s0);
 await tap('#alOpen');await tap('#alRepeat');
 // simulate tomorrow: move today's log entry to yesterday
 await ev(()=>{const A=__N5.AL(),d=__N5.todayStr(),y=new Date(Date.now()-864e5).toLocaleDateString('en-CA');A.log[y]=A.log[d];delete A.log[d];A.opened=null;localStorage.setItem('jlptVocabQuest.audioLesson.v1',JSON.stringify(A));});
 await tap('#tabStats');await tap('#tabHome');
 const t2=await p.textContent('#alCard');ok('next day: "Repeat of Lesson 4" and "Lesson 4 · 2nd time"',/Repeat of Lesson 4/.test(t2)&&/Lesson 4 · 2nd time/.test(t2),t2);
 const cB=await nCards();await tap('#alOpen');await tap('#alDone');
 ok('plain done after a repeat advances to 5, count 2',await ev(()=>__N5.AL().cur===5&&__N5.AL().rep['1:4']===2));
 ok('second pass adds nothing new (idempotent)',(await nCards())===cB&&await ev(()=>!(__N5.AL().log[__N5.todayStr()].pw||[]).length));
 await tap('#alUndo');ok('undo after second pass: Lesson 4 · 2nd time again',await ev(()=>__N5.AL().cur===4&&__N5.AL().rep['1:4']===1)&&/2nd time/.test(await p.textContent('#alCard')));
 // settings: toggle + level selector
 await tap('#tabSettings');await p.waitForSelector('#alPAdd');
 ok('settings: add-words switch on by default',await ev(()=>__N5.AL().pAdd===true&&document.querySelector('#alPAdd').classList.contains('on')));
 await tap('#alPAdd');ok('settings: switch off saved',await ev(()=>__N5.AL().pAdd===false));
 await tap('#alPLv [data-lv="2"]');ok('settings: Pimsleur level 2 saved, says no list yet',await ev(()=>__N5.AL().plevel===2&&/no word list for Level 2/.test(document.querySelector('#alPAdd').parentElement.textContent)));
 ok('settings fit 375px',await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 await tap('#alPLv [data-lv="1"]');
 await ev(()=>{__N5.AL().cur=6;});await tap('#tabHome');const c6=await nCards();await tap('#alOpen');await tap('#alDone');
 ok('with the switch off, finishing a lesson adds no words',(await nCards())===c6&&await ev(()=>__N5.AL().cur===7));
 await tap('#alUndo');await tap('#tabSettings');await tap('#alPAdd');await tap('#tabHome');
 // Pimsleur words screen + drills
 await tap('#pimsOpen');await p.waitForSelector('#pmList');
 ok('Pimsleur screen lists 30 lessons with confidence tags',await ev(()=>document.querySelectorAll('#pmList .pmrow').length===30&&document.querySelectorAll('.pmconf').length===30));
 ok('screen shows the unofficial label + sources',/not affiliated with Pimsleur/.test(await p.textContent('#view'))&&/acastano/.test(await ev(()=>document.querySelector('#view').innerHTML)));
 ok('lessons 1–5 marked completed (before current lesson 6)',await ev(()=>JSON.stringify(__N5.pimsCompleted(1).slice(0,5))==='[1,2,3,4,5]'));
 await tap('#pmDrillCur');await p.waitForSelector('#qhost');await p.waitForTimeout(400);
 const inLesson=await ev(()=>{const ids=new Set(__N5.pimsLessonIds(1,6));return __N5.sq&&true;});
 ok('drill this lesson opens a study session',!!(await p.$('#qhost .choice, #qhost input, #qhost button.idk')));
 // IDK stays a miss on a Pimsleur drill
 const idk=await p.$('button.idk:not([disabled]), #giveBtn');
 if(idk){const before=await ev(()=>JSON.stringify(__N5.S().cards));await idk.tap();await p.waitForTimeout(300);
  const miss=await ev(b=>{const o=JSON.parse(b),n=__N5.S().cards;return Object.keys(n).filter(k=>!o[k]||n[k].bad>o[k].bad).map(k=>n[k]);},before);
  ok('IDK in a Pimsleur drill counts as a miss (box 0/1, bad+1)',miss.length===1&&miss[0].box<=1&&miss[0].bad>=1,JSON.stringify(miss));}
 else ok('IDK button present',false);
 await tap('#backBtn');if(await p.$('body.studying'))await tap('#backBtn');
 await p.waitForSelector('#pmList');await tap('#pmDrillAll');await p.waitForSelector('#qhost');
 ok('drill completed lessons opens a session',!!(await p.$('#qhost .choice, #qhost input, #qhost button.idk')));
 await tap('#backBtn');if(await p.$('body.studying'))await tap('#backBtn');await p.waitForSelector('#pmList');
 await tap('#pmList .pmrow[data-n="9"]');await p.waitForSelector('#pmWords');
 ok('lesson page lists its words with source tags',await ev(()=>document.querySelectorAll('#pmWords .row').length===__N5.pimsLessonIds(1,9).length&&!!document.querySelector('.pmsrc')));
 for(const m of ['meaning','reverse','typing','listen','match']){if(!(await p.$(`button.mode[data-m="${m}"]`))){ok(`mode ${m} available`,false);continue;}
  await tap(`button.mode[data-m="${m}"]`);await p.waitForTimeout(500);
  ok(`lesson drill mode works: ${m}`,!!(await p.$(m==='match'?'#view .tile, #view .mcard, #view button':'#qhost .choice, #qhost input')));
  await tap('#backBtn');if(await p.$('body.studying'))await tap('#backBtn');await p.waitForSelector('#pmWords');}
 if(await p.$('#pmAdd')){const cc=await nCards();await tap('#pmAdd');ok('Add to Seen button adds the lesson',(await nCards())>cc);}
 ok('listening uses the Pimsleur audio file',await ev(async()=>{const w=__N5.WORDS[50000];const r=await fetch('audio/'+__N5.wordAudioPath(w));return r.ok&&(await r.arrayBuffer()).byteLength>1000;}));
 // level 2: no list
 await tap('#backBtn');await tap('#pmLv [data-lv="3"]');ok('Level 3 shows "no word list yet"',/No word list for Level 3/.test(await p.textContent('#view')));await tap('#pmLv [data-lv="1"]');
 // Levels tab card + Review section
 await tap('#tabLevels');ok('Levels tab has a Pimsleur card',!!(await p.$('.lvcard[data-lv="pims"]')));
 await tap('.lvcard[data-lv="pims"]');ok('card opens the Pimsleur screen',!!(await p.$('#pmList')));
 await tap('#dueBtn');await p.waitForSelector('[data-review="all"]');ok('Review lists a Pimsleur section',!!(await p.$('[data-key="pm"]')));
 // sync merge rules
 const m=await ev(()=>{const OM={};const o=__N5.mergeStore('AL',{cur:5,rep:{'1:4':1,'1:5':1},padd:{'1:4':[1,2],'1:5':[7]},log:{}},{cur:3,rep:{'1:4':2,'1:3':1},padd:{'1:4':[2,50003],'1:3':[9]},log:{}},{'AL.cur':100},{'AL.cur':200},OM);return o;});
 ok('merge: Pimsleur words-added set is a union',JSON.stringify(m.padd)===JSON.stringify({'1:4':[1,2,50003],'1:5':[7],'1:3':[9]}),JSON.stringify(m.padd));
 ok('merge: repeat counts take the max',JSON.stringify(m.rep)===JSON.stringify({'1:4':2,'1:5':1,'1:3':1}),JSON.stringify(m.rep));
 ok('merge: lesson number = latest change (remote, lower)',m.cur===3);
 const m2=await ev(()=>__N5.mergeStore('AL',{cur:5},{cur:3},{'AL.cur':300},{'AL.cur':200},{}).cur);ok('merge: lesson number = latest change (local)',m2===5);
 const mc=await ev(()=>__N5.mergeCard({box:0,due:1,ok:0,bad:0},{box:3,due:9,ok:4,bad:0,t:5}));ok('merge: an unreviewed Pimsleur card never beats a reviewed copy',mc.box===3&&mc.ok===4);
 ok('backup payload carries rep + padd',await ev(()=>{const p=__N5.buildPayload('backup');const a=p.stores['jlptVocabQuest.audioLesson.v1'];return !!a&&!!a.rep&&!!a.padd;}));
 await tap('#tabLevels');await tap('.lvcard[data-lv="pims"]');await p.waitForSelector('#pmList');ok('no horizontal overflow on Pimsleur screen',await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,500));process.exit(1)});
