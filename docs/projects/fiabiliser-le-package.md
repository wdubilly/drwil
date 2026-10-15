# Projet : fiabiliser le package npm (version d'installation, mises à jour)

**Statut** : cadré le 2026-10-14 — lancé le 2026-10-15.
**Risque** : MEDIUM
**Maturité** : en cours

<!-- scope
files:
  - packages/drwil/src/manifest.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/doctor.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/package.json
  - docs/contracts.md
-->

(cadrage confirmé au démarrage, le 2026-10-15 : la CLI n'a pas de commande
`apply`, `init` installe et met à jour en une seule commande.)

## 1. Besoin

Phase 3 de la feuille de route du demandeur (2026-10-14) : une installation
reproductible, compréhensible, facile à maintenir. Relevé le 2026-10-14 :
l'audit du package et le test du vrai package sont déjà faits (contrôle « CLI
installée depuis le tarball », release 0.5.1) ; `init` et `apply` préservent
déjà les réglages et les fichiers modifiés. Reste à faire : conserver la
version du moteur installé et prouver la mise à jour entre deux versions.

## Critères d'acceptation

Validés par le demandeur le 2026-10-15 (sondage). Contrats à créer par ce
chantier : l'ID est posé avec le contrat, `check-docs` refusant de citer un
contrat absent du registre.

- `init` (installation ou mise à jour) enregistre la version du moteur dans
  `.drwil/install.json` (si présent) sans changer le manifeste ; `uninstall`
  le retire — `QUA-025`
- `doctor` affiche la version installée et signale un écart avec la CLI —
  `QUA-026`
- Passer d'une version à la suivante préserve les fichiers modifiés par le
  client et retire les fichiers obsolètes non modifiés — contrat à créer
  (lot 2)

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
- **2026-10-15 — Contenu de `.drwil/install.json` (si présent)** (sondage) : versions
  seules, sans horodatage, pour que le fichier ne change qu'avec la version :
  `format` (1), `version` (moteur installé), `firstVersion` (première
  version installée, conservée aux mises à jour).
- **2026-10-15 — `doctor`** (sondage) : point « version » comparé à la CLI ;
  ok si égales, avertissement si la CLI est plus récente (mettre à jour par
  `npx drwil init`), plus ancienne, ou si le fichier manque (installation
  antérieure).
- **2026-10-15 — Test de mise à jour** (sondage) : version antérieure
  simulée, hors réseau (installation vieillie à la main), pas de
  téléchargement d'une version publiée.

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — `.drwil/install.json` (si présent)** [IA] : écrit par `init`, retiré par
  `uninstall`, lu par `doctor` (point « version »). Critère de sortie :
  test vert, le manifeste existant inchangé ; contrats des deux premiers
  critères créés.
- **Lot 2 — tests de mise à jour** [IA] : installer, vieillir l'installation
  (version antérieure, fichier de mécanique modifié par le client, fichier
  obsolète), relancer `init`. Critère de sortie : test vert sur dépôt
  temporaire ; contrat du troisième critère créé.

## 7. Reprise

- **Dernier état** (2026-10-15) : lancé, décisions du démarrage inscrites.
  Lot 1 fait : `.drwil/install.json` (si présent) écrit par `init`, retiré par
  `uninstall`, lu par `doctor` ; contrats QUA-025 et QUA-026.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] lot 2 (test de mise à jour).
