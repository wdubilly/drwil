# Projet : dépôt et gabarit identiques, vérifié mécaniquement

**Statut** : cadré le 2026-10-10 — décisions prises, lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - outils/verifier-miroirs.mjs
  - outils/miroirs.json
  - .drwil/ia-first.json
  - .claude/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/fr/base/docs/recettes/*.md
  - packages/drwil/templates/en/base/docs/recipes/*.md
-->

(cadrage : un contrôle propre à ce dépôt, déclaré par le projet, et
l'alignement des écarts trouvés, côté dépôt et côté gabarit — QUA-018
(périmètre explicite : dépôt drwil vs livrable gabarit). Le contrôle vit
hors de `.githooks/`, qui est lui-même un miroir du gabarit.)

## 1. Besoin

Priorité 0 pour le demandeur (2026-10-10). Ce dépôt utilise ses propres
copies des fichiers du gabarit ; les garder identiques reposait jusqu'ici
sur la discipline de l'agent (`cp` après chaque modification). Inventaire
du 2026-10-10 :

- identiques : tous les `.githooks/` (dont les deux modules optionnels,
  identiques à leurs copies de `templates/common/optional/`), les hooks
  Claude Code, les skills ;
- différents : `.claude/settings.json` (le gabarit autorise une liste de
  commandes shell et porte un long commentaire, le dépôt n'autorise que
  `Read(**)`) ; quatre recettes (`travailler-en-branche`,
  `creer-une-release`, `deployer-en-prod`, `refactorer-sans-casser`) ; la
  recette du gabarit ne parle pas du job `alerter-si-ci-cassee`, pourtant
  livré par sa CI ;
- différents par construction : `AGENTS.md` (propre à chaque projet),
  `docs/ia-first.md` (résumé de 17 lignes dans le dépôt, renvoi vers la
  doc du gabarit).

Intention : chaque écart est soit corrigé, soit déclaré comme voulu (avec
sa raison) ; un contrôle refuse tout écart non déclaré, à chaque commit et
en CI.

## 2. Hors périmètre

- Les projets équipés : ils n'ont pas de gabarit à comparer ; le contrôle
  est propre à ce dépôt.
- La couverture des tests des hooks (`docs/projets/couverture-hooks.md`).

## 3. Contraintes

- Le contrôle est déclaré dans `.drwil/ia-first.json` (`checks`), comme
  celui de la couverture du paquet, donc rejoué au commit, au push et en CI.
- Une information, une source : la liste des miroirs et des écarts voulus
  dans un seul fichier.
- Principe « livrable léger, dépôt éprouvé » (2026-10-10,
  `docs/projets/livrable-leger-sans-casse.md`) : un fichier propre au
  dépôt (tests des hooks s'ils ne sont plus livrés, outils, mesures) est
  une exception déclarée, pas un écart à corriger.

## 4. Décisions

- **2026-10-10 — Priorité 0** : l'identité dépôt / gabarit devient
  mécanique. [décision utilisateur]
- **2026-10-10 — Miroirs dérivés, exceptions déclarées** (point 5) : tout
  fichier du dépôt qui a un homologue dans le gabarit est comparé ; seuls
  les écarts voulus sont listés, avec leur raison. [décision utilisateur]
- **2026-10-10 — `.claude/settings.json` aligné sur le gabarit** (point
  5) : le dépôt utilise les réglages qu'il livre ; les préférences
  personnelles restent dans `.claude/settings.local.json` (si présent). [décision
  utilisateur]
- **2026-10-10 — Preuve automatique de QUA-018** (point 5) : le contrôle
  devient la preuve de QUA-018 (aujourd'hui seulement attesté). [décision
  utilisateur]

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.
- **QUA-011** — Doc jamais fausse : une recette du gabarit qui omet un job
  livré est une doc fausse.

## 5. Points à trancher

- ~~Les trois points~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — contrôle des miroirs** [IA] : le script
  `outils/verifier-miroirs.mjs` (à créer) et sa liste `outils/miroirs.json` (à créer), déclarés dans
  `.drwil/ia-first.json`. Critère de sortie : un écart non déclaré fait
  échouer le contrôle (test), un écart déclaré passe.
- **Lot 2 — alignement** [IA] : chaque écart de l'inventaire corrigé ou
  déclaré avec sa raison. Critère de sortie : contrôle vert sur ce dépôt,
  CI verte.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] `/drwil-lancer`.
