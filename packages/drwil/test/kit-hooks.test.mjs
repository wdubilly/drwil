// Tests du kit, thème hooks : hooks des outils IA (Claude Code, Copilot, Gemini) et lancement de chantier par sondage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { init } from "../dist/index.js";
import { tmp, quiet, envTest, git, read, consignes, config } from "./kit-commun.mjs";

test("QUA-039 : fin de réponse : les identifiants cités sans libellé sont affichés sous la réponse ; le rappel ne cite un ID qu'une fois par session", async () => {
  // Constaté le 2026-10-17 : « OPT-6 à OPT-8 » écrits nus par l'agent, que le rappel après chaque outil ne voyait pas.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.ok(
    reglages.hooks.Stop.some((h) => /reply-glossary\.mjs/.test(JSON.stringify(h.hooks))),
    "hook de fin de réponse déclaré",
  );
  assert.match(read(dir, ".gitignore"), /^\.drwil\/glossary\.json$/m, "mémoire du rappel ignorée par git");

  const fin = (message) =>
    spawnSync(process.execPath, [".claude/hooks/reply-glossary.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: "Stop", stop_hook_active: false, last_assistant_message: message }),
    });
  let r = fin("La règle QUA-013 tombe, et SEC-007 (pas de secret) tient.");
  assert.equal(r.status, 0);
  const sortie = JSON.parse(r.stdout);
  assert.match(sortie.systemMessage, /^\[drwil\] Identifiants cités sans libellé : QUA-013 — A check that did not run has not passed$/);
  assert.doesNotMatch(sortie.systemMessage, /SEC-007/, "déjà libellé : pas répété");
  assert.equal(sortie.hookSpecificOutput, undefined, "rien d'injecté au modèle");
  assert.equal(sortie.decision, undefined, "jamais bloquant");
  assert.equal(fin("QUA-013 (contrôle non exécuté) : réglé.").stdout, "", "tout est libellé : rien");
  assert.equal(fin("").stdout, "");
  r = spawnSync(process.execPath, [".claude/hooks/reply-glossary.mjs"], { cwd: dir, input: "pas du JSON", encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout + r.stderr, "", "jamais d'erreur visible");

  // Rappel après chaque outil : un identifiant n'est rappelé qu'une fois par session.
  const outil = (session, texte) =>
    spawnSync(process.execPath, [".claude/hooks/id-glossary.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ session_id: session, hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: texte }),
    }).stdout;
  const premier = outil("s1", "QUA-013 et SEC-007");
  assert.match(premier, /QUA-013 — /);
  assert.match(premier, /SEC-007 — /);
  assert.equal(outil("s1", "encore QUA-013"), "", "déjà rappelé dans cette session");
  assert.match(outil("s1", "QUA-013 puis QUA-016"), /QUA-016 — /);
  assert.doesNotMatch(outil("s1", "QUA-013 puis QUA-017"), /QUA-013/);
  assert.match(outil("s2", "QUA-013"), /QUA-013 — /, "nouvelle session : rappelé de nouveau");
});

test("QUA-039 : hook glossaire livré et branché sur tout outil ; injecte les libellés cités, rien sinon ; Copilot et Cursor ont la règle", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "en", targetDir: dir, git: false }));
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.ok(
    reglages.hooks.PostToolUse.some(
      (h) => h.matcher === "Bash|Read|Grep|Glob|WebFetch" && /id-glossary\.mjs/.test(JSON.stringify(h.hooks)),
    ),
  );
  const hook = (sortie) =>
    spawnSync(process.execPath, [".claude/hooks/id-glossary.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: "PostToolUse", tool_name: "Bash", tool_response: sortie }),
    });
  const r = hook({ stdout: "QUA-013 failed, see catalog:QUA-004" });
  assert.equal(r.status, 0);
  const contexte = JSON.parse(r.stdout).hookSpecificOutput.additionalContext;
  assert.match(contexte, /^\[drwil\] Identifiers cited above: QUA-013 — A check that did not run has not passed ; catalog:QUA-004 — /);
  assert.match(contexte, /always the ID followed by what it designates/);
  assert.equal(hook("nothing known here").stdout, "", "rien de connu : rien d'injecté");
  assert.equal(
    spawnSync(process.execPath, [".claude/hooks/id-glossary.mjs"], { cwd: dir, input: "pas du JSON", encoding: "utf8" }).status,
    0,
    "jamais bloquant",
  );
  assert.match(read(dir, "AGENTS.md"), /\*\*Readable references\*\*[\s\S]*node \.githooks\/glossary\.mjs/);
  for (const f of [".github/copilot-instructions.md", ".cursor/rules/ia-first.mdc"])
    assert.match(read(dir, f), /node \.githooks\/glossary\.mjs/, f);
});

