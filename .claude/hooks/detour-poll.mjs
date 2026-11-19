// QUA-117 : le oui de l'humain à un détour, ou au correctif d'une réouverture, qui change les règles du jeu, depuis le
// chat. Le sondage `drwil-detour`, préparé par `node .githooks/state.mjs poll detour`, est lu par le socle des sondages
// préparés (prepared-poll.mjs) : seule la réponse de l'humain dans le retour de l'outil enregistre ce oui, si le même
// détour ou la même réouverture l'attend encore.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { preparedPollHook, yesOrRefusal } from "./prepared-poll.mjs";

const QUESTION = /^drwil-detour (\S+)\n/;

const TEXTS = {
  fr: {
    refused: "sondage du oui au détour refusé",
    none: "aucun oui enregistré",
    redo: "relancer `node .githooks/state.mjs poll detour` et poser son sondage tel quel, sans rien ajouter ni modifier",
    detour: "détour ou réouverture changés pendant la question",
    humain:
      "refus choisi par l'humain (« {d} ») : aucun oui enregistré, la barrière de périmètre refuse toujours les commits qui changent les règles du jeu.",
  },
  en: {
    refused: "detour yes poll refused",
    none: "no yes recorded",
    redo: "run `node .githooks/state.mjs poll detour` again and ask its poll as is, adding or changing nothing",
    detour: "detour or reopening changed during the question",
    humain: "refusal chosen by the human (« {d} »): no yes recorded, the scope gate still refuses the commits that change the rules.",
  },
};

/** Préparation liée à l'appel, consommée une fois ; le oui n'est écrit que par `.githooks/detour.mjs`. */
export function detourHook(input, ctx) {
  return preparedPollHook(input, ctx, {
    header: "drwil-detour",
    pattern: QUESTION,
    name: "detour-poll",
    texts: TEXTS,
    load: async () => {
      const detour = await import(pathToFileURL(join(ctx.root, ".githooks", "detour.mjs")).href);
      // Le masquage du paquet, s'il est là, permet de garder la charge refusée ; sans lui, la cause seule.
      const drwil = await import("drwil").catch(() => null);
      return { ...detour, redact: drwil?.redact };
    },
    prepare: async (detour, _match, root) => detour.detourPoll(root),
    confirm: async ({ mod: detour, label, question, data, root, refuse, tell }) => {
      const no = yesOrRefusal(question, label);
      if (no) return refuse(no);
      const done = detour.allowFromPoll(root, data);
      if (!done) return refuse({ cause: "detour" });
      tell(`✓ ${done.message}`);
      return 0;
    },
  });
}
