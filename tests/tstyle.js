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
 const small=[...document.querySelectorAll('#view button, .tabbar button, .modal button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(b).visibility!=='hidden'&&r.height+(b.matches('.switch')?14:0)<43.5&&!b.closest('.seg,.gseg,.kjgrid,.kgrid,#map,.dots,.ex,.kjex,.rdjp')&&!b.matches('.mini,.kjtile,.kcell')}).map(b=>(b.id||b.className||b.textContent.trim().slice(0,12))+':'+Math.round(b.getBoundingClientRect().height));
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
  // grammar (batch 2): hub, lesson, each drill type before/after answering, finish card
  await p.evaluate(()=>__N5.go(__N5.grammarHome));await p.waitForSelector('.grrow');await check('grammar hub');
  await p.evaluate(()=>__N5.go(()=>__N5.grLesson('wa')));await p.waitForSelector('#grLesson');await check('grammar lesson');
  await p.evaluate(()=>__N5.go(()=>__N5.grSession(['tekudasai'],'learn','Grammar',__N5.grammarHome)));await p.waitForSelector('#typein');await check('grammar conjugation');
  for(let i=0;i<3;i++){await tap('#giveBtn');if(!i)await check('grammar conjugation answered');await tap('#nextBtn');}
  await p.waitForSelector('#qhost .grcard[data-k="p"]');await check('grammar particle');
  await tap('#qhost .choice');await check('grammar particle answered');await tap('#nextBtn');
  await p.waitForSelector('#grPool');await check('grammar order');
  await tap('#grPool .grtile');await tap('#giveBtn');await check('grammar order answered');
  await tap('#nextBtn');await p.waitForSelector('#grFinish');await check('grammar finish');
  // reading + mock JLPT (batch 3)
  await p.evaluate(()=>__N5.go(__N5.readingHome));await p.waitForSelector('.rdcard');await check('reading hub');
  await p.evaluate(()=>__N5.go(()=>__N5.rdStory('r03',__N5.readingHome)));await p.waitForSelector('#rdStory');await check('reading story');
  await tap('#rdEn');await check('reading story + English');
  await tap('.rdw.lk');await p.waitForSelector('#rdSheet');await check('reading word sheet');await tap('#rdClose');
  await tap('#rdQuizBtn');await p.waitForSelector('.rdq');await check('reading quiz');
  await tap('#qhost .choice');await check('reading quiz answered');
  await p.evaluate(()=>__N5.go(__N5.mockHome));await p.waitForSelector('#mkStart');await check('mock home');
  await tap('#mkStart');await p.waitForSelector('#mkGo');await check('mock section intro');
  await tap('#mkGo');await p.waitForSelector('#mkQ');await tap('.mkopts .choice');await check('mock vocab question');
  await tap('#mkGrid');await p.waitForSelector('#mkGridM');await check('mock palette');await tap('#mkGridClose');
  await p.evaluate(()=>__N5.mkSetLeft(0));await p.waitForSelector('#mkIntro[data-sec="g"]');await tap('#mkGo');await p.waitForSelector('#mkQ');
  {const i=await p.evaluate(()=>__N5.MK.ex.secs[1].items.findIndex(x=>x.part==='g2'));await tap('#mkGrid');await p.tap(`#mkGridM .mkgrid button >> nth=${i}`);await p.waitForTimeout(300);await check('mock ★ composition');}
  {const i=await p.evaluate(()=>__N5.MK.ex.secs[1].items.findIndex(x=>x.part==='tg'));await tap('#mkGrid');await p.tap(`#mkGridM .mkgrid button >> nth=${i}`);await p.waitForTimeout(300);await check('mock text grammar');}
  await p.evaluate(()=>__N5.mkSetLeft(0));await p.waitForSelector('#mkIntro[data-sec="l"]');await tap('#mkGo');await p.waitForSelector('#mkQ');await check('mock listening');
  await p.evaluate(()=>__N5.mkSetLeft(0));await p.waitForSelector('#mkRes');await p.waitForTimeout(400);await check('mock results');
  await tap('#mkReview');await check('mock mistakes');
  await tap('#mkBack');await p.waitForSelector('.mkhrow');await check('mock history');
  await p.evaluate(()=>__N5.go(()=>__N5.mkResults({t:Date.now(),dur:3e6,lkr:100,lis:50,total:150,pass:true,parts:{kr:[7,7],lt:[6,7]},miss:[],again:[]})));await p.waitForSelector('#mkRes');await check('mock results pass');
  await p.evaluate(()=>{__N5.go(()=>__N5.mkRun(__N5.mkBuild(3)));});await tap('#mkGo');await p.waitForSelector('#mkQ');await p.evaluate(()=>__N5.mkSetLeft(30000));await p.waitForTimeout(700);await check('mock timer last minute');
  await p.evaluate(()=>{const M=__N5.MK;M.done=true;__N5.go(__N5.home);});
  // speaking (batch 4) with a stand-in recognizer
  await p.evaluate(()=>{const S=__N5.S();window.__spkIds=Object.keys(S.cards).map(Number).filter(id=>__N5.WORDS[id]&&__N5.WORDS[id].lvl==='n5').slice(0,3);window.__alts=[__N5.WORDS[__spkIds[0]].jp.split(/[;；]/)[0]];window.__err=null;
   const C=class{start(){setTimeout(()=>{if(window.__err)this.onerror&&this.onerror({error:window.__err});else this.onresult&&this.onresult({results:[window.__alts.map(t=>({transcript:t}))]});this.onend&&this.onend();},50);}stop(){}abort(){}};
   for(const k of ['SpeechRecognition','webkitSpeechRecognition'])Object.defineProperty(window,k,{value:C,configurable:true,writable:true});S.spkMode='auto';delete S.spkMicOk;__N5.go(()=>__N5.spkSession(__spkIds,'Speaking · N5',__N5.home));});
  await p.waitForSelector('#spkMic');await check('speaking card');
  await tap('#spkMic');await p.waitForSelector('#spkPerm');await check('speaking permission');
  await tap('#spkPermOk');await p.waitForSelector('#spkFb .grok');await check('speaking correct');
  await tap('#spkNext');await p.evaluate(()=>{window.__alts=['ぜんぜんちがうことば'];});await tap('#spkMic');await p.waitForSelector('#spkFb .grbad');await check('speaking miss');
  await tap('#spkHint').catch(()=>{});await p.evaluate(()=>{window.__err='not-allowed';});await tap('#spkMic');await p.waitForSelector('#spkDenied');await check('speaking denied');
  await p.evaluate(()=>{window.__err=null;__N5.S().spkMode='rec';__N5.go(()=>__N5.spkSession(__spkIds,'Speaking · N5',__N5.home));});await p.waitForSelector('#spkCard');await check('speaking record mode');
  await p.evaluate(()=>{window.__alts=[__N5.WORDS[__spkIds[0]].jp.split(/[;；]/)[0]];__N5.S().spkMode='auto';__N5.go(()=>__N5.spkSession(__spkIds.slice(0,1),'Speaking · N5',__N5.home));});await p.waitForSelector('#spkMic');
  await tap('#spkMic');await p.waitForSelector('#spkFb .grok');await tap('#spkNext');await p.waitForSelector('#spkDone');await check('speaking done');
  // produce-ladder + corrective feedback (batch 5)
  await p.evaluate(()=>{window.__lad=(id,s,ok)=>{const S=__N5.S(),D=864e5,now=Date.now();S.cards[id]={box:3,due:now-1000,ok,bad:0,f:{st:2,sp:null,s,d:5,lr:now-s*D,due:now-1000}};const it=[{id,mode:'mixed'}];let k=0;
   __N5.go(()=>__N5.runSession({title:'Ladder',items:true,back:__N5.home,progress:()=>({done:k,total:1}),nextItem:()=>it[k]||null,onItemDone:()=>{k++;},onFinish:()=>__N5.go(__N5.home)}));};});
  await p.evaluate(()=>__lad(4,40,6));await p.waitForSelector('.clzcard');await check('ladder cloze');
  {const wi=await p.evaluate(()=>[...document.querySelectorAll('#qhost .choice')].findIndex(b=>!b.textContent.replace(/^\d/,'').startsWith(__N5.WORDS[4].jp)));await tap(`#qhost .choice[data-i="${wi}"]`);await p.waitForSelector('#fb .cfnote');await check('ladder cloze miss note');}
  await p.evaluate(()=>__lad(3,9,4));await p.waitForSelector('#typein');await check('ladder listen & type');
  await p.evaluate(()=>{__N5.S().ladderSpeak=true;__N5.S().spkMicOk=true;__lad(6,16,6);});await p.waitForSelector('.lspk');await check('ladder speak');
  await p.evaluate(()=>{window.__alts=['ぜんぜんちがう'];});await tap('#lsMic');await p.waitForTimeout(400);await check('ladder speak miss');await p.evaluate(()=>{__N5.S().ladderSpeak=false;});
  await p.evaluate(()=>__N5.go(()=>__N5.quiz('typing',[229],'Typing')));await p.waitForSelector('#typein');await p.fill('#typein','kiru');await p.keyboard.press('Enter');await p.waitForSelector('#fb .cfnote');await check('typing miss: other word note');
  await p.evaluate(()=>__N5.go(()=>__N5.quiz('typing',[128],'Typing')));await p.waitForSelector('#typein');await p.fill('#typein','obasan');await p.keyboard.press('Enter');await p.waitForSelector('#fb .cfnote');await check('typing miss: long vowel note');
  await p.evaluate(()=>{__N5.go(__N5.home);__N5.wordModal(__N5.WORDS[3]);});await p.waitForSelector('.modal .ladder');await p.evaluate(()=>document.querySelector('.modal .ladder').scrollIntoView({block:'center'}));await check('word detail ladder');
  await p.evaluate(()=>{document.querySelector('.modal').remove();const S=__N5.S();S.confuse={'229>208':{n:3,c:0,t:Date.now()},'128>127':{n:2,c:0,t:Date.now()},'p:は>が':{n:1,c:0,t:Date.now()}};__N5.go(__N5.leechView);});await p.waitForSelector('#confDrill');await p.waitForTimeout(300);await check('leeches confusables');
  await tap('#confDrill');await p.waitForSelector('#qhost .cfch');await check('confusables drill');await tap('#qhost .cfch .choice');await p.waitForSelector('#cfNext');await check('confusables drill answer');
  // batch 6: auto pace note/info/settings, reading hub (N4 preview tier), listening-only setup/player/reveal/check/done
  await p.evaluate(()=>{document.querySelectorAll('.modal').forEach(m=>m.remove());const S=__N5.S(),now=Date.now(),D=864e5;S.revLog=S.revLog||{};for(let i=0;i<7;i++){const d=new Date(now-i*D).toLocaleDateString('en-CA');S.revLog[d]={n5f:20,'n5f+':17};}delete S.pace;__N5.go(__N5.home);document.querySelector('#paceNote').scrollIntoView({block:'center'});});await check('home pace note');
  await tap('#paceInfo');await p.waitForSelector('.paceinfo');await check('pace info');await tap('#paceOk');
  await p.evaluate(()=>{__N5.go(__N5.settingsView);document.querySelector('#paceSw').scrollIntoView({block:'center'});});await check('pace settings');
  await p.evaluate(()=>{__N5.go(__N5.readingHome);[...document.querySelectorAll('.sechead')].pop().scrollIntoView();});await check('reading hub N4 preview');
  await p.evaluate(()=>{HTMLMediaElement.prototype.play=function(){this.dispatchEvent(new Event('play'));return Promise.resolve();};__N5.go(__N5.loHome);});await p.waitForSelector('#loGo');await check('listening setup');
  await tap('[data-lo="checks"]');await tap('#loGo');await p.waitForSelector('#loCard');await check('listening player');
  await tap('#loReveal');await check('listening reveal');await tap('#loPlay');await check('listening paused');
  await p.evaluate(()=>{const L=__N5.LO;L.playing=true;L.pos=L.tape.findIndex(t=>t.t==='q')-1;__N5.LO_EL.dispatchEvent(new Event('ended'));});await p.waitForSelector('#loQ .choice');await check('listening check');
  await tap('#loQ .choice');await check('listening check answered');
  await p.evaluate(()=>{const L=__N5.LO;L.playing=true;L.pos=L.tape.length-1;__N5.LO_EL.dispatchEvent(new Event('ended'));});await p.waitForSelector('#loDone');await check('listening done');await tap('#loDone');
  await p.evaluate(()=>{__N5.go(__N5.settingsView);});await p.waitForSelector('#modeSeg');await p.evaluate(()=>document.querySelector('#modeSeg').scrollIntoView({block:'center'}));await check('settings question mode');
  await p.evaluate(()=>__N5.go(__N5.home));
  await p.evaluate(()=>__N5.go(__N5.dueView));await p.waitForSelector('[data-review="all"]');
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
  // batch 1: smart start, kanji flashcards, FSRS optimizer
  await p.evaluate(()=>__N5.go(__N5.home));await p.waitForSelector('#smartStart');await check('home smart start');
  await p.evaluate(async()=>{await __N5.loadKanji('n5');const cs=Object.keys(__N5.KJ).filter(c=>__N5.KJ[c].lvl==='n5').slice(0,3).map(c=>'j:'+c);__N5.S().newLogK={};__N5.go(()=>__N5.flashcards(cs,'🃏 Kanji',__N5.home,{kjAble:true}));});
  await p.waitForSelector('.flkjf');await check('flashcards kanji front');
  await tap('#flShow');await p.waitForSelector('#flBackSide .kjlearn');await p.waitForTimeout(800);await check('flashcards kanji back');
  await p.evaluate(()=>{__N5.go(__N5.settingsView);});await p.waitForSelector('#foptBox');await p.evaluate(()=>document.querySelector('#foptBox').scrollIntoView({block:'center'}));await check('settings optimizer (not enough)');
  await p.evaluate(()=>{__N5.FOPT_STATE.busy=true;__N5.go(__N5.settingsView);});await p.waitForSelector('#foptProg:not([hidden])');await p.evaluate(()=>{document.querySelector('#foptBar').style.width='40%';document.querySelector('#foptBox').scrollIntoView({block:'center'});});await check('settings optimizer running');
  await p.evaluate(()=>{__N5.FOPT_STATE.busy=false;__N5.FOPT_STATE.last={ok:true,samples:812,items:140,total:1300,before:{logloss:.412,rmse:.061},after:{logloss:.379,rmse:.019},w:__N5.FSRS_DEF.slice()};__N5.go(__N5.settingsView);});await p.waitForSelector('#foptApply');await p.evaluate(()=>document.querySelector('#foptRes').scrollIntoView({block:'center'}));await check('settings optimizer result');
  await p.evaluate(()=>{const S=__N5.S();__N5.FOPT_STATE.last=null;S.fsrsW=__N5.FSRS_DEF.slice();S.fsrsOpt={at:Date.now(),samples:812,before:{logloss:.412,rmse:.061},after:{logloss:.379,rmse:.019},prev:null};__N5.go(__N5.settingsView);});await p.waitForSelector('#foptRevert');await p.evaluate(()=>document.querySelector('#foptBox').scrollIntoView({block:'center'}));await check('settings optimizer applied');
  await p.evaluate(()=>{const S=__N5.S();delete S.fsrsW;delete S.fsrsOpt;});
  await ctx.close();}
 await b.close();console.log('SUMMARY',BR,R.filter(Boolean).length,'/',R.length);process.exit(R.every(Boolean)?0:1);})();
