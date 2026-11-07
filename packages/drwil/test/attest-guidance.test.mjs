// QUA-267 : quand une attestation humaine est attendue, chaque texte qui la propose donne d'abord le sondage
// dans le chat, puis le terminal en repli ; jamais le terminal seul. Tests en dur sur les textes livrés et la
// sortie réelle de `verify`.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { init } from "../dist/index.js";

for (const nom of Object.keys(process.env)) if (nom.startsWith("GIT_")) delete process.env[nom];
const racine = mkdtempSync(join(tmpdir(), "drwil-attest-guidance-"));
after(() => rmSync(racine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
const env = { ...process.env, CI: "" };
const bin = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
const GABARIT = fileURLToPath(new URL("../templates/common/", import.meta.url));
const RECETTE = "docs/recipes/attest-a-contract.md";
const lire = (dir, f) => readFileSync(join(dir, f), "utf8");
const plat = (s) => s.replace(/\s+/g, " ");

let n = 0;
async function projet(lang) {
  const dir = join(racine, `p${n++}`);
  const log = console.log;
  console.log = () => {};
  try {
    await init({ lang, targetDir: dir, tools: "claude", git: false, ci: "none" });
  } finally {
    console.log = log;
  }
  return dir;
}

// Le sondage d'abord : la préparation `attest-poll` est citée, et avant la commande proposée `drwil attest <ID>`
// (« `drwil attest` est un geste humain » est une interdiction, pas une proposition).
function sondageDAbord(texte, quoi) {
  const sondage = texte.search(/drwil attest-poll/);
  const terminal = texte.search(/drwil attest <(ID|CONTRACT_ID|id)>/);
  assert.ok(sondage >= 0, `${quoi} : le sondage dans le chat (\`drwil attest-poll\`) est proposé`);
  assert.ok(terminal >= 0, `${quoi} : le terminal reste proposé en repli`);
  assert.ok(sondage < terminal, `${quoi} : le sondage vient avant le terminal`);
}

async function projetManuel(lang) {
  const dir = await projet(lang);
  const cfg = JSON.parse(lire(dir, ".drwil/ia-first.json"));
  cfg.checks = [{ id: "ok", name: "toujours vert", run: 'node -e "process.exit(0)"' }];
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify(cfg));
  writeFileSync(
    join(dir, "docs/contracts.md"),
    "# Contrats\n\n## QUA-001 — titre QUA-001\n**Règle** : exigence QUA-001.\n**Contrôle** : `ok`\n**Manuel** : relecture\n",
  );
  return dir;
}

test("QUA-267 : verify --agent propose d'abord le sondage dans le chat, puis le terminal en repli", async () => {
  const dir = await projetManuel("fr");
  const r = spawnSync(process.execPath, [bin, "verify", "--agent"], { cwd: dir, encoding: "utf8", env });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /GOVERNANCE: MANUAL REVIEW REQUIRED/);
  const action = r.stdout.slice(r.stdout.indexOf("Human attestation required."));
  sondageDAbord(action, "verify --agent");
  assert.match(action, /drwil attest-poll <CONTRACT_ID> --tried "<what you tried>"/);
  assert.match(action, /no answer, default or recommendation added/);
  assert.ok(action.includes(RECETTE), "verify --agent renvoie à la recette");
  assert.match(action, /Fallback, for the human in their own interactive terminal; never run it yourself:\n {2}drwil attest <CONTRACT_ID>/);
  assert.match(r.stdout, /Next step: .*the attestation poll in the chat first, the terminal as fallback/);
  for (const lang of ["fr", "en"]) {
    const humain = spawnSync(process.execPath, [bin, "verify"], { cwd: await projetManuel(lang), encoding: "utf8", env });
    sondageDAbord(humain.stdout.slice(humain.stdout.search(/Attestables? (par|by)/)), `verify (${lang})`);
  }
});

