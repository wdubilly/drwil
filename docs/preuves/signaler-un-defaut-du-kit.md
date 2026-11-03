# Preuve de clôture — signaler-un-defaut-du-kit

**Clos le** : 2026-11-03
**Commit vérifié** : `087cb41404` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:9ccee6085b393b9a`, acceptés par l'humain au lancement le 2026-11-03

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Une commande drwil imprime un rapport de défaut prêt à coller : version du kit, contrôle en échec et son message | `QUA-231` | `tests-qua-231` | — |
| Le rapport ne contient aucune donnée du projet (chemins absolus, noms de dépôt, contenu de fichiers, secrets) | `QUA-232` | `tests-qua-232` | — |
| La commande n'écrit jamais dans un autre dépôt et n'appelle aucune forge | `QUA-233` | `tests-qua-233` | — |
| Le texte du rapport est lisible et assez précis pour être reproduit — [humain] | `QUA-234` | `tests-qua-234` | `sha256:52db85b94f202b07` (3 fichier(s)) |
