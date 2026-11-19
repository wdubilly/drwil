// QUA-235 : le sondage d'attestation, lu par le socle des sondages préparés (prepared-poll.mjs) ; seul le retour de
// l'outil humain confirme, le moteur relance les contrôles et compare l'empreinte vue à la préparation.
import { attestBatch, attestSnapshot } from "./attest-batch.mjs";
import { preparedPollHook, readPoll, yesOrRefusal } from "./prepared-poll.mjs";

export { pollDifference } from "./prepared-poll.mjs";

const QUESTION =
  /^drwil-attest ([A-Z][A-Z0-9]*-\d+(?: [A-Z][A-Z0-9]*-\d+)*)( --renew)?\n[\s\S]*\n\n(?:Essai de l'agent|Agent trial):\n([\s\S]+)$/;

// « humain » n'est pas un refus de forme et se dit à part ; les causes communes sont dans prepared-poll.mjs.
const TEXTS = {
  fr: {
    refused: "sondage d'attestation refusé",
    none: "aucune attestation enregistrée",
    redo: 'relancer `drwil attest-poll {id} --tried "<essai>"` et poser son sondage tel quel, sans rien ajouter ni modifier',
    preuve: "preuve ou couverture changée pendant la question : contrat, contrôle ou fichiers couverts ont bougé",
    humain: "refus choisi par l'humain (« {d} ») : aucune attestation enregistrée ; ne pas reproposer sans élément nouveau.",
  },
  en: {
    refused: "attestation poll refused",
    none: "no attestation recorded",
    redo: 'run `drwil attest-poll {id} --tried "<trial>"` again and ask its poll as is, adding or changing nothing',
    preuve: "proof or coverage changed during the question: contract, check or covered files moved",
    humain: "refusal chosen by the human (« {d} »): no attestation recorded; do not ask again without something new.",
  },
};

/** Claude Code seul ; tout le contenu sera comparé à la préparation du moteur. */
export function attestationPoll(input) {
  const poll = readPoll(input, "drwil-attest", QUESTION);
  return poll && { ...poll, id: poll.match?.[1], renew: Boolean(poll.match?.[2]), tried: poll.match?.[3] };
}

const options = (root, match) => {
  const ids = match[1].split(" ");
  return { targetDir: root, id: ids[0], ids, renew: Boolean(match[2]), tried: match[3] };
};

/** Préparation liée à l'appel, consommée une fois ; une attestation par contrat confirmé. */
export function attestationHook(input, ctx) {
  return preparedPollHook(input, ctx, {
    header: "drwil-attest",
    pattern: QUESTION,
    name: "attest-poll",
    texts: TEXTS,
    load: () => import("drwil"),
    prepare: async (drwil, match, root) => {
      const prepared = await drwil.prepareAttestationPoll(options(root, match));
      return { ...prepared, data: prepared.snapshots };
    },
    confirm: async ({ mod: drwil, match, label, question, data, origin, root, refuse, tell, T, en }) => {
      const o = options(root, match);
      const attestOne = (id, confirm) => drwil.attest({ ...o, id, note: o.tried, origin, confirm });
      const pending = { snapshots: data };
      if (o.ids.length > 1) return attestBatch({ answer: label, ids: o.ids, pending, attestOne, refuse, tell, en, preuve: T.preuve });
      const no = yesOrRefusal(question, label);
      if (no) return refuse(no);
      const done = await attestSnapshot(o.id, data?.[o.id], attestOne);
      if (done.changed) return refuse({ cause: "preuve" });
      tell(done.line);
      return 0;
    },
  });
}
