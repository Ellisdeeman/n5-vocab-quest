const pw=require('playwright-core');const fs=require('fs');const root=r=>fs.writeFileSync('/tmp/swt/ROOT',r);
(async()=>{root('old3');const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const ctx=await b.newContext();const p=await ctx.newPage();
await p.goto('http://localhost:8768/');await p.evaluate(()=>navigator.serviceWorker.ready);await p.reload();await p.waitForTimeout(1000);
root('new');
console.log(await p.evaluate(async()=>{const t=await (await fetch('sw.js',{cache:'no-store'})).text();const r=await navigator.serviceWorker.getRegistration();let err=null;try{await r.update();}catch(e){err=String(e)}await new Promise(z=>setTimeout(z,3000));return {v:t.match(/page-v\d/)[0],err,inst:!!r.installing,wait:!!r.waiting,act:r.active&&r.active.state,keys:await caches.keys()}}));
await b.close();})();
