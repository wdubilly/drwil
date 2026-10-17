# Projet : release 0.6.3

**Statut** : cadré le 2026-10-17.
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - package.json
  - package-lock.json
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - packages/drwil/README.md
  - README.md
-->

(cadrage : les versions des paquets et du verrou, le changelog, les deux
README (lien d'installation de la release) ; aucun code, aucun test
modifié.)

## 1. Besoin

Demandé le 2026-10-17 : publier la 0.6.3. Ses six chantiers sont fusionnés
(identifiant sans libellé rattrapé, mise à jour qui rafraîchit la prose du
kit, documents de cadrage en SCOPING, racine des hooks, `npm init -y`,
guide de démarrage) et l'affichage de la note de fin de réponse est vérifié
(terminal, 2026-10-17). `node .githooks/create-release.mjs --dry-run`
refuse tant que la version reste 0.6.2, déjà taguée.

## Critères d'acceptation

- La version 0.6.3 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog devient « 0.6.3 » datée
  avec une « Unreleased » vide au-dessus, et les deux README installent
  depuis la release 0.6.3 — `QUA-040`
- Un projet équipé en 0.6.2 passe à la 0.6.3 sans rien perdre : fichiers
  du projet et mécanique modifiée préservés, obsolète non modifié retiré,
  nouvelle version enregistrée — `QUA-027`

## 2. Hors périmètre

- La publication npm.
- Tout changement de code : une anomalie trouvée pendant l'essai de mise à
  jour est corrigée dans son propre chantier, la release attend.

## 3. Contraintes

- Le tag vient de la version du paquet (recette
  `docs/recipes/create-a-release.md`) : version changée dans cette PR, tag
  posé après sa fusion.
- La vraie release (tag poussé, note GitHub, tarball attaché) est une
  action extérieure : seulement sur feu vert explicite du demandeur, après
  un `--dry-run` qui annonce v0.6.3.
- README et changelog en anglais (`docLang`).

## 4. Décisions

- 2026-10-17 (demandeur) : une fiche dédiée, comme la 0.6.0 ; critères
  prouvés par des contrats existants, aucun contrat créé.
- 2026-10-17 (proposé par l'agent, comme pour la 0.6.0) : en plus du test de QUA-027 (mise à jour sûre
  d'une version à la suivante), un essai réel — projet temporaire équipé
  avec le tarball 0.6.2 de la release GitHub, mis à jour avec le tarball
  0.6.3, puis `drwil verify` ; résultat consigné au journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version patch --no-git-tag-version` (paquet,
  racine, verrou) ; changelog et README ; essai réel de mise à jour
  0.6.2 → 0.6.3 ; PR fusionnée.
- **Lot 2 — publier** (après fusion, sur feu vert) : `--dry-run`, puis
  `node .githooks/create-release.mjs` ; tarball téléchargeable vérifié.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
