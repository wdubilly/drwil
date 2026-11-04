// QUA-235 : seule l'interface humaine fournit les choix ; les paramètres ACP ne portent aucune réponse.
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { ErreurACP, objet, TransportCursor } from "./cursor-acp.js";

export interface InterfaceCursor {
  choisir: (texte: string, choix: { id: string; label: string }[]) => Promise<string | null>;
  afficher: (texte: string) => void;
  interrompre: (erreur?: Error) => void;
}
export type HookCursor = (
  événement: { sessionId: string; params: unknown; response?: unknown },
  options: { root: string; tool: "cursor"; phase: "pre" | "post"; tell: (texte: string) => void; isActive: () => boolean },
) => Promise<number | null>;

export class SessionCursor {
  readonly transport: TransportCursor;
  private session?: string;
  private ouverte = false;
  private occupée = false;
  private arrêtée = false;

  constructor(
    processus: ChildProcessWithoutNullStreams,
    private readonly root: string,
    private readonly ui: InterfaceCursor,
    private readonly hook: HookCursor,
    délai?: number,
  ) {
    this.transport = new TransportCursor(
      processus,
      (m, p) => this.traiter(m, p),
      (m, p) => this.notifier(m, p),
      (erreur) => {
        this.arrêtée = true;
        ui.interrompre(erreur);
      },
      délai,
    );
  }

  private notifier(méthode: string, paramètres: unknown): void {
    if (méthode === "session/update" && objet(paramètres) && paramètres.sessionId === this.session && objet(paramètres.update)) {
      const u = paramètres.update;
      if (u.sessionUpdate === "agent_message_chunk" && objet(u.content) && typeof u.content.text === "string")
        this.ui.afficher(u.content.text);
    } else if (["cursor/update_todos", "cursor/task", "cursor/generate_image"].includes(méthode)) this.ui.afficher(`[ACP : ${méthode}]\n`);
    else throw new Error(`Notification ACP non prise en charge : ${méthode}`);
  }

