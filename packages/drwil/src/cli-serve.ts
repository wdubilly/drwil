// Commande `drwil serve` : un seul serveur par projet, détaché ou non (QUA-272). L'état d'exécution vit dans
// le cache de l'utilisateur, jamais dans le dépôt (QUA-280), et ne porte jamais le jeton (QUA-281).
import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  linkSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import type { Command } from "commander";
import { fill, projectLang } from "./i18n.js";
import { accessToken, LOCAL_HOST, ServeRefusal, TOKEN_ENV } from "./serve-auth.js";
import { welcomeCommand } from "./serve-publish.js";
import { projectCacheDir, type RunningServer, startServer } from "./serve.js";
import { SERVE_TEXTS, type ServeMessage } from "./serve-texts.js";

// Au-delà, une réservation sans port est celle d'un processus mort dont le PID a été réattribué.
const CLAIM_TTL_MS = 15000;
const DETACH_TIMEOUT_MS = 10000;
const WILDCARD: Record<string, string> = { "0.0.0.0": LOCAL_HOST, "::": "::1" };

interface ServerRecord {
  pid: number;
  at: number;
  host?: string;
  port?: number;
  url?: string;
}

export interface ServeCommandOptions {
  root: string;
  host: string;
  port?: string;
  detach?: boolean;
}

function parsePort(value: string | undefined): number | null {
  if (value === undefined) return null;
  if (!/^\d{1,5}$/.test(value) || Number(value) > 65535) throw new ServeRefusal("badPort", [value]);
  return Number(value);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

function listening(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: WILDCARD[host] ?? host, port, timeout: 1000 });
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    socket.once("timeout", () => done(false));
  });
}

/** `undefined` : pas de fichier ; `null` : fichier illisible, donc périmé (il n'apparaît jamais incomplet). */
function readRecord(file: string): ServerRecord | null | undefined {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Le serveur vivant de ce projet ; un enregistrement périmé (redémarrage, arrêt brutal) est effacé. */
async function findRunning(file: string): Promise<ServerRecord | null> {
  const record = readRecord(file);
  if (record && isAlive(record.pid)) {
    if (record.port !== undefined && (await listening(record.host as string, record.port))) return record;
    if (record.port === undefined && Date.now() - record.at < CLAIM_TTL_MS) return record;
  }
  // Sans fichier lu, rien à effacer : celui apparu depuis la lecture est la réservation d'un concurrent.
  if (record !== undefined) rmSync(file, { force: true });
  return null;
}

/** Réservation exclusive : `linkSync` échoue si le fichier existe, et le fichier n'apparaît que complet. */
function claim(file: string): boolean {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}`;
  writeFileSync(tmp, JSON.stringify({ pid: process.pid, at: Date.now() }));
  try {
    linkSync(tmp, file);
    return true;
  } catch {
    return false;
  } finally {
    rmSync(tmp, { force: true });
  }
}

function writeRecord(file: string, record: ServerRecord): void {
  const tmp = `${file}.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(record));
  renameSync(tmp, file);
}

async function foreground(o: ServeCommandOptions, file: string, say: (key: ServeMessage, ...v: unknown[]) => void) {
  const port = parsePort(o.port);
  const token = accessToken(o.host, process.env);
  // Les commandes lancées par le serveur n'héritent pas du jeton.
  delete process.env[TOKEN_ENV];
  const running = await findRunning(file);
  if (running) return say(running.url ? "already" : "starting", running.url);
  if (!claim(file)) return say("starting");
  let server: RunningServer;
  try {
    server = await startServer({ root: o.root, host: o.host, port, token });
  } catch (e) {
    rmSync(file, { force: true });
    throw e;
  }
  writeRecord(file, { pid: process.pid, at: Date.now(), host: o.host, port: server.port, url: server.url });
  say("listening", server.url);
  const stop = () => {
    rmSync(file, { force: true });
    void server.stop().then(() => process.exit(0));
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

async function detach(o: ServeCommandOptions, file: string, say: (key: ServeMessage, ...v: unknown[]) => void) {
  parsePort(o.port);
  accessToken(o.host, process.env);
  const running = await findRunning(file);
  if (running?.url) return say("already", running.url);
  mkdirSync(dirname(file), { recursive: true });
  const log = join(dirname(file), "serve.log");
  const out = openSync(log, "a");
  const bin = fileURLToPath(new URL("../bin/drwil.js", import.meta.url));
  const args = [bin, "serve", "--host", o.host, ...(o.port === undefined ? [] : ["--port", o.port])];
  const child = spawn(process.execPath, args, { cwd: o.root, detached: true, stdio: ["ignore", out, out], windowsHide: true });
  closeSync(out);
  const ended: { code?: number | null } = {};
  child.once("exit", (code) => (ended.code = code));
  child.unref();
  let record: ServerRecord | null = null;
  // Un enfant qui a perdu la course peut démarrer après l'arrêt du gagnant : on l'attend, sinon il servirait seul.
  for (const end = Date.now() + DETACH_TIMEOUT_MS; Date.now() < end && !ended.code; await sleep(100)) {
    record = await findRunning(file);
    if (record?.url && (record.pid === child.pid || ended.code !== undefined)) return say("started", record.url);
  }
  if (record?.url) return say("started", record.url);
  throw new ServeRefusal("startFailed", [log]);
}

export async function serveCommand(o: ServeCommandOptions, report?: (key: ServeMessage, ...v: unknown[]) => void): Promise<void> {
  const T = SERVE_TEXTS[projectLang(o.root)];
  const say = report ?? ((key: ServeMessage, ...values: unknown[]) => console.log(fill(T[key], ...values)));
  if (!existsSync(join(o.root, ".drwil", "ia-first.json"))) throw new ServeRefusal("notProject");
  const file = join(projectCacheDir(realpathSync(o.root)), "server.json");
  await (o.detach ? detach : foreground)(o, file, say);
}

export function registerServe(program: Command): void {
  program
    .command("serve")
    .description("Serve a read-only live view of the current project (127.0.0.1 by default; a token is mandatory elsewhere)")
    .option("--host <host>", `Listening address; anything but ${LOCAL_HOST} requires ${TOKEN_ENV}`, LOCAL_HOST)
    .option("--port <port>", "Listening port (default: a port of its own for this project)")
    .option("--detach", "Run in the background and print the address; reuse the project's server if it is already running")
    .option("--welcome", `Start in the background on ${LOCAL_HOST}, publish with tailscale serve when possible, print the link`)
    .action(async (opts) => {
      const root = process.cwd();
      try {
        if (opts.welcome) await welcomeCommand(root, opts.port, serveCommand);
        else await serveCommand({ root, host: opts.host, port: opts.port, detach: opts.detach });
      } catch (e) {
        const T = SERVE_TEXTS[projectLang(root)];
        console.error(e instanceof ServeRefusal ? fill(T[e.key], ...e.values) : (e as Error).message);
        process.exitCode = 1;
      }
    });
}
