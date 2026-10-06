// Reading (Batch 3): graded N5 stories — content validity, hub (% seen, furigana switch), story reader (tap word → sheet
// with reading/meaning/audio/Add to study respecting the daily new-word cap), furigana + English toggles, per-sentence
// narration hooks, comprehension quiz (Good / Hard / Again only for key words already in review), done log, Smart Start
// hook, Home + N5 level tiles, touch hint hidden, header fits at 393px. iPhone-size viewport with touch. BROWSER=webkit|chromium
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
  const tap=async s=>{await p.tap(s);await W(250);};
  const fits=()=>ev(()=>document.documentElement.scrollWidth<=innerWidth);
  const st=()=>ev(k=>JSON.parse(localStorage.getItem(k)),KEY);
  const setSt=async f=>{await ev(([k,f])=>{const s=JSON.parse(localStorage.getItem(k));new Function('S',f)(s);localStorage.setItem(k,JSON.stringify(s));},[KEY,f]);await load();};
  return {ctx,p,ev,W,until,tap,fits,st,setSt,load};};
 const seed=o=>{const now=Date.now(),D=864e5,cards={};
  for(let i=600;i<606;i++)cards[i]={box:3,due:now+5*D,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-6*D,due:now+5*D}};
  const S={cards,levels:['n5'],autoAdvance:false,retype:false,newLimit:o.lim||10,pathFocus:'n5',xp:50};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify(S));};

 /* ---------- content validity ---------- */
 let T=await open(seed,{});
 const C=await T.ev(async()=>{const N=__N5,out={n:N.RD_DATA.length,tiers:{},bad:[],q:0,sent:0,paths:[]};
  const ids=new Set();
  for(const st of N.RD_DATA){if(ids.has(st.id))out.bad.push('dup '+st.id);ids.add(st.id);out.tiers[st.tier]=(out.tiers[st.tier]||0)+1;
   if(st.q.length<3||st.q.length>5)out.bad.push(st.id+' q count '+st.q.length);
   for(const q of st.q){out.q++;if(new Set(q.o).size!==4)out.bad.push(st.id+' options '+q.q);
    for(const k of q.k)if(!(k in N.RD_MAP.jp)&&!(k in N.RD_MAP.kana))out.bad.push(st.id+' key '+k);}
   st.s.forEach(([s,en],i)=>{out.sent++;if(!en)out.bad.push(st.id+' no english '+i);
    for(const tk of s.split('/')){const t=N.rdToken(tk,st);if(t.id==null&&!t.gloss&&!t.name&&!/^[、。「」！？]$/.test(t.surf)&&!/^[ァ-ヶー・]+$/.test(t.surf))out.bad.push(st.id+' unglossed '+tk);}
    out.paths.push(`audio/rd/${st.id}-${i+1}.mp3`);});
   if(N.rdWordIds(st).length<8)out.bad.push(st.id+' few linked words');}
  const miss=[];await Promise.all(out.paths.map(async u=>{const r=await fetch(u,{method:'HEAD'});if(!r.ok)miss.push(u);}));out.miss=miss;delete out.paths;return out;});
 ok('≥40 original stories in 4 tiers (incl. N4 preview)',C.n>=40&&Object.keys(C.tiers).length>=4,JSON.stringify(C.tiers));
 ok('every story: 3–5 questions, 4 distinct options, key words resolve, tokens linked or glossed',C.bad.length===0,C.bad.slice(0,8).join(' | '));
 ok(`narration file for every sentence (${C.sent})`,C.miss.length===0,C.miss.slice(0,5).join(' '));
 console.log('INFO stories',C.n,'questions',C.q,'sentences',C.sent);

 /* ---------- header + Home tile + hub ---------- */
 const hdr=await T.ev(()=>{const l=document.querySelector('.logo');const t=[...l.childNodes].map(n=>n.textContent).join('').trim();return {t,fit:l.scrollWidth<=l.clientWidth+1,right:l.getBoundingClientRect().right,stats:document.querySelector('.stats').getBoundingClientRect().left};});
 ok('header title not truncated at 393px',hdr.fit&&hdr.right<=hdr.stats+1&&/JLPT/.test(hdr.t),JSON.stringify(hdr));
 ok('Home has Reading tile',await T.ev(()=>!!document.querySelector('button.mode[data-m="reading-stories"]')));
 ok('Home has Mock JLPT tile',await T.ev(()=>!!document.querySelector('button.mode[data-m="mock"]')));
 await T.tap('button.mode[data-m="reading-stories"]');
 ok('Reading hub lists every story',await T.until(()=>document.querySelectorAll('.rdcard').length===__N5.RD_DATA.length));
 const pct=await T.ev(()=>{const N=__N5;return N.RD_DATA.map(s=>{const c=document.querySelector(`.rdcard[data-rd="${s.id}"]`);return [c.textContent.includes(N.rdSeenPct(s)+'%'),N.rdSeenPct(s)];});});
 ok('each story shows % of its words seen',pct.every(x=>x[0]),JSON.stringify(pct.slice(0,4)));
 ok('hub fits width',await T.fits());
 await T.p.screenshot({path:SH+'shot-reading-hub.png'});

 /* ---------- story + word sheet + add (cap allows) ---------- */
 await T.tap('.rdcard[data-rd="r01"]');
 ok('story opens with ruby furigana',await T.until(()=>document.querySelectorAll('#rdStory ruby rt').length>5));
 ok('every sentence has a play button',await T.ev(()=>document.querySelectorAll('.rdsent').length===__N5.RD.r01.s.length&&[...document.querySelectorAll('.rdsent')].every(r=>r.querySelector('[data-sap],[data-say]'))));
 await T.ev(()=>window.__played=[]);
 await T.tap('.rdsent >> nth=0 >> [data-sap],[data-say]');
 ok('sentence play → audio/rd/r01-1.mp3',await T.until(()=>window.__played.some(u=>u.endsWith('audio/rd/r01-1.mp3'))),JSON.stringify(await T.ev(()=>window.__played)));
 await T.ev(()=>window.__played=[]);await T.tap('#rdPlayAll');
 ok('Play all starts at sentence 1',await T.until(()=>window.__played.some(u=>u.endsWith('rd/r01-1.mp3'))));
 ok('playing sentence is highlighted',await T.until(()=>!!document.querySelector('.rdsent.playing')));
 await T.tap('#rdPlayAll');
 // a linked word that is not studied yet
 const target=await T.ev(()=>{const N=__N5,b=[...document.querySelectorAll('.rdw.lk')];for(const x of b){const t=N.rdToken(N.RD.r01.s[+x.dataset.s][0].split('/')[+x.dataset.t],N.RD.r01);if(!JSON.parse(localStorage.getItem('n5VocabQuest.v1')).cards[t.id])return {s:x.dataset.s,t:x.dataset.t,id:t.id,jp:N.WORDS[t.id].jp,kana:N.WORDS[t.id].kana,en:N.WORDS[t.id].en};}return null;});
 ok('found an unstudied linked word',!!target);
 await T.tap(`.rdw[data-s="${target.s}"][data-t="${target.t}"]`);
 ok('word sheet opens',await T.until(()=>!!document.querySelector('#rdSheet')));
 const sh=await T.ev(()=>document.querySelector('#rdSheet').innerText);
 ok('sheet shows reading + meaning',sh.includes(target.kana.replace(' (する)',''))&&sh.includes(target.en.split(/[;,]/)[0].trim()),sh.slice(0,120));
 await T.ev(()=>window.__played=[]);await T.tap('#rdSay');
 ok('Listen plays the word audio',await T.until(()=>window.__played.length>0||speechSynthesis.speaking),JSON.stringify(await T.ev(()=>window.__played)));
 const capTxt=await T.ev(()=>document.querySelector('#rdCap').textContent);
 ok('sheet shows new words left today',/of 10 new words left today/.test(capTxt),capTxt);
 const nl0=(await T.st()).newLog;
 await T.tap('#rdAdd');
 let s1=await T.st();
 ok('Add to study creates a Seen card',s1.cards[target.id]&&s1.cards[target.id].box===0&&s1.cards[target.id].f,JSON.stringify(s1.cards[target.id]));
 ok('…and counts toward today\'s new words',Object.values(s1.newLog||{}).flat().includes(target.id)&&Object.values(s1.newLog).flat().length===Object.values(nl0||{}).flat().length+1);
 ok('button shows in study list',await T.ev(()=>document.querySelector('#rdAdd').disabled));
 await T.p.screenshot({path:SH+'shot-reading-word.png'});
 await T.tap('#rdClose');
 ok('sheet closes',await T.until(()=>!document.querySelector('#rdSheet')));
 ok('seen count updates',await T.ev(()=>/\d+\s*\/\s*\d+/.test(document.querySelector('#rdSeen').textContent)));
 /* furigana + English toggles */
 await T.tap('#rdFuri');
 ok('furigana toggle hides readings',await T.until(()=>document.querySelectorAll('#rdStory ruby').length===0));
 ok('…and is remembered',(await T.st()).rdFuri===false);
 await T.tap('#rdFuri');
 ok('furigana toggle shows readings again',await T.until(()=>document.querySelectorAll('#rdStory ruby rt').length>5));
 await T.tap('#rdEn');
 ok('English toggle shows translations',await T.until(()=>{const e=document.querySelector('.rden');return e&&getComputedStyle(e).display!=='none';}));
 ok('story fits width',await T.fits());
 await T.p.screenshot({path:SH+'shot-reading-story.png'});
 await T.tap('#rdEn');

 /* ---------- comprehension: key words in review get Good / Hard, others untouched ---------- */
 const keys=await T.ev(()=>{const N=__N5;return [...new Set(N.RD.r01.q.flatMap(q=>q.k).map(k=>k in N.RD_MAP.jp?N.RD_MAP.jp[k]:N.RD_MAP.kana[k]))];});
 const inRev=keys.slice(0,Math.ceil(keys.length/2)),notRev=keys.slice(Math.ceil(keys.length/2));
 await T.setSt(`const now=Date.now(),D=864e5;${JSON.stringify(inRev)}.forEach(id=>S.cards[id]={box:3,due:now+5*D,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-6*D,due:now+5*D}});${JSON.stringify(notRev)}.forEach(id=>delete S.cards[id]);`);
 await T.tap('button.mode[data-m="reading-stories"]');await T.tap('.rdcard[data-rd="r01"]');await T.tap('#rdQuizBtn');
 ok('quiz opens',await T.until(()=>!!document.querySelector('.rdq')));
 const kh=await T.ev(()=>{const k=document.querySelector('.kbdhint');return k?getComputedStyle(k).display:'missing';});
 ok('keyboard hint hidden on touch',kh==='none',kh);
 const nq=await T.ev(()=>__N5.RD.r01.q.length);
 const answerQ=async right=>{const idx=await T.ev(r=>{const N=__N5,c=document.querySelector('.rdq'),q=N.RD.r01.q[+c.dataset.q];const tx=b=>{const c=b.cloneNode(true);c.querySelectorAll('rt,.k').forEach(x=>x.remove());return c.textContent;};
   const strip=s=>s.replace(/\[[^\]]*\]/g,'');return [...document.querySelectorAll('#qhost .choice')].findIndex(b=>(tx(b)===strip(q.o[0]))===r);},right);await T.p.tap(`#qhost .choice >> nth=${idx}`);await T.W(200);return idx;};
 // answer Q1 slow (Hard) and the rest fast (Good)
 await T.ev(()=>__N5.rdSetHard(0));await T.W(30);await answerQ(true);await T.ev(()=>__N5.rdSetHard(20000));
 ok('correct answer marked',await T.ev(()=>!!document.querySelector('#qhost .choice.right')&&!document.querySelector('#qhost .choice.wrong')));
 await T.p.screenshot({path:SH+'shot-reading-quiz.png'});
 await T.tap('#nextBtn');
 for(let i=1;i<nq;i++){await answerQ(true);await T.tap('#nextBtn');}
 ok('finish screen',await T.until(()=>!!document.querySelector('#rdFinish')));
 const fin=await T.ev(()=>document.querySelector('#rdFinish').innerText);
 ok(`${nq}/${nq} correct shown`,fin.includes(`${nq}/${nq}`),fin.slice(0,80));
 const s2=await T.st();
 const q1keys=await T.ev(()=>{const N=__N5;return N.RD.r01.q[0].k.map(k=>k in N.RD_MAP.jp?N.RD_MAP.jp[k]:N.RD_MAP.kana[k]);});
 const reviewed=inRev.filter(id=>s2.cards[id]&&s2.cards[id].f.lr>Date.now()-60000);
 ok('in-review key words were reviewed',reviewed.length===inRev.length,JSON.stringify({inRev,reviewed}));
 ok('not-in-review key words untouched (no card)',notRev.every(id=>!s2.cards[id]),JSON.stringify(notRev.map(id=>s2.cards[id])));
 const hardIds=q1keys.filter(id=>inRev.includes(id));
 ok('slow correct answer → Hard tag for its key words',hardIds.length===0||await T.ev(()=>[...document.querySelectorAll('#rdFinish .rtag')].some(t=>t.classList.contains('r2'))));
 ok('fast correct answers → Good tags',await T.ev(()=>[...document.querySelectorAll('#rdFinish .rtag')].some(t=>t.classList.contains('r3'))||document.querySelectorAll('#rdFinish .rtag').length===[...document.querySelectorAll('#rdFinish .rtag.r2')].length));
 ok('story marked done (score) and logged today',s2.rdDone&&s2.rdDone.r01===nq&&Object.values(s2.rdDay||{}).flat().includes('r01'));
 ok('next story suggested is r02',await T.ev(()=>__N5.rdNext().id==='r02'));
 ok('Smart Start no longer offers reading today',await T.ev(()=>__N5.smartPlanK(Date.now())!=='reading'));
 await T.p.screenshot({path:SH+'shot-reading-done.png'});
 /* wrong answer → Again for in-review key words */
 await T.tap('#rdAgain');await T.tap('#rdQuizBtn');
 const before=(await T.st()).cards;
 await answerQ(false);
 ok('wrong answer shows the right one',await T.ev(()=>!!document.querySelector('#qhost .choice.wrong')&&!!document.querySelector('#qhost .choice.right')));
 await T.tap('#nextBtn');for(let i=1;i<nq;i++){await answerQ(true);await T.tap('#nextBtn');}
 await T.until(()=>!!document.querySelector('#rdFinish'));
 const s3=await T.st();
 const againIds=q1keys.filter(id=>inRev.includes(id));
 ok('wrong answer → Again (lapse) for in-review key words',againIds.every(id=>s3.cards[id].bad===(before[id].bad||0)+1),JSON.stringify(againIds.map(id=>[before[id].bad,s3.cards[id].bad])));
 ok('Again tag shown',againIds.length===0||await T.ev(()=>!!document.querySelector('#rdFinish .rtag.r1')));
 ok('best score kept',s3.rdDone.r01===nq);
 await T.ctx.close();

 /* ---------- cap reached: Add is blocked ---------- */
 T=await open(seed,{lim:1});
 const today=await T.ev(()=>__N5.todayStr?__N5.todayStr():null);
 if(today)await T.setSt(`S.newLog={${JSON.stringify(today)}:[0]};`);
 await T.tap('button.mode[data-m="reading-stories"]');await T.tap('.rdcard[data-rd="r02"]');
 const t2=await T.ev(()=>{const N=__N5,st=N.RD.r02,cards=JSON.parse(localStorage.getItem('n5VocabQuest.v1')).cards;for(const x of document.querySelectorAll('.rdw.lk')){const t=N.rdToken(st.s[+x.dataset.s][0].split('/')[+x.dataset.t],st);if(!cards[t.id]&&t.id!==0)return {s:x.dataset.s,t:x.dataset.t,id:t.id};}return null;});
 await T.tap(`.rdw[data-s="${t2.s}"][data-t="${t2.t}"]`);await T.until(()=>!!document.querySelector('#rdSheet'));
 const cap2=await T.ev(()=>document.querySelector('#rdCap').textContent);
 ok('cap shows 0 left',/0 of 1 new words left/.test(cap2),cap2);
 await T.tap('#rdAdd');
 const s4=await T.st();
 ok('daily cap reached → word not added',!s4.cards[t2.id]);
 ok('cap message shown',await T.ev(()=>/limit|tomorrow|cap/i.test(document.querySelector('#rdCap').textContent)&&document.querySelector('#rdCap').classList.contains('full')),await T.ev(()=>document.querySelector('#rdCap').outerHTML));
 await T.tap('#rdClose');
 /* N5 level page tiles */
 const lv=await T.ev(()=>{__N5.openLevel('n5');return true;});await T.W(300);
 await T.W(500);
 ok('N5 level page has Reading + Mock tiles',lv&&await T.until(()=>!!document.querySelector('button.mode[data-m="reading-stories"]')&&!!document.querySelector('button.mode[data-m="mock"]')),String(lv));
 await T.ctx.close();
 /* ---------- dark screenshots ---------- */
 T=await open(seed,{},'dark');
 await T.tap('button.mode[data-m="reading-stories"]');await T.until(()=>document.querySelectorAll('.rdcard').length>0);
 await T.p.screenshot({path:SH+'shot-reading-hub-dark.png'});
 await T.tap('.rdcard[data-rd="r07"]');await T.until(()=>!!document.querySelector('#rdStory'));
 await T.p.screenshot({path:SH+'shot-reading-story-dark.png'});
 await T.tap('.rdw.lk');await T.until(()=>!!document.querySelector('#rdSheet'));
 await T.p.screenshot({path:SH+'shot-reading-word-dark.png'});
 await T.tap('#rdClose');await T.tap('#rdQuizBtn');await T.until(()=>!!document.querySelector('.rdq'));
 await T.p.screenshot({path:SH+'shot-reading-quiz-dark.png'});
 await T.ctx.close();
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} trd ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
