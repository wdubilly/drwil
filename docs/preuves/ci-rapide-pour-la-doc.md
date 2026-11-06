# Preuve de clôture — ci-rapide-pour-la-doc

**Clos le** : 2026-11-06
**Commit vérifié** : `f5eaf3a2fa` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:eaa25dd300821a98`, acceptés par l'humain au lancement le 2026-11-06

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur une PR, la CI reprend le verdict de la dernière CI de la branche principale pour chaque contrôle dont l'empreinte (fichiers et commande) est identique ; elle rejoue les autres ; le push sur la branche principale rejoue tout et seul écrit ces verdicts | `QUA-250` | `tests-qua-250` | — |
| Sur une PR qui ne touche que la documentation, kit-tests (ubuntu-latest) saute les tests du paquet comme Windows et macOS, et le dit | `QUA-045` | `tests-qua-045` | — |
| La CI livrée aux projets (GitHub et GitLab, gabarit) restaure les verdicts de la dernière CI de leur branche principale sur une PR (ou merge request) et ne les sauvegarde que sur la branche principale ; un projet adoptant reprend donc ses contrôles inchangés comme ce dépôt | `QUA-250` | `tests-qua-250` | — |
| La protection de la branche principale n'exige plus qu'une PR soit à jour avec elle ; .github/ruleset-master.json le dit et la CI vérifie que la forge le tient | `QUA-252` | `tests-qua-252` | — |
| Une file de chantiers ne lance le suivant (node .githooks/state.mjs next) que sur la preuve, écrite par node .githooks/pr-watch.mjs après la fusion, que la CI de la branche principale est verte sur le commit de fusion et qu'aucune issue « CI broken on the main branch » n'est ouverte ; sinon next refuse et dit pourquoi (CI rouge, en cours ou non suivie, issue ouverte) ; un start humain n'est pas bloqué | `QUA-251` | `tests-qua-251` | — |
