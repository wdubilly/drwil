// Textes du verdict, séparés de son rendu (QUA-001).
import type { Severity } from "./verify-types.js";

const SEVERITY_FR: Record<Severity, string> = { blocking: "bloquant", warning: "avertissement", advisory: "indicatif" };

export const TEXTS = {
  fr: {
    contracts: "Contrats",
    unattached: "Contrôles cités par aucun contrat (non exécutés par verify) : {0}",
    counts: "{0} contrats : {1} PASS, {2} ATTESTED, {3} FAIL, {4} MANUAL, {5} ERROR",
    attested: "dont {0} obligation(s) bloquante(s) validée(s) par attestation humaine, pas par une preuve automatique",
    attestable: "Attestables par un humain (`drwil attest <ID>`) : {0}",
    severities:
      "dont {0} bloquant(s) ({1} satisfait(s)), {2} avertissement(s) non satisfait(s), {3} indicatif(s) non satisfait(s) — seuls les bloquants décident du verdict",
    severity: (s: Severity) => SEVERITY_FR[s],
    undeclared: "Contrats modifiés sans déclaration dans la fiche active (section « Contrats modifiés ») — clôture refusée : {0}",
    unproven: "Critères d'acceptation non prouvés de la fiche active (verdict et clôture) : {0}",
    proofs: "Critères de chantiers clos dont la preuve a disparu (fichier de preuve de clôture rejoué) : {0}",
    partial:
      "Verdict partiel (--failed), jamais une preuve de clôture : {0} contrat(s) rejoué(s) depuis la preuve {1}, {2} PASS ou ATTESTED non rejoué(s) donc non jugé(s)",
    partialNone: "Aucune preuve précédente lisible dans .drwil/evidence/ : rien n'est rejoué. Lancer `drwil verify --evidence`.",
    partialManual: "En attente d'attestation, pas en échec, non rejoué(s) : {0} — `drwil attest <ID>`",
    partialEnd: "Passe complète à faire pour le verdict : `drwil verify --evidence`",
  },
  en: {
    contracts: "Contracts",
    unattached: "Checks cited by no contract (not run by verify): {0}",
    counts: "{0} contracts: {1} PASS, {2} ATTESTED, {3} FAIL, {4} MANUAL, {5} ERROR",
    attested: "including {0} blocking obligation(s) validated by human attestation, not by an automated proof",
    attestable: "Attestable by a human (`drwil attest <ID>`): {0}",
    severities:
      "including {0} blocking ({1} satisfied), {2} warning(s) not satisfied, {3} advisory not satisfied — only blocking contracts decide the verdict",
    severity: (s: Severity) => s,
    undeclared: "Contracts modified without declaration in the active brief (« Modified contracts » section) — closing refused: {0}",
    unproven: "Unproven acceptance criteria of the active brief (verdict and closing): {0}",
    proofs: "Criteria of closed workstreams whose proof has disappeared (closing proof file replayed): {0}",
    partial:
      "Partial verdict (--failed), never a closing proof: {0} contract(s) replayed since the evidence {1}, {2} PASS or ATTESTED not replayed, so not judged",
    partialNone: "No readable previous evidence in .drwil/evidence/: nothing is replayed. Run `drwil verify --evidence`.",
    partialManual: "Awaiting attestation, not failing, not replayed: {0} — `drwil attest <ID>`",
    partialEnd: "A full pass is still needed for the verdict: `drwil verify --evidence`",
  },
};
