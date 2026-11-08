// Serveur de `drwil serve` : lecture seule, GET uniquement, toute réponse passée par maskPersonal (QUA-271).
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { fill } from "./i18n.js";
import { COOKIE_NAME, cookieValue, hasValidToken, localHostHeader, maskPersonal, sameToken, ServeRefusal } from "./serve-auth.js";
import { createBoard } from "./serve-board.js";
import { createDetails } from "./serve-details.js";
import { createForge, type Missing } from "./serve-forge.js";
import { type JournalEvent, openJournal } from "./serve-journal.js";
import { createReader } from "./serve-read.js";
import { createReleases } from "./serve-releases.js";
import { SERVE_TEXTS } from "./serve-texts.js";
import { startWatch } from "./serve-watch.js";

const BASE_PORT = 4317;
const PORT_RANGE = 1000;
const PORT_TRIES = 20;
const HEADERS = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "content-security-policy": "default-src 'self' 'unsafe-inline'; frame-ancestors 'none'",
};

export interface ServeOptions {
  root: string;
  host: string;
  /** null : port propre au projet, le suivant s'il est pris ; 0 : choisi par le système. */
  port: number | null;
  token: string | null;
  /** Dossier du journal d'événements ; par défaut, celui du projet dans le cache de l'utilisateur (QUA-274). */
  cacheDir?: string;
}

export interface RunningServer {
  url: string;
  port: number;
  stop(): Promise<void>;
}

const projectHash = (root: string) => createHash("sha256").update(root).digest("hex");

/** Le cache de l'utilisateur, hors de tout dépôt : l'état d'exécution n'y salit rien. */
export function cacheRoot(env: NodeJS.ProcessEnv, platform: string, home: string): string {
  if (env.XDG_CACHE_HOME) return env.XDG_CACHE_HOME;
  if (platform === "win32" && env.LOCALAPPDATA) return env.LOCALAPPDATA;
  return platform === "darwin" ? join(home, "Library", "Caches") : join(home, ".cache");
}

/** Dossier d'exécution d'un projet : un par chemin réel, donc un par worktree (QUA-272). */
export function projectCacheDir(root: string, env: NodeJS.ProcessEnv = process.env): string {
  return join(cacheRoot(env, process.platform, homedir()), "drwil", "serve", projectHash(root).slice(0, 16));
}

/** Port stable d'un redémarrage à l'autre : le lien gardé sur le téléphone reste bon. */
export const preferredPort = (root: string) => BASE_PORT + (parseInt(projectHash(root).slice(0, 8), 16) % PORT_RANGE);

export const hostForUrl = (host: string) => (host.includes(":") ? `[${host}]` : host);

function send(res: ServerResponse, status: number, body: unknown, names: readonly string[], headers: Record<string, string> = {}) {
  res.writeHead(status, { ...HEADERS, "content-type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(maskPersonal(body, names)));
}

function listen(server: Server, host: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve((server.address() as { port: number }).port);
    });
  });
}

async function bind(server: Server, o: ServeOptions): Promise<number> {
  const start = o.port ?? preferredPort(o.root);
  for (let tries = 0; ; tries++) {
    try {
      return await listen(server, o.host, start + tries);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EADDRINUSE") throw e;
      if (o.port !== null || tries + 1 >= PORT_TRIES) throw new ServeRefusal("portBusy", [start + tries]);
    }
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function startServer(o: ServeOptions): Promise<RunningServer> {
  const abort = new AbortController();
  const reader = createReader(o.root, abort.signal);
  const names = [(await reader.git("config", "user.name")).trim()].filter(Boolean);
  const project = escapeHtml(String(reader.config.projectName ?? basename(o.root)));
  const lang = reader.config.lang === "fr" ? "fr" : "en";
  const page = readFileSync(new URL("../serve/page.html", import.meta.url), "utf8")
    .replaceAll("__PROJECT__", project)
    .replaceAll("__LANG__", lang);
  let port = 0;

  const T = SERVE_TEXTS[lang];
  const forge = createForge(reader.sh, reader.git);
  const cacheDir = o.cacheDir ?? projectCacheDir(realpathSync(o.root));
  const journal = openJournal(cacheDir, (e) => maskPersonal(e, names) as JournalEvent);
  const watch = startWatch({ reader, forge, journal, T });
  const board = createBoard(reader, forge);
  const releases = createReleases(reader, forge);
  const details = createDetails(reader, forge);
  // Une vue vide dit ce qui manque, dans la langue du projet (QUA-275).
  const said = <V extends { missing: Missing | null; cli: string | null }>({ cli, missing, ...view }: V) => ({
    ...view,
    missing: missing && fill(T[missing], cli),
  });

  const routes: Record<string, (url: URL) => unknown> = {
    "/api/docs": async () => ({
      state: await reader.state(),
      briefs: await reader.briefs(),
      intentions: reader.intentions(),
      notes: reader.notes(),
    }),
    "/api/contracts": async () => {
      const view = await reader.contracts();
      return { ...view, missing: view.verify ? null : T.noEvidence };
    },
    "/api/usage": async () => {
      const view = await reader.usage();
      return { ...view, missing: view.workstreams.length ? null : T.noUsage };
    },
    "/api/ci": async () => said(await forge.ci()),
    "/api/board": async () => said(await board()),
    "/api/releases": async () => said(await releases()),
    "/api/events": async () => {
      await watch.localReady;
      const { missing, cli } = await forge.availability();
      return said({ events: journal.list(), missing, cli });
    },
    "/api/detail": (url) => details.detail(url.searchParams.get("key") ?? ""),
    "/api/workstream": (url) => details.workstream(url.searchParams.get("name") ?? "", journal.list()),
    "/api/file": (url) => reader.file(url.searchParams.get("path") ?? ""),
  };

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const url = new URL(req.url ?? "/", "http://serve.invalid");
    if (o.token === null && !localHostHeader(req.headers.host, port)) return send(res, 403, { error: "host refused" }, names);
    if (o.token !== null && url.pathname === "/" && sameToken(url.searchParams.get("token") ?? "", o.token)) {
      // Le jeton quitte l'adresse aussitôt : il ne reste ni dans l'historique ni dans un en-tête Referer.
      res.writeHead(303, {
        ...HEADERS,
        location: "/",
        "set-cookie": `${COOKIE_NAME}=${cookieValue(o.token)}; HttpOnly; SameSite=Strict; Path=/`,
      });
      return res.end();
    }
    if (o.token !== null && !hasValidToken(req.headers, o.token)) return send(res, 401, { error: "token required" }, names);
    if (req.method !== "GET") return send(res, 405, { error: "read-only" }, names, { allow: "GET" });
    if (url.pathname === "/") {
      res.writeHead(200, { ...HEADERS, "content-type": "text/html; charset=utf-8" });
      return res.end(page);
    }
    const route = routes[url.pathname];
    if (!route) return send(res, 404, { error: "not found" }, names);
    watch.touch();
    return send(res, 200, await route(url), names);
  }

  const server = createServer((req, res) => {
    // Jamais de pile ni de chemin dans une réponse d'erreur.
    handle(req, res).catch(() => send(res, 500, { error: "internal error" }, names));
  });
  port = await bind(server, o);
  return {
    url: `http://${hostForUrl(o.host)}:${port}/`,
    port,
    stop: () =>
      new Promise((resolve) => {
        watch.stop();
        // Une commande en cours (`git`, `gh`, `glab`) ne survit pas au serveur.
        abort.abort();
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
}
