# Projet : un dossier passé par `npm init -y` reste un projet neuf

**Statut** : cadré le 2026-10-17.
**Intention** : `docs/intentions/projet-neuf-apres-npm-init.md`
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/stack.ts
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
-->

(cadrage : la détection de pile et son test, le registre (QUA-038
évolue), le changelog.)

## 1. Besoin

Depuis la 0.6.1, un `package.json` qui ne déclare que drwil et aucun
script n'est pas une pile. Mais `npm init -y` écrit un script `test` par
défaut (`echo "Error: no test specified" && exit 1`) : un dossier vide
passé par `npm init -y` avant l'installation reste pris pour un projet
Node.js existant (pas de `git init` ni de branche, pas d'invitation à
cadrer, carte « Node.js, detected »). Réflexe courant d'un utilisateur
Node.

## Critères d'acceptation

- Un `package.json` dont la seule dépendance est drwil et le seul script
  le `test` par défaut de `npm init` (texte exact) est un projet neuf,
  comme sans script ; un autre script, ou un `test` réel, reste une pile
  Node.js détectée — `QUA-038`
- Le changelog (« Unreleased ») le dit — `QUA-040`

## Contrats modifiés

- `QUA-038` — ancien critère : un `package.json` sans autre dépendance
  que drwil **et sans script** n'est pas une pile — raison : le script
  `test` par défaut de `npm init` ne compte pas comme un script ; rien
  n'est retiré (validé le 2026-10-17 par le demandeur, sondage de
  cadrage).

## 2. Hors périmètre

- Juger sur la présence de code (écarté : plus large, plus risqué).
- Les autres générateurs (`yarn init`, `pnpm init`) : à voir s'ils sont
  constatés.

## 3. Contraintes

- Aucun changement pour un vrai projet Node.

## 4. Décisions

- 2026-10-17 (demandeur, sondage) : ignorer le script `test` par défaut
  de `npm init`, texte exact.

## 5. Lots

- **Lot 1** : test d'abord (dossier passé par `npm init -y`), détection,
  QUA-038, changelog ; PR.

## 6. Reprise

- **Dernier état** (2026-10-17) : cadré ; rien de commencé.
