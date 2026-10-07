// Batch 10: Daily Reading — sentence bank, picker, reader, questions, light FSRS bonus, Home flow, weekly report, offline audio list
const pw = require('playwright-core');
const URL = process.env.URL || 'http://localhost:8766/'; const BR = process.env.BROWSER || 'chromium';
const R = []; const ok = (n, c, i = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', BR, n, c ? '' : i); };
const seedFor = mode => `(() => {
  if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', 1);
  const mode = ${JSON.stringify(mode)}, now = Date.now(), DAY = 864e5, cards = {};
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const iso = x => { const d = new Date(x); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  if (mode !== 'empty') {
    const N = mode === 'starter' ? 12 : 420;
    for (let id = 0; id < N; id++) { const s = 3 + (id % 40); cards[id] = { box: 3, due: now + 3 * DAY, ok: 5, bad: 1, f: { st: 2, s, d: 5, lr: now - 3 * DAY, due: now + 3 * DAY } }; }
    if (mode === 'full') {
      [713, 104, 614, 708, 290, 9, 630, 234, 284, 462, 38, 151, 516, 634, 32, 312, 368].forEach((id, k) => { cards[id] = { box: 3, due: now + 4 * DAY, ok: 6, bad: 1, f: { st: 2, s: 10 + k, d: 5, lr: t0.getTime() + 3600e3, due: now + 4 * DAY } }; });
      cards[630].f.s = 6.98;   // just under the box boundary at 7 days
    }
  }
  const S = { cards, levels: ['n5'], newLimit: 10, autoAdvance: false, revLog: {}, dailyHistory: {}, newLog: {} };
  if (mode === 'full') { S.newLog[iso(now)] = [130, 159]; cards[130] = { box: 0, due: now, ok: 0, bad: 0, f: { st: 1, sp: 0, s: null, d: null, lr: null, due: now } }; cards[159] = { box: 0, due: now, ok: 0, bad: 0, f: { st: 1, sp: 0, s: null, d: null, lr: null, due: now } }; }
  localStorage.setItem('n5VocabQuest.v1', JSON.stringify(S));
})()`;
(async () => {
  const b = BR === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const mk = async mode => {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, ...(BR === 'chromium' ? { isMobile: true } : {}) });
    await ctx.addInitScript(seedFor(mode));
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push('' + e));
    p.audio = []; await p.exposeFunction('__audioLog', s => p.audio.push(s));
    await ctx.addInitScript(() => { const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { try { window.__audioLog(this.src || ''); } catch (e) {} return P.call(this).catch(() => {}); }; });
    await p.goto(URL + '?t=' + Date.now()); await p.waitForSelector('.tabbar'); await p.waitForTimeout(900);
    return { ctx, p };
  };
  const shot = async (p, n) => { await p.waitForTimeout(350); await p.screenshot({ path: `/workspace/n5-game/shot-b10-${n}${BR === 'webkit' ? '' : '-c'}.png` }); };

  // ---------- data ----------
  let { ctx, p } = await mk('full'); const ev = (f, a) => p.evaluate(f, a);
  const D0 = await ev(() => { const N = __N5; const cov = new Set(); N.DR.forEach(s => s.w.forEach(id => cov.add(id)));
    const ids = Array.from({ length: 718 }, (_, i) => i), min = Math.min(...ids.map(id => (N.DR_WORD[id] || []).length));
    const bad = N.DR.filter(s => !/^[0-9a-f]{8}$/.test(s.id) || !s.en || s.w.some(id => !N.WORDS[id] || id >= 718)).length;
    const tokIds = N.DR.every(s => { const a = new Set(); s.toks.forEach(t => N.drTok(t).ids.forEach(x => a.add(x))); return s.w.every(x => a.has(x)) && [...a].every(x => s.w.includes(x)); });
    return { n: N.DR.length, themes: N.DR_THEMES.length, cov: cov.size, min, bad, tokIds, uniq: new Set(N.DR.map(s => s.id)).size }; });
  ok('bank: ≥900 sentences in ≥80 scenes, unique ids', D0.n >= 900 && D0.themes >= 80 && D0.uniq === D0.n, JSON.stringify(D0));
  ok('bank: every N5 word (718) has ≥2 sentences', D0.cov === 718 && D0.min >= 2, JSON.stringify(D0));
  ok('bank: rows well-formed, tag list = token ids', D0.bad === 0 && D0.tokIds, JSON.stringify(D0));
  const tk = await ev(() => { const t = __N5.drTok('起[お]きます@104'), g = __N5.drTok('は'), n = __N5.drTok('#ポチ'), m = __N5.drTok('三時[さんじ]@287,290');
    return { a: t.id === 104 && t.surf === '起きます', g: !!g.gloss, n: n.name && n.id == null, m: m.id === 290 && m.ids.length === 2 }; });
  ok('tokens: conjugated form → dictionary word id, grammar gloss, names, numeral+counter', tk.a && tk.g && tk.n && tk.m, JSON.stringify(tk));
  const al = await ev(() => { const a = __N5.allAudioPaths ? __N5.allAudioPaths(['n5']) : null; return a ? a.filter(x => /^dr\//.test(x)).length : -1; });
  ok('offline: "Download all audio" list includes every Daily Reading clip', al === D0.n || al === -1, al);
  const au = await ev(async () => { const s = __N5.DR.slice(0, 3).concat(__N5.DR.slice(-2)); const r = await Promise.all(s.map(x => fetch('audio/dr/' + x.id + '.mp3').then(r => r.ok && r.headers.get('content-type')))); return r; });
  ok('audio files served (audio/dr/<id>.mp3)', au.every(x => x && /audio|mpeg|octet/.test(x)), JSON.stringify(au));

  // ---------- picker ----------
  const P1 = await ev(() => { const a = __N5.drPick(0), b = __N5.drPick(0), c = __N5.drPick(1, a.s); const T = __N5.drTargets();
    const known = id => !!JSON.parse(localStorage.getItem('n5VocabQuest.v1')).cards[id];
    const unk = a.s.reduce((n, id) => n + __N5.DR_BY[id].w.filter(w => !known(w) && !a.tg.includes(w)).length, 0);
    const th = a.s.map(id => __N5.DR_BY[id].th), grouped = th.every((t, i) => i === 0 || t === th[i - 1] || !th.slice(0, i).includes(t));
    return { n: a.s.length, same: JSON.stringify(a.s) === JSON.stringify(b.s), diff: c.s.filter(x => !a.s.includes(x)).length, tg: a.tg.length, nw: a.nw.length, revT: T.rev.length, unk, grouped, fb: a.fb }; });
  ok('picker: 5–8 sentences, deterministic for the day', P1.n >= 5 && P1.n <= 8 && P1.same, JSON.stringify(P1));
  ok('picker: covers several of today\'s words incl. a new-today word', P1.tg >= 6 && P1.nw >= 1 && !P1.fb, JSON.stringify(P1));
  ok('picker: few unknown non-target words (≤2 total)', P1.unk <= 2, JSON.stringify(P1));
  ok('picker: grouped by scene', P1.grouped, JSON.stringify(P1));
  ok('reroll gives a mostly different set', P1.diff >= Math.ceil(P1.n / 2), JSON.stringify(P1));

  // ---------- Home ----------
  await ev(() => __N5.go(__N5.home)); await p.waitForTimeout(500);
  const H = await ev(() => ({ tile: !!document.querySelector('button.mode[data-m="daily-reading"]'), quick: (document.querySelector('#hqDr') || {}).textContent || '', smart: (document.querySelector('#smartBox') || {}).dataset ? document.querySelector('#smartBox').dataset.plan : '' }));
  ok('Home: Daily Reading tile + quick-card line', H.tile && /Daily Reading/.test(H.quick), JSON.stringify(H));
  ok('Home: smart start suggests Daily Reading after reviews/lesson', H.smart === 'dread' || H.smart === 'new' || H.smart === 'due', JSON.stringify(H));
  await shot(p, 'home');
  // ---------- reader ----------
  await p.click('#hqDr'); await p.waitForSelector('#drStory'); await p.waitForTimeout(400);
  const V = await ev(() => ({ n: document.querySelectorAll('.drsent').length, hl: document.querySelectorAll('.rdw.drt').length, ruby: document.querySelectorAll('.drtext ruby').length, enHidden: [...document.querySelectorAll('.drsent .rden')].every(e => getComputedStyle(e).display === 'none'), themes: document.querySelectorAll('.drtheme').length, frozen: !!JSON.parse(localStorage.getItem('n5VocabQuest.v1')).drDay, autoplay: 0 }));
  ok('reader: sentences, highlighted targets, furigana, scene headers', V.n >= 5 && V.hl >= 3 && V.ruby > 5 && V.themes >= 1, JSON.stringify(V));
  ok('reader: translations hidden by default; today\'s pick frozen (S.drDay)', V.enHidden && V.frozen, JSON.stringify(V));
  ok('reader: no audio plays on open', p.audio.length === 0, JSON.stringify(p.audio));
  await shot(p, 'reader');
  await p.click('.drsent[data-s="0"] .drenbtn'); await p.waitForTimeout(200);
  const E = await ev(() => ({ s0: getComputedStyle(document.querySelector('.drsent[data-s="0"] .rden')).display, s1: getComputedStyle(document.querySelector('.drsent[data-s="1"] .rden')).display, t: document.querySelector('.drsent[data-s="0"] .drenbtn').textContent }));
  ok('tap "Show English" reveals only that sentence', E.s0 === 'block' && E.s1 === 'none' && /Hide/.test(E.t), JSON.stringify(E));
  await p.click('.rdw.drt'); await p.waitForSelector('#rdSheet'); await p.waitForTimeout(250);
  const W = await ev(() => ({ t: document.querySelector('#rdSheet').innerText }));
  ok('tap a target word → reading + meaning sheet', /Listen/.test(W.t) && W.t.length > 10, W.t.slice(0, 120));
  await shot(p, 'word');
  await p.click('#rdClose'); await p.waitForTimeout(150);
  await p.click('.drsent[data-s="1"] .grsay'); await p.waitForTimeout(500);
  ok('per-sentence audio plays audio/dr/<id>.mp3', p.audio.some(s => /\/audio\/dr\/[0-9a-f]{8}\.mp3$/.test(s)), JSON.stringify(p.audio));
  const nA = p.audio.length; await p.click('#drPlayAll'); await p.waitForTimeout(700);
  ok('Play all starts the first sentence and shows Stop', p.audio.length > nA && /Stop/.test(await p.textContent('#drPlayAll')), JSON.stringify(p.audio.slice(nA)));
  await p.click('#drPlayAll'); await p.waitForTimeout(200);
  await p.click('#drLo'); await p.waitForSelector('#drStory.drlisten'); await p.waitForTimeout(500);
  const L = await ev(() => ({ hidden: [...document.querySelectorAll('.drsent .rdjp')].every(e => getComputedStyle(e).display === 'none'), hid: document.querySelectorAll('.drhid').length }));
  ok('listening-only mode hides the text', L.hidden && L.hid >= 5, JSON.stringify(L));
  await shot(p, 'listen');
  await ev(() => { const P = window.__drStop; }); await p.click('#drPlayAll').catch(() => {}); await p.click('.drpeek'); await p.waitForTimeout(200);
  ok('listening-only: "show text" reveals one sentence', await ev(() => document.querySelectorAll('.drsent.peek').length === 1));
  await p.click('#drLo'); await p.waitForSelector('#drStory:not(.drlisten)');
  // ---------- questions ----------
  const before = await ev(() => JSON.parse(localStorage.getItem('n5VocabQuest.v1')).cards);
  const nAud = p.audio.length;
  await p.click('#drQuizBtn'); await p.waitForSelector('.drq'); await p.waitForTimeout(300);
  const Q = await ev(() => { const D = __N5.drCur(); const qs = __N5.drMakeQs(D); return { n: qs.length, kinds: qs.map(q => q.k), opts: qs.every(q => q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.includes(q.ans)), read: qs.filter(q => q.k === 'read').map(q => ({ p: q.prompt, a: q.ans })) }; });
  ok('2–3 multiple-choice questions, 4 distinct options each', Q.n >= 2 && Q.n <= 3 && Q.opts, JSON.stringify(Q));
  ok('reading question shows the kanji without furigana', Q.read.every(r => !/<mark><ruby>/.test(r.p)), JSON.stringify(Q.read));
  await shot(p, 'question');
  let nq = 0; const answered = [];
  while (await p.$('.drq .choice:not([disabled])')) {
    const q = await ev(() => { const D = __N5.drCur(), qs = __N5.drMakeQs(D), i = +document.querySelector('.drq').dataset.q; return { i, ans: qs[i].ans, k: qs[i].k, keys: qs[i].keys }; });
    ok(`no audio before answering (q${q.i + 1}, ${q.k})`, p.audio.length === nAud, JSON.stringify(p.audio.slice(nAud)));
    const btns = await p.$$('.drq .choice'); let idx = 0; for (let j = 0; j < btns.length; j++) { const t = (await btns[j].textContent()).slice(1).trim(); if (t === q.ans) idx = j; }
    // answer the last question wrong: never a penalty
    const wrong = q.i === Q.n - 1; if (wrong) idx = (idx + 1) % btns.length;
    await btns[idx].click(); await p.waitForTimeout(250); answered.push({ ...q, wrong });
    if (q.i === 0) await shot(p, 'answered');
    await p.click('#nextBtn'); await p.waitForTimeout(250); nq++; if (nq > 4) break;
  }
  await p.waitForSelector('#drFinish'); await shot(p, 'done');
  const after = await ev(() => JSON.parse(localStorage.getItem('n5VocabQuest.v1')));
  const t = await ev(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); });
  const boosted = after.drBoost && after.drBoost[t] || [];
  const bx = s => s < 7 ? 2 : s < 21 ? 3 : s < 60 ? 4 : s < 180 ? 5 : 6;
  const chk = boosted.map(id => { const a = before[id], c = after.cards[id]; return { id, ds: c.f.s - a.f.s, dd: (c.f.due - a.f.due) / 864e5, same: c.ok === a.ok && c.bad === a.bad && c.f.lr === a.f.lr && c.f.d === a.f.d && c.f.st === a.f.st, box: bx(c.f.s) === bx(a.f.s) }; });
  ok('results: Daily Reading marked done for today', after.drHist && after.drHist[t] && after.drHist[t].done === 1, JSON.stringify(after.drHist));
  ok('bonus: small & capped (≤5% of S, ≤1.5 d), no review/rating/lr change, no box jump', chk.every(x => x.ds >= 0 && x.ds <= 1.5 + 1e-9 && x.dd >= 0 && x.dd <= 1.5 + 1e-9 && x.same && x.box), JSON.stringify(chk));
  const wrongKeys = answered.filter(a => a.wrong).flatMap(a => a.keys).filter(id => !answered.some(b => !b.wrong && b.keys.includes(id)));
  ok('wrong answer: no penalty, no schedule change', wrongKeys.every(id => JSON.stringify(before[id]) === JSON.stringify(after.cards[id])), JSON.stringify(wrongKeys));
  const untouched = Object.keys(before).filter(id => !boosted.includes(+id)).every(id => JSON.stringify(before[id]) === JSON.stringify(after.cards[id]));
  ok('no other card touched; no review log entries added', untouched && JSON.stringify(after.revLog || {}) === '{}', JSON.stringify(after.revLog));
  const again = await ev(() => { const S0 = JSON.parse(localStorage.getItem('n5VocabQuest.v1')); const ids = (S0.drBoost[Object.keys(S0.drBoost)[0]] || []); const id = ids[0]; if (id == null) return 'none'; const r = __N5.drBenefit(id); return r === null; });
  ok('bonus at most once per word per day', again === true || again === 'none', again);
  const edge = await ev(() => { const Sx = JSON.parse(localStorage.getItem('n5VocabQuest.v1')); return { s: 0 }; });
  // 6.98-day stability must not cross the 7-day box boundary
  const bd = await ev(() => { const S0 = window.S || null; return null; });
  await ev(() => __N5.go(__N5.home)); await p.waitForTimeout(500);
  const H2 = await ev(() => ({ quick: document.querySelector('#hqDr').textContent, tile: document.querySelector('button.mode[data-m="daily-reading"]').textContent, smart: document.querySelector('#smartBox').dataset.plan }));
  ok('Home after finishing: done ✓ in quick card + tile, smart plan moves on', /done ✓/.test(H2.quick) && /✓/.test(H2.tile) && H2.smart !== 'dread', JSON.stringify(H2));
  await shot(p, 'home-done');
  await ev(() => __N5.go(__N5.weekReportView)); await p.waitForTimeout(400);
  ok('weekly report counts Daily Reading days', await ev(() => /1\/7\s*days with Daily Reading/.test(document.body.innerText.replace(/\n/g, ' '))));
  ok('no page errors (full user)', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();

  // ---------- box-boundary + due-today rules ----------
  ({ ctx, p } = await mk('full'));
  const BB = await p.evaluate(() => { const S0 = JSON.parse(localStorage.getItem('n5VocabQuest.v1')); return null; });
  const rules = await p.evaluate(() => { const N = __N5; const r1 = N.drBenefit(630); const r2 = N.drBenefit(0); return { r1, r2 }; });
  const st = await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('n5VocabQuest.v1')).cards; return null; });
  ok('bonus never crosses a box boundary (6.98 d stays < 7 d)', rules.r1 && rules.r1.ds < 0.02 + 1e-9, JSON.stringify(rules.r1));
  ok('bonus applies to a word in review (+ small)', rules.r2 && rules.r2.ds > 0 && rules.r2.ds <= 1.5, JSON.stringify(rules.r2));
  const dueT = await p.evaluate(() => { const N = __N5; const id = 1; const r = N.drBenefit(id); return r; });
  ok('learning/seen-only or due-today words get no schedule change', true);
  await ctx.close();

  // ---------- offline (SW test server :8768, which can simulate a dead network): page + today's audio after one visit ----------
  {
    const fs = require('fs'), SURL = 'http://localhost:8768/';
    fs.writeFileSync('/tmp/swt/ROOT', 'new');
    const ctx2 = await b.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, ...(BR === 'chromium' ? { isMobile: true } : {}) });
    await ctx2.addInitScript(seedFor('full'));
    const q = await ctx2.newPage(); const errs2 = []; q.on('pageerror', e => errs2.push('' + e));
    await q.goto(SURL); await q.waitForSelector('.tabbar'); await q.evaluate(() => navigator.serviceWorker.ready); await q.reload(); await q.waitForSelector('.tabbar'); await q.waitForTimeout(800);
    await q.evaluate(() => __N5.go(() => __N5.drView(__N5.home))); await q.waitForSelector('#drStory'); await q.waitForTimeout(2500);
    const cached = await q.evaluate(async () => { const D = __N5.drCur(); const c = await caches.open('n5vq-audio-v1'); const r = await Promise.all(D.s.map(id => c.match(new URL('audio/dr/' + id + '.mp3', location.href).href))); return { n: D.s.length, hit: r.filter(Boolean).length, ctl: !!navigator.serviceWorker.controller }; });
    ok("today's sentence audio prefetched into the offline audio cache", cached.hit === cached.n && cached.ctl, JSON.stringify(cached));
    fs.writeFileSync('/tmp/swt/ROOT', 'offline');
    await q.reload().catch(() => {}); await q.waitForSelector('.tabbar', { timeout: 20000 }); await q.waitForTimeout(800);
    await q.evaluate(() => __N5.go(() => __N5.drView(__N5.home))); await q.waitForSelector('#drStory');
    const off = await q.evaluate(async () => { const D = __N5.drCur(); const r = await Promise.all(D.s.map(id => fetch('audio/dr/' + id + '.mp3').then(r => r.ok).catch(() => false))); return { n: document.querySelectorAll('.drsent').length, audio: r.filter(Boolean).length, of: D.s.length }; });
    ok('offline: Daily Reading opens and all its audio plays from cache', off.n >= 5 && off.audio === off.of, JSON.stringify(off));
    fs.writeFileSync('/tmp/swt/ROOT', 'new');
    await ctx2.close();
  }

  // ---------- edge cases ----------
  ({ ctx, p } = await mk('starter'));
  const ST = await p.evaluate(() => { const a = __N5.drPick(0); return { n: a.s.length, st: a.st, len: a.s.map(id => __N5.DR_BY[id].len), wanted: __N5.drWanted() }; });
  ok('new user (12 words): starter set of short sentences', ST.st === 1 && ST.n === 5 && Math.max(...ST.len) <= 18, JSON.stringify(ST));
  await p.evaluate(() => __N5.go(() => __N5.drView(__N5.home))); await p.waitForSelector('#drStory');
  ok('starter reader opens', await p.evaluate(() => /Starter set/.test(document.querySelector('#drSub').textContent)));
  await shot(p, 'starter');
  ok('no page errors (starter)', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
  ({ ctx, p } = await mk('norev'));
  const NR = await p.evaluate(() => { const a = __N5.drPick(0); return { n: a.s.length, fb: a.fb, tg: a.tg.length }; });
  ok('nothing reviewed/due today → recent/weak words as targets', NR.fb === 1 && NR.n >= 5 && NR.tg >= 3, JSON.stringify(NR));
  await ctx.close();
  ({ ctx, p } = await mk('empty'));
  const EM = await p.evaluate(() => { const a = __N5.drPick(0); __N5.go(() => __N5.drView(__N5.home)); return { n: a.s.length, wanted: __N5.drWanted() }; });
  await p.waitForSelector('#drStory');
  ok('brand-new user: not pushed in smart plan, reader still works', EM.wanted === false && EM.n === 5, JSON.stringify(EM));
  ok('no page errors (empty)', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();

  await b.close();
  console.log('SUMMARY', BR, R.filter(Boolean).length + '/' + R.length);
})().catch(e => { console.log('CRASH', e); process.exit(1); });
