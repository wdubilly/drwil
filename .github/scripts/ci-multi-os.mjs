#!/usr/bin/env node
// Matrice des OS de kit-tests (contrat QUA-045). Les checks « kit-tests (<os>) » sont exigés par le
// ruleset de master : sur une PR, les trois sont toujours rapportés, mais seul Ubuntu y lance la suite
// (aucun si la PR ne touche que la documentation). Windows et macOS ne lancent la suite qu'au push d'un
// tag de release et à un lancement manuel du workflow : c'est là que la release se joue. Un push de
// branche, master compris, ne rapporte qu'Ubuntu (un check vert sans tests sur le commit d'une PR
// masquerait son échec).
// En CI : lit GITHUB_EVENT_NAME, GITHUB_REF, et pour une PR BASE et TETE, puis écrit `matrice=<json>`
// dans GITHUB_OUTPUT. Un diff illisible fait échouer le job : jamais de matrice devinée.
import { execFileSync } from "node:child_process";
import { appendFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OS = [
  {
    os: "ubuntu-latest",
    gitleaks: "gitleaks_8.21.2_linux_x64.tar.gz",
    sha256: "5bc41815076e6ed6ef8fbecc9d9b75bcae31f39029ceb55da08086315316e3ba",
  },
  {
    os: "macos-latest",
    gitleaks: "gitleaks_8.21.2_darwin_arm64.tar.gz",
    sha256: "cad3de5dc9a4d5447d967a70a4d49499c557f04db028274cc324f9ff983f6502",
  },
  {
    os: "windows-latest",
    gitleaks: "gitleaks_8.21.2_windows_x64.zip",
    sha256: "f238c85e5f47e18fac779ce71ee11091cf70a0a8fb4415f165efba2800eef133",
  },
];

/** Vrai sauf si chaque fichier est de la documentation : `docs/**` ou la ligne de consommation de la clôture. */
export function codeTouche(fichiers) {
  if (!fichiers.length) return true;
  return fichiers.some((f) => !f.startsWith("docs/") && f !== ".drwil/usage.jsonl");
}

/** Tag posé par la release : `vX.Y.Z` ou `vX.Y.Z-rc.N`. */
const TAG_RELEASE = /^refs\/tags\/v\d+\.\d+\.\d+(?:-rc\.\d+)?$/;

const RAISON_RELEASE =
  "Windows et macOS ne lancent la suite qu'au push d'un tag de release (vX.Y.Z, vX.Y.Z-rc.N) ou par un lancement manuel du workflow (QUA-045).";
const RAISON_DOC = "la PR ne touche que la documentation (docs/, .drwil/usage.jsonl), le job checks y rejoue les contrôles.";

/** Lignes de la matrice : { os, gitleaks, sha256, tester, raison } ; `raison` dit pourquoi un OS rapporté ne teste pas. */
export function matrice({ evenement, ref = "", fichiers = [] }) {
  const tous = OS.map((o) => ({ ...o, tester: true, raison: "" }));
  if (evenement === "pull_request") {
    const code = codeTouche(fichiers);
    return OS.map((o, i) => {
      const tester = code && i === 0;
      return { ...o, tester, raison: tester ? "" : code ? RAISON_RELEASE : RAISON_DOC };
    });
  }
  if (evenement === "push") return TAG_RELEASE.test(ref) ? tous : [tous[0]];
  // workflow_dispatch, ou un événement inattendu : jamais moins d'OS que ce qu'on ne sait pas exclure.
  return tous;
}

function principal() {
  const env = process.env;
  const pr = env.GITHUB_EVENT_NAME === "pull_request";
  // --no-renames : un fichier de code déplacé sous docs/ compte encore par son ancien chemin.
  const fichiers = pr
    ? execFileSync("git", ["diff", "--name-only", "--no-renames", `${env.BASE}...${env.TETE}`], { encoding: "utf8" })
        .split("\n")
        .filter(Boolean)
    : [];
  const m = matrice({ evenement: env.GITHUB_EVENT_NAME, ref: env.GITHUB_REF, fichiers });
  if (pr) console.log(`${fichiers.length} fichier(s) dans la PR ; code touché : ${codeTouche(fichiers) ? "oui" : "non"}`);
  for (const l of m) console.log(`${l.os} : ${l.tester ? "suite lancée" : `rapporté sans tests : ${l.raison}`}`);
  appendFileSync(env.GITHUB_OUTPUT, `matrice=${JSON.stringify(m)}\n`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) principal();
