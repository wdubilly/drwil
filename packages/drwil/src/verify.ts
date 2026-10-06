// `drwil verify` : gate de validation du travail (DRWIL-003,
// docs/projets/drwil-v0-2-gouvernance-executable.md). Chaîne
// obligation (contrat) → contrôle → preuve → verdict. Un travail n'est
// vérifié par drwil que si le verdict est PASS : FAIL est à corriger,
// MANUAL n'est pas encore validé (jamais une réussite différée), ERROR
// signifie que drwil ne peut pas établir le verdict.
//
// Aucun contrôle n'est implémenté ici : verify charge le moteur installé dans
// le projet (.githooks/moteur.mjs), le même que les hooks git (ADR-003), et le
// lecteur de contrats (.githooks/contrats.mjs). Les hooks n'ont donc jamais
// besoin de drwil, et il n'existe qu'une implémentation de chaque contrôle.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** ATTESTED (DRWIL-013) : la partie automatisée est prouvée et la partie humaine a une attestation
 *  valide. Distinct de PASS (preuve entièrement automatique), mais satisfait le contrat. */
export type Statut = "PASS" | "ATTESTED" | "FAIL" | "MANUAL" | "ERROR";

export interface ResultatControle {
  id: string;
  /** Résultat brut du moteur : ok | echec | non-execute | non-applicable | inconnu. */
  statut: string;
  detail?: string;
  message?: string;
  sortie?: string;
}

export type Severite = "bloquant" | "avertissement" | "indicatif";

export interface ResultatContrat {
  id: string;
  titre: string;
  regle: string | null;
  statut: Statut;
  /** Attestation humaine valide retenue (statut ATTESTED), sinon null. */
  attestation: Attestation | null;
  /** Éligible à `drwil attest` : partie automatisée prouvée, partie humaine restante. */
  attestable: boolean;
  /** Empreinte actuelle du contrat et de sa preuve. */
  empreinte: string;
  /** DRWIL-020 : seuls les contrats bloquants décident du verdict global. */
  severite: Severite;
  controles: ResultatControle[];
  manuel: string | null;
  raisons: string[];
}

export interface Verdict {
  statut: Statut;
  /** 0 PASS ; 1 FAIL ou MANUAL ; 2 ERROR (configuration, outillage, exécution). */
  code: 0 | 1 | 2;
  contrats: ResultatContrat[];
  /** Erreurs qui ne se rattachent pas à un seul contrat (moteur absent, registre vide, doublon…). */
  erreurs: string[];
  /** Contrôles du moteur qu'aucun contrat ne cite : non exécutés par verify, signalés pour information. */
  nonRattaches: string[];
}

export interface VerifyOptions {
  targetDir: string;
  /** Ne vérifier que ces contrats (et n'exécuter que leurs contrôles) : utilisé par `drwil attest`. */
  seulement?: string[];
}

export interface Attestation {
  version: 1;
  contract: string;
  status: "ATTESTED";
  attestedAt: string;
  actor: { name: string; source: string } | null;
  note: string | null;
  fingerprint: string;
  commit: string | null;
  automated: { id: string; status: string }[];
}

/** Dossier versionné des attestations (le reste de .drwil/evidence/ est hors git). */
export const DOSSIER_ATTESTATIONS = [".drwil", "evidence", "attestations"];

/**
 * Empreinte de ce qu'une attestation couvre : le texte du contrat et la définition des contrôles
 * qu'il cite (commande et dossier d'un contrôle du projet). Si l'un change, l'attestation est obsolète.
 */
export function empreinte(k: { texte?: string; controles?: string[] | null }, cfg: Record<string, any>): string {
  const checks: any[] = Array.isArray(cfg.checks) ? cfg.checks : [];
  const preuve = (k.controles ?? []).map((id) => {
    const c = checks.find((x) => x.id === id);
    return c ? { id, run: c.run, cwd: c.cwd ?? null } : { id };
  });
  return createHash("sha256").update(JSON.stringify({ contrat: k.texte ?? "", preuve })).digest("hex");
}

