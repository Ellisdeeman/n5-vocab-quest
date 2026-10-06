/* Decrypt the app's push files. The app encrypts with ECIES on P-256 using the server's public data key (in the app
   bundle): ephemeral ECDH → HKDF-SHA256(salt, "n5vq-push-v1") → AES-256-GCM. File: { v:1, epk, salt, iv, ct } (base64url).
   The private half (PUSH_DATA_KEY, raw 32-byte scalar, base64url) exists only as a GitHub Actions secret. */
const crypto = require("crypto");
const INFO = Buffer.from("n5vq-push-v1");
const b = s => Buffer.from(String(s), "base64url");
function decrypt(box, privB64u) {
  if (!box || box.v !== 1) throw new Error("bad box");
  const ecdh = crypto.createECDH("prime256v1"); ecdh.setPrivateKey(b(privB64u));
  const secret = ecdh.computeSecret(b(box.epk));
  const key = Buffer.from(crypto.hkdfSync("sha256", secret, b(box.salt), INFO, 32));
  const ct = b(box.ct), d = crypto.createDecipheriv("aes-256-gcm", key, b(box.iv));
  d.setAuthTag(ct.subarray(ct.length - 16));
  return JSON.parse(Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]).toString("utf8"));
}
function encrypt(obj, pubB64u) {   // same scheme as the app (used by tests)
  const e = crypto.createECDH("prime256v1"); e.generateKeys();
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12);
  const key = Buffer.from(crypto.hkdfSync("sha256", e.computeSecret(b(pubB64u)), salt, INFO, 32));
  const c = crypto.createCipheriv("aes-256-gcm", key, iv), ct = Buffer.concat([c.update(JSON.stringify(obj)), c.final(), c.getAuthTag()]);
  const u = x => Buffer.from(x).toString("base64url");
  return { v: 1, epk: u(e.getPublicKey()), salt: u(salt), iv: u(iv), ct: u(ct) };
}
function genKey() { const e = crypto.createECDH("prime256v1"); e.generateKeys(); return { pub: e.getPublicKey().toString("base64url"), priv: e.getPrivateKey().toString("base64url") }; }
module.exports = { decrypt, encrypt, genKey };
