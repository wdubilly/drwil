#!/usr/bin/env node
// Port Node de run-box-v2:.githooks/check-control-coverage.py (QUA-013) : un
// contrôle « dégradable » (gitleaks absent…) qui ne tourne pas localement ne
// doit avoir aucun angle mort — un job CI doit se déclencher sur les mêmes
// chemins. Vérifier que le job existe ne suffit pas : un job peut exister et
// ne jamais se déclencher si ses `paths`/`rules: changes` ne couvrent pas ces
// chemins. On vérifie donc le déclenchement, pas le nom.
//
// Contrôles du socle, en dur (chaque nouveau contrôle de run-checks.mjs doit
// être ajouté ici) ; les contrôles du projet (.drwil/ia-first.json → checks)
// peuvent se couvrir eux aussi en ajoutant chemins + ciJob (et degradable si
// besoin) — sinon ils ne sont pas vérifiés, par compatibilité.
import { existsSync, readFileSync } from "node:fs";

const SOCLE = [
  {
    id: "secrets-fichiers",
    degradable: true,
    degradation: "gitleaks absent du poste : le hook ne contrôle pas les secrets",
    chemins: ["**"],
    ciJob: "checks",
  },
  {
    id: "docs-references",
    degradable: false,
    chemins: ["AGENTS.md", "CLAUDE.md", "GEMINI.md", "README.md", "INSTALL.md", "docs/**", ".claude/**", ".githooks/**"],
    ciJob: "checks",
  },
  { id: "controles-autotest", degradable: false, chemins: [".githooks/**"], ciJob: "checks" },
];

let cfg = {};
try {
  cfg = JSON.parse(readFileSync(".drwil/ia-first.json", "utf8"));
} catch {}
const lang = cfg.lang === "en" ? "en" : "fr";
const T = {
  fr: {
    titre: "Contrôles (QUA-013) : couverture CI absente ou inopérante :",
    jobAbsent: (id, job, f) => `${id} : job CI « ${job} » absent de ${f}`,
    pasDeChemin: (id) => `${id} : aucun chemin déclaré (que doit protéger ce contrôle ?)`,
    neDeclenchePas: (id, job, glob, f, declenche) =>
      `${id} : le job CI « ${job} » (${f}) ne se déclenche pas sur \`${glob}\` (changes : ${declenche})`,
    jamaisRattrape: " ; dégradable : rien ne le rattrape localement",
  },
  en: {
    titre: "Checks (QUA-013): missing or inoperative CI coverage:",
    jobAbsent: (id, job, f) => `${id}: CI job "${job}" missing from ${f}`,
    pasDeChemin: (id) => `${id}: no path declared (what should this check protect?)`,
    neDeclenchePas: (id, job, glob, f, declenche) =>
      `${id}: CI job "${job}" (${f}) does not trigger on \`${glob}\` (changes: ${declenche})`,
    jamaisRattrape: "; degradable: nothing catches it locally",
  },
}[lang];

