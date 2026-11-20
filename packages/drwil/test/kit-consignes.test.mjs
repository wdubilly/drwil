// Tests du kit, thème consignes : documents, consignes et skills livrés (gabarit et copies du dépôt).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { init, verify } from "../dist/index.js";
import { tmp, quiet, envTest, checks, read, sectionsIaFirst, sectionIaFirst, consignes, GABARIT, DEPOT } from "./kit-commun.mjs";

test("QUA-153 : AGENTS.md du gabarit tient en 100 lignes et chacune de ses règles de conduite a son détail en section 8 de docs/ia-first.md", () => {
  const base = fileURLToPath(new URL("../templates/common/base/", import.meta.url));
  const agents = readFileSync(join(base, "AGENTS.md"), "utf8");
  const lignes = agents.trimEnd().split("\n");
  assert.ok(lignes.length <= 100, `AGENTS.md du gabarit : ${lignes.length} lignes, plafond 100`);
  const section8 = sectionIaFirst(base, /^# 8\. Conduct rules, in detail$/);
  assert.ok(section8, "section 8 présente au sommaire");
  const detail = section8.texte;
  assert.ok(agents.includes(`\`${section8.chemin}\``), `AGENTS.md renvoie au fichier de la section 8 (${section8.chemin})`);
  const noms = (texte) => [...texte.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  const conduite = agents.slice(agents.indexOf("## Conduct"), agents.indexOf("## Contracts"));
  const regles = noms(conduite);
  assert.ok(regles.length >= 20, `règles de conduite relevées : ${regles.length}`);
  for (const nom of regles)
    assert.ok(
      noms(detail).some((d) => d.startsWith(nom)),
      `règle « ${nom} » sans détail en section 8`,
    );
});

// Les renvois les plus lus visent le fichier de section exact (gabarit, puis copie du dépôt).
const RENVOIS_LES_PLUS_LUS = [
  "base/AGENTS.md",
  "tools/claude/.claude/skills/drwil/SKILL.md",
  "base/docs/projects/model-brief.md",
  "base/docs/projects/pending.md",
  "base/docs/projects/routine-maintenance.md",
].map((f) => join(GABARIT, f));

const RENVOIS_LES_PLUS_LUS_DEPOT = [
  "AGENTS.md",
  ".claude/skills/drwil/SKILL.md",
  "docs/projects/model-brief.md",
  "docs/projects/routine-maintenance.md",
].map((f) => join(DEPOT, f));

function* fichiersTexte(dossier) {
  for (const e of readdirSync(dossier, { withFileTypes: true })) {
    const chemin = join(dossier, e.name);
    if (e.isDirectory()) yield* fichiersTexte(chemin);
    else if (/\.(md|mdc|mjs|json|yml)$/.test(e.name)) yield chemin;
  }
}

test("QUA-190 : docs/ia-first.md est un sommaire court qui donne le fichier de chaque section, chacune sous le plafond et lisible seule", () => {
  const base = join(GABARIT, "base");
  const { sommaire, sections } = sectionsIaFirst(base);
  const lignes = sommaire.trimEnd().split("\n").length;
  assert.ok(lignes < 100, `sommaire : ${lignes} lignes, moins de 100 attendues`);
  for (let n = 1; n <= 8; n++)
    assert.match(
      sommaire,
      new RegExp(`^\\| ${n} \\| .+ \\| \`docs/ia-first/${n}-[^\`]+\\.md\` \\|`, "m"),
      `section ${n} au sommaire, avec son fichier`,
    );
  const livres = readdirSync(join(base, "docs/ia-first")).map((f) => `docs/ia-first/${f}`);
  assert.deepEqual(sections.map((s) => s.chemin).sort(), livres.sort(), "chaque fichier du dossier est au sommaire, et lui seul");
  for (const { chemin, texte } of sections) {
    const n = /^docs\/ia-first\/(\d+)-/.exec(chemin)[1];
    const taille = texte.split("\n").length - 1;
    assert.ok(taille <= 400, `${chemin} : ${taille} lignes, plafond 400`);
    assert.match(texte.split("\n")[0], new RegExp(`^# ${n}\\. `), `${chemin} : titre numéroté de sa section`);
    assert.ok(texte.includes("`docs/ia-first.md`"), `${chemin} : renvoie au sommaire`);
  }
  // La copie du dépôt suit le gabarit.
  assert.deepEqual(
    sectionsIaFirst(DEPOT).sections.map((s) => s.chemin),
    sections.map((s) => s.chemin),
    "le sommaire du dépôt donne les mêmes fichiers",
  );
});

// Paragraphes d'un texte (séparés par une ligne vide), espaces normalisés.
const paragraphesIaFirst = (texte) =>
  texte
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);

test("QUA-190 : le sommaire ne garde que l'introduction et la table des sections, aucun paragraphe de règle", () => {
  for (const base of [join(GABARIT, "base"), DEPOT]) {
    const { sommaire } = sectionsIaFirst(base);
    const i = sommaire.indexOf("\n## ");
    assert.ok(i > 0, "le sommaire a un titre « ## » après l'introduction");
    const introduction = sommaire.slice(0, i).trim().split("\n").length;
    assert.ok(introduction <= 15, `introduction : ${introduction} lignes, 15 au plus`);
    for (const p of paragraphesIaFirst(sommaire.slice(i))) {
      if (/^#{1,6} [^\n]*$/.test(p)) continue; // titre seul
      if (p.startsWith("|")) continue; // table des sections
      assert.match(p, /`docs\/ia-first(\.md|\/)/, `paragraphe de règle dans le sommaire : « ${p.slice(0, 60)}… »`);
      assert.ok(p.length < 400, `paragraphe trop long pour un renvoi : « ${p.slice(0, 60)}… »`);
    }
  }
});

test("QUA-190 : aucun paragraphe de règle n'apparaît dans deux fichiers, ni à la fois dans le sommaire et une section", () => {
  for (const base of [join(GABARIT, "base"), DEPOT]) {
    const { sommaire, sections } = sectionsIaFirst(base);
    const vus = new Map();
    for (const { chemin, texte } of [{ chemin: "docs/ia-first.md", texte: sommaire }, ...sections]) {
      const dansFichier = new Set();
      for (const p of paragraphesIaFirst(texte)) {
        if (p.length < 40 || /^#{1,6} [^|]*$/.test(p)) continue; // trivial ou titre
        if (/^Section \d+ of the "IA first" description, read on its own\./.test(p)) continue; // en-tête de renvoi
        if (dansFichier.has(p)) continue;
        dansFichier.add(p);
        assert.ok(!vus.has(p), `paragraphe en double entre ${vus.get(p)} et ${chemin} : « ${p.slice(0, 60)}… »`);
        vus.set(p, chemin);
      }
    }
  }
});

test("QUA-190 : chaque renvoi à docs/ia-first.md mène à une section existante, les plus lus au fichier exact", () => {
  const base = join(GABARIT, "base");
  const { sommaire, sections } = sectionsIaFirst(base);
  const titres = sections.flatMap((s) => [...s.texte.matchAll(/^#+ (?:\d+\. )?(.+)$/gm)].map((m) => m[1]));
  for (const fichier of fichiersTexte(GABARIT)) {
    const texte = readFileSync(fichier, "utf8");
    for (const [, n] of texte.matchAll(/docs\/ia-first\.md`?,? section (\d+)/g))
      assert.match(sommaire, new RegExp(`^\\| ${n} \\|`, "m"), `${fichier} : section ${n} absente du sommaire`);
    for (const [chemin] of texte.matchAll(/docs\/ia-first\/[\w.-]+\.md/g))
      assert.ok(existsSync(join(base, chemin)), `${fichier} : ${chemin} introuvable`);
    if (fichier.endsWith(".md"))
      for (const [, titre] of texte.matchAll(/docs\/ia-first\.md`?,? \(?"([^"]+)"/g))
        assert.ok(titres.includes(titre), `${fichier} : section « ${titre} » introuvable`);
  }
  for (const fichier of [...RENVOIS_LES_PLUS_LUS, ...RENVOIS_LES_PLUS_LUS_DEPOT]) {
    const texte = readFileSync(fichier, "utf8");
    assert.doesNotMatch(texte, /docs\/ia-first\.md`?,? (section \d|\(?")/, `${fichier} : renvoi à une section par le sommaire`);
    const cites = [...texte.matchAll(/`(docs\/ia-first\/[\w.-]+\.md)`/g)].map((m) => m[1]);
    assert.ok(cites.length, `${fichier} : aucun fichier de section cité`);
    for (const c of cites) assert.ok(existsSync(join(base, c)), `${fichier} : ${c} introuvable`);
  }
});

test("QUA-190 : le registre du dépôt et ses intentions visent le fichier de section, jamais le sommaire, et ce fichier existe", () => {
  const fichiers = [join(DEPOT, "docs/contracts.md"), join(DEPOT, "docs/intentions/compatibilite-des-outils.md")];
  for (const fichier of fichiers) {
    const texte = readFileSync(fichier, "utf8");
    assert.doesNotMatch(
      texte,
      /docs\/ia-first\.md`?,? \(?(section \d|matrice|réglage)/,
      `${fichier} : renvoi à une section par le sommaire`,
    );
    assert.doesNotMatch(texte, /matrice de `docs\/ia-first\.md`/, `${fichier} : matrice visée par le sommaire`);
    for (const [chemin] of texte.matchAll(/(?<![\w/])docs\/ia-first\/[\w.-]+\.md/g))
      assert.ok(existsSync(join(DEPOT, chemin)), `${fichier} : ${chemin} introuvable`);
  }
});

// Titres des sections de docs/ia-first/, sans leur numéro.
const titresIaFirst = (texte) => [...texte.matchAll(/^#+ (?:\d+\. )?(.+)$/gm)].map((m) => m[1]);

test("QUA-190 : chaque titre de section cité dans un commentaire d'un hook livré mène à un titre de docs/ia-first/", () => {
  const titres = sectionsIaFirst(join(GABARIT, "base")).sections.flatMap((s) => titresIaFirst(s.texte));
  let cites = 0;
  for (const fichier of fichiersTexte(GABARIT)) {
    if (!fichier.endsWith(".mjs")) continue;
    // Un renvoi peut courir sur plusieurs lignes de commentaire : elles sont recousues avant la lecture.
    const commentaires = readFileSync(fichier, "utf8")
      .split("\n")
      .filter((l) => /^\s*(\/\/|\/?\*)/.test(l))
      .map((l) => l.replace(/^\s*(\/\/+|\/?\*+)\s?/, ""))
      .join(" ");
    for (const [, titre] of commentaires.matchAll(/docs\/ia-first\.md`?,?\s+\(?"([^"]+)"/g)) {
      cites++;
      assert.ok(titres.includes(titre), `${fichier} : section « ${titre} » introuvable dans docs/ia-first/`);
    }
  }
  assert.ok(cites > 0, "aucun titre cité relevé dans les hooks livrés : le motif ne lit plus rien");
});

test("QUA-190 : aucun renvoi relatif d'une section de docs/ia-first/ ne sort de son fichier", () => {
  for (const base of [join(GABARIT, "base"), DEPOT]) {
    for (const { chemin, texte } of sectionsIaFirst(base).sections) {
      const lu = texte.replace(/\s+/g, " ");
      assert.doesNotMatch(lu, /this document/i, `${join(base, chemin)} : « this document » ne désigne plus le fichier lu seul`);
      const titres = titresIaFirst(texte);
      for (const [, titre, sens] of lu.matchAll(/"([^"]+)"\)? (below|above)\b/g))
        assert.ok(titres.includes(titre), `${join(base, chemin)} : « ${titre} » ${sens}, titre absent de ce fichier`);
    }
  }
});

test("QUA-179 : la recette livrée working-with-branches dit qu'un lancement en « This folder » crée workstream/<fiche> depuis la principale à jour, et quand il refuse", () => {
  const recette = readFileSync(join(GABARIT, "base/docs/recipes/working-with-branches.md"), "utf8");
  const puce = recette.split(/\n(?=- )/).find((p) => p.includes('"This folder"'));
  assert.ok(puce, "la recette livrée n'a pas de puce « This folder »");
  const lu = puce.replace(/\s+/g, " ");
  assert.match(lu, /creates `workstream\/<[^>]+>`/, "la puce dit que le lancement crée workstream/<fiche>");
  assert.match(lu, /up-to-date main branch/, "la puce dit que la branche part de la principale à jour");
  assert.match(lu, /refused/, "la puce dit quand le lancement refuse");
  for (const cas of [/not merged into the main branch/, /uncommitted changes/, /already exists/])
    assert.match(lu, cas, `la puce nomme le refus ${cas}`);
});

test("QUA-190 : init livre le dossier docs/ia-first/, une mise à jour en rafraîchit une section inchangée et garde une section adaptée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false, ci: "none" }));
  const empreinte = (texte) => createHash("sha256").update(texte).digest("hex");
  const manifeste = JSON.parse(read(dir, ".drwil/installed-files.json"));
  const livres = readdirSync(join(GABARIT, "base", "docs/ia-first"));
  for (const f of livres) {
    assert.ok(existsSync(join(dir, "docs/ia-first", f)), `docs/ia-first/${f} installé`);
    assert.ok(manifeste[`docs/ia-first/${f}`], `docs/ia-first/${f} au manifeste`);
  }
  const vieille = sectionIaFirst(dir, /^# 8\. /).chemin;
  writeFileSync(join(dir, vieille), "section de la version précédente\n");
  manifeste[vieille] = empreinte("section de la version précédente\n");
  writeFileSync(join(dir, ".drwil/installed-files.json"), JSON.stringify(manifeste, null, 2));
  const adaptee = sectionIaFirst(dir, /^# 2\. /).chemin;
  appendFileSync(join(dir, adaptee), "\nAdapté par le projet.\n");

  await quiet(() => init({ targetDir: dir, git: false, ci: "none" }));

  assert.match(read(dir, vieille), /^# 8\. Conduct rules, in detail$/m, "section inchangée depuis l'installation : rafraîchie");
  assert.match(read(dir, adaptee), /Adapté par le projet\./, "section adaptée par le projet : gardée");
});

test("QUA-037 : la skill de lancement dit un auto-merge refusé par le dépôt, reste en CLOSING et ne le dit jamais programmé", async () => {
  // Retour de drwil_com (2026-10-17) : sans « Allow auto-merge » dans les réglages du dépôt GitHub,
  // `gh pr merge --auto` échoue ; rien ne doit laisser croire que la fusion est programmée.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const skill = read(dir, ".claude/skills/start-a-workstream/SKILL.md");
  assert.match(skill, /auto-merge not allowed by the repository/);
  assert.match(skill, /Allow auto-merge/, "la marche à suivre : le réglage du dépôt");
  assert.match(skill, /stay in CLOSING/);
  assert.match(skill, /never say the merge is scheduled/);
});

test("QUA-037 : la skill et l'AGENTS.md livrés mènent une file un sous-agent par chantier, suivi de fusion borné, reprise confirmée", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  // Blancs ramenés à un espace : les phrases cherchées passent à la ligne dans le Markdown.
  const skill = read(dir, ".claude/skills/start-a-workstream/SKILL.md").replace(/\s+/g, " ");
  assert.match(skill, /each workstream in a subagent \(fresh context\)/);
  assert.match(skill, /its instructions start by reading the state: `node \.githooks\/state\.mjs`/);
  assert.match(skill, /never `isolation: "worktree"`/, "l'état ignoré par Git n'est pas dans une copie isolée");
  assert.match(skill, /One subagent at a time/);
  assert.match(skill, /The main session keeps only the reports/);
  assert.match(skill, /follows the PR with `gh` until it is merged, 30 minutes at most/);
  assert.match(skill, /never start the next one on a merge not done/);
  assert.match(skill, /« the queue resumes with <brief>: shall I start it\? »/);
  assert.match(skill, /only on an explicit yes/);
  const agents = consignes(dir).replace(/\s+/g, " ");
  assert.match(agents, /with Claude Code, each one in a subagent \(fresh context\)/);
  assert.match(agents, /30 minutes at most/);
  assert.match(agents, /explicit yes/);
});

test("QUA-050 : un projet installé reçoit la commande de détour, cadrée par la fiche de mécanique, la recette « corriger un défaut » et la consigne d'AGENTS.md", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  assert.ok(existsSync(join(dir, ".githooks/detour.mjs")));
  assert.match(read(dir, "docs/projects/kit-mechanics.md"), /^ {2}- \.githooks\/detour\.mjs$/m);
  const recette = read(dir, "docs/recipes/corriger-un-defaut.md").replace(/\s+/g, " ");
  assert.match(recette, /`node \.githooks\/detour\.mjs open <name> --title <defect> \[--files <a,b>\]`/);
  assert.match(recette, /Once the PR is merged: `node \.githooks\/detour\.mjs resume`/);
  assert.match(recette, /needs the human's yes/);
  const agents = consignes(dir).replace(/\s+/g, " ");
  assert.match(
    agents,
    /\*\*Detour for a prior defect\*\*: mid-workstream, a defect outside the active brief's scope is fixed by a detour the agent opens alone/,
  );
  assert.match(
    agents,
    /\| a defect to fix \| `node \.githooks\/glossary\.mjs --contract <ID>` \| `docs\/recipes\/corriger-un-defaut\.md` \|/,
  );
});

test("lot 6 : catalogue de contrats et recette d'adoption livrés, skill Claude présent", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  for (const f of ["docs/contracts-catalog.md", "docs/recipes/adopt-the-kit.md", ".claude/skills/adopt-the-kit/SKILL.md"]) {
    assert.ok(existsSync(join(dir, f)), f);
  }
  assert.match(read(dir, "AGENTS.md"), /adopt-the-kit\.md/);
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("lot 6 : le skill adopter-le-kit n'est pas livré sans Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".claude/skills")));
  assert.ok(existsSync(join(dir, "docs/contracts-catalog.md")));
});

test("commande /drwil : skill générique et alias par capacité livrés avec Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  assert.ok(existsSync(join(dir, ".claude/skills/drwil/SKILL.md")));
  assert.match(read(dir, ".claude/skills/drwil/SKILL.md"), /disable-model-invocation: true/);
  const alias = {
    "adopt-the-kit": "drwil-adopt",
    "audit-risks-and-debt": "drwil-audit",
    "discover-product-value": "drwil-value",
    "track-consumption-per-increment": "drwil-usage",
    "view-progress": "drwil-progress",
  };
  for (const [skill, name] of Object.entries(alias)) {
    assert.match(read(dir, `.claude/skills/${skill}/SKILL.md`), new RegExp(`^name: ${name}$`, "m"), skill);
  }
  const r = checks(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("commande /drwil : pas livrée sans Claude Code", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".claude/skills")));
});

test("skills Copilot CLI (applyTo) : parité fonctionnelle sur les 2 recettes qui s'y prêtent, FR et EN", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, git: false }));
    // Un seul gabarit, en anglais : mêmes fichiers quelle que soit la langue du projet.
    const api = "add-an-api-route";
    const ecran = "add-a-frontend-screen";
    const apiContent = read(dir, `.github/instructions/${api}.instructions.md`);
    assert.match(apiContent, /applyTo:\s*"backend\/\*\*"/);
    const ecranContent = read(dir, `.github/instructions/${ecran}.instructions.md`);
    assert.match(ecranContent, /applyTo:\s*"frontend\/\*\*"/);
  }
  // Pas livré si Copilot n'est pas sélectionné.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "codex", git: false }));
  assert.ok(!existsSync(join(dir, ".github", "instructions")));
});

