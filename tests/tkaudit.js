// Kanji iPhone audit: every level, small screen, touch, SW on. BROWSER=webkit URL=... VP=375x667 DARK=1 RM=1 HEAVY=1
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const [W,H]=(process.env.VP||'375x667').split('x').map(Number);
const R=[];const ok=(n,c,i='')=>{R.push(c);console.log(c?'PASS':'FAIL',n,i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',colorScheme:process.env.DARK?'dark':'light',reducedMotion:process.env.RM?'reduce':'no-preference',...(BR==='chromium'?{isMobile:true}:{})});
 if(process.env.HEAVY)await ctx.addInitScript(()=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),cards={};
   for(const base of [0,10000,20000,30000,40000])for(let i=0;i<700;i++)cards[base+i]={box:1+i%5,due:now+(i%7-2)*864e5,ok:3,bad:1};
   localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,xp:5000,streak:30,levels:['n5','n4','n3']}));
   const kc={};'一二三四五六七八九十人日月火水'.split('').forEach((c,i)=>kc[c]={box:1+i%5,due:now-1000*(i%2),ok:2,bad:0,l:'n5'});
   localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify({cards:kc,unl:{n5:15}}));});
 const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))errs.push(m.text())});
 const reqs=[];p.on('request',r=>reqs.push(r.url()));const played=[];await p.exposeFunction('__played',s=>played.push(s));
 await ctx.addInitScript(()=>{const o=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){try{window.__played(this.src)}catch(e){}return o.call(this).catch(()=>{})};});
 const ev=(f,a)=>p.evaluate(f,a);const tap=async s=>{await p.tap(s);await p.waitForTimeout(250);};
 const t0=Date.now();await p.goto(URL+'?t='+Date.now());await p.waitForTimeout(1200);
 const overflow=()=>ev(()=>{const W=innerWidth,bad=[];if(document.documentElement.scrollWidth>W+1)bad.push('doc:'+document.documentElement.scrollWidth);
   document.querySelectorAll('#navbar *, #view *, .modal *').forEach(e=>{const r=e.getBoundingClientRect();if(r.width&&r.right>W+1&&!e.closest('.sr')){let p=e.parentElement,clip=false;while(p){const s=getComputedStyle(p);if(/auto|scroll|hidden|clip/.test(s.overflowX)&&p.getBoundingClientRect().right<=W+1){clip=true;break;}p=p.parentElement;}if(!clip)bad.push((e.id||e.className||e.tagName)+':'+Math.round(r.right));}});return bad.slice(0,5);});
 const hit=sel=>ev(s=>{const e=typeof s==='string'?document.querySelector(s):s;if(!e)return 'missing';e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;if(x<0||x>innerWidth||y<0||y>innerHeight)return 'offscreen '+Math.round(x)+','+Math.round(y);const t=document.elementFromPoint(x,y);return t===e||e.contains(t)?'ok':'covered by '+(t&&(t.id||t.className||t.tagName));},sel);
 const bottomClear=()=>ev(()=>{window.scrollTo(0,document.documentElement.scrollHeight);const tb=document.querySelector('.tabbar');const tbt=tb&&!document.body.classList.contains('studying')?tb.getBoundingClientRect().top:innerHeight;const els=[...document.querySelectorAll('#view > *')].filter(e=>e.getBoundingClientRect().height);const last=els[els.length-1];return last?Math.round(last.getBoundingClientRect().bottom-tbt):0;});
 ok('header fits (no overflow)',(await overflow()).length===0,JSON.stringify(await overflow()));
 const COUNTS={n5:79,n4:166,n3:367,n2:367,n1:1232};
 for(const l of ['n5','n4','n3','n2','n1']){
  await tap('#tabLevels');await tap(`.lvlist .lvcard[data-lv=${l}]`);await p.waitForSelector('#kjOpen');
  const tl=Date.now();await p.waitForFunction(n=>new RegExp('Kanji · '+n).test(document.querySelector('#kjOpen').textContent),COUNTS[l]);
  ok(`${l} level page kanji card`,true,`${Date.now()-tl}ms`);
  ok(`${l} level page no overflow`,(await overflow()).length===0,JSON.stringify(await overflow()));
  ok(`${l} level page bottom clear of tab bar`,(await bottomClear())<=0,''+await bottomClear());
  ok(`${l} kanji card tappable`,(await hit('#kjOpen'))==='ok',await hit('#kjOpen'));
  ok(`${l} stroke file not fetched before a card is opened`,!reqs.some(u=>u.includes(`kanji-${l}-s.json`)));
  await tap('#kjOpen');await p.waitForSelector('.kjtile');
  ok(`${l} grid count`,await ev(()=>document.querySelectorAll('.kjtile').length)===COUNTS[l]);
  ok(`${l} kanji page no overflow`,(await overflow()).length===0,JSON.stringify(await overflow()));
  ok(`${l} kanji page bottom clear of tab bar`,(await bottomClear())<=0,''+await bottomClear());
  for(const s of ['#kjLearnBtn','button.mode[data-km=k2m]','button.mode[data-km=wr]','#backBtn']){const h=await hit(s);ok(`${l} ${s} tappable`,h==='ok',h);}
  const lastH=await ev(()=>{const t=[...document.querySelectorAll('.kjtile')].pop();t.scrollIntoView({block:'end'});window.scrollBy(0,0);const r=t.getBoundingClientRect(),tb=document.querySelector('.tabbar').getBoundingClientRect();return {bottom:Math.round(r.bottom),tb:Math.round(tb.top)}});
  const lastTileHit=await hit('.kjtile:last-child');ok(`${l} last tile tappable`,lastTileHit==='ok',lastTileHit);
  for(const which of ['first-child','last-child']){
   await tap(`.kjtile:${which}`);await p.waitForSelector('.modal .kjsvg');await p.waitForFunction(()=>document.querySelector('.modal .kjst'),null,{timeout:15000});
   await ev(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>0))));await p.waitForTimeout(150);
   const st=await ev(()=>{const ps=[...document.querySelectorAll('.modal .kjst')];const c=document.querySelector('.modal [role=dialog]').getAttribute('aria-label');
     const vis=ps.map(x=>{const s=getComputedStyle(x);const L=x.getTotalLength();const da=parseFloat(s.strokeDasharray)||0,off=parseFloat(s.strokeDashoffset)||0;return {L:+L.toFixed(1),da:+da.toFixed(1),off:+off.toFixed(2),none:s.strokeDasharray==='none'}});
     return {c,n:ps.length,drawn:vis.every(v=>v.none||(Math.abs(v.off)<=0.01&&v.da>=v.L-0.5)),anim:ps.filter(p=>p.classList.contains('anim')).length,vis:vis.slice(0,2)};});
   ok(`${l} ${which} learn card strokes drawn`,st.n>0&&st.drawn,JSON.stringify(st));
   ok(`${l} ${which} strokes ${process.env.RM?'static (reduced motion)':'animated'}`,process.env.RM?st.anim===0:st.anim===st.n,st.anim+'/'+st.n);
   ok(`${l} ${which} modal no overflow`,(await overflow()).length===0,JSON.stringify(await overflow()));
   const stepB=await hit('#kjStep');ok(`${l} Step tappable`,stepB==='ok',stepB);
   if(stepB==='ok'){await tap('#kjStep');const n1=await ev(()=>document.querySelectorAll('.modal .kjst').length);ok(`${l} Step shows 1 stroke`,n1===1,''+n1);await tap('#kjReplay');}
   if(await p.$('.modal .kjexrow')){const h=await hit('.modal .kjexrow');if(h==='ok'){const b4=played.length;await tap('.modal .kjexrow');await p.waitForTimeout(600);ok(`${l} example audio plays`,played.length>b4,played.slice(-1)[0]||'');}else ok(`${l} example row tappable`,false,h);}
   const dh=await hit('#kjClose');ok(`${l} ${which} Done reachable`,dh==='ok',dh);
   if(dh==='ok')await tap('#kjClose');else await ev(()=>document.querySelector('.modal').remove());
   ok(`${l} modal closed`,!(await p.$('.modal')));
  }
  if(l==='n5'||l==='n1'){ // learn session
   await tap('#kjLearnBtn');await p.waitForSelector('#kjGot,.choice');
   let q=0;for(let i=0;i<40;i++){if(await p.$('#dueBack'))break;if(await p.$('#kjGot')){const h=await hit('#kjGot');if(h!=='ok'){ok(`${l} Got it tappable`,false,h);break;}ok(`${l} learn-step no overflow`,(await overflow()).length===0,JSON.stringify(await overflow()));await tap('#kjGot');continue;}
     const h=await hit('button.idk');if(h!=='ok'){ok(`${l} IDK tappable`,false,h);break;}
     await tap(i%3?'.choice[data-i="0"]':'button.idk');q++;await p.waitForSelector('#nextBtn');const nh=await hit('#nextBtn');if(nh!=='ok'){ok(`${l} Next tappable`,false,nh);break;}await tap('#nextBtn');}
   ok(`${l} learn session finishes`,!!(await p.$('#dueBack')),'q='+q);if(await p.$('#dueBack'))await tap('#dueBack');else await tap('#backBtn');
   for(const m of ['k2m','k2r','m2k','wr']){await p.waitForSelector(`button.mode[data-km=${m}]`);await tap(`button.mode[data-km=${m}]`);await p.waitForSelector('.choice');ok(`${l} mode ${m} no overflow`,(await overflow()).length===0,JSON.stringify(await overflow()));const h=await hit('.choice[data-i="3"]');ok(`${l} mode ${m} 4th choice tappable`,h==='ok',h);await tap('#backBtn');}
  }
 }
 // Due, everything, home, settings, stats
 await ev(()=>{const J=__N5.JS();for(const c in J.cards)J.cards[c].due=Date.now()-1000;localStorage.setItem('jlptVocabQuest.kanji.v1',JSON.stringify(J));});
 await tap('#dueBtn');await p.waitForSelector('.duerow');ok('due view kanji rows',await ev(()=>document.querySelectorAll('.duerow[data-key^="kanji:"]').length>=1));
 ok('due view no overflow',(await overflow()).length===0,JSON.stringify(await overflow()));ok('due bottom clear',(await bottomClear())<=0);
 await tap('#tabHome');ok('home no overflow',(await overflow()).length===0,JSON.stringify(await overflow()));
 await tap('#tabSettings');ok('settings no overflow',(await overflow()).length===0,JSON.stringify(await overflow()));
 for(const s of ['#pathKj','#resetKanji']){const h=await hit(s);ok(`settings ${s} tappable`,h==='ok',h);}
 ok('settings bottom clear',(await bottomClear())<=0,''+await bottomClear());
 await tap('#tabStats');ok('stats kanji panel',await ev(()=>document.querySelectorAll('.kjstat').length===5));ok('stats no overflow',(await overflow()).length===0,JSON.stringify(await overflow()));
 ok('no page errors',errs.length===0,JSON.stringify(errs.slice(0,3)));
 console.log('SUMMARY',BR,W+'x'+H,process.env.DARK?'dark':'',process.env.RM?'rm':'',process.env.HEAVY?'heavy':'',R.filter(x=>x).length,'/',R.length,'total',Date.now()-t0,'ms');await b.close();
})().catch(e=>{console.log('CRASH',e.message.slice(0,600));process.exit(1)});