/** Façon fnmatch de GitLab/GitHub : `**` traverse les `/`, `*` non. */
function globEnRegex(glob) {
  let sortie = "";
  for (let i = 0; i < glob.length; ) {
    if (glob.startsWith("**/", i)) {
      sortie += "(?:.*/)?";
      i += 3;
    } else if (glob.startsWith("**", i)) {
      sortie += ".*";
      i += 2;
    } else if (glob[i] === "*") {
      sortie += "[^/]*";
      i += 1;
    } else {
      sortie += glob[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${sortie}$`);
}

/** Un chemin concret sous un glob, pour savoir si une règle le déclencherait. */
function echantillon(glob) {
  return glob.replace(/\*\*/g, "a/b").replace(/\*/g, "a");
}

const NON_JOBS = new Set(["stages", "variables", "default", "include", "workflow", "image", "services", "cache", "before_script", "after_script", "types"]);

/** Nom de job GitLab -> { toujours, changes } (rules: changes:). */
function jobsGitlab(texte) {
  const jobs = {};
  let nom = null;
  let bloc = [];
  const vider = () => {
    if (nom) jobs[nom] = analyser(bloc);
    nom = null;
    bloc = [];
  };
  const analyser = (lignes) => {
    const changes = [];
    let dans = false;
    for (const ligne of lignes) {
      if (/^\s*(?:-\s+)?changes:\s*$/.test(ligne)) {
        dans = true;
        continue;
      }
      const item = /^\s*-\s+(\S.*?)\s*$/.exec(ligne);
      if (dans && item) {
        changes.push(item[1].replace(/^["']|["']$/g, ""));
        continue;
      }
      if (dans && !item) dans = false;
    }
    return { toujours: !lignes.some((l) => /^\s+(?:-\s+)?rules:\s*$/.test(l)), changes };
  };
  for (const ligne of texte.split("\n")) {
    const entete = /^([A-Za-z0-9_.-]+):\s*$/.exec(ligne);
    if (entete && !NON_JOBS.has(entete[1])) {
      vider();
      nom = entete[1];
      bloc = [];
      continue;
    }
    if (nom && ligne.trim() && !/^[ \t]/.test(ligne)) {
      vider();
      continue;
    }
    if (nom) bloc.push(ligne);
  }
  vider();
  return jobs;
}

/**
 * Nom de job GitHub Actions -> { toujours, changes }. GitHub Actions ne
 * filtre pas un job par chemin nativement (contrairement à GitLab
 * `rules: changes`) : seul `on: push/pull_request: paths:`, au niveau du
 * workflow, existe — il s'applique alors à tous les jobs du fichier. Sans ce
 * filtre (notre modèle par défaut), le workflow tourne à chaque push, donc
 * chaque job aussi : couverture totale, triviale mais réelle.
 */
function jobsGithub(texte) {
  const lignes = texte.split("\n");
  const chemins = [];
  let dansOn = false;
  let dansPaths = false;
  for (const ligne of lignes) {
    if (/^on:\s*$/.test(ligne)) {
      dansOn = true;
      continue;
    }
    if (dansOn && /^\S/.test(ligne)) dansOn = false;
    if (dansOn && /^\s+paths:\s*$/.test(ligne)) {
      dansPaths = true;
      continue;
    }
    const item = /^\s*-\s+(\S.*?)\s*$/.exec(ligne);
    if (dansPaths && item) {
      chemins.push(item[1].replace(/^["']|["']$/g, ""));
      continue;
    }
    if (dansPaths && !item) dansPaths = false;
  }
  const noms = [];
  let dansJobs = false;
  for (const ligne of lignes) {
    if (/^jobs:\s*$/.test(ligne)) {
      dansJobs = true;
      continue;
    }
    if (dansJobs) {
      if (/^\S/.test(ligne)) {
        dansJobs = false;
        continue;
      }
      const m = /^ {2}([A-Za-z0-9_.-]+):\s*$/.exec(ligne);
      if (m) noms.push(m[1]);
    }
  }
  const job = { toujours: chemins.length === 0, changes: chemins };
  return Object.fromEntries(noms.map((n) => [n, job]));
}

function jobsCi(fichier) {
  if (!existsSync(fichier)) return null;
  const texte = readFileSync(fichier, "utf8");
  return fichier.endsWith(".gitlab-ci.yml") ? jobsGitlab(texte) : jobsGithub(texte);
}

function couvre(job, chemin) {
  return job.toujours || job.changes.some((g) => globEnRegex(g).test(chemin));
}

const ciFiles = Array.isArray(cfg.ciFiles) ? cfg.ciFiles : [];
const controles = [...SOCLE, ...((Array.isArray(cfg.checks) ? cfg.checks : []).filter((c) => c.ciJob))];
const erreurs = [];

for (const fichier of ciFiles) {
  const jobs = jobsCi(fichier);
  if (!jobs) continue;
  for (const c of controles) {
    if (!jobs[c.ciJob]) {
      erreurs.push(T.jobAbsent(c.id, c.ciJob, fichier));
      continue;
    }
    if (!c.chemins?.length) {
      erreurs.push(T.pasDeChemin(c.id));
      continue;
    }
    for (const glob of c.chemins) {
      if (!couvre(jobs[c.ciJob], echantillon(glob))) {
        const declenche = jobs[c.ciJob].changes.join(", ") || (lang === "en" ? "none" : "aucun");
        erreurs.push(T.neDeclenchePas(c.id, c.ciJob, glob, fichier, declenche) + (c.degradable ? T.jamaisRattrape : ""));
      }
    }
  }
}

if (erreurs.length) {
  console.log(`${T.titre}\n  ${erreurs.join("\n  ")}`);
  process.exit(1);
}
