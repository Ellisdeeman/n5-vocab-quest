// Batch 6: Auto pace (unit + Home + Settings + cap), 40+ stories with known-word %, Listening-only mode
// (audio-only queue on one reused <audio>, reveal, prev/next/pause, silence gaps, Media Session, comprehension check,
// sentences source, stop). iPhone-size, touch. BROWSER=webkit|chromium SHOTS=1
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const SHOTS=process.env.SHOTS;
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const SH='/workspace/n5-game/';
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const errs=[];
 const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,colorScheme:'light',timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{window.__played=[];HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);this.dispatchEvent(new Event('play'));return Promise.resolve();};
  if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);
  const now=Date.now(),D=864e5,today=new Date().toLocaleDateString('en-CA'),rl={};
  for(let i=0;i<7;i++){const d=new Date(now-i*D).toLocaleDateString('en-CA');rl[d]={n5f:10,'n5f+':9};}   // 70 reviews, 90%
  const cards={};for(let i=0;i<40;i++)cards[i]={box:3,due:now+30*D,ok:4,bad:0,f:{st:2,sp:null,s:40,d:5,lr:now-D,due:now+30*D}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,retype:false,newLimit:20,pathFocus:'n5',xp:50,speech:true,revLog:rl}));
  localStorage.setItem('jlptVocabQuest.time.v1',JSON.stringify({goalMin:15,days:{}}));});
 const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(800);
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const shot=async n=>{if(SHOTS){await p.waitForTimeout(700);await p.screenshot({path:SH+'shot-'+n+'.png'});}};
 const fits=()=>ev(()=>document.documentElement.scrollWidth<=innerWidth);
 // ---------- Auto pace: unit
 const u=await ev(()=>{const S=__N5.S(),now=Date.now(),D=864e5,mk=(n,ok)=>{const rl={};for(let i=0;i<7;i++){const d=new Date(now-i*D).toLocaleDateString('en-CA');rl[d]={n5f:n,'n5f+':ok};}return rl;};
  const keep=JSON.stringify({rl:S.revLog,c:S.cards}),out={};
  S.revLog=mk(10,10);out.hi=__N5.paceCompute();
  S.revLog=mk(20,17);out.mid=__N5.paceCompute();
  S.revLog=mk(10,7.8);out.lo=__N5.paceCompute();
  S.revLog={};out.none=__N5.paceCompute();
  S.revLog=mk(10,10);S.newLimit='off';out.off=__N5.paceCompute();S.newLimit=20;
  S.revLog=mk(10,10);for(let i=100;i<800;i++)S.cards[i]={box:2,due:now+3*D,ok:2,bad:0,f:{st:2,s:3,d:5,lr:now-D,due:now+(i%7)*D}};out.load=__N5.paceCompute();
  const k=JSON.parse(keep);S.revLog=k.rl;S.cards=k.c;delete S.pace;return out;});
 ok('pace: ≥90% accuracy, light load → max (20)',u.hi.n===20&&u.hi.acc===100,JSON.stringify(u.hi));
 ok('pace: 85% → about half way (12–13)',u.mid.n>=12&&u.mid.n<=13,JSON.stringify(u.mid));
 ok('pace: 78% → minimum (5)',u.lo.n===5,JSON.stringify(u.lo));
 ok('pace: no review history → max, flagged',u.none.n===20&&u.none.acc===null,JSON.stringify(u.none));
 ok('pace: manual limit Off → 30/day ceiling',u.off.n===30,JSON.stringify(u.off));
 ok('pace: heavy 7-day forecast (700 reviews ≈ 13 min/day vs 15) → reduced',u.load.n<12&&u.load.load>10,JSON.stringify(u.load));
 // ---------- Home explanation + cap
 const home=await ev(()=>{__N5.go(__N5.home);const n=document.querySelector('#paceNote');return n&&n.textContent.replace(/\s+/g,' ');});
 ok('Home: "Today: 20 new words — you\'re at 90% accuracy"',/Today: 20 new words — you're at 90% accuracy/.test(home||''),home);
 ok('cap uses the paced number (newLimitV = 20, newLeft = 20)',await ev(()=>__N5.newLimitV()===20&&__N5.newLeft()===20&&__N5.newPerSessionV()===20));
 await ev(()=>document.querySelector('#paceNote').scrollIntoView({block:'center'}));await W(200);await shot('pace-home');
 await p.tap('#paceInfo');await p.waitForSelector('.paceinfo');ok('ⓘ explains the rule',await ev(()=>/≥ 90% → full pace/.test(document.querySelector('.paceinfo').textContent)));await shot('pace-info');
 await p.tap('#paceOk');
 // accuracy dip on a new day → fewer words, manual limit still max
 await ev(()=>{const S=__N5.S(),now=Date.now(),D=864e5;for(let i=0;i<7;i++){const d=new Date(now-i*D).toLocaleDateString('en-CA');S.revLog[d]={n5f:20,'n5f+':16};}S.pace.d='2000-01-01';__N5.go(__N5.home);});
 const dip=await ev(()=>({t:document.querySelector('#paceNote').textContent.replace(/\s+/g,' '),n:__N5.newLimitV()}));
 ok('80% accuracy → minimum with an explanation',dip.n===5&&/80% accuracy/.test(dip.t)&&/sweet spot/.test(dip.t),JSON.stringify(dip));
 // Settings
 await ev(()=>__N5.go(__N5.settingsView));await p.waitForSelector('#paceSw');
 ok('Settings: Auto pace on by default, min seg 5',await ev(()=>document.querySelector('#paceSw').classList.contains('on')&&document.querySelector('#paceMinSeg button.on').dataset.v==='5'));
 await ev(()=>document.querySelector('#paceSw').scrollIntoView({block:'center'}));await W(150);await shot('pace-settings');
 await p.tap('#paceMinSeg button[data-v="10"]');ok('min → 10 raises today\'s floor',await ev(()=>__N5.newLimitV()===10));
 await p.tap('#paceSw');ok('Auto pace off → manual limit (20), no Home note',await ev(()=>{const r=__N5.newLimitV()===20;__N5.go(__N5.home);return r&&!document.querySelector('#paceNote');}));
 await ev(()=>{const S=__N5.S();S.autoPace=true;S.paceMin=5;delete S.pace;});
 // ---------- Stories
 const rd=await ev(()=>({n:__N5.RD_DATA.length,t4:__N5.RD_DATA.filter(s=>s.tier===4).length,ids:new Set(__N5.RD_DATA.map(s=>s.id)).size,order:__N5.RD_DATA.every((s,i,a)=>!i||a[i-1].tier<=s.tier)}));
 ok('≥ 40 stories, 5 N4-preview, unique ids, ordered by tier',rd.n>=40&&rd.t4===5&&rd.ids===rd.n&&rd.order,JSON.stringify(rd));
 await ev(()=>__N5.go(__N5.readingHome));await p.waitForSelector('.rdcard');
 ok('Reading hub: 4 tiers incl. N4 preview',await ev(()=>[...document.querySelectorAll('.sechead')].some(h=>/N4 preview/.test(h.textContent))));
 const kn=await ev(()=>{const st=__N5.RD.r17,c=document.querySelector('.rdcard[data-rd="r17"] .rdpct');return {txt:c&&c.textContent,pct:__N5.rdKnownPct(st)};});
 ok('story card shows known-word %',/\d+% known · \d+% seen/.test(kn.txt||''),JSON.stringify(kn));
 ok('fits 393px (reading hub)',await fits());await shot('reading-hub40');
 const aud=await ev(async()=>{const r=await fetch('audio/rd/r24-5.mp3',{method:'HEAD'});const r2=await fetch('audio/rd/r40-8.mp3',{method:'HEAD'});return [r.status,r2.status];});
 ok('new story audio served (r24-5, r40-8)',aud.every(s=>s===200),JSON.stringify(aud));
 await ev(()=>__N5.go(()=>__N5.rdStory('r27',__N5.readingHome)));await p.waitForSelector('.rdsent');await shot('reading-r27');
 ok('new story opens (r27, 8 sentences)',await ev(()=>document.querySelectorAll('.rdsent').length===8));
 // ---------- Listening-only
 await ev(()=>__N5.go(__N5.home));await p.tap('[data-m="listen-only"]');await p.waitForSelector('#loGo');
 ok('Home tile → Listening-only setup',true);ok('fits 393px (setup)',await fits());await shot('listen-setup');
 await p.tap('#loScope button[data-v="all"]');ok('options persist (scope all)',await ev(()=>__N5.S().lo.scope==='all'));
 const p0=await ev(()=>window.__played.length);
 await p.tap('#loGo');await p.waitForSelector('#loCard');
 ok('Start (inside the tap) plays the first story clip on one reused <audio>',await ev(p0=>window.__played.length>p0&&/audio\/rd\/r01-1\.mp3$/.test(window.__played[window.__played.length-1])&&__N5.LO.el===__N5.LO_EL,p0));
 ok('audio only: text hidden',await ev(()=>/Audio only/.test(document.querySelector('#loText').textContent)));
 ok('title / position shown',await ev(()=>/Story 1 · 1\/\d/.test(document.querySelector('#loSub').textContent)));
 await shot('listen-player');
 await p.tap('#loReveal');ok('reveal shows the Japanese + English',await ev(()=>!!document.querySelector('#loText .lojp')&&!!document.querySelector('#loText .loen')));await shot('listen-reveal');
 const ms=await ev(()=>('mediaSession' in navigator)?(navigator.mediaSession.metadata&&navigator.mediaSession.metadata.title):'n/a');
 ok('Media Session metadata (where supported)',ms==='n/a'||/My Family/.test(ms||''),ms);
 // ended → silence clip → next clip
 await ev(()=>__N5.LO_EL.dispatchEvent(new Event('ended')));await W(80);
 ok('after a clip: silent gap clip on the same element',await ev(()=>/^blob:|^data:/.test(__N5.LO_EL.src)));
 await ev(()=>__N5.LO_EL.dispatchEvent(new Event('ended')));await W(80);
 ok('then the next sentence (r01-2)',await ev(()=>/r01-2\.mp3$/.test(__N5.LO_EL.src)&&/1 · 2\//.test(document.querySelector('#loSub').textContent)));
 await p.tap('#loNext');ok('⏭ next',await ev(()=>/r01-3\.mp3$/.test(__N5.LO_EL.src)));
 await p.tap('#loPrev');await W(50);ok('⏮ previous',await ev(()=>/r01-2\.mp3$/.test(__N5.LO_EL.src)));
 await p.tap('#loPlay');ok('pause',await ev(()=>!__N5.LO.playing&&document.querySelector('#loPlay').getAttribute('aria-label')==='Play'));
 await p.tap('#loPlay');ok('resume',await ev(()=>__N5.LO.playing));
 // comprehension check after the story
 await ev(()=>{const L=__N5.LO;L.o.checks=true;const q=L.tape.findIndex(t=>t.t==='q');L.pos=q-1;__N5.LO_EL.dispatchEvent(new Event('ended'));});await W(150);
 ok('comprehension check after story 1',await ev(()=>!!document.querySelector('#loQ .choice')&&!__N5.LO.playing));await shot('listen-check');
 await p.tap('#loQ .choice');await p.waitForSelector('#loCont');await p.tap('#loCont');await W(100);
 ok('continue → next item plays',await ev(()=>__N5.LO.playing&&!document.querySelector('#loQ .choice')));
 await p.tap('#loStopBtn');await p.waitForSelector('#loGo');ok('stop → back to setup, queue cleared',await ev(()=>__N5.LO===null));
 // sentences source
 await p.tap('#loSrc button[data-v="sentences"]');await p.tap('[data-lo="text"]');await p.tap('#loGo');await p.waitForSelector('#loCard');
 ok('sentences: example-sentence clips from your words, text shown',await ev(()=>__N5.LO.items[0].kind==='ex'&&!!document.querySelector('#loText .lojp')&&/Example sentence/.test(document.querySelector('#loSub').textContent)));
 ok('fits 393px (player)',await fits());await shot('listen-sentences');
 // finish
 await ev(()=>{const L=__N5.LO;L.pos=L.tape.length-1;__N5.LO_EL.dispatchEvent(new Event('ended'));});await W(150);
 ok('finish card + listening log',await ev(()=>/Listening done/.test(document.querySelector('#loCard').textContent)&&Object.values(__N5.S().loLog||{}).some(v=>v>0)));
 await p.tap('#loDone');await p.waitForSelector('#loGo');
 // leaving the screen stops audio
 await p.tap('#loGo');await p.waitForSelector('#loCard');await p.tap('.tabbar [data-tab="home"]');await W(200);
 ok('leaving the player stops the queue',await ev(()=>__N5.LO===null));
 ok('no page errors',errs.length===0,errs.join(' | '));
 await b.close();console.log('SUMMARY',BR,R.filter(x=>x).length+'/'+R.length);
})().catch(e=>{console.log('FAIL crash',e);console.log('SUMMARY',BR,'crash');process.exit(1);});
