# Projet : release 0.6.5, première recette réelle

**Statut** : cadré le 2026-10-19.
**Risque** : MEDIUM
**Maturité** : prêt
**Intention** : `docs/intentions/recette-eprouvee-en-reel.md`

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

Demandé le 2026-10-19 : publier la 0.6.5 (date gardée et feu vert,
clôture allégée, ordre de la file, détour, recette par version ; PR 157 à
160 et 162). `node .githooks/create-release.mjs --dry-run` refuse tant que
la version reste 0.6.4, déjà taguée (vérifié le 2026-10-19). C'est aussi le
premier essai réel du parcours de recette livré par la 0.6.5 : version
candidate, verdict humain, promotion.

## Critères d'acceptation

- La version 0.6.5 est la même partout (paquet, `package.json` racine,
  verrou), la section « Unreleased » du changelog devient « 0.6.5 » datée
  avec une « Unreleased » vide au-dessus — `QUA-040`
- Les README pointent vers la dernière version validée, sans numéro figé
  à mettre à jour — `QUA-055`
- Un projet équipé en 0.6.4 passe à la 0.6.5 sans rien perdre — `QUA-027`
- La candidate `v0.6.5-rc.1` est publiée en pré-release avec sa fiche de
  recette, le verdict est donné par l'humain, et seule une candidate
  approuvée est promue en 0.6.5 avec le même tarball [humain] — `QUA-054`

## 2. Hors périmètre

- La publication npm.
- Tout changement de code : une anomalie trouvée pendant l'essai est
  corrigée dans son propre chantier (0.6.6), la release attend.

## 3. Contraintes

- Le tag vient de la version du paquet (recette
  `docs/recipes/create-a-release.md`) : version changée dans cette PR,
  candidate posée après sa fusion.
- Candidate et promotion sont des actions extérieures : feu vert de
  publication donné par le demandeur le 2026-10-19 (« oui publions »),
  pour la 0.6.5 seulement, après un `--dry-run` qui annonce v0.6.5.
- Le verdict (`.githooks/release-verdict.mjs`) est un geste humain dans
  un terminal : jamais lancé par l'agent.
- README et changelog en anglais (`docLang`).

## 4. Décisions

- 2026-10-19 (demandeur) : publier la 0.6.5 par le parcours de recette,
  premier essai réel (intention d'origine).
- 2026-10-19 (agent, comme pour la 0.6.4) : en plus du test de QUA-027
  (mise à jour sûre d'une version à la suivante), un essai réel — projet
  temporaire équipé avec le tarball 0.6.4 de la release GitHub, mis à jour
  avec le tarball 0.6.5, puis `drwil verify` ; résultat consigné au
  journal.

## 5. Lots

- **Lot 1 — préparer** : `npm version patch --no-git-tag-version` (paquet,
  racine, verrou) ; changelog ; essai réel de mise à jour 0.6.4 → 0.6.5 ;
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
