// Guided path (Home Today's session) test. BROWSER=chromium|webkit URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'chromium';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 // existing N5 learner: 300 N5 cards (100 mastered), 8 due; no kana progress
 await p.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};for(let i=0;i<300;i++)cards[i]={box:i<100?5:2,due:i<8?now-1000:now+864e5,ok:3,bad:0};localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,xp:500,streak:3,lastDay:'',levels:['n5'],daily:{date:'2020-01-01',items:[],pos:0}}));});
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(1200);
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(200);};
 let ps=await ev(()=>__N5.pathState());ok('existing N5 learner without kana → path at Kana',ps.cur==='kana',JSON.stringify(ps));
 ok('home shows path bar',(await p.textContent('.pathtxt')).includes('Path: Kana'),await p.textContent('.pathtxt'));
 let D=await ev(()=>__N5.dailies().path);
 const nv=D.items.filter(i=>!i.k&&i.rev).length,nk=D.items.filter(i=>i.k&&i.isNew).length;
 ok('N5 dues reviewed + new items are kana (hiragana first)',nv===8&&nk>0&&D.items.filter(i=>i.k&&i.isNew).every(i=>/[\u3041-\u3096]/.test(i.id)),`dueN5=${nv} newKana=${nk} first=${D.items.filter(i=>i.isNew).map(i=>i.id).join('')}`);
 ok('reviews come before new items',D.items.findIndex(i=>i.isNew)>=D.items.filter(i=>i.rev).length-0);
 // run the whole session with taps
 await tap('#dailyBtn');let n=0,kanaQ=0,vocQ=0;
 for(;n<150;n++){if(await p.$('#homeBtn'))break;if(await p.$('.kprompt, .kchoice, .kroma'))kanaQ++;else vocQ++;
  const idk=await p.$('button.idk:not([disabled])'),give=await p.$('#giveBtn:not([disabled])');if(idk)await idk.tap();else if(give)await give.tap();else{console.log('stuck',await p.textContent('#qhost'));break;}
  await p.waitForSelector('#nextBtn');await (async()=>{if(await p.$('#rtSkip'))await p.tap('#rtSkip');await p.tap('#nextBtn')})();await p.waitForTimeout(40);}
 ok('mixed kana+vocab path session completes',!!(await p.$('#homeBtn')),`q=${n} kana=${kanaQ} vocab=${vocQ}`);
 ok('kana progress recorded',await ev(()=>Object.keys(__N5.KS().cards).length)>0);
 await tap('#homeBtn');
 // master all hiragana+katakana → frontier N5 (100/718 mastered)
 await ev(()=>{const K=__N5.KS(),now=Date.now();for(const id in __N5.KITEMS)if(__N5.KITEMS[id].g!=='ext')K.cards[id]={box:5,due:now+864e5,ok:5,bad:0};});
 ps=await ev(()=>__N5.pathState());ok('kana mastered → path at N5',ps.cur==='n5'&&!ps.overlap,JSON.stringify(ps));
 // N5 75% mastered → overlap with N4
 await ev(()=>{const S=__N5.S(),now=Date.now();for(let i=0;i<540;i++)S.cards[i]={box:5,due:now+864e5,ok:5,bad:0};});
 ps=await ev(()=>__N5.pathState());ok('N5 ≥70% → overlap into N4',ps.cur==='n5'&&ps.overlap&&ps.next==='n4',JSON.stringify(ps));
 await p.evaluate(()=>{delete __N5.S().dailies.path;});await tap('#tabStats');await tap('#tabHome');await p.waitForFunction(()=>__N5.dailies().path,null,{timeout:15000});
 D=await ev(()=>__N5.dailies().path);const lv=[...new Set(D.items.filter(i=>i.isNew).map(i=>i.id<10000?'n5':'n4'))];
 ok('overlap session has N5 + N4 new words',lv.includes('n5')&&lv.includes('n4'),JSON.stringify(lv));
 // N5 ≥80% → path at N4
 await ev(()=>{const S=__N5.S(),now=Date.now();for(let i=0;i<600;i++)S.cards[i]={box:5,due:now+864e5,ok:5,bad:0};});
 ps=await ev(()=>__N5.pathState());ok('N5 ≥80% → path at N4',ps.cur==='n4',JSON.stringify(ps));
 // manual focus via Settings tab
 await tap('#tabSettings');await p.selectOption('#pathFocus','n3');
 ps=await ev(()=>__N5.pathState());ok('manual focus N3',ps.cur==='n3'&&ps.manual);
 await tap('#tabHome');await p.waitForFunction(()=>document.querySelector('.pathtxt')&&/Focus: N3/.test(document.querySelector('.pathtxt').textContent),null,{timeout:15000}).catch(()=>{});
 ok('home shows Focus: N3',(await p.textContent('.pathtxt')).includes('Focus: N3'),await p.textContent('.pathtxt'));
 D=await ev(()=>__N5.dailies().path);ok('focus session new words from N3',D.items.filter(i=>i.isNew).every(i=>i.id>=20000&&i.id<30000)&&D.newCount>0);
 await tap('#tabSettings');await p.selectOption('#pathFocus','auto');await p.click('#pathAdv button[data-v="90"]');
 ps=await ev(()=>__N5.pathState());ok('auto + 90% threshold → back to N5 (600/718=84%)',ps.cur==='n5'&&!ps.manual,JSON.stringify(ps));
 ok('settings persisted',await ev(()=>{const s=JSON.parse(localStorage.getItem('n5VocabQuest.v1'));return s.pathFocus==='auto'&&s.pathAdv===90}));
 // home level-page sessions unaffected: N5 level page has its own session
 await tap('#tabHome');await tap('.lvgrid .lvcard[data-lv=n5]');ok('N5 level page own session',await ev(()=>!!__N5.dailies().n5));
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,400));process.exit(1)});
