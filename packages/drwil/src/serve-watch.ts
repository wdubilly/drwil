// Observation d'un projet par `drwil serve` : ce qui change (état, commits, attestations, PR ou MR, CI) va au
// journal (QUA-274). Lecture seule du dépôt. Un événement n'est vu que si le serveur tourne ; il est daté par
// sa source quand elle en donne une date (Git, forge, nom de fichier), sinon à l'intervalle près.
import { fill } from "./i18n.js";
import type { ForgeReader } from "./serve-forge.js";
import { natureOf } from "./serve-forge.js";
import type { Journal } from "./serve-journal.js";
import type { Reader } from "./serve-read.js";
import type { ServeText } from "./serve-texts.js";

const LOCAL_MS = 5000;
// Un serveur démarré avec la session et que personne ne regarde ne doit pas user le quota de la forge.
const NETWORK_EVERY = 6;
const IDLE_NETWORK_EVERY = 60;
const WATCHED_MS = 5 * 60 * 1000;
const BODY_PREVIEW = 280;
const ATTESTATION = /^([A-Z]+-\d+)-(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/;

const dates = (values: (string | null)[]) => values.filter((v): v is string => !!v).sort();
type Limits = Record<string, string>;
interface Seen {
  activity: unknown;
  since: unknown;
  brief: string | null;
  auto_merge: boolean;
  limits: Limits;
  reopened: unknown;
  queue: string;
  lot: { current: number; done: number[] } | null;
}

export function startWatch(deps: { reader: Reader; forge: ForgeReader; journal: Journal; T: ServeText }) {
  const { reader, forge, journal, T } = deps;
  const { add } = journal;

  function watchState() {
    const s = reader.json(".drwil/state.json");
    if (!s) return;
    const lot = reader.json(".drwil/lot.json") as (Seen["lot"] & { brief?: unknown }) | null;
    const cur: Seen = {
      activity: s.activity,
      since: s.since,
      brief: (s.active_brief as string | undefined) ?? null,
      auto_merge: s.auto_merge === true,
      limits: Object.fromEntries(((s.limits ?? []) as { intent: string; choice: string }[]).map((l) => [l.intent, l.choice])),
      reopened: (s.reopened as { pr?: unknown } | undefined)?.pr ?? null,
      queue: ((s.queue ?? []) as string[]).join(", "),
      lot: lot && lot.brief === s.active_brief ? { current: lot.current, done: lot.done } : null,
    };
    const prev = journal.snapshot<Seen>();
    const now = new Date().toISOString();
    const brief = cur.brief ?? prev?.brief ?? null;
    // Au premier relevé, ce qui est déjà dans l'état date d'avant le serveur : on le dit au lieu de le dater faussement.
    const first = prev ? "" : T.firstSeen;
    const was: Pick<Seen, "limits" | "auto_merge" | "reopened" | "queue" | "lot"> = prev ?? {
      limits: {},
      auto_merge: false,
      reopened: null,
      queue: "",
      lot: null,
    };
    if (!prev || prev.activity !== cur.activity || prev.since !== cur.since) {
      const text = prev ? fill(T.activityChanged, prev.activity, cur.activity) : fill(T.activityFirst, cur.activity);
      add({ at: String(cur.since ?? now), kind: "activite", key: `act-${cur.activity}-${cur.since}`, text, brief });
    }
    if (prev && prev.brief !== cur.brief && cur.brief)
      add({ at: now, kind: "fiche", key: `brief-${cur.brief}-${cur.since}`, text: fill(T.activeBrief, cur.brief), brief });
    if (cur.lot && (!was.lot || was.lot.current !== cur.lot.current || was.lot.done.length !== cur.lot.done.length)) {
      for (const n of cur.lot.done.filter((d) => !was.lot?.done.includes(d)))
        add({ at: now, kind: "lot", key: `lotdone-${brief}-${n}`, text: first + fill(T.lotDone, n), brief });
      const key = `lotcur-${brief}-${cur.lot.current}-${cur.lot.done.join(".")}`;
      add({ at: now, kind: "lot", key, text: first + fill(T.lotCurrent, cur.lot.current), brief });
    }
    if (was.auto_merge !== cur.auto_merge) {
      const text = first + (cur.auto_merge ? T.mergeOn : T.mergeOff);
      add({ at: now, kind: "decision", key: `merge-${cur.auto_merge}-${now}`, text, brief });
    }
    for (const [intent, choice] of Object.entries(cur.limits))
      if (was.limits[intent] !== choice) {
        const said = choice === "now" ? T.limitNow : choice === "note" ? T.limitNote : choice;
        add({ at: now, kind: "decision", key: `limit-${intent}-${choice}-${cur.since}`, text: first + fill(T.limit, intent, said), brief });
      }
    if (cur.reopened && was.reopened !== cur.reopened)
      add({
        at: now,
        kind: "reouverture",
        key: `reopen-${cur.reopened}-${cur.since}`,
        text: first + fill(T.reopened, cur.reopened),
        brief,
      });
    if (was.queue !== cur.queue && cur.queue)
      add({ at: now, kind: "file", key: `queue-${cur.queue}-${now}`, text: fill(T.queue, cur.queue), brief });
    journal.saveSnapshot(cur);
  }

  let commitsSeen = false;
  async function watchCommits() {
    const since = journal.empty && !commitsSeen ? "14.days" : "2.days";
    const format = "--format=%x1e%H%x1f%cI%x1f%s%x1f%(trailers:key=Drwil-Lot,valueonly,separator=%x2C)%x1f%b";
    const out = await reader.git("log", "--all", `--since=${since}`, format);
    for (const rec of out.split("\x1e").filter((r) => r.trim())) {
      const [sha, at, subject, lot, rawBody = ""] = rec.split("\x1f");
      // Aperçu sans les trailers (Co-Authored-By, Drwil-Lot…), replié sur une ligne.
      const body = rawBody
        .split("\n")
        .filter((l) => l.trim() && !/^[\w-]+: /.test(l))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      add({
        at,
        kind: /^(Clôture|Closing)\b/.test(subject) ? "cloture" : "commit",
        // Un SHA entier passerait pour un secret au masquage (QUA-271) : douze caractères suffisent à la clé.
        key: `c-${sha.slice(0, 12)}`,
        text: `${subject}${lot.trim() ? fill(T.commitLot, lot.trim()) : ""}`,
        sha: sha.slice(0, 7),
        body: body.length > BODY_PREVIEW ? `${body.slice(0, BODY_PREVIEW)}…` : body,
      });
    }
    commitsSeen = true;
  }

  function watchAttestations() {
    for (const f of reader.list(".drwil/evidence/attestations")) {
      const m = ATTESTATION.exec(f);
      if (m) add({ at: `${m[2]}T${m[3]}:${m[4]}:${m[5]}.${m[6]}Z`, kind: "attestation", key: `att-${f}`, text: fill(T.attestation, m[1]) });
    }
  }

  async function watchPrs() {
    const { prs, cli } = await forge.prs();
    const label = cli === "glab" ? "MR" : "PR";
    for (const p of prs) {
      const nature = natureOf(p.paths);
      const details = { nature, files: p.paths.length };
      add({ at: p.createdAt, kind: "pr", key: `pr-${p.number}-open`, text: fill(T.prOpened, label, p.number, p.title), ...details });
      if (p.mergedAt)
        add({ at: p.mergedAt, kind: "fusion", key: `pr-${p.number}-merged`, text: fill(T.prMerged, label, p.number, p.title), ...details });
      else if (p.closedAt)
        add({ at: p.closedAt, kind: "pr", key: `pr-${p.number}-closed`, text: fill(T.prClosed, label, p.number, p.title), ...details });
    }
  }

  async function watchCi() {
    const { targets, cli } = await forge.ci();
    for (const t of targets) {
      const label = t.kind === "pr" ? `${cli === "glab" ? "MR" : "PR"} #${t.number}` : t.branch;
      for (const w of t.workflows) {
        const starts = dates(w.jobs.map((j) => j.started));
        const ends = dates(w.jobs.map((j) => j.completed));
        if (starts[0]) add({ at: starts[0], kind: "ci", key: `ci-${w.id}-start`, text: fill(T.ciStarted, w.name, label, t.sha) });
        if (w.status !== "completed") continue;
        const ok = w.conclusion === "success";
        const text = ok ? fill(T.ciGreen, w.name, label, t.sha) : fill(T.ciRed, w.conclusion, w.name, label, t.sha);
        add({ at: ends.at(-1) ?? w.created, kind: ok ? "ci-ok" : "ci-ko", key: `ci-${w.id}-end`, text });
      }
    }
  }

  let busy = false;
  let lastViewed = Date.now();
  let ticks = 0;
  let stopped = false;
  async function tick(withNetwork: boolean) {
    if (busy) return;
    busy = true;
    try {
      watchState();
      watchAttestations();
      await watchCommits();
      if (withNetwork && !stopped) {
        await watchPrs();
        await watchCi();
      }
    } finally {
      busy = false;
    }
  }
  const quiet = (run: Promise<void>) => run.catch(() => {});
  // La partie locale d'abord : la première vue n'attend jamais la forge.
  const localReady = quiet(tick(false));
  void localReady.then(() => quiet(tick(true)));
  const timer = setInterval(() => {
    const every = Date.now() - lastViewed < WATCHED_MS ? NETWORK_EVERY : IDLE_NETWORK_EVERY;
    void quiet(tick(++ticks % every === 0));
  }, LOCAL_MS);
  timer.unref();

  return {
    localReady,
    touch: () => {
      lastViewed = Date.now();
    },
    stop: () => {
      stopped = true;
      clearInterval(timer);
    },
  };
}