test("QUA-267 : le message MANUAL et le rappel de VERIFY de l'état proposent d'abord le sondage", async () => {
  const base = join(GABARIT, "base/.githooks/");
  const { MESSAGES_FR } = await import(pathToFileURL(join(base, "state-messages-fr.mjs")).href);
  const { MESSAGES_EN } = await import(pathToFileURL(join(base, "state-messages-en.mjs")).href);
  const { TEXTS } = await import(pathToFileURL(join(base, "state-context-texts.mjs")).href);
  sondageDAbord(MESSAGES_FR.manual, "message MANUAL (fr)");
  sondageDAbord(MESSAGES_EN.manual, "message MANUAL (en)");
  for (const m of [MESSAGES_FR.manual, MESSAGES_EN.manual]) assert.ok(m.includes(RECETTE));
  assert.match(TEXTS.fr.rules.VERIFY, /sondage d'attestation dans le chat .*sinon `npx drwil attest`/);
  assert.match(TEXTS.en.rules.VERIFY, /attestation poll in the chat .*otherwise `npx drwil attest`/);
});

test("QUA-267 : skill drwil, règles, consigne de drwil-checks et AGENTS.md livrés proposent le sondage d'abord et renvoient à la recette", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = await projet(lang);
    const skill = plat(lire(dir, ".claude/skills/drwil/SKILL.md"));
    const manuel = skill.slice(skill.indexOf("MANUAL REVIEW REQUIRED"));
    sondageDAbord(manuel, `skill drwil (${lang})`);
    assert.ok(manuel.includes(RECETTE));
    assert.match(manuel, /Never answer the poll, never run `drwil attest`/);
    const regles = plat(lire(dir, "docs/ia-first/8-conduct-rules.md"));
    const gestes = regles.slice(regles.indexOf("**Human gestures**"), regles.indexOf("**Project language**"));
    sondageDAbord(gestes, `règle « Human gestures » (${lang})`);
    assert.ok(gestes.includes(RECETTE));
    assert.match(gestes, /never the terminal alone/);
    const checks = plat(lire(dir, ".claude/agents/drwil-checks.md"));
    assert.match(
      checks,
      /the attestation poll in the chat first and the terminal as fallback: never shorten them to the terminal command alone/,
    );
    const agents = lire(dir, "AGENTS.md");
    assert.ok(agents.split("\n").length <= 100, "AGENTS.md reste un aiguillage de 100 lignes au plus");
    assert.match(agents, /\| a human attestation awaited \(`MANUAL`\) \| .* \| `docs\/recipes\/attest-a-contract\.md` \|/);
    assert.match(agents, /an awaited attestation is proposed first as the chat poll, the terminal as fallback/);
    assert.ok(
      plat(lire(dir, ".claude/skills/start-a-workstream/SKILL.md")).includes(RECETTE),
      "le skill de lancement renvoie à la recette",
    );
    const etat = plat(lire(dir, "docs/ia-first/7-governance-state.md"));
    sondageDAbord(etat.slice(etat.indexOf("`MANUAL`: a human attests")), `7-governance-state (${lang})`);
    const preuves = plat(lire(dir, "docs/ia-first/5-proving-the-work.md"));
    sondageDAbord(preuves.slice(preuves.indexOf("**Human attestation**")), `5-proving-the-work (${lang})`);
    sondageDAbord(preuves.slice(preuves.indexOf("MANUAL → the agent stops")), `flux agent/humain (${lang})`);
  }
});

test("QUA-267 : la recette attest-a-contract dit, outil par outil, comment préparer et poser le sondage, sans réponse ni recommandation, le terminal en repli", async () => {
  const dir = await projet("fr");
  const recette = lire(dir, RECETTE);
  assert.equal(recette, readFileSync(join(GABARIT, "base", RECETTE), "utf8"), "la recette livrée est celle du gabarit");
  const p = plat(recette);
  sondageDAbord(p, "recette");
  for (const [outil, preparation, appel] of [
    ["Claude Code", /npx drwil attest-poll <ID> --tried/, /`AskUserQuestion`/],
    ["Copilot CLI", /--tool copilot/, /`ask_user`/],
    ["Gemini CLI", /--tool gemini/, /`ask_user`/],
    ["Codex", /--tool codex/, /`request_user_input`/],
    ["Cursor", /--tool cursor/, /`npx drwil cursor-acp`/],
  ]) {
    const ligne = recette.split("\n").find((l) => l.startsWith(`| ${outil} |`));
    assert.ok(ligne, `recette : une ligne pour ${outil}`);
    assert.match(ligne, preparation, `${outil} : préparation`);
    assert.match(ligne, appel, `${outil} : sondage posé`);
  }
  assert.match(p, /passing the JSON \*\*unchanged\*\*: no answer filled in, no default, no recommended choice/);
  assert.match(p, /Only the human answers \*\*Attest\*\* or \*\*Decline\*\*/);
  assert.match(p, /## 2\. The terminal \(fallback\)/);
  assert.match(p, /`npx drwil attest <ID>`, to run in \*\*their own\*\* interactive terminal/);
});
