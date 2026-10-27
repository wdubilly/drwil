// Messages of the acceptance criteria, split from criteria.ts (QUA-001).
import type { MessageLang } from "./i18n.js";

export const HINT = {
  fr: {
    add: "{0} est à attester : ajouter [humain] au critère",
    remove: "{0} est entièrement automatisé : retirer [humain] du critère",
  },
  en: {
    add: "{0} is attested by a human: add [human] to the criterion",
    remove: "{0} is fully automated: remove [human] from the criterion",
  },
} satisfies Record<MessageLang, Record<string, string>>;

export const TABLE = {
  fr: {
    head: ["Critère", "Preuve", "Verdict"],
    status: {
      pass: "✅ prouvé",
      "no-proof": "❌ sans preuve",
      "unknown-proof": "❌ preuve inconnue du registre",
      "not-durable": "❌ preuve non durable",
      "no-contract": "❌ contrôle sans contrat (rien au registre)",
      "no-origin": "❌ contrat créé sans champ Origine",
      "not-pass": "❌ preuve non passante",
    },
    none: "aucun critère d'acceptation",
    change: { created: "créé", reused: "réutilisé", modified: "modifié" },
  },
  en: {
    head: ["Criterion", "Proof", "Verdict"],
    status: {
      pass: "✅ proven",
      "no-proof": "❌ no proof",
      "unknown-proof": "❌ proof unknown to the registry",
      "not-durable": "❌ proof not durable",
      "no-contract": "❌ check without a contract (nothing in the registry)",
      "no-origin": "❌ contract created without an Origin field",
      "not-pass": "❌ proof not passing",
    },
    none: "no acceptance criteria",
    change: { created: "created", reused: "reused", modified: "modified" },
  },
} satisfies Record<MessageLang, unknown>;

export const ORIGIN = {
  fr: "protège {0} — régression si ce changement n'est pas déclaré dans la fiche active",
  en: "protects {0} — a regression unless this change is declared in the active brief",
} satisfies Record<MessageLang, string>;
