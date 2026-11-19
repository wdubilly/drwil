// QUA-053 : le verdict de recette depuis le chat. Le sondage `drwil-verdict`, préparé par
// `node .githooks/release-verdict-poll.mjs <candidate> …` (module de release), est lu par le socle des sondages
// préparés (prepared-poll.mjs) : seule la réponse de l'humain dans le retour de l'outil l'enregistre sur la candidate,
// comme au terminal, si sa fiche de recette n'a pas bougé.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { preparedPollHook, yesOrRefusal } from "./prepared-poll.mjs";

const QUESTION = /^drwil-verdict (\S+) (\[.*\])\n/;

const TEXTS = {
  fr: {
    refused: "sondage de verdict refusé",
    none: "aucun verdict enregistré",
    redo: "relancer `node .githooks/release-verdict-poll.mjs {id} …` et poser son sondage tel quel, sans rien ajouter ni modifier",
    candidate: "fiche de recette de la candidate changée pendant la question",
    humain: "refus choisi par l'humain (« {d} ») : aucun verdict enregistré sur la candidate.",
  },
  en: {
    refused: "verdict poll refused",
    none: "no verdict recorded",
    redo: "run `node .githooks/release-verdict-poll.mjs {id} …` again and ask its poll as is, adding or changing nothing",
    candidate: "acceptance sheet of the candidate changed during the question",
    humain: "refusal chosen by the human (« {d} »): no verdict recorded on the candidate.",
  },
};

/** Préparation liée à l'appel, consommée une fois ; le verdict n'est écrit que par le module de release. */
export function verdictHook(input, ctx) {
  return preparedPollHook(input, ctx, {
    header: "drwil-verdict",
    pattern: QUESTION,
    name: "verdict-poll",
    texts: TEXTS,
    load: async () => {
      const verdict = await import(pathToFileURL(join(ctx.root, ".githooks", "release-verdict-poll.mjs")).href);
      // Le masquage du paquet, s'il est là, permet de garder la charge refusée ; sans lui, la cause seule.
      const drwil = await import("drwil").catch(() => null);
      return { ...verdict, redact: drwil?.redact };
    },
    // `ctx.run` : gh simulé par les tests ; absent, le module appelle gh.
    prepare: async (verdict, match, root) => verdict.verdictPoll(root, verdict.pollArgs(match[1], match[2]), { run: ctx.run }),
    confirm: async ({ mod: verdict, label, question, data, root, refuse, tell }) => {
      const no = yesOrRefusal(question, label);
      if (no) return refuse(no);
      const done = verdict.verdictFromPoll(root, data, { run: ctx.run });
      if (!done) return refuse({ cause: "candidate" });
      // Refus du module (déjà un verdict, identité absente, envoi échoué…) : son message dit quoi faire.
      if (done.code !== 0) return refuse({ cause: "erreur", detail: done.message }, done.message);
      tell(`✓ ${done.message}`);
      return 0;
    },
  });
}
