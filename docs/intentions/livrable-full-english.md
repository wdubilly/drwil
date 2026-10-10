# Intention : le livrable drwil entièrement en anglais

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur,
questions à trancher en fin de fiche.

**Projet** : DRWIL — **Niveau de risque** : HIGH (le livrable touche
`.githooks/`, l'état `.drwil/` et la CI des projets qui l'adoptent).

## Besoin

Périmètre : **drwil-le-livrable** (le gabarit de `packages/drwil/templates/`
et la CLI `packages/drwil`), pas ce dépôt — QUA-018 (périmètre explicite :
dépôt drwil vs livrable gabarit), tranché par le demandeur le 2026-10-10.

Intention : que **tout** ce que drwil installe ou affiche soit en anglais,
pour toucher un public international (publication npm, Community Ready) :
docs et fiches du gabarit, noms de fichiers, code et commentaires, messages
des hooks et de la CLI, noms d'activités, clés de configuration, skills,
convention de langue des commits proposée aux projets.

## Existant

- La CLI choisit déjà une langue : `LANGS = ["fr", "en"]`, `fr` par défaut
  (`packages/drwil/src/index.ts`). `templates/en/` existe à côté de
  `templates/fr/` (base, ci, layers, tools) : la **prose** est déjà
  traduite.
- Mais `templates/common/`, installé quelle que soit la langue, est en
  français :
  - noms de fichiers, sous `.githooks/` : `etat`, `perimetre`, `cadrage`,
    `moteur`, `risque`, `contrats` (scripts Node) ; hooks Claude Code sous
    `.claude/hooks/` : `saisie-drwil`, `garde-fou-bash`, `rappel-cadrage` ;
    modules optionnels `tableau-de-bord`, `creer-une-release` ;
  - noms d'activités (`CADRAGE`, `REALISATION`, `CLOTURE`…), écrits dans
    `.drwil/state.json` ;
  - clés de `.drwil/ia-first.json` (`barriere`, `transitions`, `chemins`…),
    bloc `<!-- cadrage -->` des fiches, trailer `Drwil-Attente`,
    sous-commandes `etat.mjs passer` / `lancer` / `fiches` ;
  - identifiants et commentaires du code ; une partie des messages est
    déjà bilingue (`TEXTES.fr` / `TEXTES.en` dans `.githooks/etat.mjs`).
- Ce dépôt utilise ses propres copies des hooks : `.githooks/` est
  identique à `templates/common/base/.githooks/` (hors modules
  optionnels). Renommer côté gabarit fait diverger le dépôt, ou l'entraîne.
- `docs/intentions/community-ready.md` (question 1) pose seulement la
  langue des fichiers communautaires (CONTRIBUTING, code of conduct) :
  à trancher avec celle-ci.

## Contraintes

- Les projets déjà équipés ne doivent pas casser : l'état `.drwil/state.json` (si présent), clés de
  configuration, blocs `cadrage` et trailers existants doivent être lus ou
  migrés (l'`init` sait déjà supprimer des fichiers obsolètes d'une
  ancienne version).
- Changement cassant : version majeure (ou mineure en 0.x) et note de
  version explicite.
- Une seule source par information : pas de doublon fr/en du code commun.
- Une doc fausse est pire que pas de doc : traduire et renommer dans les
  mêmes commits que le code.

## Questions à trancher

1. **Le français** : supprimé du livrable, ou gardé en option (`--lang fr`)
   avec l'anglais par défaut ? S'il reste, que devient le code commun :
   identifiants anglais et messages bilingues ?
2. **Vocabulaire** : traductions de référence pour fiche, chantier,
   cadrage, attente, intention, recette, contrat — un glossaire à fixer
   avant tout renommage.
3. **Compatibilité** : lecture des anciens noms (activités, clés, bloc
   `cadrage`, trailer) en alias pendant une période, ou migration en une
   fois par `drwil init` / `apply` ?
4. **Ce dépôt** : suit-il le renommage des hooks (il tourne sur ses propres
   copies) tout en gardant sa doc en français, ou garde-t-il des noms
   français, au prix d'une divergence avec le gabarit ?
5. **Ordre** : avant ou après la publication npm (décision P1 en attente,
   `docs/intentions/packager-kit-ia-first.md`) ? Passer en anglais avant
   la première publication évite une migration aux premiers adoptants.
6. **Découpage** : par couche (docs, puis CLI, puis hooks et état) ou par
   fonctionnalité, avec quels lots livrables séparément ?
