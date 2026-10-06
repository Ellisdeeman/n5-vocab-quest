// Grammar screenshots (Batch 2) → /workspace/n5-game/shot-grammar-<name>.png  (iPhone size, touch)
const pw=require('playwright-core');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const OUT='/workspace/n5-game/shot-grammar-';
(async()=>{const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['light','dark']){
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,serviceWorkers:'block',timezoneId:'America/New_York',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.duecard');await p.waitForTimeout(900);
  const W=ms=>p.waitForTimeout(ms);const sfx=scheme==='dark'?'-dark':'';
  const shot=async(n,full)=>{await W(400);await p.screenshot({path:`${OUT}${n}${sfx}.png`,fullPage:!!full});console.log('saved',`${OUT}${n}${sfx}.png`);};
  await p.tap('button.mode[data-m="grammar"]');await p.waitForSelector('.grrow');await shot('list');
  await p.evaluate(()=>__N5.go(()=>__N5.grLesson('wa')));await p.waitForSelector('#grLesson');await shot('lesson');
  await p.evaluate(()=>__N5.go(()=>__N5.grSession(['tekudasai'],'practice','Grammar',__N5.grammarHome)));await p.waitForSelector('#qhost .grcard');await shot('drill');
  // walk to a particle + sentence-order drill if available
  for(let i=0;i<4;i++){const k=await p.evaluate(()=>document.querySelector('#qhost .grcard')?.dataset.k);
   if(k==='o'&&!sfx){await p.tap('#grPool .grtile');await W(300);await shot('drill-order');}
   if(k==='p'&&!sfx){await shot('drill-particle');await p.tap('#qhost .choice');await W(400);await shot('drill-particle-answered');}
   if(!(await p.$('#nextBtn'))){const g=await p.$('#giveBtn');if(g)await p.tap('#giveBtn');else{const c=await p.$('#qhost .choice');if(c)await p.tap('#qhost .choice');}await W(400);}
   if(!(await p.$('#nextBtn')))break;await p.tap('#nextBtn');await W(400);if(await p.$('#grFinish'))break;}
  await ctx.close();}
 await b.close();})().catch(e=>{console.error('CRASH',e);process.exit(1);});
