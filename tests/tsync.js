// Backup & Sync: mocked GitHub Gist API (Playwright route on api.github.com), two devices (two browser contexts),
// first sync creates a secret gist, a second device finds it and merges, bad token, rate limit, offline, backup file
// export/import round trip (identical data), restore + undo, previous-version restore, auto-sync, no token leaks.
const pw=require('playwright-core'),fs=require('fs');const seed=require('./seed.js');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,c?'':i);};
const rnd=n=>[...Array(n)].map(()=>'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.random()*62|0]).join('');
const TOK='ghp_'+rnd(36), TOK2='github_pat_'+rnd(40), BAD='ghp_'+rnd(36);   // fake tokens made up per run
const KEYS=['n5VocabQuest.v1','n5VocabQuest.kana.v1','jlptVocabQuest.kanji.v1','jlptVocabQuest.time.v1','jlptVocabQuest.audioLesson.v1'];
const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'?Object.keys(x).sort().reduce((o,k)=>(o[k]=canon(x[k]),o),{}):x;
const same=(a,b)=>JSON.stringify(canon(a))===JSON.stringify(canon(b));
/* ---------- mock GitHub ---------- */
const users={[TOK]:{login:'learner',gists:[]},[TOK2]:{login:'friend',gists:[]}};
let calls=[],mode='ok',seq=0;const now=()=>new Date(Date.now()+(seq++)*1000).toISOString();
users[TOK2].gists.push({id:'friendgist01',description:'JLPT Vocab Quest sync',public:false,files:{'notes.txt':{content:'hello'}},history:[{version:'v0',committed_at:now(),files:{'notes.txt':{content:'hello'}}}]});
const cors={'access-control-allow-origin':'*','access-control-allow-headers':'Authorization, Content-Type, Accept','access-control-allow-methods':'GET, POST, PATCH, OPTIONS','access-control-expose-headers':'x-ratelimit-remaining, x-ratelimit-reset'};
const view=(g,full,files)=>{files=files||g.files;return {id:g.id,description:g.description,public:g.public,html_url:'https://gist.github.com/'+g.id,updated_at:g.history[0].committed_at,
  files:Object.fromEntries(Object.entries(files).map(([n,f])=>[n,full?{filename:n,content:f.content,truncated:false,raw_url:'https://gist.githubusercontent.com/raw/'+g.id+'/'+n}:{filename:n,raw_url:'https://gist.githubusercontent.com/raw/'+g.id+'/'+n}])),
  ...(full?{history:g.history.map(h=>({version:h.version,committed_at:h.committed_at}))}:{})};};
async function api(route){const q=route.request(),u=new globalThis.URL(q.url()),m=q.method();
 if(m==='OPTIONS')return route.fulfill({status:204,headers:cors});
 const auth=(await q.allHeaders())['authorization']||'';const tok=auth.replace(/^Bearer /,'');calls.push({m,p:u.pathname,auth:!!auth,body:q.postData()||''});
 const J=(s,b,h={})=>route.fulfill({status:s,headers:{...cors,'content-type':'application/json',...h},body:JSON.stringify(b)});
 if(mode==='offline')return route.abort('internetdisconnected');
 if(mode==='rate')return J(403,{message:'API rate limit exceeded'},{'x-ratelimit-remaining':'0','x-ratelimit-reset':String(Math.floor(Date.now()/1000)+900)});
 const U=users[tok];if(!U)return J(401,{message:'Bad credentials'});
 const parts=u.pathname.split('/').filter(Boolean);
 if(parts[0]!=='gists')return J(404,{message:'Not Found'});
 if(parts.length===1&&m==='GET'){const pg=+u.searchParams.get('page')||1,pp=+u.searchParams.get('per_page')||30;return J(200,U.gists.slice().reverse().slice((pg-1)*pp,pg*pp).map(g=>view(g,false)));}
 if(parts.length===1&&m==='POST'){const b=JSON.parse(q.postData());const g={id:'g'+rnd(12).toLowerCase(),description:b.description,public:b.public,files:{},history:[]};
   for(const[n,f]of Object.entries(b.files))g.files[n]={content:f.content};g.history.unshift({version:'v'+rnd(10),committed_at:now(),files:JSON.parse(JSON.stringify(g.files))});U.gists.push(g);return J(201,view(g,true));}
 const g=U.gists.find(x=>x.id===parts[1]);if(!g)return J(404,{message:'Not Found'});
 if(parts.length===2&&m==='GET')return J(200,view(g,true));
 if(parts.length===2&&m==='PATCH'){const b=JSON.parse(q.postData());for(const[n,f]of Object.entries(b.files||{}))g.files[n]={content:f.content};g.history.unshift({version:'v'+rnd(10),committed_at:now(),files:JSON.parse(JSON.stringify(g.files))});return J(200,view(g,true));}
 if(parts.length===3&&parts[2]==='commits')return J(200,g.history.map(h=>({version:h.version,committed_at:h.committed_at,change_status:{total:1}})));
 if(parts.length===3){const h=g.history.find(x=>x.version===parts[2]);if(!h)return J(404,{message:'Not Found'});return J(200,view(g,true,h.files));}
 return J(404,{message:'Not Found'});}
const gistOf=t=>users[t].gists.find(g=>g.files['jlpt-quest-sync.json']);
const gistData=t=>JSON.parse(gistOf(t).files['jlpt-quest-sync.json'].content);
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const logs=[],errs=[],pops=[];
 const mk=async(name,init,extra={})=>{const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,colorScheme:'dark',timezoneId:'America/New_York',serviceWorkers:'block',acceptDownloads:true,...(BR==='chromium'?{isMobile:true}:{}),...extra});
   await ctx.route(/^https:\/\/(api\.github\.com|gist\.githubusercontent\.com)\//,api);
   if(init)await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${init})()}`);
   const p=await ctx.newPage();p.setDefaultTimeout(15000);let navs=0;p.on('console',m=>logs.push(name+': '+m.text()));p.on('pageerror',e=>errs.push(name+': '+e));
   p.on('popup',x=>pops.push(x.url()));ctx.on('page',x=>{if(x!==p)pops.push(x.url())});p.on('framenavigated',f=>{if(f===p.mainFrame())navs++;});
   await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(700);return {ctx,p,navs:()=>navs,name};};
 const ev=(d,f,a)=>d.p.evaluate(f,a);const W=ms=>new Promise(r=>setTimeout(r,ms));
 const until=async(d,f,ms=10000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(d,f,a).catch(()=>false))return true;await W(150);}return false;};
 const settings=async d=>{await d.p.tap('.tabbar [data-tab="settings"]');await d.p.waitForSelector('#bkSec');};
 const status=d=>ev(d,()=>(document.querySelector('#syncStatus')||{}).textContent||'');
 const addToken=async(d,t)=>{await settings(d);await d.p.locator('#tokIn').scrollIntoViewIfNeeded();await d.p.fill('#tokIn',t);await d.p.tap('#tokSave');};
 const idle=d=>until(d,()=>!document.querySelector('#syncStatus')||!/Syncing/.test(document.querySelector('#syncStatus').textContent),15000);
 const stores=d=>ev(d,K=>Object.fromEntries(K.map(k=>[k,JSON.parse(localStorage.getItem(k)||'null')])),KEYS);
 // ---------- device A: seeded long-time learner ----------
 const A=await mk('A',seed);const nav0A=A.navs();
 await settings(A);ok('Settings shows Backup & Sync with token help',await ev(A,()=>!!document.querySelector('#bkNow')&&!!document.querySelector('#bkRestore')&&/Tokens \(classic\)/.test(document.querySelector('.tokhelp').textContent)&&/only “gist”/.test(document.querySelector('.tokhelp').textContent)&&/unlisted, not private/.test(document.querySelector('.tokhelp').textContent)));
 await A.p.fill('#tokIn','not a token');await A.p.tap('#tokSave');ok('malformed token rejected inline (not saved)',await ev(A,()=>/doesn't look like a GitHub token/.test(document.querySelector('#tokErr').textContent)&&!__N5.SY.token));
 calls=[];await A.p.fill('#tokIn',TOK);await A.p.tap('#tokSave');await until(A,()=>!!__N5.SY.gistId&&/Last synced/.test((document.querySelector('#syncStatus')||{}).textContent||''),15000);
 const post=calls.filter(c=>c.m==='POST');
 ok('first sync creates ONE secret gist',post.length===1&&users[TOK].gists.length===1&&gistOf(TOK).public===false&&gistOf(TOK).description==='JLPT Vocab Quest sync',JSON.stringify(calls.map(c=>c.m+' '+c.p)));
 ok('gist id stored, status says synced',await ev(A,g=>__N5.SY.gistId===g,gistOf(TOK).id)&&/Last synced/.test(await status(A)));
 ok('gist holds a valid payload with all stores',(()=>{const d=gistData(TOK);return d.app==='jlpt-vocab-quest'&&d.v===1&&KEYS.every(k=>d.stores[k]);})());
 ok('token is masked in Settings (full token not shown)',await ev(A,t=>{const m=document.querySelector('#tokMask').textContent;return m.includes('••••')&&!document.body.innerText.includes(t)&&!document.querySelector('#tokIn');},TOK));
 ok('all API calls authenticated',calls.every(c=>c.auth));
 // ---------- device B: new phone with some different progress ----------
 const seedB=()=>{const now=Date.now(),today=new Date().toLocaleDateString('en-CA');const c={};for(let i=500;i<530;i++)c[i]={box:2,due:now+864e5,ok:2,bad:0,t:now-5e3};
   c[5]={box:5,due:now+9*864e5,ok:9,bad:1,t:now};   // reviewed on B more recently than A's copy
   localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:c,xp:900,streak:2,lastDay:today,levels:['n5'],answered:40,dailyHistory:{'2026-09-01':1},games:{hs:{'n5:sniper':777},badges:{'n5:level':'2026-09-20'},kb:{n5:['日']}},notes:{12:'B note'}}));
   localStorage.setItem('jlptVocabQuest.time.v1',JSON.stringify({goalMin:15,goalItems:0,goalNew:0,days:{[today]:{sec:3000,items:5,newW:2},'2026-09-02':{sec:600,items:30,newW:4}}}));
   localStorage.setItem('n5VocabQuest.kana.v1',JSON.stringify({cards:{'ん':{box:3,due:now+864e5,ok:3,bad:0,t:now}}}));};
 const B=await mk('B',seedB);const nav0B=B.navs();
 const aCard5=await ev(A,()=>__N5.S().cards[5]);const aXP=await ev(A,()=>__N5.S().xp);
 calls=[];await addToken(B,TOK);await until(B,()=>/Last synced/.test((document.querySelector('#syncStatus')||{}).textContent||''),15000);
 ok('second device finds the existing gist (no new gist)',!calls.some(c=>c.m==='POST')&&users[TOK].gists.length===1&&await ev(B,g=>__N5.SY.gistId===g,gistOf(TOK).id),JSON.stringify(calls.map(c=>c.m+' '+c.p)));
 const sB=await ev(B,()=>({n:Object.keys(__N5.S().cards).length,xp:__N5.S().xp,c5:__N5.S().cards[5],c600:__N5.S().cards[10000],c510:__N5.S().cards[510],hs:__N5.S().games.hs,bad:__N5.S().games.badges,note:__N5.S().notes[12],streak:__N5.S().streak,day:__N5.TS().days[new Date().toLocaleDateString('en-CA')],k:__N5.KS().cards['ん'],ka:__N5.KS().cards['あ'],kj:__N5.JS().cards['一']}));
 ok('B merged A’s cards + kept its own',sB.c600&&sB.c510&&sB.n>=236,JSON.stringify(sB.n));
 ok('XP = max of both devices (not summed)',sB.xp===Math.max(aXP,900),`${sB.xp} vs A ${aXP}`);
 ok('same card on both: latest review wins, counters never drop',sB.c5.box===5&&sB.c5.ok===Math.max(9,aCard5.ok)&&sB.c5.bad===Math.max(1,aCard5.bad),JSON.stringify([aCard5,sB.c5]));
 ok('history day merged by max per field',sB.day.sec===3000&&sB.day.items===177&&sB.day.newW===33,JSON.stringify(sB.day));
 ok('kana + kanji stores merged',sB.k&&sB.ka&&sB.kj);
 ok('games merged: high score max, badge kept',sB.hs['n5:sniper']===777&&sB.bad['n5:level']==='2026-09-20');
 ok('B pushed the merged data to the gist',(()=>{const d=gistData(TOK);return !!d.stores['n5VocabQuest.v1'].cards[510]&&!!d.stores['n5VocabQuest.v1'].cards[10000];})());
 // settings: latest wins by timestamp
 await ev(A,()=>{const S=__N5.S();S.theme='light';S.newPerDay=17;__N5.gsave();});await W(900);
 await A.p.tap('#syncNow');await idle(A);await W(300);
 ok('A pulls B’s progress on its next sync',await ev(A,()=>!!__N5.S().cards[510]&&__N5.S().games.hs['n5:sniper']===777&&__N5.S().notes[12]==='B note'&&!!__N5.KS().cards['ん']));
 await ev(B,()=>{const S=__N5.S();S.romaji=false;__N5.gsave();});await W(900);
 await B.p.tap('#syncNow');await idle(B);await W(300);
 const tB=await ev(B,()=>({theme:__N5.S().theme,np:__N5.S().newPerDay,ro:__N5.S().romaji,dt:document.documentElement.dataset.theme}));
 ok('settings changed on A reach B (latest wins)',tB.theme==='light'&&tB.np===17&&tB.dt==='light',JSON.stringify(tB));
 await A.p.tap('#syncNow');await idle(A);
 ok('setting changed later on B reaches A, A’s own later change kept',await ev(A,()=>__N5.S().romaji===false&&__N5.S().theme==='light'));
 const pA=await ev(A,()=>__N5.S().cards),pB=await ev(B,()=>__N5.S().cards);
 ok('after both sync, both devices hold identical SRS cards',same(pA,pB),`${Object.keys(pA).length} vs ${Object.keys(pB).length}`);
 const hc=users[TOK].gists[0].history.length;await A.p.tap('#syncNow');await idle(A);
 ok('sync with nothing new does not create a new gist version',users[TOK].gists[0].history.length===hc);
 // ---------- auto-sync after a session and on foreground ----------
 calls=[];await A.p.tap('.tabbar [data-tab="home"]');await A.p.tap('[data-m="meaning"]');await A.p.waitForSelector('#qhost .choice');await A.p.tap('#qhost .choice');await W(400);
 await A.p.tap('#backBtn');if(await A.p.$('body.studying'))await A.p.tap('#backBtn');
 ok('session end → automatic sync pushes the new answer',await (async()=>{for(let i=0;i<40;i++){if(calls.some(c=>c.m==='PATCH'))return true;await W(250);}return false;})(),JSON.stringify(calls.map(c=>c.m)));
 // ---------- friend: own token, own gist found by description ----------
 const F=await mk('F',null);calls=[];await addToken(F,TOK2);await until(F,()=>/Last synced/.test((document.querySelector('#syncStatus')||{}).textContent||''),15000);
 ok('friend’s token finds THEIR existing gist by description (no new gist), file added',!calls.some(c=>c.m==='POST')&&users[TOK2].gists.length===1&&!!users[TOK2].gists[0].files['jlpt-quest-sync.json']&&await ev(F,()=>__N5.SY.gistId==='friendgist01'));
 ok('friend’s data never touches the learner’s gist',!JSON.stringify(users[TOK].gists).includes('friendgist01')&&users[TOK].gists.length===1);
 // ---------- bad token ----------
 const D=await mk('D',null);await addToken(D,BAD);await idle(D);
 ok('bad token → plain-language error',/didn't accept the token/.test(await status(D))&&await ev(D,()=>__N5.SY.err==='token'),await status(D));
 ok('bad token: nothing stored as gist',await ev(D,()=>!__N5.SY.gistId));
 await D.p.tap('#tokRemove');ok('Remove token clears it from this device',await ev(D,()=>!__N5.SY.token&&!!document.querySelector('#tokIn')&&!JSON.parse(localStorage.getItem('jlptVocabQuest.sync.v1')).token));
 // ---------- rate limit + offline ----------
 mode='rate';await A.p.tap('.tabbar [data-tab="settings"]');await A.p.waitForSelector('#syncNow');await A.p.tap('#syncNow');await idle(A);
 ok('rate limit → plain-language error with retry time',/rate limit/.test(await status(A)),await status(A));mode='ok';
 await A.ctx.setOffline(true);mode='offline';await A.p.tap('#syncNow');await idle(A);
 ok('offline → friendly message, progress kept',/offline/.test(await status(A))&&await ev(A,()=>Object.keys(__N5.S().cards).length>200),await status(A));
 await A.ctx.setOffline(false);mode='ok';await A.p.tap('#syncNow');await idle(A);ok('back online → sync works again',/Last synced/.test(await status(A)));
 // ---------- backup file export (download fallback) ----------
 await ev(A,()=>{try{Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});}catch(e){}});
 const [dl]=await Promise.all([A.p.waitForEvent('download'),A.p.tap('#bkNow')]);const fp='/workspace/pwt/bk_'+BR+'.json';await dl.saveAs(fp);
 const today=await ev(A,()=>new Date().toLocaleDateString('en-CA'));
 ok('backup file name jlpt-quest-backup-YYYY-MM-DD.json',dl.suggestedFilename()===`jlpt-quest-backup-${today}.json`,dl.suggestedFilename());
 const file=JSON.parse(fs.readFileSync(fp,'utf8'));const sA=await stores(A);
 ok('backup holds every store, identical to this device’s saved data',KEYS.every(k=>same(file.stores[k],sA[k])),KEYS.filter(k=>!same(file.stores[k],sA[k])).join());
 ok('backup is versioned',file.app==='jlpt-vocab-quest'&&file.v===1&&!!file.exported);
 ok('"Last backup" updates',await ev(A,()=>/just now/.test(document.querySelector('#bkLast').textContent)));
 // Web Share path (iPhone): navigator.share gets the file
 await ev(A,()=>{window.__shared=null;Object.defineProperty(navigator,'canShare',{configurable:true,value:d=>!!(d&&d.files)});Object.defineProperty(navigator,'share',{configurable:true,value:async d=>{window.__shared={n:d.files[0].name,t:await d.files[0].text()};}});});
 await A.p.tap('#bkNow');await until(A,()=>!!window.__shared,5000);
 ok('Web Share API used with the file when available',await ev(A,d=>window.__shared&&window.__shared.n===`jlpt-quest-backup-${d}.json`&&JSON.parse(window.__shared.t).v===1,today));
 // ---------- restore into a fresh device + undo ----------
 const E=await mk('E',null);await settings(E);const before=await stores(E);
 await E.p.setInputFiles('#bkFile',fp);await E.p.waitForSelector('#bkPreview');
 const pv=await ev(E,()=>document.querySelector('#bkPreview').innerText);
 ok('restore shows a preview (date, words learned, XP) before changing anything',/words learned/.test(pv)&&new RegExp(file.stores['n5VocabQuest.v1'].xp+' XP').test(pv)&&same(await stores(E),before),pv.slice(0,160));
 await E.p.tap('#bkGo');await until(E,()=>!document.querySelector('#bkPreview'));await W(800);
 const after=await stores(E);ok('restored data identical to the backup (every store)',KEYS.every(k=>same(after[k],file.stores[k])),KEYS.filter(k=>!same(after[k],file.stores[k])).join());
 ok('in-app state reloaded too (XP, cards)',await ev(E,x=>__N5.S().xp===x&&Object.keys(__N5.S().cards).length>200,file.stores['n5VocabQuest.v1'].xp));
 await E.p.waitForSelector('#bkUndo');await E.p.tap('#bkUndo');await W(800);const undone=await stores(E);
 ok('Undo restore brings back the previous data',KEYS.every(k=>same(undone[k],before[k])||(before[k]===null&&undone[k]&&!Object.keys(undone[k].cards||{}).length)),KEYS.filter(k=>!same(undone[k],before[k])).join());
 await E.p.setInputFiles('#bkFile',{name:'x.json',mimeType:'application/json',buffer:Buffer.from('{"hello":1}')});await E.p.waitForSelector('#bkAlert');
 ok('invalid file rejected with a clear message',/isn't a JLPT Vocab Quest backup/.test(await ev(E,()=>document.querySelector('#bkAlert').innerText)));await E.p.tap('#bkOk');
 // ---------- restore a previous version from the gist history ----------
 await A.p.tap('#syncHist');await A.p.waitForSelector('.histrow');const nv=await ev(A,()=>document.querySelectorAll('.histrow').length);
 ok('previous versions listed from the gist history',nv===users[TOK].gists[0].history.length,`${nv}`);
 const hl=users[TOK].gists[0].history.length;await A.p.tap(`.histrow >> nth=${nv-1}`);await A.p.waitForSelector('#bkPreview');await A.p.tap('#bkGo');
 await (async()=>{for(let i=0;i<40&&users[TOK].gists[0].history.length===hl;i++)await W(250);})();
 ok('restoring a version shows preview, keeps undo, pushes it as latest',users[TOK].gists[0].history.length===hl+1&&await ev(A,()=>!!__N5.getSnapshot()));
 // ---------- no token leaks ----------
 const all=[TOK,TOK2,BAD];const leak=s=>all.some(t=>s.includes(t));
 ok('token not in the backup file',!leak(fs.readFileSync(fp,'utf8')));
 ok('token not in any gist content',!leak(JSON.stringify(Object.values(users).map(u=>u.gists.map(g=>g.history)))));
 ok('token not in the console',!leak(logs.join('\n')),logs.filter(leak).slice(0,2).join(' | '));
 ok('token only in the device-only sync key',await ev(A,t=>Object.keys(localStorage).filter(k=>(localStorage.getItem(k)||'').includes(t)).join()==='jlptVocabQuest.sync.v1',TOK));
 ok('no error toasts',!(await ev(A,()=>!!document.querySelector('.errtoast'))));
 ok('no page errors',!errs.length,errs.slice(0,3).join(' | '));ok('no popups',!pops.length,pops.join());ok('no navigation (A, B)',A.navs()===nav0A&&B.navs()===nav0B);
 // weekly reminder banner (E has no token)
 await ev(E,()=>{const y=__N5.SY;y.remind=true;y.lastBackup=Date.now()-8*864e5;y.snooze=0;});await E.p.tap('.tabbar [data-tab="home"]');
 ok('weekly reminder banner on Home when the last backup is >7 days old',await until(E,()=>!!document.querySelector('#bkBanner'),4000));
 await E.p.tap('#bkBanX');ok('banner can be snoozed',await ev(E,()=>!document.querySelector('#bkBanner')&&__N5.SY.snooze>0));
 await ev(E,()=>{__N5.SY.remind=false;});
 // app open → automatic sync (after the navigation checks above)
 calls=[];await A.p.reload();ok('app open → automatic sync',await (async()=>{for(let i=0;i<40;i++){if(calls.some(c=>c.m==='GET'&&/^\/gists\/g/.test(c.p)))return true;await W(250);}return false;})());
 console.log(`SUMMARY ${BR} ${R.filter(Boolean).length} / ${R.length}`);await b.close();process.exit(R.every(Boolean)?0:1);
})().catch(e=>{console.log('CRASH',e.message.slice(0,600));process.exit(1);});