test("QUA-055 : les README pointent vers la dernière version validée par un lien fixe, sans numéro de version à recommiter", () => {
  for (const chemin of ["../../../README.md", "../README.md"]) {
    const texte = readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), "utf8");
    assert.match(texte, /https:\/\/github\.com\/wdubilly\/drwil\/releases\/latest/, `${chemin} : lien releases/latest`);
    assert.doesNotMatch(texte, /drwil\/releases\/download\/v\d/, `${chemin} : aucun lien vers une version précise`);
  }
});

test("QUA-024 : dépôt neuf : init fournit un contrat métier d'exemple, contrôle à compléter, et le guide pour écrire le premier", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, ci: "none" }));
  const registre = readFileSync(join(dir, "docs/contracts.md"), "utf8");
  assert.match(registre, /^## APP-001 — Example business contract/m);
  assert.match(registre, /\*\*Manual\*\* : check to complete .*cite it here as \*\*Check\*\*/);
  assert.match(readFileSync(join(dir, "docs/recipes/adopt-the-kit.md"), "utf8"), /first business contract.*\n.*APP-001/);
  const exemple = (await verify({ targetDir: dir })).contracts.find((k) => k.id === "APP-001");
  assert.equal(exemple.status, "MANUAL", "à compléter : jamais prouvé tant que son contrôle manque");
  assert.match(exemple.reasons.join("\n"), /check to complete/);
});

