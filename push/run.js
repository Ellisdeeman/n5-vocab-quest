/* Scheduled review-reminder sender (GitHub Actions, see .github/workflows/push.yml).
   node push/run.js <state.json>
   env: VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT, PUSH_DATA_KEY (secrets) · GITHUB_TOKEN (read public gists) ·
        TEST_SUB (optional PushSubscription JSON: send one test push to it and exit) · DRY=1 (decide, don't send)
   For every GitHub user in push/users.json: find their public "JLPT Quest review reminders" gist (created by the app with
   the user's own gist-sync token), decrypt the due timeline + each device file, decide (decide.js) and send Web Push.
   Per-device state (last reminder times; no personal data, keys are hashes) is written back to <state.json>, which the
   workflow commits to the push-state branch. */
const fs = require("fs"), crypto = require("crypto"), path = require("path");
const webpush = require("web-push");
const { decide, countAt } = require("./decide.js");
const { decrypt } = require("./crypt.js");
const E = process.env, NOW = +E.NOW || Date.now(), STALE = 21 * 864e5;
const TL_FILE = "n5vq-due.json", DEV_RE = /^n5vq-push-([A-Za-z0-9_-]{6,40})\.json$/;
const APP_URL = "https://ellisdeeman.github.io/n5-vocab-quest/";
const h = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 20);
const log = (...a) => console.log(...a);
async function gh(url) {
  const r = await fetch(url.startsWith("http") ? url : (E.GH_API || "https://api.github.com") + url, { headers: Object.assign({ Accept: "application/vnd.github+json", "User-Agent": "n5vq-push" }, E.GITHUB_TOKEN ? { Authorization: "Bearer " + E.GITHUB_TOKEN } : {}) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r;
}
async function send(sub, payload) {
  if (E.DRY) { log("DRY send", payload.kind, payload.n); return { statusCode: 0, dry: true }; }
  return webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 4 * 3600, urgency: "high", vapidDetails: { subject: E.VAPID_SUBJECT || APP_URL, publicKey: E.VAPID_PUBLIC, privateKey: E.VAPID_PRIVATE } });
}
const payloadOf = (s, extra = {}) => Object.assign({ title: s.title, body: s.body, n: s.n, kind: s.kind, tag: "n5vq-due", url: "./?go=due", t: NOW }, extra);
async function main() {
  if (E.TEST_SUB && E.TEST_SUB.trim()) {   // workflow_dispatch smoke test against a given subscription
    const sub = JSON.parse(E.TEST_SUB);
    const r = await send(sub, payloadOf({ title: "JLPT Quest", body: "Test notification ✓ — the reminder server can reach this device", n: 0, kind: "test" }));
    log("test push → HTTP", r.statusCode, "endpoint host", new URL(sub.endpoint).host); return;
  }
  const stFile = process.argv[2] || "state.json";
  let S = { v: 1, dev: {} }; try { S = Object.assign(S, JSON.parse(fs.readFileSync(stFile, "utf8"))); } catch (e) {}
  const before = JSON.stringify(S.dev);
  const users = E.USERS ? E.USERS.split(",") : JSON.parse(fs.readFileSync(path.join(__dirname, "users.json"), "utf8")).users || [];
  const sum = { users: users.length, gists: 0, devices: 0, sent: 0, gone: 0, errors: 0 };
  for (const u of users) {
    let gists; try { gists = await (await gh(`/users/${encodeURIComponent(u)}/gists?per_page=100`)).json(); } catch (e) { log("list", u, e.message); sum.errors++; continue; }
    const g = gists.filter(x => x.files && Object.keys(x.files).some(f => f === TL_FILE || DEV_RE.test(f))).sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
    if (!g) continue; sum.gists++;
    const owner = (g.owner && g.owner.login) || u;
    const read = async f => decrypt(JSON.parse(await (await gh(g.files[f].raw_url)).text()), E.PUSH_DATA_KEY);
    let tl = null; if (g.files[TL_FILE]) try { tl = await read(TL_FILE); } catch (e) { log("timeline", owner, e.message); sum.errors++; }
    for (const f of Object.keys(g.files)) {
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
  const changed = JSON.stringify(S.dev) !== before;
  if (changed) { S.upd = NOW; fs.writeFileSync(stFile, JSON.stringify(S, null, 1) + "\n"); }
  log(JSON.stringify(Object.assign(sum, { changed })));
  if (E.GITHUB_OUTPUT) fs.appendFileSync(E.GITHUB_OUTPUT, `changed=${changed ? 1 : 0}\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
