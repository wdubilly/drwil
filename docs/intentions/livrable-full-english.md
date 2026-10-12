# Intention : le livrable drwil entièrement en anglais

**Statut** (2026-10-12) : cadrée — toutes les questions tranchées ; menée en
trois chantiers, B puis A puis C (voir « Découpage »).

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
  (`packages/drwil/src/config.ts`). `templates/en/` existe à côté de
  `templates/fr/` (base, ci, layers, tools) : la **prose** est déjà
  traduite.
- Mais `templates/common/`, installé quelle que soit la langue, est en
  français :
  - noms de fichiers, sous `.githooks/` : `etat`, `perimetre`, `cadrage`,
    `moteur`, `risque`, `contrats` (scripts Node) ; hooks Claude Code sous
    `.claude/hooks/` : `saisie-drwil`, `garde-fou-bash`, `rappel-cadrage` ;
    modules optionnels `tableau-de-bord`, `creer-une-release` ;
  - noms d'activités (`CADRAGE`, `REALISATION`, `CLOTURE`…), écrits dans
    `.drwil/state.json` (si présent) ;
  - clés de `.drwil/ia-first.json` (`barriere`, `transitions`, `chemins`…),
    bloc `<!-- cadrage -->` des fiches, trailer `Drwil-Attente`,
    sous-commandes `etat.mjs passer` / `lancer` / `fiches` ;
  - identifiants et commentaires du code ; une partie des messages est
    déjà bilingue (`TEXTES.fr` / `TEXTES.en` dans `.githooks/etat.mjs`).
- Ce dépôt s'installe depuis son gabarit (`npm run installer-depot`) :
  renommer dans le gabarit suffit, la commande met les copies à jour.
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

## Décisions (demandeur, 2026-10-11)

- **Le français quitte le livrable** (question 1) : un seul gabarit, en
  anglais — code, identifiants, noms de fichiers, docs, messages.
  Raison : le double gabarit (`templates/fr/`, `templates/en/`, 58
  fichiers chacun) double chaque changement, et le code commun n'était
  qu'en français, même en `--lang en`.
- **La langue du projet devient un réglage**, distinct de celle du kit :
  `lang` de `.drwil/ia-first.json` ; `AGENTS.md` (en anglais) demande à
  l'agent de répondre, d'écrire les fiches et les commits dans cette
  langue. Un francophone parle français à l'agent et lit ses fiches en
  français, sur un kit unique en anglais. Les rares messages que
  l'humain lit directement (refus d'un hook) peuvent garder un petit
  dictionnaire de textes, sans dupliquer le gabarit.
- **Ce dépôt** (question 4) : ses fiches, intentions, journal et échanges
  restent en français ; son code suit le livrable.
- **Ordre** (question 5) : la publication passe en dernier (vague 7 de
  `docs/projects/pending.md`) ; l'anglais se fait **avec la suppression
  de la duplication dépôt / gabarit** (vague 4), pour ne renommer qu'une
  fois. Précisé le 2026-10-12 : le dépôt s'installe depuis le gabarit
  (fait, `npm run installer-depot`, journal du 2026-10-12), puis refactor, puis
  anglais ; le renommage ne se fait donc qu'une fois, dans le gabarit.
- **Compatibilité** (question 3, 2026-10-12) : **migration en une fois**
  par `drwil init` / `apply` (état, clés de configuration, blocs
  `cadrage`, trailers), sans alias. Raison : rien n'est encore publié sur
  npm, presque aucun projet n'est concerné, et des alias seraient du code
  en double à maintenir et à tester.

- **Commande unique** (2026-10-12) : fusionner `init` et `apply` en une
  seule commande qui détecte une installation existante (neuf : installe ;
  existant : met à jour et signale la dérive) se fait avec ce chantier,
  qui renomme déjà l'interface, pour ne renommer qu'une fois. La reprise
  des réglages existants est faite avant, à part (journal du
  2026-10-12, « init et apply gardent les réglages »).

- **Glossaire** (question 2, 2026-10-12) : référence de tout renommage,
  voir « Glossaire ».
- **Découpage** (question 6, 2026-10-12) : trois chantiers, une fiche et
  une PR chacun, dépôt vert à chaque étape, dans cet ordre :
  - **B — gabarit unique en anglais** : `templates/fr/` supprimé, prose
    anglaise alignée sur le glossaire, `lang` devient la langue du projet,
    le dépôt s'installe en anglais — fait, journal du 2026-10-12 ;
  - **A — cœur** : hooks, état, config, blocs et trailer renommés
    ensemble, migration des projets équipés par `init` / `apply` —
    `docs/projects/coeur-en-anglais.md` ;
  - **C — CLI** : messages, sous-commandes, commande unique `init` /
    `apply`, retrait de `DRWIL-012`.
  B passe avant A (décidé le 2026-10-12) : renommer les hooks d'abord
  obligerait à corriger les docs françaises du gabarit, supprimées juste
  après.