test("QUA-030 : le registre livré et la recette d'adoption enseignent un contrôle par règle métier, filtré par l'ID, et le champ Tests", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "en", targetDir: dir, git: false, ci: "none" }));
  const registre = readFileSync(join(dir, "docs/contracts.md"), "utf8");
  assert.match(registre, /\*\*Proof\*\* : .*its own check .*grouped.*`node \.githooks\/contract-tests\.mjs APP-001`/);
  assert.match(registre, /list its file as \*\*Tests\*\*/);
  assert.match(registre, /^## QUA-029 — .*\n(.*\n)*\*\*Check\*\* : `contract-tests`/m);
  const recette = readFileSync(join(dir, "docs/recipes/adopt-the-kit.md"), "utf8");
  assert.match(recette, /\*\*One check per business rule\*\*/);
  assert.match(recette, /`pytest -k APP_001`, `go test -run APP001`/);
  assert.match(recette, /reports it as not\n\s+attributable/);
});

test("/drwil verify (Claude) : adaptateur de la CLI, jamais d'attestation par l'agent ; consigne dans AGENTS.md", async () => {
  for (const lang of ["fr", "en"]) {
    const dir = tmp();
    await quiet(() => init({ targetDir: dir, lang, tools: "claude", git: false }));
    const skill = read(dir, ".claude/skills/drwil/SKILL.md");
    assert.match(skill, /argument-hint: "\[verify\|/);
    assert.match(skill, /npx drwil verify --agent/);
    assert.doesNotMatch(
      skill.split("\n").find((l) => l.startsWith("argument-hint")),
      /attest/,
      "aucun argument attest",
    );
    assert.match(skill, /Never run `drwil attest`/);
    assert.match(read(dir, "AGENTS.md"), /drwil verify --agent/);
    assert.match(consignes(dir), /an agent never runs it/);
  }
});

test("QUA-015 : une fiche écrite d'après le modèle livré a la section de passation que le contrôle attend", async () => {
  const dir = tmp();
  await quiet(() => init({ targetDir: dir, lang: "en", git: false }));
  writeFileSync(join(dir, "docs/projects/une-fiche.md"), read(dir, "docs/projects/model-brief.md").replaceAll("YYYY-MM-DD", "2026-10-12"));
  const r = spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8", env: envTest });
  assert.doesNotMatch(r.stdout + r.stderr, /Hand-off/);
});

test("QUA-061 : AGENTS.md livré distingue une intention d'une demande de réalisation en SCOPING", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false }));
  const agents = consignes(dir).replace(/\s+/g, " ");
  assert.match(
    agents,
    /\*\*Intention or request\*\*: in SCOPING, a need the human expresses is framed \(an intention or a brief\), never coded/,
  );
  assert.match(agents, /ask "intention or implementation request\?" before acting/);
});

