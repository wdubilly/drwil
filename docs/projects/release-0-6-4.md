# Projet : release 0.6.4

**Statut** : cadré le 2026-10-18.
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

Demandé le 2026-10-18 : publier la 0.6.4. Ses chantiers sont fusionnés :
la CI plus rapide (Windows et macOS testés seulement quand une PR touche du
code) et la file de chantiers menée par sous-agents ; le workflow CI au
YAML invalide refusé au commit (fait, journal du 2026-10-18)
passe avant, s'il est lancé (voir Contraintes).
`node .githooks/create-release.mjs --dry-run` refuse tant que la version
reste 0.6.3, déjà taguée (vérifié le 2026-10-18).

## Critères d'acceptation

- La version 0.6.4 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog devient « 0.6.4 » datée
  avec une « Unreleased » vide au-dessus, et les deux README installent
  depuis la release 0.6.4 — `QUA-040`
- Un projet équipé en 0.6.3 passe à la 0.6.4 sans rien perdre : fichiers
  du projet et mécanique modifiée préservés, obsolète non modifié retiré,
  nouvelle version enregistrée — `QUA-027`

## 2. Hors périmètre

- La publication npm.
- Tout changement de code : une anomalie trouvée pendant l'essai de mise à
  jour est corrigée dans son propre chantier, la release attend.
- La réattestation de QUA-013 (contrôle non exécuté n'est pas passé),
  geste humain qui ne bloque pas la release.

## 3. Contraintes

- Le tag vient de la version du paquet (recette
  `docs/recipes/create-a-release.md`) : version changée dans cette PR, tag
  posé après sa fusion.
- La vraie release (tag poussé, note GitHub, tarball attaché) est une
  action extérieure : seulement sur feu vert explicite du demandeur, après
  un `--dry-run` qui annonce v0.6.4.
- Si le chantier du YAML est lancé avec cette release, il passe d'abord :
  les deux touchent `package.json` et le verrou. Il ne change rien de ce
  que voit un utilisateur, donc aucune ligne de changelog.
- README et changelog en anglais (`docLang`) ; la phrase « the latest
  release is 0.6.3 » du README est mise à jour.

## 4. Décisions

- 2026-10-18 (demandeur) : une fiche dédiée, comme la 0.6.3 ; critères
  prouvés par des contrats existants, aucun contrat créé.
- 2026-10-18 (proposé par l'agent, comme pour la 0.6.3) : en plus du test
  de QUA-027 (mise à jour sûre d'une version à la suivante), un essai
  réel — projet temporaire équipé avec le tarball 0.6.3 de la release
  GitHub, mis à jour avec le tarball 0.6.4, puis `drwil verify` ; résultat
  consigné au journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version patch --no-git-tag-version` (paquet,
  racine, verrou) ; changelog et README ; essai réel de mise à jour
  0.6.3 → 0.6.4 ; PR fusionnée.
- **Lot 2 — publier** (après fusion, sur feu vert) : `--dry-run`, puis
  `node .githooks/create-release.mjs` ; tarball téléchargeable vérifié.

## 6. Reprise

- **Dernier état** (2026-10-18) : cadré ; rien de commencé.
