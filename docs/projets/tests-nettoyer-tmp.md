# Projet : les tests des hooks nettoient leurs dossiers temporaires

**Statut** : réalisé le 2026-10-09 — en attente de relecture et de fusion.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/perimetre.test.mjs
  - .githooks/etat.test.mjs
  - .githooks/perimetre.test.mjs
-->

(cadrage : les deux tests des hooks qui créent des dossiers
`/tmp/drwil-etat-*` et `/tmp/drwil-perimetre-*` sans les supprimer, côté
gabarit et dans la copie du dépôt — confirmé le 2026-10-09.)

## 1. Besoin

Le 2026-10-09, pendant le chantier `docs/projets/gouvernance-attente-active.md`,
`/tmp` a manqué d'inodes : 40 061 dossiers `/tmp/drwil-*` laissés par les
exécutions successives des tests. Plus aucun test ne pouvait tourner. Les
dossiers ont été supprimés à la main ; la cause demeure : un passage complet
de `node .githooks/run-checks.mjs` en laisse encore environ 2 100.

Constaté : `packages/drwil/test/kit.test.mjs` nettoie déjà ses dossiers après
chaque test (et les garde seulement en cas d'échec, pour diagnostic). En
revanche, `.githooks/etat.test.mjs` et `.githooks/perimetre.test.mjs` créent leurs dépôts avec
`mkdtempSync` sans jamais les supprimer. Ces tests tournent aussi dans
chaque projet généré par les tests du kit, d'où le volume.

## 2. Hors périmètre

- Changer la façon dont `packages/drwil/test/kit.test.mjs` garde ses dossiers en cas d'échec.
- Nettoyer `/tmp` hors des dossiers créés par les tests drwil.

## 3. Contraintes

- Garder un dossier en cas d'échec pour diagnostic, comme les tests du kit.
- Mêmes copies dans le gabarit et dans `.githooks/` (QUA-018, périmètre
  dépôt / gabarit).

## 4. Décisions

- **2026-10-09 — `afterEach` dans chaque fichier (point 5)** : on reprend
  dans les deux fichiers le mécanisme des tests du kit (liste des dossiers
  du test, suppression après un test réussi, dossiers gardés et affichés
  en cas d'échec, suppression qui réessaie et signale sans faire échouer).
  Pas de module partagé : aucun fichier de plus livré dans le gabarit.
- **2026-10-09 — Branche empilée** : `chantier/tests-nettoyer-tmp` part de
  `chantier/gouvernance-attente-active` (PR #1, non fusionnée), où vivent
  cette fiche et la version actuelle des deux tests ; à rebaser sur
  `master` après la fusion.

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit : les
  tests touchés existent des deux côtés.
- **QUA-004** — Seuil de couverture de test : les tests doivent rester verts
  et la couverture inchangée.

## 5. Points à trancher

- ~~Nettoyage par `afterEach()` ou fonction partagée~~ — tranché le
  2026-10-09 (voir « Décisions »).

## 6. Lots

- **Lot 1 — nettoyage des dossiers de test** [IA] : chaque dépôt temporaire
  créé par les tests des hooks est supprimé après le test (gardé seulement
  si le test échoue). Critère de sortie : `node .githooks/run-checks.mjs`
  vert et aucun dossier `/tmp/drwil-etat-*` ni `/tmp/drwil-perimetre-*`
  restant après un passage réussi.

## 7. Reprise

- **Dernier état** (2026-10-09) : Lot 1 réalisé. `afterEach` dans
  `.githooks/etat.test.mjs` et `.githooks/perimetre.test.mjs` (et leurs
  copies du gabarit), sur le modèle des tests du kit. Mesuré : un passage
  complet de `node .githooks/run-checks.mjs` laisse 0 dossier dans `/tmp`
  (environ 2 100 avant). Non testé : la conservation des dossiers d'un
  test en échec (même code que les tests du kit).
- **Travail non commité** : aucun après le commit du Lot 1.
- **Prochaine étape** : [IA] `PREUVES → VERIFY`, puis [humain] clôture ;
  rebaser la branche sur `master` après la fusion de la PR gouvernance.
