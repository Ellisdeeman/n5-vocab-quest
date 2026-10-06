// Unit tests: review-reminder decision logic (push/decide.js), timeline counting, ECIES box, and an end-to-end DRY run of
// push/run.js against a mock GitHub gist API (dedupe across runs, quiet hours, re-arm, gone, test push). node tpushlogic.js
const path = require("path"), http = require("http"), fs = require("fs"), os = require("os"), { execFileSync } = require("child_process");
const P = process.env.PUSHDIR || path.join(__dirname, "../push");
const { decide, countAt, quiet, local } = require(P + "/decide.js"), C = require(P + "/crypt.js");
const R = []; const ok = (n, c, i = "") => { R.push(!!c); console.log(c ? "PASS" : "FAIL", n, c ? "" : i); };
const NY = "America/New_York", at = (iso) => Date.parse(iso);       // ISO with offset
const cfg = o => Object.assign({ thr: 10, rep: 60, nudge: true, nudgeAt: "19:00", qs: "23:00", qe: "08:00", tz: NY }, o);
// --- threshold + hourly repeat
let r = decide(at("2026-10-06T15:00:00-04:00"), cfg(), 12, {});
ok("crossing the threshold sends a reminder", r.send && r.send.kind === "threshold" && r.send.body === "12 reviews due — keep your streak going", JSON.stringify(r));
let st = r.st;
r = decide(at("2026-10-06T15:30:00-04:00"), cfg(), 14, st); ok("30 min later: no repeat yet (1 h interval)", !r.send);
r = decide(at("2026-10-06T15:56:00-04:00"), cfg(), 14, st); ok("56 min later: repeat (5-min cron-jitter tolerance)", r.send && r.send.kind === "repeat" && r.send.n === 14);
st = r.st;
r = decide(at("2026-10-06T16:20:00-04:00"), cfg(), 15, st); ok("dedupe: no second push within the hour", !r.send);
r = decide(at("2026-10-06T17:00:00-04:00"), cfg({ rep: 120 }), 15, st); ok("2 h interval: not after 64 min", !r.send);
r = decide(at("2026-10-06T17:55:00-04:00"), cfg({ rep: 120 }), 15, st); ok("2 h interval: after ~2 h", r.send && r.send.kind === "repeat");
r = decide(at("2026-10-06T16:30:00-04:00"), cfg({ rep: 30 }), 15, st); ok("30 min interval", r.send && r.send.kind === "repeat");
r = decide(at("2026-10-06T20:00:00-04:00"), cfg({ rep: 0 }), 15, st); ok("'once': no repeats while still above", !r.send);
// --- re-arm after studying below
r = decide(at("2026-10-06T16:10:00-04:00"), cfg(), 4, st); ok("studied below the threshold → re-armed (no push)", !r.send && r.st.thrAt === null);
r = decide(at("2026-10-06T16:12:00-04:00"), cfg(), 10, r.st); ok("next crossing (exactly at threshold) alerts again immediately", r.send && r.send.kind === "threshold");
r = decide(at("2026-10-06T16:12:00-04:00"), cfg({ rep: 0 }), 11, decide(at("2026-10-06T16:11:00-04:00"), cfg({ rep: 0 }), 3, { thrAt: 1 }).st); ok("'once' re-arms too", r.send && r.send.kind === "threshold");
// --- quiet hours / timezone
r = decide(at("2026-10-06T23:30:00-04:00"), cfg(), 30, {}); ok("quiet hours (23:00–08:00): nothing at 23:30", !r.send && r.quiet && r.st.thrAt === null);
r = decide(at("2026-10-07T03:00:00-04:00"), cfg(), 30, {}); ok("quiet at 03:00", !r.send);
r = decide(at("2026-10-07T08:05:00-04:00"), cfg(), 30, {}); ok("first check after quiet hours sends the pending reminder", r.send && r.send.kind === "threshold");
r = decide(at("2026-10-06T23:30:00-04:00"), cfg({ qs: "00:00", qe: "00:00" }), 30, {}); ok("equal quiet start/end = no quiet hours", !!r.send);
r = decide(at("2026-10-06T13:00:00-04:00"), cfg({ qs: "13:00", qe: "15:00" }), 30, {}); ok("daytime quiet window works", !r.send);
const t = at("2026-10-06T15:00:00Z");   // 11:00 NY, 00:00 Tokyo next day
ok("timezone: same instant is daytime in New York", !!decide(t, cfg(), 30, {}).send);
ok("…and quiet hours in Tokyo", !decide(t, cfg({ tz: "Asia/Tokyo" }), 30, {}).send);
ok("local(): date + minutes in zone", JSON.stringify(local(t, "Asia/Tokyo")) === JSON.stringify({ day: "2026-10-07", min: 0 }));
ok("bad timezone falls back to UTC", local(t, "Not/AZone").min === 15 * 60);
ok("quiet() spans midnight", quiet(23 * 60 + 59, "23:00", "08:00") && quiet(7 * 60 + 59, "23:00", "08:00") && !quiet(8 * 60, "23:00", "08:00"));
// --- evening nudge
r = decide(at("2026-10-06T19:10:00-04:00"), cfg(), 3, {}); ok("evening nudge when 0 < due < threshold", r.send && r.send.kind === "nudge" && /Evening check-in: 3 reviews due/.test(r.send.body));
st = r.st;
r = decide(at("2026-10-06T19:40:00-04:00"), cfg(), 4, st); ok("nudge only once per day", !r.send);
r = decide(at("2026-10-07T19:01:00-04:00"), cfg(), 1, st); ok("next day: nudge again (singular text)", r.send && /1 review due/.test(r.send.body));
r = decide(at("2026-10-06T18:59:00-04:00"), cfg(), 3, {}); ok("not before the nudge time", !r.send);
r = decide(at("2026-10-06T22:05:00-04:00"), cfg(), 3, {}); ok("not more than 3 h after it", !r.send);
r = decide(at("2026-10-06T19:10:00-04:00"), cfg(), 0, {}); ok("nothing due → no nudge", !r.send);
r = decide(at("2026-10-06T19:10:00-04:00"), cfg({ nudge: false }), 3, {}); ok("nudge off", !r.send);
r = decide(at("2026-10-06T23:40:00-04:00"), cfg({ nudgeAt: "23:30" }), 3, {}); ok("nudge inside quiet hours is skipped", !r.send);
r = decide(at("2026-10-06T19:10:00-04:00"), cfg(), 12, {}); ok("at/above threshold → threshold reminder, not a nudge", r.send && r.send.kind === "threshold");
r = decide(at("2026-10-06T19:10:00-04:00"), cfg({ thr: "abc", rep: 7 }), 10, {}); ok("invalid settings fall back to defaults (10, 1 h)", r.send && r.send.kind === "threshold");
// --- timeline
const tl = { t0: at("2026-10-06T12:00:00Z"), now: 5, add: [10, 60, 60, 600] };
ok("countAt: due now + items due by then", countAt(tl, tl.t0) === 5 && countAt(tl, tl.t0 + 60 * 60e3) === 8 && countAt(tl, tl.t0 + 864e5) === 9 && countAt(null, 1) === 0);
// --- crypto
const K = C.genKey(), box = C.encrypt({ x: "テスト", n: 1 }, K.pub);
ok("ECIES box round-trips", C.decrypt(box, K.priv).x === "テスト");
let bad = false; try { C.decrypt(Object.assign({}, box, { ct: box.ct.slice(0, -4) + "AAAA" }), K.priv); } catch (e) { bad = true; } ok("tampered box rejected", bad);
// --- end-to-end DRY run of run.js against a mock gist API
(async () => {
  const files = {}, base = { url: "" };
  const dev = id => ({ v: 1, dev: id, on: true, sub: { endpoint: "https://push.example/" + id, keys: { p256dh: "x", auth: "y" } }, cfg: cfg(), test: 0, upd: 1 });
  const T0 = at("2026-10-06T14:00:00-04:00");
  files["n5vq-due.json"] = C.encrypt({ v: 1, upd: T0, t0: T0, now: 8, add: [30, 40, 50] }, K.pub);   // 8 now, 11 by 14:50
  files["n5vq-push-devAAAAAA.json"] = C.encrypt(dev("devAAAAAA"), K.pub);
  files["n5vq-push-devBBBBBB.json"] = C.encrypt(Object.assign(dev("devBBBBBB"), { test: 123 }), K.pub);
  const srv = http.createServer((q, s) => {
    if (q.url.startsWith("/users/tester/gists")) { s.setHeader("Content-Type", "application/json"); return s.end(JSON.stringify([{ id: "g1", updated_at: "2026-10-06T18:00:00Z", owner: { login: "tester" }, files: Object.fromEntries(Object.keys(files).map(f => [f, { raw_url: base.url + "/raw/" + f }])) }])); }
    const m = /^\/raw\/(.+)$/.exec(q.url); if (m && files[m[1]]) return s.end(JSON.stringify(files[m[1]]));
    s.statusCode = 404; s.end("{}");
  }).listen(0);
  base.url = "http://127.0.0.1:" + srv.address().port;
  const stf = path.join(os.tmpdir(), "pushstate-" + process.pid + ".json"); try { fs.unlinkSync(stf); } catch (e) {}
  const run = iso => new Promise(res => { require("child_process").execFile("node", [P + "/run.js", stf], { env: Object.assign({}, process.env, { DRY: "1", GH_API: base.url, USERS: "tester", PUSH_DATA_KEY: K.priv, NOW: String(at(iso)) }) }, (e, out) => res(out || String(e))); });
  let o = await run("2026-10-06T14:20:00-04:00");
  ok("run 1 (8 due < 10): only the test push for device B", /DRY send test/.test(o) && !/DRY send threshold/.test(o) && /"devices":2/.test(o), o);
  o = await run("2026-10-06T14:55:00-04:00");
  ok("run 2 (11 due): threshold reminder to both devices, test not repeated", (o.match(/DRY send threshold 11/g) || []).length === 2 && !/send test/.test(o), o);
  o = await run("2026-10-06T15:05:00-04:00");
  ok("run 3 (10 min later): deduped, nothing sent, state unchanged", !/DRY send/.test(o) && /"changed":false/.test(o), o);
  o = await run("2026-10-06T15:52:00-04:00");
  ok("run 4 (~1 h later, still above): hourly repeat", (o.match(/DRY send repeat 11/g) || []).length === 2, o);
  const S1 = JSON.parse(fs.readFileSync(stf, "utf8"));
  ok("state file holds hashed keys only (no usernames / endpoints)", Object.keys(S1.dev).length === 2 && !/tester|push\.example|dev[AB]/.test(JSON.stringify(S1)), JSON.stringify(S1));
  files["n5vq-due.json"] = C.encrypt({ v: 1, upd: at("2026-10-06T16:00:00-04:00"), t0: at("2026-10-06T16:00:00-04:00"), now: 2, add: [] }, K.pub);   // he studied
  o = await run("2026-10-06T16:05:00-04:00"); ok("after studying below: nothing sent, re-armed", !/DRY send/.test(o) && JSON.parse(fs.readFileSync(stf, "utf8")).dev[Object.keys(S1.dev)[0]].thrAt === null, o);
  o = await run("2026-10-06T19:05:00-04:00"); ok("evening nudge (2 due) once per device", (o.match(/DRY send nudge 2/g) || []).length === 2, o);
  o = await run("2026-10-06T19:25:00-04:00"); ok("no second nudge", !/DRY send/.test(o), o);
  files["n5vq-push-devAAAAAA.json"] = C.encrypt(Object.assign(dev("devAAAAAA"), { on: false }), K.pub);
  o = await run("2026-10-07T19:05:00-04:00"); ok("disabled device skipped", (o.match(/DRY send nudge/g) || []).length === 1 && /"devices":1/.test(o), o);
  srv.close(); try { fs.unlinkSync(stf); } catch (e) {}
  console.log("SUMMARY tpushlogic " + R.filter(x => x).length + "/" + R.length);
  process.exit(R.every(x => x) ? 0 : 1);
})();
