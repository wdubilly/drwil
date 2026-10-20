# Projet : release 0.6.8, Copilot CLI enchaîne les chantiers

**Statut** : cadré le 2026-10-20.
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

Demandé le 2026-10-20 : publier la 0.6.8, Copilot CLI enchaîne les chantiers
(PR #185, dont `docs/projects/journal.md` rend compte). La version du paquet
est encore 0.6.7, déjà taguée.

## Critères d'acceptation

- La version 0.6.8 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog devient « 0.6.8 » datée
  avec une « Unreleased » vide au-dessus — `QUA-040`
- Les README pointent vers la dernière version validée, sans numéro figé
  à mettre à jour — `QUA-055`
- Un projet équipé en 0.6.7 passe à la 0.6.8 sans rien perdre — `QUA-027`
- `create-release.mjs --candidate --dry-run` annonce la candidate
  v0.6.8-rc.1 et sa fiche de recette — `QUA-051`

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

- 2026-10-20 (demandeur) : faire la release après la 0.6.8.
- 2026-10-20 (agent, comme pour la 0.6.7) : candidate, verdict et
  promotion ne se font qu'après la fusion de la PR : lots 2 et 3, consignés
  au journal.
- 2026-10-20 (agent, comme pour la 0.6.7) : en plus du test de QUA-027,
  un essai réel — projet temporaire équipé avec le tarball 0.6.7 de la
  release GitHub, mis à jour avec le tarball 0.6.8, puis `drwil verify` ;
  résultat consigné au journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version patch --no-git-tag-version` (paquet,
  racine, verrou) ; changelog ; essai réel de mise à jour 0.6.7 → 0.6.8 ;
  PR fusionnée.
- **Lot 2 — candidate** (après fusion) : `--candidate --dry-run`, puis
  `--candidate` ; fiche de recette lue avec l'humain.
- **Lot 3 — verdict et promotion** : verdict par l'humain ; puis
  `promote-release.mjs --dry-run` et promotion ; tarball téléchargeable
  vérifié.

## 6. Reprise

- **Dernier état** (2026-10-20) : cadré ; rien de commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
