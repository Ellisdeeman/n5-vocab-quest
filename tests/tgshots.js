// Screenshots of the game screens (dark + light) → /workspace/n5-game/shot-game-<scheme>-<name>.png
const pw=require('playwright-core');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'chromium';const OUT=process.env.OUT||'/workspace/n5-game/shot-game-';
(async()=>{const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['dark','light']){
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.duecard');await p.waitForTimeout(800);
  const W=ms=>p.waitForTimeout(ms);const shot=async n=>{await W(350);await p.screenshot({path:`${OUT}${scheme}-${n}.png`});console.log('saved',n);};
  await p.tap('button.mode[data-m="games"]');await shot('hub');
  await p.tap('button.gtile[data-gl="n5"][data-game="sniper"]');await p.tap('#gStart');await p.waitForSelector('#arena .gtarget');await W(1300);
  await p.evaluate(()=>__N5.gs.busy=true);await shot('sniper');await p.evaluate(()=>__N5.gs.busy=false);
  await p.tap('#backBtn');await W(300);await p.tap('button.gtile[data-gl="n5"][data-game="builder"]');await p.waitForSelector('.kbtile');
  const e=await p.evaluate(()=>__N5.gs.need[0]);await p.tap(`.kbtile[data-e="${e}"]`);await shot('builder');
  const e2=await p.evaluate(()=>__N5.gs.need[0]);await p.tap(`.kbtile:not(:disabled)[data-e="${e2}"]`);await W(1600);if(await p.$('.kbtile:not(:disabled)')&&!(await p.$('#nextBtn')))await p.tap('.kbcard .idk');await W(1500);await shot('builder-solved');
  await p.tap('#backBtn');await W(300);await p.tap('button.gtile[data-gl="n5"][data-game="scramble"]');await p.waitForSelector('#sTray .stile');
  const a=await p.evaluate(()=>__N5.gs.answer);for(const t of a.slice(0,2)){await p.evaluate(t=>[...document.querySelectorAll('#sTray .stile')].find(x=>x.textContent===t).click(),t);}await shot('scramble');
  for(const t of a.slice(2)){await p.evaluate(t=>[...document.querySelectorAll('#sTray .stile')].find(x=>x.textContent===t).click(),t);}await shot('scramble-solved');
  await p.tap('#backBtn');await W(300);await p.tap('button.gtile[data-gl="n5"][data-game="boss"]');await p.waitForSelector('.bossrow');await shot('boss-list');
  await p.tap('[data-fight]:not(.ghost)');await p.waitForSelector('#qhost .choice');await shot('boss-fight');
  await p.evaluate(()=>{const q=__N5.gs.cur,bs=[...document.querySelectorAll('#qhost .choice')];const t=b=>(b.childNodes[1]||{}).textContent;let w;if(q.j)w=q.mode==='k2m'?q.j.mean:q.j.c;else w=q.mode==='reverse'?q.w.jp:q.mode==='reading'?q.w.kana:q.w.en;(bs.find(b=>t(b)===w)||bs[0]).click();});await W(500);await shot('boss-hit');
  await p.tap('#backBtn');await W(300);await p.evaluate(()=>__N5.openLevel('n5'));await p.waitForSelector('#gamesHead');await p.evaluate(()=>document.querySelector('#gamesHead').scrollIntoView());await shot('level');
  await ctx.close();}
 await b.close();})().catch(e=>{console.log('ERR',e);process.exit(1);});
