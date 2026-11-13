# Projet : durcissements de l'audit du 2026-11-12

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/audit-risques.md` (RSK-4, RSK-7, RSK-10, RSK-11), scan du 2026-11-12

<!-- scope
files:
  - .drwil/ia-first.json
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - .claude/settings.json
  - packages/drwil/templates/common/base/.githooks/run-checks-pr.mjs
  - .githooks/run-checks-pr.mjs
  - .githooks/run-checks-pr.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/audit-risks-and-debt.md
  - docs/recipes/audit-risks-and-debt.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Quatre risques de gravité moyenne ou faible de l'audit, vérifiés dans le code le 2026-11-13 :

- **RSK-4** : `.drwil/ia-first.json` déclare comme code `app`, `tests`, `src`, `scripts`, `e2e` et
  `docker-compose*.yml`, absents de ce dépôt ; `packages/`, `outils/` et `.claude/` ne sont pas vus comme du code.
  La garde d'écriture de l'agent (`.claude/hooks/scope-reminder.mjs`, QUA-016) ne prévient donc pas avant une
  écriture hors périmètre dans ces dossiers ; le refus n'arrive qu'au commit.
- **RSK-7** : `.drwil/evidence/main-ci.json` (si présent), la preuve qui autorise une file à lancer le chantier suivant
  (QUA-251), n'est protégé d'aucune écriture de l'agent, contrairement à `.drwil/state.json` (si présent).
- **RSK-10** : la recette d'audit ne nomme que docs/audit-risks.md ; un projet en français écrit
  `docs/audit-risques.md` (nom choisi par la langue, `.githooks/run-checks.mjs`). Corrigé à la lecture : le nom
  français est voulu, c'est la recette qui doit le dire.
- **RSK-11** : `.githooks/run-checks-pr.mjs` passe le jeton CI GitLab en argument de `curl`, lisible par tout
  processus du runner.

## Critères d'acceptation

- Les préfixes de code de ce dépôt correspondent à son arbre : `packages`, `outils`, `.claude`, `.githooks` ; aucun
  préfixe déclaré ne désigne un dossier absent — `QUA-016`
- Claude Code refuse à l'agent d'écrire `.drwil/evidence/main-ci.json` (si présent) (règles `deny` comme pour
  `.drwil/state.json` (si présent), gabarit et dépôt) — `QUA-251`
- La recette d'audit nomme le rapport selon la langue du projet (`docs/audit-risques.md` en français,
  docs/audit-risks.md en anglais) — `QUA-041`
- Le jeton CI GitLab ne figure plus dans les arguments de `curl` (en-tête lu depuis l'entrée standard ou un
  fichier) ; un test le prouve — `SEC-007`

## Contrats modifiés

- `QUA-251` — ancien critère : la preuve `.drwil/evidence/main-ci.json` (si présent) écrite par `pr-watch` — raison : elle est en plus protégée de l'écriture par l'agent sous Claude Code (validé le 2026-11-13)
- `.githooks/run-checks-pr.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Un contrôle qui signale un préfixe de code déclaré absent de l'arbre (idée de l'audit, à noter en intention si
  besoin).
- La revérification de la preuve de file par `gh` au moment de `lot next` (autre correctif possible de RSK-7, écarté :
  la règle `deny` suffit sous Claude Code).
- La protection de la preuve de file sous les autres outils.

## 3. Contraintes

- RSK-4 : changer les préfixes peut faire apparaître des fichiers de code hors du bloc scope de fiches en cours ;
  relancer `node .githooks/run-checks.mjs` et `check-architecture` avant de commiter.
- `.drwil/ia-first.json` n'est pas une copie du gabarit : changement propre au dépôt (QUA-018).
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- 2026-11-13 : les quatre risques réunis dans une fiche, lancée après les fiches P0 ; RSK-10 traité par la recette,
  le nom français étant voulu.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — préfixes de code (RSK-4)** [IA] : `.drwil/ia-first.json` aligné ; contrôles relancés.
- **Lot 2 — preuve de file protégée (RSK-7)** [IA] : règles `deny` et leur test ; QUA-251 complété.
- **Lot 3 — recette d'audit et jeton GitLab (RSK-10, RSK-11)** [IA] : recette ; en-tête hors arguments et son test ;
  `npm run installer-depot` ; ligne « Unreleased » du CHANGELOG. Critère de sortie : `node .githooks/run-checks.mjs`
  sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`, après les fiches P0.