- **Fichiers installés dans ce dépôt** (question 7, 2026-10-12) : en
  anglais, comme chez un projet équipé ; aucun écart pour la langue. Ses
  fiches, intentions et journal restent en français.

## Glossaire (2026-10-12)

| Français | Anglais |
|---|---|
| fiche | brief |
| chantier / lot | workstream / increment |
| cadrage, bloc `cadrage` | scoping, bloc `scope` |
| intention | intent |
| recette | recipe |
| contrat, catalogue | contract, catalog |
| index en-attente.md | pending.md (décidé le 2026-10-12, nom livré par B) |
| journal | journal |
| activités | CADRAGE → SCOPING, ATTENTE → EXPECTATION, DEMANDE → REQUEST, REALISATION → BUILD, PREUVES → EVIDENCE, VERIFY, CLOTURE → CLOSING |
| état | `attente_active` → `active_brief`, `demande_active` → `active_request`, `fusion_autorisee` → `auto_merge` ; trailer `Drwil-Attente` → `Drwil-Brief` |
| config | `barriere` → `scopeGate`, `cadrage` → `scopeReminder`, `nouvellesExigences` → `newRequirements`, `chemins` → `paths` |
| hooks | `etat` → `state`, `perimetre` → `scope-gate`, `cadrage` → `scope`, `fiches` → `briefs`, `contrats` → `contracts`, `moteur` → `engine`, `risque` → `risk` ; `garde-fou-bash` → `bash-guard`, `rappel-cadrage` → `scope-reminder`, `saisie-drwil` → `prompt-hook` ; modules `tableau-de-bord` → `dashboard`, `creer-une-release` → `create-release` |
| sous-commandes | `passer` → `move`, `lancer` → `start`, `fiches` → `briefs`, `rappel` → `reminder` |

Les noms lus par les hooks (dossiers et index des fiches, bloc, activités,
clés) changent en A ; B n'aligne que la prose et les noms de fichiers que
les hooks ne lisent pas.

## Questions à trancher

Toutes tranchées (2026-10-12) ; texte d'origine gardé ci-dessous.


1. ~~**Le français**~~ — tranchée le 2026-10-11 (voir « Décisions »).
   Texte d'origine : : supprimé du livrable, ou gardé en option (`--lang fr`)
   avec l'anglais par défaut ? S'il reste, que devient le code commun :
   identifiants anglais et messages bilingues ?
2. ~~**Vocabulaire**~~ — tranchée le 2026-10-12. Texte d'origine : traductions de référence pour fiche, chantier,
   cadrage, attente, intention, recette, contrat — un glossaire à fixer
   avant tout renommage.
3. ~~**Compatibilité**~~ — tranchée le 2026-10-12 (voir « Décisions »).
   Texte d'origine : lecture des anciens noms (activités, clés, bloc
   `cadrage`, trailer) en alias pendant une période, ou migration en une
   fois par `drwil init` / `apply` ?
4. ~~**Ce dépôt**~~ — tranchée le 2026-10-11 (voir « Décisions »).
   Texte d'origine : : suit-il le renommage des hooks (il tourne sur ses propres
   copies) tout en gardant sa doc en français, ou garde-t-il des noms
   français, au prix d'une divergence avec le gabarit ?
5. ~~**Ordre**~~ — tranchée le 2026-10-11 (voir « Décisions »).
   Texte d'origine : : avant ou après la publication npm (décision P1 en attente,
   `docs/intentions/packager-kit-ia-first.md`) ? Passer en anglais avant
   la première publication évite une migration aux premiers adoptants.
6. ~~**Découpage**~~ — tranchée le 2026-10-12. Texte d'origine : par couche (docs, puis CLI, puis hooks et état) ou par
   fonctionnalité, avec quels lots livrables séparément ?
7. ~~**Langue des fichiers installés dans ce dépôt**~~ — tranchée le
   2026-10-12 (anglais). Texte d'origine :
   le dépôt s'installe depuis le gabarit
   (`npm run installer-depot`, journal du 2026-10-12) ; ses recettes et
   `docs/ia-first.md` deviendront donc anglais, alors que ses fiches,
   intentions et journal restent en français (question 4). Accepté tel
   quel, ou recettes du dépôt déclarées en écart ?
