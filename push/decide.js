/* Review-reminder decision logic (pure; unit-tested by tests/tpushlogic.js).
   decide(now, cfg, count, st) -> { send: null | { kind, n, title, body }, st }
   cfg: { thr (due threshold, default 10), rep (repeat minutes while at/above threshold: 30/60/120/180, 0 = once per
          crossing), nudge (bool), nudgeAt "HH:MM", qs / qe quiet hours "HH:MM" (equal = none), tz IANA zone }
   st (per device, persisted on the push-state branch): { thrAt: last threshold push (ms) | null when re-armed,
          nudgeDay "YYYY-MM-DD" (local) of the last evening nudge, lastAt, lastKind, lastN }
   Rules
   - count >= thr: remind now if not quiet hours and (never reminded since it was re-armed, or rep > 0 and rep minutes
     have passed since the last reminder — 5 min tolerance for cron jitter). rep = 0: only once until re-armed.
   - count < thr: re-arm (thrAt = null) — he studied below the threshold — so the next crossing alerts again.
   - Evening nudge (optional): 0 < count < thr, local time within 3 h after nudgeAt, not quiet, once per local day.
   - Quiet hours: nothing is sent; a pending threshold reminder goes out at the first check after quiet hours end. */
const JIT = 5 * 60e3, NUDGE_WIN = 180;
const DEF = { thr: 10, rep: 60, nudge: true, nudgeAt: "19:00", qs: "23:00", qe: "08:00", tz: "UTC" };
const hm = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "")); return m ? (+m[1] % 24) * 60 + Math.min(59, +m[2]) : null; };
function local(now, tz) {   // { day: "YYYY-MM-DD", min: minutes since local midnight }
  let p;
  try { p = new Intl.DateTimeFormat("en-CA", { timeZone: tz || "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now)); }
  catch (e) { return local(now, "UTC"); }
  const g = t => (p.find(x => x.type === t) || {}).value;
  return { day: `${g("year")}-${g("month")}-${g("day")}`, min: (+g("hour") % 24) * 60 + +g("minute") };
}
function quiet(min, qs, qe) {
  const a = hm(qs), b = hm(qe);
  if (a == null || b == null || a === b) return false;
  return a < b ? min >= a && min < b : min >= a || min < b;
}
const norm = c => { const o = Object.assign({}, DEF, c || {}); o.thr = Math.max(1, Math.round(+o.thr || DEF.thr)); o.rep = [0, 30, 60, 120, 180].includes(+o.rep) ? +o.rep : DEF.rep; return o; };
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
function decide(now, cfg, count, st0) {
  const c = norm(cfg), st = Object.assign({ thrAt: null, nudgeDay: "", lastAt: 0, lastKind: "", lastN: 0 }, st0 || {});
  const L = local(now, c.tz), q = quiet(L.min, c.qs, c.qe), n = Math.max(0, Math.floor(+count || 0));
  let send = null;
  if (n >= c.thr) {
    const due = st.thrAt == null || (c.rep > 0 && now - st.thrAt >= c.rep * 60e3 - JIT);
    if (due && !q) {
      send = { kind: st.thrAt == null ? "threshold" : "repeat", n, title: "JLPT Quest", body: `${plural(n, "review")} due — keep your streak going` };
      st.thrAt = now;
    }
  } else {
    st.thrAt = null;   // studied below the threshold → re-arm
    const na = hm(c.nudgeAt);
    if (c.nudge && n > 0 && na != null && !q && st.nudgeDay !== L.day && L.min >= na && L.min < na + NUDGE_WIN) {
      send = { kind: "nudge", n, title: "JLPT Quest", body: `Evening check-in: ${plural(n, "review")} due — a few minutes keeps your streak going` };
      st.nudgeDay = L.day;
    }
  }
  if (send) { st.lastAt = now; st.lastKind = send.kind; st.lastN = n; }
  return { send, st, quiet: q };
}
/* due count at time t from a timeline { t0, now, add: [minute offsets from t0, ascending] } */
function countAt(tl, t) {
  if (!tl || !Array.isArray(tl.add)) return 0;
  const lim = (t - tl.t0) / 60e3; let n = +tl.now || 0;
  for (const m of tl.add) { if (m <= lim) n++; else break; }
  return n;
}
module.exports = { decide, countAt, quiet, local, hm, norm, DEF };