test("QUA-114 garde shell : refus, sans demander, de toute commande qui saute les hooks ou écrit core.hooksPath ; la lecture passe", async () => {
  const { skipsHooks, main } = await import(new URL("../templates/common/tools/claude/.claude/hooks/bash-guard.mjs", import.meta.url));
  const refusees = [
    "git commit --no-verify -m x",
    "git push --no-verify",
    "git commit --no-verif -m x",
    "git commit -n -m x",
    "git commit -anm x",
    "git -C sous commit -qn",
    "git -c core.hooksPath=/dev/null commit -m x",
    "git -c core.hookspath= commit -m x",
    "git -ccore.hooksPath=/dev/null commit",
    "git --config-env=core.hooksPath=VIDE commit",
    "git --config-env core.hooksPath=VIDE commit",
    "git config core.hooksPath /dev/null",
    'git config --local core.hooksPath ""',
    "git config set core.hooksPath x",
    "git config --unset core.hooksPath",
    "git config unset core.hooksPath",
    "git config --remove-section core",
    "git config --file .git/config core.hooksPath x",
    "GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/dev/null git commit -m x",
    "export GIT_CONFIG_PARAMETERS=\"'core.hooksPath'='/dev/null'\"",
    "sed -i 's/hooksPath = .githooks//' .git/config",
    "echo '[core] hooksPath = x' >> .git/config",
    "npm test && git commit --no-verify -m x",
    "true; /usr/bin/git commit -n",
    'bash -c "git config core.hooksPath /dev/null"',
    "sh -c 'cd a && git commit --no-verify'",
    'eval "git commit -n -m \\"x\\""',
    "(git commit -n)",
  ];
  for (const c of refusees) assert.equal(skipsHooks(c), true, c);
  const permises = [
    "git config core.hooksPath",
    "git config --get core.hooksPath",
    "git config get core.hooksPath",
    "git config --list",
    "git config user.name Test",
    "git commit -m 'retire -n et --no-verify du message'",
    "git commit -m -n",
    "git commit -F notes.txt",
    "git commit -mn",
    "git commit -- -n",
    "git log -n 3",
    "git push -n",
    "grep -rn hooksPath .githooks",
    "GIT_CONFIG_GLOBAL=/dev/null git status",
    "cat .git/config",
    "echo git",
    "ls",
  ];
  for (const c of permises) assert.equal(skipsHooks(c), false, c);

  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const garde = (command) =>
    spawnSync(process.execPath, [".claude/hooks/bash-guard.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    }).stdout;
  const refus = JSON.parse(garde("git commit --no-verify -m x && cat .env"));
  assert.equal(refus.hookSpecificOutput.permissionDecision, "deny", "le refus l'emporte sur la demande d'accord");
  assert.match(refus.hookSpecificOutput.permissionDecisionReason, /refusé \(QUA-114\).*se corrige, il ne se contourne pas \(QUA-019\)/);
  assert.equal(garde("git config core.hooksPath"), "");
  assert.match(garde("cat .env"), /"permissionDecision":"ask"/, "les autres risques gardent la demande d'accord");
  assert.match(main(JSON.stringify({ tool_name: "Bash", tool_input: { command: "git commit -n" } })), /"permissionDecision":"deny"/);
});

test("QUA-132 lecture ciblée forcée : registre et journal refusés en entier (Read sans plage, cat/less/more), plage et recherche permises", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const lire = (tool_input, cwd = dir, script = join(dir, ".claude/hooks/read-guard.mjs")) =>
    spawnSync(process.execPath, [script], { cwd, encoding: "utf8", input: JSON.stringify({ tool_name: "Read", tool_input }) });
  const refuse = (r, quoi) => {
    const sortie = JSON.parse(r.stdout).hookSpecificOutput;
    assert.equal(sortie.permissionDecision, "deny", quoi);
    assert.match(sortie.permissionDecisionReason, /Lecture refusée \(QUA-132, lecture ciblée\)/, quoi);
    assert.match(sortie.permissionDecisionReason, /glossary\.mjs --contract <ID>.*--contracts.*--journal <chantier>/, quoi);
  };
  // Lecture entière : chemin absolu, relatif, avec ./ et .., depuis un sous-dossier.
  refuse(lire({ file_path: join(dir, "docs/contracts.md") }), "registre, chemin absolu");
  refuse(lire({ file_path: join(dir, "docs/projects/journal.md") }), "journal, chemin absolu");
  refuse(lire({ file_path: "docs/contracts.md" }), "chemin relatif");
  refuse(lire({ file_path: "./docs/projects/../contracts.md" }), "chemin normalisé");
  mkdirSync(join(dir, "src/profond"), { recursive: true });
  refuse(lire({ file_path: join(dir, "docs/contracts.md") }, join(dir, "src/profond")), "depuis un sous-dossier");
  const lien = join(tmp(), "projet-lien");
  symlinkSync(dir, lien, "junction");
  refuse(lire({ file_path: join(lien, "docs/contracts.md") }, lien, join(lien, ".claude/hooks/read-guard.mjs")), "par un lien");
  // Permis : une plage, un autre fichier, un fichier absent, une entrée inattendue.
  assert.equal(lire({ file_path: join(dir, "docs/contracts.md"), offset: 10, limit: 20 }).stdout, "", "plage permise");
  assert.equal(lire({ file_path: join(dir, "docs/projects/journal.md"), limit: 50 }).stdout, "", "limit seul permis");
  assert.equal(lire({ file_path: join(dir, "AGENTS.md") }).stdout, "", "autre fichier permis");
  assert.equal(lire({ file_path: join(tmp(), "docs/contracts.md") }).stdout, "", "hors du projet : permis");
  const absent = spawnSync(process.execPath, [join(dir, ".claude/hooks/read-guard.mjs")], {
    cwd: dir,
    encoding: "utf8",
    input: "pas du JSON",
  });
  assert.equal(absent.status, 0, "entrée invalide : jamais d'erreur");
  assert.equal(absent.stdout, "", "entrée invalide : la lecture passe");
  rmSync(join(dir, "docs/projects/journal.md"));
  assert.equal(lire({ file_path: join(dir, "docs/projects/journal.md") }).stdout, "", "fichier absent : la lecture passe");
  // Chemins lus dans la configuration, message dans la langue du projet.
  writeFileSync(join(dir, "registre.md"), "# Registre\n");
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({ ...config(dir), lang: "en", dirs: { ...config(dir).dirs, contracts: "registre.md" } }),
  );
  assert.equal(lire({ file_path: join(dir, "docs/contracts.md") }).stdout, "", "l'ancien chemin n'est plus gardé");
  assert.match(
    JSON.parse(lire({ file_path: join(dir, "registre.md") }).stdout).hookSpecificOutput.permissionDecisionReason,
    /^Read refused \(QUA-132/,
  );
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({ ...config(dir), lang: "fr", dirs: { ...config(dir).dirs, contracts: "docs/contracts.md" } }),
  );

  // Garde shell : cat, less, more refusés ; sed -n, grep, head permis.
  const shell = (command, cwd = dir) =>
    spawnSync(process.execPath, [join(dir, ".claude/hooks/bash-guard.mjs")], {
      cwd,
      encoding: "utf8",
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command } }),
    }).stdout;
  for (const c of [
    "cat docs/contracts.md",
    "cat -n ./docs/contracts.md | head -5",
    `less ${join(dir, "docs/contracts.md")}`,
    "npm test && more docs/contracts.md",
    "LANG=C /bin/cat ../../docs/contracts.md",
    // Constaté en CI Windows (2026-10-24, PR #223) : `\` lu comme échappement effaçait les séparateurs.
    `less ${join(dir, "docs/contracts.md").replace(/\//g, "\\")}`,
  ])
    assert.match(shell(c, join(dir, "src/profond")), /"permissionDecision":"deny".*QUA-132/, c);
  for (const c of [
    "sed -n 1,40p docs/contracts.md",
    "grep -n QUA-013 docs/contracts.md",
    "head -50 docs/contracts.md",
    "cat AGENTS.md",
    "echo docs/contracts.md",
  ])
    assert.equal(shell(c), "", c);
  assert.match(shell("cat .env"), /"permissionDecision":"ask"/, "les autres risques gardent la demande d'accord");

  // Les mêmes fonctions, appelées dans le processus (sur le gabarit, avec la racine du projet).
  const garde = await import(new URL("../templates/common/tools/claude/.claude/hooks/read-guard.mjs", import.meta.url));
  const { wholeRead } = await import(new URL("../templates/common/tools/claude/.claude/hooks/bash-guard.mjs", import.meta.url));
  const entree = (tool_input) => JSON.stringify({ tool_name: "Read", tool_input });
  assert.match(garde.main(entree({ file_path: "docs/contracts.md" }), dir), /"permissionDecision":"deny"/);
  assert.equal(garde.main(entree({ file_path: "docs/contracts.md", offset: 1 }), dir), "");
  assert.equal(garde.main(JSON.stringify({ tool_name: "Bash", tool_input: {} }), dir), "", "autre outil");
  assert.equal(garde.main("pas du JSON", dir), "");
  assert.equal(garde.guardedTarget(undefined, dir), null);
  assert.equal(wholeRead("cat docs/contracts.md", dir), "docs/contracts.md");
  assert.equal(wholeRead(`cat ${join(dir, "docs/contracts.md")}`, dir), "docs/contracts.md");
  assert.equal(wholeRead("cat -A AGENTS.md", dir), null);

  // Le gabarit branche le hook sur Read, avant l'outil ; AGENTS.md le dit.
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.ok(reglages.hooks.PreToolUse.some((h) => h.matcher === "Read" && h.hooks[0].command.includes(".claude/hooks/read-guard.mjs")));
  assert.match(consignes(dir), /reading the\s+registry or the journal whole \(without a range\) is refused/);
});