test("QUA-062 : un projet installé refuse au commit un en-tête de skill invalide en YAML strict, et nomme le fichier", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, git: false, tools: "claude" }));
  assert.ok(existsSync(join(dir, ".githooks/skill-headers.mjs")), "le module de contrôle est livré");
  const lancer = () => spawnSync(process.execPath, [".githooks/check-docs.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(lancer().status, 0, "les skills livrés se lisent en YAML strict");

  const skill = ".claude/skills/start-a-workstream/SKILL.md";
  const bon = read(dir, skill);
  writeFileSync(
    join(dir, skill),
    bon.replace(/^description: .*$/m, "description: Lance un chantier (plusieurs fiches: la file) puis la suite."),
  );
  const r = lancer();
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`${skill.replaceAll(".", "\\.")} : .*ligne 3.*description.*entre guillemets`));
});

test("QUA-072 : le skill /drwil-note a la forme des autres skills /drwil-*, et les hooks de Claude Code rejoués donnent leur sortie d'avant", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const enTete = (f) => /^---\nname: (drwil-[\w-]+)\ndescription: (.+)\n(?:[\w-]+: .+\n)*---\n\n/.exec(read(dir, f));
  for (const skill of ["start-a-workstream", "view-progress", "drwil-note"]) {
    const m = enTete(`.claude/skills/${skill}/SKILL.md`);
    assert.ok(m, `${skill} : en-tête name / description comme les autres skills /drwil-*`);
    assert.match(m[2], /\. Use /, `${skill} : la description dit quand l'utiliser`);
  }
  assert.equal(enTete(".claude/skills/drwil-note/SKILL.md")[1], "drwil-note");
  // Le sous-agent des contrôles (QUA-129) s'ajoute à l'arbre sans changer les hooks ni les skills : même en-tête.
  const agent = enTete(".claude/agents/drwil-checks.md");
  assert.equal(agent?.[1], "drwil-checks");
  assert.match(agent[2], /\. Use /);

  const rejouer = (script, entree) => spawnSync(process.execPath, [script], { cwd: dir, encoding: "utf8", input: JSON.stringify(entree) });
  const ecriture = { hook_event_name: "PreToolUse", tool_name: "Write", tool_input: { file_path: join(dir, "src/a.ts") } };
  const refus = rejouer(".claude/hooks/scope-reminder.mjs", ecriture);
  assert.equal(refus.status, 0);
  assert.deepEqual(JSON.parse(refus.stdout), {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        "Écriture refusée (QUA-016, scopeReminder : blocking) : aucune fiche de docs/projects/ ne couvre src/a.ts. Rattacher d'abord ce chemin, ou un motif qui le couvre, au bloc « scope » de la fiche du chantier en cours (ou à docs/projects/routine-maintenance.md pour une petite tâche), puis réessayer.",
    },
  });
  const sondage = { questions: [{ question: "Fiches ?", header: "drwil-start", multiSelect: false, options: [] }] };
  const vide = rejouer(".claude/hooks/prompt-hook.mjs", {
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: sondage,
    tool_response: { ...sondage, answers: { "Fiches ?": "docs/projects/absente.md" } },
  });
  assert.equal(vide.status, 0);
  assert.deepEqual(JSON.parse(vide.stdout), {
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext:
        "[drwil] ✗ lancement refusé : « docs/projects/absente.md » n'est pas une fiche cadrée (bloc scope commité, fiche non terminée)",
    },
    // Un refus s'affiche aussi à l'humain (QUA-179) : le contexte de l'agent seul peut ne jamais lui parvenir.
    systemMessage:
      "[drwil] ✗ lancement refusé : « docs/projects/absente.md » n'est pas une fiche cadrée (bloc scope commité, fiche non terminée)",
  });
});

