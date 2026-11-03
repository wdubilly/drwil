// Exécution des contrôles de verify, isolée du jugement des contrats (QUA-001).
import { reusableVerdicts, type ReusedVerdict } from "./evidence.js";
import { pendingGuarantees } from "./guarantees-verify.js";
import type { Project } from "./verify-project.js";
import type { CheckResult, VerifyOptions } from "./verify-types.js";

type RawResult = Omit<CheckResult, "id"> & { launched?: boolean };
interface Runnable {
  id: string;
  reuse?: boolean;
  run: (opts: { stdio: string }) => RawResult;
}

export async function replayChecks(
  root: string,
  { engine, cfg }: Pick<Project, "engine" | "cfg">,
  contracts: { checks?: string[] | null }[],
  opts: VerifyOptions,
) {
  // `whole` juge le dépôt entier, pas un index vide.
  const checks = engine.checks(root, { cfg, whole: true }) as Runnable[];
  const available = new Map(checks.map((c) => [c.id, c] as const));
  const deferred = pendingGuarantees(root, cfg);
  const cache = new Map<string, CheckResult>();
  const cited = [...new Set(contracts.flatMap((k) => (k.checks ?? []).filter((id) => available.has(id))))];
  // QUA-140, QUA-141 : la clôture ne reprend que le verdict d'un arbre identique.
  const reused = opts.reuse === false ? new Map<string, ReusedVerdict>() : reusableVerdicts(root, engine, available, !opts.evidence);
  // QUA-139 : lancement parallèle, lecture en ordre du registre.
  const started: Map<string, Promise<RawResult>> | undefined = engine.startParallel?.(
    cited.filter((id) => !reused.has(id) && !deferred.has(id)).map((id) => available.get(id)),
  );
  const run = async (id: string): Promise<void> => {
    opts.onCheck?.(id);
    if (deferred.has(id)) return void cache.set(id, { id, status: "not-applicable", detail: deferred.get(id) });
    const taken = reused.get(id);
    if (taken) {
      opts.onCheck?.(id, taken.status);
      return void cache.set(id, {
        id,
        status: taken.status,
        output: taken.output,
        durationMs: taken.durationMs,
        reusedAt: taken.ranAt,
        reusedBasis: taken.basis,
      });
    }
    const pending = started?.get(id);
    const { launched: _launched, ...raw } = pending
      ? await pending.catch((e: Error): RawResult => ({ status: "not-run", detail: e.message }))
      : (available.get(id) as Runnable).run({ stdio: "pipe" });
    opts.onCheck?.(id, raw.status);
    cache.set(id, { id, ...raw });
  };
  for (const id of cited) await run(id);
  return { available, cache, deferred };
}
