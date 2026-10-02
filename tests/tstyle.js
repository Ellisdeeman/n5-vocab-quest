// Style audit: no horizontal overflow at 320/375/393, WCAG AA text contrast, tap targets, in dark + light. BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'chromium';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,c?'':i);};
const audit=()=>{const cv=document.createElement('canvas');cv.width=cv.height=1;const cx=cv.getContext('2d',{willReadFrequently:true});
 const rgba=s=>{cx.clearRect(0,0,1,1);cx.fillStyle='#000';cx.fillStyle=s;cx.fillRect(0,0,1,1);const d=cx.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255];};
 const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 const blend=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1];};
 const bgOf=el=>{const layers=[];for(let e=el;e;e=e.parentElement){const c=rgba(getComputedStyle(e).backgroundColor);if(c[3]>0){layers.push(c);if(c[3]>=1)break;}}
   let base=rgba(getComputedStyle(document.body).backgroundColor);if(base[3]<1)base=rgba(getComputedStyle(document.documentElement).backgroundColor);for(let i=layers.length-1;i>=0;i--)base=blend(layers[i],base);return base;};
 const faded=el=>{for(let e=el;e;e=e.parentElement){const cs=getComputedStyle(e);if(+cs.opacity<.99||e.disabled&&!e.matches('.choice.right,.choice.wrong')||e.matches('.locked,.dim,.disabled,[aria-hidden=true]'))return true;}return false;};
 const bad=[],W=innerWidth,over=[];
 for(const el of document.querySelectorAll('body *')){const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
  // overflow: right edge past the viewport, unless inside a horizontal scroller / clipped container
  if(r.right>W+1||r.left<-1){let clip=false;for(let e=el.parentElement;e&&e!==document.body;e=e.parentElement){const s=getComputedStyle(e);if(/auto|scroll|hidden|clip/.test(s.overflowX)){const pr=e.getBoundingClientRect();if(pr.right<=W+1&&pr.left>=-1){clip=true;break;}}if(s.position==='fixed')break;}
    if(!clip&&!el.closest('.modal')?.contains(el)===false||!clip)over.push((el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'))+` ${Math.round(r.left)}-${Math.round(r.right)}`);}
  const txt=[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim());if(!txt||faded(el))continue;
  if(r.bottom<0||r.top>innerHeight*3)continue;
  const fg=rgba(cs.color),bg=bgOf(el),f2=fg[3]<1?blend(fg,bg):fg;const L1=lum(f2),L2=lum(bg),cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  const px=parseFloat(cs.fontSize),bold=+cs.fontWeight>=700,large=px>=24||(bold&&px>=18.66);const need=large?3:4.5;
  if(cr<need)bad.push(`${(el.id?'#'+el.id:el.tagName.toLowerCase()+'.'+[...el.classList].join('.'))} "${el.textContent.trim().slice(0,24)}" ${cr.toFixed(2)}<${need} (${cs.color} on rgb(${bg.slice(0,3).map(Math.round)}))`);}
 // tap targets: visible buttons in the main view / tab bar at least 44px tall (primary .btn 54)
 const small=[...document.querySelectorAll('#view button, .tabbar button, .modal button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(b).visibility!=='hidden'&&r.height+(b.matches('.switch')?14:0)<43.5&&!b.closest('.seg,.gseg,.kjgrid,.kgrid,#map,.dots,.ex,.kjex')&&!b.matches('.mini,.kjtile,.kcell')}).map(b=>(b.id||b.className||b.textContent.trim().slice(0,12))+':'+Math.round(b.getBoundingClientRect().height));
 const prim=[...document.querySelectorAll('.btn:not(.small)')].filter(b=>b.getBoundingClientRect().height&&b.getBoundingClientRect().height<53.5).map(b=>(b.id||b.textContent.trim().slice(0,12))+':'+Math.round(b.getBoundingClientRect().height));
 return {sw:document.documentElement.scrollWidth,W,over:[...new Set(over)].slice(0,8),bad:[...new Set(bad)].slice(0,12),small:small.slice(0,8),prim:prim.slice(0,6)};};
(async()=>{const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['dark','light'])for(const W of [320,375,393]){
  const ctx=await b.newContext({viewport:{width:W,height:760},hasTouch:true,colorScheme:scheme,serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.duecard');await p.waitForTimeout(900);
  const tap=async s=>{await p.tap(s);await p.waitForTimeout(450);};
  const check=async name=>{await p.waitForTimeout(300);const a=await p.evaluate(audit);const tag=`${scheme} ${W}px ${name}`;
   ok(`${tag}: no horizontal overflow`,a.sw<=a.W&&!a.over.length,`scrollWidth ${a.sw} ${JSON.stringify(a.over)}`);
   ok(`${tag}: text contrast AA`,!a.bad.length,JSON.stringify(a.bad,null,1));
   ok(`${tag}: tap targets ≥44 (primary ≥54)`,!a.small.length&&!a.prim.length,JSON.stringify({small:a.small,prim:a.prim}));};
  await check('home');
  await tap('[data-m="meaning"]');await p.waitForSelector('#qhost .choice');await check('quiz');
  await tap('#qhost .choice');await check('quiz answered');
  await tap('#backBtn');if(await p.$('body.studying'))await tap('#backBtn');
  await tap('.tabbar [data-tab="review"]');await p.waitForSelector('[data-review="all"]');await check('review');
  await tap('.tabbar [data-tab="levels"]');await check('levels');
  await p.evaluate(()=>__N5.openLevel('n5'));await p.waitForTimeout(1200);await check('level N5');
  await tap('#kjOpen');await p.waitForSelector('.kjtile');await check('kanji page');
  await tap('.kjtile');await p.waitForSelector('.kjbox');await p.waitForTimeout(600);await check('kanji card');
  await tap('.kjdone .btn');
  await tap('.tabbar [data-tab="stats"]');await p.waitForTimeout(500);await check('stats');
  await tap('.tabbar [data-tab="settings"]');await p.waitForTimeout(500);await check('settings');
  // Backup & Sync screens
  await p.evaluate(()=>document.querySelector('#bkSec').scrollIntoView());await check('backup & sync');
  await p.evaluate(()=>{const d=document.querySelector('.tokhelp');d.open=true;d.scrollIntoView();});await check('token help');
  await p.evaluate(()=>{const y=__N5.SY;y.token='ghp_'+'x'.repeat(36);y.err='offline';y.lastSync=Date.now()-3600e3;});
  await tap('.tabbar [data-tab="home"]');await tap('.tabbar [data-tab="settings"]');await p.evaluate(()=>document.querySelector('#syncBox').scrollIntoView());await check('sync status (error)');
  const bk=await p.evaluate(()=>JSON.stringify(__N5.buildPayload('backup')));
  await p.setInputFiles('#bkFile',{name:'b.json',mimeType:'application/json',buffer:Buffer.from(bk)});await p.waitForSelector('#bkPreview');await check('restore preview');
  await tap('#bkCancel');await p.evaluate(()=>{const y=__N5.SY;y.token='';y.err='';y.remind=true;y.lastBackup=0;y.lastSync=0;y.snooze=0;});
  await tap('.tabbar [data-tab="home"]');await p.waitForSelector('#bkBanner');await check('backup reminder banner');await p.evaluate(()=>{__N5.SY.remind=false;});
  // audio lesson repeat option + Pimsleur words screens
  await p.evaluate(()=>{const A=__N5.AL();A.on=true;A.url='https://example.com/l';A.opened=__N5.todayStr()+':'+A.cur;});
  await tap('.tabbar [data-tab="stats"]');await tap('.tabbar [data-tab="home"]');await p.waitForSelector('#alRepeat');await p.evaluate(()=>document.querySelector('#alCard').scrollIntoView());await check('audio lesson (done + repeat buttons)');
  await tap('#alRepeat');await p.evaluate(()=>document.querySelector('#alCard').scrollIntoView());await check('audio lesson repeat done');await tap('#alUndo');
  await tap('#pimsOpen');await p.waitForSelector('#pmList');await check('pimsleur words');
  await tap('#pmList .pmrow[data-n="4"]');await p.waitForSelector('#pmWords');await check('pimsleur lesson');
  await tap('.tabbar [data-tab="settings"]');await p.waitForTimeout(400);await p.evaluate(()=>document.querySelector('#alPAdd').scrollIntoView({block:'center'}));await check('settings pimsleur');
  await p.evaluate(()=>document.querySelector('#sfxSeg').scrollIntoView({block:'center'}));await check('settings sound style');
  await p.evaluate(()=>__N5.go(()=>__N5.quiz('typing',__N5.ALL().ALL_IDS.slice(0,40),'Typing')));await p.waitForSelector('#typein');await p.waitForTimeout(300);await p.tap('#giveBtn');await p.waitForSelector('#rtIn');await p.waitForTimeout(500);await check('retype after a miss');
  await p.fill('#rtIn','xx');await p.tap('#rtGo');await p.waitForTimeout(300);await check('retype not quite');await p.tap('#rtSkip');await p.waitForTimeout(200);await check('retype skipped');await tap('#backBtn');
  await tap('.tabbar [data-tab="stats"]');await p.waitForSelector('#amOpen');await p.evaluate(()=>document.querySelector('#amOpen').scrollIntoView({block:'center'}));await check('stats all-words card');
  await tap('#amOpen');await p.waitForSelector('#amCtl');await p.waitForTimeout(400);await check('all words map');
  await p.evaluate(()=>__N5.amDetail('n5',1));await p.waitForSelector('.amsheet #amClose');await p.waitForTimeout(900);await check('all words detail sheet');await tap('#amClose');
  // game screens
  await tap('.tabbar [data-tab="home"]');await tap('button.mode[data-m="games"]');await check('games hub');
  await tap('button.gtile[data-gl="n5"][data-game="sniper"]');await check('sniper start');
  await tap('#gStart');await p.waitForSelector('#arena .gtarget');await p.waitForTimeout(900);await p.evaluate(()=>__N5.gs.busy=true);await check('sniper arena');
  await p.evaluate(()=>{__N5.gs.busy=false;__N5.gs.pause();});await check('sniper paused');
  await tap('#backBtn');await tap('button.gtile[data-gl="n5"][data-game="builder"]');await p.waitForSelector('.kbtile');await check('kanji builder');
  await tap('.kbcard .idk');await p.waitForTimeout(700);await check('kanji builder solved');
  await tap('#backBtn');await tap('button.gtile[data-gl="n4"][data-game="scramble"]');await p.waitForSelector('#sTray .stile',{timeout:20000});await check('sentence scramble');
  await tap('.scard .idk');await check('sentence scramble answered');
  await tap('#backBtn');await tap('button.gtile[data-gl="n5"][data-game="boss"]');await p.waitForSelector('.bossrow');await check('boss list');
  await tap('[data-fight]:not(.ghost)');await p.waitForSelector('#qhost .choice');await check('boss fight');
  await tap('#qhost .idk');await check('boss answered');
  for(let i=0;i<2;i++){await tap('#nextBtn');await p.waitForSelector('#qhost .idk:not(:disabled)');await tap('#qhost .idk');}
  await tap('#nextBtn');await p.waitForSelector('#gFinal');await p.waitForTimeout(400);await check('game result');
  // Kanaatro
  await p.evaluate(()=>{window.__kaPick=()=>{const K=__N5.KA;let pp=__N5.kaPossible(K)[0];if(!pp){K.hand=[...'いぬねこ'].map((ch,i)=>({id:5000+i+Math.floor(Math.random()*1e4)*10,ch})).concat(K.hand.slice(4));pp=__N5.kaPossible(K)[0];}K.sel=pp.seq.map(i=>K.hand[i].id);__N5.kaRenderHand(K);};window.__kaSeed=3;window.__kaFast=true;__N5.gOpen('n5','kanaatro',__N5.home);});await p.waitForSelector('#kaStart');await check('kanaatro intro');
  await tap('#kaStart');await p.waitForSelector('#kaGo');await check('kanaatro blind select');
  await p.evaluate(()=>{const K=__N5.KA;K.jokers=[{id:'tanuki'},{id:'demon'},{id:'kitsune'}];K.cons=[{t:'tarot',id:'brush'}];});
  await tap('#kaGo');await p.waitForSelector('#kaHand .katile');await p.waitForTimeout(500);
  await p.evaluate(()=>{__kaPick();document.querySelector('#kaHint').click();});await check('kanaatro table (selection + hints)');
  await p.evaluate(()=>__kaPick());await tap('#kaPlay');await p.waitForSelector('#kaMC .kaopt');await check('kanaatro meaning check');
  await p.evaluate(async()=>{const K=__N5.KA,W=ms=>new Promise(r=>setTimeout(r,ms));K.mc.choose(K.mc.right);while(K.busy)await W(30);if(!document.querySelector('#kaCash')){K.score=__N5.kaTarget(K)-1;__kaPick();document.querySelector('#kaPlay').click();while(!K.mc)await W(20);K.mc.choose(K.mc.right);}while(!document.querySelector('#kaCash'))await W(30);});
  await check('kanaatro cash out');await tap('#kaCash');await p.waitForSelector('#kaNext');await check('kanaatro shop');
  await tap('#kaJokers .kaj');await p.waitForSelector('#kaSell');await check('kanaatro joker sheet');await tap('#kaSheet [data-close]');
  await p.evaluate(()=>{const K=__N5.KA;K.blind=2;K.boss='kata';});await tap('#kaNext');await p.waitForSelector('#kaGo');await tap('#kaGo');await p.waitForSelector('#kaHand .katile');await p.waitForTimeout(400);await check('kanaatro boss table');
  await p.evaluate(async()=>{const K=__N5.KA,W=ms=>new Promise(r=>setTimeout(r,ms));K.hands=1;K.score=-1e6;__kaPick();document.querySelector('#kaPlay').click();while(!K.mc)await W(20);K.mc.choose((K.mc.right+1)%4);while(!document.querySelector('#kaFinal'))await W(30);});
  await check('kanaatro summary');
  // daily cap, flashcards, detention, memory stats, next-review line
  await p.evaluate(()=>__N5.go(()=>__N5.flashcards(__N5.ALL().ALL_IDS.slice(0,60),'🃏 Flashcards',__N5.home)));await p.waitForSelector('#flCard');await check('flashcards front');
  await tap('#flShow');await check('flashcards back');await tap('.flg.r3');await check('flashcards next card');
  await p.evaluate(()=>__N5.go(__N5.leechView));await p.waitForSelector('#detention');await tap('#detention');await check('detention picker');
  await tap('#detGo');await p.waitForSelector('#detIn');await p.fill('#detIn','zz');await p.press('#detIn','Enter');await p.fill('#detIn',await p.evaluate(()=>__N5.WORDS[window.__det.ids[0]].kana));await p.press('#detIn','Enter');await check('detention board');
  await p.evaluate(()=>{const S=__N5.S();S._nl=S.newLimit;S.newLimit=1;(S.newLog[__N5.todayStr()]=S.newLog[__N5.todayStr()]||[]).push(99999);__N5.go(()=>__N5.quiz('meaning',__N5.ALL().ALL_IDS.filter(id=>__N5.isNewWord(id)).slice(0,30),'t'));});await p.waitForSelector('#capCard');await check('daily limit reached card');
  await p.evaluate(()=>__N5.go(__N5.home));await p.waitForTimeout(400);await check('home (limit reached counter)');
  await p.evaluate(()=>{const S=__N5.S();S.newLimit=S._nl;delete S._nl;});
  await p.evaluate(()=>__N5.go(__N5.settingsView));await p.waitForSelector('#newLimRow');await p.evaluate(()=>document.querySelector('#newLimRow').scrollIntoView({block:'center'}));await check('settings daily limits');
  await p.evaluate(()=>__N5.go(__N5.statsView));await p.waitForSelector('#memStats');await p.evaluate(()=>document.querySelector('#memStats').scrollIntoView());await check('memory (FSRS) stats');
  await p.evaluate(()=>document.querySelector('#memHard')&&document.querySelector('#memHard').scrollIntoView({block:'center'}));await check('memory hardest words');
  await ctx.close();}
 await b.close();console.log('SUMMARY',BR,R.filter(Boolean).length,'/',R.length);process.exit(R.every(Boolean)?0:1);})();
