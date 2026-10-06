// FSRS optimizer: per-review log, forward model = app scheduler, fit on synthetic logs from known params
// (lower log loss than defaults, close to the true params' loss, RMSE improves), Settings UI (not enough / optimize /
// apply / revert / auto-monthly), persistence, Worker run. BROWSER=webkit|chromium URL=...
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<6;i++)cards[i]={box:2,due:now-36e5,ok:3,bad:1,f:{st:2,sp:null,s:4+i,d:5,lr:now-6*D,due:now-36e5}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,unlockAll:true,newLimit:10,xp:50}));});
 const p=await ctx.newPage();p.setDefaultTimeout(20000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(800);await p.evaluate(()=>__N5.loadLevel('n5'));
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=8000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(100);}return false;};
 // ---- 1. forward model = the app's scheduler (fsrsNext, fuzz off) on random multi-day sequences ----
 const fm=await ev(()=>{const N=__N5,DAY=864e5;let worst=0,n=0;const rng=(s=>()=>(s=(s*16807)%2147483647)/2147483647)(7);
  for(let k=0;k<300;k++){let t=Date.UTC(2026,0,1,12),f=null;const r0=1+Math.floor(rng()*4);f=N.fsrsNextT(null,r0,t,{fuzz:false,ret:.9,max:36500});
   const q={r0,s0:0,d0:0,dt:[],r:[]};const L=2+Math.floor(rng()*8);
   for(let i=0;i<L;i++){const dd=1+Math.floor(rng()*40);t+=dd*DAY;const r=rng()<.2?1:rng()<.15?2:rng()<.9?3:4;f=N.fsrsNextT(f,r,t,{fuzz:false,ret:.9,max:36500});q.dt.push(dd);q.r.push(r);}
   q.dt=Float64Array.from(q.dt);q.r=Int8Array.from(q.r);const m=N.FOPT.replay(N.FSRS_W,q);
   worst=Math.max(worst,Math.abs(m.s-f.s)/Math.max(1e-9,f.s),Math.abs(m.d-f.d));n++;}
  return {worst,n};});
 ok('forward model matches the app scheduler (300 random sequences, s/d)',fm.worst<1e-6,JSON.stringify(fm));
 ok('optimizer starts from the app defaults (FSRS-5)',await ev(()=>JSON.stringify(__N5.FOPT.DEF)===JSON.stringify(__N5.FSRS_DEF)&&JSON.stringify(__N5.FSRS_W)===JSON.stringify(__N5.FSRS_DEF)));
 // ---- 2. synthetic logs from known "true" parameters (independent simulator) ----
 const genSrc=`(function(trueW,nItems,seed){const DAY=86400,FACTOR=Math.pow(.9,-2)-1;let s0=seed;const rng=()=>(s0=(s0*16807)%2147483647)/2147483647;
  const cl=(x,a,b)=>Math.min(b,Math.max(a,x)),w=trueW;const D0=r=>cl(w[4]-Math.exp(w[5]*(r-1))+1,1,10);
  const nD=(d,r)=>cl(w[7]*D0(4)+(1-w[7])*(d+(10-d)*(-w[6]*(r-3))/9),1,10);
  const ret=(t,s)=>Math.pow(1+FACTOR*t/s,-.5);const E=[];let T0=1.7e9;
  for(let k=0;k<nItems;k++){let t=T0+Math.floor(rng()*30)*DAY;const r0=rng()<.25?1:rng()<.1?2:rng()<.85?3:4;let s=Math.max(w[r0-1],.1),d=D0(r0);E.push(['w'+k,t,r0,0]);
   const L=3+Math.floor(rng()*7);for(let i=0;i<L;i++){const ivl=Math.max(1,Math.round(s*(0.6+rng()*1.4)));t+=ivl*DAY;const R=ret(ivl,s),y=rng()<R;
    const r=!y?1:(rng()<.12?2:rng()<.88?3:4);E.push(['w'+k,t,r,2]);
    s=r===1?Math.min(w[11]*Math.pow(d,-w[12])*(Math.pow(s+1,w[13])-1)*Math.exp((1-R)*w[14]),s/Math.exp(w[17]*w[18])):s*(1+Math.exp(w[8])*(11-d)*Math.pow(s,-w[9])*(Math.exp((1-R)*w[10])-1)*(r===2?w[15]:1)*(r===4?w[16]:1));
    s=cl(s,.01,36500);d=nD(d,r);}}
  return E.sort((a,b)=>a[1]-b[1]);})`;
 const trueW=[1.2,2.8,6.5,30,6.6,0.7,1.9,0.02,1.25,0.2,1.2,1.5,0.15,0.35,1.8,0.3,2.6,0.5,0.6];
 const syn=await ev(([src,tw])=>{const gen=eval(src),E=gen(tw,700,12345),N=__N5,t0=performance.now();
  const r=N.FOPT.optimize(E,N.FSRS_DEF,{});const data=N.FOPT.build(E),tru=N.FOPT.metrics(tw,data);
  return {ms:Math.round(performance.now()-t0),samples:r.samples,before:r.before,after:r.after,tru,w:r.w,ok:r.ok,n:E.length};},[genSrc,trueW]);
 console.log('  synthetic',JSON.stringify({ms:syn.ms,samples:syn.samples,before:syn.before,after:syn.after,tru:syn.tru}));
 ok('synthetic: enough samples & optimizer runs',syn.ok&&syn.samples>=2000,JSON.stringify({s:syn.samples}));
 ok('synthetic: fitted log loss clearly below the defaults',syn.after.logloss<syn.before.logloss-0.005,JSON.stringify([syn.before.logloss,syn.after.logloss]));
 ok('synthetic: fitted log loss within 0.01 of the true parameters',syn.after.logloss<=syn.tru.logloss+0.01,JSON.stringify([syn.tru.logloss,syn.after.logloss]));
 ok('synthetic: RMSE (binned) improves',syn.after.rmse<syn.before.rmse,JSON.stringify([syn.before.rmse,syn.after.rmse]));
 ok('synthetic: fitted initial stabilities move toward the truth',Math.abs(syn.w[2]-trueW[2])<Math.abs(3.173-trueW[2])&&Math.abs(syn.w[0]-trueW[0])<Math.abs(0.40255-trueW[0]),JSON.stringify(syn.w.slice(0,4)));
 ok('synthetic: parameters stay inside the fsrs-rs bounds',await ev(w=>w.every((x,i)=>x>=__N5.FOPT.LO[i]-1e-9&&x<=__N5.FOPT.HI[i]+1e-9),syn.w));
 const dsyn=await ev(([src])=>{const E=eval(src)(__N5.FSRS_DEF,500,999),r=__N5.FOPT.optimize(E,__N5.FSRS_DEF,{iters:60});return {b:r.before.logloss,a:r.after.logloss};},[genSrc]);
 ok('data from default params: optimized loss ≤ default loss',dsyn.a<=dsyn.b+1e-9,JSON.stringify(dsyn));
 ok('fewer than 400 reviews → "few"',await ev(([src])=>{const E=eval(src)(__N5.FSRS_DEF,40,5),r=__N5.FOPT.optimize(E,__N5.FSRS_DEF,{});return !r.ok&&r.reason==='few'&&r.samples<400;},[genSrc]));
 // ---- 3. per-review log from real answers ----
 const lg=await ev(async()=>{const N=__N5,L=N.FLOG.e,n0=L.length;
  N.go(()=>N.flashcards([0,1],'T',N.home,{dueOnly:true}));await new Promise(r=>setTimeout(r,300));
  const id=window.__fl.q[0];document.querySelector('#flShow').click();await new Promise(r=>setTimeout(r,100));document.querySelector('.flg.r3').click();await new Promise(r=>setTimeout(r,400));
  const e1=L[L.length-1];document.querySelector('#flUndo').click();await new Promise(r=>setTimeout(r,200));const afterUndo=L.length;
  return {n0,e1,id,afterUndo};});
 ok('flashcard Good logs [key,time,rating,flag=1 with prior s/d/lr]',lg.e1&&lg.e1[0]==='w'+lg.id&&lg.e1[2]===3&&lg.e1[3]===1&&lg.e1[4]>0&&lg.e1[5]>0&&lg.e1[6]>0,JSON.stringify(lg));
 ok('undo removes the log entry',lg.afterUndo===lg.n0,JSON.stringify(lg));
 const lg2=await ev(async()=>{const N=__N5,L=N.FLOG.e;N.go(N.home);await new Promise(r=>setTimeout(r,200));
  N.kGrade('あ',true,{rating:3,quiet:true});const a=L[L.length-1];N.kGrade('あ',false,{rating:1,quiet:true});const b2=L[L.length-1];
  await N.loadKanji('n5');window.kjGradeT('日',true,{rating:4,quiet:true});const c=L[L.length-1];
  N.grade(3,true,{rating:3,listen:true,quiet:true});const d=L[L.length-1];
  await new Promise(r=>setTimeout(r,1800));const st=JSON.parse(localStorage.getItem('jlptVocabQuest.fsrsLog.v1')||'null');
  return {a,b2,c,d,stored:st&&st.e.length,mem:L.length};});
 ok('kana / kanji / listening answers logged on their own keys (new item → flag 0)',lg2.a[0]==='kあ'&&lg2.a[3]===0&&lg2.b2[0]==='kあ'&&lg2.b2[2]===1&&lg2.b2[3]===2&&lg2.c[0]==='j日'&&lg2.c[2]===4&&/^w3L?$/.test(lg2.d[0]),JSON.stringify(lg2));
 ok('log is saved to localStorage (debounced)',lg2.stored===lg2.mem,JSON.stringify(lg2));
 // ---- 4. Settings UI ----
 await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('#foptBox');
 const few=await ev(()=>({t:(document.querySelector('#foptFew')||{}).textContent||'',dis:document.querySelector('#foptGo').disabled}));
 ok('Settings: "Not enough reviews yet (X/400)" + button disabled',/^Not enough reviews yet \(\d+\/400\)$/.test(few.t)&&few.dis,JSON.stringify(few));
 await p.locator('#foptBox').scrollIntoViewIfNeeded();await p.screenshot({path:'/workspace/n5-game/shot-optimizer-few.png'});
 await ev(([src,tw])=>{const E=eval(src)(tw,700,12345);__N5.FLOG.e.splice(0,__N5.FLOG.e.length,...E);},[genSrc,trueW]);
 await p.tap('.tabbar [data-tab="home"]');await W(300);await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('#foptBox');
 ok('Settings: enough reviews → button enabled, no "not enough" line',await ev(()=>!document.querySelector('#foptFew')&&!document.querySelector('#foptGo').disabled));
 await ev(()=>{window.__wk=0;const O=window.Worker;window.Worker=function(u){window.__wk++;return new O(u);};return true;});
 await p.locator('#foptGo').scrollIntoViewIfNeeded();await p.tap('#foptGo');
 ok('optimizing: progress bar shown, button busy',await until(()=>{const pr=document.querySelector('#foptProg');return pr&&!pr.hidden&&document.querySelector('#foptGo').disabled;},3000));
 ok('result card with before → after log loss / RMSE',await until(()=>!!document.querySelector('#foptRes #foptApply'),120000));
 ok('ran in a Web Worker',await ev(()=>window.__wk>=1));
 const res=await ev(()=>document.querySelector('#foptRes').textContent);
 ok('result text shows log loss + RMSE',/Log loss/.test(res)&&/RMSE/.test(res)&&/→/.test(res),res);
 await p.locator('#foptRes').scrollIntoViewIfNeeded();await p.screenshot({path:'/workspace/n5-game/shot-optimizer-result.png'});
 const bh=await ev(()=>[...document.querySelectorAll('#foptBox button')].map(b=>Math.round(b.getBoundingClientRect().height)));
 ok('optimizer buttons ≥ 32px tall and box fits 375px',bh.every(h=>h>=32)&&await ev(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(bh));
 await p.tap('#foptApply');await W(300);
 const ap=await ev(()=>({W:__N5.FSRS_W.slice(),sw:__N5.S().fsrsW,def:__N5.FSRS_DEF,st:document.querySelector('#foptStatus').textContent,rv:!!document.querySelector('#foptRevert'),saved:JSON.parse(localStorage.getItem('n5VocabQuest.v1')).fsrsW}));
 ok('Apply: FSRS_W = optimized params, saved, status "Using your optimized parameters"',JSON.stringify(ap.W)===JSON.stringify(ap.sw)&&JSON.stringify(ap.W)!==JSON.stringify(ap.def)&&JSON.stringify(ap.saved)===JSON.stringify(ap.sw)&&/optimized parameters/.test(ap.st)&&ap.rv,JSON.stringify(ap.st));
 await p.screenshot({path:'/workspace/n5-game/shot-optimizer-applied.png'});
 ok('scheduler uses the new params (preview differs from defaults)',await ev(()=>{const N=__N5,now=Date.now(),a=N.fsrsNextT(null,3,now,{fuzz:false});return Math.abs(a.s-N.FSRS_W[2])<1e-9&&Math.abs(a.s-N.FSRS_DEF[2])>1e-6;}));
 await p.reload();await p.waitForSelector('.tabbar');await W(500);
 ok('after reload the optimized params are still in use',await ev(()=>JSON.stringify(__N5.FSRS_W)===JSON.stringify(__N5.S().fsrsW)));
 await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('#foptRevert');await p.locator('#foptRevert').scrollIntoViewIfNeeded();await p.tap('#foptRevert');await W(300);
 ok('Revert → back to the defaults',await ev(()=>JSON.stringify(__N5.FSRS_W)===JSON.stringify(__N5.FSRS_DEF)&&!__N5.S().fsrsW&&!document.querySelector('#foptRevert')));
 await p.locator('#foptAuto').scrollIntoViewIfNeeded();await p.tap('#foptAuto');await W(150);
 ok('auto-monthly switch toggles + aria-checked',await ev(()=>__N5.S().fsrsAuto===true&&document.querySelector('#foptAuto').getAttribute('aria-checked')==='true'&&document.querySelector('#foptAuto').classList.contains('on')));
 await ev(([src,tw])=>{const N=__N5;N.FLOG.e.splice(0,N.FLOG.e.length,...eval(src)(tw,700,12345));N.S().fsrsOpt={at:Date.now()-40*864e5};N.foptAutoCheck();},[genSrc,trueW]);
 ok('auto check (>30 days old) re-optimizes and applies when it predicts better',await until(()=>!__N5.FOPT_STATE.busy&&!!__N5.S().fsrsW,120000));
 ok('auto check does nothing again within 30 days',await ev(()=>{const N=__N5,b=N.S().fsrsOpt.at;N.foptAutoCheck();return !N.FOPT_STATE.busy&&N.S().fsrsOpt.at===b;}));
 await p.tap('#foptAuto');await W(100);ok('auto switch off',await ev(()=>__N5.S().fsrsAuto===false));
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} tfopt ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