export function lireAttestations(root: string): Attestation[] {
  const dossier = join(root, ...DOSSIER_ATTESTATIONS);
  if (!existsSync(dossier)) return [];
  const toutes: Attestation[] = [];
  for (const f of readdirSync(dossier).filter((f) => f.endsWith(".json"))) {
    try {
      const a = JSON.parse(readFileSync(join(dossier, f), "utf8"));
      if (a?.status === "ATTESTED" && typeof a.contract === "string" && typeof a.fingerprint === "string") toutes.push(a);
    } catch {}
  }
  return toutes.sort((a, b) => String(b.attestedAt).localeCompare(String(a.attestedAt)));
}

const CODES: Record<Statut, 0 | 1 | 2> = { PASS: 0, ATTESTED: 0, FAIL: 1, MANUAL: 1, ERROR: 2 };

/**
 * Priorité déterministe, par contrat comme pour le verdict global :
 * FAIL > ERROR > MANUAL > PASS. FAIL l'emporte (un manquement est établi) ;
 * ERROR passe avant MANUAL (une preuve qui n'a pas pu être produite rend le
 * verdict indéterminable) ; PASS seulement si tout est prouvé.
 */
function pire(statuts: Statut[]): Statut {
  for (const s of ["FAIL", "ERROR", "MANUAL"] as const) if (statuts.includes(s)) return s;
  return "PASS";
}

function erreurGlobale(message: string): Verdict {
  return { statut: "ERROR", code: 2, contrats: [], erreurs: [message], nonRattaches: [] };
}

export interface Projet {
  cfg: Record<string, any>;
  registre: string;
  moteur: any;
  lecteur: any;
}

/**
 * Charge le moteur et le lecteur de contrats installés dans le projet (jamais ceux du paquet) :
 * verify, doctor et contracts jugent ce que les hooks du projet exécutent réellement.
 * Rend un message d'erreur si le projet n'est pas exploitable.
 */
export async function chargerProjet(root: string): Promise<Projet | string> {
  const moteurPath = join(root, ".githooks", "moteur.mjs");
  const lecteurPath = join(root, ".githooks", "contrats.mjs");
  if (!existsSync(moteurPath) || !existsSync(lecteurPath)) {
    return "moteur de contrôles absent (.githooks/moteur.mjs, .githooks/contrats.mjs) : relancer `drwil apply`";
  }
  let cfg: Record<string, any>;
  try {
    cfg = JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8"));
  } catch {
    return "configuration illisible ou absente (.drwil/ia-first.json)";
  }
  const registre: string = cfg.dirs?.contracts ?? (cfg.lang === "en" ? "docs/contracts.md" : "docs/contrats.md");
  if (!existsSync(join(root, registre))) return `registre des contrats absent (${registre})`;
  const moteur = await import(pathToFileURL(moteurPath).href);
  const lecteur = await import(pathToFileURL(lecteurPath).href);
  return { cfg, registre, moteur, lecteur };
}

