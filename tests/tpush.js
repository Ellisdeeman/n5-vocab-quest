// Batch 7: review reminders — Settings card states (no push / iPhone not installed / no sync / ready / on), enable flow
// (permission from the tap, subscribe, public encrypted gist with the due timeline + device file, decryptable by the
// server key), settings → re-upload, test button, status line (last push, server check, gone → Re-enable, not registered),
// turn off (device file deleted), ?go=due deep link, SW push handler (notification text/tag/renotify/not silent) and SW
// message → Review all due. Mocks api.github.com / raw.githubusercontent.com. BROWSER=webkit|chromium SHOTS=1
const pw = require('playwright-core'), path = require('path');
const C = require(process.env.PUSHDIR || require('path').join(__dirname, '../push/crypt.js')), crypto = require('crypto');
const URL = process.env.URL || 'http://localhost:8766/'; const BR = process.env.BROWSER || 'chromium'; const SHOTS = process.env.SHOTS;
const R = []; const ok = (n, c, i = '') => { R.push(!!c); console.log(c ? 'PASS' : 'FAIL', BR, n, c ? '' : i); };
const K = C.genKey(), sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 20);
const seed = (o) => { if (localStorage.getItem('seeded')) return; localStorage.setItem('seeded', 1);
  const now = Date.now(), cards = {}; for (let i = 0; i < 14; i++) cards[i] = { box: 2, due: now - 3600e3, ok: 2, bad: 0, f: { st: 2, s: 3, d: 5, lr: now - 864e5, due: now - 3600e3 } };
  for (let i = 14; i < 20; i++) cards[i] = { box: 2, due: now + i * 3600e3, ok: 2, bad: 0, f: { st: 2, s: 3, d: 5, lr: now - 864e5, due: now + i * 3600e3 } };
  localStorage.setItem('n5VocabQuest.v1', JSON.stringify({ cards, levels: ['n5'], newLimit: 10, autoAdvance: false }));
  if (o.token) localStorage.setItem('jlptVocabQuest.sync.v1', JSON.stringify({ token: 'ghp_testtoken123456', gistId: '', lastSync: Date.now(), lastTry: Date.now() })); };
