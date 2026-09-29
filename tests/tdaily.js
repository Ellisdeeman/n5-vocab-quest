// Today's session + level pages + Due Reviews regression test. BROWSER=chromium|webkit URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'chromium';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.clock.install({time:new Date('2026-09-29T21:00:00-04:00')});
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(800);await p.clock.pauseAt(new Date('2026-09-29T21:00:30-04:00'));
 const ev=f=>p.evaluate(f);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};
 const title=async()=>p.evaluate(()=>{const e=document.querySelector('.largetitle')||document.querySelector('.topbar b');return e?e.textContent.trim():''});
 const answerAll=async(max=120)=>{for(let i=0;i<max;i++){if(await p.$('#dueBack, #homeBtn, #homeBtn2'))return i;
   const idk=await p.$('button.idk:not([disabled])'),give=await p.$('#giveBtn:not([disabled])');if(idk)await idk.tap();else if(give)await give.tap();else return -1;
   await p.waitForSelector('#nextBtn');await p.tap('#nextBtn');await p.waitForTimeout(60);}return -2;};
 const answerN=async n=>{for(let i=0;i<n;i++){const idk=await p.$('button.idk:not([disabled])'),give=await p.$('#giveBtn:not([disabled])');if(idk)await idk.tap();else await give.tap();await p.waitForSelector('#nextBtn');await p.tap('#nextBtn');await p.waitForTimeout(60);}};
 // A: N5 chip on Home opens the N5 level page with a working Today's session button (touch taps)
 await tap('.lvgrid .lvcard[data-lv=n5]');
 ok('home N5 chip opens N5 level page',(await title()).includes('N5')&&!!(await p.$('#dailyBtn')),await title());
 await tap('#dailyBtn');
 ok('level page Today\'s session starts',(await p.textContent('.topbar b')).includes("Today's session")&&!!(await p.$('#qhost .choices, #qhost #typein')));
 await answerN(3);await tap('#backBtn');
 ok('back returns to N5 level page',(await title()).includes('N5'));
 ok('shows Continue with progress 3',(await p.textContent('#dailyBtn')).includes('Continue')&&(await ev(()=>__N5.dailies().n5.pos))===3,await p.textContent('#dailyBtn'));
 // B: N4 level page from Levels tab; independent session
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n4]');await p.waitForFunction(()=>document.querySelector('.largetitle')&&/N4/.test(document.querySelector('.largetitle').textContent),null,{timeout:15000});
 ok('Levels tab N4 row opens N4 page',true);
 await tap('#dailyBtn');await answerN(2);
 const d4=await ev(()=>{const D=__N5.dailies().n4;return {pos:D.pos,all:D.items.every(it=>it.id>=10000&&it.id<20000),n:D.items.length}});
 ok('N4 session only N4 words',d4.all&&d4.pos===2,JSON.stringify(d4));
 await tap('#backBtn');await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');
 ok('N5 session progress preserved after N4',(await ev(()=>__N5.dailies().n5.pos))===3&&(await p.textContent('#dailyBtn')).includes('Continue'));
 // C: Mixed via checkbox
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n4] .lvchk');
 ok('checkbox combines (no page open)',JSON.stringify(await ev(()=>__N5.activeLevels()))==='["n5","n4"]'&&(await title())==='Levels');
 await tap('#tabHome');const dm=await ev(()=>{const D=__N5.ensureDaily('n5,n4');return D?{n:D.items.length,lv:[...new Set(D.items.map(i=>i.id<10000?'n5':'n4'))]}:null});
 ok('mixed-selection session built from both levels',dm&&dm.lv.length===2,JSON.stringify(dm));
 ok('home Today\'s session is the guided path',!!(await p.$('.pathbar'))&&!!(await ev(()=>__N5.dailies().path)));
 // D: Due Reviews counts & sessions
 await ev(()=>{const S=__N5.S(),now=Date.now();for(let i=100;i<106;i++)S.cards[i]={box:2,due:now-5000,ok:2,bad:0};for(let i=10100;i<10103;i++)S.cards[i]={box:2,due:now-5000,ok:2,bad:0};const K=__N5.KS();['あ','い'].forEach(k=>K.cards[k]={box:2,due:now-5000,ok:2,bad:0});});
 await tap('#dueBtn');await p.waitForSelector('.duerow[data-key=n5]');
 const cnt=async k=>p.evaluate(k=>{const r=document.querySelector(`.duerow[data-key="${k}"] .duen`);return r?+r.textContent:0},k);
 const exp=await ev(()=>{const now=Date.now(),S=__N5.S(),K=__N5.KS();const c=(lo)=>Object.keys(S.cards).filter(k=>+k>=lo&&+k<lo+10000&&S.cards[k].due<=now).length;return {n5:c(0),n4:c(10000),kh:Object.keys(K.cards).filter(k=>K.cards[k].due<=now&&/[\u3041-\u3096]/.test(k)).length}});
 ok('due counts match state',await cnt('n5')===exp.n5&&await cnt('n4')===exp.n4&&await cnt('kana:h')===exp.kh,JSON.stringify([await cnt('n5'),await cnt('n4'),await cnt('kana:h'),exp]));
 const badge=async()=>+(await p.textContent('#dueBadge')||0);
 ok('badge = total due',await badge()===(await ev(()=>__N5.totalDue())),''+await badge());
 await tap('[data-review=n4]');
 const n4only=await p.textContent('.topbar b');const nq=await answerAll();
 ok('N4 due session ran to the end',nq>0&&!!(await p.$('#dueBack')),`${n4only} q=${nq}`);
 await tap('#dueBack');await p.waitForSelector('.duerow[data-key=n4]');
 ok('N4 due cleared after answering (incl. I don\'t know)',await cnt('n4')===0);
 ok('badge updated',await badge()===(await ev(()=>__N5.totalDue())));
 await tap('[data-review="kana:h"]');const kq=await answerAll();ok('kana due session finished',kq>0);await tap('#dueBack');await p.waitForSelector('.duerow');
 ok('kana h cleared',await cnt('kana:h')===0);
 // E: daily skips reviews already done in Due Reviews
 await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');
 await ev(()=>{const S=__N5.S(),now=Date.now();for(let i=200;i<206;i++)S.cards[i]={box:2,due:now-5000,ok:2,bad:0};});
 await tap('#dailyBtn');await tap('#backBtn');   // (progress 3 → session already in progress: new due words not in it — fine)
 // fresh untouched session for a new selection picks up the due words
 await tap('.lvlist .lvcard[data-lv=n5]').catch(()=>{});
 await ev(()=>{delete __N5.S().dailies.n5;});await tap('#tabLevels');await tap('.lvlist .lvcard[data-lv=n5]');
 const revIds=await ev(()=>__N5.dailies().n5.items.filter(i=>i.rev).map(i=>i.id));
 ok('untouched daily contains due reviews',revIds.length>0,revIds.length+'');
 await tap('[data-review=n5]');await answerAll();await tap('#dueBack');   // due list cleared elsewhere, then back to level page
 ok('due review from level page returns to level page',(await title()).includes('N5'));
 await tap('#dailyBtn');const left=await ev(()=>{const D=__N5.dailies().n5,now=Date.now();return D.items.slice(D.pos).filter(i=>i.rev&&__N5.card(i.id).due>now).length});
 ok('daily no longer contains stale (already reviewed) items',left===0,''+left);
 const dq=await answerAll(200);
 ok('daily finishes: Done card',!!(await p.$('#homeBtn')),'q='+dq);
 ok('dailyHistory + streak',await ev(()=>!!__N5.S().dailyHistory[__N5.todayStr()]&&__N5.S().streak>=1));
 await tap('#homeBtn');ok('Done → level page',(await title()).includes('N5'));
 ok('hero shows done / Extra practice',(await p.textContent('#dailyBtn')).includes('Extra'));
 await tap('#dailyBtn');ok('extra practice starts',!!(await p.$('#qhost .choices, #qhost #typein')));await tap('#backBtn');
 // resume after reload
 await p.reload();await p.waitForTimeout(700);ok('done state persists after reload',(await ev(()=>__N5.dailies().n5.done))===true);
 // F: local-midnight rollover (21:00 EDT = 01:00Z next day already; now go to 00:00:30 local Sep 30)
 ok('today is local date',(await ev(()=>__N5.todayStr()))==='2026-09-29');
 await p.clock.setSystemTime(new Date('2026-09-30T00:00:30-04:00'));await p.clock.runFor(2000);
 await tap('#tabHome');const nd=await ev(()=>{const D=__N5.ensureDaily();return {date:D.date,done:D.done,pos:D.pos}});
 ok('new day → fresh session',nd.date==='2026-09-30'&&!nd.done&&nd.pos===0,JSON.stringify(nd));
 ok('home hero Start after midnight',(await p.textContent('#dailyBtn')).includes('Start'));
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,400));process.exit(1)});
