# Projet : `doctor` dit le niveau de protection réel, la barrière bloque dès l'installation

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/niveaux-de-protection-dans-doctor.md`

<!-- scope
files:
  - packages/drwil/src/config.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/src/guarantees.ts
  - packages/drwil/src/protection.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/guarantees.test.mjs
  - packages/drwil/test/protection.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/README.md
-->

(La recette d'adoption installée est couverte par `scopeMirrors`.)

## 1. Besoin

Un projet qui adopte drwil croit avoir une barrière de périmètre, alors
qu'elle n'est qu'un avertissement par défaut : `packages/drwil/src/config.ts`
met `scopeGate` à `"warning"` quand le projet ne le règle pas, y compris sur
une installation neuve. Aucune sortie ne le dit. Il faut séparer « une règle
est écrite » de « la garantie est tenue » ; les autres états sont déjà
distincts (QUA-013, un contrôle non exécuté n'est pas passé ; `verify` rend
PASS, FAIL, MANUAL ou ERROR).

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Une installation neuve écrit la barrière de périmètre en bloquant ; un
  projet déjà installé garde son réglage, même absent, et rien ne change
  pour lui — contrat à créer
- `drwil doctor` affiche le niveau de protection du projet, chacun prouvé
  par une vérification, jamais par une déclaration : 1 diagnostic seul
  (règles en avertissement), 2 gouvernance locale active (hooks branchés,
  barrière bloquante), 3 contrôles CI actifs (la CI rejoue les contrôles du
  hook), 4 protection de forge vérifiée (branche protégée, contrôles
  requis, aucun contournement administrateur) ; un niveau qu'il n'a pas pu
  vérifier est dit « non vérifié », jamais atteint ; il dit la commande qui
  mène au niveau suivant (`--json` compris) — contrat à créer
- Un projet sous garanties obligatoires dont la barrière n'est pas
  bloquante fait échouer `drwil verify`, avec la commande qui la durcit —
  contrat à créer

## 2. Hors périmètre

- Passer en bloquant les projets déjà installés sans réglage (écarté au
  cadrage : une mise à jour ne bloque pas des commits du jour au
  lendemain).
- Les autres réglages (`scopeReminder`, `newRequirements`), déjà bloquants
  à l'installation neuve.
- Vérifier `bypass_actors` en CI (fiche « contournements complétés »).

## 3. Contraintes

- Même forme que `newRequirements` dans `packages/drwil/src/config.ts` : `blocking` sans
  configuration précédente, sinon la valeur précédente, à défaut
  `warning`.
- Le niveau 4 réutilise la vérification de forge des garanties (QUA-094,
  forge et branche protégée ; QUA-095, CI verte sans contournement
  administrateur), sans la dupliquer ; sans `gh` ou `glab` joignable, il
  est « non vérifié » (QUA-013).
- Le niveau se calcule dans un module à part (protection.ts, nouveau), lu par
  `doctor` et par `verify` : un seul calcul, `packages/drwil/src/doctor.ts` sous le plafond de
  taille (QUA-001).
- Textes en français et en anglais (réglage `lang`).

## 4. Décisions

- 2026-10-23 — Barrière bloquante à l'installation neuve seulement, un
  projet installé garde son réglage et `doctor` lui montre comment durcir
  (demandeur).
- 2026-10-23 — Sous garanties obligatoires, une barrière non bloquante fait
  échouer `verify`, pas seulement `doctor` (demandeur).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — défaut à l'installation neuve** [IA] : `packages/drwil/src/config.ts` et ses
  tests (installation neuve, mise à jour avec et sans réglage).
- **Lot 2 — niveau de protection** [IA] : module protection.ts,
  affichage par `doctor` (texte et `--json`), échec de `verify` sous
  garanties ; tests ; recette d'adoption et README du paquet ; contrats au
  registre et contrôles `tests-qua-<id>` déclarés ; ligne « Unreleased »
  du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK,
  `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
