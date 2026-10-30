# Projet : la release se règle en solo ou en équipe, un patch se publie directement

**Statut** : cadré le 2026-10-30 — prêt à lancer.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/release-allegee.md`

<!-- scope
files:
  - packages/drwil/templates/common/optional/create-release/create-release.mjs
  - packages/drwil/templates/common/optional/create-release/create-release-texts.mjs
  - .githooks/create-release.mjs
  - .githooks/create-release-texts.mjs
  - packages/drwil/templates/common/optional/create-release/recette-note.mjs
  - packages/drwil/templates/common/optional/create-release/recette-note-texts.mjs
  - .githooks/recette-note.mjs
  - .githooks/recette-note-texts.mjs
  - packages/drwil/templates/common/optional/create-release/README.md
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/src/migration-table.ts
  - packages/drwil/src/config-write.ts
  - .githooks/create-release.test.mjs
  - .githooks/recette-note.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/config-write.test.mjs
  - docs/contracts.md
  - docs/projects/kit-mechanics.md
  - docs/architecture.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/release-allegee.md
  - docs/projects/release-feu-vert-et-squash.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

(à vérifier au lancement : `docs/ia-first/7-governance-state.md` cite les réglages
de `.drwil/ia-first.json` ; si elle doit citer `release.mode`, l'ajouter au
bloc ci-dessus dans un commit de cadrage seul, avant le code. Les fichiers du
gabarit couvrent leur copie du dépôt, par `scopeMirrors`.)

## 1. Besoin

La release coûte trop de gestes pour un patch : 3 h pour la 0.6.9 (PR de
préparation, candidate, verdict, promotion, PR de clôture, note de recette en
PR, CI). Les parties lourdes servent une équipe d'acceptation qui ne lit pas le
dépôt ; un projet solo les subit sans en tirer rien.

Décidé le 2026-10-30 par le demandeur : un réglage **`release.mode`**
(`solo` ou `team`) dans `.drwil/ia-first.json` choisit le niveau de garde, et
le défaut est **`solo`**.

- **`solo`** : un patch se publie **directement**, sans candidate ni verdict (le
  mécanisme existe déjà, QUA-079) ; **une seule PR**, celle de préparation
  (version, `CHANGELOG`, examen des documents) ; la **note de recette n'est plus
  une PR** après coup : elle va dans le corps de la release GitHub, avec la
  mention « sans verdict ». La candidate reste disponible sur demande
  (`--candidate`) pour une mineure ou une majeure.
- **`team`** : le parcours actuel, inchangé : candidate, verdict humain,
  promotion, note de recette par PR. Une release directe est refusée.

Deux petites limites rattachées à l'intention, traitées ici parce qu'elles
touchent les mêmes fichiers : le module de note de recette n'est cité ni par la
fiche des mécaniques livrée ni par le README du module ; le texte de QUA-048
(une clôture en un geste) dit encore `git branch -d` alors que QUA-058 reconnaît
le squash.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Le réglage `release.mode` vaut `solo` ou `team`, `solo` par défaut ; une autre
  valeur est refusée et la migration d'un projet existant le conserve — contrat
  à créer
- En `solo`, `.githooks/create-release.mjs` sans `--candidate` publie directement un patch,
  sans candidate ni verdict — contrat à créer
- En `team`, la création directe d'une release est refusée et dit d'utiliser
  `--candidate` — contrat à créer
- En `solo`, la note de recette « sans verdict » est écrite dans le corps de la
  release GitHub, jamais par une branche `recette/vX.Y.Z` ni une PR ; en `team`,
  elle arrive par la PR dédiée comme aujourd'hui — contrat à créer
- Le tag et la release publiés ne dépendent jamais de l'écriture de la note, dans
  les deux modes — `QUA-080`
- `--dry-run` montre, pour chaque mode, ce qui serait publié et où irait la note,
  sans rien créer — contrat à créer
- La fiche des mécaniques livrée et le README du module citent
  `.githooks/recette-note.mjs`, et le contournement du test du kit est retiré —
  contrat à créer
- Le texte de QUA-048 renvoie à QUA-058 pour les branches fusionnées par squash —
  `QUA-048`

## Contrats modifiés

(validés par le demandeur au cadrage, le 2026-10-30.)

- `QUA-079` — ancien critère : une version publiée sans candidate reçoit sa
  note « sans verdict » par la branche dédiée et la PR — raison : en `solo` la
  note va dans le corps de la release, la PR reste propre à `team` (validé le
  2026-10-30)
- `QUA-048` — ancien critère : branches fusionnées supprimées par `git branch -d`
  — raison : renvoyer à QUA-058, qui reconnaît le squash (`git branch -D` quand
  la fusion est prouvée par `gh`) (validé le 2026-10-30)

## 2. Hors périmètre

- Publier sur npm : la release ne publie jamais sur npm (recette actuelle).
- `release-feu-vert-et-squash` : fiche à part, gardée telle quelle, à lancer
  après celle-ci ; elle travaille sur `.githooks/state.mjs` et la fiche de recette, pas sur
  `.githooks/create-release.mjs`.
- Supprimer la candidate, le verdict ou la promotion : ils restent, pour `team`
  et pour `--candidate`.
- Rejouer la 0.6.9 : aucun changement de version dans ce chantier.

## 3. Contraintes

- Module de release optionnel : sans lui, rien ne change pour un projet.
- `solo` par défaut change le comportement des adoptants qui ont le module : la
  montée de version conserve la valeur déjà déclarée, et l'annonce au
  `CHANGELOG` (« Unreleased ») le dit en anglais.
- Les textes existent en français et en anglais.
- Le verdict de recette reste un geste humain, jamais exécuté par un agent.
- Chaque fichier de code reste à 200 lignes au plus : `.githooks/create-release.mjs` en
  compte déjà 161, une découpe est à prévoir si le lot 2 le fait dépasser.

## 4. Décisions

(tranchées par le demandeur le 2026-10-30)

1. Un patch se publie directement, sans candidate ni verdict.
2. Une seule PR, celle de préparation ; la note de recette sort de la PR et va
   dans le corps de la release.
3. Un réglage `release.mode`, `solo` par défaut, `team` pour retrouver le
   parcours actuel.
4. La fiche `release-feu-vert-et-squash` est gardée telle quelle.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — le réglage** [IA] : `release.mode` lu par `.githooks/create-release.mjs`,
  déclaré dans la table des clés et préservé à la réécriture de la configuration
  (`packages/drwil/src/migration-table.ts`, `packages/drwil/src/config-write.ts`) ; `team` refuse la release directe ;
  tests ; contrats et contrôles `tests-qua-<id>`. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --evidence` rend
  `GOVERNANCE: PASS`.
- **Lot 2 — la note dans la release** [IA] : en `solo`, la note « sans verdict »
  est passée au corps de la release (`gh release create --notes-file`), sans
  branche ni PR ; `--dry-run` la montre ; recette et README du module à jour ;
  `QUA-079` réécrit. Même critère de sortie.
- **Lot 3 — les deux petites limites** [IA] : citer `.githooks/recette-note.mjs` dans la
  fiche des mécaniques livrée et le README du module, retirer le contournement
  du test du kit ; réécrire le texte de QUA-048. Même critère de sortie.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer la fiche (`/drwil-start`), puis
  `release-feu-vert-et-squash` une fois celle-ci close.
