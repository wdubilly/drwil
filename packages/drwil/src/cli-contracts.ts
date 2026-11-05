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

/** Loads the project and its valid registry; an Outcome when it cannot (invalid registry: nothing may be written). */
async function openRegistry(root: string) {
  const T = texts().adopt;
  const project = await loadProject(root);
  if (typeof project === "string") return { fail: { code: 2, message: project } as Outcome };
  const { lang, cfg, registry, contracts: reader } = project;
  const catalogFile: string = cfg.dirs?.catalog ?? "docs/contracts-catalog.md";
  const registryText = readFileSync(join(root, registry), "utf8");
  const existing: any[] = reader.readContracts(registryText);
  const invalid: any[] = reader.validateContracts(existing, reader.knownChecks(cfg), lang);
  if (invalid.length) return { fail: { code: 2, message: fill(T.invalidRegistry, registry, invalid[0].message) } as Outcome };
  const catalogLines = existsSync(join(root, catalogFile)) ? readFileSync(join(root, catalogFile), "utf8").split("\n") : null;
  return { lang, cfg, registry, reader, catalogFile, registryText, existing, catalogLines };
}

/** Appends a block to the registry if the result is still valid; the registry is untouched otherwise. */
function appendBlock(root: string, o: any, id: string, block: string): Outcome | null {
  const next = `${o.registryText.replace(/\s*$/, "")}\n\n${block}\n`;
  const after: any[] = o.reader.readContracts(next);
  if (o.reader.validateContracts(after, o.reader.knownChecks(o.cfg), o.lang).length || !after.some((k) => k.id === id))
    return { code: 2, message: fill(texts().adopt.invalidRegistry, o.registry, id) };
  writeFileSync(join(root, o.registry), next);
  return null;
}

/** `drwil contracts add [ID]`: writes the skeleton of a project's own contract, under an ID never defined (registry or catalog). */
export async function addContract(root: string, rawId: string | undefined, opts: { title?: string; rule?: string } = {}): Promise<Outcome> {
  const T = texts().adopt;
  const o: any = await openRegistry(root);
  if (o.fail) return o.fail;
  const taken = (id: string) => o.existing.some((k: any) => k.id === id) || (o.catalogLines && catalogRow(o.catalogLines, id));
  let id = rawId;
  for (let n = 1; id === undefined; n++) if (!taken(`PRJ-${n}`)) id = `PRJ-${n}`;
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(id)) return refuse(T.noId);
  if (taken(id)) return refuse(fill(T.defined, id, `${o.registry} / ${o.catalogFile}`));
  const blocked = await scopeProblem(root, o.cfg, [o.registry]);
  if (blocked) return refuse(blocked);

  const L = LABELS[o.lang === "en" ? "en" : "fr"];
  const todo = T.todo;
  const failed = appendBlock(
    root,
    o,
    id,
    [
      `## ${id} — ${opts.title?.trim() || todo}`,
      `**${L.rule}** : ${opts.rule?.trim() || todo}`,
      `**${L.scope}** : ${todo}`,
      `**${L.manual}** : ${todo}`,
    ].join("\n"),
  );
  return failed ?? { code: 0, message: fill(T.added, id, o.registry) };
}

/** `drwil contracts adopt <ID>`: moves a catalog contract to the registry; refuses without writing anything. */
export async function adoptContract(root: string, rawId: string | undefined): Promise<Outcome> {
  const T = texts().adopt;
  const id = (rawId ?? "").replace(/^catal(?:ogue|og):/, "");
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(id)) return refuse(T.noId);
  const o: any = await openRegistry(root);
  if (o.fail) return o.fail;
  const { lang, cfg, registry, catalogFile, existing, catalogLines } = o;
  if (!catalogLines) return refuse(fill(T.noCatalog, catalogFile));
  if (existing.some((k: any) => k.id === id)) return refuse(fill(T.defined, id, registry));

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
  const failed = appendBlock(root, o, id, block);
  if (failed) return failed;

  catalogLines.splice(row.at, 1);
  writeFileSync(join(root, catalogFile), catalogLines.join("\n"));
  return { code: 0, message: fill(T.done, id, registry, catalogFile) };
}

const finish = (r: Outcome): never => {
  (r.code === 0 ? console.log : console.error)(r.code === 0 ? r.message : `✗ ${r.message}`);
  process.exit(r.code);
};

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
    .action(async (id) => finish(await adoptContract(process.cwd(), id)));

  contracts
    .command("add")
    .argument("[id]", "ID of the new contract (default: next free PRJ-<n>), never already defined")
    .option("--title <text>", "Title of the contract")
    .option("--rule <text>", "Rule of the contract")
    .description("Write the skeleton of a contract of the project's own (registry): refuses without writing anything")
    .action(async (id, opts) => finish(await addContract(process.cwd(), id, opts)));
}