  private async traiter(méthode: string, p: unknown): Promise<unknown> {
    if (!this.ouverte || !this.session || this.arrêtée) throw new ErreurACP(-32000, "Session sans demande humaine active.");
    if (this.occupée) throw new ErreurACP(-32000, "Une question humaine est déjà en attente.");
    this.occupée = true;
    try {
      if (méthode === "cursor/create_plan") {
        this.ui.afficher("[ACP : plan refusé, approbation de plan non prise en charge.]\n");
        return { outcome: { outcome: "rejected", reason: "Client dédié aux questions ; approbation de plan non prise en charge." } };
      }
      if (méthode === "session/request_permission") {
        if (
          !objet(p) ||
          p.sessionId !== this.session ||
          !objet(p.toolCall) ||
          typeof p.toolCall.toolCallId !== "string" ||
          !p.toolCall.toolCallId.trim() ||
          !Array.isArray(p.options) ||
          !p.options.length ||
          p.options.length > 10
        )
          throw new ErreurACP(-32602, "Permission ACP invalide.");
        const choix = p.options.map((o: unknown) => {
          if (
            !objet(o) ||
            typeof o.optionId !== "string" ||
            !o.optionId ||
            typeof o.name !== "string" ||
            !["allow_once", "allow_always", "reject_once", "reject_always"].includes(String(o.kind))
          )
            throw new ErreurACP(-32602, "Option de permission ACP invalide.");
          return { id: o.optionId, label: `${o.name} (${o.kind})` };
        });
        if (new Set(choix.map((c) => c.id)).size !== choix.length) throw new ErreurACP(-32602, "Identifiants de permission dupliqués.");
        const titre = objet(p.toolCall) && typeof p.toolCall.title === "string" ? p.toolCall.title : "outil Cursor";
        const réponse = await this.ui.choisir(
          `Permission ACP : ${titre}\nDétails fournis par Cursor :\n${JSON.stringify(p.toolCall, null, 2)}`,
          choix,
        );
        return {
          outcome:
            réponse !== null && !this.arrêtée && choix.some((c) => c.id === réponse)
              ? { outcome: "selected", optionId: réponse }
              : { outcome: "cancelled" },
        };
      }
      if (méthode !== "cursor/ask_question") throw new ErreurACP(-32601, `Méthode ACP non prise en charge : ${méthode}`);
      if (
        !objet(p) ||
        typeof p.toolCallId !== "string" ||
        !p.toolCallId.trim() ||
        !Array.isArray(p.questions) ||
        p.questions.length !== 1 ||
        (p.title !== undefined && typeof p.title !== "string")
      )
        throw new ErreurACP(-32602, "Question ACP invalide : une seule question à choix simple requise.");
      const q: unknown = p.questions[0];
      if (
        !objet(q) ||
        typeof q.id !== "string" ||
        !q.id ||
        typeof q.prompt !== "string" ||
        !q.prompt ||
        (q.allowMultiple !== undefined && q.allowMultiple !== false) ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.length > 10
      )
        throw new ErreurACP(-32602, "Choix ACP invalides.");
      const choix = q.options.map((o: unknown) => {
        if (!objet(o) || typeof o.id !== "string" || !o.id || typeof o.label !== "string" || !o.label)
          throw new ErreurACP(-32602, "Option ACP invalide.");
        return { id: o.id, label: o.label };
      });
      if (new Set(choix.map((c) => c.id)).size !== choix.length) throw new ErreurACP(-32602, "Identifiants de choix dupliqués.");
      const événement = { sessionId: this.session, params: p };
      const options = { root: this.root, tool: "cursor" as const, tell: this.ui.afficher, isActive: () => this.ouverte && !this.arrêtée };
      // Aucun sondage ressemblant à une attestation ne devient une question ordinaire par repli.
      const attestation = JSON.stringify(p).includes("drwil-attest");
      const préparation = await this.hook(événement, { ...options, phase: "pre" });
      if ((préparation !== null && préparation !== 0) || (attestation && préparation !== 0))
        throw new ErreurACP(-32602, "Préparation d'attestation refusée ; rien n'est attesté.");
      let réponse: unknown = { outcome: { outcome: "cancelled" } };
      try {
        const sélection = await this.ui.choisir(`${p.title ? `${p.title}\n` : ""}${q.prompt}`, choix);
        if (sélection !== null && this.ouverte && !this.arrêtée && choix.some((c) => c.id === sélection))
          réponse = { outcome: { outcome: "answered", answers: [{ questionId: q.id, selectedOptionIds: [sélection] }] } };
        return réponse;
      } finally {
        if (préparation === 0) await this.hook({ ...événement, response: réponse }, { ...options, phase: "post" });
      }
    } finally {
      this.occupée = false;
    }
  }

  async initialiser(): Promise<void> {
    const init = await this.transport.demander("initialize", {
      protocolVersion: 1,
      clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
      clientInfo: { name: "drwil-cursor-acp", version: "1" },
    });
    if (!objet(init) || init.protocolVersion !== 1) throw new Error("Version ACP incompatible.");
    await this.transport.demander("authenticate", { methodId: "cursor_login" });
    const session = await this.transport.demander("session/new", { cwd: this.root, mcpServers: [] });
    if (!objet(session) || typeof session.sessionId !== "string" || !session.sessionId.trim())
      throw new Error("Identifiant de session ACP absent.");
    this.session = session.sessionId;
  }

  async envoyer(texte: string): Promise<void> {
    if (this.ouverte || !this.session || this.arrêtée) throw new Error("Session ACP indisponible.");
    this.ouverte = true;
    try {
      const fin = await this.transport.demander("session/prompt", { sessionId: this.session, prompt: [{ type: "text", text: texte }] });
      if (this.occupée) throw new Error("Tour ACP fermé pendant une question humaine.");
      if (!objet(fin) || typeof fin.stopReason !== "string") throw new Error("Fin de tour ACP invalide.");
      this.ui.afficher(`\n[ACP : ${fin.stopReason}]\n`);
    } finally {
      this.ouverte = false;
    }
  }
}
