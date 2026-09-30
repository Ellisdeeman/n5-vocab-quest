// "Retype after a miss" test (iPhone size, touch). BROWSER=webkit|chromium URL=... SHOTS=1
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const SHOTS=process.env.SHOTS;
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:375,height:667},hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};for(let i=0;i<60;i++)cards[i]={box:2,due:now+864e5,ok:3,bad:0,t:now-864e5};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,unlockAll:true}));});
 const p=await ctx.newPage();p.setDefaultTimeout(10000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 p.on('dialog',d=>d.accept());
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(600);
 const ev=(f,a)=>p.evaluate(f,a);const W=ms=>p.waitForTimeout(ms);const tag=scheme;
 const curWord=()=>ev(()=>{const en=document.querySelector('.prompt.en')?.textContent,kn=document.querySelector('.retype .rtlabel b')?.textContent;const ids=__N5.ALL().ALL_IDS;const W=__N5.WORDS;const id=ids.find(i=>W[i]&&W[i].en===en&&(!kn||W[i].kana===kn));return id==null?null:{id,kana:W[id].kana,roma:__N5.ROMA(W[id].kana)};});
 const snap=id=>ev(id=>{const S=__N5.S(),c=S.cards[id]||{};return JSON.stringify({c,xp:S.xp,ans:S.answered})},id);
 const nextState=()=>ev(()=>{const n=document.querySelector('#nextBtn');return n?(n.disabled?'disabled':'enabled'):'none'});
 const inView=sel=>ev(s=>{const e=document.querySelector(s);if(!e)return false;const r=e.getBoundingClientRect(),vh=(window.visualViewport||{}).height||innerHeight;return r.top>=0&&r.bottom<=vh+1;},sel);
 const typeAns=async(txt)=>{await p.fill('#typein','');await p.type('#typein',txt);await p.keyboard.press('Enter');await W(250);};
 // defaults
 ok(`${tag}: defaults retype ON, MC OFF`,await ev(()=>{const S=__N5.S();return S.retype===true&&S.retypeMC===false}));
 // ---- A. typing: wrong answer
 await ev(()=>__N5.go(()=>__N5.quiz('typing',__N5.ALL().ALL_IDS.slice(0,60),'Typing')));await p.waitForSelector('#typein');await W(300);
 const en0=await ev(()=>document.querySelector('.prompt.en').textContent);const pre=await ev(en=>{const W=__N5.WORDS,o={};__N5.ALL().ALL_IDS.forEach(i=>{if(W[i]&&W[i].en===en)o[i]=JSON.stringify({c:__N5.S().cards[i]||{},xp:__N5.S().xp,ans:__N5.S().answered})});return o},en0);
 await typeAns('zzqx');
 let w=await curWord();ok(`${tag}: typing quiz word found`,!!w,JSON.stringify(w));const s0=pre[w.id];
 ok(`${tag}: wrong typing → retype box shows`,await p.isVisible('.retype #rtIn'));
 ok(`${tag}: prompt text "Type it once to lock it in" + correct answer`,await ev(k=>{const t=document.querySelector('.retype').textContent;return /Type it once to lock it in/.test(t)&&t.includes(k)},w.kana));
 ok(`${tag}: Next disabled until retyped`,await nextState()==='disabled');
 ok(`${tag}: retype field focused (keyboard stays up)`,await ev(()=>document.activeElement&&document.activeElement.id==='rtIn'));
 await W(450);ok(`${tag}: retype field visible in viewport`,await inView('#rtIn'));
 const tg=await ev(()=>['#rtIn','#rtGo','#rtSkip','#nextBtn'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return Math.round(r.height)}));
 ok(`${tag}: retype targets ≥54px`,tg.every(h=>h>=54),JSON.stringify(tg));
 ok(`${tag}: fits 375px`,await ev(()=>document.documentElement.scrollWidth<=innerWidth));
 const s1=await snap(w.id);const c1=JSON.parse(s1).c;
 ok(`${tag}: miss recorded in SRS (bad+1, box dropped)`,c1.bad===JSON.parse(s0).c.bad+1&&c1.box<2,s1);
 // Enter outside the field must not advance
 await ev(()=>document.activeElement.blur());await p.keyboard.press('Enter');await W(200);
 ok(`${tag}: Enter outside the field doesn't skip`,await p.isVisible('.retype')&&await nextState()==='disabled');
 await p.tap('#rtIn');await p.type('#rtIn','qqqq');await p.keyboard.press('Enter');await W(200);
 ok(`${tag}: wrong retype → gentle "not quite", still locked`,await ev(()=>/Not quite/.test(document.querySelector('#rtMsg').textContent))&&await nextState()==='disabled');
 if(SHOTS){await W(400);await p.screenshot({path:`/workspace/n5-game/shot-retype-typing-${scheme}.png`});}
 await p.fill('#rtIn','');await p.type('#rtIn',w.roma);await p.keyboard.press('Enter');await W(250);
 ok(`${tag}: romaji retype (IME → kana) accepted → Next enabled`,await nextState()==='enabled'&&await ev(()=>__N5.RT.box.dataset.state==='ok'),await ev(()=>document.querySelector('#rtIn').value));
 ok(`${tag}: retype didn't change score/SRS/XP`,await snap(w.id)===s1,(await snap(w.id))+' vs '+s1);
 if(SHOTS){await p.screenshot({path:`/workspace/n5-game/shot-retype-done-${scheme}.png`});}
 await p.keyboard.press('Enter');await W(300);
 ok(`${tag}: Enter after lock-in goes to next question`,await p.isVisible('#typein')&&!(await p.$('.retype'))&&await ev(()=>!document.querySelector('#typein').disabled));
 // ---- B. typing: I don't know, answer in kana, OK button
 const en2=await ev(()=>document.querySelector('.prompt.en').textContent);const pre2=await ev(en=>{const W=__N5.WORDS,o={};__N5.ALL().ALL_IDS.forEach(i=>{if(W[i]&&W[i].en===en)o[i]=JSON.stringify({c:__N5.S().cards[i]||{}})});return o},en2);
 await p.tap('#giveBtn');await W(250);w=await curWord();const s2=pre2[w.id];
 ok(`${tag}: I don't know → retype required`,await p.isVisible('#rtIn')&&await nextState()==='disabled');
 const s3=await snap(w.id);ok(`${tag}: IDK still a miss in SRS`,JSON.parse(s3).c.bad===JSON.parse(s2).c.bad+1);
 await p.fill('#rtIn',w.kana);await p.tap('#rtGo');await W(200);
 ok(`${tag}: kana retype via OK button accepted`,await nextState()==='enabled');
 ok(`${tag}: IDK retype left SRS/XP unchanged`,await snap(w.id)===s3);
 await p.tap('#nextBtn');await W(300);
 // ---- C. skip link
 await p.tap('#giveBtn');await W(200);const sk0=await ev(()=>__N5.RT.skipped);await p.tap('#rtSkip');await W(150);
 ok(`${tag}: Skip link unlocks Next`,await nextState()==='enabled'&&await ev(n=>__N5.RT.skipped===n+1,sk0));
 await p.tap('#backBtn');await W(300);
 // ---- D. settings toggles
 await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('[data-k="retype"]');
 ok(`${tag}: settings shows both toggles (typing on, MC off)`,await ev(()=>document.querySelector('[data-k="retype"]').classList.contains('on')&&!document.querySelector('[data-k="retypeMC"]').classList.contains('on')));
 const st=await ev(()=>['retype','retypeMC'].map(k=>{const r=document.querySelector(`[data-k="${k}"]`).getBoundingClientRect();return [r.width,r.height]}));
 await ev(()=>document.querySelector('[data-k="retype"]').scrollIntoView({block:'center'}));if(SHOTS)await p.screenshot({path:`/workspace/n5-game/shot-retype-settings-${scheme}.png`});
 await p.tap('[data-k="retype"]');await W(100);
 ok(`${tag}: typing toggle off saves`,await ev(()=>__N5.S().retype===false&&JSON.parse(localStorage.getItem('n5VocabQuest.v1')).retype===false));
 await ev(()=>__N5.go(()=>__N5.quiz('typing',__N5.ALL().ALL_IDS.slice(0,60),'Typing')));await p.waitForSelector('#typein');await W(200);
 await typeAns('zzqx');ok(`${tag}: toggle off → no retype, Next enabled`,!(await p.$('.retype'))&&await nextState()==='enabled');
 await p.tap('#backBtn');await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('[data-k="retype"]');await p.tap('[data-k="retype"]');await W(100);
 // MC off (default): meaning quiz miss → no retype
 const wrongIdx=()=>ev(()=>{const en=document.querySelector('.prompt').textContent;return [...document.querySelectorAll('.choice')].findIndex(b=>!b.textContent.includes(en))&&0});
 const pickWrong=async()=>{const id=await ev(()=>{const jp=document.querySelector('.prompt.jp').textContent;const W=__N5.WORDS;const i=__N5.ALL().ALL_IDS.find(i=>W[i]&&W[i].jp===jp);return i});const en=await ev(id=>__N5.WORDS[id].en,id);
   const i=await ev(en=>[...document.querySelectorAll('.choice')].findIndex(b=>!b.textContent.includes(en)),en);await p.tap(`.choice[data-i="${i}"]`);await W(250);return id;};
 await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.ALL().ALL_IDS.slice(0,60),'Meaning')));await p.waitForSelector('.choice');await W(200);
 await pickWrong();ok(`${tag}: MC toggle off → wrong pick has no retype`,!(await p.$('.retype'))&&await nextState()==='enabled');
 await p.tap('#backBtn');await p.tap('.tabbar [data-tab="settings"]');await p.waitForSelector('[data-k="retypeMC"]');await p.tap('[data-k="retypeMC"]');await W(100);
 ok(`${tag}: MC toggle on saves`,await ev(()=>__N5.S().retypeMC===true));
 await ev(()=>__N5.go(()=>__N5.quiz('meaning',__N5.ALL().ALL_IDS.slice(0,60),'Meaning')));await p.waitForSelector('.choice');await W(200);
 const mid=await pickWrong();const m1=await snap(mid);
 ok(`${tag}: MC on → wrong pick requires typing the reading`,await p.isVisible('#rtIn')&&await nextState()==='disabled');
 if(SHOTS){await W(400);await p.screenshot({path:`/workspace/n5-game/shot-retype-mc-${scheme}.png`});}
 await p.type('#rtIn',await ev(id=>__N5.ROMA(__N5.WORDS[id].kana),mid));await p.keyboard.press('Enter');await W(200);
 ok(`${tag}: MC retype accepted, score unchanged`,await nextState()==='enabled'&&await snap(mid)===m1);
 await p.tap('#nextBtn');await W(250);await p.tap('#qhost .idk');await W(200);
 ok(`${tag}: MC on → I don't know requires retype`,await p.isVisible('#rtIn')&&await nextState()==='disabled');
 // kana: typing + MC
 await ev(()=>__N5.go(()=>__N5.kanaSession('type')));await p.waitForSelector('#typein');await W(200);
 const kid=await ev(()=>document.querySelector('.kprompt').textContent);const k0=await ev(k=>JSON.stringify(__N5.KS().cards[k]||{}),kid);
 await p.type('#typein','xq');await p.keyboard.press('Enter');await W(200);
 ok(`${tag}: kana typing miss → retype`,await p.isVisible('#rtIn')&&await nextState()==='disabled');
 const k1=await ev(k=>JSON.stringify(__N5.KS().cards[k]),kid);
 await p.type('#rtIn',await ev(k=>__N5.KITEMS[k].r,kid));await p.keyboard.press('Enter');await W(200);
 ok(`${tag}: kana romaji retype accepted, kana SRS unchanged by retype`,await nextState()==='enabled'&&await ev(k=>JSON.stringify(__N5.KS().cards[k]),kid)===k1&&k1!==k0);
 await ev(()=>__N5.go(()=>__N5.kanaSession('r2k')));await p.waitForSelector('.choice');await W(200);
 const kr=await ev(()=>{const r=document.querySelector('.prompt').textContent;return Object.values(__N5.KITEMS).find(x=>x.r===r&&[...document.querySelectorAll('.choice')].some(b=>b.textContent.slice(1)===x.id)).id});
 await ev(k=>{const b=[...document.querySelectorAll('.choice')].find(b=>b.textContent.slice(1)!==k);b.click();},kr);await W(200);
 ok(`${tag}: kana MC miss → retype (MC toggle on)`,await p.isVisible('#rtIn'));
 await p.fill('#rtIn',kr);await p.tap('#rtGo');await W(150);ok(`${tag}: kana typed as kana accepted`,await nextState()==='enabled');
 // Pimsleur typing drill uses the same flow
 const pmIds=await ev(()=>__N5.pimsLessonIds(1,4));
 await ev(ids=>__N5.go(()=>__N5.pimsDrill(ids,'Pims typing',null,'typing')),pmIds);await p.waitForSelector('#typein');await W(300);
 await typeAns('zzqx');ok(`${tag}: Pimsleur typing drill miss → retype`,await p.isVisible('#rtIn')&&await nextState()==='disabled');
 // ---- E. games & timed modes unaffected (both toggles on)
 ok(`${tag}: both toggles on for game checks`,await ev(()=>__N5.S().retype&&__N5.S().retypeMC));
 await ev(()=>__N5.go(()=>__N5.speed()));await p.tap('#startBtn');await p.waitForSelector('#qhost .choice');await p.tap('#qhost .idk');await W(150);
 ok(`${tag}: Speed Round miss → no retype`,!(await p.$('.retype')));
 await ev(()=>__N5.go(()=>__N5.kanaSpeed()));await p.tap('#startBtn');await p.waitForSelector('#qhost .choice');await p.tap('#qhost .idk');await W(150);
 ok(`${tag}: Kana Speed Round miss → no retype`,!(await p.$('.retype')));
 await ev(()=>__N5.go(()=>__N5.bossFight('n5',__N5.bossList('n5')[0],()=>{})));await p.waitForSelector('#qhost .choice',{timeout:20000});await p.tap('#qhost .idk');await W(200);
 ok(`${tag}: Boss Battle miss → no retype, Next enabled`,!(await p.$('.retype'))&&await nextState()==='enabled');
 await ev(()=>__N5.go(()=>__N5.sniperGame('n5',()=>{})));await W(400);const gs=await p.$('#gStart');if(gs){await p.tap('#gStart');await p.waitForSelector('#gIdk',{timeout:15000});await W(900);await p.tap('#gIdk');await W(300);}
 ok(`${tag}: Listening Sniper miss → no retype`,!!gs&&!(await p.$('.retype')));
 ok(`${tag}: no page errors`,errs.length===0,errs.join(' | '));
 await ctx.close();}
 console.log('SUMMARY',BR,R.filter(x=>x).length,'/',R.length);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('FAIL crash',e.message.split('\n')[0]);console.log('SUMMARY',BR,'crash');process.exit(1)});
