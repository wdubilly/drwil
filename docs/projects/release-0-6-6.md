# Projet : release 0.6.6, la stabilisation

**Statut** : cadré le 2026-10-19.
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
README si une phrase y annonce encore une version ; aucun code, aucun test
modifié.)

## 1. Besoin

Demandé le 2026-10-19 : publier la 0.6.6, la stabilisation (push depuis
un worktree, branches fusionnées par squash, contrat ajouté pendant un
détour, fiche de recette juste ; PR 166 à 169).
`node .githooks/create-release.mjs --candidate --dry-run` refuse tant que
la version reste 0.6.5, déjà taguée (vérifié le 2026-10-19). C'est aussi
le premier essai de la fiche de recette corrigée par la 0.6.6.

## Critères d'acceptation

- La version 0.6.6 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog devient « 0.6.6 » datée
  avec une « Unreleased » vide au-dessus — `QUA-040`
- Les README pointent vers la dernière version validée, sans numéro figé
  à mettre à jour — `QUA-055`
- Un projet équipé en 0.6.5 passe à la 0.6.6 sans rien perdre — `QUA-027`
- `create-release.mjs --candidate --dry-run` annonce la candidate
  v0.6.6-rc.1 et sa fiche de recette — `QUA-051`

## 2. Hors périmètre

- La publication npm.
- Tout changement de code : une anomalie trouvée pendant l'essai est
  corrigée dans son propre chantier, la release attend.

## 3. Contraintes

- Le tag vient de la version du paquet (recette
  `docs/recipes/create-a-release.md`) : version changée dans cette PR,
  candidate posée après sa fusion.
- Candidate et promotion sont des actions extérieures : chacune attend le
  oui du demandeur après un `--dry-run` qui annonce la bonne version.
- Le verdict (`.githooks/release-verdict.mjs`) est un geste humain dans
  un terminal : jamais lancé par l'agent.
- README et changelog en anglais (`docLang`).

## 4. Décisions

- 2026-10-19 (demandeur) : publier la 0.6.6 par le parcours de recette,
  comme la 0.6.5.
- 2026-10-19 (agent, comme pour la 0.6.5) : candidate, verdict et
  promotion ne se font qu'après la fusion de la PR (le tag vient de la
  version sur la branche principale) : lots 2 et 3, consignés au journal.
- 2026-10-19 (agent, comme pour la 0.6.5) : en plus du test de QUA-027,
  un essai réel — projet temporaire équipé avec le tarball 0.6.5 de la
  release GitHub, mis à jour avec le tarball 0.6.6, puis `drwil verify` ;
  résultat consigné au journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version patch --no-git-tag-version` (paquet,
  racine, verrou) ; changelog ; essai réel de mise à jour 0.6.5 → 0.6.6 ;
  PR fusionnée.
- **Lot 2 — candidate** (après fusion) : `--candidate --dry-run`, puis
  `--candidate` ; fiche de recette lue avec l'humain.
- **Lot 3 — verdict et promotion** : verdict par l'humain ; puis
  `promote-release.mjs --dry-run` et promotion ; tarball téléchargeable
  vérifié.

## 6. Reprise

- **Dernier état** (2026-10-19) : cadré ; rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
