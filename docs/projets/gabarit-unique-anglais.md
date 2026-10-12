# Projet : un seul gabarit, en anglais (chantier B du livrable en anglais)

**Statut** : en cours — lots 1, 2, 3 et 5 faits le 2026-10-12.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/*
  - packages/drwil/src/*.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/*.test.mjs
  - packages/drwil/README.md
  - outils/verifier-miroirs.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/miroirs.json
  - outils/installer-depot.mjs
  - outils/installer-depot.test.mjs
  - outils/tester-tarball.mjs
  - outils/tester-tarball.test.mjs
  - docs/recettes/*
  - docs/recipes/*
  - .claude/skills/*
  - .claude/settings.json
  - .githooks/tableau-de-bord.mjs
  - .githooks/creer-release.mjs
  - .github/pull_request_template.md
  - .github/workflows/ia-first.yml
  - .drwil/ia-first.json
  - AGENTS.md
  - INSTALL.md
  - README.md
  - docs/architecture.md
  - docs/ia-first.md
  - docs/contrats.md
  - docs/catalogue-contrats.md
  - docs/audit-risques.md
  - docs/benchmark-protocole.md
  - docs/decouverte-valeur.md
  - docs/deploiement.md
  - docs/securite.md
  - docs/charte-graphique.md
  - docs/fonctionnalites.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/deployment.md
  - docs/features.md
  - docs/security.md
  - docs/style-guide.md
-->

(élargi le 2026-10-12 aux noms anglais des documents du dépôt, renommés
sur décision du demandeur.)

## 1. Besoin

Premier des trois chantiers du livrable en anglais
(`docs/intentions/livrable-full-english.md`, ordre B puis A puis C) : le
gabarit existe en double (`templates/fr/` et `templates/en/`, 58 fichiers
chacun), chaque changement s'y fait deux fois, et l'anglais emploie encore
des termes français (« fiche » 32 fois, « cadrage » 48 fois, à côté de
« sheet »). Ce chantier laisse un seul gabarit, en anglais, aligné sur le
glossaire de l'intention ; `lang` devient la langue du projet, plus celle
du kit ; ce dépôt s'installe en anglais comme un projet équipé.

## 2. Hors périmètre

- Tout nom lu par les hooks : dossiers et index des fiches
  (docs/projects/, pending.md), bloc `cadrage`, activités, champs de
  l'état, clés de config, trailer, noms des hooks et sous-commandes
  (chantier A, avec la migration des projets équipés).
- Messages, sous-commandes et commande unique de la CLI, `DRWIL-012`
  (chantier C).
- Les fiches, intentions, journal et index de ce dépôt : restent en
  français (décision du 2026-10-11).

## 3. Contraintes

- Les hooks lisent déjà les deux jeux de dossiers (docs/projets/ ou
  docs/projects/, et leurs index) : un projet français existant continue
  de fonctionner sans migration dans ce chantier ; sa config est gardée
  (journal du 2026-10-12, « init et apply gardent les réglages »).
- Une doc fausse est pire que pas de doc : chaque chemin renommé l'est
  partout dans le même commit, y compris dans le journal et les fiches de
  ce dépôt (le contrôle de la doc vérifie les chemins cités).
- Fichiers livrés : on n'édite que le gabarit, puis
  `npm run installer-depot`.
- Couverture du paquet et des hooks : ne baisse pas.

## 4. Décisions

- **2026-10-11 — Le français quitte le livrable** ; **la langue du projet
  devient un réglage** (demandeur, intention).
- **2026-10-12 — Glossaire** validé (demandeur, intention, section
  « Glossaire ») ; B n'aligne que la prose et les noms que les hooks ne
  lisent pas.
- **2026-10-12 — B avant A** (demandeur) : les docs françaises du gabarit
  disparaissent avant le renommage des hooks.
- **2026-10-12 — Ce dépôt s'installe en anglais** (demandeur) : recettes,
  skills et `docs/ia-first.md` installés en anglais, sans écart de langue ;
  ses propres documents restent en français.

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit : le
  gabarit ne garde rien de propre au dépôt, le dépôt déclare ce qu'il ne
  prend pas du gabarit.
- **QUA-011** — Doc jamais fausse : chemins renommés partout dans le même
  commit.
- **QUA-004** — Seuil de couverture : ne baisse pas.
- **QUA-019** — Pas de contournement : aucun écart déclaré pour faire
  passer `miroirs-gabarit`.

## 5. Points à trancher

Aucun.

## 6. Lots

- **Lot 1 — Inventaire** [IA] : table de correspondance des 58 fichiers
  fr → en ; pour chacun, l'anglais est-il à jour du français (les
  changements récents ont pu ne toucher que le français) ? Critère de
  sortie : chaque écart de contenu listé, puis reporté dans l'anglais.
- **Lot 2 — Prose au glossaire** [IA] : docs, recettes, skills et
  modèles anglais alignés sur le glossaire (fiche → brief, chantier →
  workstream, lot → increment, cadrage → scoping dans la prose), noms de
  fichiers que les hooks ne lisent pas renommés (ex. le modèle de fiche).
  Critère de sortie : plus aucun terme français dans le gabarit anglais,
  hors noms réservés au chantier A.
- **Lot 3 — Gabarit unique** [IA] : `templates/fr/` supprimé, l'anglais
  devient l'unique gabarit ; la CLI ne choisit plus de gabarit par langue
  (`packages/drwil/src/config.ts`, `packages/drwil/src/rendu.ts`), une installation neuve prend les dossiers
  anglais ; `outils/verifier-miroirs.mjs` et `outils/tester-tarball.mjs`
  suivent. Critère de sortie : suite du paquet verte, tarball vert.
- **Lot 4 — Langue du projet** [IA] : `--lang` et `lang` disent la langue
  du projet ; le `AGENTS.md` du gabarit demande à l'agent de répondre,
  d'écrire les fiches et les commits dans cette langue ; les messages des
  hooks gardent leur dictionnaire fr/en. Critère de sortie : un projet
  installé avec `--lang fr` a un gabarit anglais et la consigne de langue
  française ; test dédié.
- **Lot 5 — Ce dépôt en anglais** [IA] : `npm run installer-depot` installe
  recettes, skills et `docs/ia-first.md` anglais ; recettes françaises
  retirées, chemins docs/recettes/ réécrits partout (documents, fiches,
  journal, outils) ; documents de projet du gabarit (contrats, catalogue,
  architecture, fiches de référence…) déclarés propres au gabarit, le
  dépôt gardant les siens en français ; `outils/miroirs.json` à jour.
  Critère de sortie : `node .githooks/run-checks.mjs` vert, `drwil verify`
  PASS, `miroirs-gabarit` sans nouvel écart de langue.

## 7. Inventaire (lot 1, 2026-10-12)

- **Correspondance** : un pour un, 58 fichiers de chaque côté (ex.
  recettes/travailler-en-branche → recipes/working-with-branches, skill
  lancer-un-chantier → start-a-workstream).
- **Historique** : aucun commit n'a touché un fichier français sans son
  équivalent anglais.
- **Contenu** : 6 fichiers anglais étaient des squelettes de 3 à 7 lignes
  face à une version française complète — README des intentions (sans le
  modèle de fiche que vérifie QUA-015), les trois fiches de couche,
  recettes « déployer en production » et « refactorer sans casser ».
  Traduits selon le glossaire. Les 52 autres ont la même structure (titres,
  puces, blocs de code, variables).

## 8. Prose au glossaire (lot 2, 2026-10-12)

- Par script, hors code (blocs, `code` en ligne, commentaires HTML, noms
  de skills) : fiche, sheet et card → brief ; chantier → workstream ; lot
  → increment ; cadrage (prose) → scoping ; attente → expectation.
  Fichiers renommés : modèle de fiche (model-brief.md), recette et skill
  de consommation (…-per-increment), skill de lancement
  (start-a-workstream). README des trois modules optionnels traduits.
- **Restent pour le chantier A** (lus par les hooks ou code) : bloc
  `cadrage` et mot-clé `fichiers:`, clé `cadrage` et ses valeurs, section
  « Lots » des fiches (lue par le tableau de bord, qui reconnaît « Lots »
  ou « Batches »), activités, trailer, champs de `.drwil/usage.jsonl`
  (`chantier`, `lot`, `modele`…), préfixe de branche `chantier/`,
  commentaires français des hooks, de la CI, de `gitignore`,
  `.gitleaks.toml` et `.env.example` (gabarit `common/`). Noms de commandes
  des skills (`/drwil-lancer`…) : chantier C.

## 9. Gabarit unique et dépôt en anglais (lots 3 et 5, 2026-10-12)

Menés ensemble : dès que le gabarit n'a plus que l'anglais, le contrôle
des miroirs refuse les docs françaises du dépôt, donc aucun des deux ne
passe seul.

- **Gabarit** : `templates/en/` versé dans `templates/common/`,
  `templates/fr/` supprimé ; la CLI copie `common/` quelle que soit la
  langue ; une installation neuve prend les dossiers anglais, un projet
  installé garde les siens. Outils du dépôt et tests adaptés (chemins
  remplacés par la table du lot 1, textes attendus traduits).
- **Décision du 2026-10-12** (demandeur) : la doc anglaise installée cite
  les dossiers anglais standard, donc **le dépôt renomme ses dossiers de
  projet** (docs/projets/ → `docs/projects/`, contrats → `docs/contracts.md`,
  catalogue → `docs/contracts-catalog.md`, index → `docs/projects/pending.md`),
  leur contenu restant en français ; ils sont déclarés en écart. Cette
  fiche reste à son chemin d'origine jusqu'à sa clôture (l'état de
  gouvernance la référence).
- **Dépôt installé en anglais** : recettes, skills, `docs/ia-first.md` et
  les quatre documents de départ restés vierges (sécurité, déploiement,
  fonctionnalités, charte) ; recette propre au dépôt
  `docs/recipes/corriger-un-defaut.md`, en français ; les deux recettes
  adaptées au dépôt gardent leurs phrases propres, en anglais.
- **Trouvé en route** : le tableau de bord choisissait le catalogue par
  langue (corrigé : le fichier présent) ; l'installeur créait les
  fichiers déclarés propres au gabarit (corrigé, avec test) ; les noms
  de l'ancien gabarit français cités par les hooks sont acceptés par le
  contrôle des miroirs jusqu'au chantier A (liste précise).
- **Changement visible** : les commandes des skills prennent leur nom
  anglais (`/drwil-adopt`, `/drwil-value`, `/drwil-progress`,
  `/drwil-usage`) ; `/drwil-lancer` ne change pas (chantier C).
- **Reste** : une arborescence vide `packages/drwil/templates/en/`, non
  suivie par git et non livrée, à supprimer à la main (suppression
  bloquée par une vérification de sécurité de l'outil).

## 10. Reprise

- **Dernier état** (2026-10-12) : lots 1, 2, 3 et 5 faits.
- **Travail non commité** : aucun.
- **Prochaine étape** : lot 4, langue du projet.
