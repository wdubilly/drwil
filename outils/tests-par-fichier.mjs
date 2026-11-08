#!/usr/bin/env node
// Contrôle `tests-<id>` (QUA-033) : le verdict d'un contrat, lu dans l'exécution unique de chaque fichier de test.
// Avant, 238 contrôles relançaient chacun `node --test --test-name-pattern` sur les mêmes gros fichiers ; ici un fichier
// n'est lancé qu'une fois par passe de `run-checks` (DRWIL_PASS_ID, posé par le moteur), le verdict par ID de contrat
// étant lu dans les résultats qu'un reporter y a laissés. Hors passe (lancement à la main), le fichier est rejoué.
// Usage : node outils/tests-par-fichier.mjs <ID> <fichier>...   (verdict d'un contrat)
//         node outils/tests-par-fichier.mjs --tous <fichier>...  (tous les tests de chaque fichier doivent passer)
// Le module est aussi le reporter donné à `node --test` : une ligne JSON { nom, ok } par test.
import { spawnSync } from "node:child_process";
import { globSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE = fileURLToPath(import.meta.url);
const CACHE = join(".drwil", "evidence", "passe");

export default async function* reporter(source) {
  for await (const e of source) {
    if (e.type === "test:pass" || e.type === "test:fail") yield `${JSON.stringify({ nom: e.data.name, ok: e.type === "test:pass" })}\n`;
  }
}

const attendre = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Joue le fichier (une fois) : { tests: [{ nom, ok }], code, sortie }. */
function jouer(fichier, dossier) {
  mkdirSync(dossier, { recursive: true });
  const resultats = join(dossier, "resultats.jsonl");
  // NODE_TEST_CONTEXT : sous un `node --test` parent, l'enfant serait sauté sans bruit et rendrait 0 (faux PASS).
  const env = { ...process.env, NODE_TEST_CONTEXT: undefined };
  const r = spawnSync(
    process.execPath,
    [
      "--test",
      "--test-reporter=spec",
      "--test-reporter=" + MODULE,
      `--test-reporter-destination=stdout`,
      `--test-reporter-destination=${resultats}`,
      fichier,
    ],
    { encoding: "utf8", env, maxBuffer: 1 << 30 },
  );
  let lignes = "";
  try {
    lignes = readFileSync(resultats, "utf8");
  } catch {}
  const tests = lignes
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  return { tests, code: r.error ? 1 : r.status, sortie: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? r.error.message : ""}` };
}

/** Résultat du fichier pour cette passe : le premier qui arrive le joue, les autres l'attendent (jamais deux lancements). */
function resultat(fichier, passe) {
  if (!passe) {
    const dossier = join(CACHE, `seul-${process.pid}-${Date.now()}`);
    const r = jouer(fichier, dossier);
    rmSync(dossier, { recursive: true, force: true });
    return r;
  }
  const racine = join(CACHE, passe);
  const cle = fichier.replace(/[^\w.-]+/g, "_");
  const final = join(racine, `${cle}.json`);
  const verrou = join(racine, `${cle}.verrou`);
  mkdirSync(racine, { recursive: true });
  // Une passe d'avant ne sert à personne : son dossier est effacé.
  for (const d of readdirSync(CACHE)) if (d !== passe) rmSync(join(CACHE, d), { recursive: true, force: true });
  const lire = () => {
    try {
      return JSON.parse(readFileSync(final, "utf8"));
    } catch {
      return null;
    }
  };
  for (let attente = 0; attente < 3000; attente++) {
    const deja = lire();
    if (deja) return deja;
    try {
      mkdirSync(verrou);
    } catch {
      attendre(200);
      continue;
    }
    const r = jouer(fichier, join(racine, `${cle}.travail`));
    writeFileSync(`${final}.tmp`, JSON.stringify(r));
    renameSync(`${final}.tmp`, final);
    rmSync(join(racine, `${cle}.travail`), { recursive: true, force: true });
    return r;
  }
  // Le verrou n'a jamais été levé (processus mort) : ce contrôle joue le fichier lui-même.
  return jouer(fichier, join(racine, `${cle}.secours-${process.pid}`));
}

/** Verdict : { ok, lignes }. `id` null : tous les tests de chaque fichier doivent passer. */
export function verdict(id, fichiers, lire) {
  const lignes = [];
  let concernes = 0;
  const motif = id ? new RegExp(`^${id}(?![\\w-])`) : null;
  for (const fichier of fichiers) {
    const r = lire(fichier);
    const choisis = motif ? r.tests.filter((t) => motif.test(t.nom)) : r.tests;
    concernes += choisis.length;
    const echecs = choisis.filter((t) => !t.ok);
    const avant = lignes.length;
    // Un fichier qui n'a rien joué (erreur de chargement, processus mort) ne prouve aucun contrat.
    const mort = !r.tests.length && r.code !== 0;
    if (!id && r.code !== 0) lignes.push(`${fichier} : code ${r.code}`);
    if (mort) lignes.push(`${fichier} : aucun test joué, code ${r.code}`);
    for (const t of echecs) lignes.push(`${fichier} : ✗ ${t.nom}`);
    if (lignes.length > avant) lignes.push(r.sortie.split("\n").slice(-40).join("\n"));
  }
  if (id && !concernes) lignes.push(`aucun test de ${fichiers.join(", ")} ne porte l'ID ${id}`);
  return { ok: !lignes.length, lignes };
}

if (process.argv[1] === MODULE) {
  const [premier, ...demandes] = process.argv.slice(2);
  // Un motif (« outils/*.test.mjs ») est développé ici : le même contrôle sous tous les interpréteurs de commandes.
  const fichiers = demandes.flatMap((d) => (d.includes("*") ? globSync(d).sort() : [d]));
  const id = premier === "--tous" ? null : premier;
  if (!premier || !fichiers.length) {
    console.error("usage : node outils/tests-par-fichier.mjs <ID | --tous> <fichier>...");
    process.exit(2);
  }
  const passe = process.env.DRWIL_PASS_ID;
  const memo = new Map();
  const { ok, lignes } = verdict(id, fichiers, (f) => memo.get(f) ?? memo.set(f, resultat(f, passe)).get(f));
  for (const l of lignes) console.error(l);
  if (ok) console.log(`${id ?? "tests"} : ${fichiers.length} fichier(s), verdict lu dans une exécution par fichier`);
  process.exitCode = ok ? 0 : 1;
}
