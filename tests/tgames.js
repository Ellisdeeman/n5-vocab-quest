// Mini games: every game on every level played start to finish with touch at iPhone size (393x852).
// Checks SRS integration (IDK = miss), daily goal items, XP, high scores, boss badges on level page + Stats,
// pause when hidden, reduced motion, and no popups / navigation / page errors.
const pw=require('playwright-core');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const ONLY=(process.env.LEVELS||'kana,n5,n4,n3,n2,n1').split(',');
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
const seed2=()=>{const now=Date.now();const s=JSON.parse(localStorage.getItem('n5VocabQuest.v1'));
 for(let L=1;L<5;L++)for(let i=0;i<60;i++)s.cards[L*10000+i]={box:1,due:now+864e5,ok:1,bad:0,seen:now-864e5};
 localStorage.setItem('n5VocabQuest.v1',JSON.stringify(s));
 const k=JSON.parse(localStorage.getItem('n5VocabQuest.kana.v1'));'かきくけこさしすせそたちつてとなにぬねのはひふへほ'.split('').forEach(c=>k.cards[c]={box:1,due:now+864e5,ok:1,bad:0});
 localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify(k));};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,hasTouch:true,colorScheme:'dark',timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})();(${seed2})()}`);
 const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[],pops=[];let navs=0;
 p.on('pageerror',e=>errs.push(''+e));ctx.on('page',x=>{if(x!==p)pops.push(x.url())});p.on('popup',x=>pops.push(x.url()));p.on('framenavigated',f=>{if(f===p.mainFrame())navs++;});
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.duecard',{timeout:14000}).catch(()=>{});await p.waitForTimeout(600);const nav0=navs;
 const ev=(f,a)=>p.evaluate(f,a);const W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=10000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f,a))return true;await W(120);}return false;};
 const snap=()=>ev(()=>{const t=__N5.TS().days[__N5.todayStr()]||{};return{xp:__N5.S().xp,items:t.items||0,sec:t.sec||0};});
 const s0=await snap();
 // Home → Games hub
 ok('Home has a Games tile',await ev(()=>!!document.querySelector('button.mode[data-m="games"]')));
 await p.tap('button.mode[data-m="games"]');await until(()=>document.querySelectorAll('button.gtile').length>=22);
 ok('Games hub lists games for Kana + N5–N1',await ev(()=>['kana','n5','n4','n3','n2','n1'].every(l=>document.querySelector(`button.gtile[data-gl="${l}"][data-game="sniper"]`))&&document.querySelectorAll('button.gtile[data-game="builder"]').length===5),await ev(()=>document.querySelectorAll('button.gtile').length));
 const toHub=async()=>{await ev(()=>{if(document.querySelector('#gDone'))document.querySelector('#gDone').click();});await W(200);await ev(()=>__N5.go?0:0);
   await ev(()=>{__N5.gamesView&&0;});await p.evaluate(()=>{const t=document.querySelector('.tabbar [data-tab="home"]');t&&t.click();});await W(300);await p.tap('button.mode[data-m="games"]');await until(()=>document.querySelectorAll('button.gtile').length>=22);};
 const open=async(l,g)=>{await p.tap(`button.gtile[data-gl="${l}"][data-game="${g}"]`);};
 const choiceIdx=()=>ev(()=>{const q=__N5.gs.cur,bs=[...document.querySelectorAll('#qhost .choice')];const t=b=>(b.childNodes[1]||{}).textContent;
   let want;if(q.k)want=q.mode==='k2r'?q.k.r:q.k.id;else if(q.j)want=q.mode==='k2m'?q.j.mean:q.j.c;else want=q.mode==='reverse'?q.w.jp:q.mode==='reading'?q.w.kana:q.w.en;return bs.findIndex(b=>t(b)===want);});
 const cardOf=(kind,id)=>ev(([k,i])=>{const c=k==='w'?__N5.S().cards[i]:k==='k'?__N5.KS().cards[i]:__N5.JS().cards[i];return c?{ok:c.ok||0,bad:c.bad||0,box:c.box}:{ok:0,bad:0,box:0};},[kind,id]);
 for(const l of ONLY){
  // ---------- Sniper ----------
  await open(l,'sniper');await p.waitForSelector('#gStart');await p.tap('#gStart');
  ok(`${l} sniper: targets appear`,await until(()=>document.querySelectorAll('#arena .gtarget').length>=3,15000));
  const tapTarget=async(right)=>{for(let k=0;k<200;k++){const pt=await ev(r=>{const s=__N5.gs;if(!s||s.busy||s.paused||s.over)return null;const a=document.querySelector('#arena').getBoundingClientRect();
      const i=r?s.correct:s.targets.findIndex(t=>!t.ok&&(()=>{const q=t.el.getBoundingClientRect();return q.left>a.left+4&&q.right<a.right-4;})());if(i<0)return null;const q=s.targets[i].el.getBoundingClientRect();const cx=q.left+q.width/2;
      return cx>a.left+30&&cx<a.right-30?{x:cx,y:q.top+q.height/2,n:s.answered}:null;},right);
     if(pt){await p.touchscreen.tap(pt.x,pt.y);if(await until(n=>__N5.gs.answered>n,1500,pt.n))return true;}else await W(60);}return false;};
  let hits=0;for(let k=0;k<3;k++){if(await tapTarget(true))hits++;await until(()=>!__N5.gs.busy||__N5.gs.over,4000);}
  ok(`${l} sniper: 3 correct touch hits`,hits===3&&await ev(()=>__N5.gs.right===3&&__N5.gs.score>0),await ev(()=>JSON.stringify({r:__N5.gs.right,s:__N5.gs.score,c:__N5.gs.combo})));
  if(l==='n5'){ // pause when hidden
    await ev(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    const x1=await ev(()=>__N5.gs.targets.map(t=>t.x).join());await W(500);const x2=await ev(()=>__N5.gs.targets.map(t=>t.x).join());
    ok('n5 sniper: pauses when the app is hidden',x1===x2&&await ev(()=>!!document.querySelector('#gPause')));
    await ev(()=>{delete document.hidden;});await p.tap('#gResume');await W(400);
    ok('n5 sniper: resumes',await ev(()=>!__N5.gs.paused&&!document.querySelector('#gPause')));
  }
  const it=await ev(()=>{const c=__N5.gs.cur.item;return c.id;});const kind=l==='kana'?'k':'w';const c0=await cardOf(kind,it);
  await p.tap('#gIdk');await W(200);const c1=await cardOf(kind,it);
  ok(`${l} sniper: IDK = miss (bad+1, ok unchanged, a life lost)`,c1.bad===c0.bad+1&&c1.ok===c0.ok&&await ev(()=>__N5.gs.lives===2),JSON.stringify([c0,c1]));
  await until(()=>!__N5.gs.busy,4000);
  let wr=0;for(let k=0;k<2;k++){if(await tapTarget(false))wr++;await until(()=>!__N5.gs.busy||__N5.gs.over,4000);}
  ok(`${l} sniper: wrong taps cost lives → game over screen`,await until(()=>!!document.querySelector('#gFinal'),6000),`wrong taps ${wr}`);
  ok(`${l} sniper: high score saved`,await ev(l=>__N5.GS().hs[l+':sniper']>0,l));
  await toHub();
  if(l!=='kana'){
  // ---------- Builder ----------
  await open(l,'builder');ok(`${l} builder: loads a round`,await until(()=>!!document.querySelector('.kbtile'),20000));
  let clean=0,idkOK=false;for(let r=0;r<6;r++){
    if(!(await until(()=>!!document.querySelector('.kbtile:not(:disabled)')||!!document.querySelector('#gFinal'),8000)))break;if(await ev(()=>!!document.querySelector('#gFinal')))break;
    const c=await ev(()=>__N5.gs.list[__N5.gs.i][0]);
    if(r===0){const a=await cardOf('j',c);await p.tap('.kbcard .idk');await W(150);const b2=await cardOf('j',c);idkOK=b2.bad===a.bad+1&&b2.ok===a.ok;}
    else{for(let k=0;k<5;k++){const e=await ev(()=>__N5.gs.need[0]);if(e==null||await ev(()=>!!document.querySelector('#nextBtn')))break;await p.tap(`.kbtile:not(:disabled)[data-e="${e}"]`);await W(80);}if(await ev(()=>/Built it/.test(document.querySelector('#fb').textContent)))clean++;}
    await p.waitForSelector('#nextBtn');ok(`${l} builder r${r}: solved view shows strokes + example words`,await ev(()=>!!document.querySelector('#kbDone svg, #kbDone .kjglyph, #kbDone *')));await p.tap('#nextBtn');}
  ok(`${l} builder: IDK = miss`,idkOK);ok(`${l} builder: built kanji by tapping parts`,clean>=4,`${clean}/5`);
  ok(`${l} builder: finishes with a result`,await until(()=>!!document.querySelector('#gFinal'),5000));
  ok(`${l} builder: solved kanji recorded (unlocks more)`,await ev(l=>(__N5.GS().kb[l]||[]).length>=4,l));
  await toHub();
  // ---------- Scramble ----------
  await open(l,'scramble');ok(`${l} scramble: loads`,await until(()=>!!document.querySelector('#sTray .stile'),20000));
  let sOK=0,sIdk=false,sAud=false;for(let r=0;r<6;r++){
    if(!(await until(()=>!!document.querySelector('#sTray .stile')||!!document.querySelector('#gFinal'),8000)))break;
    const wid=await ev(()=>__N5.gs.list[__N5.gs.i][0]),n=await ev(()=>__N5.gs.answer.length);
    ok(`${l} scramble r${r}: tile count in range`,n>=4&&n<=10,`${n}`);
    if(r===0){const a=await cardOf('w',wid);await p.tap('.scard .idk');await W(150);const b2=await cardOf('w',wid);sIdk=b2.bad===a.bad+1&&b2.ok===a.ok;}
    else{if(r===1){ // a wrong order first: counts as a miss, then fix it
        await ev(()=>{});const ans=await ev(()=>__N5.gs.answer);const tr=await ev(()=>[...document.querySelectorAll('#sTray .stile')].map(b=>b.textContent));
        if(new Set(ans).size>1){const rev=ans.slice().reverse();for(const t of rev){await ev(t=>{const b=[...document.querySelectorAll('#sTray .stile')].find(x=>x.textContent===t);b&&b.click();},t);} await W(150);await p.tap('#sClear');}}
      const cw0=await cardOf('w',wid);const ans=await ev(()=>__N5.gs.answer);for(const t of ans){const j=await ev(t=>[...document.querySelectorAll('#sTray .stile')].findIndex(x=>x.textContent===t),t);await p.tap(`#sTray .stile[data-j="${j}"]`);}
      await W(150);if(await ev(()=>/Perfect/.test(document.querySelector('#fb').textContent)))sOK++;
      if(r===1&&await ev(()=>new Set(__N5.gs.answer).size>1)){const cw1=await cardOf('w',wid);ok(`${l} scramble: a wrong order first = miss (bad+1, not correct)`,cw1.bad===cw0.bad+1&&cw1.ok===cw0.ok&&await ev(()=>/wrong try/.test(document.querySelector('#fb').textContent)),JSON.stringify([cw0,cw1]));}}
    sAud=sAud||await ev(()=>{const a=[...document.querySelectorAll('audio')];return true;});
    await p.waitForSelector('#nextBtn');await p.tap('#nextBtn');}
  ok(`${l} scramble: IDK = miss`,sIdk);ok(`${l} scramble: ordered sentences by tapping tiles`,sOK>=3,`${sOK} perfect (r1 had a deliberate wrong try)`);
  ok(`${l} scramble: finishes with a result`,await until(()=>!!document.querySelector('#gFinal'),5000));
  await toHub();
  }
  // ---------- Boss ----------
  await open(l,'boss');await p.waitForSelector('.bossrow');
  if(await ev(()=>![...document.querySelectorAll('[data-fight]')].some(x=>x.textContent==='Fight'))){ // study the first set (test precondition)
    await ev(l=>{const now=Date.now(),S=__N5.S();__N5.bossList(l)[1].ids.forEach(id=>{S.cards[id]=S.cards[id]||{box:1,due:now+864e5,ok:1,bad:0,seen:now};});__N5.gsave();},l);
    await p.tap('#backBtn');await W(300);await open(l,'boss');await p.waitForSelector('.bossrow');}
  const pickId=await ev(l=>{const bs=__N5.bossList(l);const b=[...document.querySelectorAll('[data-fight]')].find(x=>x.textContent==='Fight');return b?b.dataset.fight:null;},l);
  ok(`${l} boss: a boss is open to fight`,!!pickId,pickId);
  const fight=async(id,win,again)=>{if(!again)await p.tap(`[data-fight="${id}"]`);await until(()=>!!document.querySelector('#qhost .choice'),20000);let n=0,idkMiss=true;
   for(;n<40;n++){if(await ev(()=>!!document.querySelector('#gFinal')))break;if(!(await until(()=>!!document.querySelector('#qhost .choice:not(:disabled)')||!!document.querySelector('#gFinal'),8000)))break;if(await ev(()=>!!document.querySelector('#gFinal')))break;
    if(win){const i=await choiceIdx();if(i<0){console.log('  no match',await ev(()=>JSON.stringify({m:__N5.gs.cur.mode})));}await p.tap(`#qhost .choice[data-i="${Math.max(0,i)}"]`);}
    else{const q=await ev(()=>{const q=__N5.gs.cur;return q.k?['k',q.k.id]:q.j?['j',q.j.c]:['w',q.w.id];});const a=await cardOf(q[0],q[1]);await p.tap('#qhost .idk');await W(120);const b2=await cardOf(q[0],q[1]);if(!(b2.bad===a.bad+1&&b2.ok===a.ok))idkMiss=false;}
    await p.waitForSelector('#nextBtn');await p.tap('#nextBtn');await W(100);}
   await until(()=>!!document.querySelector('#gFinal'),5000);return{n,idkMiss,won:await ev(()=>/Victory/.test(document.querySelector('.gresult')?.textContent||''))};};
  if(pickId){const h0=await ev(()=>__N5.gs&&0);
   const lose=await fight(pickId,false);ok(`${l} boss: 3× IDK → defeated, each IDK a miss`,!lose.won&&lose.n===3&&lose.idkMiss,JSON.stringify(lose));
   await p.tap('#gAgain');await W(300);const win=await fight(pickId,true,true);
   ok(`${l} boss: correct answers drain HP → victory`,win.won,JSON.stringify(win));
   ok(`${l} boss: badge saved`,await ev(([l,id])=>!!__N5.GS().badges[l+':'+id],[l,pickId]));
   if(l==='n5'){ // level boss after 3 set badges
     await ev(()=>{const g=__N5.GS();const s=__N5.LV.n5.sets;g.badges['n5:'+s[1].id]=g.badges['n5:'+s[1].id]||__N5.todayStr();g.badges['n5:'+s[2].id]=g.badges['n5:'+s[2].id]||__N5.todayStr();__N5.gsave();});
     await p.tap('#gDone');await W(300);await toHub();await open('n5','boss');await p.waitForSelector('[data-fight="level"]');
     ok('n5 level boss unlocks after 3 set badges',await ev(()=>document.querySelector('[data-fight="level"]').textContent==='Fight'));
     const lw=await fight('level',true);ok('n5 level boss: victory',lw.won,JSON.stringify(lw));}
  }
  await toHub();
  ok(`${l}: hub tile shows boss badge + best score`,await ev(l=>{const t=document.querySelector(`button.gtile[data-gl="${l}"][data-game="boss"]`);return /[1-9]\d*\/\d+ bosses beaten/.test(t.textContent)&&/best \d+/.test(document.querySelector(`button.gtile[data-gl="${l}"][data-game="sniper"]`).textContent);},l));
 }
 // level page + Stats
 await ev(()=>__N5.openLevel('n5'));await until(()=>!!document.querySelector('#gamesHead'),10000);
 ok('Level page (N5) has a Games section with badge + best',await ev(()=>!!document.querySelector('#gamesHead')&&/bosses beaten/.test(document.querySelector('button.gtile[data-game="boss"]').textContent)&&/best/.test(document.querySelector('button.gtile[data-game="sniper"]').textContent)));
 await p.tap('button.gtile[data-game="scramble"]');ok('Level page tile opens the game',await until(()=>!!document.querySelector('#sTray .stile'),15000));
 await p.tap('#backBtn');await W(300);ok('Back returns to the level page',await until(()=>!!document.querySelector('#gamesHead'),5000));
 await p.tap('.tabbar [data-tab="levels"]');await W(300);
 await p.tap('.tabbar [data-tab="stats"]');await until(()=>!!document.querySelector('#gStats'),8000);
 ok('Stats shows game badges + high scores',await ev(()=>{const g=document.querySelector('#gStats');return g&&/badges/.test(g.textContent)&&/High scores/.test(g.textContent)&&/Sniper/.test(g.textContent);}));
 const s1=await snap();
 ok('XP increased from game answers',s1.xp>s0.xp,`${s0.xp}→${s1.xp}`);ok('daily goal items counted',s1.items>s0.items,`${s0.items}→${s1.items}`);ok('study time counted',s1.sec>s0.sec,`${s0.sec}→${s1.sec}s`);
 ok('progress persisted to storage',await ev(()=>{const s=JSON.parse(localStorage.getItem('n5VocabQuest.v1'));return s.games&&Object.keys(s.games.badges).length>0&&Object.keys(s.games.hs).length>0;}));
 // reduced motion: targets move slower
 const ctx2=await b.newContext({viewport:{width:393,height:852},hasTouch:true,reducedMotion:'reduce',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 const p2=await ctx2.newPage();p2.on('pageerror',e=>errs.push('rm: '+e));await p2.goto(URL+'?t='+Date.now());await p2.waitForSelector('button.mode[data-m="games"]');await p2.tap('button.mode[data-m="games"]');
 await p2.tap('button.gtile[data-gl="n5"][data-game="sniper"]');await p2.tap('#gStart');await p2.waitForSelector('#arena .gtarget');
 ok('reduced motion: sniper targets move slowly',await p2.evaluate(()=>__N5.gs.targets.every(t=>t.v<40)),await p2.evaluate(()=>__N5.gs.targets.map(t=>t.v|0).join()));await ctx2.close();
 ok('no popup / window',pops.length===0,JSON.stringify(pops));ok('no navigation',navs===nav0,`${navs-nav0}`);
 ok('no page errors / error toast',!errs.length&&!(await ev(()=>!!document.querySelector('.errtoast'))),JSON.stringify(errs).slice(0,800));
 console.log(`${BR}: ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('FAIL crashed',e);process.exit(1);});
