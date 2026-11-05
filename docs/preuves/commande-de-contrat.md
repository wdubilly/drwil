# Preuve de clôture — commande-de-contrat

**Clos le** : 2026-11-05
**Commit vérifié** : `c7f7c80da8` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:1e45d7d8e770cace`, acceptés par l'humain au lancement le 2026-11-05

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| drwil contracts adopt <ID> déplace le contrat du catalogue vers le registre, sans préfixe, et écrit la déclaration de son contrôle depuis le catalogue pour la pile | `QUA-240` | `tests-qua-240` | `sha256:fb399c4dae07d079` (2 fichier(s)) |
| drwil contracts add crée le squelette d'un contrat propre au projet, d'un ID jamais défini | `QUA-242` | `tests-qua-242` | `sha256:fb399c4dae07d079` (2 fichier(s)) |
| Un agent peut lancer l'ajout et l'adoption ; modifier ou retirer un contrat refuse sans le oui de l'humain | `QUA-050` | `tests-qua-050` | — |
| Pour l'adoption, un ID déjà défini, un contrat absent du catalogue ou un registre invalide est refusé, sans rien écrire | `QUA-241` | `tests-qua-241` | `sha256:fb399c4dae07d079` (2 fichier(s)) |
| Pour l'ajout, un ID déjà défini ou un registre invalide est refusé, sans rien écrire | `QUA-243` | `tests-qua-243` | `sha256:fb399c4dae07d079` (2 fichier(s)) |
