// Memory (FSRS) stats: values vs an independent computation on a fixed fixture (per level / All, 4 tracks),
// true retention from the review log, charts render, toggles, hardest list → word detail, speed with ~8,300 items,
// review log recorded on real grading + merged on sync. iPhone size, light + dark.
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const D=864e5;
function fixture(now){let x=11;const rnd=()=>(x=(x*1103515245+12345)%2147483648)/2147483648;const cards={},kana={},kj={};
 for(let i=0;i<300;i++){const st=i%10===0?1:i%13===0?3:2,s=+(0.3+rnd()*500).toFixed(3),d=+(1+rnd()*9).toFixed(3),lr=now-Math.floor(rnd()*20)*D-3600e3,due=now+Math.floor((rnd()*40-5)*D);
  const id=(i<200?i:10000+(i-200));cards[id]={box:2,due,ok:3,bad:1,lapses:i%7===0?(i%3)+1:0,f:{st,sp:st===2?null:0,s,d,lr,due}};
  if(i%4===0)cards[id].L={st:2,sp:null,s:+(s/2).toFixed(3),d,lr,due:due+D};}
 'あいうえおかきくけこ'.split('').forEach((k,i)=>kana[k]={box:2,due:now+i*D,ok:2,bad:0,lapses:i%2,f:{st:2,sp:null,s:2+i,d:3+i/2,lr:now-D,due:now+i*D}});
 '一二三四五'.split('').forEach((c,i)=>kj[c]={box:2,due:now+i*D,ok:2,bad:0,l:'n5',lapses:0,f:{st:i===0?1:2,sp:0,s:1+i*3,d:2+i,lr:now-D,due:now+i*D}});
 const t=new Date(now),day=k=>{const d=new Date(now-k*D);return d.toLocaleDateString('en-CA');};
 const revLog={[day(0)]:{n5r:10,'n5r+':9,n4r:4,'n4r+':2,n5l:5,'n5l+':3,kanak:6,'kanak+':6,kjn5j:3,'kjn5j+':2},[day(3)]:{n5r:10,'n5r+':7},[day(10)]:{n5r:20,'n5r+':10,n4r:6,'n4r+':6},[day(40)]:{n5r:50,'n5r+':0}};
 return {cards,kana,kj,revLog};}
// independent reference computation
function ref(F,lv,tr,now,totalN){const SB=[1,3,7,21,90,365,Infinity];const items=[];
 if(tr==='k')for(const k in F.kana)items.push(F.kana[k]);else if(tr==='j'){for(const c in F.kj)if(lv==='all'||F.kj[c].l===lv)items.push(F.kj[c]);}
 else for(const k in F.cards){const id=+k,l=id<10000?'n5':'n4';if(lv!=='all'&&l!==lv)continue;const c=F.cards[k];const f=tr==='l'?c.L:c.f;if(f)items.push(Object.assign({},c,{f}));}
 const st=[0,0,0,0],sb=Array(7).fill(0),db=Array(10).fill(0),fc=Array(30).fill(0);let sS=0,nS=0,lap=0,sR=0;
 const e=new Date(now);e.setHours(24,0,0,0);
 for(const c of items){const f=c.f;st[f.st]++;if(tr!=='l')lap+=c.lapses||0;sb[SB.findIndex(b=>f.s<b)]++;db[Math.min(9,Math.ceil(f.d)-1)]++;if(f.st===2){sS+=f.s;nS++;sR+=Math.pow(1+(Math.pow(0.9,-2)-1)*Math.max(0,(now-f.lr)/D)/f.s,-0.5);}
  const di=f.due<+e?0:Math.floor((f.due-e)/D)+1;if(di<30)fc[di]++;}
 return {n:items.length,learning:st[1],review:st[2],relearning:st[3],sb,db,fc,lapses:lap,avgS:nS?sS/nS:null,avgR:nS?sR/nS:null};}
