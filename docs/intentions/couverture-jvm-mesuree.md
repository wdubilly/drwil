# Intention : mesurer la couverture actuelle d'un projet JVM

**Statut** : proposée le 2026-10-22 — limite du chantier « garanties
obligatoires à l'adoption ».

## Besoin

Sur un projet existant en dette de tests, `drwil guarantees` mesure la
couverture actuelle de chaque couche et la pose comme seuil (cliquet, jamais
en baisse ; QUA-093). Pour la JVM (Maven, Gradle), ni la mesure ni la remontée
automatique du cliquet ne sont faites : les seuils vivent dans la règle
JaCoCo du fichier de build, que drwil ne lit ni n'écrit.

## Existant (relevé le 2026-10-22)

- `packages/drwil/src/guarantees-table.ts` : lignes « Java/Maven »
  (`jacoco:check`) et « JVM/Gradle » (`jacocoTestCoverageVerification`) ; les
  seuils sont portés par le fichier de build (note `metricsNote`).

## Questions à trancher

- [décision] Lire le rapport JaCoCo (XML ou CSV) pour mesurer le niveau actuel,
  puis écrire le seuil dans `pom.xml` / `build.gradle`, ou seulement le
  conseiller dans la fiche de montée ?
- [décision] Remonter le cliquet automatiquement après chaque mesure
  meilleure, comme pour les autres piles, ou à la main ?
