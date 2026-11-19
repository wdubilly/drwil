# Preuve de clôture — gestes-humains-depuis-le-chat

**Clos le** : 2026-11-19
**Commit vérifié** : `100e595cce` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:49b5e8d1ff7d9b8f`, acceptés par l'humain au lancement le 2026-11-18

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| drwil attest-poll ID1 ID2 … prépare un seul sondage à choix multiple : une option par ID, avec ce qu'il désigne et l'essai déclaré ; chaque ID coché par l'humain est attesté séparément, avec sa propre empreinte de preuve ; un ID non coché n'est pas attesté ; un ID dont la preuve change pendant la question est refusé seul, cause dite | `QUA-235` | `tests-qua-235` | — |
| drwil attest ID1 ID2 … au terminal pose la même question ID par ID, en un passage ; un ID refusé n'empêche pas les autres | `QUA-235` | `tests-qua-235` | — |
| L'acceptation des critères se fait par un sondage drwil-accept préparé par l'outil et lu par le hook : seule la réponse de l'humain dans le retour de l'outil l'écrit ; l'agent n'a aucun chemin pour l'écrire lui-même (réponse en argument, stdin redirigé, fichier) | `QUA-175` | `tests-qua-175` | — |
| Le verdict de recette d'une candidate se donne par un sondage drwil-verdict lu par le hook, enregistré sur la candidate comme au terminal | `QUA-053` | `tests-qua-053` | — |
| Une transition réservée à l'humain et le oui au détour ou au correctif de réouverture se donnent par un sondage (drwil-move, drwil-detour) lu par le hook, sans terminal | `QUA-117` | `tests-qua-117` | — |
| Chaque sondage préparé refuse, cause dite, ce que refuse déjà celui de l'attestation : préparation absente ou expirée, option recommandée, champ inattendu, résumé modifié, réponse illisible ; le terminal reste possible pour chaque geste | `QUA-235` | `tests-qua-235` | — |
| Sous Copilot CLI, ces sondages et celui de l'attestation sont lus par le hook ; la cause de la lecture manquée est trouvée et corrigée, ou dite si elle tient à l'outil ; la matrice de compatibilité le dit avec sa date d'essai [humain] | `QUA-063` | `tests-qua-063` | `sha256:8943ac8635c0ad92` (1 fichier(s)) |
| Tests : un test par sondage (réponse humaine acceptée, chaque refus), attestation par lot (tout coché, rien coché, coché en partie, preuve changée pour un seul ID), forme de réponse Copilot CLI ; en échec contre le code actuel | `QUA-235` | `tests-qua-235` | — |
