// All-words map test (touch, iPhone sizes). BROWSER=webkit|chromium URL=... SHOTS=1 saves /workspace/n5-game/shot-allmap-*.png
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const SHOTS=process.env.SHOTS;
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const [W,H,scheme] of [[375,667,'light'],[393,852,'dark']]){
 const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:3,hasTouch:true,colorScheme:scheme,serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),c={};
  // N5 ids 0..6 → box 0..6 (not due), id 7 due now (box 3), id 8 leech (box 1), N3 id 20005 mastered (level not loaded), Pimsleur 50000 box 2
  for(let i=0;i<=6;i++)c[i]={box:i,due:now+864e5,ok:i,bad:0,t:now};c[7]={box:3,due:now-6e4,ok:3,bad:0,t:now};c[8]={box:1,due:now+864e5,ok:1,bad:5,lapses:2,run:0,t:now};
  c[20005]={box:4,due:now+9e8,ok:6,bad:0,t:now};c[50000]={box:2,due:now+9e8,ok:2,bad:0,t:now};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,levels:['n5']}));
  localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'あ':{box:5,due:now-1000,ok:5,bad:0}}}));
  localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:{'日':{box:3,due:now+9e8,ok:3,bad:0,l:'n5'}}}));});
 const p=await ctx.newPage();p.setDefaultTimeout(12000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(900);
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};const tag=`${BR} ${W}px ${scheme}`;
 await tap('#tabStats');await p.waitForSelector('#amOpen');
 ok(`${tag}: Stats shows the All words card with totals`,/mastered/.test(await p.textContent('.ammini')));
 await tap('#amOpen');await p.waitForSelector('#amCanvas');await p.waitForTimeout(200);
 const V=()=>ev(()=>{const v=__N5.amap();return {first:v.firstMs,secs:v.secs.map(s=>({key:s.key,n:s.n,len:s.ids.length})),z:__N5.AMS.z,total:v.total,H:v.H,draws:v.draws};});
 let v=await V();
 ok(`${tag}: first render < 500 ms (${v.first.toFixed(0)} ms)`,v.first<500);
 const exp=await ev(()=>({kana:__N5.KALL.filter(id=>__N5.KITEMS[id].g!=='ext'||__N5.KS().ext).length,n5:718,n4:666,n3:2140,n2:1809,n1:2699,pm:__N5.PIMS.pm.length}));
 ok(`${tag}: tile counts match the data`,JSON.stringify(Object.fromEntries(v.secs.map(s=>[s.key,s.n])))===JSON.stringify(exp),JSON.stringify(v.secs)+' vs '+JSON.stringify(exp));
 const totN=Object.values(exp).reduce((a,b)=>a+b,0);
 ok(`${tag}: header total "x / ${totN.toLocaleString('en-US')} mastered"`,(await p.textContent('#amTot')).includes('/ '+totN.toLocaleString('en-US')+' mastered'),await p.textContent('#amTot'));
 ok(`${tag}: canvas is devicePixelRatio aware and viewport-sized (not the whole map)`,await ev(()=>{const c=document.querySelector('#amCanvas'),v=__N5.amap();return c.width===Math.round(v.W*Math.min(3,devicePixelRatio))&&c.height<=Math.round((innerHeight)*3)&&v.total>v.H;}));
 ok(`${tag}: no 10k DOM nodes (map screen < 400 elements)`,await ev(()=>document.querySelectorAll('#view *').length<400),await ev(()=>document.querySelectorAll('#view *').length));
 // scroll a tile into view, return its page-space center + canvas pixel
 const show=async(key,id)=>ev(async([key,id])=>{const v=__N5.amap(),r=v.rectOf(key,id);if(!r)return null;const host=document.querySelector('#amHost'),cv=document.querySelector('#amCanvas');
   const hostTop=host.getBoundingClientRect().top+scrollY,st=parseFloat(cv.style.top)||0;scrollTo(0,Math.max(0,hostTop-st+r.y-v.H/2));await new Promise(r=>setTimeout(r,60));v.draw();
   const cr=cv.getBoundingClientRect(),y=r.y-v.off;if(y<0||y+r.t>v.H)return {off:true};const dpr=cv.width/cr.width,px=cv.getContext('2d').getImageData(Math.round((r.x+r.t*.3)*dpr),Math.round((y+r.t*.72)*dpr),1,1).data;
   return {cx:cr.left+r.x+r.t/2,cy:cr.top+y+r.t/2,px:[...px],t:r.t};},[key,id]);
 const cssRGB=async(v)=>ev(v=>{const d=document.createElement('div');d.style.color=getComputedStyle(document.documentElement).getPropertyValue(v);document.body.appendChild(d);const c=getComputedStyle(d).color;d.remove();return c.match(/[\d.]+/g).map(Number);},v);
 const near=(a,b,t=10)=>Math.abs(a[0]-b[0])<=t&&Math.abs(a[1]-b[1])<=t&&Math.abs(a[2]-b[2])<=t;
 const samples=[['n5',1,'--s1',255],['n5',2,'--s2',255],['n5',3,'--s3',255],['n5',4,'--s4',255],['n5',5,'--s5',255],['n5',6,'--s5',255],['n5',0,'--s1',115],['n3',20005,'--s4',255],['pm',50000,'--s2',255],['kana','あ','--s5',255]];   // same scale as the N5 map: box n → --s{n}, box 0 seen = faint --s1
 for(const [key,id,v,a] of samples){const s=await show(key,id);const want=await cssRGB(v);
  ok(`${tag}: colour matches SRS state · ${key} ${id} (${v}${a<255?' seen':''})`,s&&!s.off&&near(s.px,want)&&Math.abs(s.px[3]-a)<=12,JSON.stringify({s,want}));}
 const un=await show('n5',100);ok(`${tag}: unseen tile uses the "new" colour`,un&&un.px[3]<90&&un.px[3]>20,JSON.stringify(un));
 ok(`${tag}: due marker + leech flag in status`,await ev(()=>{const v=__N5.amap(),s=v.secs.find(x=>x.key==='n5');return !!(s.st[7]&16)&&!!(s.st[8]&32)&&!(s.st[1]&16);}));
 // tap → detail sheet of the right word
 for(const [key,id] of [['n5',4],['n5',123],['kana','あ'],['n3',20005],['pm',50000]]){const s=await show(key,id);await p.touchscreen.tap(s.cx,s.cy);await p.waitForSelector('.amsheet .btnrow');
  const got=await ev(()=>{const m=document.querySelector('.amsheet');return {k:m.dataset.kind,id:m.dataset.id,txt:m.textContent};});
  const w=await ev(id=>typeof id==='number'&&__N5.WORDS[id]?__N5.WORDS[id].jp:String(id),id);
  ok(`${tag}: tap opens the right item · ${key} ${id}`,got.id===String(id)&&got.txt.includes(w),JSON.stringify(got).slice(0,200));
  if(key==='n5'&&id===4){ok(`${tag}: sheet shows reading, meaning, SRS status, Listen + Study now`,/box 4\/6/.test(got.txt)&&/Mastered/.test(got.txt)&&!!(await p.$('#amSay'))&&!!(await p.$('#amStudy')));
   if(SHOTS){await p.waitForTimeout(900);await p.screenshot({path:`/workspace/n5-game/shot-allmap-sheet-${scheme}.png`});}}
  if(key==='n3')ok(`${tag}: tapping a word in a level that isn't loaded loads its details`,await ev(()=>__N5.LV.n3.loaded));
  await tap('#amClose');}
 // Study now
 {const s=await show('n5',123);await p.touchscreen.tap(s.cx,s.cy);await p.waitForSelector('#amStudy');await tap('#amStudy');await p.waitForSelector('#qhost');
  ok(`${tag}: Study now starts a session on that word`,await ev(()=>!!document.querySelector('#qhost .choice, #qhost input')));
  await tap('#backBtn');if(await p.$('body.studying'))await tap('#backBtn');await p.waitForSelector('#amCanvas');}
 // filters
 const cnt=async st=>{await tap(`#amSt [data-st="${st}"]`);await p.waitForSelector('#amCanvas');return ev(()=>__N5.amap().secs.reduce((n,s)=>n+s.n,0));};
 ok(`${tag}: filter due now`,await cnt('due')===2,'');   // id 7 + あ
 ok(`${tag}: filter leeches`,await cnt('leech')===1);
 ok(`${tag}: filter mastered`,await cnt('mast')===5);   // box ≥4: ids 4,5,6 + 20005 + あ
 ok(`${tag}: filter unseen`,await cnt('unseen')===totN-12);
 await tap('#amSt [data-st="all"]');
 await tap('#amLv [data-lv="n3"]');ok(`${tag}: level filter shows only N3`,await ev(()=>{const s=__N5.amap().secs;return s.length===1&&s[0].key==='n3'&&s[0].n===2140;}));
 await tap('#amKj');ok(`${tag}: kanji toggle adds N3 kanji section`,await ev(()=>__N5.amap().secs.some(s=>s.key==='kanji:n3'&&s.n===__N5.KJINFO.n3.chars.length)));
 await tap('#amLv [data-lv="all"]');const kj=await ev(()=>({got:__N5.amap().secs.filter(s=>s.kind==='j').reduce((n,s)=>n+s.n,0),exp:['n5','n4','n3','n2','n1'].reduce((n,l)=>n+[...__N5.KJINFO[l].chars].length,0)}));
 ok(`${tag}: all levels + kanji: ${kj.exp} kanji tiles`,kj.got===kj.exp&&kj.exp>2000,JSON.stringify(kj));
 {const s=await show('kanji:n5','日');const want=await cssRGB('--s3');ok(`${tag}: kanji tile colour matches (日 box 3)`,s&&near(s.px,want),JSON.stringify(s));
  await p.touchscreen.tap(s.cx,s.cy);await p.waitForSelector('.amsheet .btnrow');ok(`${tag}: tap kanji opens it`,(await ev(()=>document.querySelector('.amsheet').dataset.id))==='日');await tap('#amClose');}
 await tap('#amKj');
 // zoom: buttons, anchoring, pinch
 await ev(()=>scrollTo(0,0));await tap('#amIn');v=await V();ok(`${tag}: + zoom → medium tiles`,v.z===1&&(await ev(()=>__N5.amap().t))===15);
 if(SHOTS)await p.screenshot({path:`/workspace/n5-game/shot-allmap-zoom1-${scheme}.png`});
 {const s=await show('n5',300);await tap('#amIn');const r=await ev(()=>{const v=__N5.amap(),r=v.rectOf('n5',300);return {y:r.y-v.off,H:v.H,t:v.t};});
  ok(`${tag}: zoom keeps the centred tile on screen`,r.t===28&&r.y>-28&&r.y<r.H,JSON.stringify(r));}
 ok(`${tag}: + disabled at max zoom`,await ev(()=>document.querySelector('#amIn').disabled));
 if(SHOTS)await p.screenshot({path:`/workspace/n5-game/shot-allmap-zoom2-${scheme}.png`});
 {const s=await show('kana','あ');await p.touchscreen.tap(s.cx,s.cy);await p.waitForSelector('.amsheet');ok(`${tag}: tap is accurate at big tiles`,(await ev(()=>document.querySelector('.amsheet').dataset.id))==='あ');await tap('#amClose');}
 await tap('#amOut');await tap('#amOut');ok(`${tag}: − zoom back to small`,(await V()).z===0);
 const pinch=await ev(()=>{try{const c=document.querySelector('#amCanvas'),r=c.getBoundingClientRect(),mk=(id,x,y)=>new Touch({identifier:id,target:c,clientX:x,clientY:y});
   const fire=(type,a,b2)=>c.dispatchEvent(new TouchEvent(type,{touches:a,targetTouches:a,changedTouches:a,bubbles:true,cancelable:true}));
   const cx=r.left+r.width/2,cy=r.top+100;fire('touchstart',[mk(1,cx-20,cy),mk(2,cx+20,cy)]);fire('touchmove',[mk(1,cx-40,cy),mk(2,cx+40,cy)]);fire('touchend',[]);return __N5.AMS.z;}catch(e){return 'unsupported: '+e.message;}});
 if(typeof pinch==='number')ok(`${tag}: pinch out zooms in one step`,pinch===1,String(pinch));else console.log('NOTE pinch synthetic touch',pinch);
 if(typeof pinch==='number'&&pinch===1)await tap('#amOut');
 // smooth scrolling: each redraw is cheap, and redraws happen only on change
 const perf=await ev(async()=>{const v=__N5.amap(),t=[];for(let i=0;i<30;i++){scrollTo(0,i*120);const a=performance.now();v.draw();t.push(performance.now()-a);}t.sort((a,b)=>a-b);const d0=v.draws;await new Promise(r=>setTimeout(r,600));return {med:t[15],max:t[29],idle:v.draws-d0};});
 ok(`${tag}: redraw per scroll step fast (median ${perf.med.toFixed(1)} ms, max ${perf.max.toFixed(1)} ms)`,perf.med<8&&perf.max<30);
 ok(`${tag}: no redraws while idle`,perf.idle<=1,JSON.stringify(perf));
 await ev(()=>scrollTo(0,0));if(SHOTS){await p.waitForTimeout(200);await p.screenshot({path:`/workspace/n5-game/shot-allmap-${scheme}.png`});}
 ok(`${tag}: no horizontal overflow`,await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 const tgt=await ev(()=>[...document.querySelectorAll('.amchip,.amzoom')].filter(b=>b.getBoundingClientRect().height<53.5||b.getBoundingClientRect().width<53.5).length);ok(`${tag}: controls are ≥54px targets`,tgt===0,String(tgt));
 ok(`${tag}: controls bar stays on screen while scrolling`,await ev(async()=>{scrollTo(0,3000);await new Promise(r=>setTimeout(r,100));const r=document.querySelector('#amCtl').getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight/2;}));
 ok(`${tag}: no page errors`,errs.length===0,JSON.stringify(errs.slice(0,3)));
 await ctx.close();}
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,600));process.exit(1)});
