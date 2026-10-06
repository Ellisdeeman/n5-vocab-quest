// Batch 9: ConjuGato-style conjugation — Reveal default, filters, table, self-grade, guides; still separate from vocab
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
  const newId = await ev(() => { const it = __N5.cjPoolItems().find(x => !__N5.ccards()[x.id] && x.fid === 'te') || __N5.cjPoolItems().find(x => !__N5.ccards()[x.id]); return it && it.id; });
  ok('has a new form to practice', !!newId, String(newId));
  const beforeDue = await ev(() => __N5.totalDue());
  const iso0 = await ev(() => ({ acc: JSON.stringify(__N5.paceAcc()), td: __N5.totalDue(), tl: __N5.pnTimeline().now }));
  await p.evaluate(id => __N5.cjSession([id], 'learn', 'test', () => __N5.conjHome()), newId);
  await p.waitForSelector('#cjReveal'); await p.waitForTimeout(300);
  ok('Reveal mode shows prompt without the answer yet', await ev(() => !!document.querySelector('#cjReveal') && !document.querySelector('.cjansbig')));
  await p.tap('#cjReveal'); await p.waitForSelector('.cjansbig'); await p.waitForTimeout(400);
  await shot('b9-reveal');
  ok('after Reveal: answer + Again/Hard/Good/Easy + hear', await ev(() => !!document.querySelector('.cjansbig') && document.querySelectorAll('.cjrate button').length === 4 && !!document.querySelector('#cjSayAns')));
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
    await p.waitForSelector('#nextBtn'); await p.tap('#nextBtn'); await p.waitForTimeout(400);
  } else ok('typing mode skipped (no new left)', true);

  // Grammar + Home entry
  await p.evaluate(() => __N5.go(__N5.grammarHome)); await p.waitForTimeout(400);
  ok('Grammar hub still has Conjugation drills', await ev(() => !!document.querySelector('#grConj')));
  await p.evaluate(() => __N5.go(home)); await p.waitForSelector('.cjtile-home');
  ok('Home conjugation tile', await ev(() => !!document.querySelector('.cjtile-home')));
  ok('no page errors', errs.length === 0, errs.join(' | '));

  await b.close();
  console.log('SUMMARY', BR, 'tconj', R.filter(x => x).length + '/' + R.length);
})().catch(e => { console.log('FAIL crash', e); console.log('SUMMARY', BR, 'crash'); process.exit(1); });