test("hooks Claude Code : garde-fou-bash demande l'accord, rappel-cadrage refuse avant écriture (bloquant) ou rappelle (avertissement)", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));

  const gardeFou = spawnSync(process.execPath, [".claude/hooks/bash-guard.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .env" } }),
  });
  assert.match(gardeFou.stdout, /"permissionDecision":"ask"/);
  assert.match(gardeFou.stdout, /fichier \.env/);

  const inoffensif = spawnSync(process.execPath, [".claude/hooks/bash-guard.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat .env.example" } }),
  });
  assert.equal(inoffensif.stdout.trim(), "");

  const hook = (evenement, chemin) =>
    spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: evenement, tool_name: "Write", tool_input: { file_path: join(dir, chemin) } }),
    });
  // Défaut « bloquant » : refus AVANT l'écriture d'un fichier de code hors fiche (docs/projects/journal.md, garde-fous).
  const refus = hook("PreToolUse", "scripts/nouveau.mjs");
  assert.match(refus.stdout, /"permissionDecision":"deny"/);
  assert.match(refus.stdout, /Écriture refusée \(QUA-016, scopeReminder : blocking\).*scripts\/nouveau\.mjs/);
  // Copilot CLI envoie le fichier sous `path`, pas `file_path`.
  const copilote = spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { path: join(dir, "scripts/nouveau.mjs"), file_text: "x" },
    }),
  });
  assert.match(copilote.stdout, /"permissionDecision":"deny"/);
  assert.equal(hook("PreToolUse", "docs/notes.md").stdout.trim(), "", "la doc n'est jamais du code : jamais refusée");
  assert.equal(hook("PostToolUse", "scripts/nouveau.mjs").stdout.trim(), "", "en bloquant, pas de rappel en double après coup");
  // QUA-035 : une copie déclarée (scopeMirrors) d'un fichier cadré n'est pas refusée.
  writeFileSync(join(dir, "docs/projects/gabarit.md"), "# Gabarit\n\n<!-- scope\nfiles:\n  - modele/scripts/nouveau.mjs\n-->\n");
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeMirrors: [{ from: "modele/", to: "" }] }));
  assert.equal(hook("PreToolUse", "scripts/nouveau.mjs").stdout.trim(), "", "copie de modele/scripts/nouveau.mjs, cadré");
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeMirrors: [] }));
  // En « avertissement » : jamais de refus, un rappel après l'écriture.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), scopeReminder: "warning" }));
  assert.equal(hook("PreToolUse", "scripts/nouveau.mjs").stdout.trim(), "");
  const rappel = hook("PostToolUse", "scripts/nouveau.mjs");
  assert.match(rappel.stdout, /Rappel de cadrage/);
  assert.match(rappel.stdout, /scripts\/nouveau\.mjs/);
  // Le gabarit branche le hook avant l'écriture.
  const reglages = read(dir, ".claude/settings.json");
  assert.match(reglages, /"PreToolUse"[\s\S]*"Edit\|Write\|MultiEdit"[\s\S]*scope-reminder\.mjs[\s\S]*"PostToolUse"/);
});

test("état de gouvernance : lecteur livré, state.json ignoré par Git, contexte réinjecté au démarrage de Claude", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));

  assert.match(read(dir, ".gitignore"), /^\.drwil\/state\.json$/m);
  assert.match(read(dir, ".claude/settings.json"), /"SessionStart"[\s\S]*\.githooks\/state\.mjs/);
  // Sans state.json : SCOPING neutre, jamais d'état actif déduit.
  const neutre = spawnSync(process.execPath, [".githooks/state.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(neutre.status, 0);
  assert.match(neutre.stdout, /Activité : SCOPING/);
  // Un état invalide est signalé, sans faire échouer le démarrage de session.
  writeFileSync(join(dir, ".drwil/state.json"), "{ cassé");
  const invalide = spawnSync(process.execPath, [".githooks/state.mjs"], { cwd: dir, encoding: "utf8" });
  assert.equal(invalide.status, 0);
  assert.match(invalide.stdout, /État invalide/);
});

test("rappel court : hook de saisie Claude livré, empreinte ignorée par Git, rien quand l'état n'a pas changé", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));

  assert.match(read(dir, ".gitignore"), /^\.drwil\/reminder\.json$/m);
  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  assert.match(JSON.stringify(reglages.hooks.UserPromptSubmit), /\.githooks\/state\.mjs\\" reminder/);
  const rappel = () => spawnSync(process.execPath, [".githooks/state.mjs", "reminder"], { cwd: dir, encoding: "utf8" });
  const premier = rappel();
  assert.equal(premier.status, 0);
  assert.match(premier.stdout, /\[drwil\] Rappel : SCOPING/);
  assert.equal(rappel().stdout, "", "état inchangé : rien n'est injecté");
});

test("QUA-037 : un sondage à choix multiple lance la première fiche et met les suivantes en file, sans lire de fusion", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = (nom) =>
    writeFileSync(
      join(dir, `docs/projects/${nom}.md`),
      `# Projet : ${nom}\n\n**Statut** : cadré le 2026-10-16.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/${nom}.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — \`APP-001\`\n`,
    );
  fiche("un");
  fiche("deux");
  fiche("trois");
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sondage = {
    questions: [
      {
        question: "Quelles fiches ?",
        header: "drwil-start",
        multiSelect: true,
        options: ["un", "deux", "trois"].map((n) => ({ label: `docs/projects/${n}.md`, description: n })),
      },
      {
        question: "Fusion ?",
        header: "drwil-merge",
        multiSelect: false,
        options: [
          { label: "Fusion automatique", description: "" },
          { label: "Fusion manuelle", description: "" },
        ],
      },
    ],
  };
  const r = spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: {
        ...sondage,
        answers: { "Quelles fiches ?": "docs/projects/un.md, docs/projects/trois.md", "Fusion ?": "Fusion automatique" },
      },
    }),
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /file : ensuite docs\/projects\/trois\.md/);
  const etat = JSON.parse(read(dir, ".drwil/state.json"));
  assert.equal(etat.active_brief, "docs/projects/un.md");
  assert.deepEqual(etat.queue, ["docs/projects/trois.md"]);
  // La question de fusion n'est plus lue : la fusion automatique est le comportement par défaut (QUA-163, QUA-188).
  assert.equal(etat.queue_merge, undefined);
  assert.equal(etat.auto_merge, undefined, "la fusion automatique est le comportement par défaut : plus d'auto_merge écrit");
});

test("QUA-037 : une file de deux fiches se construit par deux réponses à choix unique lues par le hook, puis « Terminer la file » ; l'agent ne remplit rien", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiches = ["docs/projects/un.md", "docs/projects/deux.md", "docs/projects/brouillon.md"];
  for (const [i, f] of fiches.entries())
    writeFileSync(
      join(dir, f),
      `# Projet : Essai ${i}\n\n**Statut** : cadré le 2026-11-02.\n**Maturité** : ${i === 2 ? "à affiner" : "prêt"}\n\n<!-- scope\nfiles:\n  - src/essai${i}.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — \`APP-001\`\n\n## Incréments\n\n- **Lot 1** : essai\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etat = () => JSON.parse(read(dir, ".drwil/state.json"));
  const schema = (extra = {}) => ({
    properties: {
      "drwil-file": { type: "string", enum: [...fiches, "Terminer la file"], ...extra },
      "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] },
    },
  });
  const rejouer = (evenement, reponse, requestedSchema = schema()) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: evenement,
        tool_name: "ask_user",
        tool_input: { message: "drwil-file : quelle fiche ajouter à la file ?", requestedSchema },
        tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
      }),
    });

  assert.match(
    rejouer("PostToolUse", `drwil-file=${fiches[0]}, drwil-merge=Manual merge`).stdout,
    /file en construction : docs\/projects\/un\.md ajoutée/,
  );
  assert.match(rejouer("PostToolUse", `drwil-file=${fiches[2]}, drwil-merge=Manual merge`).stdout, /ne peut pas entrer dans une file/);
  assert.match(
    rejouer("PostToolUse", `drwil-file=${fiches[1]}, drwil-merge=Manual merge`).stdout,
    /soit docs\/projects\/un\.md, docs\/projects\/deux\.md/,
  );
  assert.equal(etat().activity, "SCOPING", "rien n'est lancé avant la fin");
  assert.deepEqual(etat().queue_draft, [fiches[0], fiches[1]]);

  rejouer("PostToolUse", "drwil-file=Terminer la file, drwil-merge=Automatic merge");
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().active_brief, fiches[0]);
  assert.deepEqual(etat().queue, [fiches[1]]);
  assert.equal(etat().queue_merge, undefined, "la réponse de fusion n'est plus lue ni écrite (QUA-163, QUA-188)");
  assert.equal(etat().queue_draft, undefined);

  // Le hook refuse un sondage déjà répondu, à valeur par défaut, à choix multiple, ou sans « Terminer la file ».
  assert.equal(rejouer("PreToolUse", "", schema({ default: fiches[0] })).status, 2);
  assert.equal(
    rejouer("PreToolUse", "", { properties: { "drwil-file": { type: "array", items: { type: "string", enum: fiches } } } }).status,
    2,
  );
  assert.equal(rejouer("PreToolUse", "", { properties: { "drwil-file": { type: "string", enum: fiches } } }).status, 2);
  assert.equal(rejouer("PreToolUse", "").status, 0);
  // Même refus sous Claude Code : réponse déjà remplie ou choix multiple.
  const claude = (extra) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "AskUserQuestion",
        tool_input: {
          questions: [
            {
              question: "Quelle fiche ?",
              header: "drwil-file",
              multiSelect: false,
              options: [...fiches, "Terminer la file"].map((label) => ({ label })),
              ...extra,
            },
          ],
          ...(extra.answers ? { answers: extra.answers } : {}),
        },
      }),
    });
  assert.equal(claude({}).status, 0);
  assert.equal(claude({ multiSelect: true }).status, 2);
  assert.equal(claude({ answers: { "Quelle fiche ?": fiches[0] } }).status, 2);
});

test("QUA-037 : la file suit l'ordre des options du sondage, quel que soit l'ordre des clics", async () => {
  // Constaté le 2026-10-18 : Claude Code rend les choix multiples dans l'ordre des clics ; la file
  // suivait ces clics, pas l'ordre des options que range la skill de lancement.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  for (const nom of ["un", "deux", "trois", "quatre"])
    writeFileSync(
      join(dir, `docs/projects/${nom}.md`),
      `# Projet : ${nom}\n\n**Statut** : cadré le 2026-10-18.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/${nom}.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — \`APP-001\`\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sondage = {
    questions: [
      {
        question: "Quelles fiches ?",
        header: "drwil-start",
        multiSelect: true,
        options: ["un", "deux", "trois"].map((n) => ({ label: `docs/projects/${n}.md`, description: n })),
      },
    ],
  };
  // Clics : trois, une fiche saisie sous « Autre » (hors options : gardée après, dans l'ordre saisi), puis un.
  const r = spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
    cwd: dir,
    encoding: "utf8",
    input: JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: {
        ...sondage,
        answers: { "Quelles fiches ?": "docs/projects/trois.md, docs/projects/quatre.md, docs/projects/un.md" },
      },
    }),
  });
  assert.equal(r.status, 0);
  const etat = JSON.parse(read(dir, ".drwil/state.json"));
  assert.equal(etat.active_brief, "docs/projects/un.md", "la première option cochée est lancée, pas le premier clic");
  assert.deepEqual(etat.queue, ["docs/projects/trois.md", "docs/projects/quatre.md"]);
});

