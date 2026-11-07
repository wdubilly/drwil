# Preuve de clôture — controle-lent-une-seule-fois-en-ci

**Clos le** : 2026-11-07
**Commit vérifié** : `edda43818b` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:61b59963c029452a`, acceptés par l'humain au lancement le 2026-11-07

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| runAt: ["ci"] est accepté (aujourd'hui verify et ci sont exigés ensemble). Une configuration sans CI déclarée (ciFiles vide) qui l'utilise est refusée, avec la raison — contrat QUA-208 modifié. | `QUA-208` | `tests-qua-208` | — |
| Un contrôle ["ci"] ne tourne ni au commit, ni au push, ni dans verify. Chaque sortie (run-checks, pre-commit, pre-push, verify) l'annonce « confié à la CI », jamais « passé » (QUA-013, un contrôle non exécuté n'est pas passé) — contrat QUA-208 modifié. | `QUA-208` | `tests-qua-208` | — |
| Avec au moins un contrôle confié à la CI et tout le reste vert, verify rend GOVERNANCE: PASS (CI pending) et nomme les contrôles en attente ; ce n'est jamais un PASS sans réserve | `QUA-260` | `tests-qua-260` | — |
| La clôture d'un chantier n'est acquise qu'une fois la CI de la PR (GitHub) ou de la MR (GitLab) verte sur ces contrôles : pr-watch la suit sur les deux forges ; rouge ou absente, le chantier reste en CLOSING et le dit — contrat à créer. | `QUA-262` | `tests-qua-262` | — |
| Une option de verify et de run-checks (nom à fixer au lot 1, par exemple --with-ci-checks) joue aussi en local les contrôles confiés à la CI, pour reproduire un échec ; la sortie dit que l'option est active | `QUA-261` | `tests-qua-261` | — |
| Livrable : les CI du gabarit, GitHub et GitLab, ne jouent plus deux fois les contrôles sur le push d'une branche qui a une PR ou une MR ouverte, et jouent bien les contrôles ["ci"] — contrat à créer. | `QUA-263` | `tests-qua-263` | — |
| Livrable : la recette et la compétence d'adoption proposent ["ci"] pour le contrôle e2e de l'adoptant, en renvoyant à la définition de l'e2e du catalogue sans la recopier (QUA-196). | `QUA-196` | `tests-qua-196` | — |
| Dépôt : les contrôles couverture-tests, couverture-hooks, couverture-claude, tarball et tout contrôle e2e passent à ["ci"] dans .drwil/ia-first.json ; les tests rapides des contrats restent en local. Temps de commit et de push mesurés avant et après, consignés au journal. | `QUA-208` | `tests-qua-208` | — |
| Le passage de la CI sur la branche principale après fusion reste inchangé : il rejoue tout, et la preuve d'une CI verte sur la dernière fusion (QUA-251) reste exigée avant le chantier suivant. | `QUA-251` | `tests-qua-251` | — |
| Chaque critère est prouvé par un test qui porte l'ID de son contrat (le critère sur la configuration du dépôt, par la configuration validée et la mesure au journal). | `QUA-034` | `tests-qua-034` | — |