export async function verify(opts: VerifyOptions): Promise<Verdict> {
  const root = opts.targetDir;
  const projet = await chargerProjet(root);
  if (typeof projet === "string") return erreurGlobale(projet);
  const { cfg, registre, moteur, lecteur } = projet;
  const tous: any[] = lecteur.lireContrats(readFileSync(join(root, registre), "utf8"));
  if (!tous.length) return erreurGlobale(`aucun contrat trouvé dans ${registre}`);
  const contrats = opts.seulement ? tous.filter((k) => opts.seulement!.includes(k.id)) : tous;
  const attestations = lireAttestations(root);

  // Un doublon rend le registre lui-même ambigu : erreur globale. Les autres erreurs portent sur un contrat.
  const erreurs: string[] = [];
  const parContrat = new Map<string, string[]>();
  for (const e of lecteur.validerContrats(tous, lecteur.controlesConnus(cfg), cfg.lang) as { id: string; type: string; message: string }[]) {
    if (e.type === "doublon") erreurs.push(e.message);
    else parContrat.set(e.id, [...(parContrat.get(e.id) ?? []), e.message]);
  }

  // `complet` : verify juge le dépôt entier (ex. gitleaks sur tout l'historique), pas un index vide.
  const disponibles = new Map<string, any>(moteur.controles(root, { cfg, complet: true }).map((c: any) => [c.id, c]));
  const cache = new Map<string, ResultatControle>();
  const executer = (id: string): ResultatControle => {
    const connu = cache.get(id);
    if (connu) return connu;
    const c = disponibles.get(id);
    const r: ResultatControle = c ? { id, ...c.executer({ stdio: "pipe" }) } : { id, statut: "inconnu" };
    cache.set(id, r);
    return r;
  };

  const resultats: ResultatContrat[] = contrats.map((k) => {
    const raisons = [...(parContrat.get(k.id) ?? [])];
    const statuts: Statut[] = raisons.length ? ["ERROR"] : [];
    // Un contrôle inconnu est déjà une erreur de validation : il n'est pas « exécuté ».
    const controles = ((k.controles ?? []) as string[]).filter((id) => disponibles.has(id)).map(executer);
    for (const r of controles) {
      if (r.statut === "ok") raisons.push(`${r.id} : ok (automatisé)`);
      else if (r.statut === "echec") {
        statuts.push("FAIL");
        raisons.push(`${r.id} : échec${r.message ? ` — ${r.message}` : ""}`);
        // Les dernières lignes de la sortie disent pourquoi, sans noyer le verdict.
        const fin = (r.sortie ?? "").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).slice(-3);
        for (const l of fin) raisons.push(`  │ ${l}`);
      } else if (r.statut === "non-execute") {
        statuts.push("ERROR");
        raisons.push(`${r.id} : non exécuté (${r.detail})`);
      } else if (r.statut === "non-applicable") {
        statuts.push("MANUAL");
        raisons.push(`${r.id} : non applicable ici (${r.detail}), preuve non établie`);
      }
    }
    if (k.controles === null && !k.manuel) {
      statuts.push("MANUAL");
      raisons.push("aucun contrôle déclaré (contrat historique) : preuve humaine requise");
    }
    if (k.manuel) {
      statuts.push("MANUAL");
      raisons.push(`humain requis : ${k.manuel}`);
    }
    let statut = pire(statuts);
    // Attestable : seul le jugement humain manque. Jamais si un contrôle échoue, ne tourne pas ou ne
    // s'applique pas ici (l'attestation ne remplace pas une preuve automatique absente).
    const attestable = statut === "MANUAL" && !parContrat.has(k.id) && controles.every((r) => r.statut === "ok") && (Boolean(k.manuel) || k.controles === null);
    const actuelle = empreinte(k, cfg);
    let attestation: Attestation | null = null;
    const siennes = attestations.filter((a) => a.contract === k.id);
    if (attestable && siennes.length) {
      attestation = siennes.find((a) => a.fingerprint === actuelle) ?? null;
      if (attestation) {
        statut = "ATTESTED";
        raisons.push(`attesté le ${attestation.attestedAt}${attestation.actor ? ` par ${attestation.actor.name} (${attestation.actor.source})` : ""}${attestation.note ? ` — ${attestation.note}` : ""}`);
      } else {
        raisons.push(`attestation du ${siennes[0].attestedAt} obsolète : le contrat ou sa preuve a changé depuis, à attester de nouveau`);
      }
    }
    return { id: k.id, titre: k.titre, regle: k.regle ?? null, statut, attestation, attestable: attestable && !attestation, empreinte: actuelle, severite: (k.severite ?? "bloquant") as Severite, controles, manuel: k.manuel, raisons, configInvalide: parContrat.has(k.id) };
  });

  const cites = new Set(contrats.flatMap((k) => k.controles ?? []));
  const nonRattaches = [...disponibles.keys()].filter((id) => !cites.has(id));
  // Gate : les contrats bloquants seulement ; un registre mal formé reste une ERROR quelle que soit
  // la sévérité du contrat concerné (la configuration elle-même n'est pas fiable).
  const decisifs = resultats.filter((r) => r.severite === "bloquant").map((r) => r.statut);
  const configKo = resultats.some((r) => (r as any).configInvalide) || erreurs.length > 0;
  const statut = pire([...decisifs, ...(configKo ? (["ERROR"] as Statut[]) : [])]);
  for (const r of resultats) delete (r as any).configInvalide;
  return { statut, code: CODES[statut], contrats: resultats, erreurs, nonRattaches };
}

