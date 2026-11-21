# Preuve de clôture — controles-lents-decoupes-des-le-depart

**Clos le** : 2026-11-21
**Commit vérifié** : `b0d369aca0` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:d2225a9fe87dfdc2`, acceptés par l'humain au lancement le 2026-11-21

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Pour un outil e2e de la table du kit (Playwright, Vitest, Jest), drwil guarantees déclare lui-même le contrôle e2e dans .drwil/ia-first.json, avec shards: "auto" et la commande de tranche de l'outil lisant DRWIL_SHARD_INDEX et DRWIL_SHARD_TOTAL, et le setup de l'outil dans la commande | `QUA-320` | `tests-qua-320` | — |
| Avec shards: "auto", le plan des tranches (run-checks --shard-plan, déjà joué à chaque CI GitHub et GitLab) compte les tests e2e par l'outil et fixe N (règle D6) à chaque CI ; la tranche et l'agrégation lisent ce N du plan ; sous 2, une seule passe ; un comptage impossible fait échouer le plan, jamais un succès (QUA-013) ; les YAML de CI livrés ne changent pas | `QUA-321` | `tests-qua-321` | — |
| Un contrôle e2e déjà déclaré par le projet à la main n'est jamais réécrit par drwil guarantees ; un outil e2e hors de la table n'est jamais découpé de force : le contrôle reste en une seule passe et la fiche de garantie le dit | `QUA-322` | `tests-qua-322` | — |
| drwil doctor signale un contrôle e2e d'un outil de la table déclaré sans shards ou avec un N figé, et donne la déclaration "auto" ; drwil doctor --fix la pose sur le contrôle e2e non découpé d'un outil de la table, écrit à la main ou par le kit, en gardant ses autres champs ; la mise à jour du kit (npx drwil init) n'y écrit rien et son compte rendu invite à lancer npx drwil doctor --fix (D1 revue le 2026-11-20) | `QUA-323` | `tests-qua-323` | — |
| Un projet neuf et un projet adopté reçoivent la même déclaration (une seule table, une seule source) | `QUA-324` | `tests-qua-324` | — |
