# Projet : le temps passé dans les contrôles d'un chantier est journalisé à la clôture

**Statut** : cadré le 2026-11-11 ; décisions D1 à D3 tranchées le 2026-11-11 (0.11.2, chantier 7 sur 8).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md` (parties « les chantiers vont-ils plus vite ? un journal des passes locales », « suivre la durée de la CI comme un indicateur » et « relever la durée du job `checks` quand les hooks sont inchangés »)

<!-- scope
files:
  - .githooks/run-checks.mjs
  - .githooks/run-checks-verdicts.mjs
  - .githooks/consumption.mjs
  - .githooks/consumption-format.mjs
  - .githooks/consumption.test.mjs
  - .githooks/close-mechanics.mjs
  - packages/drwil/templates/common/base/.githooks/consumption.mjs
  - packages/drwil/templates/common/base/.githooks/consumption-format.mjs
  - packages/drwil/templates/common/base/.githooks/close-mechanics.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-verdicts.mjs
  - docs/recipes/track-consumption-per-increment.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/projects/kit-mechanics.md
  - packages/drwil/CHANGELOG.md
-->

(Le bloc `scope` couvre l'écriture du journal par `run-checks`, la ligne de `.drwil/usage.jsonl` écrite à la clôture, leurs
copies livrées, la recette, le registre et la carte du moteur. `.githooks/run-checks.mjs` fait 200 lignes : l'écriture du
journal va dans `.githooks/run-checks-verdicts.mjs` ou dans un module neuf. Un autre fichier ne s'ajoute que par un commit séparé.)

## 1. Besoin

La 0.11.2 vise à accélérer les tests et les contrôles ; sans mesure qui dure, le gain ne se prouve pas. Constat du
2026-10-26 (intention d'origine) : le gain de la 0.9.0 se joue en local et rien n'en garde la trace. Ce qui existe :

- les fichiers de verdicts de `run-checks` et du pre-push (dans `.drwil/evidence/`, ignorés par git) : verdict et durée de
  chaque contrôle de la dernière passe seulement, écrasés à la suivante ;
- le journal `.drwil/evidence/run-checks.log` (si présent) : détail de la dernière passe, écrasé aussi ;
- `.drwil/evidence/verify-*.json` : une preuve par passe de `verify --evidence`, avec durée et drapeau « rejoué » ;
- `.drwil/usage.jsonl` : durée active et tokens par chantier, sans le temps passé dans les contrôles
  (ligne écrite par `usageLine`, `.githooks/consumption-format.mjs`, appelée à la clôture par `--record`, QUA-042).

On ne peut donc ni montrer ni calculer si les chantiers vont plus vite, ni comparer la 0.11.2 à la 0.11.1.

Le projet : garder, pour chaque passe locale, sa durée et le décompte repris et rejoué ; à la clôture, écrire dans la
ligne du chantier de `.drwil/usage.jsonl` le temps passé dans les contrôles ; livrer cela aux projets adoptés.

## Critères d'acceptation

- Chaque passe de `run-checks` (commit, pre-push, passe à la main) ajoute une ligne locale : date, branche, durée réelle,
  nombre de contrôles repris et rejoués ; le fichier est ignoré par git et jamais lu par une preuve — contrat à créer
- La ligne de `.drwil/usage.jsonl` écrite à la clôture porte `checks_min` (somme des durées des passes du chantier) et
  `checks_passes` (leur nombre) ; sans journal lisible, la clôture n'est jamais bloquée et la ligne le dit — `QUA-042`
- Le journal local, sa lecture et la colonne de `usage.jsonl` sont livrés à tout projet adopté (gabarit) ; un projet
  mis à jour obtient la colonne sans migration manuelle — contrat à créer
- Le temps des contrôles de la 0.11.2 est comparé à celui de la 0.11.1 sur des chantiers de taille comparable, relevé à la
  main dans le journal de clôture du dernier chantier de la 0.11.2 — [humain] `QUA-013`

## Contrats modifiés

- `QUA-042` : la ligne écrite par `--record` gagne les champs `checks_min` et `checks_passes` ; ils sont facultatifs à la
  lecture (les lignes anciennes n'en ont pas). À valider par le demandeur, consigné le 2026-11-11.

## 2. Hors périmètre

- Un tableau de bord de tendance et un seuil d'alerte : écartés (D3). Le relevé reste manuel, au journal de clôture.
- Faire lire les durées par le tableau « Durée de la CI drwil » (artefact externe) : hors de ce dépôt.
- Le cache lu par requête (`docs/intentions/suivi-ci-et-contexte.md`, partie « relever le cache lu moyen ») : contexte, pas test.
- Reprendre un verdict à `verify --evidence` : chantier 6 (D2, aucun changement).
- Les durées de la CI de la forge : celles de `docs/mesures-ci-reference.md` et du relevé manuel suffisent (D3).

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : le journal et la colonne sont livrés ; on édite le gabarit (`packages/drwil/templates/`),
  puis `npm run installer-depot` rafraîchit la copie, dans le même commit.
- Jamais de contenu de message ni de donnée nominative dans le journal : durées, décomptes et noms de branche seulement.
- Le journal n'est jamais bloquant ni lu par une preuve : un contrôle ne se juge pas sur son propre chronomètre (QUA-013).
- Le journal est ignoré par git (comme `.drwil/evidence/`) : il vit dans le dossier local, pas dans l'arbre.
- Un fichier de code à 180 lignes ou plus est découpé (plafond 200) : `.githooks/run-checks.mjs` (200),
  `.githooks/close-mechanics.mjs` (64) et `.githooks/consumption-format.mjs` (80) laissent peu ou pas de place.
- Le chantier 6 (`docs/projects/preuves-fiables-rejeux-mesures.md`) modifie `.githooks/run-checks-verdicts.mjs` : jouer l'un
  après l'autre, avec une fusion entre les deux.

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — Où vit le journal** : une colonne « temps des contrôles » dans `.drwil/usage.jsonl`, écrite à la clôture.
  *Alternatives écartées* : un fichier local seul ; les deux.
- **D2 — Livré aux projets adoptés** : oui, dès ce chantier (gabarit, `doctor`, mise à jour). *Alternative écartée* : propre à ce dépôt d'abord.
- **D3 — Tendance et seuil** : relevé manuel au journal seulement, pas de tableau de bord. *Alternatives écartées* : tendance
  au tableau de bord ; tendance et seuil d'alerte non bloquant.

## 5. Points à trancher

- [IA] Conséquence de D1 : la colonne s'écrit à la clôture, mais les durées de chaque passe sont écrasées à la suivante.
  Il faut donc un cumul local pendant le chantier (un petit fichier de passes, ignoré par git, que `--record` somme puis
  efface). C'est un moyen, pas un nouveau choix de lieu : D1 reste « la colonne de `usage.jsonl` ».
- [humain] Le nom exact des champs (`checks_min`, `checks_passes`) et de la ligne de cumul : à valider à la réalisation.
- [IA] Le relevé de la durée du job `checks` sur une PR ordinaire (hooks inchangés) : fait à la main au journal du dernier
  chantier, puis la partie correspondante de l'intention est supprimée.

## 6. Increments

- **Lot 0** : faire de la place dans `.githooks/run-checks.mjs` (200 lignes), sans changement de comportement, en commit séparé.
- **Lot 1** : tests d'abord, rouges : une passe ajoute sa ligne de cumul ; la clôture somme et écrit les deux champs ;
  sans cumul, la ligne le dit et la clôture passe.
- **Lot 2** : écrire le cumul à chaque passe de `run-checks`, le lire dans `--record`, effacer le cumul à la clôture.
- **Lot 3** : livrer aux projets (gabarit, `doctor`, mise à jour) et mettre à jour la recette `track-consumption-per-increment`.
- **Lot 4** : `QUA-042` mis à jour, carte du moteur, ligne du `CHANGELOG`.

## 7. Reprise

Prêt à démarrer par le lot 0 ; rien de commencé.
