import { spawn } from "node:child_process";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";
import type { Command } from "commander";
import { SessionCursor, type HookCursor, type InterfaceCursor } from "./cursor-acp-session.js";

export const texteTerminal = (texte: string): string =>
  [...stripVTControlCharacters(texte)]
    .filter((c) => c === "\n" || c === "\t" || (c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127))
    .join("");

/** Helper interne injectable pour les tests locaux ; aucune option CLI ne fournit une réponse. */
export async function conversationCursor(
  lire: (question: string) => Promise<string | null>,
  afficher: (texte: string) => void,
  créer: (ui: InterfaceCursor) => SessionCursor,
  interrompre: () => void,
): Promise<void> {
  let erreur: Error | undefined;
  const session = créer({
    afficher,
    interrompre: (cause) => {
      erreur = cause;
      interrompre();
    },
    choisir: async (texte, choix) => {
      afficher(`\n${texte}\n${choix.map((c, i) => `${i + 1}. ${c.label}`).join("\n")}\n0. Abandonner\n`);
      const saisie = await lire("Votre choix (aucun défaut) : ");
      const n = saisie !== null && /^(?:[1-9]|10)$/.test(saisie) ? Number(saisie) : 0;
      return n > 0 && n <= choix.length ? choix[n - 1].id : null;
    },
  });
  try {
    await session.initialiser();
    afficher("Client ACP dédié à Cursor — interface distincte du chat habituel. /quitter pour sortir.\n");
    for (let tours = 0; tours < 100; tours++) {
      const texte = await lire("\nVous : ");
      if (erreur) throw erreur;
      if (texte === null || texte === "/quitter") return;
      if (!texte.trim()) continue;
      if (texte.length > 16_000) throw new Error("Message trop long (16 000 caractères maximum).");
      await session.envoyer(texte);
    }
  } finally {
    await session.transport.fermer();
  }
}

/**
 * Le crochet des questions du client : sondages des limites et de fusion (QUA-266), sinon attestation (QUA-235).
 * Un projet dont les hooks précèdent les sondages portables garde l'attestation seule.
 */
export async function crochetCursor(root: string): Promise<HookCursor> {
  const charger = (f: string) => import(pathToFileURL(join(root, ".claude/hooks", f)).href);
  const attestation: { portableAttestationHook: HookCursor } = await charger("portable-attest.mjs");
  const sondages: { portablePollHook?: HookCursor } = await charger("portable-polls.mjs").catch(() => ({}));
  const sondage = sondages.portablePollHook ?? (async () => null);
  return async (événement, options) => (await sondage(événement, options)) ?? attestation.portableAttestationHook(événement, options);
}

export async function lancerCursor(): Promise<void> {
  // QUA-235 : pas de --yes, de réponse en argument ni de stdin redirigé, même si /dev/tty existe.
  if (!process.stdin.isTTY || !process.stdout.isTTY)
    throw new Error("Client ACP Cursor : terminal humain interactif requis ; aucune attestation.");
  const root = process.cwd();
  const crochet = await crochetCursor(root);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const abort = new AbortController();
  let session: SessionCursor | undefined;
  const arrêter = () => {
    if (abort.signal.aborted) return;
    abort.abort();
    rl.close();
    void session?.transport.fermer();
  };
  rl.on("SIGINT", arrêter);
  rl.on("close", arrêter);
  try {
    await conversationCursor(
      async (question) => {
        if (abort.signal.aborted) return null;
        try {
          return await rl.question(question, { signal: abort.signal });
        } catch (e) {
          if (abort.signal.aborted) return null;
          throw e;
        }
      },
      (texte) => process.stdout.write(texteTerminal(texte)),
      (ui) => {
        session = new SessionCursor(spawn("agent", ["acp"], { cwd: root, stdio: "pipe" }), root, ui, crochet);
        return session;
      },
      arrêter,
    );
  } finally {
    arrêter();
  }
}

export function registerCursor(program: Command): void {
  program
    .command("cursor-acp")
    .allowExcessArguments(false)
    .description("Ouvrir le client humain dédié à Cursor ACP (agent acp installé et connecté séparément)")
    .action(async () => {
      try {
        await lancerCursor();
      } catch (e) {
        console.error(`✗ ${texteTerminal((e as Error).message)}`);
        process.exitCode = 1;
      }
    });
}
