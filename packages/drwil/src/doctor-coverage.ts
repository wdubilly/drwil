// Coverage points of `drwil doctor`: contracts with a proof, human contracts with a `**Covers**` field, tests run twice.
import { fill, type MessageLang } from "./i18n.js";
import { TEXTS } from "./doctor-texts.js";
import { lacksCoverage } from "./coverage.js";
import type { DiagnosisPoint } from "./doctor.js";
import { declaredPair, singleFromPair } from "./guarantees-merge.js";

type LiveContract = Parameters<typeof lacksCoverage>[0] & { id: string };

/**
 * Point `coverage-twice` (QUA-303): each layer that still declares `coverage-<layer>` and `coverage-diff-<layer>` (c8),
 * with the single command that keeps the requester's options; read only, nothing written. None: no point.
 */
export function doubleRunPoints(checks: unknown, lang: MessageLang): DiagnosisPoint[] {
  const list = Array.isArray(checks) ? checks : [];
  const found = list.flatMap((c) => {
    const slug = typeof c?.id === "string" ? /^coverage-diff-(.+)$/.exec(c.id)?.[1] : undefined;
    const pair = slug ? declaredPair(list, slug) : null;
    const single = pair && singleFromPair(pair);
    return single ? [fill(TEXTS[lang].twiceDetail, `coverage-${slug}`, `coverage-diff-${slug}`, single)] : [];
  });
  return found.length ? [{ id: "coverage-twice", label: TEXTS[lang].twice, state: "warning", detail: found.join(" ; ") }] : [];
}

/** Points `proofs` and `coverage`, read from the live contracts (the caller leaves out the retired ones, QUA-298). */
export function coveragePoints(live: LiveContract[], lang: MessageLang, checks?: unknown): DiagnosisPoint[] {
  const T = TEXTS[lang];
  const noCheck = live.filter((k) => !k.checks?.length).map((k) => k.id);
  const uncovered = live.filter(lacksCoverage);
  const human = live.filter((k) => k.form === "section" && (k.manual || k.checks === null)).length;
  return [
    {
      id: "proofs",
      label: T.proofs,
      state: noCheck.length ? "warning" : "ok",
      detail: `${live.filter((k) => k.checks?.length).length}/${live.length}${noCheck.length ? fill(T.noCheck, noCheck.join(", ")) : ""}`,
    },
    {
      id: "coverage",
      label: T.coverage,
      state: uncovered.length ? "warning" : "ok",
      detail: `${human - uncovered.length}/${human}${uncovered.length ? fill(T.noCovers, uncovered.map((k) => k.id).join(", ")) : ""}`,
    },
    ...doubleRunPoints(checks, lang),
  ];
}