function refRet(F,lv,tr,n,now){let a=0,o=0;const cut=new Date(now-(n-1)*D).toLocaleDateString('en-CA');for(const d in F.revLog){if(d<cut)continue;for(const k in F.revLog[d]){if(k.endsWith('+'))continue;if(k.slice(-1)!==tr)continue;const lvk=k.slice(0,-1),l=tr==='j'?lvk.slice(2):lvk;if(tr!=='k'&&lv!=='all'&&l!==lv)continue;a+=F.revLog[d][k];o+=F.revLog[d][k+'+']||0;}}return a?{n:a,r:o/a}:null;}
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const NOW=Date.now(),F=fixture(NOW);
 for(const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(F=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:F.cards,levels:['n5','n4'],revLog:F.revLog,retention:0.9}));
  localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:F.kana}));localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:F.kj}));},F);
 const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(900);await p.evaluate(()=>Promise.all([__N5.loadLevel('n5'),__N5.loadLevel('n4')]));
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);const T=s=>scheme+': '+s;
 if(scheme==='light'){
  const close=(a,b)=>a==null?b==null:Math.abs(a-b)<1e-6*Math.max(1,Math.abs(b));
  for(const [lv,tr] of [['all','r'],['n5','r'],['n4','r'],['n5','l'],['all','k'],['n5','j']]){
   const got=await ev(([lv,tr,now])=>{const m=__N5.memStats(lv,tr,now);return {n:m.n,learning:m.st.learning,review:m.st.review,relearning:m.st.relearning,sb:m.sb,db:m.db,fc:m.fc,lapses:m.lapses,avgS:m.avgS,avgR:m.avgR,tr7:m.tr7,tr30:m.tr30,hard:m.hard.map(h=>[h.f.d,+h.c.lapses||0])};},[lv,tr,NOW]);
   const e=ref(F,lv,tr,NOW);const e7=refRet(F,lv,tr,7,NOW),e30=refRet(F,lv,tr,30,NOW);
   const same=got.n===e.n&&got.learning===e.learning&&got.review===e.review&&got.relearning===e.relearning&&JSON.stringify(got.sb)===JSON.stringify(e.sb)&&JSON.stringify(got.db)===JSON.stringify(e.db)&&JSON.stringify(got.fc)===JSON.stringify(e.fc)&&got.lapses===e.lapses&&close(got.avgS,e.avgS)&&close(got.avgR,e.avgR);
   ok(`values ${lv}/${tr}: states, stability/difficulty histograms, forecast, lapses, averages`,same,JSON.stringify({got,e}));
   ok(`true retention ${lv}/${tr}: 7 + 30 days`,JSON.stringify(got.tr7)===JSON.stringify(e7)&&JSON.stringify(got.tr30)===JSON.stringify(e30),JSON.stringify([got.tr7,e7,got.tr30,e30]));
   const hs=got.hard.every((h,i)=>i===0||got.hard[i-1][0]>h[0]||(got.hard[i-1][0]===h[0]&&got.hard[i-1][1]>=h[1]));ok(`hardest ${lv}/${tr}: sorted by difficulty then lapses`,hs&&got.hard.length===Math.min(10,e.n));
  }
  ok('true retention n5 reading 7d = (9+7)/20 = 80%',await ev(()=>{const r=__N5.memTrueRet('n5','r',7);return r&&r.n===20&&Math.abs(r.r-0.8)<1e-9;}));
  // speed with ~8,300 items
  const perf=await ev(()=>{const S=__N5.S(),now=Date.now();for(let i=0;i<8300;i++){const id=[0,10000,20000,30000,40000][i%5]+Math.floor(i/5);if(!S.cards[id])S.cards[id]={box:2,due:now+i*6e4,ok:1,bad:0,f:{st:2,sp:null,s:1+i%400,d:1+i%9,lr:now-864e5,due:now+i*6e4}};}
    const t=performance.now();__N5.memStats('all','r');return performance.now()-t;});
  ok('fast: All/reading over ~8,300 cards < 80 ms',perf<80,perf.toFixed(1)+' ms');
  await ev(()=>location.reload());await p.waitForSelector('.tabbar');await W(900);
 }
 await ev(()=>__N5.go(__N5.statsView));await W(400);
 ok(T('Stats tab has the Memory (FSRS) section with 3 charts'),await ev(()=>!!document.querySelector('#memStats')&&document.querySelectorAll('#memStats svg.memchart').length===3&&document.querySelectorAll('#memStats svg.memchart rect').length>0));
 ok(T('level selector: All + selected levels; 4 track buttons ≥44px'),await ev(()=>[...document.querySelectorAll('#memLv button')].map(b=>b.dataset.lv).join()==='all,n5,n4'&&document.querySelectorAll('#memTr button').length===4&&Math.min(...[...document.querySelectorAll('#memStats .seg button')].map(b=>b.getBoundingClientRect().height))>=44));
 await p.tap('#memLv [data-lv="n4"]');await W(150);ok(T('toggle level → N4'),await ev(()=>__N5.memSel().lv==='n4'&&document.querySelector('#memLv [data-lv="n4"]').classList.contains('on')));
 await p.tap('#memTr [data-tr="k"]');await W(150);ok(T('toggle track → Kana (hardest list shows kana)'),await ev(()=>__N5.memSel().tr==='k'&&/Hardest kana/.test(document.querySelector('#memStats').textContent)));
 await p.tap('#memTr [data-tr="r"]');await p.tap('#memLv [data-lv="n5"]');await W(150);
 const txt=await ev(()=>document.querySelector('#memStats').innerText);ok(T('shows true retention, target, avg recall/stability, lapses, states'),/true retention · 7 days/.test(txt)&&/target retention/.test(txt)&&/avg stability/.test(txt)&&/lapses total/.test(txt)&&/Relearning/.test(txt),txt.slice(0,300));
 await p.tap('#memHard .memitem');await W(300);ok(T('hardest word → word detail'),await ev(()=>!!document.querySelector('.modal')));
 await ev(()=>document.querySelectorAll('.modal').forEach(m=>m.remove()));
 ok(T('fits 375px'),await ev(()=>document.documentElement.scrollWidth<=375&&document.querySelector('#memStats').getBoundingClientRect().right<=375.5));
 if(scheme==='dark')ok(T('dark: chart bars use the teal accent'),await ev(()=>{const f=getComputedStyle(document.querySelector('#memStats svg rect')).fill;return /45, 212, 191|2dd4bf/i.test(f);}),await ev(()=>getComputedStyle(document.querySelector('#memStats svg rect')).fill));
 if(scheme==='light'){
  // real grading writes the review log; sync merges per-field max
  const rl=await ev(()=>{const S=__N5.S(),t=__N5.todayStr(),before=(S.revLog[t]||{}).n5r||0;const id=Object.keys(S.cards).map(Number).find(i=>i<10000&&S.cards[i].f.st===2);__N5.grade(id,true);return {before,after:S.revLog[t].n5r,ok:S.revLog[t]['n5r+']};});
  ok('grading a review card adds to the review log',rl.after===rl.before+1,JSON.stringify(rl));
  const mg=await ev(()=>{const o=__N5.mergeStore('S',{revLog:{'2026-09-01':{n5r:3,'n5r+':3}}},{revLog:{'2026-09-01':{n5r:5,'n5r+':2},'2026-09-02':{n4r:1}}},{},{},{});return o.revLog;});
  ok('sync merges the review log (per-field max, union of days)',mg['2026-09-01'].n5r===5&&mg['2026-09-01']['n5r+']===3&&mg['2026-09-02'].n4r===1,JSON.stringify(mg));
 }
 ok(T('no page errors'),!errs.length,errs.join(' | '));
 await ctx.close();}
 await b.close();const pass=R.filter(Boolean).length;console.log(`SUMMARY ${BR} tmem ${pass}/${R.length} passed`);process.exit(pass===R.length?0:1);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1);});