test("QUA-129 : sous-agent drwil-checks livré avec Claude Code pour les contrôles longs ; consigne « si l'outil le permet » pour les autres", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const agent = read(dir, ".claude/agents/drwil-checks.md").replace(/\s+/g, " ");
  assert.match(agent, /Run `node \.githooks\/run-checks\.mjs` from the project root/);
  assert.match(agent, /Run `npx drwil verify --agent`/);
  assert.match(agent, /report their verdict/);
  const consigne =
    /Long checks in a subagent, if the tool allows it: with Claude Code, the `drwil-checks` subagent .* runs `run-checks` and `drwil verify --agent` and returns only the verdict and the failures.* Another tool: the same if it allows a subagent without write access, otherwise run them directly\./;
  assert.match(consignes(dir).replace(/\s+/g, " "), consigne);
  const codex = tmp();
  await quiet(() => init({ lang: "en", targetDir: codex, tools: "codex", git: false }));
  assert.equal(existsSync(join(codex, ".claude/agents/drwil-checks.md")), false, "sans Claude Code, pas d'arbre .claude");
  assert.match(consignes(codex).replace(/\s+/g, " "), consigne, "la consigne reste, pour tout outil");
});

test("QUA-130 : le sous-agent recopie mot pour mot verdict et contrats, sans accès à l'attestation ni à l'écriture ; « vérifié » sur cette seule ligne", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const texte = read(dir, ".claude/agents/drwil-checks.md");
  const outils = /^tools: (.+)$/m.exec(texte)?.[1].split(/,\s*/);
  assert.deepEqual(outils, ["Bash", "Read", "Grep", "Glob"], "liste fermée : aucun outil d'écriture");
  for (const ecriture of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) assert.ok(!outils.includes(ecriture), ecriture);
  const corps = texte.replace(/\s+/g, " ");
  assert.match(corps, /no file written or edited, no commit, no push, no fix attempted/);
  assert.match(corps, /You never run `drwil attest` nor `\.githooks\/release-verdict\.mjs`/);
  assert.match(corps, /every line copied word for word from the outputs, never rephrased, summarised, translated or completed/);
  assert.match(corps, /<the line containing "GOVERNANCE:">/);
  assert.match(corps, /failing contracts, contracts not verified, unproven criteria, attestation required, registry errors/);
  assert.match(corps, /reported as « not run » with its error: never as passed/);
  assert.match(corps, /The main session says « verified » only on the `GOVERNANCE: PASS` line you copied/);
  assert.match(consignes(dir).replace(/\s+/g, " "), /the main session says « verified » only on that copied line/);
});

