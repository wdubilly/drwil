// Présentation du verdict de `drwil verify` (découpée de verify.ts, qui la réexporte) : sortie
// humaine et format machine stable.
import type { Severite, Statut, Verdict } from "./verify.js";

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
      lignes.push(
        `  ${SYMBOLES[k.statut]} ${k.statut.padEnd(6)} ${k.id.padEnd(8)} ${k.titre}${k.severite === "bloquant" ? "" : ` [${k.severite}]`}`,
      );
      for (const r of k.raisons) lignes.push(`             ${r}`);
    }
    lignes.push("");
  }
  for (const e of v.erreurs) lignes.push(`! ${e}`);
  if (v.nonRattaches.length) lignes.push(`Contrôles cités par aucun contrat (non exécutés par verify) : ${v.nonRattaches.join(", ")}`);
  const compte = (s: Statut) => v.contrats.filter((k) => k.statut === s).length;
  if (v.contrats.length)
    lignes.push(
      `${v.contrats.length} contrats : ${compte("PASS")} PASS, ${compte("ATTESTED")} ATTESTED, ${compte("FAIL")} FAIL, ${compte("MANUAL")} MANUAL, ${compte("ERROR")} ERROR`,
    );
  const attestes = v.contrats.filter((k) => k.statut === "ATTESTED" && k.severite === "bloquant").length;
  if (v.statut === "PASS" && attestes)
    lignes.push(`dont ${attestes} obligation(s) bloquante(s) validée(s) par attestation humaine, pas par une preuve automatique`);
  const aAttester = v.contrats.filter((k) => k.attestable).map((k) => k.id);
  if (aAttester.length) lignes.push(`Attestables par un humain (\`drwil attest <ID>\`) : ${aAttester.join(", ")}`);
  const bloquants = v.contrats.filter((k) => k.severite === "bloquant");
  const nonSatisfaits = (s: Severite) =>
    v.contrats.filter((k) => k.severite === s && k.statut !== "PASS" && k.statut !== "ATTESTED").length;
  if (bloquants.length !== v.contrats.length)
    lignes.push(
      `dont ${bloquants.length} bloquant(s) (${bloquants.filter((k) => k.statut === "PASS" || k.statut === "ATTESTED").length} satisfait(s)), ${nonSatisfaits("avertissement")} avertissement(s) non satisfait(s), ${nonSatisfaits("indicatif")} indicatif(s) non satisfait(s) — seuls les bloquants décident du verdict`,
    );
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
    contracts: {
      total: v.contrats.length,
      passed: compte("PASS"),
      failed: compte("FAIL"),
      manual: compte("MANUAL"),
      error: compte("ERROR"),
      attested: compte("ATTESTED"),
    },
    bySeverity: Object.fromEntries(
      (
        [
          ["blocking", "bloquant"],
          ["warning", "avertissement"],
          ["advisory", "indicatif"],
        ] as const
      ).map(([en, fr]) => {
        const ks = v.contrats.filter((k) => k.severite === fr);
        return [
          en,
          {
            total: ks.length,
            passed: ks.filter((k) => k.statut === "PASS").length,
            notPassed: ks.filter((k) => k.statut !== "PASS" && k.statut !== "ATTESTED").length,
          },
        ];
      }),
    ),
    results: v.contrats.map((k) => ({
      id: k.id,
      title: k.titre,
      status: k.statut.toLowerCase(),
      severity: { bloquant: "blocking", avertissement: "warning", indicatif: "advisory" }[k.severite],
      checks: k.controles.map(({ id, statut, detail, message }) => ({
        id,
        status: statut,
        ...(detail ? { detail } : {}),
        ...(message ? { message } : {}),
      })),
      manual: k.manuel,
      attestable: k.attestable,
      attestation: k.attestation
        ? {
            attestedAt: k.attestation.attestedAt,
            actor: k.attestation.actor,
            note: k.attestation.note,
            fingerprint: k.attestation.fingerprint,
          }
        : null,
      reasons: k.raisons.filter((r) => !r.startsWith("  │")),
    })),
    errors: v.erreurs,
    unlinkedChecks: v.nonRattaches,
  };
}