test("QUA-037 : un seul brief : « Pas maintenant » ne lance rien et le dit ; sans réponse lue ou sur erreur, le hook le dit sans bloquer", async () => {
  // Constaté sur un projet neuf (2026-10-17) : un seul brief, sondage impossible à une option, puis
  // un hook muet qui laissait l'agent deviner pourquoi rien n'avait démarré.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/seule.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Seule\n\n**Statut** : cadré le 2026-10-17.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/seule.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sondage = {
    questions: [
      {
        question: "Quelle fiche lancer ?",
        header: "drwil-start",
        multiSelect: false,
        options: [
          { label: fiche, description: "Seule" },
          { label: "Pas maintenant", description: "Ne rien lancer" },
        ],
      },
    ],
  };
  const hook = (reponse) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "AskUserQuestion",
        tool_input: sondage,
        tool_response: reponse === undefined ? { ...sondage } : { ...sondage, answers: { "Quelle fiche lancer ?": reponse } },
      }),
    });
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);

  let r = hook("Pas maintenant");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\[drwil\] .*rien n'est lancé.*Pas maintenant/);
  assert.equal(etat(), null, "« Pas maintenant » ne change pas l'état");

  r = hook(undefined);
  assert.equal(r.status, 0, "jamais bloquant");
  assert.match(r.stdout, /\[drwil\] .*aucune réponse lue.*node \.githooks\/state\.mjs start/);
  assert.equal(etat(), null);

  // Une erreur (ici, le moteur d'état illisible) est dite, l'état reste inchangé, l'outil n'est pas bloqué.
  const moteur = read(dir, ".githooks/state.mjs");
  writeFileSync(join(dir, ".githooks/state.mjs"), "throw new Error('moteur cassé');\n");
  r = hook(fiche);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /\[drwil\] .*erreur.*moteur cassé.*node \.githooks\/state\.mjs start/);
  assert.equal(etat(), null);
  writeFileSync(join(dir, ".githooks/state.mjs"), moteur);

  r = hook(fiche);
  assert.match(r.stdout, /BUILD \(lancé : docs\/projects\/seule\.md\)/);
  assert.equal(etat().active_brief, fiche);
});

test("QUA-044 : lancés depuis un sous-dossier, les hooks lisent la racine du projet et n'écrivent rien ailleurs", async () => {
  // Constaté le 2026-10-16 : après un `cd` de l'agent, le rappel lisait un état absent et créait un .drwil
  // parasite ; la garde de cadrage, ne trouvant pas .githooks/, ne refusait plus rien.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/racine.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Racine\n\n**Statut** : cadré le 2026-10-17.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/couvert.ts\n-->\n\n## Critères d'acceptation\n\n- Critère — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const sous = join(dir, "src", "profond");
  mkdirSync(sous, { recursive: true });
  const lancer = (script, args, entree) =>
    spawnSync(process.execPath, [join(dir, script), ...args], { cwd: sous, encoding: "utf8", input: entree });

  // Sondage : la fiche est lancée à la racine.
  const sondage = {
    questions: [
      {
        question: "Quelle fiche ?",
        header: "drwil-start",
        multiSelect: false,
        options: [
          { label: fiche, description: "Racine" },
          { label: "Pas maintenant", description: "" },
        ],
      },
    ],
  };
  const r = lancer(
    ".claude/hooks/prompt-hook.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: { ...sondage, answers: { "Quelle fiche ?": fiche } },
    }),
  );
  assert.match(r.stdout, /BUILD \(lancé : docs\/projects\/racine\.md\)/);
  assert.equal(JSON.parse(read(dir, ".drwil/state.json")).activity, "BUILD");

  // Rappel d'état : l'état réel (BUILD), pas un état absent.
  rmSync(join(dir, ".drwil/reminder.json"), { force: true });
  assert.match(lancer(".githooks/state.mjs", ["reminder"]).stdout, /BUILD/);

  // Garde de cadrage : un fichier de code hors fiche reste refusé, un fichier couvert passe.
  const ecrire = (fichier) =>
    lancer(
      ".claude/hooks/scope-reminder.mjs",
      [],
      JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: { file_path: join(dir, fichier) },
      }),
    ).stdout;
  assert.match(ecrire("src/hors.ts"), /"permissionDecision":"deny"/);
  assert.equal(ecrire("src/couvert.ts").trim(), "");

  // Glossaire : le hook et la commande lisent le registre de la racine.
  const glose = lancer(
    ".claude/hooks/id-glossary.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_response: "voir SEC-007",
    }),
  );
  assert.match(glose.stdout, /SEC-007 — /);
  assert.match(lancer(".githooks/glossary.mjs", ["SEC-007"]).stdout, /^SEC-007 — /);

  assert.ok(!existsSync(join(sous, ".drwil")), "aucun .drwil parasite dans le sous-dossier");
});

