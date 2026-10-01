// Detention: leech copy-practice. Pick all/subset, 10 correct lines per word (wrong = shake, no count), romaji→kana,
// Enter submits, keyboard stays up, no FSRS change / no new-word count, XP modest, "Released from detention",
// optional graded recall check. iPhone size, light + dark.
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 for(const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
  for(let i=0;i<10;i++)cards[i]={box:2,due:now+D,ok:3,bad:i<3?6:0,lapses:i<3?2:0,run:0,f:{st:2,sp:null,s:3,d:7,lr:now-D,due:now+D}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,newLimit:5,xp:100}));});
 const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(900);await p.evaluate(()=>__N5.loadLevel('n5'));
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);const T=s=>scheme+': '+s;
 await ev(()=>__N5.go(__N5.leechView));await W(300);
 ok(T('Leeches page has a Detention button'),await ev(()=>!!document.querySelector('#detention')));
 await p.tap('#detention');await W(300);
 ok(T('picker lists all 3 leeches, all selected'),await ev(()=>document.querySelectorAll('#detList input:checked').length===3));
 await p.tap('#detNone');ok(T('Clear → Start disabled'),await ev(()=>document.querySelector('#detGo').disabled));
 await p.tap('#detList label:nth-child(1)');await p.tap('#detList label:nth-child(2)');
 const sel=await ev(()=>[...document.querySelectorAll('#detList input:checked')].map(x=>+x.value));
 ok(T('subset selection (2)'),sel.length===2&&await ev(()=>/\(2\)/.test(document.querySelector('#detGo').textContent)));
 const rows=await ev(()=>Math.min(...[...document.querySelectorAll('.detpick')].map(x=>x.getBoundingClientRect().height)));ok(T('rows ≥54px'),rows>=54,rows);
 const snap=await ev(()=>({cards:JSON.stringify(__N5.S().cards),nt:__N5.newToday().length,xp:__N5.S().xp}));
 await p.tap('#detGo');await W(400);
 const v=await ev(()=>{const id=window.__det.ids[0],w=__N5.WORDS[id];return {id,kana:w.kana,jp:w.jp,shown:document.querySelector('#detJp').textContent===w.jp&&document.querySelector('#detKana').textContent.includes(w.kana)&&document.querySelector('#detEn').textContent===w.en,spk:!!document.querySelector('#detSpk'),h:document.querySelector('#detIn').getBoundingClientRect().height,bh:document.querySelector('#detOk').getBoundingClientRect().height};});
 ok(T('word, reading, meaning and audio button visible'),v.shown&&v.spk,JSON.stringify(v));
 ok(T('input and button ≥54px'),v.h>=54&&v.bh>=54,JSON.stringify(v));
 // wrong entry
 await p.fill('#detIn','zzz');await p.press('#detIn','Enter');await W(100);
 ok(T('wrong entry: shakes, does not count'),await ev(()=>document.querySelector('#detIn').classList.contains('shake')&&document.querySelector('#detN').textContent==='0'&&document.querySelectorAll('#detLines li').length===0));
 // romaji input converts
 await p.fill('#detIn','');await p.focus('#detIn');await p.keyboard.type('ka');await W(50);ok(T('romaji → kana while typing'),await ev(()=>document.querySelector('#detIn').value==='か'));
 // 10 correct lines (Enter), keyboard stays (focus kept)
 let focusOK=true,counts=[];
 for(let k=0;k<10;k++){await p.fill('#detIn',v.kana);await p.press('#detIn','Enter');await W(60);counts.push(await ev(()=>document.querySelector('#detN').textContent));if(k<9&&!(await ev(()=>document.activeElement&&document.activeElement.id==='detIn')))focusOK=false;}
 ok(T('counter 1/10 … stacks lines'),counts.slice(0,9).join()==='1,2,3,4,5,6,7,8,9',counts.join());
 ok(T('input keeps focus (keyboard stays up)'),focusOK);
 await W(600);ok(T('after 10 lines → next word'),await ev(id=>window.__det.i===1&&document.querySelector('#detN').textContent==='0'&&document.querySelector('#detJp').textContent!==__N5.WORDS[id].jp,v.id));
 // tap ✍️ button path for the second word
 const k2=await ev(()=>__N5.WORDS[window.__det.ids[1]].kana);
 for(let k=0;k<10;k++){await p.fill('#detIn',k2);await p.tap('#detOk');await W(60);}
 ok(T('Released from detention'),await (async()=>{for(let i=0;i<20;i++){if(await ev(()=>/Released from detention/.test(document.querySelector('#detDone')?.textContent||'')))return true;await W(100);}return false;})());
 const z=await ev(()=>({cards:JSON.stringify(__N5.S().cards),nt:__N5.newToday().length,xp:__N5.S().xp,lines:window.__det.lines}));
 ok(T('no FSRS / card change, no new-word count'),z.cards===snap.cards&&z.nt===snap.nt);
 ok(T('modest XP'),z.xp>snap.xp&&z.xp-snap.xp<=60,`${snap.xp}->${z.xp}`);
 ok(T('20 lines written'),z.lines===20,z.lines);
 const btn=await ev(()=>Math.min(...[...document.querySelectorAll('#detDone .btn')].map(x=>x.getBoundingClientRect().height)));ok(T('finish buttons ≥54px'),btn>=54,btn);
 const bg=await ev(()=>getComputedStyle(document.querySelector('#detDone')).backgroundColor);ok(T('chalkboard background (dark teal)'),/rgb\((1[0-9]|2[0-9]), (3[0-9]|4[0-9]|6[0-9]), (3[0-9]|4[0-9]|5[0-9]|6[0-9])\)/.test(bg),bg);
 ok(T('no horizontal overflow'),await ev(()=>document.documentElement.scrollWidth<=375));
 // graded recall check
 await p.tap('#detCheck');await W(400);
 ok(T('recall check: answer hidden (typing)'),await ev(()=>!!document.querySelector('#typein')&&!document.querySelector('#detKana')));
 const id1=await ev(()=>{const t=document.querySelector('.prompt.en').textContent;return window.__det.ids.find(i=>__N5.WORDS[i].en===t);});
 const c0=await ev(id=>JSON.stringify(__N5.S().cards[id]),id1);
 await p.fill('#typein',await ev(id=>__N5.WORDS[id].kana,id1));await p.press('#typein','Enter');await W(300);
 ok(T('recall check is graded normally (FSRS updated)'),await ev(([id,c0])=>JSON.stringify(__N5.S().cards[id])!==c0&&__N5.S().cards[id].ok===JSON.parse(c0).ok+1,[id1,c0]));
 ok(T('no page errors'),!errs.length,errs.join(' | '));
 await ctx.close();}
 await b.close();const pass=R.filter(Boolean).length;console.log(`SUMMARY ${BR} tdet ${pass}/${R.length} passed`);process.exit(pass===R.length?0:1);
})().catch(e=>{console.log('CRASH',e.stack);process.exit(1);});
