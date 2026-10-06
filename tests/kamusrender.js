const pw=require('playwright-core'),fs=require('fs');(async()=>{const b=await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const p=await b.newPage();
await p.goto('http://localhost:8766/?t='+Date.now());await p.waitForSelector('.tabbar');
for(const v of ['normal','boss','shop']){const r=await p.evaluate(v=>__N5.kmRender(v,30,true),v);fs.writeFileSync(`/workspace/n5-game/kanaatro-music-${v}.wav`,Buffer.from(r.wav,'base64'));delete r.wav;console.log(v,JSON.stringify(r));}await b.close();})();
