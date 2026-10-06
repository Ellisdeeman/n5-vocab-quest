// Speaking practice (Batch 4): normalization + matching (unit), say-the-word flow with a mocked SpeechRecognition
// (permission explainer, never auto-starts, ja-JP + 5 alternatives, Good / Hard on the reading track, misses never change
// the schedule but are counted), permission denied / service-not-allowed, Record & compare fallback with a mocked
// MediaRecorder (self-grade Again / Good), no-support state, entry points (level page, Speak due words, Pimsleur lesson),
// stats panel, sync merge. iPhone-size viewport with touch. BROWSER=webkit|chromium
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const SH='/workspace/n5-game/';const KEY='n5VocabQuest.v1';
const MOCK=o=>{
 window.__played=[];const _pl=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){window.__played.push(this.src);return Promise.resolve();};
 window.__sr={next:[],log:[],hold:false};
 class MockSR{constructor(){this.lang='';this.maxAlternatives=1;}
  start(){__sr.log.push({lang:this.lang,max:this.maxAlternatives});const n=__sr.next.shift()||{alts:[]};if(__sr.hold){this._n=n;return;}setTimeout(()=>this._fire(n),60);}
  _fire(n){if(n.error){this.onerror&&this.onerror({error:n.error});}else if(n.alts.length){const res=n.alts.map(t=>({transcript:t,confidence:.8}));res.isFinal=true;this.onresult&&this.onresult({results:[res],resultIndex:0});}this.onend&&this.onend();}
  stop(){if(this._n){const n=this._n;this._n=null;this._fire(n);}}abort(){this._n=null;}}
 const def=(obj,k,v)=>Object.defineProperty(obj,k,{value:v,configurable:true,writable:true});
 def(window,'SpeechRecognition',o.noSR?undefined:MockSR);def(window,'webkitSpeechRecognition',o.noSR?undefined:MockSR);
 window.__mr={gum:0,started:0,stopped:0,deny:false};
 if(!navigator.mediaDevices)def(navigator,'mediaDevices',{});
 const gum=async()=>{__mr.gum++;if(__mr.deny)throw new DOMException('denied','NotAllowedError');return {getTracks:()=>[{stop(){__mr.stopped++;}}]};};
 def(navigator.mediaDevices,'getUserMedia',gum);if(window.MediaDevices)def(MediaDevices.prototype,'getUserMedia',gum);
 class MockMR{constructor(s,op){this.state='inactive';this.mimeType=(op&&op.mimeType)||'audio/webm';}static isTypeSupported(t){return t==='audio/webm';}
  start(){this.state='recording';__mr.started++;}stop(){this.state='inactive';this.ondataavailable&&this.ondataavailable({data:new Blob(['x'],{type:'audio/webm'})});this.onstop&&this.onstop();}}
 def(window,'MediaRecorder',o.noRec?undefined:MockMR);
};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const errs=[];
 const open=async(o={},scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${o.seed||seed})()}(${MOCK})(${JSON.stringify(o)});`);
  const p=await ctx.newPage();p.setDefaultTimeout(20000);p.on('pageerror',e=>errs.push(''+e));
  const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForSelector('#smartStart:not([disabled])',{timeout:20000});await W(400);
  const until=async(f,ms=8000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f,a))return true;await W(80);}return false;};
  const tap=async s=>{await p.tap(s);await W(200);};
  const fits=()=>ev(()=>document.documentElement.scrollWidth<=innerWidth);
  const st=()=>ev(k=>JSON.parse(localStorage.getItem(k)),KEY);
  return {ctx,p,ev,W,until,tap,fits,st};};
 // review cards (reading track) for a few N5 words, all due
 const seed=()=>{const now=Date.now(),D=864e5,cards={};for(const i of [354,525,642,250,598,155,609,637,127])cards[i]={box:3,due:now-1000,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-6*D,due:now-1000}};
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards,levels:['n5'],autoAdvance:false,retype:false,newLimit:10,pathFocus:'n5',xp:50,speech:true}));};
 let T=await open();
 /* ---------- unit: normalization + matching ---------- */
 const U=await T.ev(()=>{const N=__N5,c=N.spkCanon,W=N.WORDS,m=(alts,id)=>N.spkMatch(alts,W[id]).ok;
  return {
   kata:c('センセー')===c('せんせい'),long:c('トーキョー')===c('とうきょう'),punct:c('。先生！')==='先生'&&c(' せん せい 。')===c('せんせい'),
   obaa:c('おばあさん')!==c('おばさん'),nfkc:c('ＡＢ１')==='ab1',dz:c('ちぢむ')===c('ちじむ')&&c('つづく')===c('つずく'),
   exactKana:m(['せんせい'],354),exactKanji:m(['先生'],354),katakanaAlt:m(['センセイ'],354),contains:m(['先生です。'],354),wrong:!m(['学生'],354),
   secondAlt:m(['がくせい','先生'],354),homophone:m(['箸'],525),digits:m(['3つ'],642),coffee:m(['こーひー'],250)&&m(['コーヒー'],250),
   coffeeShort:!m(['コーヒ'],250),suru:m(['勉強する'],598)&&m(['べんきょう'],598),aunt:m(['おばさん'],127)&&!m(['おばあさん'],127),
   empty:!m([],354)&&!m([''],354),longSentence:!m(['先生は今日学校に来ませんでした'],354)};});
 for(const [k,v] of Object.entries(U))ok('match/normalize: '+k,v);

 /* ---------- flow with speech recognition ---------- */
 ok('Speaking mode = recognition when available',await T.ev(()=>__N5.spkModeNow()==='sr'));
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354,609,155,637,525,250],'Test',__N5.home)));
 ok('word card with big mic',await T.until(()=>!!document.querySelector('#spkCard[data-mode="sr"] #spkMic')));
 ok('shows the word (kanji) and hides the reading',await T.ev(()=>document.querySelector('#spkWord').textContent==='先生'&&document.querySelector('#spkRead').hidden));
 const micBox=await T.ev(()=>{const r=document.querySelector('#spkMic').getBoundingClientRect();return [r.width,r.height];});
 ok('mic button is big (≥88px)',micBox[0]>=88&&micBox[1]>=88,JSON.stringify(micBox));
 await T.W(500);ok('mic never starts on its own',await T.ev(()=>__sr.log.length===0));
 const kh=await T.ev(()=>{const k=document.querySelector('.kbdhint');return k?getComputedStyle(k).display:'missing';});ok('keyboard hint hidden on touch',kh==='none',kh);
 ok('card fits width',await T.fits());
 await T.p.screenshot({path:SH+'shot-speak-word.png'});
 await T.tap('#spkMic');
 ok('first tap explains the microphone prompt',await T.until(()=>!!document.querySelector('#spkPerm')));
 await T.p.screenshot({path:SH+'shot-speak-permission.png'});
 await T.tap('#spkPermNo');ok('"Not now" → nothing started',await T.ev(()=>!document.querySelector('#spkPerm')&&__sr.log.length===0));
 const before=(await T.st()).cards;
 await T.ev(()=>{__sr.hold=true;__sr.next.push({alts:['せんせい','先生']});});
 await T.tap('#spkMic');await T.tap('#spkPermOk');
 ok('Continue → recognition starts (ja-JP, 5 alternatives)',await T.until(()=>__sr.log.length===1)&&await T.ev(()=>__sr.log[0].lang==='ja-JP'&&__sr.log[0].max>=5),JSON.stringify(await T.ev(()=>__sr.log)));
 ok('listening state shown',await T.ev(()=>document.querySelector('#spkMic').classList.contains('on')&&/Listening/.test(document.querySelector('#spkStatus').textContent)));
 ok('permission explainer remembered',(await T.st()).spkMicOk===true);
 await T.p.screenshot({path:SH+'shot-speak-listening.png'});
 await T.ev(()=>window.__played=[]);
 await T.tap('#spkMic');   // tap again = stop → result
 ok('match → Correct + what was heard',await T.until(()=>!!document.querySelector('#spkFb .grok'))&&await T.ev(()=>/せんせい/.test(document.querySelector('.spkheard').textContent)));
 ok('native audio plays afterwards',await T.until(()=>window.__played.some(u=>/audio\/.*\.mp3/.test(u))),JSON.stringify(await T.ev(()=>window.__played)));
 let s1=await T.st();
 ok('match → Good review on the reading track',s1.cards[354].rt===3&&s1.cards[354].f.lr>Date.now()-60000&&s1.cards[354].f.due>Date.now()+864e5&&!s1.cards[354].L,JSON.stringify(s1.cards[354]));
 ok('mic disabled after the answer',await T.ev(()=>document.querySelector('#spkMic').disabled));
 await T.p.screenshot({path:SH+'shot-speak-correct.png'});
 await T.ev(()=>{__sr.hold=false;});
 await T.tap('#spkNext');
 // word 2 (本): hint → Hard
 await T.tap('#spkHint');ok('hint reveals the reading',await T.ev(()=>!document.querySelector('#spkRead').hidden&&document.querySelector('#spkRead').textContent==='ほん'));
 await T.ev(()=>__sr.next.push({alts:['本']}));await T.tap('#spkMic');
 ok('no explainer the second time',await T.ev(()=>!document.querySelector('#spkPerm')));
 await T.until(()=>!!document.querySelector('#spkFb .grok'));
 s1=await T.st();ok('match after the hint → Hard',s1.cards[609].rt===2,JSON.stringify(s1.cards[609]));
 await T.tap('#spkNext');
 // word 3 (学生): miss → no change, counted; retry match → Hard
 const c155=JSON.stringify((await T.st()).cards[155]);
 await T.ev(()=>__sr.next.push({alts:['先生','せんせい']}));await T.tap('#spkMic');
 ok('miss → "Not quite" and what was heard',await T.until(()=>!!document.querySelector('#spkFb .grbad'))&&await T.ev(()=>/先生/.test(document.querySelector('.spkheard').textContent)));
 ok('miss → schedule unchanged',JSON.stringify((await T.st()).cards[155])===c155);
 ok('miss counted in speaking stats',await T.ev(()=>{const L=__N5.S().spkLog[__N5.todayStr()];return L.miss===1&&L.n===3;}));
 await T.p.screenshot({path:SH+'shot-speak-wrong.png'});
 await T.ev(()=>__sr.next.push({alts:['がくせい']}));await T.tap('#spkMic');await T.until(()=>!!document.querySelector('#spkFb .grok'));
 s1=await T.st();ok('match on retry → Hard',s1.cards[155].rt===2);
 await T.tap('#spkNext');
 // word 4 (水): no-speech → not counted; 3 misses → answer shown, no change
 const n0=await T.ev(()=>__N5.S().spkLog[__N5.todayStr()].n);
 await T.ev(()=>__sr.next.push({error:'no-speech'}));await T.tap('#spkMic');
 ok('no speech → "Didn\'t catch that", not counted',await T.until(()=>/Didn't catch/.test(document.querySelector('#spkStatus').textContent))&&await T.ev(n=>__N5.S().spkLog[__N5.todayStr()].n===n,n0));
 const c637=JSON.stringify((await T.st()).cards[637]);
 for(let i=0;i<3;i++){await T.ev(()=>__sr.next.push({alts:['みせ']}));await T.tap('#spkMic');await T.W(250);}
 ok('3 misses → answer shown, schedule unchanged',await T.until(()=>/みず/.test(document.querySelector('#spkFb').textContent)&&/Schedule unchanged/.test(document.querySelector('#spkFb').textContent))&&JSON.stringify((await T.st()).cards[637])===c637);
 await T.tap('#spkNext');
 // word 5 (橋) homophone 箸 accepted; word 6 skip
 await T.ev(()=>__sr.next.push({alts:['箸']}));await T.tap('#spkMic');ok('homophone written with other kanji accepted',await T.until(()=>!!document.querySelector('#spkFb .grok')));
 await T.tap('#spkNext');
 ok('kana-only word has no reading hint',await T.ev(()=>document.querySelector('#spkWord').textContent==='コーヒー'&&!document.querySelector('#spkHint')));
 await T.tap('#spkSkip');
 ok('finish screen: 4 of 6 said right',await T.until(()=>!!document.querySelector('#spkDone'))&&await T.ev(()=>/4 of 6 words said right/.test(document.querySelector('#spkDone').textContent)));
 const tags=await T.ev(()=>{const u=document.querySelector('#spkDone ul.grres');return [...u.querySelectorAll('.rtag')].map(t=>t.className).join(',');});ok('finish lists Good / Hard tags',(tags.match(/r3/g)||[]).length===2&&(tags.match(/r2/g)||[]).length===2,tags);
 await T.p.screenshot({path:SH+'shot-speak-done.png'});
 const L=await T.ev(()=>__N5.S().spkLog[__N5.todayStr()]);
 ok('stats: 4 right, 4 misses, 8 tries',L.ok===4&&L.miss===4&&L.n===8,JSON.stringify(L));
 await T.ev(()=>__N5.go(()=>__N5.statsView()));ok('Stats tab shows the Speaking panel',await T.until(()=>!!document.querySelector('#spkStats')&&/4 of 8 said right/.test(document.querySelector('#spkStats').textContent)));
 const M=await T.ev(()=>__N5.mergeStore('S',{spkLog:{'2026-10-01':{n:2,ok:1,miss:1}}},{spkLog:{'2026-10-01':{n:3,ok:2,miss:1},'2026-10-02':{n:1,ok:0,miss:1}}},{},{},{}).spkLog);
 ok('sync merges speaking stats per day',JSON.stringify(M)===JSON.stringify({'2026-10-01':{n:3,ok:2,miss:1},'2026-10-02':{n:1,ok:0,miss:1}}),JSON.stringify(M));
 /* permission denied */
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354,609],'Test',__N5.home)));await T.until(()=>!!document.querySelector('#spkMic'));
 await T.ev(()=>__sr.next.push({error:'not-allowed'}));await T.tap('#spkMic');
 ok('mic blocked → explanation + Record & compare offer',await T.until(()=>!!document.querySelector('#spkDenied'))&&await T.ev(()=>/blocked/.test(document.querySelector('#spkDenied').textContent)&&!!document.querySelector('#spkToRec')));
 await T.p.screenshot({path:SH+'shot-speak-denied.png'});
 await T.tap('#spkToRec');ok('→ Record & compare mode',await T.until(()=>!!document.querySelector('#spkCard[data-mode="rec"] #spkRec')));
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354],'Test',__N5.home)));await T.until(()=>!!document.querySelector('#spkMic'));
 await T.ev(()=>__sr.next.push({error:'service-not-allowed'}));await T.tap('#spkMic');
 ok('service-not-allowed (Siri/Dictation off, Home Screen app) → explanation',await T.until(()=>!!document.querySelector('#spkDenied'))&&await T.ev(()=>/Dictation/.test(document.querySelector('#spkDenied').textContent)));
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354],'Test',__N5.home)));await T.until(()=>!!document.querySelector('#spkMic'));
 await T.ev(()=>__sr.next.push({error:'network'}));await T.tap('#spkMic');
 ok('network error → message + Record & compare button',await T.until(()=>!!document.querySelector('#spkUseRec'))&&await T.ev(()=>/couldn't be reached/.test(document.querySelector('#spkStatus').textContent)));
 // manual switch
 await T.tap('#spkSwitch');ok('switch → Record & compare (remembered)',await T.until(()=>!!document.querySelector('#spkRec'))&&(await T.st()).spkMode==='rec');
 await T.tap('#spkSwitch');ok('switch back → recognition',await T.until(()=>!!document.querySelector('#spkMic'))&&(await T.st()).spkMode==='auto');
 /* entry points */
 await T.ev(()=>__N5.openLevel('n5'));await T.W(500);
 ok('N5 level page has a Speaking tile',await T.until(()=>!!document.querySelector('button.mode[data-m="speak"]')));
 await T.tap('button.mode[data-m="speak"]');
 ok('level Speaking → seen words of the level, due first',await T.until(()=>!!document.querySelector('#spkCard'))&&await T.ev(()=>{const S=__N5.S(),ids=__N5.SPK.ids;return ids.every(id=>S.cards[id])&&ids.length>=1;}));
 await T.ev(()=>__N5.go(__N5.dueView));
 ok('Review tab offers "Speak due words"',await T.until(()=>!!document.querySelector('#dueSpeak')));
 await T.tap('#dueSpeak');
 ok('Speak due words → only due words',await T.until(()=>!!document.querySelector('#spkCard'))&&await T.ev(()=>{const S=__N5.S(),n=Date.now();return __N5.SPK.ids.every(id=>S.cards[id].due<=n)&&/Speak due words/.test(document.querySelector('.topbar').textContent);}));
 await T.ev(()=>__N5.go(()=>__N5.pimsLessonView(1,1)));
 ok('Pimsleur lesson has a Speaking tile',await T.until(()=>!!document.querySelector('button.mode[data-m="speak"]'),5000));
 await T.ctx.close();
 /* no seen words → explained */
 T=await open({seed:()=>localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:{},levels:['n5'],newLimit:10}))});
 await T.ev(()=>__N5.openLevel('n5'));await T.W(500);await T.tap('button.mode[data-m="speak"]');
 ok('no seen words → "Learn a few words first"',await T.until(()=>!!document.querySelector('#spkEmpty')));
 await T.ctx.close();
 /* ---------- fallback: no speech recognition → Record & compare ---------- */
 T=await open({noSR:true});
 ok('no recognition → Record & compare mode',await T.ev(()=>__N5.spkModeNow()==='rec'));
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354,609],'Test',__N5.home)));
 ok('record card, no switch offered',await T.until(()=>!!document.querySelector('#spkCard[data-mode="rec"] #spkRec'))&&await T.ev(()=>!document.querySelector('#spkSwitch')));
 await T.W(400);ok('recorder never starts on its own',await T.ev(()=>__mr.gum===0));
 await T.tap('#spkRec');ok('first tap explains the prompt',await T.until(()=>!!document.querySelector('#spkPerm')));
 await T.tap('#spkPermOk');
 ok('recording (mic requested after the tap)',await T.until(()=>__mr.gum===1&&__mr.started===1)&&await T.ev(()=>document.querySelector('#spkRec').classList.contains('on')));
 await T.ev(()=>window.__played=[]);
 await T.tap('#spkRec');
 ok('stop → compare panel + self-grade buttons',await T.until(()=>!document.querySelector('#spkCmp').hidden&&!document.querySelector('#spkSelf').hidden));
 ok('mic released after recording',await T.ev(()=>__mr.stopped>=1));
 ok('reference audio plays after your take',await T.until(()=>window.__played.some(u=>/\.mp3/.test(u))));
 await T.tap('#spkYou');ok('▶ You plays your recording',await T.until(()=>window.__played.some(u=>u.startsWith('blob:'))));
 await T.p.screenshot({path:SH+'shot-speak-record.png'});
 await T.tap('#spkGood');let s5=await T.st();
 ok('self-graded Good → Good review',s5.cards[354].rt===3&&s5.cards[354].f.lr>Date.now()-60000);
 await T.tap('#spkNext');
 const c609=JSON.stringify((await T.st()).cards[609]);
 await T.tap('#spkRec');await T.until(()=>__mr.started===2);await T.tap('#spkRec');await T.until(()=>!document.querySelector('#spkSelf').hidden);
 await T.tap('#spkAgain');
 ok('self-graded Again → schedule unchanged, counted',JSON.stringify((await T.st()).cards[609])===c609&&await T.ev(()=>__N5.S().spkLog[__N5.todayStr()].miss===1));
 await T.tap('#spkNext');ok('finish',await T.until(()=>!!document.querySelector('#spkDone')));
 // recorder mic denied
 await T.ev(()=>{__mr.deny=true;__N5.go(()=>__N5.spkSession([354],'Test',__N5.home));});await T.until(()=>!!document.querySelector('#spkRec'));
 await T.tap('#spkRec');ok('mic denied for recording → explanation + native audio',await T.until(()=>!!document.querySelector('#spkDenied #spkNat2'))&&await T.ev(()=>/blocked/.test(document.querySelector('#spkDenied').textContent)));
 await T.ctx.close();
 /* ---------- no support at all ---------- */
 T=await open({noSR:true,noRec:true});
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354,609],'Test',__N5.home)));
 ok('no recognition and no recording → explained, listen & continue',await T.until(()=>!!document.querySelector('#spkNone'))&&await T.ev(()=>!!document.querySelector('#spkNat')&&!!document.querySelector('#spkNext')));
 await T.tap('#spkNext');await T.tap('#spkNext');ok('…and can finish',await T.until(()=>!!document.querySelector('#spkDone')));
 await T.ctx.close();
 /* ---------- dark screenshots ---------- */
 T=await open({},'dark');
 await T.ev(()=>__N5.go(()=>__N5.spkSession([354,609],'Speaking · N5',__N5.home)));await T.until(()=>!!document.querySelector('#spkMic'));await T.W(600);
 await T.p.screenshot({path:SH+'shot-speak-word-dark.png'});
 await T.ev(()=>__sr.next.push({alts:['せんせい']}));await T.tap('#spkMic');await T.tap('#spkPermOk');await T.until(()=>!!document.querySelector('#spkFb .grok'));
 await T.p.screenshot({path:SH+'shot-speak-correct-dark.png'});
 await T.tap('#spkNext');await T.ev(()=>__sr.next.push({alts:['ぼん']}));await T.tap('#spkMic');await T.until(()=>!!document.querySelector('#spkFb .grbad'));
 await T.p.screenshot({path:SH+'shot-speak-wrong-dark.png'});
 await T.ctx.close();
 ok('no page errors',errs.length===0,errs.join(' | '));
 console.log(`SUMMARY ${BR} tspeak ${R.filter(x=>x).length}/${R.length} passed`);await b.close();process.exit(R.every(x=>x)?0:1);
})().catch(e=>{console.log('CRASH',e);process.exit(1);});
