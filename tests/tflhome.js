// Home "Flashcards" card: present (54px), launches the guided-path level deck (due first, then new within the daily cap),
// shows due / new counts, level switcher (other levels / Kana / All due), keeps the direction setting; Kana stage deck grades kana FSRS.
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const mk=async seed=>{const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(()=>{window.__plays=[];const op=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__plays.push(this.src||'');return op.call(this);};if(window.speechSynthesis){const os=speechSynthesis.speak.bind(speechSynthesis);speechSynthesis.speak=u=>{window.__plays.push('tts:'+u.text);try{os(u);}catch(e){}};}});await ctx.addInitScript(seed);const p=await ctx.newPage();p.setDefaultTimeout(15000);p.errs=[];p.on('pageerror',e=>p.errs.push(''+e));
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(900);return p;};
 let p=await mk(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<12;i++)cards[i]={box:2,due:now-36e5,ok:3,bad:1,f:{st:2,sp:null,s:4+i,d:5,lr:now-6*D,due:now-36e5}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,unlockAll:true,newLimit:3,flKanji:false,pathFocus:'n5',xp:50}));
  localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:2,due:now-36e5,ok:3,bad:0,f:{st:2,sp:null,s:5,d:5,lr:now-6*D,due:now-36e5}}}}));});
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(100);}return false;};
 const home=async()=>{await ev(()=>__N5.go(__N5.home));return until(()=>!!document.querySelector('#flHome #flHomeGo:not([disabled])'));};
 const info=()=>ev(()=>{const g=document.querySelector('#flHomeGo'),r=g.getBoundingClientRect();return {due:+document.querySelector('#flHomeDue').textContent,nw:+document.querySelector('#flHomeNew').textContent,sub:document.querySelector('#flHomeSub').textContent,
   on:document.querySelector('#flHomeLv button.on').textContent,chips:[...document.querySelectorAll('#flHomeLv button')].map(b=>b.dataset.fl),h:r.height,btn:g.textContent,dir:document.querySelector('#flHomeDir').textContent,
   chipH:Math.min(...[...document.querySelectorAll('#flHomeLv button')].map(b=>b.getBoundingClientRect().height)),after:!!document.querySelector('.hero + .flhome')};});
 ok('Home shows the Flashcards card',await home());
 let I=await info();
 ok("card defaults to the guided-path level (N5) and sits under Today's session",I.on.includes('N5')&&I.after,JSON.stringify(I));
 ok('Study button >=54px, chips >=44px',I.h>=53.9&&I.chipH>=43.9,JSON.stringify([I.h,I.chipH]));
 ok('shows due count (12) and new words within the cap (3, "3 of 3 left")',I.due===12&&I.nw===3&&/3 of 3 new words left today/.test(I.sub)&&/Study 15 cards/.test(I.btn),JSON.stringify(I));
 ok('switcher offers Kana (has kana cards) and All due',I.chips.includes('kana')&&I.chips.includes('all'),JSON.stringify(I.chips));
 ok('direction shown (JP -> EN)',/JP/.test(I.dir)&&I.dir.indexOf('JP')<I.dir.indexOf('EN'));
 await p.tap('#flHomeLv button[data-fl="all"]');await W(300);I=await info();
 ok('All due: 12 words + 1 kana due, no new',I.due===13&&I.nw===0,JSON.stringify(I));
 await p.tap('#flHomeGo');await until(()=>window.__fl&&document.querySelector('#flCard'));
 let q=await ev(()=>window.__fl.q.slice());
 ok('All due launches the due-only deck (incl. kana)',q.length===13&&q.includes('k:あ')&&q.filter(x=>typeof x==='number').every(id=>id<12),JSON.stringify(q));
 await home();I=await info();ok('selection persists (All due)',I.on==='All due');
 await p.tap('#flHomeLv button[data-fl="kana"]');await W(300);I=await info();
 ok('Kana deck: 1 due + new kana, kana-exempt note',I.due===1&&I.nw>0&&/don't count/.test(I.sub),JSON.stringify(I));
 await p.tap('#flHomeLv button[data-fl="path"]');await W(300);
 await ev(()=>{window.__fl=null;});await p.tap('#flHomeGo');await until(()=>window.__fl&&document.querySelector('#flCard'));
 q=await ev(()=>window.__fl.q.slice());const t=await ev(()=>document.querySelector('#view').innerText.slice(0,120));
 const nNew=await ev(q=>q.filter(id=>!__N5.S().cards[id]).length,q);
 ok('path deck: 12 due first, then exactly 3 new N5 words',q.length===15&&q.slice(0,12).every(id=>id<12)&&nNew===3&&await ev(q=>q.every(id=>__N5.WORDS[id]&&id<10000),q),JSON.stringify({q,nNew}));
 ok('titled with the level',/N5/.test(t),t);
 for(let i=0;i<50;i++){if(await ev(()=>!!document.querySelector('#flDoneCard')))break;await p.tap('#flCard');await W(120);await p.tap('.flg.r3');await W(260);}
 ok('graded through: cap respected (3 new today, 15 cards)',await ev(()=>!!document.querySelector('#flDoneCard')&&__N5.newToday().length===3&&Object.keys(__N5.S().cards).length===15));
 await p.tap('#flDone');await until(()=>!!document.querySelector('#flHomeGo:not([disabled])'));I=await info();
 ok('Done returns Home; card now shows 0 new and "0 of 3 left"',I.nw===0&&/0 of 3 new words left/.test(I.sub),JSON.stringify(I));
 await p.tap('#flHomeGo');await W(500);
 const capd=await ev(()=>!!document.querySelector('#capRaise')||/Nothing due/.test(document.querySelector('#qhost')?.textContent||''));
 ok('at the cap with nothing due: launch shows the limit / nothing-due card, no new words',capd&&await ev(()=>__N5.newToday().length===3));
 await ev(()=>{__N5.S().flashDir='en';});await home();I=await info();ok('direction setting reflected on Home (EN -> JP)',I.dir.indexOf('EN')<I.dir.indexOf('JP'),I.dir);
 await ev(()=>{const c=__N5.S().cards[0];c.f.due=c.due=Date.now()-1e3;});await home();await p.tap('#flHomeGo');await until(()=>!!document.querySelector('#flCard'));
 ok('launch keeps the direction (EN -> JP front)',await ev(()=>document.querySelector('#flDir button.on').dataset.d==='en'&&!!document.querySelector('.flen')));
 ok('no page errors (A)',!p.errs.length,p.errs.join('|'));
 await p.context().close();
 p=await mk(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5;
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:{},levels:['n5'],newLimit:3,pathFocus:'kana',autoSpeak:true,xp:5}));
  const kc=(s)=>({box:2,due:now-36e5,ok:3,bad:0,f:{st:2,sp:null,s,d:5,lr:now-6*D,due:now-36e5}});
  localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':kc(5),'い':kc(6)}}));});
 ok('Kana stage: Home card shows',await home());I=await info();
 ok('Kana stage: deck = Kana with 2 due + new kana',I.on.includes('Kana')&&I.due===2&&I.nw>0,JSON.stringify(I));
 await p.tap('#flHomeGo');await until(()=>window.__fl&&document.querySelector('#flCard'));
 q=await ev(()=>window.__fl.q.slice());
 ok('Kana deck: due kana first, then new kana (no words)',q.slice(0,2).sort().join()==='k:あ,k:い'&&q.every(x=>typeof x==='string'&&x.startsWith('k:'))&&q.length>2,JSON.stringify(q));
 await W(500);
 let fa=await ev(()=>({spk:!!document.querySelector('#flSpk'),plays:window.__plays.slice()}));
 ok('kana JP->EN front: no audio button and no autoplay (autoSpeak on)',!fa.spk&&!fa.plays.length,JSON.stringify(fa));
 await p.tap('#flCard');await W(300);
 fa=await ev(()=>({bs:!!document.querySelector('#flBackSpk'),h:document.querySelector('#flBackSpk')?.getBoundingClientRect().height,plays:window.__plays.slice()}));
 ok('kana back: audio plays on flip and a back audio button (>=54px) is shown',fa.bs&&fa.h>=53.9&&fa.plays.some(x=>/\/k\/|tts:/.test(x)),JSON.stringify(fa));
 await ev(()=>{window.__plays=[];});await p.tap('#flBackSpk');await W(200);
 ok('back audio button plays the kana',await ev(()=>window.__plays.length>0));
 let g=await ev(()=>{const F=window.__fl,now=Date.now();return {id:F.q[F.pos],p:F.prev[3],btn:[...document.querySelectorAll('.flg small')].map(s=>s.textContent),exp:[1,2,3,4].map(r=>__N5.flIvl(F.prev[r].due-now)),back:document.querySelector('.flmean').textContent};});
 ok('kana back shows romaji; labels match previews',/^[a-z]/.test(g.back.trim())&&JSON.stringify(g.btn)===JSON.stringify(g.exp),JSON.stringify(g));
 const kb=await ev(id=>JSON.stringify(__N5.KS().cards[id.slice(2)]),g.id);
 await p.tap('.flg.r3');await W(400);
 let kc=await ev(id=>__N5.KS().cards[id.slice(2)],g.id);
 ok('Good writes the previewed FSRS state to the kana card',kc.f.due===g.p.due&&kc.f.s===g.p.s&&kc.rt===3,JSON.stringify([kc.f,g.p]));
 await p.tap('#flUndo');await W(300);
 ok('Undo restores the kana card exactly',await ev(([id,s])=>JSON.stringify(__N5.KS().cards[id.slice(2)])===s&&window.__fl.q[window.__fl.pos]===id,[g.id,kb]));
 for(let i=0;i<4;i++){await p.tap('.flg.r3').catch(()=>{});await W(260);await p.tap('#flCard').catch(()=>{});await W(150);}
 ok('new kana graded without counting toward the new-word limit',await ev(()=>Object.keys(__N5.KS().cards).length>2&&__N5.newToday().length===0));
 for(const d of ['en','listen']){await ev(d=>{__N5.S().flashDir=d;window.__plays=[];__N5.go(()=>__N5.flashcards(__N5.flKanaPool(),'K',__N5.home));},d);await W(600);
  fa=await ev(()=>({id:window.__fl.q[window.__fl.pos],spk:!!document.querySelector('#flSpk'),en:!!document.querySelector('.flen'),plays:window.__plays.slice()}));
  if(d==='en')ok('kana EN->JP (romaji front): no audio button and no autoplay',fa.id.startsWith('k:')&&fa.en&&!fa.spk&&!fa.plays.length,JSON.stringify(fa));
  else ok('kana Listening keeps the audio-only front (button + autoplay)',fa.id.startsWith('k:')&&fa.spk&&fa.plays.length>0,JSON.stringify(fa));}
 await p.tap('#flShow');await W(300);ok('Listening: back side has the character and audio button',await ev(()=>!!document.querySelector('#flBackSpk')&&/\S/.test(document.querySelector('.flword2').textContent)));
 ok('no page errors (B)',!p.errs.length,p.errs.join('|'));
 await b.close();const n=R.filter(Boolean).length;console.log(`SUMMARY ${BR} tflhome ${n}/${R.length} passed`);process.exit(n===R.length?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
