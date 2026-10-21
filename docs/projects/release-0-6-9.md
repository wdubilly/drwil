# Projet : release 0.6.9, la fluidité de la clôture

**Statut** : cadré le 2026-10-21.
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

Demandé le 2026-10-21 : publier la 0.6.9, la fluidité de la clôture (PR #190,
dont `docs/projects/journal.md` rend compte). La version du paquet est encore
0.6.8, déjà taguée, et la section « Unreleased » du changelog est vide : la
0.6.9 n'y a pas inscrit ses lignes.

## Critères d'acceptation

- La version 0.6.9 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog, remplie des changements de
  la 0.6.9, devient « 0.6.9 » datée avec une « Unreleased » vide au-dessus —
  `QUA-040`
- Les README pointent vers la dernière version validée, sans numéro figé
  à mettre à jour — `QUA-055`
- Un projet équipé en 0.6.8 passe à la 0.6.9 sans rien perdre — `QUA-027`
- `create-release.mjs --candidate --dry-run` annonce la candidate
  v0.6.9-rc.1 et sa fiche de recette — `QUA-051`

## 2. Hors périmètre

- La publication npm.
- Tout changement de code : une anomalie trouvée pendant l'essai est
  corrigée dans son propre chantier, la release attend.

## 3. Contraintes

- Le tag vient de la version du paquet (recette
  `docs/recipes/create-a-release.md`) : version changée dans cette PR,
  candidate posée après sa fusion.
- Le changelog de la 0.6.9 se rédige d'après l'entrée du journal du
  2026-10-21 (clôture guidée, message du critère humain, commande de note),
  en anglais (`docLang`).
- Candidate et promotion sont des actions extérieures : chacune attend le
  oui du demandeur après un `--dry-run` qui annonce la bonne version.
- Le verdict (`.githooks/release-verdict.mjs`) est un geste humain dans
  un terminal : jamais lancé par l'agent.

## 4. Décisions

- 2026-10-21 (demandeur) : packager la 0.6.9 avant de démarrer le chantier
  suivant (la clôture qui vérifie la cohérence de la documentation).
- 2026-10-21 (agent, comme pour la 0.6.8) : candidate, verdict et
  promotion ne se font qu'après la fusion de la PR : lots 2 et 3, consignés
  au journal.
- 2026-10-21 (agent, comme pour la 0.6.8) : en plus du test de QUA-027,
  un essai réel — projet temporaire équipé avec le tarball 0.6.8 de la
  release GitHub, mis à jour avec le tarball 0.6.9, puis `drwil verify` ;
  résultat consigné au journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version patch --no-git-tag-version` (paquet,
  racine, verrou) ; changelog ; essai réel de mise à jour 0.6.8 → 0.6.9 ;
  PR fusionnée.
- **Lot 2 — candidate** (après fusion) : `--candidate --dry-run`, puis
  `--candidate` ; fiche de recette lue avec l'humain.
- **Lot 3 — verdict et promotion** : verdict par l'humain ; puis
  `promote-release.mjs --dry-run` et promotion ; tarball téléchargeable
  vérifié.

## 6. Reprise

- **Dernier état** (2026-10-21) : cadré ; rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
