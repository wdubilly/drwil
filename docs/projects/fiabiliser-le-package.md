# Projet : fiabiliser le package npm (version d'installation, mises à jour)

**Statut** : cadré le 2026-10-14 — à lancer après « preuves de bout en bout ».
**Risque** : MEDIUM

<!-- scope
files:
  - packages/drwil/src/manifest.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/package.json
-->

(cadrage provisoire : à confirmer au démarrage.)

## 1. Besoin

Phase 3 de la feuille de route du demandeur (2026-10-14) : une installation
reproductible, compréhensible, facile à maintenir. Relevé le 2026-10-14 :
l'audit du package et le test du vrai package sont déjà faits (contrôle « CLI
installée depuis le tarball », release 0.5.1) ; `init` et `apply` préservent
déjà les réglages et les fichiers modifiés. Reste à faire : conserver la
version du moteur installé et prouver la mise à jour entre deux versions.

## 2. Hors périmètre

- La publication automatisée et la porte avant `npm publish` : ligne
  « Publication npm » de la vague 7 de `docs/projects/pending.md`.
- La minification : pas de besoin établi, les hooks restent auditables.

## 3. Contraintes

- `.drwil/install.json` (si présent) s'ajoute à `.drwil/installed-files.json` (si présent) sans le
  casser ni changer son format.
- Un changement de format passe avant la publication, tant qu'il ne coûte
  aucune migration (`docs/projects/pending.md`, ordre de réalisation).

## 4. Décisions

- **2026-10-14 — Minification** : non, sauf besoin concret établi (demandeur).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — `.drwil/install.json` (si présent)** [IA] : version du moteur installé et
  métadonnées utiles, écrite par `init` et `apply`, lue par `doctor`.
  Critère de sortie : test vert, le manifeste existant inchangé.
- **Lot 2 — tests de mise à jour** [IA] : installer une version, passer à la
  suivante, vérifier que les fichiers modifiés par le client sont préservés.
  Critère de sortie : test vert sur dépôt temporaire.

## 7. Reprise

- **Dernier état** (2026-10-14) : cadré, aucun lot commencé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 1.
