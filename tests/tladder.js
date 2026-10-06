// Produce-ladder + corrective feedback + Confusables (Batch 5). iPhone-size, touch. BROWSER=webkit|chromium SHOTS=1
// ladder thresholds (unit), Settings Auto/Manual, due review picks each word's rung (MC / type / listen&type / cloze / speak),
// listen&type graded on the main track, speaking miss never reschedules, manual mode = random mix, word-detail ladder,
// miss explanations (other word typed/picked, long vowel, っ, ょ, dakuten, look-alike kanji, particles), confusion log + merge,
// Confusables drill on the Leeches page (ungraded, tames pairs)
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';const SHOTS=process.env.SHOTS;
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
const SH='/workspace/n5-game/';
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
 const open=async(scheme='light')=>{
  const ctx=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2,hasTouch:true,colorScheme:scheme,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
  const seed=()=>{localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:{},levels:['n5'],autoAdvance:false,retype:false,newLimit:30,pathFocus:'n5',xp:50,speech:true}));};
  await ctx.addInitScript(`if(!localStorage.getItem('seeded')){localStorage.setItem('seeded',1);(${seed})()}(${MOCK})({});`);
  const p=await ctx.newPage();p.setDefaultTimeout(15000);p.on('pageerror',e=>errs.push(''+e));p.on('dialog',d=>d.accept());
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(700);
  return {ctx,p};};
 let {ctx,p}=await open();
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=8000,a)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f,a))return true;await W(80);}return false;};
 const shot=async n=>{if(SHOTS)await p.screenshot({path:SH+'shot-'+n+'.png'});};
 const fits=()=>ev(()=>document.documentElement.scrollWidth<=innerWidth);
 // ---------- A. unit: thresholds
 const raw=await ev(()=>{const S=__N5.S(),D=864e5,now=Date.now(),mk=(s,ok,st=2)=>({box:3,due:now+D,ok,bad:0,f:{st,sp:null,s,d:5,lr:now-D,due:now+D}});
  const cases=[[null,1],[mk(1,5),1],[mk(2,2),2],[mk(2,1),1],[mk(6.9,9),2],[mk(7,3),3],[mk(15,4),4],[mk(14,9),3],[mk(30,5),5],[mk(30,4),4],[mk(30,5,3),4],[mk(100,2),2]];
  const out=cases.map(([c,e])=>{if(c)S.cards[0]=c;else delete S.cards[0];return [__N5.ladderRaw(0),e];});delete S.cards[0];return out;});
 ok('ladder thresholds (stability ≥ 2/7/15/30 d, correct ≥ 2/3/4/5, relearning −1)',raw.every(([a,e])=>a===e),JSON.stringify(raw));
 ok('documented thresholds exported',await ev(()=>JSON.stringify(__N5.LADDER_S)==='[0,2,7,15,30]'&&JSON.stringify(__N5.LADDER_OK)==='[0,2,3,4,5]'));
 const st=await ev(()=>{const S=__N5.S(),D=864e5,now=Date.now();S.cards[0]={box:3,due:now+D,ok:6,bad:0,f:{st:2,s:16,d:5,lr:now-D,due:now+D}};S.ladderSpeak=false;const a=__N5.ladderStep(0);S.ladderSpeak=true;const b=__N5.ladderStep(0);S.ladderSpeak=false;
  S.cards[165]={box:3,due:now+D,ok:9,bad:0,f:{st:2,s:60,d:5,lr:now-D,due:now+D}};const c=__N5.ladderStep(165),cl=!!__N5.clozeEx(165);delete S.cards[0];delete S.cards[165];return {a,b,c,cl};});
 ok('speaking rung skipped unless enabled (→ listen & type)',st.a===3&&st.b===4,JSON.stringify(st));
 ok('no example sentence → "use it" rung skipped',!st.cl&&st.c===4-1||(!st.cl&&st.c<5),JSON.stringify(st));
 // ---------- B. unit: corrective feedback patterns
 const pat=await ev(()=>{const P=__N5.cfPattern;return {lvm:P('おばさん','おばあさん'),lvx:P('おばあさん','おばさん'),cof:P('こひ','コーヒー'),tsu0:P('きて','きって'),tsu1:P('きつて','きって'),yo:P('きよう','きょう'),dak:P('かっこう','がっこう'),none:P('ねこ','いぬ'),
  kj:__N5.cfKanjiNote('未来','末来'),kj0:__N5.cfKanjiNote('学校','学生'),find:__N5.cfFind('kiru'?'きる':'',__N5.WORDS[229]).map(i=>__N5.WORDS[i].jp),
  pr:__N5.cfParticleHTML('が','は',{})};});
 ok('long vowel missing (おばさん / おばあさん)',/Long vowel missing/.test(pat.lvm),pat.lvm);
 ok('extra long vowel',/Extra long vowel/.test(pat.lvx),pat.lvx);
 ok('long vowel with ー (コーヒー)',/Long vowel missing/.test(pat.cof),pat.cof);
 ok('small っ missing',/Small っ missing/.test(pat.tsu0),pat.tsu0);
 ok('っ vs つ',/big つ/.test(pat.tsu1),pat.tsu1);
 ok('ょ vs よ',/Small ょ vs big よ/.test(pat.yo),pat.yo);
 ok('dakuten',/Dakuten/.test(pat.dak),pat.dak);
 ok('unrelated → no pattern',pat.none==='');
 ok('look-alike kanji 未/末',/Look-alike kanji/.test(pat.kj),pat.kj);
 ok('non-look-alike kanji → nothing',pat.kj0==='');
 ok('typed きる found as another word (切る / 着る)',pat.find.some(j=>/切る|着る/.test(j)),JSON.stringify(pat.find));
 ok('particle は/が one-line rule',/You chose.*が.*answer is.*は/.test(pat.pr)&&/topic/.test(pat.pr),pat.pr);
 ok('particle mix-up logged',await ev(()=>!!(__N5.S().confuse||{})['p:は>が']));
 // ---------- C. Settings
 await ev(()=>__N5.go(__N5.settingsView));await p.waitForSelector('#modeSeg');
 ok('Settings: Question mode seg, Auto (ladder) on by default',await ev(()=>{const b=document.querySelector('#modeSeg button.on');return b&&/Auto/.test(b.textContent)&&__N5.S().modeAuto===undefined}));
 ok('Settings: speaking-rung switch shown (recognition available), off',await ev(()=>{const s=document.querySelector('#ladSpk');return s&&!s.classList.contains('on')}));
 await ev(()=>document.querySelector('#modeSeg').scrollIntoView({block:'center'}));await W(150);await shot('ladder-settings');
 await p.tap('#modeSeg button[data-v=manual]');await W(150);ok('Manual saves',await ev(()=>__N5.S().modeAuto==='manual'&&JSON.parse(localStorage.getItem('n5VocabQuest.v1')).modeAuto==='manual'));
 await p.tap('#modeSeg button[data-v=auto]');await W(150);ok('back to Auto',await ev(()=>__N5.S().modeAuto==='auto'));
 // ---------- D. due review picks each word's rung
 const ids=await ev(()=>{const S=__N5.S(),D=864e5,now=Date.now(),mk=(s,ok)=>({box:3,due:now-1000,ok,bad:0,f:{st:2,sp:null,s,d:5,lr:now-s*D,due:now-1000}});
  const R1=1,R2=2,R3=3,R5=4;S.cards={};S.cards[R1]=mk(0.6,1);S.cards[R2]=mk(3,3);S.cards[R3]=mk(9,4);S.cards[R5]=mk(40,6);__N5.gsave();return {R1,R2,R3,R5};});
 const exp={[ids.R1]:'mc',[ids.R2]:'typing',[ids.R3]:'ltype',[ids.R5]:'cloze'};const seen={};
 await ev(()=>__N5.go(()=>__N5.startDueReview('all')));await W(700);
 for(let k=0;k<6&&Object.keys(seen).length<4;k++){
  await until(()=>!!__N5.CUR&&!!document.querySelector('#qhost .card'));const cur=await ev(()=>({id:__N5.CUR.w.id,mode:__N5.CUR.mode}));
  if(seen[cur.id]){await p.tap('#nextBtn').catch(()=>{});await W(300);continue;}
  const e=exp[cur.id];const m=cur.mode;seen[cur.id]=m;
  const chip=await ev(()=>{const c=document.querySelector('#qhost .qtype .ladmini');return c&&c.textContent});
  if(e==='mc'){ok('rung 1 → multiple choice (meaning/reverse/reading)',['meaning','reverse','reading'].includes(m)&&await ev(()=>document.querySelectorAll('#qhost .choice').length===4),m);
   ok('rung chip 1/5',/1\/5/.test(chip||''),chip);await shot('ladder-mc');
   // pick a wrong option → corrective note
   const wi=await ev(()=>{const W=__N5.WORDS,id=__N5.CUR.w.id;const bs=[...document.querySelectorAll('#qhost .choice')];const w=W[id],m=__N5.CUR.mode,key=m==='meaning'?w.en:m==='reading'?w.kana:w.jp.split(/;\s*/)[0];return bs.findIndex(b=>b.textContent.replace(/^\d/,'').trim()!==key.trim()&&!b.textContent.includes(key));});
   await p.tap(`#qhost .choice[data-i="${wi}"]`);await W(250);
   const note=await ev(()=>{const n=document.querySelector('#fb .cfnote');return n&&n.textContent});
   ok('MC miss → "You picked … — the answer was …"',/You picked.*the answer was/.test(note||''),note);
   ok('confusion pair logged',await ev(id=>Object.keys(__N5.S().confuse||{}).some(k=>k.startsWith(id+'>')),cur.id));
   ok('fits 393px (MC miss)',await fits());await shot('confuse-mc');
  } else if(e==='typing'){ok('rung 2 → recall typing',m==='typing'&&await ev(()=>!!document.querySelector('#typein')),m);ok('rung chip 2/5',/2\/5/.test(chip||''),chip);
   await shot('ladder-typing');
   const kana=await ev(id=>__N5.WORDS[id].kana,cur.id);await p.fill('#typein',kana);await p.keyboard.press('Enter');await W(300);
   ok('typing correct → graded on main track',await ev(id=>{const c=__N5.S().cards[id];return c.f.lr>Date.now()-60000&&!c.L},cur.id));
  } else if(e==='ltype'){ok('rung 3 → listen & type',m==='ltype'&&await ev(()=>!!document.querySelector('#typein')),m);ok('rung chip 3/5',/3\/5/.test(chip||''),chip);
   ok('listen & type plays the word audio',await until(()=>window.__played.length>0,3000));await shot('ladder-listen');
   const kana=await ev(id=>__N5.WORDS[id].kana,cur.id);await p.fill('#typein',kana);await p.keyboard.press('Enter');await W(300);
   ok('listen & type graded on MAIN track (no listening track created)',await ev(id=>{const c=__N5.S().cards[id];return c.f.lr>Date.now()-60000&&!c.L},cur.id));
  } else if(e==='cloze'){ok('rung 5 → use it (cloze)',m==='cloze'&&await ev(()=>!!document.querySelector('#qhost .clzcard #clzBlank')),m);ok('rung chip 5/5',/5\/5/.test(chip||''),chip);
   ok('cloze shows translation + 4 choices',await ev(()=>!!document.querySelector('.clzen').textContent.trim()&&document.querySelectorAll('#qhost .choice').length===4));
   ok('fits 393px (cloze)',await fits());await shot('ladder-cloze');
   const ri=await ev(()=>[...document.querySelectorAll('#qhost .choice')].findIndex(b=>b.textContent.replace(/^\d/,'').startsWith(__N5.CUR.w.jp)));
   await p.tap(`#qhost .choice[data-i="${ri}"]`);await W(300);
   ok('cloze correct → blank filled, graded',await ev(id=>document.querySelector('#clzBlank').classList.contains('filled')&&__N5.S().cards[id].f.lr>Date.now()-60000,cur.id));
   await shot('ladder-cloze-answer');
  } else ok('unexpected word in due review',false,JSON.stringify(cur));
  await p.tap('#nextBtn').catch(()=>{});await W(300);
 }
 ok('all four rungs seen in due review',Object.keys(seen).length===4,JSON.stringify(seen));
 // ---------- E. speaking rung (optional): mic only after a tap, correct → Good, miss → no reschedule
 await ev(()=>{const S=__N5.S(),D=864e5,now=Date.now();S.cards={};S.cards[6]={box:4,due:now-1000,ok:6,bad:0,f:{st:2,sp:null,s:16,d:5,lr:now-16*D,due:now-1000}};S.cards[9]={box:4,due:now-1000,ok:6,bad:0,f:{st:2,sp:null,s:16,d:5,lr:now-16*D,due:now-1000}};S.ladderSpeak=true;S.spkMicOk=false;__N5.gsave();});
 await ev(()=>__N5.go(()=>__N5.startDueReview('all')));await until(()=>!!document.querySelector('#qhost .lspk'));
 ok('rung 4 → speak card',await ev(()=>__N5.CUR.mode==='speak'));await W(400);
 ok('mic not started on its own',await ev(()=>__sr.log.length===0));await shot('ladder-speak');
 let sid=await ev(()=>__N5.CUR.w.id);const before=await ev(id=>JSON.stringify(__N5.S().cards[id]),sid);
 await ev(w=>__sr.next.push({alts:['ぜんぜんちがう']}),0);
 await p.tap('#lsMic');await p.waitForSelector('#spkPerm');ok('permission explainer first',true);await p.tap('#spkPermOk');
 await until(()=>/Not quite/.test(document.querySelector('#lsStatus').textContent));
 ok('wrong word → "Not quite", heard shown',await ev(()=>/ぜんぜんちがう/.test(document.querySelector('#fb').textContent)));
 await p.tap('#lsGive');await W(300);
 ok('speaking miss: schedule unchanged',await ev(([id,b])=>JSON.stringify(__N5.S().cards[id])===b,[sid,before]));
 await p.tap('#nextBtn');await until(()=>!!document.querySelector('#qhost .lspk')&&__N5.CUR.w.id!==0);
 sid=await ev(()=>__N5.CUR.w.id);await ev(id=>__sr.next.push({alts:[__N5.WORDS[id].jp.split(/;\s*/)[0]]}),sid);
 await p.tap('#lsMic');await until(()=>!!document.querySelector('#fb .spkheard')&&/✔/.test(document.querySelector('#fb').textContent));
 ok('spoken correctly → graded Good on main track',await ev(id=>{const c=__N5.S().cards[id];return c.f.lr>Date.now()-60000&&c.rt===3&&!c.L},sid));await shot('ladder-speak-correct');
 await ev(()=>{__N5.S().ladderSpeak=false;});
 // ---------- F. manual mode = random mix (no ladder chip)
 await ev(()=>{const S=__N5.S(),D=864e5,now=Date.now();S.modeAuto='manual';S.cards={};for(let i=20;i<26;i++)S.cards[i]={box:3,due:now-1000,ok:6,bad:0,f:{st:2,sp:null,s:40,d:5,lr:now-40*D,due:now-1000}};});
 await ev(()=>__N5.go(()=>__N5.startDueReview('all')));await until(()=>!!__N5.CUR&&__N5.CUR.w.id>=20);
 ok('manual: no ladder chip, classic modes',await ev(()=>!document.querySelector('.ladmini')&&['meaning','reverse','reading','typing','listen'].includes(__N5.CUR.mode)),await ev(()=>__N5.CUR.mode));
 await ev(()=>{__N5.S().modeAuto='auto';});
 // ---------- G. typing miss → other word + pattern
 await ev(()=>__N5.go(()=>__N5.quiz('typing',[229],'Typing')));await p.waitForSelector('#typein');
 await p.fill('#typein','kiru');await p.keyboard.press('Enter');await W(300);
 let note=await ev(()=>{const n=document.querySelector('#fb .cfnote');return n&&n.textContent});
 ok('typed another word → "You wrote きる … — the answer was くる 来る (come)"',/You wrote きる/.test(note||'')&&/the answer was くる 来る/.test(note||''),note);
 ok('typed confusion logged (来る > 切る/着る)',await ev(()=>Object.keys(__N5.S().confuse).some(k=>k.startsWith('229>'))));
 await shot('confuse-typed');
 await ev(()=>__N5.go(()=>__N5.quiz('typing',[128],'Typing')));await p.waitForSelector('#typein');
 await p.fill('#typein','obasan');await p.keyboard.press('Enter');await W(300);
 note=await ev(()=>{const n=document.querySelector('#fb .cfnote');return n&&n.textContent});
 ok('おばさん for おばあさん → other word + "Long vowel missing"',/You wrote おばさん/.test(note||'')&&/Long vowel missing/.test(note||''),note);
 ok('fits 393px (typing note)',await fits());await shot('confuse-longvowel');
 // ---------- H. word detail ladder indicator
 await ev(()=>{const S=__N5.S(),D=864e5,now=Date.now();S.cards[3]={box:3,due:now+D,ok:4,bad:0,f:{st:2,sp:null,s:9,d:5,lr:now-D,due:now+5*D}};__N5.go(__N5.home);});await W(300);
 await ev(()=>__N5.wordModal(__N5.WORDS[3]));await p.waitForSelector('.modal .ladder');
 ok('word detail: ladder with 5 rungs, current = 3 · Listen & type',await ev(()=>document.querySelectorAll('.modal .ladr').length===5&&document.querySelectorAll('.modal .ladr.cur').length===1&&/3\/5 · Listen & type/.test(document.querySelector('.modal .ladtxt').textContent)));
 ok('word detail: next-rung threshold explained',await ev(()=>/Next rung at 15 d stability/.test(document.querySelector('.modal .ladtxt').textContent)));
 await ev(()=>document.querySelector('.modal .ladder').scrollIntoView({block:'center'}));await W(150);await shot('ladder-detail');
 await ev(()=>document.querySelector('.modal').remove());
 // ---------- I. Confusables on the Leeches page + drill
 await ev(()=>{const S=__N5.S();S.confuse={'229>208':{n:3,c:0,t:Date.now()},'128>127':{n:2,c:0,t:Date.now()-1000},'p:は>が':{n:2,c:0,t:Date.now()}};__N5.go(__N5.leechView);});
 await p.waitForSelector('#confDrill');
 ok('Leeches page: Confusables pairs listed (top first)',await ev(()=>{const r=[...document.querySelectorAll('.confpanel .confrow')];return r.length>=3&&/来る/.test(r[0].textContent)&&/×3/.test(r[0].textContent)}));
 ok('Leeches page: particle mix-ups with rule',await ev(()=>/Particle mix-ups/.test(document.body.textContent)&&/topic/.test(document.querySelector('.confpanel:last-of-type').textContent)));
 ok('fits 393px (leeches)',await fits());await W(500);await ev(()=>scrollTo(0,0));await W(200);await shot('confuse-leeches');
 await p.tap('#confDrill');await p.waitForSelector('#qhost .cfch');
 const nQ=await ev(()=>+document.querySelector('#cfProg').textContent.split('/')[1]);ok('drill: 2 questions per pair',nQ===4,nQ);
 const before2=await ev(()=>JSON.stringify(__N5.S().cards));
 for(let k=0;k<nQ;k++){await p.waitForSelector('#qhost .cfch');if(k===0)await shot('confuse-drill');
  const i=await ev(()=>[...document.querySelectorAll('#qhost .cfch .choice')].findIndex(b=>b.textContent.replace(/^\d/,'').startsWith(__N5.WORDS[window.__cfX].jp.split(/;\s*/)[0])));
  await p.tap(`#qhost .cfch .choice[data-i="${i}"]`);await W(200);if(k===0){ok('drill feedback shows both words',await ev(()=>/vs/.test(document.querySelector('#fb').textContent)));await shot('confuse-drill-answer');}
  await p.tap('#cfNext');await W(200);}
 ok('drill done card: 4 / 4, pairs tamed',await ev(()=>/4 \/ 4 right/.test(document.body.textContent)&&/2 pairs tamed/.test(document.body.textContent)));
 ok('drill is ungraded (cards unchanged)',await ev(b=>JSON.stringify(__N5.S().cards)===b,before2));
 ok('tamed pairs drop out of the top list',await ev(()=>{const P=__N5.confPairs();return P.length===2&&P[0].n===2&&P[1].n===1}),await ev(()=>JSON.stringify(__N5.confPairs())));
 // ---------- J. merge of the confusion log
 const mg=await ev(()=>{const a={cards:{},confuse:{'1>2':{n:3,c:1,t:5}}},b={cards:{},confuse:{'1>2':{n:2,c:2,t:9},'3>4':{n:1,c:0,t:1}}};const m=__N5.mergeStore('S',a,b,{},{},{});return JSON.stringify(m.confuse);});
 ok('sync merge: confusion log max-per-field + union',mg==='{"1>2":{"n":3,"c":2,"t":9},"3>4":{"n":1,"c":0,"t":1}}'||(JSON.parse(mg)['1>2'].n===3&&JSON.parse(mg)['1>2'].c===2&&JSON.parse(mg)['3>4']),mg);
 ok('no page errors',errs.length===0,errs.join(' | '));
 await b.close();
 console.log('SUMMARY',BR,R.filter(x=>x).length+'/'+R.length);
})().catch(e=>{console.log('FAIL crash',e);console.log('SUMMARY',BR,'crash');process.exit(1);});
