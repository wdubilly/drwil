// QUA-235 : transport dédié, sans exécution de commande fournie par le modèle.
import type { ChildProcessWithoutNullStreams } from "node:child_process";

type Objet = Record<string, unknown>;
type Identifiant = string | number;
export const objet = (v: unknown): v is Objet => v !== null && typeof v === "object" && !Array.isArray(v);
const identifiant = (v: unknown): v is Identifiant => typeof v === "string" || (typeof v === "number" && Number.isSafeInteger(v));

export class ErreurACP extends Error {
  constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
  }
}

/** JSON-RPC délimité par lignes, selon la documentation ACP Cursor. */
export class TransportCursor {
  private prochain = 1;
  private tampon = "";
  private octets = 0;
  private erreur?: Error;
  private attentes = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: NodeJS.Timeout }>();
  private reçus = new Set<Identifiant>();
  private fermé: Promise<void>;
  private terminé = false;
  private minuterie: NodeJS.Timeout;
  private arrêt?: Promise<void>;

  constructor(
    private readonly processus: ChildProcessWithoutNullStreams,
    private readonly traiter: (méthode: string, paramètres: unknown) => Promise<unknown>,
    private readonly notifier: (méthode: string, paramètres: unknown) => void,
    private readonly interrompre: (erreur?: Error) => void,
    private readonly délai = 300_000,
  ) {
    this.fermé = new Promise((resolve) =>
      processus.once("close", () => {
        this.terminé = true;
        this.échouer(new Error("Session ACP fermée."));
        resolve();
      }),
    );
    processus.once("error", (e) => this.échouer(e));
    processus.stdin.on("error", (e) => this.échouer(e));
    processus.stdout.setEncoding("utf8");
    processus.stdout.on("data", (chunk: string) => {
      try {
        this.octets += Buffer.byteLength(chunk);
        this.tampon += chunk;
        if (this.octets > 32 * 1024 * 1024 || Buffer.byteLength(this.tampon) > 1024 * 1024)
          throw new Error("Limite de transport ACP dépassée.");
        let fin = this.tampon.indexOf("\n");
        while (fin >= 0) {
          const ligne = this.tampon.slice(0, fin);
          this.tampon = this.tampon.slice(fin + 1);
          this.recevoir(JSON.parse(ligne));
          fin = this.tampon.indexOf("\n");
        }
      } catch (e) {
        this.échouer(e as Error);
      }
    });
    // stderr est drainé sans recopier d'éventuels secrets du runtime ; les erreurs RPC restent explicites.
    processus.stderr.resume();
    this.minuterie = setTimeout(() => this.échouer(new Error("Durée maximale ACP dépassée.")), 1_800_000);
  }

  private échouer(erreur: Error, signaler = true): void {
    if (this.erreur) return;
    this.erreur = erreur;
    for (const a of this.attentes.values()) {
      clearTimeout(a.timer);
      a.reject(erreur);
    }
    this.attentes.clear();
    this.interrompre(signaler ? erreur : undefined);
  }

  private écrire(message: Objet): void {
    if (this.erreur) throw this.erreur;
    this.processus.stdin.write(JSON.stringify({ jsonrpc: "2.0", ...message }) + "\n");
  }

  private recevoir(message: unknown): void {
    if (!objet(message) || message.jsonrpc !== "2.0") throw new Error("Enveloppe ACP invalide.");
    if (typeof message.method === "string") {
      if (message.id === undefined) {
        this.notifier(message.method, message.params);
        return;
      }
      if (!identifiant(message.id) || this.reçus.has(message.id) || this.reçus.size >= 10_000)
        throw new Error("Identifiant ACP invalide ou rejoué.");
      const id = message.id;
      this.reçus.add(id);
      void this.traiter(message.method, message.params).then(
        (result) => {
          if (!this.erreur) this.écrire({ id, result });
        },
        (e: Error) => {
          if (!this.erreur) this.écrire({ id, error: { code: e instanceof ErreurACP ? e.code : -32603, message: e.message } });
        },
      );
      return;
    }
    const attente = typeof message.id === "number" ? this.attentes.get(message.id) : undefined;
    if (!attente || "result" in message === "error" in message) throw new Error("Réponse ACP inattendue.");
    if ("error" in message && (!objet(message.error) || typeof message.error.message !== "string"))
      throw new Error("Erreur ACP malformée.");
    this.attentes.delete(message.id as number);
    clearTimeout(attente.timer);
    if ("error" in message) {
      attente.reject(new Error(`Cursor ACP : ${(message.error as Objet).message}`));
    } else attente.resolve(message.result);
  }

  demander(méthode: string, paramètres: unknown): Promise<unknown> {
    if (this.erreur) return Promise.reject(this.erreur);
    if (this.attentes.size >= 16) return Promise.reject(new Error("Trop de requêtes ACP."));
    const id = this.prochain++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.échouer(new Error(`Délai ACP dépassé : ${méthode}`)), this.délai);
      this.attentes.set(id, { resolve, reject, timer });
      this.écrire({ id, method: méthode, params: paramètres });
    });
  }

  fermer(): Promise<void> {
    this.arrêt ??= Promise.resolve().then(() => this.nettoyer());
    return this.arrêt;
  }

  private async nettoyer(): Promise<void> {
    clearTimeout(this.minuterie);
    this.échouer(new Error("Client ACP arrêté."), false);
    this.processus.stdin.end();
    if (!this.terminé) this.processus.kill("SIGTERM");
    const arrêtForcé = setTimeout(() => {
      if (!this.terminé) this.processus.kill("SIGKILL");
    }, 1000);
    await this.fermé;
    clearTimeout(arrêtForcé);
  }
}
