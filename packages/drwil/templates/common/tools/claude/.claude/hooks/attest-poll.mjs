// QUA-235 : seul le retour de l'outil humain confirme ; la préparation ne confirme jamais.
// Chaque refus nomme sa cause et ce qu'il faut refaire : un message plus précis ne donne jamais à l'agent de
// quoi confirmer, seul `tool_response.answers` le fait.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const RECOMMENDED = /\((recommended|recommandée?)\)/i;

// Une ligne par cause, {d} reçoit le détail ; « humain » n'est pas un refus de forme et se dit à part.
const TEXTS = {
  fr: {
    refused: "sondage d'attestation refusé",
    none: "aucune attestation enregistrée",
    redo: 'relancer `drwil attest-poll {id} --tried "<essai>"` et poser son sondage tel quel, sans rien ajouter ni modifier',
    appel: "appel non corrélable ({d}) : seul `AskUserQuestion` avec session et appel identifiés est lu",
    champ: "champ inattendu ({d})",
    questions: "plusieurs questions ({d}) : le sondage n'en porte qu'une",
    recommandation: "recommandation dans l'option « {d} » : aucune option n'est recommandée",
    resume: "résumé différent de la préparation — première ligne qui diffère : {d}",
    absente: "préparation absente pour cet appel (sondage non posé tel que préparé, ou déjà consommé)",
    expiree: "préparation expirée ({d}) : elle vaut une heure",
    illisible: "réponse illisible ({d}) : seule la réponse de l'humain dans le retour de l'outil est lue",
    preuve: "preuve ou couverture changée pendant la question : contrat, contrôle ou fichiers couverts ont bougé",
    erreur: "erreur ({d})",
    humain: "refus choisi par l'humain (« {d} ») : aucune attestation enregistrée ; ne pas reproposer sans élément nouveau.",
  },
  en: {
    refused: "attestation poll refused",
    none: "no attestation recorded",
    redo: 'run `drwil attest-poll {id} --tried "<trial>"` again and ask its poll as is, adding or changing nothing',
    appel: "call not correlated ({d}): only `AskUserQuestion` with an identified session and call is read",
    champ: "unexpected field ({d})",
    questions: "several questions ({d}): the poll holds only one",
    recommandation: "recommendation in the option « {d} »: no option is recommended",
    resume: "summary different from the preparation — first differing line: {d}",
    absente: "no preparation for this call (poll not asked as prepared, or already consumed)",
    expiree: "preparation expired ({d}): it lasts one hour",
    illisible: "unreadable answer ({d}): only the human's answer in the tool's result is read",
    preuve: "proof or coverage changed during the question: contract, check or covered files moved",
    erreur: "error ({d})",
    humain: "refusal chosen by the human (« {d} »): no attestation recorded; do not ask again without something new.",
  },
};

/** Première différence entre la préparation et le sondage posé : champ ajouté, ou valeur (ligne) qui diffère. */
export function pollDifference(prepared, asked, path = "") {
  if (prepared && typeof prepared === "object" && asked && typeof asked === "object" && Array.isArray(prepared) === Array.isArray(asked)) {
    if (!Array.isArray(asked)) {
      const added = Object.keys(asked).filter((k) => !(k in prepared));
      if (added.length) return { cause: "champ", detail: added.map((k) => `${path}${path ? "." : ""}${k}`).join(", ") };
    }
    const keys = Array.isArray(prepared)
      ? Array.from({ length: Math.max(prepared.length, asked.length) }, (_, i) => i)
      : Object.keys(prepared);
    for (const k of keys) {
      const where = Array.isArray(prepared) ? `${path}[${k}]` : `${path}${path ? "." : ""}${k}`;
      const d = pollDifference(prepared[k], asked[k], where);
      if (d) return d;
    }
    return null;
  }
  if (prepared === asked) return null;
  if (typeof prepared === "string" && typeof asked === "string") {
    const a = prepared.split("\n");
    const b = asked.split("\n");
    const i = a.findIndex((line, n) => line !== b[n]);
    const n = i === -1 ? a.length : i;
    return { cause: "resume", detail: `${path}:${n + 1} « ${b[n] ?? ""} » ≠ « ${a[n] ?? ""} »` };
  }
  return { cause: "resume", detail: `${path} ${JSON.stringify(asked) ?? "—"} ≠ ${JSON.stringify(prepared) ?? "—"}` };
}

