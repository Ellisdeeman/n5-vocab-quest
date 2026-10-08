/* node push/save.js <file> <commit message>
   Create or update <file> on the push-state branch through the GitHub Contents API (replaces the old `gh api` shell
   one-liner, which broke when the file didn't exist yet: `gh api --jq .sha` prints the raw 404 error JSON instead of a
   sha, and the unquoted ${sha:+-f sha=$sha} word-split it into extra arguments → "accepts 1 arg(s), received 2").
   GET → 200: update with its sha · 404: create without sha · anything else: fail. A PUT that races with another write
   (409/422 sha mismatch) re-reads the sha and retries (3 attempts). Exit code 1 on failure, with the reason. */
const fs = require("fs"), path = require("path");
const API = process.env.GH_API || "https://api.github.com", REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN, BRANCH = process.env.STATE_BRANCH || "push-state";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(file, message, tries = 3) {
  if (!REPO || !TOKEN) throw new Error("GITHUB_REPOSITORY and GH_TOKEN are required");
  const name = path.basename(file), url = `${API}/repos/${REPO}/contents/${encodeURIComponent(name)}`;
  const h = { Accept: "application/vnd.github+json", Authorization: `Bearer ${TOKEN}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "n5vq-push" };
  const content = fs.readFileSync(file).toString("base64");
  for (let a = 1; ; a++) {
    const g = await fetch(`${url}?ref=${encodeURIComponent(BRANCH)}`, { headers: h });
    let sha = null;
    if (g.status === 200) { sha = (await g.json()).sha; if (typeof sha !== "string" || !/^[0-9a-f]{40}$/.test(sha)) throw new Error(`GET ${name}: unexpected sha ${JSON.stringify(sha)}`); }
    else if (g.status !== 404) throw new Error(`GET ${name}: HTTP ${g.status} ${(await g.text()).slice(0, 200)}`);
    const body = { message, content, branch: BRANCH }; if (sha) body.sha = sha;
    const r = await fetch(url, { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, h), body: JSON.stringify(body) });
    if (r.ok) { console.log(`saved ${name} on ${BRANCH} (${sha ? "updated" : "created"})`); return sha ? "updated" : "created"; }
    const t = (await r.text()).slice(0, 200);
    if ((r.status === 409 || r.status === 422) && a < tries) { console.log(`PUT ${name}: HTTP ${r.status}, re-reading sha (attempt ${a + 1})`); await sleep(800 * a); continue; }
    throw new Error(`PUT ${name}: HTTP ${r.status} ${t}`);
  }
}
if (require.main === module) {
  const [file, message] = process.argv.slice(2);
  if (!file || !message) { console.error("usage: node push/save.js <file> <message>"); process.exit(2); }
  save(file, message).catch(e => { console.error("save failed:", e.message); process.exit(1); });
}
module.exports = { save };