test("QUA-044 : par un chemin qui passe par un lien symbolique, les hooks se lancent quand même", async () => {
  // Constaté en CI macOS (2026-10-17) : le dossier temporaire /var y est un lien vers /private/var ; un
  // hook appelé par ce chemin se croyait importé (chemin appelé ≠ chemin réel) et ne faisait rien.
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const lien = join(tmp(), "projet-lien");
  symlinkSync(dir, lien, "junction");
  const lancer = (script, args, entree) =>
    spawnSync(process.execPath, [join(lien, script), ...args], { cwd: lien, encoding: "utf8", input: entree });

  assert.match(lancer(".githooks/state.mjs", []).stdout, /SCOPING/);
  const sondage = { questions: [{ question: "Quelle fiche ?", header: "drwil-start", multiSelect: false, options: [] }] };
  const r = lancer(
    ".claude/hooks/prompt-hook.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      tool_response: { ...sondage },
    }),
  );
  assert.match(r.stdout, /aucune réponse lue/, "le hook du sondage s'est lancé");
  const glose = lancer(
    ".claude/hooks/id-glossary.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_response: "voir SEC-007",
    }),
  );
  assert.match(glose.stdout, /SEC-007 — /, "le hook du glossaire s'est lancé");
  const garde = lancer(
    ".claude/hooks/scope-reminder.mjs",
    [],
    JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: "Write",
      tool_input: { file_path: join(lien, "src/hors.ts") },
    }),
  );
  assert.match(garde.stdout, /"permissionDecision":"deny"/, "la garde de cadrage s'est lancée");
  // Constaté en CI macOS (2026-10-24, PR #223) : le garde shell comparait encore des URL.
  const shell = lancer(
    ".claude/hooks/bash-guard.mjs",
    [],
    JSON.stringify({ tool_name: "Bash", tool_input: { command: "cat docs/contracts.md" } }),
  );
  assert.match(shell.stdout, /"permissionDecision":"deny"/, "le garde shell s'est lancé");
});

test("QUA-044 : tout point d'entrée livré compare les chemins réels, jamais une URL de process.argv[1]", () => {
  // Récidive constatée le 2026-10-24 (PR #223) : la correction de 2026-10-17 n'avait pas été appliquée
  // partout. Un point d'entrée qui compare des URL, ou un chemin réel à un chemin non résolu, ne se
  // lance pas par un lien symbolique (/var → /private/var sur macOS) : il ne fait rien, sans erreur.
  const entree = (ligne) => /process\.argv\[1\]/.test(ligne) && /import\.meta\.url/.test(ligne);
  const sain = (ligne) =>
    ligne.includes("realpathSync(process.argv[1])") &&
    ligne.includes("realpathSync(fileURLToPath(import.meta.url))") &&
    !/pathToFileURL\(process\.argv\[1\]\)/.test(ligne);
  assert.ok(!sain("if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {"), "le détecteur voit les URL");
  assert.ok(!sain("if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {"), "et un seul côté résolu");
  const racine = fileURLToPath(new URL("../templates/", import.meta.url));
  const fautifs = [];
  let points = 0;
  const parcourir = (dossier) => {
    for (const e of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, e.name);
      if (e.isDirectory()) parcourir(chemin);
      else if (e.name.endsWith(".mjs"))
        readFileSync(chemin, "utf8")
          .split("\n")
          .forEach((ligne, i) => {
            if (!entree(ligne)) return;
            points++;
            if (!sain(ligne)) fautifs.push(`${chemin.slice(racine.length)}:${i + 1}`);
          });
    }
  };
  parcourir(racine);
  assert.ok(points >= 20, `points d'entrée trouvés : ${points}`);
  assert.deepEqual(fautifs, [], "points d'entrée qui ne comparent pas les chemins réels des deux côtés");
});

test("lancer par sondage : la réponse humaine lance (formats Claude Code et Copilot CLI), un sondage pré-rempli est refusé", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/essai.md";
  // Une fiche de chantier sans critère d'acceptation ne se lance pas (QUA-021).
  writeFileSync(
    join(dir, fiche),
    "# Projet : Essai\n\n**Statut** : cadré le 2026-10-10.\n\n<!-- scope\nfiles:\n  - src/essai.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");

  const reglages = JSON.parse(read(dir, ".claude/settings.json"));
  for (const evenement of ["PreToolUse", "PostToolUse"]) {
    assert.ok(
      reglages.hooks[evenement].some((h) => h.matcher === "AskUserQuestion" && /prompt-hook\.mjs/.test(JSON.stringify(h.hooks))),
      evenement,
    );
  }
  assert.ok(reglages.permissions.deny.includes("Bash(*prompt-hook*)"), "l'agent ne peut pas appeler le hook lui-même par le shell");
  assert.ok(existsSync(join(dir, ".claude/skills/start-a-workstream/SKILL.md")));

  const hook = (entree) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], { cwd: dir, encoding: "utf8", input: JSON.stringify(entree) });
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);
  const claude = {
    questions: [
      {
        question: "Quelle fiche lancer ?",
        header: "drwil-start",
        options: [
          { label: fiche, description: "Essai" },
          { label: "docs/projects/autre.md", description: "Autre" },
        ],
        multiSelect: false,
      },
      { question: "Où lancer ?", header: "drwil-worktree", options: [{ label: "Nouveau worktree" }, { label: "Ce dossier" }] },
    ],
  };
  const copilot = {
    message: "drwil-start : quelle fiche lancer ?",
    requestedSchema: {
      properties: {
        choix: { type: "string", enum: [fiche, "docs/projects/autre.md"] },
        "drwil-worktree": { type: "string", enum: ["New worktree", "This folder"] },
      },
    },
  };
  // La question drwil-worktree est obligatoire : sans elle, le sondage est refusé avant l'affichage.
  const sansWorktree = { questions: [claude.questions[0]] };
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: sansWorktree }).status, 2);
  const copilotSans = { message: copilot.message, requestedSchema: { properties: { choix: copilot.requestedSchema.properties.choix } } };
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: copilotSans }).status, 2);

  // Le modèle ne répond pas à la place de l'humain et ne présélectionne rien : refusé avant l'affichage.
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: { ...claude, answers: { "Quelle fiche lancer ?": fiche } },
    }).status,
    2,
  );
  const avecDefaut = structuredClone(copilot);
  avecDefaut.requestedSchema.properties.choix.default = fiche;
  assert.equal(hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: avecDefaut }).status, 2);
  assert.equal(
    hook({ hook_event_name: "PreToolUse", tool_name: "AskUserQuestion", tool_input: claude }).status,
    0,
    "un vrai sondage passe",
  );
  assert.equal(etat(), null, "rien n'est lancé avant la réponse");

  // Un sondage qui n'est pas celui de drwil ne lance rien, même avec une fiche en réponse.
  const autre = { questions: [{ ...claude.questions[0], header: "Autre" }] };
  hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: autre,
    tool_response: { ...autre, answers: { "Quelle fiche lancer ?": fiche } },
  });
  assert.equal(etat(), null);

  // Claude Code : la réponse humaine arrive dans tool_response.answers.
  const r = hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: claude,
    tool_response: { ...claude, answers: { "Quelle fiche lancer ?": fiche } },
  });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /BUILD \(lancé : docs\/projects\/essai\.md\)/);
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().active_brief, fiche);
  assert.equal(etat().auto_merge, undefined, "sans seconde question, la fusion reste manuelle");

  // Seconde question (en-tête drwil-merge) : seule la réponse humaine autorise la fusion automatique.
  rmSync(join(dir, ".drwil/state.json"));
  const fusion = {
    question: "Fusion à la fin du chantier ?",
    header: "drwil-merge",
    options: [
      { label: "Fusion automatique", description: "…" },
      { label: "Fusion manuelle", description: "…" },
    ],
    multiSelect: false,
  };
  const claudeFusion = { questions: [...claude.questions, fusion] };
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: { ...claudeFusion, answers: { "Fusion à la fin du chantier ?": "Fusion automatique" } },
    }).status,
    2,
  );
  hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: claudeFusion,
    tool_response: { ...claudeFusion, answers: { "Quelle fiche lancer ?": fiche, "Fusion à la fin du chantier ?": "Fusion manuelle" } },
  });
  assert.equal(etat().auto_merge, undefined);
  rmSync(join(dir, ".drwil/state.json"));
  const rf = hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: claudeFusion,
    tool_response: { ...claudeFusion, answers: { "Quelle fiche lancer ?": fiche, "Fusion à la fin du chantier ?": "Fusion automatique" } },
  });
  assert.equal(rf.status, 0);
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().auto_merge, undefined, "la fusion automatique est le comportement par défaut : plus d'auto_merge écrit");

  // Copilot CLI : même hook, réponse en texte libre ; une fiche non cadrée est refusée.
  rmSync(join(dir, ".drwil/state.json"));
  const refus = hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: copilot,
    tool_result: { result_type: "success", text_result_for_llm: "User responded: choix=docs/projects/autre.md" },
  });
  assert.match(refus.stdout, /n'est pas une fiche cadrée/);
  assert.equal(etat(), null);
  hook({
    hook_event_name: "PostToolUse",
    tool_name: "AskUserQuestion",
    tool_input: copilot,
    tool_result: { result_type: "success", text_result_for_llm: `User responded: choix=${fiche}` },
  });
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().auto_merge, undefined);

  // Copilot CLI, champ `drwil-merge` : seule la réponse humaine autorise la fusion automatique, quel que soit l'ordre des champs.
  const copilotFusion = {
    message: copilot.message,
    requestedSchema: {
      properties: {
        choix: copilot.requestedSchema.properties.choix,
        "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] },
        "drwil-worktree": copilot.requestedSchema.properties["drwil-worktree"],
      },
    },
  };
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: {
        ...copilotFusion,
        requestedSchema: {
          properties: {
            ...copilotFusion.requestedSchema.properties,
            "drwil-merge": { enum: ["Automatic merge"], default: "Automatic merge" },
          },
        },
      },
    }).status,
    2,
  );
  for (const reponse of [
    `choix=${fiche}, drwil-merge=Automatic merge`,
    `drwil-merge=Automatic merge, choix=${fiche}`,
    `choix=${fiche}, drwil-merge=Manual merge`,
    `choix=${fiche}`,
  ]) {
    rmSync(join(dir, ".drwil/state.json"));
    hook({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: copilotFusion,
      tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
    });
    assert.equal(etat().activity, "BUILD", reponse);
    assert.equal(etat().auto_merge, undefined, reponse);
  }
});