(async () => {
  const b = BR === 'webkit' ? await pw.webkit.launch() : await pw.chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const shot = async (p, n) => { if (SHOTS) { await p.waitForTimeout(600); await p.screenshot({ path: '/workspace/n5-game/shot-' + n + '.png' }); } };
  const mk = async (o = {}) => {
    const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, hasTouch: true, timezoneId: 'America/New_York', serviceWorkers: o.sw ? 'allow' : 'block', ...(o.ua ? { userAgent: o.ua } : {}), ...(BR === 'chromium' ? { isMobile: true } : {}), colorScheme: o.dark ? 'dark' : 'light' });
    await ctx.addInitScript(seed, o); if (process.env.DBG) await ctx.addInitScript({ path: '/tmp/dbg.js' });
    if (o.fakePush) await ctx.addInitScript(() => {   // deterministic PushManager / Notification for the enable flow
      window.__subs = 0; window.__unsubs = 0; window.__perm = 'default'; window.__permAsk = 0;
      const sub = { endpoint: 'https://web.push.apple.com/TEST-endpoint', options: {}, toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'BPtest', auth: 'authtest' } }; }, unsubscribe: async () => { window.__unsubs++; window.__hasSub = false; return true; } };
      if (!window.PushManager) window.PushManager = function () {};
      if (!window.Notification) window.Notification = function () {};
      Object.defineProperty(Notification, 'permission', { get: () => window.__perm, configurable: true });
      Notification.requestPermission = async () => { window.__permAsk++; window.__perm = window.__permAnswer || 'granted'; return window.__perm; };
      const pm = { subscribe: async o => { window.__subs++; window.__subKey = o.applicationServerKey.length; window.__hasSub = true; return sub; }, getSubscription: async () => window.__hasSub ? sub : null };
      const reg = { pushManager: pm, showNotification: async () => {} };
      Object.defineProperty(navigator, 'serviceWorker', { value: Object.assign(new EventTarget(), { ready: Promise.resolve(reg), register: async () => reg, getRegistration: async () => reg }), configurable: true });
    });
    const p = await ctx.newPage(); p.setDefaultTimeout(15000); const errs = []; p.on('pageerror', e => errs.push('' + e)); if (process.env.DBG) p.on('console', m => /POSTSTACK/.test(m.text()) && console.log(m.text().slice(0, 600)));
    const api = { sync: 0, posts: [], patches: [], state: o.state || { v: 1, dev: {} }, users: o.users || null };
    await p.route('https://api.github.com/**', async r => {
      const u = r.request().url(), m = r.request().method(); if (process.env.DBG) console.log('API', m, u.slice(22, 90), Date.now() % 100000);
      if (/\/gists\?per_page/.test(u)) return r.fulfill({ json: [] });
      if (m === 'POST' && /\/gists$/.test(u)) { const j = JSON.parse(r.request().postData());   // the app's regular (secret) sync gist is separate
        if (j.description !== 'JLPT Quest review reminders (encrypted)') { api.sync++; return r.fulfill({ status: 201, json: { id: 'gSYNC', owner: { login: 'Ellisdeeman' }, files: {} } }); }
        api.posts.push(j); return r.fulfill({ status: 201, json: { id: 'gTEST1', owner: { login: 'Ellisdeeman' }, files: {} } }); }
      if (/\/gists\/gSYNC/.test(u)) return r.fulfill({ json: { id: 'gSYNC', files: {} } });
      if (m === 'PATCH' && /\/gists\/gTEST1$/.test(u)) { api.patches.push(JSON.parse(r.request().postData())); return r.fulfill({ json: { id: 'gTEST1' } }); }
      if (/actions\/workflows\/push\.yml\/runs/.test(u)) return r.fulfill({ json: { workflow_runs: [{ run_started_at: new Date(Date.now() - 4 * 60e3).toISOString() }] } });
      return r.fulfill({ status: 404, json: {} });
    });
    await p.route('https://raw.githubusercontent.com/**', r => r.fulfill({ json: api.state }));
    if (api.users) await p.route('**/push/users.json', r => r.fulfill({ json: { users: api.users } }));
    await p.goto(URL + (o.q || '') + (o.q ? '&' : '?') + 't=' + Date.now()); await p.waitForSelector('.tabbar'); await p.waitForTimeout(700);
    if (o.fakePush) await p.evaluate(k => __N5.pnSetDataPub(k), K.pub);
    return { ctx, p, errs, api, ev: (f, a) => p.evaluate(f, a) };
  };
  const settings = async T => { await T.ev(() => { __N5.settingsView(); }); await T.p.waitForSelector('#pnSec'); await T.ev(() => document.querySelector('#pnSec').scrollIntoView({ block: 'start' })); await T.p.waitForTimeout(300); };
  // ---- 1. no sync token → guide to Gist sync
  { const T = await mk({ fakePush: true }); await settings(T);
    ok('no Gist sync: card explains to enable sync first', await T.ev(() => /turn on Gist sync first/.test(document.querySelector('#pnNeedSync').textContent)));
    await shot(T.p, 'push-needsync'); await T.p.tap('#pnToSync'); await T.p.waitForTimeout(600);
    ok('"Set up Gist sync" jumps to the token field', await T.ev(() => document.activeElement && document.activeElement.id === 'tokIn'));
    ok('no page errors (no sync)', T.errs.length === 0, T.errs.join(' | ')); await T.ctx.close(); }
  // ---- 2. iPhone in Safari (not installed): Add to Home Screen steps
  if (BR === 'webkit') { const T = await mk({ ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1', token: true }); await settings(T);
    ok('iPhone Safari tab: explains Add to Home Screen (iOS 16.4+)', await T.ev(() => { const e = document.querySelector('#pnInstall'); return !!e && /Add to Home Screen/.test(e.textContent) && /16\.4/.test(e.textContent); }));
    await shot(T.p, 'push-install'); await T.ctx.close();
    const T2 = await mk({ token: true }); await settings(T2);
    ok('browser without Web Push: plain message, nothing breaks', await T2.ev(() => !!document.querySelector('#pnNoPush')) && T2.errs.length === 0, T2.errs.join('|')); await T2.ctx.close(); }
  // ---- 3. enable flow
  { const T = await mk({ fakePush: true, token: true, users: ['Ellisdeeman'] }); await settings(T);
    ok('ready: Enable button + explanation (10+ reviews, hourly)', await T.ev(() => !!document.querySelector('#pnOnBtn') && /10\+ reviews/.test(document.querySelector('#pnSec').textContent)));
    await shot(T.p, 'push-enable');
    await T.p.tap('#pnOnBtn'); await T.p.waitForSelector('#pnStatus'); await T.p.waitForTimeout(800);
    ok('permission asked from the tap, then subscribed with the VAPID key (65 bytes)', await T.ev(() => window.__permAsk === 1 && window.__subs === 1 && window.__subKey === 65));
    const post = T.api.posts[0];
    ok('creates ONE public gist with the encrypted due timeline', T.api.posts.length === 1 && post.public === true && post.description === 'JLPT Quest review reminders (encrypted)' && !!post.files['n5vq-due.json'], JSON.stringify([T.api.posts.length, post.public, post.description, post && Object.keys(post.files)]));
    const tl = C.decrypt(JSON.parse(post.files['n5vq-due.json'].content), K.priv);
    const td = await T.ev(() => __N5.totalDue());
    ok('timeline decrypts with the server key; due now = Home due count (14), 6 more within 7 days', tl.now === td && td === 14 && tl.add.length === 6, JSON.stringify({ now: tl.now, td, add: tl.add.length }));
    ok('timeline file is not readable as plain JSON (no endpoint / counts in clear)', !/push\.apple|"now"/.test(post.files['n5vq-due.json'].content));
    const P1 = T.api.patches[0], dev = await T.ev(() => __N5.PN.dev), df = 'n5vq-push-' + dev + '.json';
    const d = C.decrypt(JSON.parse(P1.files[df].content), K.priv);
    ok('device file: subscription + defaults (10 due, every 1 h, evening 19:00, quiet 23:00–08:00, New York tz)', d.sub.endpoint === 'https://web.push.apple.com/TEST-endpoint' && d.cfg.thr === 10 && d.cfg.rep === 60 && d.cfg.nudge === true && d.cfg.nudgeAt === '19:00' && d.cfg.qs === '23:00' && d.cfg.qe === '08:00' && d.cfg.tz === 'America/New_York', JSON.stringify(d.cfg));
    ok('token never written into the gist', !JSON.stringify(T.api.posts.concat(T.api.patches)).includes('ghp_testtoken'));
    ok('status: last server check shown', await T.ev(() => /Last server check: 4 min ago/.test(document.querySelector('#pnStatus').textContent)));
    await shot(T.p, 'push-on');
    // settings changes → re-upload
    const n0 = T.api.patches.length;
    await T.p.tap('#pnThrUp'); await T.p.tap('#pnRep button[data-v="120"]'); await T.p.tap('#pnQuiet'); await T.p.tap('#pnNudge');
    await T.p.waitForTimeout(1800);
    const P2 = T.api.patches[T.api.patches.length - 1], d2 = C.decrypt(JSON.parse(P2.files[df].content), K.priv);
    ok('settings change → one debounced re-upload (11 due, every 2 h, quiet off, evening off)', T.api.patches.length === n0 + 1 && d2.cfg.thr === 11 && d2.cfg.rep === 120 && d2.cfg.qs === '00:00' && d2.cfg.qe === '00:00' && d2.cfg.nudge === false, JSON.stringify(d2.cfg));
    ok('repeat options: 30 min / 1 h / 2 h / 3 h / Once', await T.ev(() => [...document.querySelectorAll('#pnRep button')].map(x => x.textContent).join('|') === '30 min|1 h|2 h|3 h|Once'));
    ok('help explains sound setting + delays + privacy', await T.ev(() => { const t = document.querySelector('.pnhelp').textContent; return /Settings → Notifications → JLPT Quest → Sounds/.test(t) && /10 minutes/.test(t) && /encrypted/.test(t); }));
    // test button
    await T.p.tap('#pnTestBtn'); await T.p.waitForTimeout(900);
    const d3 = C.decrypt(JSON.parse(T.api.patches[T.api.patches.length - 1].files[df].content), K.priv);
    ok('Send test → device file carries a fresh test nonce; toast says it arrives with the next check', d3.test > 0 && await T.ev(() => /next server check/.test((document.querySelector('.toast') || document.body).textContent)));
    // status from push-state
    const key = sha('Ellisdeeman:' + dev);
    T.api.state = { v: 1, dev: { [key]: { lastAt: Date.now() - 20 * 60e3, lastKind: 'repeat', lastN: 12, ep: sha('https://web.push.apple.com/TEST-endpoint') } } };
    await T.ev(() => __N5.pnRender()); await T.p.waitForTimeout(800);
    ok('status line: last push 20 min ago (reminder, 12 due)', await T.ev(() => /Last push: 20 min ago \(reminder, 12 due\)/.test(document.querySelector('#pnStatus').textContent)));
    T.api.state.dev[key].gone = sha('https://web.push.apple.com/TEST-endpoint');
    await T.ev(() => __N5.pnRender()); await T.p.waitForTimeout(800);
    ok('expired subscription (410) → warning + Re-enable button', await T.ev(() => /stopped accepting/.test(document.querySelector('#pnStatus').textContent) && !document.querySelector('#pnReBtn').hidden));
    await shot(T.p, 'push-gone');
    // turn off
    await T.p.tap('#pnOffBtn'); await T.p.waitForSelector('#pnOnBtn');
    const Pl = T.api.patches[T.api.patches.length - 1];
    ok('Turn off: unsubscribes and deletes this device file from the gist', await T.ev(() => window.__unsubs === 1 && !__N5.PN.on) && Pl.files[df] === null, JSON.stringify(Object.keys(Pl.files)));
    ok('no page errors (enable flow)', T.errs.length === 0, T.errs.join(' | ')); await T.ctx.close(); }
  // ---- 4. friend not in users.json; permission denied
  { const T = await mk({ fakePush: true, token: true, users: ['someoneelse'] }); await settings(T);
    await T.ev(() => { window.__permAnswer = 'denied'; }); await T.p.tap('#pnOnBtn'); await T.p.waitForTimeout(500);
    ok('permission denied → explains where to allow it', await T.ev(() => /Settings → Notifications → JLPT Quest/.test((document.querySelector('#pnDenied') || {}).textContent || '')) && T.api.posts.length === 0);
    await T.ev(() => { window.__perm = 'granted'; }); await T.ev(() => __N5.pnRender()); await T.p.tap('#pnOnBtn'); await T.p.waitForSelector('#pnStatus'); await T.p.waitForTimeout(900);
    ok('user not registered on the server → asks to add the GitHub username', await T.ev(() => /ask Ellis to add your GitHub username Ellisdeeman/.test(document.querySelector('#pnStatus').textContent)));
    await T.ctx.close(); }
  // ---- 5. ?go=due deep link (notification tap on a closed app)
  { const T = await mk({ q: '?go=due' }); await T.p.waitForTimeout(1500);
    ok('?go=due opens Review all due and cleans the URL', await T.ev(() => !!document.querySelector('#qhost') && !/go=due/.test(location.search)));
    await T.ctx.close(); }
  { const T = await mk({}); await T.ev(() => navigator.serviceWorker && navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { go: 'due' } }))); await T.p.waitForTimeout(1200);
    ok('SW message {go:"due"} (tap while the app is open) → Review all due', BR === 'webkit' && !(await T.ev(() => !!navigator.serviceWorker)) ? true : await T.ev(() => !!document.querySelector('#qhost')));
    await T.ctx.close(); }
  // ---- 6. service worker push handler (Chromium: CDP delivers a real push event)
  if (BR === 'chromium') {
    const T = await mk({ sw: true }); await T.ctx.grantPermissions(['notifications'], { origin: new globalThis.URL(URL).origin });
    await T.ev(async () => { await navigator.serviceWorker.register('sw.js'); await navigator.serviceWorker.ready; });
    const cdp = await T.ctx.newCDPSession(T.p); let regId = null;
    cdp.on('ServiceWorker.workerRegistrationUpdated', e => { for (const r of e.registrations) if (!r.isDeleted) regId = r.registrationId; });
    await cdp.send('ServiceWorker.enable'); for (let i = 0; i < 20 && !regId; i++) await T.p.waitForTimeout(150);
    await cdp.send('ServiceWorker.deliverPushMessage', { origin: new globalThis.URL(URL).origin, registrationId: regId, data: JSON.stringify({ title: 'JLPT Quest', body: '24 reviews due — keep your streak going', n: 24, kind: 'repeat', tag: 'n5vq-due', url: './?go=due' }) });
    let ns = []; for (let i = 0; i < 20 && !ns.length; i++) { await T.p.waitForTimeout(200); ns = await T.ev(async () => (await (await navigator.serviceWorker.ready).getNotifications()).map(n => ({ t: n.title, b: n.body, tag: n.tag, re: n.renotify, si: n.silent, icon: n.icon, url: n.data && n.data.url }))); }
    const n = ns[0] || {};
    ok('push → notification "24 reviews due — keep your streak going" with app icon', n.t === 'JLPT Quest' && n.b === '24 reviews due — keep your streak going' && /icons\/icon-192\.png$/.test(n.icon || ''), JSON.stringify(ns));
    ok('same tag + renotify:true + not silent (hourly repeats alert with sound)', n.tag === 'n5vq-due' && n.re === true && n.si === false, JSON.stringify(n));
    ok('notification opens Review all due (data.url ?go=due)', n.url === './?go=due');
    await T.ctx.close();
  }
  await b.close(); console.log('SUMMARY', BR, 'tpush', R.filter(x => x).length + '/' + R.length);
})().catch(e => { console.log('FAIL crash', e); console.log('SUMMARY', BR, 'crash'); process.exit(1); });
