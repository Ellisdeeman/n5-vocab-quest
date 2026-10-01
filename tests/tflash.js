// Flashcards: flip, Again/Hard/Good/Easy with FSRS interval labels that match what is saved, swipe, undo, keyboard,
// daily new-word cap, directions (JP→EN / EN→JP / listening track), summary with next reviews; "Back in …" line after grading.
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<12;i++)cards[i]={box:2,due:now-36e5,ok:3,bad:1,lapses:i%3,f:{st:2,sp:null,s:4+i,d:4+i%5,lr:now-6*D,due:now-36e5}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,unlockAll:true,newLimit:3,xp:50}));});
 const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(900);await p.evaluate(()=>__N5.loadLevel('n5'));
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=6000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(80);}return false;};
 // entry points
 await ev(()=>__N5.openLevel('n5'));await until(()=>!!document.querySelector('button.mode[data-m="flash"]'));
 ok('level page has a Flashcards mode',await ev(()=>!!document.querySelector('button.mode[data-m="flash"]')));
 await ev(()=>__N5.go(__N5.dueView));await W(300);ok('Review tab offers "Due words as flashcards"',await ev(()=>!!document.querySelector('#dueFlash')));
 await ev(()=>__N5.go(__N5.home));await W(500);ok("Today's session offers flashcards",await until(()=>!!document.querySelector('#dailyFlash')));
 await ev(()=>__N5.go(()=>__N5.flashcards(__N5.LV.n5.ids,'🃏 Test',__N5.home)));await W(300);
 const q=await ev(()=>window.__fl.q.slice());const nNew=await ev(q=>q.filter(id=>!__N5.S().cards[id]).length,q);
 ok('queue: due words first, then new words within the daily cap (3)',q.length===15&&q.slice(0,12).every(id=>id<12)&&nNew===3,JSON.stringify({len:q.length,nNew}));
 // flip by tap → 4 buttons with labels = saved results
 await p.tap('#flCard');await W(200);
 const lab=await ev(()=>{const F=window.__fl,now=Date.now();return {btn:[...document.querySelectorAll('.flg')].map(b=>b.querySelector('small').textContent),exp:[1,2,3,4].map(r=>__N5.flIvl(F.prev[r].due-now)),h:Math.min(...[...document.querySelectorAll('.flg')].map(b=>b.getBoundingClientRect().height)),back:!document.querySelector('#flBackSide').hidden&&/\S/.test(document.querySelector('.flmean').textContent)};});
 ok('flip shows the back (reading, meaning)',lab.back);
 ok('grade buttons labelled with predicted intervals, ≥54px',JSON.stringify(lab.btn)===JSON.stringify(lab.exp)&&lab.h>=54,JSON.stringify(lab));
 const chk=await ev(()=>{const F=window.__fl,id=F.q[F.pos],c=__N5.S().cards[id],now=Date.now(),cfg=Object.assign({},__N5.fCfg(),{fuzz:false});
   const ref=[1,2,3,4].map(r=>__N5.fsrsNextT(c.f,r,now,cfg));return [1,2,3,4].every(r=>Math.abs(F.prev[r].s-ref[r-1].s)<1e-9&&Math.abs(F.prev[r].d-ref[r-1].d)<1e-9&&F.prev[r].st===ref[r-1].st)&&F.prev[4].due>=F.prev[3].due&&F.prev[3].due>=F.prev[2].due;});
 ok('previews = FSRS scheduler (stability/difficulty/state), ordered Hard ≤ Good ≤ Easy',chk);
 let g=await ev(()=>{const F=window.__fl;return {id:F.q[F.pos],p:F.prev[3]};});
 await p.tap('.flg.r3');await W(400);
 let c=await ev(id=>__N5.S().cards[id],g.id);
 ok('Good writes exactly the previewed FSRS state (reading track)',c.f.due===g.p.due&&c.f.s===g.p.s&&c.f.d===g.p.d&&c.rt===3,JSON.stringify([c.f,g.p]));
 // keyboard: Space flips, 2 = Hard
 await p.keyboard.press('Space');await W(200);g=await ev(()=>{const F=window.__fl;return {id:F.q[F.pos],p:F.prev[2]};});
 await p.keyboard.press('2');await W(400);c=await ev(id=>__N5.S().cards[id],g.id);
 ok('keyboard: Space flips, 2 = Hard',c.rt===2&&c.f.due===g.p.due);
 // swipe helpers
 const swipe=async(dx,dy)=>{const bx=await p.$eval('#flCard',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
   await p.mouse.move(bx.x,bx.y);await p.mouse.down();for(let k=1;k<=6;k++){await p.mouse.move(bx.x+dx*k/6,bx.y+dy*k/6);await W(16);}
   const stamp=await ev(()=>document.querySelector('#flStamp').textContent);await p.mouse.up();await W(400);return stamp;};
 await p.tap('#flCard');await W(200);g=await ev(()=>{const F=window.__fl,id=F.q[F.pos];return {id,lap:__N5.S().cards[id].lapses||0,p:F.prev[1]};});
 let st=await swipe(-150,0);c=await ev(id=>__N5.S().cards[id],g.id);
 ok('swipe left = Again (stamp shown, relearning, lapse +1, previewed due)',st==='Again'&&c.rt===1&&c.f.st===3&&(c.lapses||0)===g.lap+1&&c.f.due===g.p.due,JSON.stringify({st,rt:c.rt,f:c.f}));
 ok('Again comes back later this session',await ev(id=>window.__fl.q.slice(window.__fl.pos).includes(id),g.id));
 await p.tap('#flCard');await W(200);g=await ev(()=>{const F=window.__fl;return {id:F.q[F.pos]};});st=await swipe(150,0);
 ok('swipe right = Good',st==='Good'&&(await ev(id=>__N5.S().cards[id].rt,g.id))===3);
 await p.tap('#flCard');await W(200);const before=await ev(()=>{const F=window.__fl,id=F.q[F.pos];return {id,c:JSON.stringify(__N5.S().cards[id]),pos:F.pos,done:F.done};});
 st=await swipe(0,-160);ok('swipe up = Easy',st==='Easy'&&(await ev(id=>__N5.S().cards[id].rt,before.id))===4);
 // undo
 await p.tap('#flUndo');await W(300);
 const u=await ev(b=>{const F=window.__fl;return {same:JSON.stringify(__N5.S().cards[b.id])===b.c,pos:F.pos===b.pos,done:F.done===b.done,flipped:F.flipped,cur:F.q[F.pos]===b.id};},before);
 ok('Undo restores the card exactly and shows it again',u.same&&u.pos&&u.done&&u.flipped&&u.cur,JSON.stringify(u));
 await p.tap('.flg.r3');await W(400);
 // run through the rest with Good, counting new words introduced
 for(let i=0;i<40;i++){if(await ev(()=>!!document.querySelector('#flDoneCard')))break;await p.tap('#flCard');await W(120);await p.tap('.flg.r3');await W(260);}
 ok('summary: done screen with next-review list',await ev(()=>!!document.querySelector('#flDoneCard')&&document.querySelectorAll('#flDoneCard .nextrev li').length>=12));
 ok('daily cap respected: exactly 3 new words',await ev(()=>__N5.newToday().length===3&&Object.keys(__N5.S().cards).length===15));
 await p.tap('#flDoneCard .nextrev li[data-wid]');await W(300);ok('next-review rows open the word detail',await ev(()=>!!document.querySelector('.modal')));
 await ev(()=>document.querySelectorAll('.modal').forEach(m=>m.remove()));
 // capped: only new words left → capped card
 await ev(()=>__N5.go(()=>__N5.flashcards(__N5.LV.n5.ids.slice(100,140),'t',__N5.home)));await W(300);ok('flashcards on new words after the cap: capped card',await ev(()=>!!document.querySelector('#capCard')));
 // directions
 await ev(()=>{const S=__N5.S(),now=Date.now();for(let i=0;i<12;i++){S.cards[i].f.due=now-6e4;S.cards[i].due=now-6e4;}});
 await ev(()=>__N5.go(()=>__N5.flashcards(__N5.LV.n5.ids.slice(0,12),'t',__N5.home)));await W(300);
 await p.tap('#flDir [data-d="en"]');await W(300);ok('EN→JP: front shows the meaning',await ev(()=>__N5.S().flashDir==='en'&&!!document.querySelector('.flfront .flen')&&!document.querySelector('.flfront .flword')));
 await p.tap('#flDir [data-d="listen"]');await W(300);
 ok('Listening: audio-only front',await ev(()=>__N5.S().flashDir==='listen'&&!!document.querySelector('.flfront #flSpk.bigspk')&&!document.querySelector('.flfront .flword, .flfront .flen')));
 g=await ev(()=>{const F=window.__fl,id=F.q[F.pos];return {id,f:JSON.stringify(__N5.S().cards[id].f)};});
 await p.tap('#flShow');await W(200);await p.tap('.flg.r3');await W(400);c=await ev(id=>__N5.S().cards[id],g.id);
 {const f0=JSON.parse(g.f);ok('Listening grades the listening track (reading track memory untouched; due reading review waits for tomorrow)',!!c.L&&c.L.st>=1&&c.f.s===f0.s&&c.f.d===f0.d&&c.f.st===f0.st&&c.f.lr===f0.lr,JSON.stringify([c.L,c.f,f0]));}
 await ev(()=>{__N5.S().flashDir='jp';});
 // "Back in …" line after a normal graded answer + backIn wording
 await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.LV.n5.ids.slice(0,12),'t')));await W(300);await p.tap('#qhost .choice');await W(300);
 ok('graded answer shows "Back in …" with the grade label',await ev(()=>{const n=document.querySelector('#fb .schednote');return !!n&&/Back (in|tomorrow|now)/.test(n.textContent)&&/Again|Hard|Good|Easy/.test(n.querySelector('.rtag').textContent);}),await ev(()=>document.querySelector('#fb')?.innerText));
 const bi=await ev(()=>{const now=new Date('2026-09-30T10:00:00-04:00').getTime(),m=6e4,D=864e5;return [__N5.backIn(now+10*m,now),__N5.backIn(now+20*36e5,now),__N5.backIn(now+4*D,now),__N5.backIn(now+62*D,now),__N5.backIn(now+3*36e5,now)];});
 ok('backIn wording: 10 min / tomorrow / 4 days / ~2 mo / hours',JSON.stringify(bi)===JSON.stringify(['Back in 10 min','Back tomorrow','Back in 4 days','Back in ~2 mo','Back in 3 h']),JSON.stringify(bi));
 ok('no horizontal overflow at 375px',await ev(()=>document.documentElement.scrollWidth<=375));
 ok('no page errors',!errs.length,errs.join(' | '));
 await b.close();const pass=R.filter(Boolean).length;console.log(`SUMMARY ${BR} tflash ${pass}/${R.length} passed`);process.exit(pass===R.length?0:1);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1);});
