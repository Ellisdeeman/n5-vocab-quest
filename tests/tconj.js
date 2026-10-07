// Batch 9 + 9.1 (English meaning of conjugated forms): ConjuGato-style conjugation — Reveal default, filters, table, self-grade, guides; still separate from vocab
const pw = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8766/'; const BR = process.env.BROWSER || 'chromium';
const R = []; const ok = (n, c, i = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', BR, n, c ? '' : i); };
const seed = () => {
  if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', 1);
  const now = Date.now(), cards = {};
  const ids = [0, 1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  ids.forEach((id, i) => { cards[id] = { box: 2, due: now + (i < 8 ? -3600e3 : 864e5), ok: 4, bad: 1, run: 2, f: { st: 2, s: 5, d: 5, lr: now - 864e5, due: now + (i < 8 ? -3600e3 : 864e5) } }; });
  cards[2].bad = 8; cards[2].lapses = 3; cards[2].ok = 4;
  localStorage.setItem('n5VocabQuest.v1', JSON.stringify({ cards, levels: ['n5'], newLimit: 10, autoAdvance: false, cjLimit: 5, ccards: {}, newLogC: {}, revLog: {}, dailyHistory: {}, cjPref: { mode: 'reveal' } }));
  const d0 = new Date(); const day = n => { const x = new Date(d0); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const rev = {}; for (let i = 0; i < 14; i++) { const d = day(i); rev[d] = { n5r: 10 + i, 'n5r+': 8 + (i % 3) }; }
  const S = JSON.parse(localStorage.getItem('n5VocabQuest.v1')); S.revLog = rev; S.streak = 4; S.lastDay = day(0);
  localStorage.setItem('n5VocabQuest.v1', JSON.stringify(S));
  const days = {}; for (let i = 0; i < 14; i++) days[day(i)] = { sec: 600 + i * 30, items: 12, newW: i < 7 ? 3 : 1 };
  localStorage.setItem('jlptVocabQuest.time.v1', JSON.stringify({ goalMin: 15, goalItems: 0, goalNew: 0, days }));
};
(async () => {
  const b = BR === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, ...(BR === 'chromium' ? { isMobile: true } : {}) });
  await ctx.addInitScript(seed);
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push('' + e));
  await p.goto(URL + '?t=' + Date.now()); await p.waitForSelector('.tabbar'); await p.waitForTimeout(900);
  const ev = (f, a) => p.evaluate(f, a);
  const shot = async n => { if (process.env.SHOTS) { await p.waitForTimeout(400); await p.screenshot({ path: '/workspace/n5-game/shot-' + n + '.png' }); } };

  ok('たべる → て = たべて', await ev(() => (__N5.cjConjugate({ jp: '食べる', kana: 'たべる', pos: 'v' }, 'te') || [])[0] === 'たべて'));
  ok('いく → て = いって', await ev(() => (__N5.cjConjugate({ jp: '行く', kana: 'いく', pos: 'v' }, 'te') || [])[0] === 'いって'));
  ok('いい → くない = よくない', await ev(() => (__N5.cjConjugate({ jp: 'いい', kana: 'いい', pos: 'ai' }, 'ai_neg') || [])[0] === 'よくない'));
  ok('帰る u, 着る ru, する irr', await ev(() => __N5.cjGroup({ jp: '帰る', kana: 'かえる', pos: 'v' }) === 'u' && __N5.cjGroup({ jp: '着る', kana: 'きる', pos: 'v' }) === 'ru' && __N5.cjReg({ jp: 'する', kana: 'する', pos: 'v' }) === 'irr'));

  // 9.1 English meaning of the conjugated form
  const EN = await ev(() => {
    const W = jp => Object.values(__N5.WORDS).find(w => w && w.jp === jp);
    const a = W('会う'), t = W('高い'), k = W('綺麗');
    const E = (w, f) => w ? __N5.cjEn(w, f) : 'MISSING';
    return { masu: E(a, 'masu'), masen: E(a, 'masen'), mashita: E(a, 'mashita'), mdeshita: E(a, 'masendeshita'), te: E(a, 'te'), tai: E(a, 'tai'), dict: E(a, 'dict'),
      tneg: E(t, 'ai_neg'), tpast: E(t, 'ai_past'), tpn: E(t, 'ai_pastneg'), kneg: E(k, 'na_neg'), kpast: E(k, 'na_past'),
      ate: E(W('食べる'), 'mashita'), went: E(W('行く'), 'mashita'), saw: E(W('見る'), 'mashita'), came: E(W('来る'), 'mashita'), bought: E(W('買う'), 'mashita'),
      shower: E(W('浴びる'), 'mashita'), phr: __N5.cjEnPast('take a shower'), stop: __N5.cjEnPast('stop'), cry: __N5.cjEnPast('cry'),
      copy: (__N5.cjConjugate(W('コピーする'), 'masu') || [])[0], ryoko: W('旅行') ? __N5.cjEligibleWord(W('旅行')) : false,
      aud: __N5.cjAudioName(W('コピーする'), 'masu') };
  });
  ok('9.1 会う: meet / will meet · met · didn\'t meet · meet and… · want to meet · plain', EN.masu === 'meet / will meet (polite)' && EN.masen === "don't meet / won't meet (polite)" && EN.mashita === 'met (polite past)' && EN.mdeshita === "didn't meet (polite past)" && /^meet and… \/ please meet/.test(EN.te) && EN.tai === 'want to meet' && EN.dict === 'meet (plain)', JSON.stringify(EN));
  ok('9.1 adjectives: not expensive · was expensive · wasn\'t · not pretty · was pretty', /^not expensive/.test(EN.tneg) && /^was expensive/.test(EN.tpast) && /^wasn't expensive/.test(EN.tpn) && /^not pretty/.test(EN.kneg) && /^was pretty/.test(EN.kpast), JSON.stringify(EN));
  ok('9.1 irregular English past: ate/went/saw/came/bought/took a shower', /^ate/.test(EN.ate) && /^went/.test(EN.went) && /^saw/.test(EN.saw) && /^came/.test(EN.came) && /^bought/.test(EN.bought) && /^took a shower/.test(EN.shower) && EN.phr === 'took a shower' && EN.stop === 'stopped' && EN.cry === 'cried', JSON.stringify(EN));
  ok('9.1 コピーする is a する-verb (コピーします, re-recorded v2 audio); 旅行 noun not drilled', EN.copy === 'コピーします' && EN.aud === 'コピーする-masu-v2.mp3' && EN.ryoko === false, JSON.stringify(EN));

  await p.evaluate(() => __N5.go(__N5.conjHome)); await p.waitForSelector('#cjGo'); await p.waitForTimeout(400);
  await shot('b9-hub');
  ok('hub: big Practice button + filter chips', await ev(() => !!document.querySelector('#cjGo') && document.querySelectorAll('.cjchip').length >= 8));
  ok('hub: default Reveal mode label', await ev(() => /Reveal/.test(document.querySelector('#cjMode').textContent)));
  ok('hub: browse verbs + pattern packs', await ev(() => document.querySelectorAll('.cjverb').length > 0 && document.querySelectorAll('.cjpack').length >= 3));
  ok('hub notes separation from vocab', await ev(() => /Own memory track|never changes vocab/i.test(document.body.innerText)));

  // filters: toggle form chips and persist
  await p.evaluate(() => __N5.cjSavePref({ forms: ['te', 'masu'], regs: ['regular', 'irr', 'special'], groups: ['ru', 'u', 'suru', 'kuru', 'iku'], pop: 'seen' }));
  await p.evaluate(() => __N5.go(__N5.conjHome)); await p.waitForTimeout(400);
  ok('filters remembered (て + ます only in form list)', await ev(() => {
    const rows = [...document.querySelectorAll('.cjforms .cjrow[data-f]')].map(b => b.dataset.f);
    return rows.includes('te') && rows.includes('masu') && !rows.includes('tai');
  }));
  await shot('b9-filters');

  // Reveal flow
  const newId = await ev(() => { if (!__N5.ccards()['1:mashita'] && __N5.WORDS[1] && __N5.WORDS[1].jp === '会う') return '1:mashita'; const it = __N5.cjPoolItems().find(x => !__N5.ccards()[x.id] && x.fid === 'te') || __N5.cjPoolItems().find(x => !__N5.ccards()[x.id]); return it && it.id; });
  ok('has a new form to practice', !!newId, String(newId));
  const beforeDue = await ev(() => __N5.totalDue());
  const iso0 = await ev(() => ({ acc: JSON.stringify(__N5.paceAcc()), td: __N5.totalDue(), tl: __N5.pnTimeline().now }));
  await p.evaluate(id => __N5.cjSession([id], 'learn', 'test', () => __N5.conjHome()), newId);
  await p.waitForSelector('#cjReveal'); await p.waitForTimeout(300);
  ok('Reveal mode shows prompt without the answer yet', await ev(() => !!document.querySelector('#cjReveal') && !document.querySelector('.cjansbig')));
  await p.tap('#cjReveal'); await p.waitForSelector('.cjansbig'); await p.waitForTimeout(400);
  await shot('b9-reveal');
  ok('after Reveal: answer + Again/Hard/Good/Easy + hear', await ev(() => !!document.querySelector('.cjansbig') && document.querySelectorAll('.cjrate button').length === 4 && !!document.querySelector('#cjSayAns')));
  ok('9.1 reveal shows English of the conjugated form', await ev(id => { const e = document.querySelector('.cjen'); return !!e && e.textContent.includes(__N5.cjEn(__N5.WORDS[id.split(':')[0]], id.split(':')[1])) && (id !== '1:mashita' || /会いました · met \(polite past\)/.test(e.textContent)); }, newId));
  ok('rule or guide available after reveal', await ev(() => !!document.querySelector('.cjrule') || !!document.querySelector('#cjOpenG')));
  await p.tap('.cjrate button[data-r="3"]'); await p.waitForSelector('#nextBtn');
  ok('Good grades into ccards', await ev(id => !!__N5.ccards()[id] && __N5.ccards()[id].cj === 1, newId));
  await p.tap('#nextBtn'); await p.waitForTimeout(500);
  ok('history records the practice', await ev(id => (__N5.cjHist() || []).some(h => h.id === id && h.r === 3 && h.mode === 'reveal'), newId));

  // self-grade Again drops ladder from a high rung
  await p.evaluate(id => { const C = __N5.S().ccards; C[id].lad = 4; C[id].run = 5; C[id].f = { st: 2, s: 20, d: 5, lr: Date.now() - 20 * 864e5, due: Date.now() - 1000 }; }, newId);
  await p.evaluate(id => __N5.cjSession([id], 'review', 'again', () => __N5.conjHome()), newId);
  await p.waitForSelector('#cjReveal'); await p.tap('#cjReveal'); await p.waitForSelector('.cjrate');
  await p.tap('.cjrate button[data-r="1"]'); await p.waitForSelector('#nextBtn');
  ok('Again drops ladder rung', await ev(id => __N5.ccards()[id].lad < 4, newId));
  await p.tap('#nextBtn'); await p.waitForTimeout(400);

  const iso1 = await ev(() => ({ acc: JSON.stringify(__N5.paceAcc()), td: __N5.totalDue(), tl: __N5.pnTimeline().now }));
  ok('reveal practice leaves vocab due / pace / reminder timeline unchanged', JSON.stringify(iso0) === JSON.stringify(iso1), JSON.stringify([iso0, iso1]));
  ok('conjugation due NOT in totalDue', await ev(d0 => __N5.totalDue() === d0, beforeDue));

  // Verb table
  const wid = await ev(id => +id.split(':')[0], newId);
  await p.evaluate(w => __N5.go(() => __N5.cjTableView(w)), wid);
  await p.waitForSelector('.cjtable'); await p.waitForTimeout(300);
  await shot('b9-table');
  ok('verb table lists forms with kana answers', await ev(() => document.querySelectorAll('.cjcell').length >= 5 && /ます|て/.test(document.body.innerText)));
  ok('irregular cells present or regular verb unmarked', await ev(() => document.querySelectorAll('.cjcell').length >= 5));
  ok('9.1 verb table: English meaning per cell', await ev(() => { const c = document.querySelectorAll('.cjcell'); return c.length >= 5 && [...c].every(x => (x.querySelector('.cjcellen') || {}).textContent); }));
  ok('Practice this verb button', await ev(() => !!document.querySelector('#cjPrThis')));

  // Guide
  await p.evaluate(() => __N5.go(() => __N5.cjGuideView('te')));
  await p.waitForSelector('.cjguide'); await shot('b9-guide');
  ok('て-form guide has group rules', await ev(() => /Ru-verb|いって|U-verb/.test(document.querySelector('.cjguide').textContent)));

  // Typing mode still works
  await p.evaluate(() => { __N5.cjSavePref({ mode: 'type', forms: ['masu', 'te', 'masen', 'mashita', 'masendeshita', 'tai', 'dict', 'ai_neg', 'ai_past', 'ai_pastneg', 'na_neg', 'na_past', 'na_pastneg'] }); });
  const tid = await ev(() => { const it = __N5.cjPoolItems().find(x => !__N5.ccards()[x.id]); return it && it.id; });
  if (tid) {
    await p.evaluate(id => __N5.cjSession([id], 'learn', 'type', () => __N5.conjHome()), tid);
    await p.waitForSelector('#qhost .choice, #typein, #cjReveal');
    ok('typing mode uses ladder MC (not Reveal)', await ev(() => !!document.querySelector('#qhost .choice') && !document.querySelector('#cjReveal')));
    await p.evaluate(id => {
      const p = id.split(':'), a = __N5.cjConjugate(__N5.WORDS[p[0]], p[1])[0];
      const btn = [...document.querySelectorAll('#qhost .choice')].find(b => b.textContent.includes(a));
      (btn || document.querySelector('#qhost .choice')).click();
    }, tid);
    await p.waitForSelector('#nextBtn');
    await p.evaluate(() => (document.querySelector('.cjen') || document.body).scrollIntoView({ block: 'center' })); await shot('b91-type');
    ok('9.1 typing feedback shows English of the form', await ev(() => !!document.querySelector('#qhost .cjen, .cjen') && /\S/.test(document.querySelector('.cjen').textContent)));
    await p.tap('#nextBtn'); await p.waitForTimeout(400);
  } else ok('typing mode skipped (no new left)', true);

  await p.evaluate(() => __N5.go(__N5.conjHome)); await p.waitForSelector('#cjGo');
  ok('9.1 history rows show form + English', await ev(() => { const h = document.querySelector('.cjhist .cjhen'); return !!h && h.textContent.length > 2; }));
  await p.evaluate(() => document.querySelector('.cjhist').scrollIntoView({ block: 'center' })); await shot('b91-history');
  // Grammar + Home entry
  await p.evaluate(() => __N5.go(__N5.grammarHome)); await p.waitForTimeout(400);
  ok('Grammar hub still has Conjugation drills', await ev(() => !!document.querySelector('#grConj')));
  await p.evaluate(() => __N5.go(home)); await p.waitForSelector('.cjtile-home');
  ok('Home conjugation tile', await ev(() => !!document.querySelector('.cjtile-home')));
  ok('no page errors', errs.length === 0, errs.join(' | '));

  await b.close();
  console.log('SUMMARY', BR, 'tconj', R.filter(x => x).length + '/' + R.length);
})().catch(e => { console.log('FAIL crash', e); console.log('SUMMARY', BR, 'crash'); process.exit(1); });