/** Claude Code seul ; tout le contenu sera comparé à la préparation du moteur. */
export function attestationPoll(input) {
  const e = input?.tool_input;
  const all = Array.isArray(e?.questions) ? e.questions : [];
  const q = all.find((q) => q?.header === "drwil-attest");
  if (!q) return null;
  const match = /^drwil-attest ([A-Z][A-Z0-9]*-\d+)( --renew)?\n[\s\S]*\n\n(?:Essai de l'agent|Agent trial):\n([\s\S]+)$/.exec(
    q.question ?? "",
  );
  // L'outil ajoute `answers` et `annotations` à tool_input après la réponse humaine : tolérés en
  // PostToolUse seulement, jamais lus ; seule la question est comparée à la préparation.
  const added = input.hook_event_name === "PostToolUse" ? ["answers", "annotations"] : [];
  const asked = { questions: e.questions };
  const missing = ["session_id", "tool_use_id"].filter((k) => typeof input[k] !== "string" || !input[k].trim());
  const extra = Object.keys(e).filter((k) => k !== "questions" && !added.includes(k));
  // La recommandation n'est cherchée que dans les options : un contrat ou un essai qui cite le mot reste valide.
  const recommended = (Array.isArray(q.options) ? q.options : []).find((o) =>
    [o?.label, o?.description].some((t) => typeof t === "string" && RECOMMENDED.test(t)),
  );
  const refusal = [
    [input.tool_name !== "AskUserQuestion", "appel", `tool_name ${input.tool_name}`],
    [missing.length, "appel", `${missing.join(", ")} ∅`],
    [extra.length, "champ", extra.map((k) => `tool_input.${k}`).join(", ")],
    [all.length !== 1, "questions", String(all.length)],
    [recommended, "recommandation", recommended?.label],
    [!match, "resume", `questions[0].question:1 « ${String(q.question ?? "").split("\n")[0]} »`],
  ]
    .filter(([wrong]) => wrong)
    .map(([, cause, detail]) => ({ cause, detail }))[0];
  return { valid: !refusal, refusal, id: match?.[1], renew: Boolean(match?.[2]), tried: match?.[3], asked };
}

/** La charge refusée, masquée et sans chemin local (cwd, transcript) : assez pour la rejouer ; sans masquage, la cause seule. */
function keep(root, input, refusal, redact) {
  const fields = redact ? ["hook_event_name", "tool_name", "session_id", "tool_use_id", "tool_input", "tool_response"] : [];
  const raw = JSON.stringify(Object.fromEntries(fields.map((k) => [k, input[k]])));
  const kept = JSON.parse(raw, (_, x) => (typeof x === "string" ? redact(x) : x));
  try {
    mkdirSync(join(root, ".drwil", "evidence"), { recursive: true });
    const trace = { refusedAt: new Date().toISOString(), ...refusal, input: kept };
    writeFileSync(join(root, ".drwil", "evidence", "attest-poll-refused.json"), `${JSON.stringify(trace, null, 2)}\n`);
  } catch {
    // La trace aide à comprendre ; son absence ne change jamais le refus.
  }
}

