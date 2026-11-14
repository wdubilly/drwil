// Coverage points of `drwil doctor`: contracts with a proof, human contracts with a `**Covers**` field.
import { fill, type MessageLang } from "./i18n.js";
import { TEXTS } from "./doctor-texts.js";
import { lacksCoverage } from "./coverage.js";
import type { DiagnosisPoint } from "./doctor.js";

type LiveContract = Parameters<typeof lacksCoverage>[0] & { id: string };

/** Points `proofs` and `coverage`, read from the live contracts (the caller leaves out the retired ones, QUA-298). */
export function coveragePoints(live: LiveContract[], lang: MessageLang): DiagnosisPoint[] {
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
  ];
}
