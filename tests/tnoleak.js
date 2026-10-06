// Reading questions must not leak the answer through audio: no speaker / auto-play before answering when the answer is the
// reading (reading MC, kana k2r / type-the-romaji, kanji word reading, JP→EN flashcards of kanji words, hiragana↔katakana match,
// Kanji Builder); audio plays after answering (right, wrong or I don't know). Listening (audio is the prompt) and meaning
// questions that already show the reading keep their audio. BROWSER=webkit|chromium
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8766/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:393,height:852},hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...(BR==='chromium'?{isMobile:true}:{})});
 await ctx.addInitScript(()=>{window.__aud=[];HTMLMediaElement.prototype.play=function(){window.__aud.push(this.src);return Promise.resolve();};
  try{speechSynthesis.speak=u=>window.__aud.push('tts:'+u.text);}catch(e){}
  if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);
  localStorage.setItem('n5VocabQuest.v1',JSON.stringify({cards:{},levels:['n5'],autoAdvance:false,retype:false,retypeMC:false,newLimit:30,pathFocus:'n5',xp:0,speech:true,autoSpeak:true,flashDir:'jp'}));});
 const p=await ctx.newPage();p.setDefaultTimeout(15000);const errs=[];p.on('pageerror',e=>errs.push(''+e));
 await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(800);
 await p.evaluate(()=>Promise.all([__N5.loadLevel('n5'),__N5.loadKanji('n5')]));
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const heard=()=>ev(()=>window.__aud.slice());const clear=()=>ev(()=>{window.__aud=[];});
 const host=()=>ev(()=>{__N5.go(()=>{document.querySelector('#view').innerHTML='<div id="qhost"></div>';});});
 const kw=await ev(()=>{const w=__N5.WORDS.find(x=>x.lvl==='n5'&&x.hasKanji&&x.jp!==x.kana&&!/[;（(]/.test(x.jp));return w.id;});
 const kn=await ev(()=>__N5.WORDS.find(x=>x.lvl==='n5'&&!x.hasKanji).id);
 // --- reading MC
 for(const how of ['wrong','right','idk']){
  await host();await clear();await ev(id=>{window.__q=__N5.renderMC('reading',__N5.WORDS[id],()=>{});},kw);await W(500);
  const pre=await ev(()=>({spk:!!document.querySelector('#qhost #spk,#qhost .iconbtn'),n:window.__aud.length}));
  ok(`reading MC (${how}): no speaker, no auto-play before answering`,!pre.spk&&pre.n===0,JSON.stringify(pre));
  if(how==='idk')await p.tap('#qhost .idk');else await ev(r=>{const bs=[...document.querySelectorAll('#qhost .choice')];const b=bs.find(x=>x.textContent.includes(__N5.WORDS[window.__kwid]?.kana||'\u0000'));},how);
  if(how!=='idk')await ev(([id,r])=>{const w=__N5.WORDS[id],bs=[...document.querySelectorAll('#qhost .choice')];const right=bs.findIndex(b=>b.textContent.replace(/^\d/,'').startsWith(w.kana));window.__q.choose(r==='right'?right:(right+1)%bs.length);},[kw,how]);
  await W(300);const post=await heard();ok(`reading MC (${how}): word audio plays after answering`,post.length>=1,JSON.stringify(post));
 }
 // --- meaning MC (reading shown) keeps audio; listening plays the prompt
 await host();await clear();await ev(id=>__N5.renderMC('meaning',__N5.WORDS[id],()=>{}),kw);await W(500);
 ok('meaning MC (kana shown): speaker + auto-play kept',await ev(()=>!!document.querySelector('#qhost #spk')&&window.__aud.length>=1&&!!document.querySelector('#qhost .sub.jp')));
 await host();await clear();await ev(id=>__N5.renderMC('listen',__N5.WORDS[id],()=>{}),kw);await W(600);
 ok('listening MC: audio is the prompt (plays before answering)',(await heard()).length>=1);
 // --- type the Japanese (EN → JP)
 await host();await clear();await ev(id=>__N5.renderTyping(__N5.WORDS[id],()=>{}),kw);await W(500);
 ok('typing EN→JP: no audio before answering',(await heard()).length===0&&!(await ev(()=>!!document.querySelector('#qhost .bigspk,#qhost .iconbtn'))));
 await p.tap('#giveBtn');await W(300);ok('typing: audio after giving up',(await heard()).length>=1);
 // --- kana: how do you read this / type the romaji
 await host();await clear();await ev(()=>{window.__q=__N5.kRenderMC('k2r',__N5.KITEMS['か'],null,()=>{});});await W(500);
 ok('kana k2r: no audio / speaker before answering',(await heard()).length===0&&!(await ev(()=>!!document.querySelector('#qhost .bigspk,[data-ksay]'))));
 await ev(()=>window.__q.choose(0));await W(300);ok('kana k2r: sound plays after answering',(await heard()).some(s=>/\/k\//.test(s)||/^tts:/.test(s)));
 await host();await clear();await ev(()=>__N5.kRenderType(__N5.KITEMS['き'],()=>{}));await W(400);
 ok('kana type-the-romaji: no audio before answering',(await heard()).length===0);
 await p.fill('#typein','ki');await p.tap('#checkBtn');await W(300);ok('kana type: sound after answering',(await heard()).length>=1);
 // --- kanji track: word reading
 const kj=await ev(()=>Object.values(__N5.KJ).find(k=>k.lvl==='n5'&&k.ex&&k.ex.length).c);
 await host();await clear();await ev(c=>{window.__q=__N5.kjRender('wr',__N5.KJ[c],()=>{});},kj);await W(500);
 ok('kanji word-reading: no audio before answering',(await heard()).length===0&&!(await ev(()=>!!document.querySelector('#qhost .iconbtn,#qhost [data-say]'))));
 await ev(()=>window.__q.choose(0));await W(300);ok('kanji word-reading: audio after answering',(await heard()).length>=1);
 await host();await clear();await ev(c=>{window.__q=__N5.kjRender('k2r',__N5.KJ[c],()=>{});},kj);await W(400);
 ok('kanji k2r: no audio before answering',(await heard()).length===0);
 // --- flashcards JP→EN
 await clear();await ev(id=>__N5.go(()=>__N5.flashcards([id],'t',__N5.home)),kw);await p.waitForSelector('#flCard');await W(500);
 ok('flashcard JP→EN, kanji word: no front speaker, no auto-play (reading is on the back)',!(await ev(()=>!!document.querySelector('#flSpk')))&&(await heard()).length===0);
 await p.tap('#flShow');await W(300);
 ok('…flip plays the word and shows a back speaker',(await heard()).length>=1&&await ev(()=>!!document.querySelector('#flBackSpk')));
 await clear();await ev(id=>__N5.go(()=>__N5.flashcards([id],'t',__N5.home)),kn);await p.waitForSelector('#flCard');await W(500);
 ok('flashcard of a kana-only word (reading visible): front speaker kept',await ev(()=>!!document.querySelector('#flSpk')));
 // kanji flashcard: no front audio
 await clear();await ev(c=>__N5.go(()=>__N5.flashcards(['j:'+c],'t',__N5.home)),kj);await p.waitForSelector('#flCard');await W(400);
 ok('kanji flashcard: no front audio',(await heard()).length===0&&!(await ev(()=>!!document.querySelector('#flSpk'))));
 // --- hiragana ↔ katakana match: tiles silent until a pair is matched
 await clear();await ev(()=>__N5.go(__N5.kanaMatch));await W(400);
 const hasTiles=await ev(()=>document.querySelectorAll('#mgrid .tile').length>=4);
 if(hasTiles){
  await ev(()=>document.querySelector('#mgrid .tile[data-side="h"]').click());await W(200);
  ok('kana match: tapping a tile is silent',(await heard()).length===0);
  await ev(()=>{const a=document.querySelector('#mgrid .tile.sel');document.querySelector(`#mgrid .tile[data-side="k"][data-id="${a.dataset.id}"]`).click();});await W(200);
  ok('kana match: the sound plays once the pair is matched',(await heard()).length===1);
 } else ok('kana match board available',false,'no tiles');
 // --- Kanji Builder: no audio on the prompt
 await clear();await ev(()=>__N5.go(()=>__N5.builderGame('n5',__N5.home)));await W(700);
 ok('Kanji Builder: no audio before answering',(await heard()).length===0);
 ok('no page errors',errs.length===0,errs.join(' | '));
 await b.close();console.log('SUMMARY',BR,R.filter(x=>x).length+'/'+R.length);
})().catch(e=>{console.log('FAIL crash',e);console.log('SUMMARY',BR,'crash');process.exit(1);});
