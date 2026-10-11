# Projet : dépôt et gabarit identiques, vérifié mécaniquement

**Statut** : en cours depuis le 2026-10-11 — lots 1 et 2 réalisés sur la branche `chantier/depot-gabarit-identiques` ; QUA-018 à ré-attester par le demandeur, puis vérification et clôture.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - outils/verifier-miroirs.mjs
  - outils/miroirs.json
  - outils/verifier-miroirs.test.mjs
  - docs/contrats.md
  - docs/recettes/*.md
  - packages/drwil/templates/fr/base/docs/projets/modele-fiche-projet.md
  - packages/drwil/templates/fr/base/docs/intentions/README.md
  - .githooks/check-code-rules.mjs
  - .githooks/check-control-coverage.mjs
  - .githooks/check-docs.mjs
  - .githooks/commit-msg
  - .githooks/etat.mjs
  - .githooks/contrats.mjs
  - .githooks/moteur.mjs
  - .githooks/risque.mjs
  - .githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/*
  - packages/drwil/templates/common/optional/front-quality/*
  - packages/drwil/templates/fr/base/docs/catalogue-contrats.md
  - packages/drwil/templates/en/base/docs/contracts-catalog.md
  - packages/drwil/templates/fr/base/docs/projets/mecanique-ia-first.md
  - packages/drwil/templates/en/base/docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
  - .claude/settings.json
  - packages/drwil/templates/common/tools/claude/.claude/settings.json
  - packages/drwil/templates/fr/base/docs/recettes/*.md
  - packages/drwil/templates/en/base/docs/recipes/*.md
-->

(cadrage : un contrôle propre à ce dépôt, déclaré par le projet, et
l'alignement des écarts trouvés, côté dépôt et côté gabarit — QUA-018
(périmètre explicite : dépôt drwil vs livrable gabarit). Le contrôle vit
hors de `.githooks/`, qui est lui-même un miroir du gabarit. Élargi le
2026-10-11 au lancement : test du contrôle, `docs/contrats.md` (QUA-018
prouvé par le contrôle), recettes côté dépôt et deux fichiers du gabarit
susceptibles d'être alignés — élargi d'emblée pour ne rien modifier hors
cadrage en clôture. Élargi le même jour pour le lot 4 (frontière dépôt /
livrable) : hooks et documents du gabarit qui citent l'historique interne
de drwil, et leurs copies du dépôt — commentaires et doc seulement.)

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
- La couverture des tests des hooks (chantier clos le 2026-10-11, voir
  `docs/projets/journal.md`).

## 3. Contraintes

- Le contrôle est déclaré dans `.drwil/ia-first.json` (`checks`), comme
  celui de la couverture du paquet, donc rejoué au commit, au push et en CI.
- Une information, une source : la liste des miroirs et des écarts voulus
  dans un seul fichier.
- Principe « livrable léger, dépôt éprouvé » (2026-10-10, voir
  `docs/projets/journal.md`) : un fichier propre au
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
- **2026-10-11 — Pas d'attestation sur une preuve surestimée** : le
  contrôle des lots 1 et 2 ne voyait ni les fichiers d'un seul côté ni le
  contenu des écarts déclarés, dont la CI où avait eu lieu la fuite citée
  par QUA-018. Lot 3 avant toute ré-attestation, limites écrites dans le
  contrat. [décision utilisateur]

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
- **Lot 3 — combler les angles morts** [IA] (ajouté le 2026-10-11, après
  la question du demandeur « est-ce bien vrai ? ») : fichiers d'un seul
  côté refusés sauf déclaration ; jobs de CI comparés, fuite d'un job
  propre au dépôt vers le gabarit refusée ; limites restantes écrites dans
  QUA-018. Critère de sortie : une fuite de job et un hook oublié dans le
  gabarit, simulés sur ce dépôt, font échouer le contrôle (vérifié).
- **Lot 4 — frontière du contenu livré** [IA] (ajouté le 2026-10-11 à la
  question « qu'est-ce qui est personnel au dépôt, qu'est-ce qui part dans
  le paquet npm ? ») : aucun fichier propre au dépôt n'est dans le paquet
  (vérifié : 177 fichiers, `dist/`, `bin/`, `templates/`), mais le contenu
  livré citait l'historique interne de drwil (numéros de PR, lots,
  décisions datées, projet d'origine, fiches de ce dépôt). Règle écrite
  dans QUA-018, outillée par le contrôle, occurrences nettoyées.
  Critère de sortie : contrôle vert, et une citation interne ajoutée au
  gabarit le fait échouer.

## 7. Reprise

- **Dernier état** (2026-10-11) : lots 1 à 4 réalisés ; contrôle vert
  (77 fichiers comparés, 16 écarts, 9 déclarations « propre au dépôt »,
  1 job de CI propre au dépôt, aucune référence interne dans le
  livrable). QUA-018 décrit ce que le contrôle prouve et ce qu'il ne voit
  pas.
- **Reste à décider, hors de ce chantier** : deux messages livrés citent
  encore l'identifiant interne `DRWIL-012` (changer une sortie) ; supprimer
  la duplication elle-même (le dépôt s'installe lui-même, ou hooks
  générés au build) ; le contrôle juge l'arbre de travail, pas seulement
  ce qui est indexé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] ré-attester QUA-018 (empreinte changée) ;
  puis [IA] `drwil verify`, clôture et fusion automatique (autorisée au
  lancement).
