# Projet : release 0.6.0

**Statut** : cadré le 2026-10-17.
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - package.json
  - package-lock.json
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - README.md
-->

(cadrage : les versions des paquets et du verrou, le changelog, le
README ; aucun code, aucun test modifié.)

## 1. Besoin

Demandé le 2026-10-17 : publier la 0.6.0 pour le pilote sur 2 ou 3
projets. La dernière release est la 0.5.1 (2026-10-13) ; depuis, 196
commits fusionnés : non-régression par chantier, file de chantiers,
consommation de tokens par chantier (QUA-042), identifiants lisibles,
carte entretenue. Un projet qui installe la dernière release n'a rien de
tout ça, et le README racine le dit désormais (entretien courant du
2026-10-17). `node .githooks/create-release.mjs --dry-run` refuse tant que
la version reste 0.5.1, déjà taguée.

## Critères d'acceptation

- La version 0.6.0 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog devient « 0.6.0 » datée
  avec une « Unreleased » vide au-dessus, et le README ne présente plus la
  0.6.0 comme à venir — `QUA-040`
- Un projet équipé en 0.5.1 passe à la 0.6.0 sans rien perdre : fichiers
  du projet et mécanique modifiée préservés, obsolète non modifié retiré,
  nouvelle version enregistrée — `QUA-027`

## 2. Hors périmètre

- La publication npm (vague 7, `docs/intentions/packager-kit-ia-first.md`).
- Tout changement de code : une anomalie trouvée pendant l'essai de mise à
  jour est corrigée dans son propre chantier, la release attend.

## 3. Contraintes

- Le tag vient de la version du paquet (recette
  `docs/recipes/create-a-release.md`) : version changée dans cette PR, tag
  posé après sa fusion.
- La vraie release (tag poussé, note GitHub, tarball attaché) est une
  action extérieure : seulement sur feu vert explicite du demandeur, après
  un `--dry-run` qui annonce v0.6.0.
- README et changelog en anglais (`docLang`).

## 4. Décisions

- 2026-10-17 (demandeur) : une fiche dédiée, pas l'entretien courant ;
  critères prouvés par des contrats existants, aucun contrat créé.
- 2026-10-17 (proposé par l'agent, accepté) : en plus du test de QUA-027
  (version antérieure simulée), un essai réel — projet temporaire équipé
  avec le tarball 0.5.1 de la release GitHub, mis à jour avec le tarball
  0.6.0, puis `drwil verify` ; résultat consigné au journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version minor --no-git-tag-version` (paquet,
  racine, verrou) ; changelog et README ; essai réel de mise à jour
  0.5.1 → 0.6.0 ; PR fusionnée.
- **Lot 2 — publier** (après fusion, sur feu vert) : `--dry-run`, puis
  `node .githooks/create-release.mjs` ; note de version complétée
  (`paths` décide aussi de ce qui tourne au commit, ligne de la vague 7
  de l'index) ; tarball téléchargeable vérifié.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
