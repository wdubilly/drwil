// Hooks named at the start (QUA-137): a brief whose `scope` block cites an existing file of `.githooks/` without a
// bullet of its « Modified contracts » section that names it is reported when the workstream starts, with the bullet
// to write — the rule of `undeclaredHooks` (base-checks.mjs), applied before the work rather than at the closing.
// Information only: the start is never refused for it; the refusal at the closing (QUA-137) is unchanged.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { declaredIn, hookDeclared } from "./base-checks.mjs";
import { config } from "./briefs.mjs";
import { readBlock } from "./scope.mjs";

const bullets = (files, line) => files.map((f) => `« - \`${f}\` — ${line} »`).join(", ");
const TEXTS = {
  fr: (files) =>
    `\navertissement : le bloc scope cite ${files.map((f) => `\`${f}\``).join(", ")} sans puce dans « Contrats modifiés » : sans elle, la clôture sera refusée (QUA-137) et le rejeu de la CI aussi — ajouter à la section « Contrats modifiés » de la fiche ${bullets(files, "<ce qui change> (validé par le demandeur le <date>)")} ; un test modifié se déclare par son nom ou par celui de son module ; aucune puce n'est due pour un fichier seulement mentionné dans le texte de la fiche, hors du bloc scope ; la puce s'écrit sur le oui du demandeur, jamais sans`,
  en: (files) =>
    `\nwarning: the scope block cites ${files.map((f) => `\`${f}\``).join(", ")} without a bullet in « Modified contracts »: without it the closing will be refused (QUA-137) and so will the CI replay — add to the « Modified contracts » section of the brief ${bullets(files, "<what changes> (approved by the requester on <date>)")}; a modified test is declared by its own name or by its module's; no bullet is due for a file only mentioned in the brief's text, outside the scope block; the bullet is written on the requester's yes, never without`,
};

/** The existing files of `.githooks/` that the scope of `text` cites (a template path included; a test file named as cited) with no bullet declaring them. */
export function undeclaredCited(root, text) {
  const cited = new Set();
  for (const pattern of readBlock(text).patterns) {
    const at = pattern.indexOf(".githooks/");
    if (at <= 0 ? at < 0 : pattern[at - 1] !== "/") continue;
    const file = pattern.slice(at);
    if (existsSync(join(root, file))) cited.add(file);
  }
  const declared = new Set(declaredIn(text));
  return [...cited].filter((f) => !hookDeclared(declared, f));
}

/** The warning to append to a start's message: empty without any such hook. */
export function undeclaredCitedWarning(root, text) {
  const files = undeclaredCited(root, text);
  return files.length ? TEXTS[config(root).lang === "en" ? "en" : "fr"](files) : "";
}
