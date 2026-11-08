// Barrières de `drwil serve` : jeton hors de 127.0.0.1 (QUA-270), masquage de toute réponse (QUA-271).
import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { ServeMessage } from "./serve-texts.js";

export const LOCAL_HOST = "127.0.0.1";
export const TOKEN_ENV = "DRWIL_SERVE_TOKEN";
export const MIN_TOKEN_LENGTH = 32;
export const COOKIE_NAME = "drwil_serve";
const MASK = "[REDACTED]";

/** Refus prévu, dit à l'humain dans la langue du projet ; `values` ne porte jamais le jeton. */
export class ServeRefusal extends Error {
  constructor(
    readonly key: ServeMessage,
    readonly values: unknown[] = [],
  ) {
    super(key);
  }
}

/** Jeton exigé pour écouter sur `host` : null en local, refus s'il manque ou s'il est trop court ailleurs. */
export function accessToken(host: string, env: NodeJS.ProcessEnv): string | null {
  if (host === LOCAL_HOST) return null;
  const token = env[TOKEN_ENV];
  if (!token) throw new ServeRefusal("tokenRequired", [host, MIN_TOKEN_LENGTH]);
  if (token.length < MIN_TOKEN_LENGTH) throw new ServeRefusal("tokenWeak", [MIN_TOKEN_LENGTH]);
  return token;
}

const digest = (value: string) => createHash("sha256").update(value).digest();
export const sameToken = (given: string, token: string) => timingSafeEqual(digest(given), digest(token));
// Le navigateur garde l'empreinte, jamais le jeton ; l'hexadécimal passe sans échappement dans un cookie.
export const cookieValue = (token: string) => digest(token).toString("hex");

/** Le jeton présenté par l'en-tête `Authorization` ou par le cookie posé à l'entrée. */
export function hasValidToken(headers: IncomingHttpHeaders, token: string): boolean {
  const bearer = /^Bearer (.+)$/.exec(headers.authorization ?? "")?.[1];
  const cookie = new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([0-9a-f]+)`).exec(headers.cookie ?? "")?.[1];
  return (bearer !== undefined && sameToken(bearer, token)) || (cookie !== undefined && sameToken(cookie, cookieValue(token)));
}

/**
 * Sans jeton, seul un `Host` local passe : une page web qui ferait pointer son domaine sur 127.0.0.1
 * (DNS rebinding) lirait sinon l'API depuis le navigateur de l'humain.
 */
export function localHostHeader(host: string | undefined, port: number): boolean {
  return host === `${LOCAL_HOST}:${port}` || host === `localhost:${port}`;
}

const PERSONAL_KEY = /^(authors?|committers?|actor|login|e?mail|user|username|mergedBy|assignees?|reviewers?)$/i;
const SECRETS: RegExp[] = [
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g,
  // Sans « - » ni « / », à la différence du filtre des preuves : un long chemin de fiche reste lisible.
  /\b(?=[A-Za-z0-9+_]*\d)(?=[A-Za-z0-9+_]*[A-Za-z])[A-Za-z0-9+_]{40,}={0,2}(?![A-Za-z0-9+_])/g,
  // Corps limité aux caractères du base64 : pas de recherche paresseuse, quadratique sans « END ».
  /-----BEGIN [A-Z ]{0,30}PRIVATE KEY-----[A-Za-z0-9+/=\s]*(?:-----END [A-Z ]{0,30}PRIVATE KEY-----)?/g,
];
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
// `@AGENTS.md` et `@types/node` ne sont pas des personnes ; « @login. » en fin de phrase en est une.
const MENTION = /(^|[\s(«"'])@[a-z\d](?:[a-z\d-]*[a-z\d])?(?![\w/-]|\.\w)/gim;

function maskText(text: string, names: readonly string[]): string {
  let out = text.replace(EMAIL, MASK).replace(MENTION, `$1${MASK}`);
  for (const pattern of SECRETS) out = out.replace(pattern, MASK);
  for (const name of names) out = out.replaceAll(name, MASK);
  return out;
}

/**
 * Filtre unique avant toute réponse : une clé nominative disparaît, un courriel, une mention, un secret
 * ou un nom connu (`names`) est masqué dans le texte libre. Récursif : ce que lit une route future y passe.
 */
export function maskPersonal(value: unknown, names: readonly string[] = []): unknown {
  if (typeof value === "string") return maskText(value, names);
  if (Array.isArray(value)) return value.map((item) => maskPersonal(item, names));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PERSONAL_KEY.test(key))
      .map(([key, item]) => [key, maskPersonal(item, names)]),
  );
}
