// Regression: Home "Due Reviews" card + "Review due" button with a long-time profile (vocab across N5+N4, kanji, leeches, kana due,
// 177 reviewed today, audio lesson opened). Must reach the Review list and render a real quiz question; no popup, no navigation.
const pw=require('playwright-core');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const net of ['normal','slow','hang']){
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:3,hasTouch:true,colorScheme:'dark',timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[],pops=[];let navs=0;
  p.on('pageerror',e=>errs.push(''+e));ctx.on('page',x=>{if(x!==p)pops.push(x.url())});p.on('popup',x=>pops.push(x.url()));p.on('framenavigated',f=>{if(f===p.mainFrame())navs++;});
  if(net==='slow')await p.route(/data\/(n4|kanji-n5)\.json/,async r=>{await new Promise(z=>setTimeout(z,3000));r.continue();});
  if(net==='hang')await p.route(/data\/n4\.json/,()=>{});   // never answers
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.duecard',{timeout:14000}).catch(()=>{});await p.waitForTimeout(800);const nav0=navs;
  const ev=f=>p.evaluate(f);
  const listShown=async(ms)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(()=>!!document.querySelector('[data-review="all"]')))return Date.now()-t0;await p.waitForTimeout(250);}return -1;};
  const qShown=async()=>{for(let i=0;i<40;i++){if(await ev(()=>!!document.querySelector('#qhost .choice, #qhost #typein, #qhost #kjGot, #qhost .kchoice')))return true;await p.waitForTimeout(250);}return false;};
  const leave=async()=>{for(let i=0;i<4&&await ev(()=>document.body.classList.contains('studying'));i++){await p.tap('#backBtn');await p.waitForTimeout(400);}};
  const lim=net==='hang'?12500:net==='slow'?6000:4000;
  ok(`${net}: Home shows the Due Reviews card with a count`,await ev(()=>/Due Reviews\s*\d+/.test((document.querySelector('.duecard')||{}).textContent||'')));
  ok(`${net}: audio lesson is in the opened state`,await ev(()=>!!document.querySelector('#alDone')));
  // 1) the Due Reviews card
  await p.tap('.duecard');let t=await listShown(lim);
  ok(`${net}: Due Reviews card → Review list (not stuck on Loading…)`,t>=0,`${t} ms`);
  ok(`${net}: Review tab highlighted`,await ev(()=>(document.querySelector('.tabbar button.on')||{}).dataset?.tab==='review'));
  if(t>=0){await p.tap('[data-review="all"]');ok(`${net}: Review everything due → a quiz question renders`,await qShown());}
  if(net!=='hang'){
  // 2) the "Review due" button (today's path session done)
  await ev(()=>{const D=__N5.ensureDaily('path');D.done=true;D.pos=D.items.length;});
  await leave();await p.tap('.tabbar [data-tab="home"]');await p.waitForTimeout(600);
  const btn=await ev(()=>(document.querySelector('#dailyBtn')||{}).textContent);
  ok(`${net}: path done → "Review due" button`,/Review due/.test(btn||''),btn);
  await p.tap('#dailyBtn');t=await listShown(lim);ok(`${net}: Review due → Review list`,t>=0,`${t} ms`);
  if(t>=0){await p.tap('[data-review="all"]');ok(`${net}: …then a quiz question renders`,await qShown());}
  }
  // 3) Review tab still works
  await leave();await p.tap('.tabbar [data-tab="home"]');await p.waitForTimeout(400);await p.tap('.tabbar [data-tab="review"]');ok(`${net}: Review tab → list`,await listShown(lim)>=0);
  ok(`${net}: no popup / window`,pops.length===0,JSON.stringify(pops));ok(`${net}: no navigation`,navs===nav0,`${navs-nav0}`);
  ok(`${net}: no page errors / error toast`,!errs.length&&!(await ev(()=>!!document.querySelector('.errtoast'))),JSON.stringify(errs));
  await ctx.close();}
 // leaving the Review screen while it is still loading must not pull you back
 {const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();await p.route(/data\/n4\.json/,async r=>{await new Promise(z=>setTimeout(z,2500));r.continue();});
  await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(1500);await p.tap('.duecard');await p.waitForTimeout(300);await p.tap('.tabbar [data-tab="stats"]');await p.waitForTimeout(3500);
  ok('leaving during load: stays on Stats',await p.evaluate(()=>(document.querySelector('.tabbar button.on')||{}).dataset?.tab==='stats'&&!document.querySelector('[data-review="all"]')));await ctx.close();}
 await b.close();console.log('SUMMARY',BR,R.filter(Boolean).length,'/',R.length);process.exit(R.every(Boolean)?0:1);})();
