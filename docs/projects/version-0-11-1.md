# Projet : version 0.11.1, montée de version et changelog

**Statut** : cadré le 2026-11-09.
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

La 0.11.1 doit sortir pour que les projets adoptants (drwil_walk en premier) reçoivent la montée de version
sûre et les contrôles lents en tranches (`shards`, reprise de verdict), livrés après la 0.11.0 et listés dans
« Unreleased ». `node .githooks/create-release.mjs --dry-run` refuse aujourd'hui : `v0.11.0` existe déjà, la
version des `package.json` n'a pas changé. La publication elle-même (tag et note GitHub) n'est pas dans ce
chantier : c'est un geste distinct, sur accord de l'humain, après la fusion.

## Critères d'acceptation

- `package.json`, `package-lock.json` et `packages/drwil/package.json` portent `0.11.1`.
- La section « Unreleased » de `packages/drwil/CHANGELOG.md` devient `0.11.1 (date)` et une section
  « Unreleased » vide la remplace.
- `README.md` et `docs/features.md` disent en une phrase ce que la 0.11.1 apporte, comme pour la 0.11.0.
- `node .githooks/create-release.mjs --dry-run` calcule `v0.11.1` sans refus, une fois la PR fusionnée.
- `GOVERNANCE: PASS`.

## 2. Hors périmètre

- Les 3 fiches prévues en 0.11.1 (retirer le hook commit-msg, tests de run-checks sans gitleaks, ordre du
  sondage chez l'adoptant) : reportées en 0.12.0.
- Toute modification de code.
- La publication npm (jamais par ce dépôt).

## 3. Contraintes

- Le changelog et le README sont en anglais (`docLang`).
- Le `package-lock.json` se met à jour par `npm version 0.11.1 --no-git-tag-version`, pas à la main.
- Les trois systèmes d'exploitation exigés (`release.requiredOs`) doivent avoir une CI verte sur le commit à
  publier : `gh workflow run ia-first.yml --ref master`, puis attendre (`docs/recipes/create-a-release.md`).
- Limite à dire dans la note : `shards` et la reprise de verdict n'ont jamais tourné sur un vrai runner.

## 4. Décisions

Tranchées par le demandeur le 2026-11-09 : la 0.11.1 sort incomplète, les 3 fiches restantes passent en
0.12.0 ; on suit la procédure (fiche, chantier, puis publication).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — montée de version** [IA] : versions, changelog, README, `docs/features.md`, index et journal.
  Critère de sortie : `GOVERNANCE: PASS`, PR fusionnée.
- **Lot 2 — publication** [humain] : CI trois OS sur master, `--dry-run`, accord, puis
  `node .githooks/create-release.mjs`.

## 7. Reprise

- **Dernier état** (2026-11-09) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1, dans une nouvelle session (`/drwil-start`).
