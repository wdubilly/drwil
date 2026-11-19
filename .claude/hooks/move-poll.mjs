// QUA-117 : une transition réservée à l'humain depuis le chat. Le sondage `drwil-move`, préparé par
// `node .githooks/state.mjs poll move <ACTIVITE> …`, est lu par le socle des sondages préparés (prepared-poll.mjs) :
// seule la réponse de l'humain dans le retour de l'outil applique la transition, si l'état n'a pas bougé.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { preparedPollHook, yesOrRefusal } from "./prepared-poll.mjs";

const QUESTION = /^drwil-move (\S+) (\{.*\})\n/;

const TEXTS = {
  fr: {
    refused: "sondage de transition refusé",
    none: "état inchangé",
    redo: "relancer `node .githooks/state.mjs poll move {id} …` et poser son sondage tel quel, sans rien ajouter ni modifier",
    etat: "état de gouvernance changé pendant la question",
    humain: "refus choisi par l'humain (« {d} ») : état inchangé.",
  },
  en: {
    refused: "transition poll refused",
    none: "state unchanged",
    redo: "run `node .githooks/state.mjs poll move {id} …` again and ask its poll as is, adding or changing nothing",
    etat: "governance state changed during the question",
    humain: "refusal chosen by the human (« {d} »): state unchanged.",
  },
};

/** Préparation liée à l'appel, consommée une fois ; la transition n'est écrite que par `.githooks/state.mjs`. */
export function moveHook(input, ctx) {
  return preparedPollHook(input, ctx, {
    header: "drwil-move",
    pattern: QUESTION,
    name: "move-poll",
    texts: TEXTS,
    load: async () => {
      const polls = await import(pathToFileURL(join(ctx.root, ".githooks", "state-polls.mjs")).href);
      // Le masquage du paquet, s'il est là, permet de garder la charge refusée ; sans lui, la cause seule.
      const drwil = await import("drwil").catch(() => null);
      return { ...polls, redact: drwil?.redact };
    },
    // La première ligne porte la transition et ses options : la préparation est refaite depuis elle.
    prepare: async (polls, match, root) => polls.movePoll(root, { ...JSON.parse(match[2]), to: match[1] }),
    confirm: async ({ mod: polls, label, question, data, root, refuse, tell }) => {
      const no = yesOrRefusal(question, label);
      if (no) return refuse(no);
      const done = await polls.moveFromPoll(root, data);
      if (!done) return refuse({ cause: "etat" });
      // Refus du moteur (preuve absente, fiche invalide…) : son message dit quoi faire.
      if (done.code !== 0) return refuse({ cause: "erreur", detail: done.message }, done.message);
      tell(`✓ ${done.message}`);
      return 0;
    },
  });
}
