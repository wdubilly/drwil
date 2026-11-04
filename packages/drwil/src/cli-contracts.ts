// biome-ignore-all lint/suspicious/noExplicitAny: moteur, lecteur de contrats et d'état .mjs chargés dynamiquement depuis le projet (comme verify-project.ts)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { Command } from "commander";
import { fill } from "./i18n.js";
import { listContracts } from "./doctor.js";
import { texts } from "./cli-texts.js";
import { loadProject } from "./verify.js";

export interface Outcome {
  code: 0 | 1 | 2;
  message: string;
}

const LABELS = {
  fr: { rule: "Règle", scope: "Périmètre", proof: "Preuve", manual: "Manuel" },
  en: { rule: "Rule", scope: "Scope", proof: "Proof", manual: "Manual" },
};

const refuse = (message: string): Outcome => ({ code: 1, message });
const load = async (root: string, file: string) => import(pathToFileURL(join(root, ".githooks", file)).href);

/** Cells of the catalog row `catalogue:ID` (or `catalog:ID`), with its line index; null if absent. */
function catalogRow(lines: string[], id: string) {
  const at = lines.findIndex((l) => new RegExp(`^\\|\\s*catal(?:ogue|og):${id}\\s*\\|`).test(l));
  if (at < 0) return null;
  const cells = lines[at]
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
  return { at, rule: cells[1] ?? "", scope: cells[2] ?? "", check: cells[3] ?? "" };
}

/** Title of the registry block: the rule's first clause, cut at 70 characters. */
function titleOf(rule: string) {
  const clause = rule
    .split(/[;.](?:\s|$)/)[0]
    .replace(/`/g, "")
    .trim();
  return clause.length > 70 ? `${clause.slice(0, 67).trimEnd()}…` : clause;
}

// QUA-172 : en BUILD, le registre et le catalogue restent soumis au cadrage de la fiche active.
async function scopeProblem(root: string, cfg: any, files: string[]): Promise<string | null> {
  const T = texts().adopt;
  if (!existsSync(join(root, ".drwil", "state.json"))) return null;
  const { state } = (await load(root, "state-validate.mjs")).readState(root);
  if (state.activity === "SCOPING") return null;
  if (state.activity !== "BUILD") return fill(T.activity, state.activity);
  const scope = await load(root, "scope.mjs");
  const brief = join(root, state.active_brief);
  const patterns = scope.withMirrors(scope.readBlock(readFileSync(brief, "utf8")).patterns, cfg);
  const outside = files.find((f) => !patterns.some((p: string) => scope.fnmatch(f, p)));
  return outside ? fill(T.outside, outside, state.active_brief) : null;
}

/** `drwil contracts adopt <ID>`: moves a catalog contract to the registry; refuses without writing anything. */
export async function adoptContract(root: string, rawId: string | undefined): Promise<Outcome> {
  const T = texts().adopt;
  const id = (rawId ?? "").replace(/^catal(?:ogue|og):/, "");
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(id)) return refuse(T.noId);
  const project = await loadProject(root);
  if (typeof project === "string") return { code: 2, message: project };
  const { lang, cfg, registry, contracts: reader } = project;
  const catalogFile: string = cfg.dirs?.catalog ?? "docs/contracts-catalog.md";
  if (!existsSync(join(root, catalogFile))) return refuse(fill(T.noCatalog, catalogFile));

  const registryText = readFileSync(join(root, registry), "utf8");
  const existing: any[] = reader.readContracts(registryText);
  const invalid: any[] = reader.validateContracts(existing, reader.knownChecks(cfg), lang);
  if (invalid.length) return { code: 2, message: fill(T.invalidRegistry, registry, invalid[0].message) };
  if (existing.some((k) => k.id === id)) return refuse(fill(T.defined, id, registry));

  const catalogLines = readFileSync(join(root, catalogFile), "utf8").split("\n");
  const row = catalogRow(catalogLines, id);
  if (!row) return refuse(fill(T.notFound, id, catalogFile));
  if (!row.check) return refuse(fill(T.noCheck, id));

  const blocked = await scopeProblem(root, cfg, [registry, catalogFile]);
  if (blocked) return refuse(blocked);

  const L = LABELS[lang === "en" ? "en" : "fr"];
  const block = [
    `## ${id} — ${titleOf(row.rule)}`,
    `**${L.rule}** : ${row.rule}`,
    `**${L.scope}** : ${row.scope}`,
    `**${L.proof}** : ${row.check}`,
    `**${L.manual}** : ${row.check}`,
  ].join("\n");
  const next = `${registryText.replace(/\s*$/, "")}\n\n${block}\n`;
  const after: any[] = reader.readContracts(next);
  if (reader.validateContracts(after, reader.knownChecks(cfg), lang).length || !after.some((k) => k.id === id))
    return { code: 2, message: fill(T.invalidRegistry, registry, id) };

  catalogLines.splice(row.at, 1);
  writeFileSync(join(root, registry), next);
  writeFileSync(join(root, catalogFile), catalogLines.join("\n"));
  return { code: 0, message: fill(T.done, id, registry, catalogFile) };
}

export function registerContracts(program: Command): void {
  const contracts = program
    .command("contracts")
    .description("List and validate the project's contracts without running them: valid (exit 0), invalid registry (exit 2)")
    .option("--json", "Machine-readable output (stable format, version 1)")
    .action(async (opts) => {
      try {
        const r = await listContracts({ targetDir: process.cwd() });
        console.log(
          opts.json
            ? JSON.stringify(r, null, 2)
            : [
                `${r.registry ?? ""}`,
                ...r.contracts.map(
                  (k) => `  ${k.id.padEnd(8)} ${k.checks.length ? k.checks.join(", ") : "—"}${k.manual ? texts().manual : ""}  ${k.title}`,
                ),
                ...r.errors.map((e) => `✗ ${e}`),
                ...("error" in r && r.error ? [`✗ ${r.error}`] : []),
              ].join("\n"),
        );
        process.exit(r.exitCode);
      } catch (e) {
        if (opts.json) console.log(JSON.stringify({ version: 1, status: "error", exitCode: 2, error: (e as Error).message }, null, 2));
        else console.error(`✗ ${(e as Error).message}`);
        process.exit(2);
      }
    });

  contracts
    .command("adopt")
    .argument("[id]", "ID of the catalog contract to adopt (e.g. QUA-005)")
    .description("Move a contract from the catalog to the registry, with the check the catalog proposes: refuses without writing anything")
    .action(async (id) => {
      const r = await adoptContract(process.cwd(), id);
      (r.code === 0 ? console.log : console.error)(r.code === 0 ? r.message : `✗ ${r.message}`);
      process.exit(r.code);
    });
}
