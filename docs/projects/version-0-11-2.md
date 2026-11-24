# Projet : version 0.11.2, montée de version, changelog et mise à jour de marinade-poulet

**Statut** : cadré le 2026-11-24.
**Risque** : LOW
**Maturité** : prêt

<!-- scope
files:
  - package.json
  - package-lock.json
  - packages/drwil/package.json
  - packages/drwil/CHANGELOG.md
  - README.md
  - docs/features.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Demandeur, 2026-11-24 : « je veux que marinade bénéficie de tout ce qui a été fait depuis la 0.11.1 ». La `v0.11.1`
date du 2026-11-10 ; depuis, `master` a reçu une trentaine de chantiers fusionnés (les quatre prévus pour la 0.11.2 :
gestes humains depuis le chat, cadrage en BUILD, contrôles de contrats groupés, tranches dès le départ ; puis, hors
plan, l'installation dans un dépôt existant et l'accélération des contrôles), tous listés dans la section « Unreleased »
de `packages/drwil/CHANGELOG.md`. Les projets adoptants (marinade-poulet en premier) ne les reçoivent que par une
release : leur dépendance pointe sur l'archive de la release `v0.11.1`. `node .githooks/create-release.mjs --dry-run`
refuse aujourd'hui : `v0.11.1` existe déjà, la version des `package.json` n'a pas changé.

## Critères d'acceptation

- `package.json`, `package-lock.json` et `packages/drwil/package.json` portent `0.11.2`.
- La section « Unreleased » de `packages/drwil/CHANGELOG.md` devient `0.11.2 (date)` et une section « Unreleased » vide
  la remplace.
- `README.md` et `docs/features.md` disent en une phrase ce que la 0.11.2 apporte, comme pour la 0.11.1.
- `node .githooks/create-release.mjs --dry-run` calcule `v0.11.2` sans refus, une fois la PR fusionnée.
- `GOVERNANCE: PASS`.

## 2. Hors périmètre

- Toute modification de code.
- La publication npm (jamais par ce dépôt).
- La mise à jour de `drwil_walk` : le demandeur n'a demandé que marinade-poulet.
- Les fiches étiquetées 0.11.3 : elles restent en 0.11.3.

## 3. Contraintes

- Le changelog et le README sont en anglais (`docLang`).
- Le `package-lock.json` se met à jour par `npm version 0.11.2 --no-git-tag-version`, pas à la main.
- La section « Unreleased » est déjà alimentée par chaque chantier ; le lot 1 vérifie qu'aucun chantier fusionné depuis
  la `v0.11.1` n'a oublié sa ligne, il ne réécrit pas ce qui y est.
- Les trois systèmes d'exploitation exigés (`release.requiredOs`) doivent avoir une CI verte sur le commit à publier :
  `gh workflow run ia-first.yml --ref master`, puis attendre (`docs/recipes/create-a-release.md`).
- Limites à dire dans la note de release : le gain de `parallel` n'est pas démontré chez marinade-poulet (442 s avec
  2 échecs, puis 639 s avec 1 échec, contre 574 s en série) ; chez le dépôt drwil lui-même l'accélération est faible
  (journal du chantier `acceleration-des-controles`) ; une commande `stdin` de plus de 128 Ko fait planter le formateur
  avec une trace brute, le commit étant refusé quand même.
- La première mise à jour d'un adoptant vers la 0.11.2 rejoue tous ses contrôles une fois (nouveau calcul de
  l'empreinte) : le compte rendu de `npx drwil init` le dit.
- Mettre à jour marinade-poulet ne pousse rien sans l'accord du demandeur, et jamais sur sa branche principale.

## 4. Décisions

Tranchées par le demandeur le 2026-11-24 : la version est `0.11.2` (et non `0.12.0`) ; la release embarque tout ce qui
est fusionné depuis la `v0.11.1`, y compris les deux chantiers hors plan ; marinade-poulet est mis à jour avec l'archive
réellement publiée, après la release.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — montée de version** [IA] : versions, changelog, README, `docs/features.md`, index et journal. Critère de
  sortie : `GOVERNANCE: PASS`, PR fusionnée.
- **Lot 2 — publication** [humain] : CI trois OS sur master, `--dry-run`, accord, puis
  `node .githooks/create-release.mjs`.
- **Lot 3 — mise à jour de marinade-poulet** [humain] : une fois la release publiée, `npx drwil init` sur une branche
  dédiée de marinade-poulet ; le commit de mise à jour passe, le compte rendu annonce la première passe complète ;
  rien n'est poussé sans l'accord du demandeur.

## 7. Reprise

- **Dernier état** (2026-11-24) : cadré, rien commencé. Les quatre chantiers prévus pour la 0.11.2 sont fusionnés
  (PR 456, 460, 462, 464), ainsi que `installation-dans-un-depot-existant` (PR 470) et `acceleration-des-controles`
  (PR 473).
- **Prochaine étape** : le lot 1, dans une nouvelle session (`/drwil-start`) ; puis les lots 2 et 3, gestes humains.
