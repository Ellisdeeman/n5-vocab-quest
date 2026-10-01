// FSRS test: math vs py-fsrs 4.1.2 reference, auto-grading map, migration (vs the previous live build), backup/restore,
// sync merge, listening track, games, settings. BROWSER=webkit|chromium URL=... OLD_URL=... (old build for "before" numbers)
const pw=require('playwright-core'),fs=require('fs');
const URL=process.env.URL||'http://localhost:8766/',OLD=process.env.OLD_URL||'http://localhost:8769/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const REF=JSON.parse(fs.readFileSync(__dirname+'/fsrs_ref.json','utf8'));
const DAY=864e5,KEY='n5VocabQuest.v1',KKEY='n5VocabQuest.kana.v1',JKEY='jlptVocabQuest.kanji.v1';
// ---- realistic old (Leitner) fixture, deterministic ----
function fixture(now){let x=7;const rnd=()=>(x=(x*1103515245+12345)%2147483648)/2147483648;const IV=[0,60e3,600e3,DAY,3*DAY,7*DAY,16*DAY];
 const away=ms=>Math.abs(ms)<3600e3?(ms<0?-3600e3:3600e3):ms;   // keep every due ≥1 h from "now" so before/after counts can't flicker
 const cards={},dist=[[0,30],[1,25],[2,40],[3,60],[4,90],[5,110],[6,95]];let id=0;
 for(const [b,n] of dist)for(let i=0;i<n;i++){const iv=IV[Math.max(1,b)],t=now-rnd()*Math.max(iv,DAY)*1.3,ok=b+Math.floor(rnd()*4),bad=Math.floor(rnd()*3);
  cards[id]={box:b,due:now+away(t+iv-now),ok,bad,t:Math.round(t),run:b};id+=3;}   // spread over the N5 list
 // leeches: lots of misses, short run
 [3,6,9,12,15,18,21,24,27,30,33,36].forEach(i=>{const c=cards[i];if(c){c.bad=5+Math.floor(rnd()*4);c.run=1;c.lapses=2;}});
 cards[20005]={box:4,due:now+2*DAY,ok:7,bad:1,t:now-DAY,run:4};   // an N3 word (level not loaded)
 const kana={};const H='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(''),K='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
 H.forEach((k,i)=>kana[k]={box:i%9===0?3:i%4===0?5:6,due:now+away((i%7-2)*DAY),ok:8,bad:i%5===0?2:0,t:now-3*DAY});
 K.forEach((k,i)=>kana[k]={box:i%3===0?2:i%2?4:5,due:now+away((i%5-1)*DAY),ok:5,bad:1,t:now-2*DAY});
 const kj={};'日一二三四五六七八九十百千万円人月火水木金土年'.split('').forEach((c,i)=>kj[c]={box:i%7,due:now+away((i%4-1)*DAY),ok:i%7+1,bad:i%3,l:'n5',t:now-DAY});
 return {[KEY]:JSON.stringify({cards,levels:['n5'],xp:1234,streak:5,lastDay:null,unlockAll:true,autoAdvance:false}),[KKEY]:JSON.stringify({cards:kana,unlocked:[],mastered:[],sel:{}}),[JKEY]:JSON.stringify({cards:kj})};}
