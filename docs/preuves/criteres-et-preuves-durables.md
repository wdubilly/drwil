# Preuve de clôture — criteres-et-preuves-durables

**Clos le** : 2026-10-21
**Commit vérifié** : `28006adce1` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| La clôture d'un chantier écrit un fichier de preuve versionné, un par chantier, cité par son entrée de journal : il garde chaque critère, son contrat, son contrôle, le commit vérifié et l'empreinte des fichiers couverts ; la clôture est refusée si ce fichier ne peut pas être écrit | `QUA-084` | `tests-qua-084` | — |
| Un critère dont la preuve a disparu (contrôle retiré, test supprimé, contrat abandonné) fait échouer un contrôle qui le nomme, avec le même code en local et en CI ; jamais un avertissement | `QUA-085` | `tests-qua-085` | — |
| En CI, les critères de la fiche du chantier sont jugés sans .drwil/state.json (si présent) : la fiche est lue depuis le trailer Drwil-Brief des commits de la branche ; après la clôture, ce sont les critères du fichier de preuve qui sont rejoués | `QUA-086` | `tests-qua-086` | — |
