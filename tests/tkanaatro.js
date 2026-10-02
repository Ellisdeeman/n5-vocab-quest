// Kanaatro: hub tiles, word validation (dakuten / small kana / katakana / order), scoring math, jokers, bosses,
// tarot/planet, shop money, MC check → score + FSRS (Good / Hard if slow / Again in review / unchanged when learning),
// daily new-word cap, discard, hint, full seeded run → summary (high score, XP, reviews), reduced motion, light mode, no errors.
const pw=require('playwright-core');
const URL=process.env.URL||'http://localhost:8770/';const BR=process.env.BROWSER||'webkit';
const R=[];const ok=(n,c,i='')=>{R.push(!!c);console.log(c?'PASS':'FAIL',BR,n,c?'':i);};
(async()=>{
 const b=BR==='webkit'?await pw.webkit.launch():await pw.chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const mk=async(state,extra={})=>{const ctx=await b.newContext({viewport:{width:375,height:667},deviceScaleFactor:2,hasTouch:true,timezoneId:'America/New_York',serviceWorkers:'block',...extra,...(BR==='chromium'?{isMobile:true}:{})});
  await ctx.addInitScript(st=>{if(localStorage.getItem('seeded'))return;localStorage.setItem('seeded',1);const now=Date.now(),D=864e5,cards={};
   for(let i=0;i<300;i++)cards[i]={box:2,due:i%4?now+3*D:now-36e5,ok:3,bad:1,lapses:0,f:{st:2,sp:null,s:4,d:5,lr:now-6*D,due:i%4?now+3*D:now-36e5}};
   localStorage.setItem('n5VocabQuest.v1',JSON.stringify(Object.assign({cards,levels:['n5'],sound:false,xp:100,newLimit:'off'},st)));},state);
  const p=await ctx.newPage();p.setDefaultTimeout(15000);p.errs=[];p.on('pageerror',e=>p.errs.push(''+e));
  await p.goto(URL+'?t='+Date.now());await p.waitForSelector('.tabbar');await p.waitForTimeout(700);return p;};
 let p=await mk({});
 const ev=(f,a)=>p.evaluate(f,a),W=ms=>p.waitForTimeout(ms);
 const until=async(f,ms=10000)=>{const t0=Date.now();while(Date.now()-t0<ms){if(await ev(f))return true;await W(60);}return false;};
 // hub + level page
 await p.tap('button.mode[data-m="games"]');await W(400);
 ok('Games hub: Kanaatro tile for every JLPT level',await ev(()=>document.querySelectorAll('button.gtile[data-game="kanaatro"]').length===5));
 await ev(()=>__N5.openLevel('n5'));await until(()=>!!document.querySelector('.gtile[data-game="kanaatro"]'));
 ok("level page Games section has Kanaatro",await ev(()=>!!document.querySelector('.gtile[data-game="kanaatro"][data-gl="n5"]')));
 await ev(()=>{window.__kaSeed=777;window.__kaFast=true;});
 await p.tap('.gtile[data-game="kanaatro"][data-gl="n5"]');await p.waitForSelector('#kaStart');
 ok('intro screen with Start (≥54px)',await ev(()=>document.querySelector('#kaStart').getBoundingClientRect().height>=53.9));
 await p.tap('#kaStart');await p.waitForSelector('#kaGo');await p.tap('#kaGo');await until(()=>document.querySelectorAll('#kaHand .katile').length===12);
 let s=await ev(()=>{const K=__N5.KA,r=t=>t.getBoundingClientRect();return {hand:K.hand.length,hands:K.hands,disc:K.discards,money:K.money,deck:K.deck.length,seed:K.seed,tileH:Math.min(...[...document.querySelectorAll('#kaHand .katile')].map(t=>r(t).height)),tileW:Math.min(...[...document.querySelectorAll('#kaHand .katile')].map(t=>r(t).width)),play:r(document.querySelector('#kaPlay')).height,overflow:document.documentElement.scrollWidth>innerWidth};});
 ok('table: 12 tiles (2 rows of 6), 4 hands, 3 discards, $4, 52-tile seeded deck',s.hand===12&&s.hands===4&&s.disc===3&&s.money===4&&s.deck===52&&s.seed===777,JSON.stringify(s));
 ok('tiles ≥54px tall / ≥46px wide, Play ≥54px, no horizontal overflow',s.tileH>=54&&s.tileW>=46&&s.play>=53.9&&!s.overflow,JSON.stringify(s));
 // ---- validation
 const setHand=chs=>ev(chs=>{const K=__N5.KA;K.hand=[...chs].map((ch,i)=>({id:9000+i+Math.floor(Math.random()*1e5)*10,ch}));K.sel=[];__N5.kaRenderHand(K);return K.hand.map(t=>t.id);},chs);
 const look=async(chs,order)=>ev(([chs,order])=>{const K=__N5.KA;K.hand=[...chs].map((ch,i)=>({id:8000+i,ch}));K.sel=order.map(i=>8000+i);const r=__N5.kaLookup(K);return {state:r.state,id:r.id,key:r.key};},[chs,order]);
 let v=await look('きょう',[0,1,2]);ok('small kana: き+ょ+う = きょう (today)',v.state==='ok'&&v.id===203,JSON.stringify(v));
 v=await look('きよう',[0,1,2]);ok('big よ does not spell きょう',v.id!==203,JSON.stringify(v));
 v=await look('きょう',[2,0,1]);ok('order matters (うきょ ≠ きょう)',v.id!==203,JSON.stringify(v));
 v=await look('キョウ',[0,1,2]);ok('katakana tiles spell it too (script-insensitive)',v.state==='ok'&&v.id===203);
 v=await look('がくせい',[0,1,2,3]);ok('dakuten: が+く+せ+い = がくせい',v.state==='ok'&&v.id===155);
 v=await look('かくせい',[0,1,2,3]);ok('missing dakuten is not がくせい',v.id!==155);
 v=await look('がっこう',[0,1,2,3]);const v2=await look('がつこう',[0,1,2,3]);ok('small っ: がっこう valid, がつこう not',v.id===167&&v2.id!==167);
 v=await look('コーヒー',[0,1,2,3]);ok('ー long vowel: コーヒー valid',v.state==='ok'&&v.id===250);
 const sp=await ev(()=>({a:__N5.kaSpellings({kana:'いい; よい'}),b:__N5.kaSpellings({kana:'～えん'}),c:__N5.kaSpellings({kana:'けっこん (する)'})}));
 ok('spellings: alternatives, ～ affixes and (notes) handled',JSON.stringify(sp)==='{"a":["いい","よい"],"b":["えん"],"c":["けっこん"]}',JSON.stringify(sp));
 const br=await ev(()=>[__N5.kaBrush('か'),__N5.kaBrush('が'),__N5.kaBrush('は'),__N5.kaBrush('ば'),__N5.kaBrush('ぱ'),__N5.kaFlip('か'),__N5.kaFlip('ガ')].join(''));
 ok('brush cycles ゛/゜ correctly; mirror flips script',br==='がかばぱはカが',br);
 // ---- scoring math (independent formula)
 const sc=await ev(()=>{const K=__N5.KA;K.jokers=[];K.lv={};K.blind=0;const T=s=>[...s].map((ch,i)=>({id:7000+i,ch}));
  const tl=T('がっこう'),r=__N5.kaScore(K,167,tl),mk=ch=>ch.normalize('NFD').length>1?1:0;
  const chips=10+4*5+tl.reduce((a,t)=>a+(K.chipT[__N5.kaNorm(t.ch)]||4)+mk(t.ch),0),mult=1+2+0+1;
  return {r:{c:r.chips,m:r.mult,t:r.total,cat:r.cat},exp:{c:chips,m:mult,t:Math.floor(chips*mult)}};});
 ok('scoring: chips = base + 5/kana + tile chips; mult = base + length + level + kanji; total = chips × mult',sc.r.c===sc.exp.c&&sc.r.m===sc.exp.m&&sc.r.t===sc.exp.t&&sc.r.cat==='noun',JSON.stringify(sc));
 const jk=await ev(()=>{const K=__N5.KA,T=s=>[...s].map((ch,i)=>({id:7000+i,ch})),S=__N5.S();K.lv={};K.blind=0;K.tanuki=0;K.streak=0;
  const run=(js,id,w,o)=>{K.jokers=js.map(id=>({id}));return __N5.kaScore(K,id,T(w),o||{});};
  const b=run([],167,'がっこう'),out={};
  out.demon=run(['demon'],167,'がっこう').mult/b.mult;out.kappa=run(['kappa'],167,'がっこう').mult-b.mult;
  const h0=run([],116,'おとうさん'),h1=run(['haiku'],116,'おとうさん');out.haiku=h1.mult/h0.mult;
  const r0=run([],250,'コーヒー'),r1=run(['ronin'],250,'コーヒー');out.ronin=r1.chips-r0.chips;
  const s0=run([],145,'かいしゃ'),s1=run(['salary'],145,'かいしゃ');out.salary=s1.chips/s0.chips;
  S.cards[203].due=Date.now()-1000;S.cards[203].f.due=Date.now()-1000;const k0=run([],203,'きょう'),k1=run(['kitsune'],203,'きょう');out.kitsune=k1.mult/k0.mult;
  const l0=run([],91,'えき');S.cards[91].bad=6;const l1=run(['leech'],91,'えき');S.cards[91].bad=1;out.leech=l1.mult/l0.mult;
  K.tanuki=2;out.tanuki=run(['tanuki'],167,'がっこう').mult-b.mult;K.tanuki=0;
  K.streak=3;out.daruma=run(['daruma'],167,'がっこう').mult-b.mult;K.streak=0;
  out.neko=run(['neko'],167,'がっこう').steps.some(s=>s.money===1);
  out.wrong=run([],167,'がっこう',{wrong:true}).mult/b.mult;
  out.order=(()=>{K.jokers=[{id:'kappa'},{id:'demon'}];const a=__N5.kaScore(K,167,T('がっこう')).mult;K.jokers=[{id:'demon'},{id:'kappa'}];const c=__N5.kaScore(K,167,T('がっこう')).mult;return [a,c];})();
  K.jokers=[];return {out,bm:b.mult};});
 const o=jk.out;
 ok('Dakuten Demon ×1.5 per dakuten kana',Math.abs(o.demon-1.5)<1e-9,JSON.stringify(o));
 ok('Kappa +3 Mult per small kana',o.kappa===3);
 ok('Haiku ×2 for exactly 5 kana',o.haiku===2);
 ok('Katakana Ronin +30 chips for katakana words',o.ronin===30);
 ok('Salaryman doubles chips for work words (会社)',o.salary===2);
 ok('Kitsune Sensei ×2 for due words',o.kitsune===2);
 ok('Leech Hunter ×3 on leeches',o.leech===3);
 ok('Tanuki +4 Mult per animal word played (2 → +8)',o.tanuki===8);
 ok('Daruma +2 Mult per correct check in a row (3 → +6)',o.daruma===6);
 ok('Maneki-neko earns $1 on kanji words',o.neko===true);
 ok('wrong meaning halves Mult',o.wrong===0.5);
 ok('jokers apply left to right (+3 then ×1.5 ≠ ×1.5 then +3)',o.order[0]===(jk.bm+3)*1.5&&o.order[1]===jk.bm*1.5+3,JSON.stringify(o.order));
 const bs=await ev(()=>{const K=__N5.KA,T=s=>[...s].map((ch,i)=>({id:7000+i,ch}));K.jokers=[];K.blind=2;const o={};
  K.boss='verb';o.verbNoun=__N5.kaScore(K,64,T('いぬ')).total;o.verbVerb=__N5.kaScore(K,392,T('たべる')).total;
  K.boss='neck';o.neck2=__N5.kaScore(K,64,T('いぬ')).total;o.neck4=__N5.kaScore(K,167,T('がっこう')).total;
  K.boss='imp';o.imp=__N5.kaScore(K,657,T('もう')).total;o.impN=__N5.kaScore(K,64,T('いぬ')).total;
  K.boss='kata';const h=__N5.kaScore(K,64,T('いぬ')),k=__N5.kaScore(K,64,T('イヌ'));o.kataH=h.steps.filter(s=>s.k==='tile').map(s=>s.chips);o.kataK=k.steps.filter(s=>s.k==='tile').map(s=>s.chips);
  K.boss='mask';o.mask=__N5.kaScore(K,167,T('がっこう')).mult;K.blind=0;o.nomask=__N5.kaScore(K,167,T('がっこう')).mult;return o;});
 ok('boss Verb Oni: nouns score 0, verbs score',bs.verbNoun===0&&bs.verbVerb>0,JSON.stringify(bs));
 ok('boss Rokurokubi: 2-kana words score 0',bs.neck2===0&&bs.neck4>0);
 ok('boss Particle Imp: function words (adverb もう) debuffed',bs.imp===0&&bs.impN>0);
 ok('boss Katakana Kitsune: hiragana tiles give 0 chips, katakana tiles full',bs.kataH.every(x=>x===0)&&bs.kataK.every(x=>x>0));
 ok('boss Kanji Mask: no kanji bonus',bs.mask===bs.nomask-1);
 // ---- real plays with touch: correct MC → Good, score = preview
 await ev(()=>{const K=__N5.KA;K.blind=0;K.jokers=[];K.fast=true;__N5.kaRenderTable(K);});
 const playWord=async(chs,answer,keep)=>{if(!keep)await ev(()=>{const K=__N5.KA;K.phase='play';K.score=0;if(K.hands<1)K.hands=4;});const ids=await setHand(chs+'ーーー'.slice(0,8-chs.length)+'ぬぬぬぬぬ'.slice(0,Math.max(0,5-chs.length)));
  for(let i=0;i<chs.length;i++)await p.tap(`#kaHand [data-t="${ids[i]}"]`);await W(80);
  const pre=await ev(()=>({dis:document.querySelector('#kaPlay').disabled,word:document.querySelector('#kaWord').textContent,chips:+document.querySelector('#kaChips').textContent}));
  await p.tap('#kaPlay');await until(()=>window.__N5.KA.mc&&document.querySelector('#kaMC .kaopt'));
  const mc=await ev(()=>({right:__N5.KA.mc.right,id:__N5.KA.mc.id,w:document.querySelector('.kamcw').textContent}));
  if(answer==='slow')await ev(()=>{__N5.QT.t0-=9500;});
  await p.tap(`#kaMC .kaopt[data-i="${answer==='wrong'?(mc.right+1)%4:mc.right}"]`);
  await until(()=>!__N5.KA.busy,15000);return {pre,mc};};
 let before=await ev(()=>({c:JSON.parse(JSON.stringify(__N5.S().cards[64])),score:__N5.KA.score,exp:__N5.kaScore(__N5.KA,64,[...'いぬ'].map(ch=>({ch}))).total,hands:__N5.KA.hands}));
 let pr=await playWord('いぬ','right');
 let after=await ev(()=>({c:__N5.S().cards[64],score:__N5.KA.score,hands:__N5.KA.hands,last:__N5.KA.stats.words.slice(-1)[0]}));
 ok('preview: valid word enables Play and shows chips',!pr.pre.dis&&/いぬ/.test(pr.pre.word)&&pr.pre.chips>0,JSON.stringify(pr.pre));
 ok('meaning check shows the word (犬)',pr.mc.id===64&&pr.mc.w==='犬',JSON.stringify(pr.mc));
 ok('correct: full score added (= scorer), hand used',after.score-before.score===before.exp&&after.hands===before.hands-1&&after.last.ok,JSON.stringify({before,after}));
 ok('correct + quick: FSRS Good on the reading track (review logged)',after.c.rt===3&&after.c.f.lr>before.c.f.lr&&after.c.ok===before.c.ok+1,JSON.stringify(after.c));
 // slow → Hard
 pr=await playWord('いす','slow');ok('correct but slow: FSRS Hard',await ev(()=>__N5.S().cards[53].rt===2));
 // wrong on review word → Again + mult halved
 await ev(()=>{__N5.KA.hands=4;});
 before=await ev(()=>({c:JSON.parse(JSON.stringify(__N5.S().cards[91])),score:__N5.KA.score,exp:__N5.kaScore(__N5.KA,91,[...'えき'].map(ch=>({ch})),{wrong:true}).total}));
 pr=await playWord('えき','wrong');after=await ev(()=>({c:__N5.S().cards[91],score:__N5.KA.score}));
 ok('wrong: score uses Mult ÷2',after.score===before.exp,JSON.stringify([before.exp,after.score]));
 ok('wrong on a review word: logged as Again (lapse)',after.c.rt===1&&after.c.lapses===1&&after.c.f.st===3,JSON.stringify(after.c));
 // wrong on a learning word → schedule unchanged
 await ev(()=>{const c=__N5.S().cards[116];c.f.st=1;c.f.due=Date.now()+6e5;c.due=c.f.due;__N5.KA.hands=4;});
 before=await ev(()=>JSON.parse(JSON.stringify(__N5.S().cards[116])));
 pr=await playWord('おとうさん','wrong');after=await ev(()=>__N5.S().cards[116]);
 ok('wrong on a learning word: schedule unchanged',after.f.due===before.f.due&&after.f.st===1&&after.rt===before.rt,JSON.stringify([before.f,after.f]));
 // discard + hint
 s=await ev(()=>{const K=__N5.KA;K.phase='play';K.score=0;K.hands=4;K.discards=3;K.money=5;__N5.kaRenderTable(K);return K.hand.map(t=>t.id);});
 await p.tap(`#kaHand [data-t="${s[0]}"]`);await p.tap(`#kaHand [data-t="${s[1]}"]`);await W(60);await p.tap('#kaDiscard');await until(()=>__N5.KA.discards===2&&!__N5.KA.busy&&__N5.KA.hand.length===12);
 ok('discard: 2 tiles gone, refilled to 12, discards 3→2',await ev(ids=>__N5.KA.hand.length===12&&!__N5.KA.hand.some(t=>ids.includes(t.id))&&__N5.KA.discards===2,s.slice(0,2)));
 await setHand('いぬねこえき');await p.tap('#kaHint');await W(150);
 ok('hint costs $1 and lists possible words',await ev(()=>__N5.KA.money===4&&document.querySelectorAll('#kaHints .kahintw').length>=3));
 await p.tap('#kaHints .kahintw');await W(100);ok('tapping a hint selects its tiles',await ev(()=>__N5.KA.sel.length>=2&&__N5.kaLookup(__N5.KA).state==='ok'));
 // tarot + planet
 await ev(()=>{const K=__N5.KA;K.phase='play';K.cons=[{t:'tarot',id:'brush'},{t:'planet',id:'verb'}];__N5.kaRenderTable(K);});
 let ids=await setHand('かくせい');await p.tap(`#kaHand [data-t="${ids[0]}"]`);await p.tap('#kaCons .kaj[data-c="0"]');await p.waitForSelector('#kaUse');await p.tap('#kaUse');await W(150);
 ok('tarot The Brush: か → が on the selected tile, card consumed',await ev(()=>__N5.KA.hand[0].ch==='が'&&__N5.KA.cons.length===1));
 const pl=await ev(()=>{const K=__N5.KA,T=[...'たべる'].map(ch=>({ch}));const a=__N5.kaScore(K,392,T);return {c:a.chips,m:a.mult};});
 await p.tap('#kaCons .kaj[data-c="0"]');await p.waitForSelector('#kaUse');await p.tap('#kaUse');await W(150);
 const pl2=await ev(()=>{const K=__N5.KA,T=[...'たべる'].map(ch=>({ch}));const a=__N5.kaScore(K,392,T);return {c:a.chips,m:a.mult,lv:K.lv.verb};});
 ok('planet Kasei: Verb level 2 → +10 chips, +1 mult',pl2.lv===1&&pl2.c===pl.c+10&&pl2.m===pl.m+1,JSON.stringify([pl,pl2]));
 // win blind → cash out math → shop buy / reroll / sell
 await ev(async()=>{const K=__N5.KA,Wt=ms=>new Promise(r=>setTimeout(r,ms));K.phase='play';K.blind=0;K.money=12;K.hands=2;K.score=__N5.kaTarget(K)-1;__N5.kaRenderTable(K);});
 await playWord('いぬ','right',true);await p.waitForSelector('#kaCash');
 const cash=await ev(()=>({txt:document.querySelector('#kaCash').textContent,money:__N5.KA.money,hands:__N5.KA.hands}));
 const expSum=3+cash.hands+Math.min(5,Math.floor(cash.money/5));
 await p.tap('#kaCash');await p.waitForSelector('#kaNext');
 ok('cash out: reward $3 + $1/hand left + interest ($1 per $5)',cash.txt.includes('$'+expSum)&&await ev(m=>__N5.KA.money===m,cash.money+expSum),JSON.stringify(cash));
 const shop=await ev(()=>{const K=__N5.KA;return {offers:K.offers.map(o=>o.k+':'+(o.id||o.c.id)),money:K.money,j:K.jokers.length};});
 await p.tap('[data-b="0"]');await W(150);
 const sh2=await ev(()=>({money:__N5.KA.money,j:__N5.KA.jokers.map(x=>x.id)}));
 const c0=await ev(o=>__N5.KA_JOKERS[o.split(':')[1]].c,shop.offers[0]);
 ok('shop: buy a joker (money − cost, joker added)',sh2.money===shop.money-c0&&sh2.j.length===1&&sh2.j[0]===shop.offers[0].split(':')[1],JSON.stringify([shop,sh2]));
 await ev(()=>{__N5.KA.money=20;__N5.KA.phase='shop';});await ev(()=>document.querySelector('#kaNext')&&0);
 await ev(()=>{const K=__N5.KA;K.money=20;});await ev(()=>{});await p.evaluate(()=>{document.querySelector('#kaReroll').disabled=false;});
 const offBefore=await ev(()=>JSON.stringify(__N5.KA.offers));await p.tap('#kaReroll');await W(150);
 ok('reroll: $5, next reroll $6, new offers',await ev(b=>__N5.KA.money===15&&__N5.KA.reroll===6&&JSON.stringify(__N5.KA.offers)!==b,offBefore));
 await p.tap('#kaJokers .kaj[data-j="0"]');await p.waitForSelector('#kaSell');await p.tap('#kaSell');await W(120);
 ok('sell a joker for half its price',await ev(c=>__N5.KA.jokers.length===0&&__N5.KA.money===15+Math.max(1,Math.floor(c/2)),c0));
 // hand-size upgrades: Tsuru voucher + Origami Crane (cap 14)
 const vi=await ev(()=>{const K=__N5.KA;K.money=30;K.handPlus=0;K.jokers=[];__N5.kaShop(K);return K.offers.findIndex(o=>o.k==='voucher');});
 ok('shop offers a Tsuru voucher (+1 hand size, $8)',vi>=0&&await ev(i=>__N5.KA.offers[i].cost===8&&!!document.querySelector('.kaoffer.kavch'),vi));
 await p.tap(`[data-b="${vi}"]`);await W(150);
 ok('buying the voucher: −$8, hand size 13 for the run',await ev(()=>__N5.KA.money===22&&__N5.KA.handPlus===1&&__N5.kaHandSize(__N5.KA)===13));
 await ev(()=>{const K=__N5.KA;K.jokers=[{id:'crane'}];__N5.kaShopRoll(K);__N5.kaShop(K,true);});
 ok('Origami Crane: +1 → 14 = cap; no more vouchers offered / buyable',await ev(()=>{const K=__N5.KA;return __N5.kaHandSize(K)===14&&!K.offers.some(o=>o.k==='voucher')&&__N5.kaBuy(K,K.offers.push({k:'voucher',id:'hand',cost:8})-1)===false;}));
 await ev(()=>{const K=__N5.KA;K.offers.pop();K.blind=0;__N5.kaBeginBlind(K);});await until(()=>document.querySelectorAll('#kaHand .katile').length===14);
 const h14=await ev(()=>{const ts=[...document.querySelectorAll('#kaHand .katile')].map(t=>t.getBoundingClientRect());return {n:ts.length,cls:document.querySelector('#kaHand').classList.contains('kah7'),w:Math.min(...ts.map(t=>t.width)),h:Math.min(...ts.map(t=>t.height)),ov:document.documentElement.scrollWidth>innerWidth};});
 ok('14-tile hand: 2 rows of 7, tiles ≥44px wide / ≥52px tall, no overflow',h14.n===14&&h14.cls&&h14.w>=43.5&&h14.h>=52&&!h14.ov,JSON.stringify(h14));
 ok('no page errors (main)',!p.errs.length,p.errs.join('|'));
 await p.context().close();
 // ---- daily new-word cap
 p=await mk({newLimit:1});
 await ev(()=>{window.__kaSeed=5;window.__kaFast=true;__N5.gOpen('n5','kanaatro',__N5.home);});await p.waitForSelector('#kaStart');await p.tap('#kaStart');await p.waitForSelector('#kaGo');await p.tap('#kaGo');await until(()=>__N5.KA&&__N5.KA.hand.length===12);
 const un=await ev(()=>{const K=__N5.KA,W=__N5.WORDS,out=[];for(const e of K.lib.keys){const k=e.key;if(k.length>=2&&k.length<=4&&!/ー/.test(k)&&e.ids.length===1&&W[e.ids[0]].lvl==='n5'&&!__N5.S().cards[e.ids[0]])out.push({k,id:e.ids[0]});if(out.length>=3)break;}return out;});
 const pw2=async k=>{const ids=await ev(chs=>{const K=__N5.KA;K.hand=[...chs].map((ch,i)=>({id:6000+i+Math.floor(Math.random()*1e4)*10,ch}));K.sel=[];__N5.kaRenderHand(K);return K.hand.map(t=>t.id);},k);for(let i=0;i<k.length;i++)await p.tap(`#kaHand [data-t="${ids[i]}"]`);await W(80);};
 const playRight=async()=>{await p.tap('#kaPlay');await until(()=>__N5.KA.mc&&document.querySelector('#kaMC .kaopt'));await ev(()=>__N5.KA.mc.choose(__N5.KA.mc.right));await until(()=>!__N5.KA.busy);};
 await ev(()=>{__N5.KA.score=-1e6;});await pw2(un[0].k);
 ok('unseen word under the cap: playable with ✨ Discovery badge, no limit note',await ev(()=>!document.querySelector('#kaPlay').disabled&&!!document.querySelector('#kaWord .kadisco')&&!document.querySelector('#kaWord .kanote')));
 await playRight();
 const d0=await ev(id=>{const K=__N5.KA,L=K.lastScore;return {disc:L.disc,step:L.steps.some(s=>s.k==='disc'&&s.chips===15&&s.mult===2),seen:!!__N5.S().cards[id],nt:__N5.newToday().length,sd:K.stats.disc,na:K.stats.notAdded};},un[0].id);
 ok('Discovery bonus scored (+15 Chips, +2 Mult) and the word is introduced (Seen + FSRS, cap 1/1)',d0.disc&&d0.step&&d0.seen&&d0.nt===1&&d0.sd===1&&d0.na===0,JSON.stringify(d0));
 await pw2(un[1].k);
 const cap=await ev(k=>({dis:document.querySelector('#kaPlay').disabled,txt:document.querySelector('#kaWord').textContent,st:__N5.kaLookup(__N5.KA).state,inHint:__N5.kaPossible(__N5.KA).some(x=>x.key===k),badge:!!document.querySelector('#kaWord .kadisco'),note:!!document.querySelector('#kaWord .kanote')}),un[1].k);
 ok('cap hit: unseen word still playable + in hints, Discovery badge + "not added: daily limit" note, no 🔒 block',!cap.dis&&cap.st==='ok'&&cap.inHint&&cap.badge&&cap.note&&/not added: daily limit/.test(cap.txt)&&!/not learned yet|🔒/.test(cap.txt),JSON.stringify(cap));
 const cards0=await ev(()=>Object.keys(__N5.S().cards).length);
 await playRight();
 const d1=await ev(id=>{const K=__N5.KA,L=K.lastScore;return {disc:L.disc,tot:L.total,seen:!!__N5.S().cards[id],nt:__N5.newToday().length,na:K.stats.notAdded,nc:Object.keys(__N5.S().cards).length};},un[1].id);
 ok('over the cap: scores with Discovery, NOT added to Seen/FSRS, cap unchanged (1)',d1.disc&&d1.tot>0&&!d1.seen&&d1.nt===1&&d1.na===1&&d1.nc===cards0,JSON.stringify(d1));
 await pw2(un[1].k);ok('replaying the same discovered word in this run: no second Discovery bonus',await ev(()=>{const K=__N5.KA,r=__N5.kaLookup(K);return !__N5.kaScore(K,r.id,K.sel.map(id=>K.hand.find(t=>t.id===id)),{preview:true}).disc&&!document.querySelector('#kaWord .kadisco');}));
 // whole library: N1 words, level mult, discovery math, performance
 const lib=await ev(()=>{const K=__N5.KA,W=__N5.WORDS,L=K.lib;let n1=null;for(const e of L.keys){if(e.len>=3&&e.len<=5&&!/ー/.test(e.key)&&e.ids.every(id=>W[id].lvl==='n1'))
   {n1=e;break;}}const id=n1.ids[0],w=W[id],T=[...n1.key].map((ch,i)=>({id:7700+i,ch}));K.jokers=[];K.lv={};K.blind=0;K.hand=T.concat(K.hand.slice(0,8-T.length));K.sel=T.map(t=>t.id);
   const r=__N5.kaLookup(K),a=__N5.kaScore(K,id,T,{disc:false}),b=__N5.kaScore(K,id,T,{disc:true}),cats={noun:[10,2],verb:[15,3],adj:[15,3],count:[20,3],kata:[15,2],phrase:[10,2]};
   const t0=performance.now();for(let i=0;i<20;i++)__N5.kaPossible(K);const ms=(performance.now()-t0)/20;
   return {size:L.size,lvls:[...new Set([...L.map.values()].flat().map(i=>W[i].lvl))].sort().join(),key:n1.key,ok:r.state==='ok'&&r.id===id,lvl:w.lvl,base:a.steps[0].mult,len:T.length,cat:a.cat,cm:__N5.KA_CATS[a.cat].mult,dc:b.chips-a.chips,dm:b.mult-a.mult,ms};});
 ok('library index covers N5–N1 (≥7,000 spellings)',lib.size>=7000&&lib.lvls==='n1,n2,n3,n4,n5',JSON.stringify({size:lib.size,lvls:lib.lvls}));
 ok('an N1-only word is a valid play at N5',lib.ok&&lib.lvl==='n1',JSON.stringify(lib));
 ok('JLPT level still in Mult: N1 base = category + length bonus + 4',lib.base===lib.cm+Math.max(0,lib.len-2)+4,JSON.stringify(lib));
 ok('Discovery adds exactly +15 Chips and +2 Mult',lib.dc===15&&lib.dm===2,JSON.stringify(lib));
 ok('whole-library hand search is fast (<40ms per hand)',lib.ms<40,lib.ms.toFixed(1)+'ms');
 // unlock toasts wait while a game is on screen
 await ev(()=>{document.querySelectorAll('.toast').forEach(e=>e.remove());__N5.queueUnlock('🔓 Test set unlocked');});await W(900);
 {const st=await ev(()=>({on:__N5.GAME_ON,t:!!document.querySelector('.toast'),q:[...__N5.PENDING_UNLOCKS],go:typeof __N5.go}));ok('set-unlock toast is held while the game is active',st.on&&!st.t&&st.q.includes('🔓 Test set unlocked'),JSON.stringify(st));}
 await ev(()=>__N5.go(__N5.home));await W(1300);
 {const st=await ev(()=>({on:__N5.GAME_ON,t:(document.querySelector('.toast')||{}).textContent||'',q:__N5.PENDING_UNLOCKS.length}));ok('…and shown after leaving the game',!st.on&&/unlocked/.test(st.t)&&!st.q,JSON.stringify(st));}
 ok('no page errors (cap)',!p.errs.length,p.errs.join('|'));
 await p.context().close();
 // ---- full seeded run → summary
 p=await mk({});
 const xp0=await ev(()=>__N5.S().xp);
 const run=await ev(async()=>{window.__kaFast=true;window.__kaSeed=3;__N5.gOpen('n5','kanaatro',__N5.home);
  const Wt=ms=>new Promise(r=>setTimeout(r,ms)),un=async(f,ms=8000)=>{const t=Date.now();while(Date.now()-t<ms){if(f())return true;await Wt(10);}return false;};
  await un(()=>document.querySelector('#kaStart'));document.querySelector('#kaStart').click();await un(()=>document.querySelector('#kaGo'));const seen=new Set();let correct=0,phases=new Set();
  for(let step=0;step<30000;step++){const K=__N5.KA;phases.add(K.phase);
   if(K.phase==='summary')break;if(K.phase==='won'){document.querySelector('#kaFinish').click();await Wt(30);continue;}
   if(K.phase==='blind'){document.querySelector('#kaGo').click();await Wt(20);continue;}
   if(K.phase==='cash'){await un(()=>document.querySelector('#kaCash'));document.querySelector('#kaCash').click();await Wt(20);continue;}
   if(K.phase==='shop'){for(let i=0;i<4;i++){const o=K.offers[i];if(o&&!o.sold&&K.money>=o.cost&&(o.k==='joker'||o.c.t==='planet'))__N5.kaBuy(K,i);}while(K.cons.length){if(K.cons[0].t==='planet')__N5.kaUseCon(K,0);else K.cons.shift();}document.querySelector('#kaNext').click();await Wt(20);continue;}
   if(K.phase==='play'){if(K.busy){await Wt(10);continue;}const ps=__N5.kaPossible(K),need=__N5.kaTarget(K)-K.score;
    if((!ps.length||ps[0].score<Math.min(need,60))&&K.discards>0){const keep=new Set(ps[0]?ps[0].seq:[]);K.sel=K.hand.map((t,i)=>i).filter(i=>!keep.has(i)).slice(0,5).map(i=>K.hand[i].id);document.querySelector('#kaDiscard').disabled=false;document.querySelector('#kaDiscard').click();await Wt(30);continue;}
    if(!ps.length){K.hands=0;continue;}
    K.sel=ps[0].seq.map(i=>K.hand[i].id);document.querySelector('#kaPlay').disabled=false;document.querySelector('#kaPlay').click();await un(()=>K.mc);const id=K.mc.id;if(!seen.has(id)){seen.add(id);correct++;}K.mc.choose(K.mc.right);await un(()=>!K.busy||K.phase!=='play',8000);continue;}
   await Wt(15);}
  const K=__N5.KA;return {phase:K.phase,ante:K.ante,total:K.total,words:K.stats.words.length,reviews:K.stats.reviews,distinct:correct,hs:__N5.S().games.hs['n5:kanaatro'],won:K.stats.blindsWon,phases:[...phases],xpTxt:[...document.querySelectorAll('.kasumgrid div')].map(d=>d.textContent).join('|')};});
 ok('full seeded run reaches the summary (blind → play → cash → shop loop)',run.phase==='summary'&&['blind','play','cash','shop'].every(x=>run.phases.includes(x))&&run.won>=3,JSON.stringify(run));
 ok('summary: words played, reviews logged (= distinct correctly-checked words), blinds',run.reviews===run.distinct&&new RegExp(run.words+'words played').test(run.xpTxt),JSON.stringify(run));
 ok('high score saved',run.hs===run.total&&run.total>0);
 const xp1=await ev(()=>__N5.S().xp);const xpShown=+(run.xpTxt.match(/\+(\d+)XP/)||[])[1];
 ok('XP credited (summary bonus + answers)',xp1-xp0>=xpShown&&xpShown>0,JSON.stringify({xp0,xp1,xpShown}));
 ok('best hand + word list shown, word chips open details',await ev(()=>!!document.querySelector('.kabest')&&document.querySelectorAll('.kawords .kaw').length>0));
 ok('no page errors (run)',!p.errs.length,p.errs.join('|'));
 await p.context().close();
 // ---- reduced motion + light mode
 p=await mk({},{reducedMotion:'reduce',colorScheme:'light'});
 await ev(()=>{__N5.S().theme='light';__N5.applyTheme&&__N5.applyTheme();window.__kaSeed=9;__N5.gOpen('n5','kanaatro',__N5.home);});await p.waitForSelector('#kaStart');await p.tap('#kaStart');await p.waitForSelector('#kaGo');await p.tap('#kaGo');await W(500);
 const rm=await ev(()=>({rm:__N5.KA.rm,anim:getComputedStyle(document.querySelector('.ka'),'::before').animationName,bg:getComputedStyle(document.querySelector('.ka')).backgroundColor,theme:document.documentElement.dataset.theme||''}));
 ok('reduced motion respected (flag on, felt animation off)',rm.rm&&rm.anim==='none',JSON.stringify(rm));
 ok('light theme: game keeps its dark felt table',/rgb\(11, 50, 40\)/.test(rm.bg),JSON.stringify(rm));
 ok('no page errors (rm/light)',!p.errs.length,p.errs.join('|'));
 await b.close();const n=R.filter(Boolean).length;console.log(`SUMMARY ${BR} tkanaatro ${n}/${R.length} passed`);process.exit(n===R.length?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