const LIBELLES: Record<Statut, string> = {
  PASS: "GOVERNANCE: PASS",
  ATTESTED: "GOVERNANCE: PASS",
  FAIL: "GOVERNANCE: FAIL",
  MANUAL: "GOVERNANCE: MANUAL REVIEW REQUIRED",
  ERROR: "GOVERNANCE: VERIFY ERROR",
};
const SYMBOLES: Record<Statut, string> = { PASS: "✓", ATTESTED: "◆", FAIL: "✗", MANUAL: "?", ERROR: "!" };

/** Sortie humaine du verdict. Le détail FAIL/MANUAL/ERROR reste visible contrat par contrat. */
export function formaterVerdict(v: Verdict): string {
  const lignes = ["drwil verify", ""];
  if (v.contrats.length) {
    lignes.push("Contrats");
    for (const k of v.contrats) {
      lignes.push(`  ${SYMBOLES[k.statut]} ${k.statut.padEnd(6)} ${k.id.padEnd(8)} ${k.titre}${k.severite === "bloquant" ? "" : ` [${k.severite}]`}`);
      for (const r of k.raisons) lignes.push(`             ${r}`);
    }
    lignes.push("");
  }
  for (const e of v.erreurs) lignes.push(`! ${e}`);
  if (v.nonRattaches.length) lignes.push(`Contrôles cités par aucun contrat (non exécutés par verify) : ${v.nonRattaches.join(", ")}`);
  const compte = (s: Statut) => v.contrats.filter((k) => k.statut === s).length;
  if (v.contrats.length) lignes.push(`${v.contrats.length} contrats : ${compte("PASS")} PASS, ${compte("ATTESTED")} ATTESTED, ${compte("FAIL")} FAIL, ${compte("MANUAL")} MANUAL, ${compte("ERROR")} ERROR`);
  const attestes = v.contrats.filter((k) => k.statut === "ATTESTED" && k.severite === "bloquant").length;
  if (v.statut === "PASS" && attestes) lignes.push(`dont ${attestes} obligation(s) bloquante(s) validée(s) par attestation humaine, pas par une preuve automatique`);
  const aAttester = v.contrats.filter((k) => k.attestable).map((k) => k.id);
  if (aAttester.length) lignes.push(`Attestables par un humain (\`drwil attest <ID>\`) : ${aAttester.join(", ")}`);
  const bloquants = v.contrats.filter((k) => k.severite === "bloquant");
  const nonSatisfaits = (s: Severite) => v.contrats.filter((k) => k.severite === s && k.statut !== "PASS" && k.statut !== "ATTESTED").length;
  if (bloquants.length !== v.contrats.length) lignes.push(`dont ${bloquants.length} bloquant(s) (${bloquants.filter((k) => k.statut === "PASS" || k.statut === "ATTESTED").length} satisfait(s)), ${nonSatisfaits("avertissement")} avertissement(s) non satisfait(s), ${nonSatisfaits("indicatif")} indicatif(s) non satisfait(s) — seuls les bloquants décident du verdict`);
  lignes.push("", LIBELLES[v.statut]);
  return lignes.join("\n");
}

/**
 * Format machine stable de `drwil verify --json` (DRWIL-004), version 1. Mêmes codes de sortie
 * que la sortie humaine ; FAIL et MANUAL restent distincts. La sortie brute des contrôles n'y
 * figure pas (elle peut contenir des données sensibles) : voir les évidences (DRWIL-013).
 */
