# Preuve de clôture — controles-rejoues-reduits

**Clos le** : 2026-11-11
**Commit vérifié** : `7e32aa3765` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:13e4b181f468cfd3`, acceptés par l'humain au lancement le 2026-11-11

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Les tests du moteur (checks-self-test) sont repris quand .githooks/**, outils/**, package.json, package-lock.json et .drwil/ia-first.json sont inchangés, et rejoués dès qu'un seul de ces fichiers change | `QUA-295` | `tests-qua-295` | — |
| Un contrôle dont les tests lisent des documents (tests-qua-039, tests-qua-047) n'est invalidé que par le changement d'un document qu'ils lisent (contrats, glossaire, kit), pas par une fiche d'intention ou de projet ; un test prouve qu'un « ok » repris n'est jamais servi après le changement d'un fichier lu | `QUA-292` | `tests-qua-292` | — |
| miroirs-gabarit ne rejoue que verifier-miroirs et son test, et n'est invalidé que par le gabarit, outils/miroirs.json et les copies installées ; un écart de miroir est toujours détecté | `QUA-293` | `tests-qua-293` | — |
| Chaque script cité par la commande d'un contrôle est sous les paths de ce contrôle ; un contrôle dont un script cité sort de ses paths est refusé par un test statique, sans traçage des lectures | `QUA-294` | `tests-qua-294` | — |
| Une passe de run-checks sans fichier modifié depuis la précédente ne rejoue aucun de ces quatre contrôles : mesure avant et après dans run-checks.log, relevée à la main dans le journal de clôture [humain] | `QUA-013` | `ci-coverage`, `tests-qua-013` | `sha256:b98e6b4f6557c5cf` (2 fichier(s)) |
