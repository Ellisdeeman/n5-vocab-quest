// Screenshots of Backup & Sync (dark + light) → /workspace/n5-game/shot-sync-<scheme>-<name>.png (fake token, no network)
const pw=require('playwright-core');const seed=require('./seed.js');const URL=process.env.URL||'http://localhost:8766/';
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['dark','light']){const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,isMobile:true,colorScheme:scheme,serviceWorkers:'block'});
  await ctx.route(/api\.github\.com/,r=>r.abort());await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}`);
  const p=await ctx.newPage();await p.goto(URL);await p.waitForSelector('.duecard');await p.waitForTimeout(700);const shot=async n=>{await p.waitForTimeout(300);await p.screenshot({path:`/workspace/n5-game/shot-sync-${scheme}-${n}.png`});};
  await p.tap('.tabbar [data-tab="settings"]');await p.evaluate(()=>document.querySelector('#bkSec').scrollIntoView());await shot('settings');
  await p.evaluate(()=>{const d=document.querySelector('.tokhelp');d.open=true;d.scrollIntoView();});await shot('token-help');
  await p.evaluate(()=>{const y=__N5.SY;y.token='ghp_'+'x'.repeat(32)+'Ab12';y.gistId='a1b2c3d4e5f6';y.lastSync=Date.now()-5*60e3;});await p.tap('.tabbar [data-tab="home"]');await p.tap('.tabbar [data-tab="settings"]');
  await p.evaluate(()=>document.querySelector('#bkSec').scrollIntoView());await shot('synced');
  const bk=await p.evaluate(()=>JSON.stringify(__N5.buildPayload('backup')));await p.setInputFiles('#bkFile',{name:'b.json',mimeType:'application/json',buffer:Buffer.from(bk)});await p.waitForSelector('#bkPreview');await shot('restore-preview');
  await ctx.close();}
 await b.close();console.log('done');})();