test("QUA-142 : la réponse « Nouveau worktree » du sondage lance le chantier dans un worktree frère, « Ce dossier » dans le dossier d'origine", async () => {
  const parent = tmp();
  const dir = join(parent, "projet");
  mkdirSync(dir);
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/essai.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Essai\n\n**Statut** : cadré le 2026-10-26.\n\n<!-- scope\nfiles:\n  - src/essai.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — `APP-001`\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const voisin = join(parent, "projet-essai");
  const hook = (entree) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify(entree),
    });
  const etatDe = (d) => (existsSync(join(d, ".drwil/state.json")) ? JSON.parse(read(d, ".drwil/state.json")) : null);
  const rejouer = (sondage, reponse) => {
    const r = hook({
      hook_event_name: "PostToolUse",
      tool_name: "AskUserQuestion",
      tool_input: sondage,
      ...reponse,
    });
    assert.equal(r.status, 0);
    return r;
  };
  const choix = {
    question: "Quelle fiche lancer ?",
    header: "drwil-start",
    multiSelect: false,
    options: [{ label: fiche }, { label: "docs/projects/autre.md" }],
  };
  const lieu = {
    question: "Où mener le chantier ?",
    header: "drwil-worktree",
    multiSelect: false,
    options: [{ label: "Nouveau worktree" }, { label: "Ce dossier" }],
  };
  const claude = { questions: [choix, lieu] };
  const reponse = (r) => ({
    tool_response: {
      ...claude,
      answers: { "Quelle fiche lancer ?": fiche, "Où mener le chantier ?": r },
    },
  });

  // Un sondage avec la question du lieu et une réponse déjà remplie est refusé comme les autres.
  assert.equal(
    hook({
      hook_event_name: "PreToolUse",
      tool_name: "AskUserQuestion",
      tool_input: {
        ...claude,
        answers: { "Où mener le chantier ?": "Nouveau worktree" },
      },
    }).status,
    2,
  );
  rejouer(claude, reponse("Ce dossier"));
  assert.equal(etatDe(dir).activity, "BUILD", "« Ce dossier » : lancé là");
  assert.equal(existsSync(voisin), false);
  assert.equal(git(dir, "branch", "--show-current").stdout.trim(), "workstream/essai", "« Ce dossier » crée la branche du chantier");
  rmSync(join(dir, ".drwil/state.json"));
  git(dir, "switch", "-q", "-");
  git(dir, "branch", "-D", "workstream/essai");

  const r = rejouer(claude, reponse("Nouveau worktree"));
  assert.match(r.stdout, /Worktree créé/);
  assert.equal(etatDe(dir), null, "l'état du dossier d'origine ne change pas");
  assert.equal(etatDe(voisin).active_brief, fiche);
  assert.equal(etatDe(voisin).activity, "BUILD");

  // Copilot CLI : champ `drwil-worktree`, réponse `clé=valeur`, quel que soit l'ordre.
  git(dir, "worktree", "remove", "--force", voisin);
  git(dir, "branch", "-D", "workstream/essai");
  const copilot = {
    message: "drwil-start : quelle fiche lancer ?",
    requestedSchema: {
      properties: {
        choix: { type: "string", enum: [fiche, "docs/projects/autre.md"] },
        "drwil-worktree": {
          type: "string",
          enum: ["New worktree", "This folder"],
        },
      },
    },
  };
  rejouer(copilot, {
    tool_result: {
      result_type: "success",
      text_result_for_llm: `User responded: drwil-worktree=New worktree, choix=${fiche}`,
    },
  });
  assert.equal(etatDe(dir), null);
  assert.equal(etatDe(voisin).activity, "BUILD");
});

