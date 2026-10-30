# Entretien courant

Fiche permanente pour les petites tâches qui ne justifient pas un chantier
séparé (faute corrigée, petit ajustement local signalé en passant…). Un
sujet qui grossit ou qui demande une décision devient un chantier normal,
listé dans `docs/projects/pending.md`.

Le contrôle au commit signale un fichier de code qu'aucune fiche ne couvre
(rappel de cadrage, sévérité réglable — `docs/ia-first/7-scoping-reminder.md`). Pour une
petite tâche, ajouter son chemin au bloc `cadrage` ci-dessous ; un motif trop
large (`**`, `scripts/*`) est refusé, il faut nommer le fichier ou un motif
précis.

<!-- scope
files:
  - docs/recipes/working-with-branches.md
  - outils/miroirs.json
  - packages/drwil/src/evidence.ts
  - packages/drwil/src/closure.ts
  - packages/drwil/test/kit.test.mjs
  - README.md
  - package.json
  - package-lock.json
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/contracts.md
  - docs/features.md
  - outils/banc.test.mjs
  - outils/verifier-codeowners.mjs
  - docs/architecture.md
-->

## Journal

| Date | Tâche | Statut |
|---|---|---|
| 2026-10-06 | Le `.gitignore` du gabarit était absent du paquet npm (npm retire tout `.gitignore`) : livré sous le nom `gitignore`, renommé à l'installation (`packages/drwil/src/index.ts`) ; test via `npm pack --dry-run`. | fait |
| 2026-10-14 | Renvois vers la fiche « Protéger master » supprimée, remplacés par le journal du 2026-10-13 (`docs/recipes/working-with-branches.md`, `outils/miroirs.json`). | fait |
| 2026-10-16 | Caviardage des clés privées en temps linéaire (`packages/drwil/src/evidence.ts`) : le motif paresseux « BEGIN … END » était quadratique sur une entrée qui répète BEGIN sans END (alerte CodeQL #1, `js/polynomial-redos`, réapparue en déplaçant le code et bloquant la PR #98, remplacée par ce correctif). Recherche BEGIN puis END suivant ; une clé chiffrée à l'ancienne (tirets dans l'en-tête) reste caviardée en bloc ; test : 1 927 ms avant, 16 ms après. | fait |
| 2026-10-21 | Lecture du commit vérifié d'une preuve de clôture en temps linéaire (`packages/drwil/src/closure.ts`) : `\s*:?\s*` était polynomial sur une ligne « **Commit vérifié** » suivie de nombreux espaces (alerte CodeQL `js/polynomial-redos`, bloquant la PR #197 par un fil de revue non résolu) ; quantificateurs bornés, les deux formats (français avec espace avant les deux-points, anglais sans) restent lus. | fait |
| 2026-10-17 | README racine en retard sur la clôture du chantier consommation : étape CLOSING sans la consommation enregistrée, ligne `/drwil-usage` d'avant la mesure automatique, « Current status » qui présentait la 0.6.0 comme sortie alors que la dernière release est la 0.5.1 (`README.md`). Ordre de réalisation de l'index : points 3 et 4 marqués faits, comme la vague 2. | fait |
| 2026-10-22 | Montée de version 0.6.10 (`package.json`, `package-lock.json`, `packages/drwil/package.json`) : « Unreleased » du `CHANGELOG` renommée, le chantier des critères durables et le correctif ReDoS partent en release directe. | fait |
| 2026-10-22 | La note de recette d'une version (`docs/recettes/`) échappe à la barrière de périmètre (`OUT_OF_SCOPE`, gabarit de `.githooks/scope-gate.mjs`) : commitée par plomberie par `.githooks/recette-note.mjs`, sans trailer `Drwil-Brief` ni fiche active, elle était refusée en CI (PR #199, note de la v0.6.10). Mené par un chantier dédié : voir le journal (`docs/projects/journal.md`, 2026-10-22, « La note de recette échappe à la barrière de périmètre »). | fait |
| 2026-10-22 | Montée de version 0.7.0 (`package.json`, `package-lock.json`, `packages/drwil/package.json`) : « Unreleased » du `CHANGELOG` renommée ; mineure parce que les garanties obligatoires peuvent faire passer en FAIL un projet qui passait. Examen avant le tag : `docs/features.md` rédigé (squelette jusqu'ici), `README.md` présente `drwil guarantees` ; release directe. | fait |
| 2026-10-23 | Motif du verdict d'erreur dans le test QUA-108 (copie du mini-banc préparée comme chez un utilisateur réel, `outils/banc.test.mjs`) : il attendait `GOVERNANCE: ERROR` alors que le libellé réel est `GOVERNANCE: VERIFY ERROR` (`packages/drwil/src/verdict.ts`), ce qui faisait échouer la CI de la PR #213 ; motif élargi au libellé réel. | fait |
| 2026-10-24 | Alerte CodeQL n°9 (`js/incomplete-sanitization`) bloquant la PR #218 : la fonction `echapper` du contrôle de CODEOWNERS (`outils/verifier-codeowners.mjs`) n'échappait pas l'antislash ; classe complétée (antislash et autres métacaractères). Inoffensif jusqu'ici, `compiler` refusant déjà tout motif contenant `\`. | fait |
| 2026-10-25 | Montée de version 0.8.0 (`package.json`, `package-lock.json`, `packages/drwil/package.json`) : « Unreleased » du `CHANGELOG` renommée ; mineure parce que de nouveaux refus (hook de lecture du registre/journal, garde shell élargie) peuvent bloquer ce qui passait. Examen avant le tag (QUA-098) : `README.md` (« Current status »), `docs/features.md` (garde-fous, contexte de l'agent, rattachement du code existant, réouverture) et `docs/architecture.md` (gardes et sous-agent de Claude Code, réouverture) mis à jour ; release directe. | fait |
| 2026-10-26 | Montée de version 0.9.0 (`package.json`, `package-lock.json`, `packages/drwil/package.json`) : « Unreleased » du `CHANGELOG` renommée ; mineure parce qu'elle ajoute des fonctionnalités (worktree par chantier, file parallèle, reprise des verdicts, `verify` en parallèle, durée des contrôles) et un nouveau refus (clôture refusée pour un hook modifié non déclaré) qui peut bloquer ce qui passait. Examen avant le tag (QUA-098) : `README.md` (« Current status ») et `docs/features.md` (reprise des verdicts, parallélisme, durées, worktree et file parallèle, hook non déclaré, fusion attendue) mis à jour ; `docs/architecture.md` déjà à jour (`.githooks/worktree.mjs`, `.githooks/close-branches.mjs`, `.githooks/fingerprints.mjs`) ; release directe. | fait |
| 2026-10-27 | Montée de version 0.10.0 (`package.json`, `package-lock.json`, `packages/drwil/package.json`) : « Unreleased » du `CHANGELOG` renommée ; mineure parce que les hooks d'agent installés changent de forme (deux hooks découpés, nouveaux fichiers à la mise à jour) et que l'`AGENTS.md` installé devient un aiguillage court ; release directe. | fait |
