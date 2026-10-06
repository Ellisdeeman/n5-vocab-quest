// Mock JLPT N5 (Batch 3): item-bank validity (enough for ≥2 different full tests, listening audio for every item),
// test assembly in the N5 format (counts per section/part, least-used items first), pure scoring + pass logic
// (80/180, LK+R ≥38/120, Listening ≥19/60), section timers (auto-finish), navigation + palette, listening playback hooks
// (auto-play, replay limit), results breakdown, history, mistake review, Again only for missed vocab already in review,
// sync merge of attempts, quit without saving. iPhone-size viewport with touch. BROWSER=webkit|chromium
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const SH='/workspace/n5-game/';const KEY='n5VocabQuest.v1';
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const errs=[];
 const open=async(seedFn,arg,scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seedFn})(${JSON.stringify(arg)})}
   window.__played=[];const _pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return _pl.call(this).catch(()=>{});};`);
  const p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errs.push(''+e));
  const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
  const load=async()=>{await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForSelector('#smartStart:not([disabled])',{timeout:20000});await W(400);};
  await load();
  const until=async(f,ms=8000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f,a))return true;await W(100);}return false;};
  const tap=async s=>{await p.tap(s);await W(200);};
  const fits=()=>ev(()=>document.documentElement.scrollWidth<=innerWidth);
  const st=()=>ev(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const setSt=async f=>{await ev(([k,f])=>{const s=JSON.parse(localStorage.getItem(k));new Function('S',f)(s);localStorage.setItem(k,JSON.stringify(s));},[KEY,f]);await load();};
  return {ctx,p,ev,W,until,tap,fits,st,setSt,load};};
 const seed=o=>{const S={cards:{},levels:['n5'],autoAdvance:false,retype:false,newLimit:10,pathFocus:'n5',xp:50};localStorage.setItem('n5VocabQuest.v1',JSON.stringify(S));};
 let T=await open(seed,{});

 /* ---------- bank validity ---------- */
 const V=await T.ev(async()=>{const N=__N5,bad=[],need={},have={};
  for(const k of ['v','g','l'])for(const [p,n] of N.MK_FORMAT[k].parts){need[p]=n;have[p]=N.mkPool(p).length;if(have[p]<2*n)bad.push(`${p}: ${have[p]} < 2×${n}`);}
  const B=N.MK_BANK,chk=(o,where)=>{if(new Set(o).size!==o.length)bad.push('dup options '+where);if(o.some(x=>!x))bad.push('empty option '+where);};
  ['kr','ot','cx','pa','g1'].forEach(p=>B[p].forEach((x,i)=>{chk(x[1],p+i);if(x[1].length!==4)bad.push(p+i+' not 4 options');if(p==='kr'||p==='ot'){if(!/\{[^}]+\}/.test(x[0]))bad.push(p+i+' no target');}
    if(x[2]&&!(x[2] in N.RD_MAP.jp)&&!(x[2] in N.RD_MAP.kana))bad.push(p+i+' lemma '+x[2]);}));
  B.g2.forEach((x,i)=>{chk(x[1],'g2'+i);if(x[1].length!==4||x[3]<0||x[3]>3)bad.push('g2 '+i);});
  B.tg.forEach((x,i)=>{x.b.forEach((o,j)=>chk(o,`tg${i}.${j}`));for(let n=1;n<=4;n++)if(!x.p.includes(`［${n}］`))bad.push(`tg${i} blank ${n}`);});
  ['rs','ri'].forEach(p=>B[p].forEach((x,i)=>{chk(x.o,p+i);if(x.o.length!==4)bad.push(p+i);}));
  B.rm.forEach((x,i)=>{if(x.qs.length!==2)bad.push('rm'+i);x.qs.forEach(([q,o],j)=>chk(o,`rm${i}.${j}`));});
  const ids=new Set(),files=[];
  ['lt','lp','lu','lq'].forEach(p=>B[p].forEach(x=>{if(ids.has(x.id))bad.push('dup id '+x.id);ids.add(x.id);chk(x.o,x.id);files.push(`audio/mk/${x.id}.mp3`);
    const n=(p==='lu'||p==='lq')?3:4;if(x.o.length!==n)bad.push(x.id+' options '+x.o.length);
    if(n===3){const pm=N.mkPerm(x.id,3);if([...pm].sort().join()!=='0,1,2')bad.push(x.id+' perm');}}));
  const miss=[];await Promise.all(files.map(async u=>{const r=await fetch(u,{method:'HEAD'});if(!r.ok)miss.push(u);}));
  const pos=[0,0,0];['lu','lq'].forEach(p=>B[p].forEach(x=>pos[N.mkPerm(x.id,3).indexOf(0)]++));
  return {bad,miss,have,need,files:files.length,pos};});
 ok('every part has enough items for ≥2 full tests',!V.bad.filter(x=>/</.test(x)).length,JSON.stringify(V.have));
 ok('items well-formed (distinct options, blanks, lemmas)',V.bad.length===0,V.bad.slice(0,8).join(' | '));
 ok(`listening audio for every item (${V.files})`,V.miss.length===0,V.miss.join(' '));
 ok('spoken-choice answers spread over positions 1–3',V.pos.every(n=>n>=5),JSON.stringify(V.pos));
 console.log('INFO pools',JSON.stringify(V.have));

 /* ---------- assembly ---------- */
 const A=await T.ev(()=>{const N=__N5,ex=N.mkBuild(42),ex2=N.mkBuild(42),ex3=N.mkBuild(7);const cnt={};
  ex.secs.forEach(s=>s.items.forEach(it=>cnt[it.part]=(cnt[it.part]||0)+1));
  const keys=e=>e.secs.flatMap(s=>s.items.map(i=>i.key));
  const okA=ex.secs.every(s=>s.items.every(it=>it.a>=0&&it.a<it.opts.length&&new Set(it.opts).size===it.opts.length));
  return {n:ex.secs.map(s=>s.items.length),cnt,same:keys(ex).join()===keys(ex2).join(),diff:keys(ex).join()!==keys(ex3).join(),okA,
   aud:ex.secs[2].items.every(i=>/^mk\/l[tpuq]\d+\.mp3$/.test(i.audio)),pos:ex.secs.flatMap(s=>s.items.map(i=>i.a)).reduce((m,a)=>(m[a]=(m[a]||0)+1,m),{})};});
 ok('sections 21 / 22 / 24 questions',A.n.join()==='21,22,24',A.n.join());
 ok('part counts match the N5 format',JSON.stringify(A.cnt)===JSON.stringify({kr:7,ot:5,cx:6,pa:3,g1:9,g2:4,tg:4,rs:2,rm:2,ri:1,lt:7,lp:6,lu:5,lq:6}),JSON.stringify(A.cnt));
 ok('same seed → same test; different seed → different test',A.same&&A.diff);
 ok('answer index valid, options distinct',A.okA);
 ok('correct answers spread over positions',Object.keys(A.pos).length>=3&&Math.max(...Object.values(A.pos))<40,JSON.stringify(A.pos));
 ok('every listening item has an audio file',A.aud);

 /* ---------- pure scoring + pass logic ---------- */
 const P=await T.ev(()=>{const N=__N5,ex=N.mkBuild(5),all={},none={},lisLow={},lis8={};
  ex.secs.forEach((s,si)=>s.items.forEach((it,i)=>{all[`${si}:${i}`]=it.a;if(si<2){lisLow[`${si}:${i}`]=it.a;lis8[`${si}:${i}`]=it.a;}}));
  ex.secs[2].items.forEach((it,i)=>{if(i<7)lisLow[`2:${i}`]=it.a;if(i<8)lis8[`2:${i}`]=it.a;});
  const wrong={};ex.secs.forEach((s,si)=>s.items.forEach((it,i)=>wrong[`${si}:${i}`]=(it.a+1)%it.opts.length));
  // reading weighs 3: only reading right → 3*5/(21+17+15) of 120
  const rd={};ex.secs[1].items.forEach((it,i)=>{if(it.b==='read')rd[`1:${i}`]=it.a;});
  const sc=a=>{const r=N.mkScore(ex,a);return [r.lkr,r.lis,r.total,r.pass,r.fails.join('+'),r.miss.length];};
  return {all:sc(all),none:sc(none),wrong:sc(wrong),lisLow:sc(lisLow),lis8:sc(lis8),rd:sc(rd),
   pass:[[80,0],[61,19],[37,60],[38,42],[60,19],[120,18],[42,38]].map(([a,b])=>N.mkPassOf(a,b))};});
 ok('all correct → 120 + 60 = 180, pass',JSON.stringify(P.all)===JSON.stringify([120,60,180,true,'',0]),JSON.stringify(P.all));
 ok('no answers → 0, fail, 67 mistakes',JSON.stringify(P.none)===JSON.stringify([0,0,0,false,'total+lkr+lis',67]),JSON.stringify(P.none));
 ok('all wrong → 0',P.wrong[2]===0&&P.wrong[5]===67);
 ok('Listening 7/24 = 18 → fail on Listening only (total 138)',JSON.stringify(P.lisLow)===JSON.stringify([120,18,138,false,'lis',17]),JSON.stringify(P.lisLow));
 ok('Listening 8/24 = 20 → pass',P.lis8[1]===20&&P.lis8[3]===true,JSON.stringify(P.lis8));
 ok('reading questions weigh 3× (5 reading right → 34/120)',P.rd[0]===Math.round(120*15/53),JSON.stringify(P.rd));
 ok('pass rule: total≥80 & LK+R≥38 & L≥19',JSON.stringify(P.pass)===JSON.stringify([false,true,false,true,false,false,true]),JSON.stringify(P.pass));

 /* ---------- seed some vocab words into review (half of the vocab-section lemmas) ---------- */
 const lem=await T.ev(()=>{const N=__N5,ids=new Set();['kr','ot','cx','pa'].forEach(p=>N.MK_BANK[p].forEach(x=>{if(x[2]){const id=x[2] in N.RD_MAP.jp?N.RD_MAP.jp[x[2]]:N.RD_MAP.kana[x[2]];if(id!=null)ids.add(id);}}));return [...ids];});
 const revIds=lem.filter((_,i)=>i%2===0);
 await T.setSt(`const now=Date.now(),D=864e5;${JSON.stringify(revIds)}.forEach(id=>S.cards[id]={box:3,due:now+5*D,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-6*D,due:now+5*D}});`);
 console.log('INFO vocab lemmas',lem.length,'in review',revIds.length);

 /* ---------- UI: home → test ---------- */
 ok('Home Mock tile',await T.ev(()=>!!document.querySelector('button.mode[data-m="mock"]')));
 await T.tap('button.mode[data-m="mock"]');
 ok('mock home: format + empty history',await T.until(()=>!!document.querySelector('#mkStart')&&document.querySelectorAll('.mkformat .row').length===3&&!!document.querySelector('.mkempty')));
 ok('mock home fits',await T.fits());
 await T.p.screenshot({path:SH+'shot-mock-home.png'});
 // quit without saving
 await T.tap('#mkStart');await T.until(()=>!!document.querySelector('#mkIntro'));await T.tap('#mkGo');await T.until(()=>!!document.querySelector('#mkQ'));
 await T.tap('#backBtn');ok('quit asks for confirmation',await T.until(()=>!!document.querySelector('#mkQuit')));
 await T.tap('#mkLeave');ok('leave → mock home, nothing saved',await T.until(()=>!!document.querySelector('#mkStart'))&&!(await T.st()).mock);
 // real attempt 1: answer everything correctly through the UI
 await T.tap('#mkStart');
 ok('section 1 intro',await T.until(()=>document.querySelector('#mkIntro')&&document.querySelector('#mkIntro').dataset.sec==='v'));
 await T.tap('#mkGo');
 ok('timer starts at 20:00',await T.until(()=>/^(20:00|19:5\d)$/.test(document.querySelector('#mkTime').textContent)),await T.ev(()=>document.querySelector('#mkTime').textContent));
 const kh=await T.ev(()=>{const k=document.querySelector('.kbdhint');return k?getComputedStyle(k).display:'missing';});
 ok('keyboard hint hidden on touch',kh==='none',kh);
 ok('question fits width',await T.fits());
 await T.p.screenshot({path:SH+'shot-mock-vocab.png'});
 const answerAll=async(right,si)=>{const n=await T.ev(()=>__N5.MK.ex.secs[__N5.MK.si].items.length);
  for(let i=0;i<n;i++){const a=await T.ev(()=>{const M=__N5.MK,it=M.ex.secs[M.si].items[M.pos];return it.a;});
   const pick=right?a:(a+1)%(await T.ev(()=>{const M=__N5.MK;return M.ex.secs[M.si].items[M.pos].opts.length;}));
   await T.p.tap(`.mkopts .choice[data-i="${pick}"]`);await T.W(60);
   if(i<n-1){await T.p.tap('#mkNext');await T.W(80);}}};
 await answerAll(true);
 ok('answer marked selected',await T.ev(()=>document.querySelectorAll('.mkopts .choice.sel').length===1));
 // palette
 await T.tap('#mkGrid');ok('palette shows all questions answered',await T.until(()=>document.querySelectorAll('#mkGridM .mkgrid button.on').length===21));
 await T.p.tap('#mkGridM .mkgrid button >> nth=2');await T.W(200);
 ok('palette jumps to question 3',await T.ev(()=>__N5.MK.pos===2&&/3\/21/.test(document.querySelector('#score').textContent)));
 ok('previous answer kept',await T.ev(()=>{const M=__N5.MK;return document.querySelector('.mkopts .choice.sel').dataset.i==String(M.ex.secs[0].items[2].a);}));
 // timer low + auto finish
 await T.ev(()=>__N5.mkSetLeft(45000));await T.W(700);
 ok('last minute: timer turns red',await T.ev(()=>document.querySelector('#mkTime').classList.contains('low')&&/^0:4\d$/.test(document.querySelector('#mkTime').textContent)));
 await T.ev(()=>__N5.mkSetLeft(0));
 ok('time up → section 2 intro (auto-finish)',await T.until(()=>document.querySelector('#mkIntro')&&document.querySelector('#mkIntro').dataset.sec==='g',4000));
 ok('vocab time recorded',await T.ev(()=>__N5.MK.spent[0]>0));
 await T.tap('#mkGo');
 ok('section 2 timer 40:00',await T.until(()=>/^(40:00|39:5\d)$/.test(document.querySelector('#mkTime').textContent)));
 await answerAll(true);
 // passage view screenshot (go to a reading item)
 await T.ev(()=>{const M=__N5.MK;M.pos=M.ex.secs[1].items.findIndex(i=>i.part==='rm');});await T.tap('#mkPrev');await T.tap('#mkNext');
 ok('reading items show their passage',await T.until(()=>!!document.querySelector('.mkpass')));
 await T.p.screenshot({path:SH+'shot-mock-reading.png'});
 await T.ev(()=>{__N5.MK.pos=__N5.MK.ex.secs[1].items.length-2;});await T.tap('#mkNext');
 await T.tap('#mkEnd');
 ok('all answered → straight to section 3',await T.until(()=>document.querySelector('#mkIntro')&&document.querySelector('#mkIntro').dataset.sec==='l'));
 await T.ev(()=>window.__played=[]);
 await T.tap('#mkGo');
 const firstAudio=await T.ev(()=>'mk/'+__N5.MK.ex.secs[2].items[0].audio.split('mk/')[1]);
 ok('listening clip auto-plays',await T.until(f=>window.__played.some(u=>u.endsWith(f)),8000,firstAudio),JSON.stringify(await T.ev(()=>window.__played)));
 ok('1 replay left',await T.ev(()=>/1 play left/.test(document.querySelector('#mkPlays').textContent)));
 await T.tap('#mkPlay');
 ok('replay plays again; limit reached → button disabled',await T.until(f=>window.__played.filter(u=>u.endsWith(f)).length===2&&document.querySelector('#mkPlay').disabled,8000,firstAudio));
 await T.tap('#mkNext');await T.tap('#mkPrev');
 ok('coming back does not auto-play again',await T.ev(f=>window.__played.filter(u=>u.endsWith(f)).length===2,firstAudio));
 await T.p.screenshot({path:SH+'shot-mock-listening.png'});
 await answerAll(true);
 // spoken-choice items show numbers only
 ok('quick-response items show 1/2/3 only',await T.ev(()=>{const M=__N5.MK,i=M.ex.secs[2].items.findIndex(x=>x.part==='lq');return i>=0;}));
 await T.tap('#mkEnd');
 ok('results screen',await T.until(()=>!!document.querySelector('#mkRes')));
 const r1=await T.ev(()=>({t:document.querySelector('#mkTotal').textContent,v:document.querySelector('#mkVerdict').textContent,pass:document.querySelector('#mkRes').dataset.pass,parts:document.querySelectorAll('.mkparts li').length}));
 ok('all correct → 180/180 Pass',r1.t==='180'&&r1.pass==='true'&&/Pass/.test(r1.v),JSON.stringify(r1));
 ok('breakdown per question type (14 rows)',r1.parts===14,String(r1.parts));
 ok('no mistakes → review disabled',await T.ev(()=>document.querySelector('#mkReview').disabled));
 let s1=await T.st();
 ok('attempt saved to history',Array.isArray(s1.mock)&&s1.mock.length===1&&s1.mock[0].total===180&&s1.mock[0].keys.length===63);
 ok('no misses → review schedule untouched',revIds.every(id=>s1.cards[id].bad===0&&s1.cards[id].f.lr<Date.now()-864e5));
 ok('results fit width',await T.fits());

 /* ---------- attempt 2: least-used items, unanswered (timeouts) ---------- */
 const ov=await T.ev(()=>{const N=__N5,ex=N.mkBuild(99),used=new Set(N.S().mock[0].keys);const res={};
  ex.secs.forEach(s=>s.items.forEach(it=>{const pool=N.mkPool(it.part).length,need={kr:7,ot:5,cx:6,pa:3,g1:9,g2:4,tg:1,rs:2,rm:1,ri:1,lt:7,lp:6,lu:5,lq:6}[it.part];
   if(pool>=2*need&&used.has(it.pk))res[it.part]=(res[it.part]||0)+1;}));return res;});
 ok('second test avoids every question of the first',Object.keys(ov).length===0,JSON.stringify(ov));
 await T.tap('#mkAgain');await T.until(()=>!!document.querySelector('#mkIntro'));await T.tap('#mkGo');await T.until(()=>!!document.querySelector('#mkQ'));
 const shown=await T.ev(()=>__N5.MK.ex.secs[0].items.map(i=>i.w).filter(Boolean));
 await T.tap('#mkGrid');await T.tap('#mkGridEnd');ok('finishing with unanswered questions asks first',await T.until(()=>!!document.querySelector('#mkEndM')&&/21 questions are unanswered/.test(document.querySelector('#mkEndM').textContent)));
 await T.tap('#mkEndYes');await T.until(()=>document.querySelector('#mkIntro')&&document.querySelector('#mkIntro').dataset.sec==='g');
 await T.tap('#mkGo');await T.until(()=>!!document.querySelector('#mkQ'));await T.ev(()=>__N5.mkSetLeft(0));
 await T.until(()=>document.querySelector('#mkIntro')&&document.querySelector('#mkIntro').dataset.sec==='l',4000);
 await T.tap('#mkGo');await T.until(()=>!!document.querySelector('#mkQ'));await T.ev(()=>__N5.mkSetLeft(0));
 ok('listening timeout → results',await T.until(()=>!!document.querySelector('#mkRes'),5000));
 const r2=await T.ev(()=>({t:document.querySelector('#mkTotal').textContent,pass:document.querySelector('#mkRes').dataset.pass,v:document.querySelector('#mkVerdict').textContent}));
 ok('nothing answered → 0/180, not yet with reasons',r2.t==='0'&&r2.pass==='false'&&/Listening under 19/.test(r2.v),JSON.stringify(r2));
 const s2=await T.st();
 const shownIds=await T.ev(ws=>{const N=__N5;return ws.map(w=>w in N.RD_MAP.jp?N.RD_MAP.jp[w]:N.RD_MAP.kana[w]).filter(x=>x!=null);},shown);
 const expAgain=[...new Set(shownIds.filter(id=>revIds.includes(id)))],notRev=shownIds.filter(id=>!revIds.includes(id));
 ok('missed vocab in review → Again (lapse)',expAgain.length>0&&expAgain.every(id=>s2.cards[id].bad===1),JSON.stringify(expAgain.map(id=>s2.cards[id]&&s2.cards[id].bad)));
 ok('missed vocab not in review → schedule untouched (no card)',notRev.every(id=>!s2.cards[id]),JSON.stringify(notRev.filter(id=>s2.cards[id])));
 ok('attempt records the Again words',JSON.stringify([...s2.mock[1].again].sort())===JSON.stringify(expAgain.slice().sort()),JSON.stringify([s2.mock[1].again,expAgain]));
 ok('results list the Again words',await T.ev(()=>/Marked Again/.test(document.querySelector('.mkagain').textContent)));
 await T.p.screenshot({path:SH+'shot-mock-results.png'});
 await T.tap('#mkReview');
 ok('mistake review lists all 67',await T.until(()=>document.querySelectorAll('#mkMissList .mkm').length===67));
 ok('listening mistakes include the script',await T.ev(()=>[...document.querySelectorAll('#mkMissList .mkm')].some(m=>/Script/.test(m.textContent))));
 await T.ev(()=>document.querySelector('#mkMissList').scrollIntoView());await T.W(300);
 await T.p.screenshot({path:SH+'shot-mock-review.png'});
 /* history */
 await T.tap('#mkBack');
 ok('history shows 2 attempts, newest first',await T.until(()=>document.querySelectorAll('.mkhrow').length===2)&&await T.ev(()=>document.querySelector('.mkhrow .mktot').textContent==='0'));
 ok('hero shows last + best',await T.ev(()=>/Last: 0\/180.*best 180\/180/.test(document.querySelector('.hero').textContent)));
 await T.p.screenshot({path:SH+'shot-mock-history.png'});
 await T.p.tap('.mkhrow >> nth=1');await T.W(300);
 ok('history row reopens its results',await T.until(()=>document.querySelector('#mkTotal')&&document.querySelector('#mkTotal').textContent==='180'));
 ok('reopening does not re-grade words',JSON.stringify((await T.st()).cards)===JSON.stringify(s2.cards));
 /* sync merge */
 const M=await T.ev(()=>{const N=__N5,a={mock:[{t:1,total:10},{t:3,total:30}]},b={mock:[{t:2,total:20},{t:3,total:30}]};const o=N.mergeStore('S',a,b,{},{},{});
  const big={mock:Array.from({length:40},(_,i)=>({t:i+1,total:i}))};const o2=N.mergeStore('S',big,{mock:[]},{},{},{});return [o.mock.map(x=>x.t),o2.mock.length,o2.mock[0].t];});
 ok('sync merges attempts by time (dedupe, sorted, newest 30)',JSON.stringify(M)===JSON.stringify([[1,2,3],30,11]),JSON.stringify(M));
 /* N5 level page entry */
 await T.ev(()=>__N5.openLevel('n5'));await T.W(400);
 ok('N5 level page has Mock tile',await T.until(()=>!!document.querySelector('button.mode[data-m="mock"]')));
 await T.tap('button.mode[data-m="mock"]');ok('…opens mock home',await T.until(()=>!!document.querySelector('#mkStart')));
 await T.ctx.close();

 /* ---------- dark screenshots ---------- */
 T=await open(seed,{},'dark');
 await T.tap('button.mode[data-m="mock"]');await T.until(()=>!!document.querySelector('#mkStart'));
 await T.p.screenshot({path:SH+'shot-mock-home-dark.png'});
 await T.tap('#mkStart');await T.tap('#mkGo');await T.until(()=>!!document.querySelector('#mkQ'));await T.p.tap('.mkopts .choice >> nth=1');await T.W(200);
 await T.p.screenshot({path:SH+'shot-mock-vocab-dark.png'});
 await T.ev(()=>__N5.mkSetLeft(0));await T.until(()=>!!document.querySelector('#mkIntro'));await T.tap('#mkGo');
 const tgi=await T.ev(()=>__N5.MK.ex.secs[1].items.findIndex(i=>i.part==='tg'));await T.tap('#mkGrid');await T.p.tap(`#mkGridM .mkgrid button >> nth=${tgi+1}`);await T.W(300);
 await T.p.screenshot({path:SH+'shot-mock-reading-dark.png'});
 await T.ev(()=>__N5.mkSetLeft(0));await T.until(()=>!!document.querySelector('#mkIntro'));await T.tap('#mkGo');await T.W(300);
 await T.p.screenshot({path:SH+'shot-mock-listening-dark.png'});
 await T.ev(()=>__N5.mkSetLeft(0));await T.until(()=>!!document.querySelector('#mkRes'),5000);await T.W(500);
 await T.p.screenshot({path:SH+'shot-mock-results-dark.png'});
 await T.ctx.close();
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} tmock ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
