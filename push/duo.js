/* Duolingo "done today" for JLPT Vocab Quest (Batch 13).
   Duolingo has no official API and its public JSON endpoint sends no CORS headers, so the app can't read it from the
   browser. This job reads it for users in push/users.json who entered a Duolingo username in the app:
   • the app puts { u: username, k: random 32-byte key (base64url), tz } into its ENCRYPTED due timeline (only this job
     can read it); the username never appears in clear anywhere;
   • we fetch https://www.duolingo.com/2017-06-30/users?username=U&fields=users{username,streak,streakData} (public
     profiles only) and keep streakData.currentStreak.endDate = the last local day (Duolingo's day, YYYY-MM-DD) that
     extended the streak;
   • the result is sealed with AES-256-GCM under the user's key k and written to duo.json on the push-state branch as
     { v:1, upd, s: { <sha256(k)[:20]>: { v:1, iv, ct } } }. The app (same key, synced through the user's own gist) reads it
     from raw.githubusercontent.com (CORS-enabled) and shows "done today" when end === its local date.
   Plain state kept in state.json (public): per hashed id only the last fetch time and the local day it was seen done. */
const crypto = require("crypto");
const DUO_URL = u => `${process.env.DUO_API || "https://www.duolingo.com"}/2017-06-30/users?username=${encodeURIComponent(u)}&fields=users%7Busername,streak,streakData%7D`;
const RECHECK = 20 * 60e3, KEEP = 30 * 864e5;
const duoId = k => crypto.createHash("sha256").update(String(k)).digest("hex").slice(0, 20);
const validUser = u => typeof u === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(u);
const validKey = k => typeof k === "string" && Buffer.from(k, "base64url").length === 32;
function seal(obj, k) {
  const key = Buffer.from(k, "base64url"), iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj)), c.final(), c.getAuthTag()]);
  return { v: 1, iv: iv.toString("base64url"), ct: ct.toString("base64url") };
}
function unseal(box, k) {   // for tests (the app does this with WebCrypto)
  const key = Buffer.from(k, "base64url"), ct = Buffer.from(box.ct, "base64url"), d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(box.iv, "base64url"));
  d.setAuthTag(ct.subarray(ct.length - 16)); return JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString("utf8"));
}
/* → { ok:1, end:"YYYY-MM-DD"|null, streak } | { err: "notfound" | "private" | "http 503" | "network" } */
async function fetchDuo(u, f = fetch) {
  let r; try { r = await f(DUO_URL(u), { headers: { "User-Agent": "n5vq-push (JLPT Vocab Quest reminder server)", Accept: "application/json" } }); } catch (e) { return { err: "network" }; }
  if (!r.ok) return { err: "http " + r.status };
  let j; try { j = await r.json(); } catch (e) { return { err: "bad json" }; }
  const x = j && Array.isArray(j.users) ? j.users[0] : null;
  if (!x) return { err: "notfound" };
  if (!("streakData" in x) && !("streak" in x)) return { err: "private" };
  const cs = x.streakData && x.streakData.currentStreak;
  const end = cs && /^\d{4}-\d{2}-\d{2}$/.test(cs.endDate || "") ? cs.endDate : null;
  return { ok: 1, end, streak: Math.max(0, +x.streak || 0) };
}
/* fetch again? never twice in RECHECK; once seen done for the user's local day, not again until that day changes */
function shouldFetch(prev, now, day) { if (!prev) return true; if (prev.d === day) return false; return now - (prev.at || 0) >= RECHECK; }
module.exports = { DUO_URL, RECHECK, KEEP, duoId, validUser, validKey, seal, unseal, fetchDuo, shouldFetch };