const metrics=()=>{const N=__N5,S=N.S(),ids=Object.keys(S.cards).map(Number);const ps=N.pathState();
 return {cur:ps.cur,kana:+N.stageFrac('kana').toFixed(4),n5:+N.stageFrac('n5').toFixed(4),n5stats:N.levelStats('n5'),n3:N.levelStats('n3'),totalDue:N.totalDue(),vDue:N.dueScan().ids.length,kDue:N.kanaDueScan().ids.length,jDue:N.kjDueScan().ids.length,
  leeches:ids.filter(N.isLeech).length,kj:N.kjStats('n5'),boxes:Object.fromEntries(ids.map(i=>[i,S.cards[i].box])),dues:Object.fromEntries(ids.map(i=>[i,S.cards[i].due])),kbox:Object.fromEntries(Object.entries(N.KS().cards).map(([k,c])=>[k,c.box]))};};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const mk=async(url,init)=>{const ctx=await b.newContext({viewport:{width:375,height:667},hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  if(init)await ctx.addInitScript(init.fn,init.arg);const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});p.on('dialog',d=>d.accept());
  await p.goto(url+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(900);return {ctx,p,errs};};
 const NOW=Date.now(),FX=fixture(NOW);
 const seed={fn:fx=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);for(const k in fx)localStorage.setItem(k,fx[k]);},arg:FX};
 // ===== 1. before: the previous live build with the fixture =====
 let before=null;try{const o=await mk(OLD,seed);before=await o.p.evaluate(metrics);await o.ctx.close();}catch(e){console.log('NOTE old build unavailable:',e.message.split('\n')[0]);}
 // ===== 2. after: this build migrates on load =====
 const {ctx,p,errs}=await mk(URL,seed);const ev=(f,a)=>p.evaluate(f,a);const W=ms=>p.waitForTimeout(ms);
 const after=await ev(metrics);
 console.log('INFO fixture before:',before?JSON.stringify({cur:before.cur,kana:before.kana,n5:before.n5,n5stats:before.n5stats,totalDue:before.totalDue,vDue:before.vDue,kDue:before.kDue,jDue:before.jDue,leeches:before.leeches,kj:before.kj}):'n/a');
 console.log('INFO fixture after: ',JSON.stringify({cur:after.cur,kana:after.kana,n5:after.n5,n5stats:after.n5stats,totalDue:after.totalDue,vDue:after.vDue,kDue:after.kDue,jDue:after.jDue,leeches:after.leeches,kj:after.kj}));
 if(before){
  ok('migration: path stage unchanged',after.cur===before.cur,before.cur+' → '+after.cur);
  ok('migration: path % (kana, N5) unchanged',after.kana===before.kana&&after.n5===before.n5,`${before.kana}/${before.n5} → ${after.kana}/${after.n5}`);
  ok('migration: N5 seen/mastered/due unchanged',JSON.stringify(after.n5stats)===JSON.stringify(before.n5stats),JSON.stringify([before.n5stats,after.n5stats]));
  ok('migration: unloaded level (N3) stats unchanged',JSON.stringify(after.n3)===JSON.stringify(before.n3));
  ok('migration: due counts unchanged (vocab, kana, kanji, total)',after.vDue===before.vDue&&after.kDue===before.kDue&&after.jDue===before.jDue&&after.totalDue===before.totalDue,JSON.stringify([before.vDue,before.kDue,before.jDue,after.vDue,after.kDue,after.jDue]));
  ok('migration: leeches unchanged',after.leeches===before.leeches&&after.leeches>=10,before.leeches+' → '+after.leeches);
  ok('migration: kanji stats unchanged',JSON.stringify(after.kj)===JSON.stringify(before.kj));
  ok('migration: every box (display level) unchanged',JSON.stringify(after.boxes)===JSON.stringify(before.boxes)&&JSON.stringify(after.kbox)===JSON.stringify(before.kbox));
  ok('migration: every due date preserved',JSON.stringify(after.dues)===JSON.stringify(before.dues));
 } else ok('old build reachable for before/after comparison',false);
 const mig=await ev(()=>{const N=__N5,S=N.S(),cs=Object.values(S.cards),ks=Object.values(N.KS().cards),js=Object.values(N.JS().cards);
  const all=cs.concat(ks,js),byBox={};cs.forEach(c=>{(byBox[c.lb||c.box]=byBox[c.lb||c.box]||[]).push(c.f.s||0)});
  const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;return {allF:all.every(c=>c.f&&[1,2,3].includes(c.f.st)),means:[2,3,4,5,6].map(b=>mean(byBox[b]||[0])),
   b0:cs.filter(c=>c.box===0).every(c=>c.f.st===1&&c.f.s==null),b1:cs.filter(c=>c.box===1).every(c=>c.f.st===1&&c.f.sp===1),rev:cs.filter(c=>c.box>=2).every(c=>c.f.st===2&&c.lb===c.box),
   pre:!!localStorage.getItem(N.PREFSRS_KEY),again:N.fsrsMigrateAll()};});
 ok('migration: all vocab/kana/kanji cards have FSRS state',mig.allF);
 ok('migration: stability grows with the old box (replayed ladder)',mig.means.every((m,i)=>i===0||m>mig.means[i-1]),JSON.stringify(mig.means.map(m=>+m.toFixed(2))));
 ok('migration: box 0 → new learning, box 1 → learning step 2, box ≥2 → review with box floor',mig.b0&&mig.b1&&mig.rev);
 ok('migration: old stores backed up in localStorage',mig.pre&&await ev(([k,fx])=>JSON.parse(localStorage.getItem(__N5.PREFSRS_KEY))[k]===fx,[KEY,FX[KEY]]));
 ok('migration: idempotent (second run converts 0)',mig.again===0);
 const snap1=await ev(()=>JSON.stringify([__N5.S().cards,__N5.KS().cards,__N5.JS().cards]));
 await p.reload();await p.waitForSelector('.tabbar');await W(800);
 ok('migration: reload leaves state byte-identical',await ev(()=>JSON.stringify([__N5.S().cards,__N5.KS().cards,__N5.JS().cards]))===snap1);
 const lbt=await ev(()=>{const N=__N5,S=N.S(),id=+Object.keys(S.cards).find(k=>S.cards[k].lb===4&&k<20000);N.qStart(id,'mc');N.grade(id,true);const a=JSON.parse(JSON.stringify(S.cards[id]));N.qStart(id,'mc');N.grade(id,false);const b=S.cards[id];return {a:a.box,aS:a.f.s,b:b.box,lb:b.lb};});
 ok('migrated mastered word: correct review keeps it mastered; a lapse drops the carried-over floor',lbt.a>=4&&lbt.b<=1&&lbt.lb===undefined,JSON.stringify(lbt));
 // ===== 3. FSRS math vs reference =====
 const math=await ev(ref=>{let bad=[],n=0;for(const k in ref.seqs){const ret=+k.split('@')[1];let f=null;for(const x of ref.seqs[k]){f=__N5.fsrsNext(f,x.r,x.t,{ret,max:ref.maxIvl});n++;
   if(Math.abs(f.s-x.s)>1e-9*x.s||Math.abs(f.d-x.d)>1e-9||f.st!==x.state||f.due!==x.due||(f.sp==null?null:f.sp)!==x.step)bad.push(k+'#'+n);}}return {n,bad};},REF);
 ok(`FSRS-5 math matches py-fsrs 4.1.2 on ${math.n} review steps (18 sequences × S, D, state, step, due)`,math.n===126&&math.bad.length===0,math.bad.slice(0,5).join(','));
 // ===== 4. grading map (unit) =====
 const g=await ev(()=>{const N=__N5,q=N.qStart,a=N.autoRating,o={};
  q(1,'type',{len:3});o.tFast=a(true,1,1000);o.tNorm=a(true,1,5000);o.tSlow=a(true,1,9500);o.tWrong=a(false,1,500);
  q(1,'type',{len:3});N.QT.hints=1;o.tHint=a(true,1,800);q(1,'type',{len:3});N.QT.slip=true;o.tSlip=a(true,1,800);
  q(1,'type',{len:3,listen:true});o.ltFast=a(true,1,3800);o.ltSlow=a(true,1,11500);
  q('か','ktype',{len:2});o.kFast=a(true,'か',1500);o.kNorm=a(true,'か',4000);o.kSlow=a(true,'か',7000);
  q(1,'mc');o.mFast=a(true,1,300);o.mSlow=a(true,1,9000);o.mWrong=a(false,1,300);q(1,'mc',{listen:true});o.mlNorm=a(true,1,9000);o.mlSlow=a(true,1,11000);
  q('か','kmc');o.kmSlow=a(true,'か',6000);q(1,'type',{len:3});N.QT.hid=true;o.hidden=a(true,1,60000);o.other=a(true,2,100);
  o.thr=N.rateThresholds('type',4,false);return o;});
 ok('grading: typing fast=Easy, normal=Good, very slow=Hard, wrong=Again',g.tFast===4&&g.tNorm===3&&g.tSlow===2&&g.tWrong===1,JSON.stringify(g));
 ok('grading: hint → Hard; accepted-by-tolerance → at most Good',g.tHint===2&&g.tSlip===3);
 ok('grading: listen-and-type gets extra audio time',g.ltFast===4&&g.ltSlow===2);
 ok('grading: kana typing thresholds',g.kFast===4&&g.kNorm===3&&g.kSlow===2);
 ok('grading: multiple choice fast=Good, slow=Hard, never Easy',g.mFast===3&&g.mSlow===2&&g.mWrong===1&&g.mlNorm===3&&g.mlSlow===2&&g.kmSlow===2);
 ok('grading: app in background → time ignored (Good); unknown question → Good',g.hidden===3&&g.other===3);
 ok('grading: thresholds scale with answer length (4 kana: Easy ≤2.9 s, Hard >10 s)',g.thr.easy===2900&&g.thr.hard===10000,JSON.stringify(g.thr));
 // ===== 5. grading through the UI =====
 await ev(()=>{const S=__N5.S();S.retype=false;__N5.gsave();});
 const uniq=await ev(()=>{const W=__N5.WORDS,ids=__N5.ALL().ALL_IDS,cnt={};ids.forEach(i=>cnt[W[i].en]=(cnt[W[i].en]||0)+1);return ids.filter(i=>cnt[W[i].en]===1&&!__N5.S().cards[i]&&W[i].kana.length>=2&&W[i].kana.length<=4&&!/[ァ-ヴー]/.test(W[i].kana)).slice(0,6);});
 await ev(ids=>{const S=__N5.S(),now=Date.now();ids.forEach(i=>{S.cards[i]={box:2,due:now-1000,ok:2,bad:0,t:now-3*864e5};});__N5.fsrsMigrateAll();__N5.gsave();},uniq);
 await ev(ids=>__N5.go(()=>__N5.quiz('typing',ids,'T')),uniq);await p.waitForSelector('#typein');await W(150);
 let id=+(await ev(()=>__N5.QT.id));let f0=await ev(i=>__N5.S().cards[i].f,id);
 await p.type('#typein',await ev(i=>__N5.ROMA(__N5.WORDS[i].kana),id));await p.keyboard.press('Enter');await W(200);
 let c1=await ev(i=>__N5.S().cards[i],id);
 ok('UI typing: quick correct answer → Easy, stability up, review in days',c1.rt===4&&c1.f.s>f0.s&&c1.f.due-Date.now()>2*DAY,JSON.stringify([c1.rt,f0.s,c1.f.s]));
 await p.tap('#nextBtn');await W(200);id=+(await ev(()=>__N5.QT.id));await ev(()=>{__N5.QT.t0=performance.now()-60000;});
 await p.type('#typein',await ev(i=>__N5.ROMA(__N5.WORDS[i].kana),id));await p.keyboard.press('Enter');await W(200);
 ok('UI typing: very slow correct → Hard',await ev(i=>__N5.S().cards[i].rt,id)===2);
 await p.tap('#nextBtn');await W(200);id=+(await ev(()=>__N5.QT.id));const x0=await ev(()=>__N5.S().xp);await p.tap('#giveBtn');await W(200);
 c1=await ev(i=>__N5.S().cards[i],id);ok("UI typing: I don't know → Again, relearning (10 min), lapse counted",c1.rt===1&&c1.f.st===3&&c1.lapses===1&&Math.abs(c1.f.due-Date.now()-600e3)<5000,JSON.stringify(c1));
 ok("I don't know: XP unchanged",await ev(()=>__N5.S().xp)===x0);
 await p.tap('#nextBtn');await W(200);id=+(await ev(()=>__N5.QT.id));await p.type('#typein','zzqx');await p.keyboard.press('Enter');await W(200);
 ok('UI typing: wrong → Again',await ev(i=>__N5.S().cards[i].rt,id)===1);
 // retype doesn't change the grade
 await ev(()=>{__N5.S().retype=true;});await p.tap('#nextBtn');await W(200);id=+(await ev(()=>__N5.QT.id));await p.tap('#giveBtn');await W(200);
 const rs=await ev(i=>JSON.stringify(__N5.S().cards[i]),id);await p.fill('#rtIn',await ev(i=>__N5.WORDS[i].kana,id));await p.tap('#rtGo');await W(150);
 ok('retype after a miss leaves the Again grade untouched',await ev(i=>JSON.stringify(__N5.S().cards[i]),id)===rs);
 // multiple choice
 const mcIds=uniq.slice(0,3);await ev(ids=>{const S=__N5.S(),now=Date.now();ids.forEach(i=>{S.cards[i]={box:3,due:now-1000,ok:3,bad:0,t:now-3*864e5};delete S.cards[i].f;});__N5.fsrsMigrateAll();},mcIds);
 await ev(ids=>__N5.go(()=>__N5.quiz('meaning',ids,'M')),mcIds);await p.waitForSelector('.choice');await W(150);
 const pickRight=async()=>{const i=+(await ev(()=>__N5.QT.id));const en=await ev(i=>__N5.WORDS[i].en,i);await ev(en=>{[...document.querySelectorAll('.choice')].find(b=>b.textContent.slice(1).trim()===en).click();},en);await W(200);return i;};
 id=await pickRight();ok('UI multiple choice: correct → Good (never Easy)',await ev(i=>__N5.S().cards[i].rt,id)===3);
 await p.tap('#nextBtn');await W(200);await ev(()=>{__N5.QT.t0=performance.now()-30000;});id=await pickRight();
 ok('UI multiple choice: slow correct → Hard',await ev(i=>__N5.S().cards[i].rt,id)===2);
 // ===== 6. listening track =====
 const lw=uniq[5];await ev(i=>{const S=__N5.S(),now=Date.now();S.cards[i]={box:3,due:now+5*864e5,ok:3,bad:0,t:now-864e5};delete S.cards[i].f;__N5.fsrsMigrateAll();__N5.gsave();},lw);
 const lf0=await ev(i=>JSON.stringify(__N5.S().cards[i].f),lw);
 await ev(i=>__N5.go(()=>__N5.quiz('listen',[i],'L')),lw);await p.waitForSelector('.choice');await W(200);
 const lmode=await ev(()=>__N5.QT.listen);await pickRight();
 let lc=await ev(i=>__N5.S().cards[i],lw);
 ok('listening quiz creates a separate listening track; reading track untouched',lmode&&!!lc.L&&JSON.stringify(lc.f)===lf0&&lc.L.st===1,JSON.stringify(lc));
 ok('reading track box/mastery unaffected by listening',lc.box===3);
 await ev(i=>{const c=__N5.S().cards[i],now=Date.now();c.L={st:2,sp:null,s:5,d:5,lr:now-6*864e5,due:now-3600e3};c.f.due=now+4*864e5;__N5.fsrsSync(c);__N5.gsave();},lw);
 ok('a word due only in listening counts as due once',await ev(i=>__N5.dueScan().ids.filter(x=>x===i).length,lw)===1);
 ok('Today/Review picks the listening mode for a listening-due word',await ev(i=>__N5.trackMode(__N5.WORDS[i],'typing',()=>'meaning'),lw)==='listen');
 await ev(i=>{const c=__N5.S().cards[i],now=Date.now();c.f.due=now-60e3;__N5.fsrsSync(c);},lw);
 ok('due in both tracks: still one due item, asked in the reading track',await ev(i=>__N5.dueScan().ids.filter(x=>x===i).length===1&&__N5.trackMode(__N5.WORDS[i],'listen',()=>'meaning')==='meaning',lw));
 await ev(i=>{__N5.qStart(i,'mc');__N5.grade(i,true);},lw);lc=await ev(i=>__N5.S().cards[i],lw);
 ok('after the reading review, the other due track waits until tomorrow (no double load)',lc.L.due>=await ev(()=>{const d=new Date();d.setHours(24,0,0,0);return +d})&&lc.due>Date.now());
 // ===== 7. games =====
 const gw=uniq[0];await ev(i=>{const c=__N5.S().cards[i],now=Date.now();c.f={st:2,sp:null,s:12,d:5,lr:now-5*864e5,due:now+7*864e5};delete c.lb;__N5.fsrsSync(c);},gw);
 const gf=await ev(i=>JSON.stringify(__N5.S().cards[i].f),gw);await ev(i=>__N5.grade(i,true,{game:true}),gw);
 let gc=await ev(i=>__N5.S().cards[i],gw);ok('games: correct answer → no schedule change (counts only)',JSON.stringify(gc.f)===gf);
 await ev(i=>__N5.grade(i,false,{game:true}),gw);gc=await ev(i=>__N5.S().cards[i],gw);
 ok('games: clear miss on a review item → Again',gc.f.st===3&&gc.rt===1);
 const nw=uniq[1];await ev(i=>{const c=__N5.S().cards[i],now=Date.now();c.f={st:1,sp:0,s:null,d:null,lr:null,due:now};__N5.fsrsSync(c);},nw);const nf=await ev(i=>JSON.stringify(__N5.S().cards[i].f),nw);
 await ev(i=>__N5.grade(i,false,{game:true}),nw);ok('games: miss on a not-yet-review item → logged, schedule unchanged',await ev(i=>JSON.stringify(__N5.S().cards[i].f),nw)===nf);
 const fresh=await ev(()=>{const ids=__N5.ALL().ALL_IDS,i=ids.find(x=>!__N5.S().cards[x]);__N5.grade(i,true,{game:true});const c=__N5.S().cards[i];return {seen:!!c,s:c.f.s,st:c.f.st};});
 ok('games: correct on a new word → seen only, no stability',fresh.seen&&fresh.s==null&&fresh.st===1);
 // boss battle IDK on review items through the UI
 await ev(()=>{const S=__N5.S(),now=Date.now();__N5.bossList('n5')[1].ids.forEach(i=>{S.cards[i]={box:3,due:now+5*864e5,ok:3,bad:0,t:now-864e5,f:{st:2,sp:null,s:9,d:5,lr:now-864e5,due:now+5*864e5}};});__N5.gsave();});
 await ev(()=>__N5.go(()=>__N5.bossFight('n5',__N5.bossList('n5')[1],()=>{})));await p.waitForSelector('#qhost .choice',{timeout:20000});
 const bq=await ev(()=>{const q=__N5.gs.cur;return q.w?q.w.id:null;});if(bq!=null){await p.tap('#qhost .idk');await W(200);}
 ok('boss battle: I don\'t know on a review word → Again',bq==null||await ev(i=>__N5.S().cards[i].f.st===3,bq));
 // ===== 8. kanji: own track =====
 await ev(()=>__N5.loadKanji('n5'));
 const kjr=await ev(()=>{const N=__N5,c='日',nv=JSON.stringify(N.S().cards),before=JSON.parse(JSON.stringify(N.JS().cards[c]));N.qStart(c,'mc');window.kjGradeT(c,true);const a=N.JS().cards[c];return {sep:JSON.stringify(N.S().cards)===nv,changed:JSON.stringify(a.f)!==JSON.stringify(before.f),rt:a.rt,ok:a.ok===before.ok+1};});
 ok('kanji: own FSRS state per kanji, graded like multiple choice, vocab untouched',kjr.sep&&kjr.changed&&kjr.rt===3&&kjr.ok,JSON.stringify(kjr));
 // ===== 9. backup restore (old + new format) and sync merge =====
 const br=await ev(([fx,K,KK,JK])=>{const N=__N5;const old={app:'jlpt-vocab-quest',kind:'backup',v:1,exported:new Date().toISOString(),stores:{[K]:JSON.parse(fx[K]),[KK]:JSON.parse(fx[KK]),[JK]:JSON.parse(fx[JK])}};
  const v=N.validatePayload(old);N.applyStores(old.stores,{});const S=N.S(),src=old.stores[K].cards;
  const oldOK=!v&&Object.keys(src).every(k=>S.cards[k]&&S.cards[k].f&&S.cards[k].box===src[k].box&&S.cards[k].due===src[k].due)&&Object.values(N.KS().cards).every(c=>c.f)&&Object.values(N.JS().cards).every(c=>c.f);
  const snap=JSON.stringify(S.cards);const neu=N.buildPayload('backup');N.applyStores(JSON.parse(JSON.stringify(neu.stores)),neu.mod);
  return {v,oldOK,newOK:!N.validatePayload(neu)&&JSON.stringify(N.S().cards)===snap};},[FX,KEY,KKEY,JKEY]);
 ok('backup: old-format (Leitner) backup restores and converts (boxes + dues kept)',br.oldOK,JSON.stringify(br));
 ok('backup: new-format backup restores unchanged',br.newOK);
 const mg=await ev(()=>{const N=__N5,now=Date.now(),D=864e5;
  const A={box:3,due:now+D,ok:5,bad:1,t:now-1000,f:{st:2,sp:null,s:8,d:5,lr:now-1000,due:now+8*D},L:{st:2,sp:null,s:3,d:5,lr:now-9*D,due:now+2*D}};
  const B={box:2,due:now+D,ok:4,bad:2,t:now-500,f:{st:2,sp:null,s:4,d:6,lr:now-5*D,due:now+D},L:{st:2,sp:null,s:6,d:5,lr:now-500,due:now+6*D}};
  const m=N.mergeCard(A,B);const oldNewer={box:5,due:now+7*D,ok:9,bad:1,t:now};const m2=N.mergeCard(oldNewer,A);const S=N.S();S.cards[1]=m2;N.fsrsMigrateAll();
  return {perTrack:m.f.lr===A.f.lr&&m.L.lr===B.L.lr,due:m.due===Math.min(m.f.due,m.L.due),cnt:m.ok===5&&m.bad===2,oldWins:S.cards[1].box===5&&!!S.cards[1].f&&S.cards[1].f.due===now+7*D&&S.cards[1].due===Math.min(now+7*D,A.L.due)};});
 ok('sync merge: each track keeps its newest review (reading from one device, listening from the other)',mg.perTrack&&mg.due&&mg.cnt,JSON.stringify(mg));
 ok('sync merge: newer old-format review wins, then converts',mg.oldWins);
 await ev(()=>__N5.go(__N5.statsView));await W(300);
 // ===== 10. settings: retention + max interval =====
 await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('#retSeg');
 ok('settings: retention 90% and 3-year max by default',await ev(()=>document.querySelector('#retSeg .on').dataset.v==='0.9'&&document.querySelector('#maxIvlSeg .on').dataset.v==='1095'));
 const tg=await ev(()=>[...document.querySelectorAll('#retSeg button,#maxIvlSeg button')].map(x=>Math.round(x.getBoundingClientRect().height)));ok('settings: retention/max buttons ≥44px',tg.every(h=>h>=44),JSON.stringify(tg));
 ok('settings: fits 375px',await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.tap('#retSeg [data-v="0.95"]');await p.tap('#maxIvlSeg [data-v="365"]');await W(150);
 ok('settings: retention 95% + 1-year max saved',await ev(()=>__N5.S().retention===0.95&&__N5.S().maxIvl===365&&JSON.parse(localStorage.getItem('n5VocabQuest.v1')).retention===0.95));
 const iv=await ev(()=>{const N=__N5,now=Date.now(),f={st:2,sp:null,s:300,d:5,lr:now-300*864e5,due:now};const a=N.fsrsNext(f,3,now,{ret:0.9,max:365}),b2=N.fsrsNext(f,3,now,{ret:0.9,max:36500});const c=N.fsrsNext({st:2,sp:null,s:10,d:5,lr:now-10*864e5,due:now},3,now,{ret:0.95,max:3650}),d=N.fsrsNext({st:2,sp:null,s:10,d:5,lr:now-10*864e5,due:now},3,now,{ret:0.9,max:3650});
  return {capped:Math.round((a.due-now)/864e5),free:Math.round((b2.due-now)/864e5),r95:c.due-now,r90:d.due-now};});
 ok('max interval caps reviews; higher retention → shorter intervals',iv.capped===365&&iv.free>365&&iv.r95<iv.r90,JSON.stringify(iv));
 // ===== 11. Pimsleur "mark done" = seen only =====
 const pm=await ev(()=>{const N=__N5,ids=N.pimsLessonIds(1,9).filter(i=>!N.S().cards[i]);N.pimsAddLesson(1,9,true);const c=N.S().cards[ids[0]];return ids.length?{n:ids.length,s:c.f.s,st:c.f.st,box:c.box}:null;});
 ok('Pimsleur mark done: adds Seen cards with no FSRS stability',!pm||(pm.s==null&&pm.st===1&&pm.box===0),JSON.stringify(pm));
 // ===== 12. word detail + stats show FSRS info =====
 await ev(()=>__N5.go(__N5.statsView));await W(400);
 ok('Stats shows the FSRS memory card (estimated recall)',await ev(()=>/Estimated recall right now: \d+%/.test(document.querySelector('.fsrscard')?.textContent||'')));
 ok('detail sheet shows stability / next review',await ev(async i=>{__N5.amDetail('n5',i);await new Promise(r=>setTimeout(r,600));return /stability/.test(document.querySelector('.amsheet')?.textContent||'');},uniq[0]));
 ok('credits mention FSRS',await ev(()=>/FSRS-5/.test(document.querySelector('#credits').textContent)));
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('FAIL crash',e.message.split('\n')[0]);console.log('SUMMARY',BR,'crash');process.exit(1)});
