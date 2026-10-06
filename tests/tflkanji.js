// Kanji in Flashcards: level deck adds due + new kanji (daily kanji cap), kanji front/back (stroke order, on/kun, meaning,
// examples), grading on the kanji track = previewed FSRS state, undo, directions (EN→JP shows meaning, Listen has no kanji),
// Kanji on/off toggle, Home "All due" + level deck + Review-tab flashcards include kanji. BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<4;i++)cards[i]={box:2,due:now-36e5,ok:3,bad:1,f:{st:2,sp:null,s:4+i,d:5,lr:now-6*D,due:now-36e5}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,newLimit:3,kjLimit:2,pathFocus:'n5',xp:50}));
  const kj=(due)=>({box:2,due,ok:2,bad:0,l:'n5',t:now-6*D,f:{st:2,sp:null,s:5,d:5,lr:now-6*D,due}});
  localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'一':kj(now-36e5),'人':kj(now-36e5),'十':kj(now+5*D)}}));});
 const p=await ctx.newPage();p.setDefaultTimeout(20000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(800);await p.evaluate(()=>__N5.loadLevel('n5'));
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(100);}return false;};
 const JST=()=>ev(()=>JSON.parse(localStorage.getItem('jlptVocabQuest.kanji.v1')).cards);
 // ---- level page flashcards ----
 await ev(()=>__N5.openLevel('n5'));await until(()=>!!document.querySelector('button.mode[data-m="flash"]'));
 await p.locator('button.mode[data-m="flash"]').scrollIntoViewIfNeeded();await p.tap('button.mode[data-m="flash"]');
 ok('level Flashcards opens with kanji loaded',await until(()=>window.__fl&&!!document.querySelector('#flCard')));
 let q=await ev(()=>window.__fl.q.slice());let st0=await JST();
 const J=q.filter(x=>typeof x==='string'&&x.startsWith('j:')).map(x=>x.slice(2)),dueJ=J.filter(c=>st0[c]),newJ=J.filter(c=>!st0[c]);
 ok('queue: due kanji (一 人) included, not-yet-due 十 excluded',dueJ.includes('一')&&dueJ.includes('人')&&!J.includes('十'),JSON.stringify(J));
 ok('queue: exactly 2 new kanji (daily kanji limit 2) from the unlocked batch',newJ.length===2,JSON.stringify(J));
 ok('Kanji on/off button shown (≥44px)',await ev(()=>{const k=document.querySelector('#flKj');return !!k&&k.getBoundingClientRect().height>=43.9&&/Kanji on/.test(k.textContent);}));
 for(let i=0;i<20;i++){const isJ=await ev(()=>{const F=window.__fl,id=F.q[F.pos];return typeof id==='string'&&id.startsWith('j:');});if(isJ)break;await p.tap('#flCard');await W(150);await p.tap('.flg.r3');await W(300);}
 const fr=await ev(()=>{const F=window.__fl,id=F.q[F.pos];const el=document.querySelector('.flkjf');return {id,txt:el&&el.textContent,tag:document.querySelector('.flfront .tag')?.textContent,fs:el&&parseFloat(getComputedStyle(el).fontSize)};});
 ok('kanji front: the character, large, tagged "kanji"',fr.txt===fr.id.slice(2)&&/kanji/.test(fr.tag)&&fr.fs>=56,JSON.stringify(fr));
 await p.screenshot({path:'/workspace/n5-game/shot-flashkanji-front.png'});
 await p.tap('#flCard');
 ok('kanji back: stroke-order SVG plays',await until(()=>!!document.querySelector('#flBackSide #kjSvg svg .kjst'),10000));
 const bk=await ev(()=>{const t=document.querySelector('#flBackSide').innerText;return {on:/ON/.test(t),kun:/KUN/.test(t),ex:document.querySelectorAll('#flBackSide .kjexrow').length,rep:!!document.querySelector('#kjReplay'),mean:document.querySelector('#flBackSide .kjmean')?.textContent};});
 ok('kanji back: meaning, ON/KUN readings, replay + example words',bk.on&&bk.kun&&!!bk.mean&&bk.rep&&bk.ex>=1,JSON.stringify(bk));
 ok('kanji back fits 375px',await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 await W(1200);await p.evaluate(()=>document.querySelector('#flBackSide').scrollIntoView({block:'start'}));await p.screenshot({path:'/workspace/n5-game/shot-flashkanji-back.png'});
 const g=await ev(()=>{const F=window.__fl,id=F.q[F.pos];return {id,p:F.prev[3],nw:JSON.stringify(__N5.S().cards),before:JSON.parse(localStorage.getItem('jlptVocabQuest.kanji.v1')).cards[id.slice(2)]||null};});
 await p.tap('.flg.r3');await W(400);
 const after=(await JST())[g.id.slice(2)];
 ok('Good on a kanji writes the previewed FSRS state to the kanji track',after&&after.f.due===g.p.due&&after.f.s===g.p.s&&after.f.d===g.p.d&&after.l==='n5',JSON.stringify([after&&after.f,g.p]));
 ok('kanji grade does not touch word cards',await ev(nw=>JSON.stringify(__N5.S().cards)===nw,g.nw));
 await p.tap('#flUndo');await W(400);
 const un=(await JST())[g.id.slice(2)]||null;
 ok('undo restores the kanji card exactly',JSON.stringify(un)===JSON.stringify(g.before),JSON.stringify([un,g.before]));
 for(let i=0;i<40;i++){if(await ev(()=>!!document.querySelector('#flDoneCard')))break;await p.tap('#flCard');await W(150);await p.tap('.flg.r3');await W(300);}
 const js=Object.keys(await JST());
 ok('session done: 2 new kanji learned (cap), now 5 kanji on the kanji track',await ev(()=>!!document.querySelector('#flDoneCard'))&&js.length===5,JSON.stringify(js));
 await ev(()=>__N5.openLevel('n5'));await until(()=>!!document.querySelector('button.mode[data-m="flash"]'));await p.tap('button.mode[data-m="flash"]');await W(800);
 q=await ev(()=>window.__fl?window.__fl.q.slice():[]);const st1=await JST();
 ok('kanji cap reached → no new kanji offered',q.filter(x=>typeof x==='string'&&x.startsWith('j:')&&!st1[x.slice(2)]).length===0,JSON.stringify(q));
 // make every kanji due, reload
 await ev(()=>{const st=JSON.parse(localStorage.getItem('jlptVocabQuest.kanji.v1')).cards;for(const c in st){st[c].due=Date.now()-1000;st[c].f.due=Date.now()-1000;}localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:st}));});
 await p.reload();await p.waitForSelector('.tabbar');await W(600);await ev(()=>__N5.loadLevel('n5'));
 // toggle off/on
 await ev(()=>__N5.openLevel('n5'));await until(()=>!!document.querySelector('button.mode[data-m="flash"]'));await p.tap('button.mode[data-m="flash"]');await until(()=>!!document.querySelector('#flKj'));
 const nJ=await ev(()=>window.__fl.q.filter(x=>typeof x==='string'&&x.startsWith('j:')).length);
 await ev(()=>{window.__fl=null;});await p.tap('#flKj');await until(()=>document.querySelector('#flKj')?.getAttribute('aria-pressed')==='false');
 const off=await ev(()=>({n:window.__fl?window.__fl.q.filter(x=>typeof x==='string'&&x.startsWith('j:')).length:0,s:__N5.S().flKanji,t:document.querySelector('#flKj').textContent}));
 ok('"字 Kanji off" removes kanji from the deck',nJ>=5&&off.n===0&&off.s===false&&/off/.test(off.t),JSON.stringify({nJ,off}));
 await p.tap('#flKj');await until(()=>document.querySelector('#flKj')?.getAttribute('aria-pressed')==='true');
 ok('"字 Kanji on" brings them back',await ev(()=>window.__fl.q.filter(x=>typeof x==='string'&&x.startsWith('j:')).length>=5&&__N5.S().flKanji===true));
 // directions
 await ev(async()=>{const N=__N5;N.S().flashDir='en';N.go(()=>N.flashcards(['j:一','j:人'],'T',N.home,{dueOnly:true}));});await W(400);
 const en=await ev(()=>({t:document.querySelector('.flfront')?.innerText||'',kj:!!document.querySelector('.flkjf'),q:window.__fl.q}));
 ok('EN→JP: kanji front shows the meaning (not the character)',!en.kj&&/kanji/.test(en.t)&&!/[一人]/.test(en.t),JSON.stringify(en));
 await ev(async()=>{const N=__N5;N.S().flashDir='listen';N.go(()=>N.flashcards([0,1,2,'j:一','j:人'],'T',N.home,{}));});await W(400);
 ok('Listen direction: no kanji cards',await ev(()=>!window.__fl||window.__fl.q.every(x=>!(typeof x==='string'&&x.startsWith('j:')))));
 await ev(()=>{__N5.S().flashDir='jp';});
 // Home: All due includes kanji
 await ev(()=>{__N5.S().flHome='all';__N5.go(__N5.home);});await until(()=>!!document.querySelector('#flHomeGo:not([disabled])'));
 const hd=await ev(()=>({due:+document.querySelector('#flHomeDue').textContent,total:__N5.totalDue()}));
 ok('Home "All due" count includes kanji (= total due)',hd.due===hd.total&&hd.due>=5,JSON.stringify(hd));
 await p.locator('#flHome').scrollIntoViewIfNeeded();await p.screenshot({path:'/workspace/n5-game/shot-flashkanji-home.png'});
 await p.tap('#flHomeGo');await until(()=>window.__fl&&!!document.querySelector('#flCard'));
 ok('Home "All due" deck contains the due kanji',await ev(()=>window.__fl.q.filter(x=>typeof x==='string'&&x.startsWith('j:')).length===5));
 await ev(()=>{const S=__N5.S();S.newLogK={};S.flHome='path';__N5.go(__N5.home);});await until(()=>!!document.querySelector('#flHomeNewK'),8000);
 ok('Home level deck lists new kanji separately',await ev(()=>+document.querySelector('#flHomeNewK')?.textContent===2));
 await ev(()=>__N5.go(__N5.dueView));await until(()=>!!document.querySelector('#dueFlash'));await p.tap('#dueFlash');await until(()=>window.__fl&&!!document.querySelector('#flCard'));
 ok('Review tab "due as flashcards" includes kanji',await ev(()=>window.__fl.q.some(x=>typeof x==='string'&&x.startsWith('j:'))));
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} tflkanji ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