test("QUA-061 : le skill /drwil-note appelle la commande de note et ne code rien — une note est toujours une intention", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const skill = read(dir, ".claude/skills/drwil-note/SKILL.md").replace(/\s+/g, " ");
  assert.match(skill, /node \.githooks\/note\.mjs "\$text"/);
  assert.match(skill, /always an intent, never an order to code\*\*/);
  assert.match(skill, /Do not code it, do not frame it, do not open a brief, do not move the activity/);
  assert.ok(existsSync(join(dir, ".githooks/note.mjs")), "la commande appelée est livrée avec le skill");
});

test("QUA-194 : ce dépôt déclare le contrôle de couverture du diff, avec exclusions justifiées, et sa copie est celle du gabarit", () => {
  const depot = fileURLToPath(new URL("../../../", import.meta.url));
  const cfg = JSON.parse(readFileSync(join(depot, ".drwil/ia-first.json"), "utf8"));
  const controle = cfg.checks.find((c) => c.id === "couverture-diff");
  assert.ok(controle, "contrôle couverture-diff déclaré");
  assert.equal(controle.ciJob, "checks");
  assert.match(controle.run, /check-diff-coverage\.mjs/);
  assert.ok(cfg.diffCoverage.lcov && cfg.diffCoverage.produce, "rapport et commande de production déclarés");
  assert.ok(
    cfg.diffCoverage.exclusions.every((e) => String(e.reason).trim()),
    "chaque exclusion est justifiée",
  );
  const copie = "check-diff-coverage.mjs";
  assert.equal(
    readFileSync(join(depot, ".githooks", copie), "utf8"),
    readFileSync(join(depot, "packages/drwil/templates/common/base/.githooks", copie), "utf8"),
    "la copie du dépôt est le gabarit",
  );
});

