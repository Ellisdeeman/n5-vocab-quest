// screenshots: PREFIX=before|after URL=...
const pw=require('playwright-core');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const PRE=process.env.PREFIX||'after';const OUT=process.env.OUT||'/workspace/n5-game/';const W=+(process.env.W||393);
(async()=>{const BR=process.env.BROWSER||'chromium';const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['dark','light']){
  const ctx=await b.newContext({viewport:{width:W,height:852},deviceScaleFactor:2,hasTouch:true,...(BR==='chromium'?{isMobile:true}:{}),colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block'});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.duecard');await p.waitForTimeout(1500);
  const sh=async n=>{await p.waitForTimeout(700);await p.screenshot({path:`${OUT}shot-style-${PRE}-${scheme}-${n}.png`});};
  await sh('home');
  await p.tap('[data-m="meaning"]');await p.waitForSelector('#qhost .choice');await sh('quiz');
  await p.tap('#qhost .choice');await p.waitForTimeout(300);await sh('quiz-answer');
  await p.tap('#backBtn');await p.waitForTimeout(500);if(await p.$('#backBtn'))await p.tap('#backBtn');
  await p.evaluate(()=>__N5.openLevel('n5'));await p.waitForTimeout(1500);await sh('level');
  await p.tap('#kjOpen');await p.waitForSelector('.kjtile');await p.waitForTimeout(500);await p.tap('.kjtile');await p.waitForSelector('.kjbox');await p.waitForTimeout(3500);await sh('kanji');
  await ctx.close();}
 await b.close();console.log('shots done',PRE);})();
