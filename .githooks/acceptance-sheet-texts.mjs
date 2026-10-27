// Messages of the acceptance sheet (QUA-051, QUA-052), in the project's language. Imported by
// acceptance-sheet.mjs, which re-exports them.
import { config } from "./briefs.mjs";

const TEXTS = {
  fr: {
    title: "Fiche de recette — {0}",
    intro: "Version candidate {0} (commit `{1}`), du dernier tag définitif {2} à la candidate. Générée, jamais écrite à la main.",
    fromStart: "le début du dépôt",
    verdictHow:
      "Verdict (geste humain) : `node .githooks/release-verdict.mjs {0} --approve`, ou `--reserve <point>` / `--refuse <point>` pour chaque point concerné.",
    toValidate: "## À valider",
    nothing: "Aucun point à valider à la main dans cette version.",
    what: "Quoi",
    how: "Comment",
    kinds: { human: "critère humain", real: "pas encore essayé en réel", limit: "limite connue", attest: "attestation à refaire" },
    hows: {
      human: "L'essayer avec le tarball de la candidate et juger si le critère est tenu : seul un humain en juge.",
      real: "L'essayer en conditions réelles avec le tarball de la candidate.",
      limit: "Juger si cette limite est acceptable pour la version ; sinon, la refuser.",
      attest: "Relire la partie humaine du contrat ({0}) ; la confirmer reste un geste humain (`drwil attest {1}`).",
    },
    noPr: "PR non retrouvée",
    nonRegression: "## Non-régression (déjà prouvée : inutile de la retester)",
    verdict: "Verdict de `drwil verify` : {0}",
    unavailable: "non disponible (verify non exécuté : ce n'est pas un succès)",
    excused: "{0} — sans compter {1}, qui refuse le travail sur la branche principale, où toute release se crée",
    proven: "Contrats prouvés par un test : {0}",
    os: "OS testés par la CI (jobs réussis sur ce commit) : {0}",
    noOs: "aucun job réussi trouvé (CI en cours, absente ou gh indisponible)",
    prints: "Empreinte du tarball :",
    noPrint: "calculée à la création du tarball (rien de construit en --dry-run)",
    noTarball: "aucun paquet npm publiable : pas de tarball",
  },
  en: {
    title: "Acceptance sheet — {0}",
    intro: "Candidate version {0} (commit `{1}`), from the latest final tag {2} to the candidate. Generated, never written by hand.",
    fromStart: "the start of the repository",
    verdictHow:
      "Verdict (human gesture): `node .githooks/release-verdict.mjs {0} --approve`, or `--reserve <point>` / `--refuse <point>` for each point concerned.",
    toValidate: "## To validate",
    nothing: "No point to validate by hand in this version.",
    what: "What",
    how: "How",
    kinds: { human: "human criterion", real: "not tried for real yet", limit: "known limit", attest: "attestation to redo" },
    hows: {
      human: "Try it with the candidate's tarball and judge whether the criterion holds: only a human judges it.",
      real: "Try it for real with the candidate's tarball.",
      limit: "Judge whether this limit is acceptable for the version; otherwise, refuse it.",
      attest: "Reread the human part of the contract ({0}); confirming it stays a human gesture (`drwil attest {1}`).",
    },
    noPr: "PR not found",
    nonRegression: "## Non-regression (already proven: no need to test it again)",
    verdict: "`drwil verify` verdict: {0}",
    unavailable: "unavailable (verify not run: that is not a success)",
    excused: "{0} — not counting {1}, which refuses work on the main branch, where every release is created",
    proven: "Contracts proven by a test: {0}",
    os: "OS tested by the CI (successful jobs on this commit): {0}",
    noOs: "no successful job found (CI running, absent or gh unavailable)",
    prints: "Tarball fingerprint:",
    noPrint: "computed when the tarball is built (nothing built in --dry-run)",
    noTarball: "no publishable npm package: no tarball",
  },
};

export const fill = (message, ...values) => message.replace(/\{(\d)\}/g, (_, i) => values[i]);

/** Messages in the project's language (French by default). */
export function sheetTexts(root) {
  return TEXTS[config(root).lang === "en" ? "en" : "fr"];
}