test("QUA-147 : la réponse « File en parallèle » du sondage lance chaque fiche cochée dans son worktree, « File séquentielle » garde la file du dossier", async () => {
  const parent = tmp();
  const dir = join(parent, "projet");
  mkdirSync(dir);
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiches = ["docs/projects/un.md", "docs/projects/deux.md"];
  for (const [i, f] of fiches.entries())
    writeFileSync(
      join(dir, f),
      `# Projet : Essai ${i}\n\n**Statut** : cadré le 2026-10-26.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/essai${i}.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — \`APP-001\`\n\n## Incréments\n\n- **Lot 1** : essai\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etatDe = (d) => (existsSync(join(d, ".drwil/state.json")) ? JSON.parse(read(d, ".drwil/state.json")) : null);
  const choix = {
    question: "Quelles fiches lancer ?",
    header: "drwil-start",
    multiSelect: true,
    options: fiches.map((label) => ({ label })),
  };
  const mode = {
    question: "Quel mode pour la file ?",
    header: "drwil-parallel",
    multiSelect: false,
    options: [{ label: "File en parallèle" }, { label: "File séquentielle" }],
  };
  const sondage = { questions: [choix, mode] };
  const rejouer = (evenement, reponse) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: evenement,
        tool_name: "AskUserQuestion",
        tool_input: sondage,
        tool_response: { ...sondage, answers: reponse },
      }),
    });

  // Une réponse déjà remplie dans le sondage est refusée comme pour les autres questions.
  assert.equal(
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PreToolUse",
        tool_name: "AskUserQuestion",
        tool_input: { ...sondage, answers: { "Quel mode pour la file ?": "File en parallèle" } },
      }),
    }).status,
    2,
  );
  rejouer("PostToolUse", { "Quelles fiches lancer ?": fiches.join(", "), "Quel mode pour la file ?": "File séquentielle" });
  assert.equal(etatDe(dir).active_brief, fiches[0]);
  assert.deepEqual(etatDe(dir).queue, [fiches[1]]);
  assert.equal(etatDe(dir).parallel, undefined);
  rmSync(join(dir, ".drwil/state.json"));
  git(dir, "switch", "-q", "-");
  git(dir, "branch", "-D", "workstream/un");

  // Cochées dans le désordre : l'ordre du sondage prévaut.
  const r = rejouer("PostToolUse", {
    "Quelles fiches lancer ?": `${fiches[1]}, ${fiches[0]}`,
    "Quel mode pour la file ?": "File en parallèle",
  });
  assert.match(r.stdout, /File en parallèle : 2 chantier\(s\) lancé\(s\) sur 2/);
  assert.deepEqual(etatDe(dir).parallel, fiches);
  assert.equal(etatDe(dir).activity, "SCOPING");
  assert.equal(etatDe(join(parent, "projet-un")).active_brief, fiches[0]);
  assert.equal(etatDe(join(parent, "projet-deux")).active_brief, fiches[1]);
});

test("QUA-165 : sous Copilot CLI, le champ des fiches à choix multiple (array, items.enum) est lu comme une file dans l'ordre des options, le choix unique reste lu", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiches = ["docs/projects/un.md", "docs/projects/deux.md"];
  for (const [i, f] of fiches.entries())
    writeFileSync(
      join(dir, f),
      `# Projet : Essai ${i}\n\n**Statut** : cadré le 2026-10-26.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/essai${i}.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — \`APP-001\`\n\n## Incréments\n\n- **Lot 1** : essai\n`,
    );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etat = () => (existsSync(join(dir, ".drwil/state.json")) ? JSON.parse(read(dir, ".drwil/state.json")) : null);
  const schema = {
    properties: {
      fiche: { type: "array", items: { type: "string", enum: fiches } },
      "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] },
      "drwil-worktree": { type: "string", enum: ["New worktree", "This folder"] },
      "drwil-parallel": { type: "string", enum: ["Parallel queue", "Sequential queue"] },
    },
  };
  const rejouer = (evenement, reponse, requestedSchema = schema) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: evenement,
        tool_name: "ask_user",
        tool_input: { message: "drwil-start : quelles fiches lancer ?", requestedSchema },
        tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
      }),
    });

  // Cochées dans le désordre : la file suit l'ordre des options, la fusion reste lue.
  rejouer("PostToolUse", `fiche=${fiches[1]}, ${fiches[0]}, drwil-merge=Automatic merge, drwil-parallel=Sequential queue`);
  assert.equal(etat().active_brief, fiches[0]);
  assert.deepEqual(etat().queue, [fiches[1]]);
  assert.equal(etat().queue_merge, undefined, "la fusion n'est plus lue au sondage ni écrite : comportement par défaut (QUA-163, QUA-188)");
  assert.equal(etat().auto_merge, undefined);
  rmSync(join(dir, ".drwil/state.json"));

  // Liste entre crochets : mêmes valeurs ; une seule fiche cochée est un lancement simple.
  rejouer("PostToolUse", `fiche=["${fiches[1]}"], drwil-merge=Manual merge, drwil-parallel=Sequential queue`);
  assert.equal(etat().active_brief, fiches[1]);
  assert.deepEqual(etat().queue ?? [], []);
  rmSync(join(dir, ".drwil/state.json"));

  // Le hook ne remplit jamais la réponse : une valeur par défaut est refusée.
  const avecDefaut = structuredClone(schema);
  avecDefaut.properties.fiche.default = [fiches[0]];
  assert.equal(rejouer("PreToolUse", "", avecDefaut).status, 2);
  assert.equal(rejouer("PreToolUse", "").status, 0);
});

test("QUA-180 : le skill prescrit à Copilot CLI le champ des fiches en choix unique, et le hook lit une fiche en enum seul comme un tableau", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const skill = read(dir, ".claude/skills/start-a-workstream/SKILL.md").replace(/\s+/g, " ");
  assert.match(skill, /a first field `fiche` with \*\*single choice\*\*: `type: "string"` and `enum`/);
  assert.match(skill, /\*\*never\*\* `type: "array"`/);
  assert.doesNotMatch(skill, /`type: "array"` and `items\.enum`/);

  const fiche = "docs/projects/un.md";
  writeFileSync(
    join(dir, fiche),
    "# Projet : Essai\n\n**Statut** : cadré le 2026-10-26.\n**Maturité** : prêt\n\n<!-- scope\nfiles:\n  - src/essai.ts\n-->\n\n## Critères d'acceptation\n\n- Essai — `APP-001`\n\n## Incréments\n\n- **Lot 1** : essai\n",
  );
  git(dir, "init", "-q");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  const etat = () => JSON.parse(read(dir, ".drwil/state.json"));
  const rejouer = (fichesSchema, reponse) =>
    spawnSync(process.execPath, [".claude/hooks/prompt-hook.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({
        hook_event_name: "PostToolUse",
        tool_name: "ask_user",
        tool_input: {
          message: "drwil-start : quelle fiche lancer ?",
          requestedSchema: {
            properties: { fiche: fichesSchema, "drwil-merge": { type: "string", enum: ["Automatic merge", "Manual merge"] } },
          },
        },
        tool_result: { result_type: "success", text_result_for_llm: `User responded: ${reponse}` },
      }),
    });

  rejouer({ type: "string", enum: [fiche] }, `fiche=${fiche}, drwil-merge=Automatic merge`);
  assert.equal(etat().active_brief, fiche);
  assert.equal(etat().activity, "BUILD");
  assert.equal(etat().auto_merge, undefined);
  rmSync(join(dir, ".drwil/state.json"));

  rejouer({ type: "array", items: { type: "string", enum: [fiche] } }, `fiche=["${fiche}"], drwil-merge=Manual merge`);
  assert.equal(etat().active_brief, fiche);
});

test("transitions : humain par défaut, façade drwil etat, blocages Claude sur l'état et le saut des hooks", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "claude", git: false }));
  const fiche = "docs/projects/kit-mechanics.md";
  const drwilEtat = (...args) =>
    spawnSync(process.execPath, [fileURLToPath(new URL("../bin/drwil.js", import.meta.url)), "state", ...args], {
      cwd: dir,
      encoding: "utf8",
      env: envTest,
    });

  assert.equal(config(dir).transitions, "human");
  // Sans terminal interactif, ouvrir une attente est refusé en mode humain.
  const refus = drwilEtat("move", "EXPECTATION", "--brief", fiche);
  assert.equal(refus.status, 1);
  assert.match(refus.stderr, /terminal interactif/);
  assert.ok(!existsSync(join(dir, ".drwil/state.json")), "état inchangé");
  // En mode agent, la façade transmet --brief au module du projet.
  writeFileSync(join(dir, ".drwil/ia-first.json"), JSON.stringify({ ...config(dir), transitions: "agent" }));
  const ok = drwilEtat("move", "EXPECTATION", "--brief", fiche);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(drwilEtat().stdout, /Activité : EXPECTATION/);

  // Barrière de périmètre : livrée bloquante à l'installation neuve, hook du trailer exécutable, couverte par la fiche mécanique.
  assert.equal(config(dir).scopeGate, "blocking");
  if (process.platform !== "win32")
    assert.ok(statSync(join(dir, ".githooks/prepare-commit-msg")).mode & 0o111, "prepare-commit-msg exécutable");
  assert.match(read(dir, "docs/projects/kit-mechanics.md"), /\.githooks\/scope-gate\.mjs/);

  const deny = JSON.parse(read(dir, ".claude/settings.json")).permissions.deny;
  for (const regle of ["Edit(**/.drwil/state.json)", "Write(**/.drwil/state.json)", "Bash(git commit -n*)"])
    assert.ok(deny.includes(regle), regle);
  assert.ok(deny.some((r) => r.includes("no-verify")));
  // L'option globale `git -c clé=valeur` (exécution arbitraire) est refusée en tête ; le motif large
  // qui refusait aussi les options `-c` des sous-commandes (création de branche…) ne revient pas.
  assert.ok(deny.includes("Bash(git -c *)"));
  assert.ok(!deny.some((r) => /^Bash\(git \*.*-c \*\)$/.test(r)), "aucun refus de -c n'importe où dans une commande git");
  // Ce que deviendrait un `-c` placé après une autre option globale : aucune autorisation git ne le couvre.
  const allow = JSON.parse(read(dir, ".claude/settings.json")).permissions.allow;
  assert.ok(
    allow.filter((r) => r.startsWith("Bash(git ")).every((r) => /^Bash\(git [a-z-]+(:\*)?\)$/.test(r)),
    "allow git = préfixes de sous-commande",
  );
  // Autorisations livrées : lectures gh et outils .githooks sans demande ; push, merge, rebase gardent leur demande.
  const reglesPerm = JSON.parse(read(dir, ".claude/settings.json")).permissions;
  for (const regle of [
    "Bash(gh pr view:*)",
    "Bash(gh pr checks:*)",
    "Bash(node .githooks/state.mjs)",
    "Bash(node .githooks/glossary.mjs:*)",
  ])
    assert.ok(reglesPerm.allow.includes(regle), regle);
  for (const regle of ["Bash(git push:*)", "Bash(git merge:*)", "Bash(git rebase:*)"]) {
    assert.ok(reglesPerm.ask.includes(regle), regle);
    assert.ok(!reglesPerm.allow.includes(regle), regle);
  }
});