// QUA-195 à QUA-197 : la définition de l'e2e par forme et les niveaux de garantie de l'attestation.
const CATALOGUE_GABARIT = join(GABARIT, "base/docs/contracts-catalog.md");

const RECETTE_ADOPTION_GABARIT = join(GABARIT, "base/docs/recipes/adopt-the-kit.md");

const PREUVES_GABARIT = join(GABARIT, "base/docs/ia-first/5-proving-the-work.md");

test("QUA-195 : le catalogue définit l'e2e une seule fois, avec une ligne par forme de projet, sans exception", () => {
  const gabarit = readFileSync(CATALOGUE_GABARIT, "utf8");
  assert.match(gabarit, /^## What "end to end" means \(`catalog:QUA-020`\)$/m);
  const section = gabarit.split(/^## What "end to end" means/m)[1];
  assert.match(section, /no stand-in/);
  assert.match(section, /no exception or waiver/);
  for (const forme of ["Library", "Service", "Web application"])
    assert.match(section, new RegExp(`^\\| ${forme} \\|`, "m"), `ligne « ${forme} »`);
  assert.match(section, /installs the package as a client would/);
  const depot = readFileSync(join(DEPOT, "docs/contracts-catalog.md"), "utf8");
  assert.match(depot, /^## Ce que « de bout en bout » veut dire \(`catalogue:QUA-020`\)$/m);
  const sectionDepot = depot.split(/^## Ce que « de bout en bout » veut dire/m)[1];
  for (const forme of ["Bibliothèque", "Service", "Application web"])
    assert.match(sectionDepot, new RegExp(`^\\| ${forme} \\|`, "m"), `ligne « ${forme} » du dépôt`);
  assert.match(sectionDepot, /ni exception ni dérogation/);
});

test("QUA-196 : la recette d'adoption renvoie à la définition de l'e2e sans la recopier, gabarit et copie identiques", () => {
  const recette = readFileSync(RECETTE_ADOPTION_GABARIT, "utf8");
  assert.match(recette, /What "end to end" means/);
  const section = readFileSync(CATALOGUE_GABARIT, "utf8").split(/^## What "end to end" means/m)[1];
  const lignes = section.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| Project shape"));
  assert.ok(lignes.length >= 3, "le tableau de formes existe au catalogue");
  for (const ligne of lignes) assert.ok(!recette.includes(ligne), `la recette ne recopie pas : ${ligne.slice(0, 40)}`);
  assert.ok(!recette.includes("installs the package as a client"), "la recette ne recopie pas la définition");
  assert.equal(readFileSync(join(DEPOT, "docs/recipes/adopt-the-kit.md"), "utf8"), recette);
});

test("QUA-196 : la recette et la compétence d'adoption proposent runAt [\"ci\"] pour l'e2e, renvoient au catalogue sans le recopier, gabarit et copies identiques", () => {
  const recette = readFileSync(RECETTE_ADOPTION_GABARIT, "utf8");
  const competence = readFileSync(join(GABARIT, "tools/claude/.claude/skills/adopt-the-kit/SKILL.md"), "utf8");
  for (const [nom, texte] of [
    ["recette", recette],
    ["compétence", competence],
  ]) {
    const plat = texte.replace(/\s+/g, " ");
    assert.match(plat, /e2e check[^.]*`"runAt": \["ci"\]`/, `${nom} : e2e proposé en runAt ["ci"]`);
    assert.match(plat, /What "end to end" means/, `${nom} : renvoi à la définition du catalogue`);
    assert.ok(!plat.includes("installs the package as a client"), `${nom} : la définition n'est pas recopiée`);
  }
  assert.match(recette.replace(/\s+/g, " "), /GOVERNANCE: PASS \(CI pending\)/);
  assert.equal(readFileSync(join(DEPOT, ".claude/skills/adopt-the-kit/SKILL.md"), "utf8"), competence);
});

test("QUA-197 : la doc des preuves distingue identité, approbation et preuve d'exécution de l'attestation, gabarit et copie identiques", () => {
  const texte = readFileSync(PREUVES_GABARIT, "utf8");
  assert.match(texte, /^## What an attestation guarantees: identity, approval, proof of execution$/m);
  const section = texte.split(/^## What an attestation guarantees/m)[1].split(/^## /m)[0];
  for (const niveau of ["Proof of execution", "Approval", "Identity"])
    assert.match(section, new RegExp(`\\*\\*${niveau}\\*\\* \\(`), `niveau « ${niveau} »`);
  assert.match(section, /\*\*Identity\*\* \(not guaranteed\)/);
  assert.match(section, /git\s+configuration/);
  assert.match(section, /no exception\s+or waiver/);
  assert.equal(readFileSync(join(DEPOT, "docs/ia-first/5-proving-the-work.md"), "utf8"), texte);
});

test("QUA-203 init demande les outils IA à l'humain et ne les choisit jamais à sa place", async () => {
  const { chooseTools, askTerminal } = await import("../dist/cli-install.js");
  const { PassThrough } = await import("node:stream");
  const entree = new PassThrough();
  entree.end("codex\n");
  assert.equal(await askTerminal("? ", entree, new PassThrough()), "codex");
  const dir = mkdtempSync(join(tmpdir(), "drwil-tools-"));
  after(() => rmSync(dir, { recursive: true, force: true }));
  const jamais = async () => assert.fail("aucune question attendue");
  // Sans terminal, première installation : refus qui nomme l'option, rien d'écrit.
  await assert.rejects(() => chooseTools(dir, undefined, false, jamais), /--tools/);
  // --tools explicite : respecté, sans question.
  assert.equal(await chooseTools(dir, "codex", false, jamais), "codex");
  // En terminal : la question est posée, « all » et une liste sont acceptés, une réponse vide est refusée.
  assert.equal(await chooseTools(dir, undefined, true, async () => "all"), "claude,codex,cursor,gemini,copilot");
  assert.equal(await chooseTools(dir, undefined, true, async () => " claude,codex "), "claude,codex");
  await assert.rejects(() => chooseTools(dir, undefined, true, async () => "  "), /--tools/);
  // Mise à jour : les outils déjà enregistrés servent, aucune question.
  mkdirSync(join(dir, ".drwil"), { recursive: true });
  writeFileSync(join(dir, ".drwil", "ia-first.json"), JSON.stringify({ tools: ["claude"] }));
  assert.equal(await chooseTools(dir, undefined, false, jamais), undefined);
  // Le binaire, sans terminal : première installation refusée, rien d'écrit.
  const vide = mkdtempSync(join(tmpdir(), "drwil-tools-cli-"));
  after(() => rmSync(vide, { recursive: true, force: true }));
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "init", "--no-git"], {
    cwd: vide,
    encoding: "utf8",
    stdio: "pipe",
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--tools/);
  assert.equal(existsSync(join(vide, ".drwil")), false);
});

test("QUA-204 : le gabarit Claude Code livre les lectures gh et outils .githooks sans demande, push, merge et rebase gardent la demande", () => {
  const perm = JSON.parse(
    readFileSync(join(GABARIT, "tools/claude/.claude/settings.json"), "utf8").replace("{{stackAllowJson}}", ""),
  ).permissions;
  for (const regle of [
    "Bash(gh pr view:*)",
    "Bash(gh pr checks:*)",
    "Bash(node .githooks/state.mjs)",
    "Bash(node .githooks/glossary.mjs:*)",
  ])
    assert.ok(perm.allow.includes(regle), regle);
  for (const regle of ["Bash(git push:*)", "Bash(git merge:*)", "Bash(git rebase:*)"]) {
    assert.ok(perm.ask.includes(regle), regle);
    assert.ok(!perm.allow.includes(regle), regle);
  }
  // Une règle allow n'ouvre rien que les refus ne ferment : le contournement des hooks reste interdit.
  assert.ok(perm.deny.some((r) => r.includes("--no-verify")));
});

test("QUA-207 : la recette d'adoption et INSTALL.md disent le commit initial de init et pourquoi une autorisation n'est pas demandée", () => {
  const recette = readFileSync(join(GABARIT, "base/docs/recipes/adopt-the-kit.md"), "utf8");
  assert.match(recette, /`init` has already committed the kit itself/);
  assert.match(recette, /workstream\/kit-installation/);
  assert.match(recette, /`scopeGate` is `blocking`/);
  const install = readFileSync(join(DEPOT, "INSTALL.md"), "utf8");
  assert.match(install, /### First commit of a new project/);
  assert.match(install, /commits the kit itself, before enabling the hooks/);
  assert.match(install, /### Permission prompts in Claude Code/);
  assert.match(install, /an allow rule opens no gesture that the hooks or the forge refuse/);
});
