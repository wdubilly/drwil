// QUA-175 : l'acceptation des critères depuis le chat. Le sondage `drwil-accept`, préparé par
// `node .githooks/state.mjs poll accept`, est lu par le socle des sondages préparés (prepared-poll.mjs) : seule la
// réponse de l'humain dans le retour de l'outil l'enregistre, si la fiche active et ses critères n'ont pas bougé.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { preparedPollHook, yesOrRefusal } from "./prepared-poll.mjs";

const QUESTION = /^drwil-accept (\S+)\n/;

const TEXTS = {
  fr: {
    refused: "sondage d'acceptation refusé",
    none: "aucune acceptation enregistrée",
    redo: "relancer `node .githooks/state.mjs poll accept` et poser son sondage tel quel, sans rien ajouter ni modifier",
    criteres: "critères ou chantier actif changés pendant la question",
    humain: "refus choisi par l'humain (« {d} ») : aucune acceptation enregistrée ; les critères sont à revoir avec lui.",
  },
  en: {
    refused: "acceptance poll refused",
    none: "no acceptance recorded",
    redo: "run `node .githooks/state.mjs poll accept` again and ask its poll as is, adding or changing nothing",
    criteres: "criteria or active workstream changed during the question",
    humain: "refusal chosen by the human (« {d} »): no acceptance recorded; the criteria are to be reviewed with them.",
  },
};

/** Préparation liée à l'appel, consommée une fois ; l'acceptation n'est écrite que par `.githooks/state-acceptance.mjs`. */
export function acceptanceHook(input, ctx) {
  return preparedPollHook(input, ctx, {
    header: "drwil-accept",
    pattern: QUESTION,
    name: "accept-poll",
    texts: TEXTS,
    load: async () => {
      const acceptance = await import(pathToFileURL(join(ctx.root, ".githooks", "state-acceptance.mjs")).href);
      // Le masquage du paquet, s'il est là, permet de garder la charge refusée ; sans lui, la cause seule.
      const drwil = await import("drwil").catch(() => null);
      return { ...acceptance, redact: drwil?.redact };
    },
    prepare: async (acceptance, _match, root) => acceptance.acceptancePoll(root),
    confirm: async ({ mod: acceptance, label, question, data, root, refuse, tell }) => {
      const no = yesOrRefusal(question, label);
      if (no) return refuse(no);
      const done = acceptance.acceptFromPoll(root, data);
      if (!done) return refuse({ cause: "criteres" });
      tell(`✓ ${done}`);
      return 0;
    },
  });
}
