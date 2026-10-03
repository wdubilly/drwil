import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface StackEntry {
  /** Dossier relatif à la racine (« . » pour la racine). */
  path: string;
  technos: string[];
}

const IGNORED_DIRS = new Set(["node_modules", "docs", "vendor", "dist", "build", "target", "venv", "scripts"]);

function read(path: string): string {
  try { return readFileSync(path, "utf8"); } catch { return ""; }
}

function frameworks(text: string, table: Record<string, string>): string[] {
  return Object.entries(table).filter(([needle]) => text.includes(needle)).map(([, name]) => name);
}

function detectDir(dir: string): string[] {
  const technos: string[] = [];
  const has = (f: string) => existsSync(join(dir, f));
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch {}

  if (has("package.json")) {
    let deps: Record<string, string> = {};
    try {
      const pkg = JSON.parse(read(join(dir, "package.json")));
      deps = { ...pkg.dependencies, ...pkg.devDependencies };
    } catch {}
    const table: Record<string, string> = {
      next: "Next.js", react: "React", vue: "Vue", "@angular/core": "Angular", svelte: "Svelte",
      express: "Express", fastify: "Fastify", "@nestjs/core": "NestJS", vite: "Vite", typescript: "TypeScript",
    };
    const found = Object.entries(table).filter(([d]) => d in deps).map(([, n]) => n);
    technos.push(`Node.js${found.length ? ` (${found.join(", ")})` : ""}`);
  }
  if (has("pyproject.toml") || has("requirements.txt") || has("setup.py")) {
    const text = (read(join(dir, "pyproject.toml")) + read(join(dir, "requirements.txt"))).toLowerCase();
    const found = frameworks(text, { fastapi: "FastAPI", django: "Django", flask: "Flask" });
    technos.push(`Python${found.length ? ` (${found.join(", ")})` : ""}`);
  }
  if (has("pom.xml")) {
    const found = frameworks(read(join(dir, "pom.xml")), { "spring-boot": "Spring Boot", quarkus: "Quarkus" });
    technos.push(`Java/Maven${found.length ? ` (${found.join(", ")})` : ""}`);
  }
  if (has("build.gradle") || has("build.gradle.kts")) {
    const text = read(join(dir, "build.gradle")) + read(join(dir, "build.gradle.kts"));
    const found = frameworks(text, { "org.springframework.boot": "Spring Boot", "com.android": "Android" });
    technos.push(`JVM/Gradle${found.length ? ` (${found.join(", ")})` : ""}`);
  }
  if (has("go.mod")) technos.push("Go");
  if (has("Cargo.toml")) technos.push("Rust");
  if (has("composer.json")) {
    const found = frameworks(read(join(dir, "composer.json")), { "laravel/framework": "Laravel", "symfony/": "Symfony" });
    technos.push(`PHP${found.length ? ` (${found.join(", ")})` : ""}`);
  }
  if (has("Gemfile")) technos.push(`Ruby${read(join(dir, "Gemfile")).includes("rails") ? " (Rails)" : ""}`);
  if (entries.some(f => f.endsWith(".csproj") || f.endsWith(".sln"))) technos.push(".NET");
  if (has("pubspec.yaml")) technos.push(`Dart${read(join(dir, "pubspec.yaml")).includes("flutter") ? " (Flutter)" : ""}`);
  return technos;
}

/** Repère les technos à la racine et dans les sous-dossiers directs, d'après leurs fichiers de projet. */
export function detectStack(root: string): StackEntry[] {
  const result: StackEntry[] = [];
  const rootTechnos = detectDir(root);
  if (rootTechnos.length) result.push({ path: ".", technos: rootTechnos });
  let subdirs: string[] = [];
  try {
    subdirs = readdirSync(root, { withFileTypes: true })
      .filter(e => e.isDirectory() && !e.name.startsWith(".") && !IGNORED_DIRS.has(e.name))
      .map(e => e.name)
      .sort();
  } catch {}
  for (const name of subdirs) {
    const technos = detectDir(join(root, name));
    if (technos.length) result.push({ path: name, technos });
  }
  return result;
}
