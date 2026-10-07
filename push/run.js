/* Scheduled review-reminder sender (GitHub Actions, see .github/workflows/push.yml).
   node push/run.js <state.json>
   env: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, PUSH_DATA_KEY (secrets) · (no token needed: public gists are read anonymously) ·
        TEST_SUB (optional PushSubscription JSON: send one test push to it and exit) · DRY=1 (decide, don't send)
   For every GitHub user in push/users.json: find their public "JLPT Quest review reminders" gist (created by the app with
   the user's own gist-sync token), decrypt the due timeline + each device file, decide (decide.js) and send Web Push.
   Per-device state (last reminder times; no personal data, keys are hashes) is written back to <state.json>, which the
   workflow commits to the push-state branch. */
const fs = require("fs"), crypto = require("crypto"), path = require("path");
const webpush = require("web-push");
const { decide, countAt, local } = require("./decide.js");
const DUO = require("./duo.js");
const { decrypt } = require("./crypt.js");
const E = process.env, NOW = +E.NOW || Date.now(), STALE = 21 * 864e5;
const TL_FILE = "n5vq-due.json", DEV_RE = /^n5vq-push-([A-Za-z0-9_-]{6,40})\.json$/;
const APP_URL = "https://ellisdeeman.github.io/n5-vocab-quest/";
const h = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 20);
const log = (...a) => console.log(...a);
async function gh(url) {   // gists are read WITHOUT a token: the Actions GITHUB_TOKEN can't use the gists API (403)
  const api = !url.startsWith("http");
  const r = await fetch(api ? (E.GH_API || "https://api.github.com") + url : url, { headers: api ? { Accept: "application/vnd.github+json", "User-Agent": "n5vq-push" } : { "User-Agent": "n5vq-push" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
}
const RAW = E.GH_RAW || "https://gist.githubusercontent.com";
async function send(sub, payload) {
  if (E.DRY) { log("DRY send", payload.kind, payload.n, "|", payload.body); return { statusCode: 0, dry: true }; }
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 4 * 3600, urgency: "high", vapidDetails: { subject: E.VAPID_SUBJECT || APP_URL, publicKey: E.VAPID_PUBLIC, privateKey: E.VAPID_PRIVATE } });
}
const payloadOf = (s, extra = {}) => Object.assign({ title: s.title, body: s.body, n: s.n, kind: s.kind, tag: "n5vq-due", url: "./?go=due", t: NOW }, extra);
async function main() {
  if (E.TEST_SUB && E.TEST_SUB.trim()) {   // workflow_dispatch smoke test against a given subscription
    const sub = JSON.parse(E.TEST_SUB);
    const r = await send(sub, payloadOf({ title: "JLPT Quest", body: "Test notification ✓ — the reminder server can reach this device", n: 0, kind: "test" }));
    log("test push → HTTP", r.statusCode, "endpoint host", new URL(sub.endpoint).host); return;
  }
  const stFile = process.argv[2] || "state.json", duoFile = process.argv[3] || "duo.json";
  let DJ = { v: 1, s: {} }; try { DJ = Object.assign(DJ, JSON.parse(fs.readFileSync(duoFile, "utf8"))); } catch (e) {}
  DJ.s = DJ.s || {}; const duoBefore = JSON.stringify(DJ.s);
  let S = { v: 1, dev: {}, g: {} }; try { S = Object.assign(S, JSON.parse(fs.readFileSync(stFile, "utf8"))); } catch (e) {}
  S.g = S.g || {}; S.duo = S.duo || {};
  const snap = () => JSON.stringify([S.dev, S.g, S.duo]), before = snap();
  const users = E.USERS ? E.USERS.split(",") : JSON.parse(fs.readFileSync(path.join(__dirname, "users.json"), "utf8")).users || [];
  const sum = { users: users.length, gists: 0, devices: 0, sent: 0, gone: 0, errors: 0, duo: 0 };
  for (const u of users) {
    // find the user's reminders gist (unauthenticated list, 60/h per runner IP); if that fails (rate limit), use the
    // gist id + file names remembered from the last good listing and read the files from the raw host (no API quota)
    const lk = u.toLowerCase(); let g = null;
    try {
      const gists = await (await gh(`/users/${encodeURIComponent(u)}/gists?per_page=100`)).json();
      const hit = gists.filter(x => x.files && Object.keys(x.files).some(f => f === TL_FILE || DEV_RE.test(f))).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
      if (hit) { g = { id: hit.id, owner: (hit.owner && hit.owner.login) || u, files: Object.keys(hit.files).filter(f => f === TL_FILE || DEV_RE.test(f)).sort() }; S.g[lk] = g; }
      else delete S.g[lk];
    } catch (e) { log("list", u, e.message, S.g[lk] ? "→ using remembered gist" : ""); sum.errors++; g = S.g[lk] || null; }
    if (!g) continue; sum.gists++;
    const owner = g.owner;
    const read = async f => decrypt(JSON.parse(await (await gh(`${RAW}/${encodeURIComponent(owner)}/${g.id}/raw/${encodeURIComponent(f)}?t=${NOW}`)).text()), E.PUSH_DATA_KEY);
    let tl = null; if (g.files.includes(TL_FILE)) try { tl = await read(TL_FILE); } catch (e) { log("timeline", owner, e.message); sum.errors++; }
    // Duolingo "done today" (B13): only when the user entered a username in the app (inside the encrypted timeline)
    let duoDone = null;
    if (tl && tl.duo && DUO.validUser(tl.duo.u) && DUO.validKey(tl.duo.k)) {
      const id = DUO.duoId(tl.duo.k), day = local(NOW, tl.duo.tz || "UTC").day, prev = S.duo[id];
      if (DUO.shouldFetch(prev, NOW, day)) {
        const r = await DUO.fetchDuo(tl.duo.u); sum.duo++;
        if (r.err) log("duolingo", r.err);
        const st = Object.assign({ at: NOW }, r);
        DJ.s[id] = DUO.seal(st, tl.duo.k);
        S.duo[id] = { at: NOW, d: r.ok && r.end === day ? day : (prev && prev.d === day ? day : "") };
        if (r.err && prev && prev.d === day) S.duo[id].d = day;
      }
      duoDone = S.duo[id] ? S.duo[id].d === day : null;
    }
    for (const f of g.files) {
      const m = DEV_RE.exec(f); if (!m) continue;
      let d; try { d = await read(f); } catch (e) { log("device file", e.message); sum.errors++; continue; }
      if (!d || d.on === false || !d.sub || !d.sub.endpoint) continue;
      sum.devices++;
      const key = h(owner + ":" + m[1]), ep = h(d.sub.endpoint), st0 = S.dev[key] || {};
      if (st0.gone && st0.gone !== ep) delete st0.gone;      // re-enabled with a new subscription
      if (st0.gone) continue;
      const T = d.tl && (!tl || (d.tl.upd || 0) > (tl.upd || 0)) ? d.tl : tl;
      const n = T ? countAt(T, NOW) : 0;
      let out = null, st = Object.assign({}, st0);
      if (d.test && d.test !== st.test) { st.test = d.test; out = { kind: "test", n, title: "JLPT Quest", body: `Test notification ✓ — reminders are working (${n} review${n === 1 ? "" : "s"} due now)` }; }
      else if (T && NOW - (T.upd || 0) < STALE) { const r = decide(NOW, d.cfg, n, st); st = r.st; out = r.send; }
      if (out && out.kind === "nudge" && duoDone === false) out = Object.assign({}, out, { body: out.body + " · Duolingo not done yet 🦉" });
      if (out) {
        try { await send(d.sub, payloadOf(out)); sum.sent++; st.lastAt = NOW; st.lastKind = out.kind; st.lastN = n; delete st.err; }
        catch (e) {
          const code = e && e.statusCode;
          if (code === 404 || code === 410) { st.gone = ep; st.goneAt = NOW; sum.gone++; }
          else { st.err = String(code || (e && e.message) || "error").slice(0, 60); st.errAt = NOW; sum.errors++; if (out.kind !== "test") { st.thrAt = st0.thrAt == null ? null : st0.thrAt; st.nudgeDay = st0.nudgeDay || ""; } }
          log("push failed", code || "", e && e.body ? String(e.body).slice(0, 120) : "");
        }
      }
      st.ep = ep;
      S.dev[key] = st;
    }
  }
  for (const id in S.duo) if (NOW - (S.duo[id].at || 0) > DUO.KEEP) { delete S.duo[id]; delete DJ.s[id]; }
  const duoChanged = JSON.stringify(DJ.s) !== duoBefore;
  if (duoChanged) { DJ.upd = NOW; fs.writeFileSync(duoFile, JSON.stringify(DJ) + "\n"); }
  if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, `duo_changed=${duoChanged ? 1 : 0}\n`);
  const changed = snap() !== before;
  if (changed) { S.upd = NOW; fs.writeFileSync(stFile, JSON.stringify(S, null, 1) + "\n"); }
  log(JSON.stringify(Object.assign(sum, { changed })));
  if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, `changed=${changed ? 1 : 0}\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
