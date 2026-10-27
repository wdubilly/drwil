# Projet : les hooks d'agent livrés sous le plafond de 200 lignes

**Statut** : cadré le 2026-10-27 (sondage du demandeur), pour la 0.10.0, en tête de pile.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/fichiers-charges-courts.md` (point 1)

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - .claude/hooks/bash-guard.mjs
  - .claude/hooks/prompt-hook.mjs
  - .githooks/check-file-size.mjs
  - .githooks/check-file-size.test.mjs
  - packages/drwil/templates/common/base/.githooks/check-file-size.mjs
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/fichiers-charges-courts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Les hooks d'agent livrés (`.claude/hooks/`, un seul jeu pour Claude, Gemini
et Copilot) sont hors du périmètre de QUA-001 (fichier de code plafonné) :
`packages/drwil/templates/common/tools/claude/.claude/hooks/bash-guard.mjs` fait 276 lignes et `packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs` 227. Ils sont du code
livré à chaque projet, donc ils doivent tenir le plafond comme le reste.

## Critères d'acceptation

(les contrats sont à créer ou à étendre au lancement ; ID attribué à ce
moment-là.)

- Le périmètre de QUA-001 couvre `.claude/hooks/` (fichiers mjs, dépôt et
  gabarit) : un hook de plus de 200 lignes fait échouer `taille-fichiers`.
- Les deux hooks cités plus haut (bash-guard et prompt-hook) sont découpés sous 200 lignes, sans
  plafond hérité, et se comportent à l'identique (leurs tests actuels passent
  sans changement).

## 2. Hors périmètre

- `AGENTS.md` et le contrôle livré de taille du kit : fiches suivantes.

## 3. Contraintes

- On n'édite que le gabarit ; la copie du dépôt s'installe par
  `npm run installer-depot` (contrôle `miroirs-gabarit`).
- Le découpage ne change aucun comportement : chaque hook reste un script
  autonome lisible par les trois outils.

## 4. Décisions

(validées par le demandeur le 2026-10-27)

1. Le plafond des hooks est celui de QUA-001 : 200 lignes, sans plafond
   hérité.

## 6. Increments

- **Lot 1 — hooks sous 200 lignes** [IA] : périmètre de QUA-001 étendu à `.claude/hooks/` (contrôle `taille-fichiers`), découpe des deux hooks, tests de `.githooks/check-file-size.test.mjs` ; installation dans le dépôt. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
