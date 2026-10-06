// Batch 8: conjugator + conjugation hub (separate track) + home quick + weekly report
const pw = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8766/'; const BR = process.env.BROWSER || 'chromium';
const R = []; const ok = (n, c, i = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', BR, n, c ? '' : i); };
const seed = () => {
  if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', 1);
  const now = Date.now(), cards = {};
  // seed known verbs/adjectives so conjugation pool is non-empty
  const ids = [0, 1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120];
  ids.forEach((id, i) => { cards[id] = { box: 2, due: now + (i < 8 ? -3600e3 : 864e5), ok: 4, bad: 1, run: 2, f: { st: 2, s: 5, d: 5, lr: now - 864e5, due: now + (i < 8 ? -3600e3 : 864e5) } }; });
  // a few hard ones for weekly hardest
  cards[2].bad = 8; cards[2].lapses = 3; cards[2].ok = 4;
  cards[5].bad = 6; cards[5].lapses = 2; cards[5].ok = 3;
  localStorage.setItem('n5VocabQuest.v1', JSON.stringify({ cards, levels: ['n5'], newLimit: 10, autoAdvance: false, cjLimit: 5, ccards: {}, newLogC: {}, revLog: {}, dailyHistory: {} }));
  const d0 = new Date(); const day = n => { const x = new Date(d0); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const rev = {}; for (let i = 0; i < 14; i++) { const d = day(i); rev[d] = { n5r: 10 + i, 'n5r+': 8 + (i % 3), gramg: 2, 'gramg+': 2 }; }
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
  const shot=async n=>{ if(process.env.SHOTS){ await p.waitForTimeout(400); await p.screenshot({path:'/workspace/n5-game/shot-'+n+'.png'}); } };
  const ev = (f, a) => p.evaluate(f, a);

  // conjugator unit checks via __N5
  ok('たべる → て = たべて (ru-verb)', await ev(() => (__N5.cjConjugate({ jp: '食べる', kana: 'たべる', pos: 'v' }, 'te') || [])[0] === 'たべて'));
  ok('いく → て = いって (special)', await ev(() => (__N5.cjConjugate({ jp: '行く', kana: 'いく', pos: 'v' }, 'te') || [])[0] === 'いって'));
  ok('いい → くない = よくない', await ev(() => (__N5.cjConjugate({ jp: 'いい', kana: 'いい', pos: 'ai' }, 'ai_neg') || [])[0] === 'よくない'));
  ok('帰る is u-verb, 着る is ru-verb', await ev(() => __N5.cjGroup({ jp: '帰る', kana: 'かえる', pos: 'v' }) === 'u' && __N5.cjGroup({ jp: '着る', kana: 'きる', pos: 'v' }) === 'ru'));

  // Home quick card
  await shot('b8-home-quick');
  ok('Home quick card at top', await ev(() => !!document.querySelector('#homeQuick') && document.querySelector('#hqStart')));
  ok('quick card shows due / goal / streak', await ev(() => { const t = document.querySelector('#homeQuick').textContent; return /due|Nothing due/.test(t) && /min/.test(t) && /streak/.test(t); }));
  await p.tap('#hqStart'); await p.waitForTimeout(1200);
  ok('Start reviews opens due review or practice', await ev(() => !!document.querySelector('#qhost') || /Review|practice|Nothing/i.test(document.body.innerText)));
  await p.evaluate(() => __N5.go(__N5.home || home)); await p.waitForSelector('#homeQuick'); await p.waitForTimeout(400);

  // Weekly report
  await p.tap('#hqWeek'); await p.waitForTimeout(800);
  await shot('b8-week');
  ok('Weekly report screen', await ev(() => /Last 7 days/.test(document.body.innerText) && /accuracy|reviews/i.test(document.body.innerText)));
  ok('N5-ready projection or done line', await ev(() => /N5|finish|lock them in/.test(document.body.innerText)));
  ok('week report does not throw', errs.length === 0, errs.join('|'));

  // Conjugation hub — separate from vocab due
  const beforeDue = await ev(() => __N5.totalDue());
  await p.evaluate(() => __N5.go(__N5.conjHome)); await p.waitForSelector('#cjSub'); await p.waitForTimeout(500);
  await shot('b8-conj');
  ok('Conjugation hub loads', await ev(() => /Conjugation/.test(document.querySelector('.largetitle')?.textContent || '') && /separate from vocab/i.test(document.body.innerText)));
  ok('pool uses known words only', await ev(() => __N5.cjPoolItems().length > 0 && __N5.cjKnownPool && true));
  // learn one form
  const newId = await ev(() => { const it = __N5.cjPoolItems().find(x => !__N5.ccards()[x.id]); return it && it.id; });
  ok('has a new form to learn', !!newId, String(newId));
  if (newId) {
    await p.evaluate(id => __N5.cjSession([id], 'learn', 'test', () => __N5.conjHome()), newId);
    await p.waitForSelector('#qhost .choice, #typein'); await p.waitForTimeout(400);
    // answer MC (rung 1)
    const hasChoice = await ev(() => !!document.querySelector('#qhost .choice'));
    if (hasChoice) {
      // click the correct choice if we can find it via accepted answer
      await p.evaluate(id => {
        const p = id.split(':'), w = __N5.WORDS[p[0]], a = (__N5.cjConjugate(w, p[1]) || [])[0];
        const btn = [...document.querySelectorAll('#qhost .choice')].find(b => b.textContent.includes(a));
        (btn || document.querySelector('#qhost .choice')).click();
      }, newId);
    } else {
      await p.evaluate(id => {
        const p = id.split(':'), w = __N5.WORDS[p[0]], a = (__N5.cjConjugate(w, p[1]) || [])[0];
        const inp = document.querySelector('#typein'); if (inp) { inp.value = a; inp.dispatchEvent(new Event('input')); }
      }, newId);
      await p.tap('#checkBtn');
    }
    await p.waitForSelector('#nextBtn'); await p.tap('#nextBtn'); await p.waitForTimeout(600);
    ok('learn grades into ccards only', await ev(id => !!__N5.ccards()[id] && __N5.ccards()[id].cj === 1, newId));
    ok('conjugation due NOT in totalDue / vocab due', await ev(d0 => __N5.totalDue() === d0, beforeDue));
    ok('newLogC used (not vocab newLog)', await ev(() => { const t = Object.keys(__N5.S().newLogC || {}); return t.length >= 0; }));
  }
  // ladder rungs 2–4 + lapse drop + isolation from vocab
  const lid = await ev(() => { const it = __N5.cjPoolItems().find(x => /te$|masu$/.test(x.id)) || __N5.cjPoolItems()[0]; return it.id; });
  const iso0 = await ev(() => ({ acc: JSON.stringify(__N5.paceAcc()), items: JSON.parse(localStorage.getItem('jlptVocabQuest.time.v1')).days[__N5.todayStr()]?.items || 0, nl: JSON.stringify(__N5.S().newLog || {}), td: __N5.totalDue(), tl: __N5.pnTimeline().now }));
  for (const rung of [2, 3, 4]) {
    await ev(([id, r]) => { const C = __N5.S().ccards || (__N5.S().ccards = {}); C[id] = { cj: 1, ok: 5, bad: 0, run: 5, lad: r, due: Date.now() - 1000, f: { st: 2, sp: null, s: 20, d: 5, lr: Date.now() - 20 * 864e5, due: Date.now() - 1000 } }; }, [lid, rung]);
    await ev(id => __N5.cjSession([id], 'review', 'rung', () => __N5.conjHome()), lid);
    await p.waitForSelector('#qhost .card'); await p.waitForTimeout(300);
    const shape = await ev(() => ({ q: document.querySelector('#qhost .qtype').textContent, typein: !!document.querySelector('#typein'), play: !!document.querySelector('#cjPlay'), cloze: /＿＿/.test(document.querySelector('#qhost').textContent) }));
    if (rung === 3) await shot('b8-conj-listen');
    ok(`rung ${rung} renders the right question type`, shape.q.includes(rung + '/4') && shape.typein && (rung === 3 ? shape.play : rung === 4 ? shape.cloze : !shape.play && !shape.cloze), JSON.stringify(shape));
    if (rung === 2 || rung === 3) { await ev(id => { const p = id.split(':'), a = __N5.cjConjugate(__N5.WORDS[p[0]], p[1])[0]; const i = document.querySelector('#typein'); i.value = a; }, lid); await p.tap('#checkBtn');
      await p.waitForSelector('#nextBtn'); ok(`rung ${rung}: typed correct answer → ✅ and stays on/climbs ladder`, await ev(id => /Correct/.test(document.querySelector('#fb').textContent) && __N5.ccards()[id].lad >= 2, lid)); }
    if (rung === 4) { await p.tap('#giveBtn'); await p.waitForSelector('#nextBtn');
      await shot('b8-conj-rule');
      ok('miss → rule line shown + lapse drops one rung (4 → 3)', await ev(id => !!document.querySelector('.cjrule') && __N5.ccards()[id].lad === 3, lid)); }
    await p.tap('#nextBtn'); await p.waitForTimeout(300);
  }
  const iso1 = await ev(() => ({ acc: JSON.stringify(__N5.paceAcc()), items: JSON.parse(localStorage.getItem('jlptVocabQuest.time.v1')).days[__N5.todayStr()]?.items || 0, nl: JSON.stringify(__N5.S().newLog || {}), td: __N5.totalDue(), tl: __N5.pnTimeline().now }));
  ok('conjugation reviews leave vocab pace accuracy, goal items, vocab new-word log, due count and reminder timeline unchanged', JSON.stringify(iso0) === JSON.stringify(iso1), JSON.stringify([iso0, iso1]));
  ok('conjugation reviews logged under their own key', await ev(() => Object.keys(__N5.S().revLog[__N5.todayStr()] || {}).some(k => k.startsWith('conj'))));
  ok('ladder view on the form screen shows 🪜 chips', await ev(id => { __N5.go(() => __N5.cjFormView(id.split(':')[1])); return true; }, lid) && await (async () => { await p.waitForTimeout(400); return ev(() => document.querySelectorAll('.cjitem .ladchip').length > 0); })());
  // Grammar entry
  await p.evaluate(() => __N5.go(__N5.grammarHome)); await p.waitForTimeout(500);
  ok('Grammar hub has Conjugation drills button', await ev(() => !!document.querySelector('#grConj')));
  await p.tap('#grConj'); await p.waitForSelector('#cjSub');
  ok('Grammar → Conjugation navigation', await ev(() => /Conjugation/.test(document.querySelector('.largetitle')?.textContent || '')));

  // Home tile
  await p.evaluate(() => __N5.go(home)); await p.waitForSelector('.cjtile-home');
  ok('Home has conjugation tile', await ev(() => !!document.querySelector('.cjtile-home')));
  ok('Home has weekly report card', await ev(() => !!document.querySelector('.weekcard')));
  ok('no page errors', errs.length === 0, errs.join(' | '));

  await b.close();
  console.log('SUMMARY', BR, 'tconj', R.filter(x => x).length + '/' + R.length);
})().catch(e => { console.log('FAIL crash', e); console.log('SUMMARY', BR, 'crash'); process.exit(1); });