export function verdictJson(v: Verdict) {
  const compte = (s: Statut) => v.contrats.filter((k) => k.statut === s).length;
  return {
    version: 1,
    status: v.statut.toLowerCase(),
    exitCode: v.code,
    contracts: { total: v.contrats.length, passed: compte("PASS"), failed: compte("FAIL"), manual: compte("MANUAL"), error: compte("ERROR"), attested: compte("ATTESTED") },
    bySeverity: Object.fromEntries(([["blocking", "bloquant"], ["warning", "avertissement"], ["advisory", "indicatif"]] as const).map(([en, fr]) => {
      const ks = v.contrats.filter((k) => k.severite === fr);
      return [en, { total: ks.length, passed: ks.filter((k) => k.statut === "PASS").length, notPassed: ks.filter((k) => k.statut !== "PASS" && k.statut !== "ATTESTED").length }];
    })),
    results: v.contrats.map((k) => ({
      id: k.id,
      title: k.titre,
      status: k.statut.toLowerCase(),
      severity: { bloquant: "blocking", avertissement: "warning", indicatif: "advisory" }[k.severite],
      checks: k.controles.map(({ id, statut, detail, message }) => ({ id, status: statut, ...(detail ? { detail } : {}), ...(message ? { message } : {}) })),
      manual: k.manuel,
      attestable: k.attestable,
      attestation: k.attestation ? { attestedAt: k.attestation.attestedAt, actor: k.attestation.actor, note: k.attestation.note, fingerprint: k.attestation.fingerprint } : null,
      reasons: k.raisons.filter((r) => !r.startsWith("  │")),
    })),
    errors: v.erreurs,
    unlinkedChecks: v.nonRattaches,
  };
}

// Caviardage avant toute écriture d'évidence (SEC-007) : une sortie de contrôle peut contenir un
// secret (un test qui affiche sa configuration, un outil verbeux). Motifs larges exprès : mieux vaut
// masquer un faux positif que conserver une vraie clé.
const MOTIFS_SECRETS: RegExp[] = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[:=]\s*)\S+/gi,
  /\b[A-Za-z0-9+/_-]{40,}={0,2}\b/g,
];

export function caviarder(texte: string): string {
  let t = texte;
  for (const re of MOTIFS_SECRETS) t = t.replace(re, (m, prefixe) => (typeof prefixe === "string" && m.startsWith(prefixe) ? `${prefixe}[CAVIARDÉ]` : "[CAVIARDÉ]"));
  return t;
}

/**
 * Évidence d'une exécution de verify (DRWIL-013) : RULE → PROOF → EVIDENCE. Écrit
 * .drwil/evidence/verify-<horodatage>.json (hors git) et rend son chemin relatif. Contient le
 * verdict, l'horodatage, le commit (et si l'arbre était modifié), et pour chaque contrôle son
 * statut avec un résumé lisible : les dernières lignes de sa sortie, caviardées.
 */
export function ecrireEvidence(root: string, v: Verdict, maintenant = new Date()): string {
  const git = (...args: string[]) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    return r.status === 0 ? r.stdout.trim() : null;
  };
  const commit = git("rev-parse", "HEAD");
  const modifie = commit ? Boolean(git("status", "--porcelain")) : null;
  const resume = (sortie?: string) => caviarder((sortie ?? "").split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean).slice(-5).join("\n"));
  const evidence = {
    ...verdictJson(v),
    verifiedAt: maintenant.toISOString(),
    commit,
    dirtyWorktree: modifie,
    evidence: v.contrats.map((k) => ({
      id: k.id,
      status: k.statut.toLowerCase(),
      checks: k.controles.map((c) => ({ id: c.id, status: c.statut, summary: c.statut === "ok" ? "ok" : resume(c.sortie) || caviarder(c.detail ?? c.message ?? "") })),
      manual: k.manuel,
    })),
  };
  const dossier = join(root, ".drwil", "evidence");
  mkdirSync(dossier, { recursive: true });
  const nom = `verify-${maintenant.toISOString().replace(/[:.]/g, "-")}.json`;
  writeFileSync(join(dossier, nom), JSON.stringify(evidence, null, 2) + "\n");
  return `.drwil/evidence/${nom}`;
}