test("QUA-064 : choisir copilot installe aussi l'arbre .claude (hooks, réglages, skills) que Copilot lit, et ses hooks natifs", async () => {
  const dir = tmp();
  await init({ lang: "fr", targetDir: dir, tools: "copilot", git: false });
  for (const f of [
    ".claude/settings.json",
    ".claude/hooks/scope-reminder.mjs",
    ".claude/skills/start-a-workstream/SKILL.md",
    ".github/hooks/drwil.json",
  ])
    assert.ok(existsSync(join(dir, f)), f);
  assert.ok(!existsSync(join(dir, "CLAUDE.md")), "le pointeur CLAUDE.md reste lié à l'outil claude");
  const natifs = JSON.parse(read(dir, ".github/hooks/drwil.json")).hooks;
  assert.match(natifs.sessionStart[0].bash, /state\.mjs copilot-start/);
  assert.match(natifs.sessionStart[0].powershell, /state\.mjs copilot-start/);
  assert.match(natifs.userPromptTransformed[0].bash, /state\.mjs copilot-message/);
  assert.match(natifs.userPromptTransformed[0].powershell, /state\.mjs copilot-message/);
});

test("QUA-066 : choisir gemini installe aussi les hooks partagés et ses réglages natifs, sans les skills ni CLAUDE.md propres à Claude", async () => {
  const dir = tmp();
  await init({ lang: "fr", targetDir: dir, tools: "gemini", git: false });
  for (const f of [".claude/hooks/scope-reminder.mjs", ".gemini/settings.json", "GEMINI.md"]) assert.ok(existsSync(join(dir, f)), f);
  assert.ok(!existsSync(join(dir, "CLAUDE.md")), "le pointeur CLAUDE.md reste lié à l'outil claude");
  const hooks = JSON.parse(read(dir, ".gemini/settings.json")).hooks;
  assert.match(hooks.SessionStart[0].hooks[0].command, /state\.mjs" gemini-start/);
  assert.match(hooks.BeforeAgent[0].hooks[0].command, /state\.mjs" gemini-message/);
  for (const evenement of ["BeforeTool", "AfterTool"]) {
    assert.equal(hooks[evenement][0].matcher, "write_file|replace");
    assert.match(hooks[evenement][0].hooks[0].command, /\.claude\/hooks\/scope-reminder\.mjs/);
  }
});

test("QUA-215 : Gemini hors Windows passe par le lanceur sh : sans node, message et code 2 (garde) ou 1 (informatif) ; avec node, même sortie ; sous Windows la commande reste node", {
  skip: process.platform === "win32",
}, async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "gemini", git: false }));
  assert.ok(existsSync(join(dir, ".gemini/hooks/drwil-node.sh")));
  const bin = join(dir, "bin-sh-seul");
  mkdirSync(bin);
  symlinkSync("/bin/sh", join(bin, "sh"));
  const sansNode = { PATH: bin, GEMINI_PROJECT_DIR: dir };
  const hooks = JSON.parse(read(dir, ".gemini/settings.json")).hooks;
  for (const [evenement, code] of [
    ["SessionStart", 1],
    ["BeforeAgent", 1],
    ["BeforeTool", 2],
    ["AfterTool", 1],
  ]) {
    const commande = hooks[evenement][0].hooks[0].command;
    assert.match(commande, /^sh "\$GEMINI_PROJECT_DIR\/\.gemini\/hooks\/drwil-node\.sh" \d /);
    const r = spawnSync("/bin/sh", ["-c", commande], { env: sansNode, encoding: "utf8" });
    assert.match(r.stderr, /node not found in the PATH.*Restart it from a shell where which node answers/);
    assert.deepEqual([r.status, r.stdout], [code, ""], evenement);
  }
  const garde = hooks.BeforeTool[0].hooks[0].command;
  const input = JSON.stringify({ hook_event_name: "BeforeTool", tool_name: "write_file", tool_input: { file_path: join(dir, "x.md") } });
  const avecNode = { PATH: `${bin}:${join(process.execPath, "..")}`, GEMINI_PROJECT_DIR: dir };
  const via = spawnSync("/bin/sh", ["-c", garde], { env: avecNode, input, encoding: "utf8" });
  const direct = spawnSync(process.execPath, [join(dir, ".claude/hooks/scope-reminder.mjs")], { env: avecNode, input, encoding: "utf8" });
  assert.deepEqual([via.status, via.stdout, via.stderr], [direct.status, direct.stdout, direct.stderr]);
  const { geminiNode } = await import("../dist/render-gemini.js");
  assert.deepEqual(geminiNode("win32"), { geminiNodeWarn: "node ", geminiNodeGuard: "node " });
});

test("QUA-067 : scope-reminder refuse write_file et replace sous Gemini avec un decision deny, et rappelle après coup en avertissement", async () => {
  const dir = tmp();
  await quiet(() => init({ lang: "fr", targetDir: dir, tools: "gemini", git: false }));
  const hook = (evenement, outil, chemin) =>
    spawnSync(process.execPath, [".claude/hooks/scope-reminder.mjs"], {
      cwd: dir,
      encoding: "utf8",
      input: JSON.stringify({ hook_event_name: evenement, tool_name: outil, tool_input: { file_path: join(dir, chemin) } }),
    });
  for (const outil of ["write_file", "replace"]) {
    const refus = JSON.parse(hook("BeforeTool", outil, "scripts/nouveau.mjs").stdout);
    assert.equal(refus.decision, "deny");
    assert.match(refus.reason, /Écriture refusée \(QUA-016.*scripts\/nouveau\.mjs/);
  }
  assert.equal(hook("BeforeTool", "write_file", "docs/notes.md").stdout.trim(), "", "la doc n'est jamais refusée");
  assert.equal(hook("AfterTool", "write_file", "scripts/nouveau.mjs").stdout.trim(), "", "en bloquant, pas de rappel après coup");
  writeFileSync(
    join(dir, ".drwil/ia-first.json"),
    JSON.stringify({ ...JSON.parse(read(dir, ".drwil/ia-first.json")), scopeReminder: "warning" }),
  );
  assert.equal(hook("BeforeTool", "write_file", "scripts/nouveau.mjs").stdout.trim(), "");
  const rappel = JSON.parse(hook("AfterTool", "write_file", "scripts/nouveau.mjs").stdout).hookSpecificOutput;
  assert.equal(rappel.hookEventName, "AfterTool");
  assert.match(rappel.additionalContext, /Rappel de cadrage/);
});
