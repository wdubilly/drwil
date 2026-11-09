// `drwil serve --welcome` : le lien donné à l'humain, publié par `tailscale serve` si possible (QUA-277, QUA-278).
// Toujours sur 127.0.0.1, sans jeton : la ligne imprimée peut passer par le chat d'un outil sans autre canal.
import { spawnSync } from "node:child_process";
import { mkdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fill, projectLang } from "./i18n.js";
import { LOCAL_HOST, PUBLISHED_FILE } from "./serve-auth.js";
import { projectCacheDir } from "./serve.js";
import { SERVE_TEXTS, type ServeMessage } from "./serve-texts.js";

const TAILSCALE = "tailscale";
const READ_MS = 3000;
// `tailscale serve` attend indéfiniment qu'on active HTTPS sur le réseau : sans délai, il bloquerait l'ouverture.
const PUBLISH_MS = 5000;
const DNS_NAME = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** Sortie standard d'une commande réussie, `null` sinon (absente, en échec ou trop lente). */
export type Run = (command: string, args: string[], timeout: number) => string | null;
export type Start = (
  o: { root: string; host: string; port?: string; detach: boolean },
  report: (key: ServeMessage, ...values: unknown[]) => void,
) => Promise<void>;
type Publication = { url: string; advice?: undefined } | { url?: undefined; advice: ServeMessage };

const runTool: Run = (command, args, timeout) => {
  const r = spawnSync(command, args, { encoding: "utf8", timeout, stdio: ["ignore", "pipe", "ignore"], windowsHide: true });
  return r.status === 0 ? r.stdout : null;
};

function parsed(text: string | null) {
  try {
    return JSON.parse(text as string);
  } catch {
    return null;
  }
}

/** Publie le port sur le réseau privé, sans jamais remplacer la publication d'une autre application. */
export function publish(port: number, cacheDir: string, run: Run): Publication {
  const status = parsed(run(TAILSCALE, ["status", "--json"], READ_MS));
  if (!status) return { advice: "phoneNoTailscale" };
  if (status.BackendState !== "Running") return { advice: "phoneDown" };
  const host = String(status.Self?.DNSName).replace(/\.$/, "");
  if (!DNS_NAME.test(host) || !status.CertDomains?.includes(host)) return { advice: "phoneNoHttps" };
  const target = `http://${LOCAL_HOST}:${port}`;
  const current = parsed(run(TAILSCALE, ["serve", "status", "--json"], READ_MS));
  const used = current?.TCP?.[port] !== undefined;
  const proxy = String(current?.Web?.[`${host}:${port}`]?.Handlers?.["/"]?.Proxy).replace(/\/$/, "");
  if (used && proxy !== target) return { advice: "phoneTaken" };
  // Écrit avant la publication : la première requête du réseau privé doit déjà passer le contrôle de `Host`.
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(join(cacheDir, PUBLISHED_FILE), JSON.stringify({ host }));
  if (!used && run(TAILSCALE, ["serve", "--bg", `--https=${port}`, target], PUBLISH_MS) === null) return { advice: "phoneDenied" };
  return { url: `https://${host}:${port}/` };
}

/** Démarre le serveur local s'il ne tourne pas, publie ce qui peut l'être, imprime le lien en une ligne. */
export async function welcomeCommand(root: string, port: string | undefined, start: Start, run: Run = runTool, env = process.env) {
  let url = "";
  await start({ root, host: LOCAL_HOST, port, detach: true }, (_key, value) => (url = String(value)));
  const T = SERVE_TEXTS[projectLang(root)];
  // Un serveur lancé à la main avec --host reste tel quel : son accès passe par le jeton de l'humain.
  if (!url.startsWith(`http://${LOCAL_HOST}:`)) return console.log(fill(T.already, url));
  const cacheDir = projectCacheDir(realpathSync(root), env);
  const localPort = Number(new URL(url).port);
  const published = publish(localPort, cacheDir, run);
  if (published.advice === undefined) return console.log(fill(T.welcomeTailnet, published.url, url));
  rmSync(join(cacheDir, PUBLISHED_FILE), { force: true });
  console.log(`${fill(T.welcomeLocal, url)} ${fill(T[published.advice], localPort)}`);
}
