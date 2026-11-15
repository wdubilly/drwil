# Preuve de clôture — cout-par-activite

**Clos le** : 2026-11-15
**Commit vérifié** : `0e268cbeaf` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:427f4866c7ac8743`, acceptés par l'humain au lancement le 2026-11-15

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| L'état de gouvernance garde l'horodatage de chaque transition du chantier en cours (activité, instant, réouverture marquée), du lancement jusqu'au retour en SCOPING ; un état antérieur sans cet historique reste valide | `QUA-305` | `tests-qua-305` | — |
| node .githooks/consumption.mjs répartit les requêtes du chantier par l'activité de l'état à leur instant : production = BUILD ; vérification = EVIDENCE et VERIFY ; gouvernance = SCOPING (branche de cadrage comprise), CLOSING et tout BUILD qui suit une réouverture ; une requête sans activité connue (historique absent, clone neuf) va dans une part « non attribuée », dite, jamais devinée | `QUA-306` | `tests-qua-306` | — |
| --record <fiche> écrit la répartition en nouveaux champs de la ligne de .drwil/usage.jsonl (tokens pondérés et requêtes par part), sans changer les champs existants ; le tableau de bord lit les lignes anciennes et nouvelles sans erreur | `QUA-307` | `tests-qua-307` | — |
| drwil serve montre, pour chaque chantier, la répartition production / vérification / gouvernance / non attribuée (agrégation packages/drwil/src/serve-journal.ts, page serve/page.html) ; une ligne ancienne, sans répartition, s'affiche sans erreur et dit qu'elle n'est pas répartie — test dans packages/drwil/test/serve.test.mjs, contrat à créer | `QUA-308` | `tests-qua-308` | — |
| Sous Copilot CLI, la même répartition est faite à partir des journaux lus par docs/projects/journal.md ; un champ d'horodatage absent de ces journaux donne la part « non attribuée », dite dans la recette | `QUA-309` | `tests-qua-309` | — |
| node .githooks/consumption.mjs dit combien de chantiers de .drwil/usage.jsonl sont répartis, sur les 10 attendus avant le bilan, et à partir de 10 donne la part moyenne de chaque activité ; aucun seuil, jamais un refus | `QUA-310` | `tests-qua-310` | — |
| La mesure reste non bloquante et ne lit que les champs de consommation, jamais un contenu de message | `QUA-042` | `tests-qua-042` | — |
