import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Languages a project can be written in; the kit itself is in English. */
export type MessageLang = "fr" | "en";

/** Language of the CLI's messages for a folder: the project's `lang`, English outside a project. */
export function projectLang(dir: string): MessageLang {
  try {
    return JSON.parse(readFileSync(join(dir, ".drwil", "ia-first.json"), "utf8")).lang === "fr" ? "fr" : "en";
  } catch {
    return "en";
  }
}

/** Fills the `{0}`, `{1}`… holes of a message. */
export function fill(message: string, ...values: unknown[]): string {
  return message.replace(/\{(\d)\}/g, (_, i) => String(values[Number(i)]));
}