/** Préparation liée à l'appel, consommée une fois ; aucune réponse lue dans tool_input. */
export async function attestationHook(input, { root, tell }) {
  const poll = attestationPoll(input);
  if (!poll) return null;
  const pre = input.hook_event_name === "PreToolUse";
  if (!pre && input.hook_event_name !== "PostToolUse") return 0;
  let T = TEXTS.fr;
  try {
    if (JSON.parse(readFileSync(join(root, ".drwil", "ia-first.json"), "utf8")).lang === "en") T = TEXTS.en;
  } catch {}
  let redact = null;
  const say = (message) => {
    if (pre) console.error(`[drwil] ${message}`);
    else tell(`✗ ${message}`);
    return pre ? 2 : 0;
  };
  const fill = (text, d) => text.replace("{d}", d).replace("{id}", poll.id ?? "<ID>");
  const refuse = (refusal, raw) => {
    keep(root, input, refusal, redact);
    if (refusal.cause === "humain") return say(fill(T.humain, refusal.detail));
    // Message du moteur (contrat déjà prouvé, inconnu, non attestable…) : il dit lui-même quoi faire.
    if (raw) return say(`${T.refused} — ${raw} ; ${T.none}.`);
    return say(`${T.refused} — ${fill(T[refusal.cause], refusal.detail)} ; ${T.none}. ${fill(T.redo)}.`);
  };
  const dir = join(root, ".drwil", "evidence", "attest-polls");
  const key = JSON.stringify([input.session_id, input.tool_use_id]);
  const file = join(dir, `${createHash("sha256").update(key).digest("hex")}.json`);
  let drwil;
  try {
    drwil = await import("drwil");
    redact = drwil.redact ?? null;
  } catch (e) {
    if (poll.valid) return refuse({ cause: "erreur", detail: e?.message ?? String(e) });
  }
  if (!poll.valid) {
    rmSync(file, { force: true });
    return refuse(poll.refusal);
  }
  try {
    const options = { targetDir: root, id: poll.id, renew: poll.renew, tried: poll.tried };
    if (pre) {
      rmSync(file, { force: true });
      const prepared = await drwil.prepareAttestationPoll(options);
      if (!prepared.poll) return refuse({ cause: "absente", detail: prepared.message }, prepared.message || undefined);
      const difference = pollDifference(prepared.poll, poll.asked);
      if (difference) return refuse(difference);
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, JSON.stringify({ poll: poll.asked, snapshot: prepared.snapshot, askedAt: new Date().toISOString() }));
      return 0;
    }
    if (!existsSync(file)) return refuse({ cause: "absente" });
    const pending = JSON.parse(readFileSync(file, "utf8"));
    rmSync(file);
    const difference = pollDifference(pending.poll, poll.asked);
    if (difference) return refuse(difference);
    const askedAt = Date.parse(pending.askedAt);
    if (!Number.isFinite(askedAt) || Date.now() < askedAt || Date.now() - askedAt > 3_600_000)
      return refuse({ cause: "expiree", detail: String(pending.askedAt) });
    const question = poll.asked.questions[0];
    const answer = input.tool_response?.answers;
    const keys = answer && typeof answer === "object" ? Object.keys(answer) : [];
    if (keys.length !== 1 || keys[0] !== question.question)
      return refuse({ cause: "illisible", detail: `tool_response.answers: ${keys.length}` });
    const label = answer[question.question];
    if (label !== question.options[0].label)
      return question.options.some((o) => o.label === label)
        ? refuse({ cause: "humain", detail: label })
        : refuse({ cause: "illisible", detail: `« ${String(label)} » ∉ options` });
    const seen = [];
    const origin = { source: "claude-poll", sessionId: input.session_id, toolUseId: input.tool_use_id, askedAt: pending.askedAt };
    const confirm = async (_, snapshot) => seen.push(snapshot) > 0 && snapshot === pending.snapshot;
    const result = await drwil.attest({ ...options, note: poll.tried, origin, confirm });
    if (seen.length && seen[0] !== pending.snapshot) return refuse({ cause: "preuve" });
    tell(`${result.code === 0 ? "✓" : "✗"} ${result.message}${result.file ? ` : ${result.file}` : ""}`);
  } catch (e) {
    return refuse({ cause: "erreur", detail: e?.message ?? String(e) });
  }
  return 0;
}
