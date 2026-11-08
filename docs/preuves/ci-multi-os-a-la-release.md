# Preuve de clôture — ci-multi-os-a-la-release

**Clos le** : 2026-11-08
**Commit vérifié** : `395884248c` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:745af078d25aa867`, acceptés par l'humain au lancement le 2026-11-07

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Une PR (code ou documentation) et un push sur une branche, master compris, ne lancent la suite du kit que sur ubuntu ; kit-tests (windows-latest) et kit-tests (macos-latest) restent rapportés sous leur nom exigé par le ruleset, étapes sautées et notice qui le dit — modifié | `QUA-045` | `tests-qua-045` | — |
| Le push d'un tag de release (vX.Y.Z, vX.Y.Z-rc.N) et un lancement manuel du workflow (workflow_dispatch) lancent la suite sur les trois OS — modifié | `QUA-045` | `tests-qua-045` | — |
| Avec le réglage des OS exigés renseigné dans .drwil/ia-first.json, .githooks/create-release.mjs (création directe ou candidate) et .githooks/promote-release.mjs refusent, sans rien créer, tant qu'un OS exigé n'a pas réellement lancé la suite avec succès sur le commit visé, et disent lequel et la commande pour lancer le workflow à la main ; --dry-run le signale sans refuser — contrat créé , prouvé par un test en dur | `QUA-268` | `tests-qua-268` | — |
| Un job dont les étapes de test ont été sautées ne compte jamais comme OS testé, ni pour la barrière ni dans la fiche de recette (« OS testés par la CI ») — même contrat | `QUA-268` | `tests-qua-268` | — |
| Réglage absent ou vide (défaut de l'adoptant) : comportement de la release inchangé ; une mise à jour du kit ne l'ajoute pas — même contrat ; renseigné dans ce dépôt avec les trois OS — même contrat | `QUA-268` | `tests-qua-268` | — |
| La recette docs/recipes/create-a-release.md et le README du module disent l'ordre : lancer le workflow sur le commit, attendre les trois OS verts, puis créer la release — même contrat | `QUA-268` | `tests-qua-268` | — |
