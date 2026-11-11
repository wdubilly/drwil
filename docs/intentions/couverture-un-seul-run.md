# Intention : un seul run de tests pour le seuil de couverture et la couverture du diff

**Statut** : proposée le 2026-11-11 — notée le 2026-11-11, cadrée et priorisée P1 (0.11.2), en suite de la note P0 « réduire le coût des contrôles rejoués ».

## Besoin

« Optimiser les tests au maximum » : sur une pile Node, `coverage-<couche>` et `coverage-diff-<couche>` rejouent chacun `npm test` en entier sous c8. Un seul run produisant le rapport cobertura devrait servir aux deux contrôles (seuil, puis `diff-cover`). Gain mesuré chez l'adoptant drwil_walk : environ 48 s par vérification complète.

## Existant

Relevé le 2026-11-11 :

- `packages/drwil/src/guarantees-tools.ts` (ligne c8) : `run` = `npx c8 --check-coverage … --all npm test` ; `diff.run` = `npx c8 --reporter=cobertura --report-dir=coverage npm test && diff-cover coverage/cobertura-coverage.xml --fail-under=100`. Deux runs de tests par couche en dette (le contrôle de diff n'est câblé que dans ce cas, `packages/drwil/src/guarantees-layers.ts`, fonction `existing`).
- Pile Python : pas de doublon sur le diff (`coverage xml` relit les données du run précédent).
- Chez drwil_walk (`.drwil/ia-first.json`, rapporté par l'adoptant, non relu ici) : c8 sur Vitest, et `coverage-diff-app` porte `--compare-branch=origin/master`, option absente de la table : réglage ajouté à la main.
- Non vérifié : comment le moteur ordonne ou parallélise les contrôles, et s'il peut faire dépendre un contrôle du résultat d'un autre (réutilisation de verdict, `paths`, `perControl`).

## Questions à trancher

Toutes tranchées le 2026-11-11 par le demandeur :

- **Partage** : un seul contrôle enchaîne le seuil puis `diff-cover` (un run de tests, un rapport). Le contrat QUA-093 nomme `coverage-diff-<couche>` : son texte est à revoir au chantier.
- **Fraîcheur** : le rapport est produit dans le même contrôle et effacé avant le run, jamais de rapport périmé (QUA-019).
- **Parallélisme** : sans objet avec un seul contrôle.
- **Adoptants existants** (précisé le 2026-11-11 : `guarantees` conserve tout contrôle déjà déclaré, la simple régénération ne suffisait pas) : `guarantees` fusionne les deux contrôles quand ils sont ceux que le kit génère, jamais un contrôle modifié à la main (`--compare-branch`), que `drwil doctor` signale.
- **ID du contrôle unique** : `coverage-diff-<couche>`.
- **Critère de réussite** : un seul passage des tests ; gain d'au moins 30 s chez drwil_walk, relevé à la main dans `run-checks.log` (non automatisable).
