const pw=require('playwright-core');
(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(''+e));
await p.goto('http://localhost:8766/?t='+Date.now());await p.waitForTimeout(1200);
const r=await p.evaluate(async()=>{const o={};for(const n of __N5.SFX_NAMES){o[n]={a:await __N5.sfxRender(n,'analog'),c:await __N5.sfxRender(n,'classic')};}return o;});
for(const n in r){const f=x=>`dur ${x.dur.toFixed(2)} pk ${x.peak.toFixed(2)} atk ${x.attack3ms.toFixed(2)} hf ${x.hf.toFixed(4)}`;console.log(n.padEnd(7),'A',f(r[n].a),' | C',f(r[n].c));}
console.log('errs',errs);await b.close();})();
