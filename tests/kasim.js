// autoplayer: tuning + used by the run test. strategy: best word; discard if nothing ≥ threshold; buy jokers/planets
const pw=require('playwright-core');const BR=process.env.BROWSER||'chromium';const URL=process.env.URL||'http://localhost:8770/';
(async()=>{const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const res=[];
for(const seed of (process.env.SEEDS||'1,2,3,4,5').split(',').map(Number)){
const ctx=await b.newContext({viewport:{width:375,height:667},serviceWorkers:'block'});
await ctx.addInitScript((lvl)=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
 for(let i=0;i<(+lvl||300);i++)cards[i]={box:2,due:now+3*D,ok:3,bad:1,f:{st:2,sp:null,s:4,d:5,lr:now-6*D,due:now+3*D}};
 localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],newLimit:'off',sound:false}));},process.env.SEEN||'300');
const p=await ctx.newPage();p.on('console',m=>{if(process.env.DBG)console.log(m.text())});p.on('pageerror',e=>console.log('PE',e.message));const errs=[];p.on('pageerror',e=>errs.push(''+e));
await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(600);
const r=await p.evaluate(async([seed,acc,BOT,TG])=>{window.__kaFast=true;window.__BOT=BOT;if(TG)window.__kaTargets=JSON.parse(TG);window.__kaSeed=seed;__N5.gOpen('n5','kanaatro',__N5.home);
 const W=ms=>new Promise(r=>setTimeout(r,ms));const until=async(f,ms=5000)=>{const t=Date.now();while(Date.now()-t<ms){if(f())return true;await W(10);}return false;};
 await until(()=>document.querySelector('#kaStart'));document.querySelector('#kaStart').click();
 await until(()=>document.querySelector('#kaGo'));let log=[];
 for(let step=0;step<20000;step++){const K=__N5.KA;if(step%200==0)console.log('st',step,K.phase,K.ante,K.blind,K.busy,K.hands,K.score,K.boss,JSON.stringify(__N5.kaPossible(K).slice(0,2)),K.hand.map(t=>t.ch).join(''),JSON.stringify(__N5.kaLookup(K)));
  if(K.phase==='summary'||K.phase==='won')break;
  if(K.phase==='blind'){document.querySelector('#kaGo').click();await W(30);continue;}
  if(K.phase==='cash'){await until(()=>document.querySelector('#kaCash'));document.querySelector('#kaCash')?.click();await W(30);continue;}
  if(K.phase==='shop'){for(let i=0;i<4;i++){const o=K.offers[i];if(o&&!o.sold&&K.money>=o.cost&&(o.k==='joker'||o.k==='voucher'||o.c.t==='planet'))__N5.kaBuy(K,i);}
    while(K.cons.length){if(K.cons[0].t==='planet')__N5.kaUseCon(K,0);else K.cons.shift();}
    document.querySelector('#kaNext').click();await W(30);continue;}
  if(K.phase==='play'){if(K.busy){await W(15);continue;}
   const KN={n5:1,n4:.8,n3:.5,n2:.3,n1:.15};const knows=x=>window.__BOT==='full'||((x.id*2654435761>>>0)%1000)/1000<KN[__N5.WORDS[x.id].lvl];const ps=__N5.kaPossible(K).filter(knows);const need=__N5.kaTarget(K)-K.score;
   if((!ps.length||ps[0].score<Math.min(need,60))&&K.discards>0){const keep=new Set(ps[0]?ps[0].seq:[]);K.sel=K.hand.map((t,i)=>i).filter(i=>!keep.has(i)).slice(0,5).map(i=>K.hand[i].id);document.querySelector('#kaDiscard').disabled=false;document.querySelector('#kaDiscard').click();await W(40);continue;}
   if(!ps.length){K.sel=[K.hand[0].id];K.hands=0;log.push('stuck');break;}
   K.sel=ps[0].seq.map(i=>K.hand[i].id);document.querySelector('#kaPlay').disabled=false;document.querySelector('#kaPlay').click();
   await until(()=>K.mc&&document.querySelector('#kaMC'));const ok=Math.random()<acc;K.mc.choose(ok?K.mc.right:(K.mc.right+1)%4);
   await until(()=>!K.busy||K.phase!=='play',8000);log.push(ps[0].key+':'+(K.lastScore&&K.lastScore.total));K.mc=null;continue;}
  await W(20);}
 const K=__N5.KA;return {ante:K.ante,blind:K.blind,phase:K.phase,total:K.total,jokers:K.jokers.map(j=>j.id),lv:K.lv,words:K.stats.words.length,last:log.slice(-6)};},[seed,+(process.env.ACC||0.9),process.env.BOT||"real",process.env.TG||""]);
res.push({seed,...r,errs:errs.slice(0,3)});await ctx.close();}
console.log(res.map(x=>JSON.stringify(x)).join('\n'));await b.close();})();
