# Preuve de clôture — attente-de-fusion-courte

**Clos le** : 2026-11-17
**Commit vérifié** : `dd7ea46b3b` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:45bc57c34d36c801`, acceptés par l'humain au lancement le 2026-11-17

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Fusion automatique programmée et CI verte : pr-watch attend la fusion au lieu de rendre « verte », dans le même délai global (30 minutes) ; sans fusion programmée, il rend « verte » comme aujourd'hui | `QUA-100` | `tests-qua-100` | — |
| La PR est tenue pour fusionnée dès que son commit de tête est contenu dans la branche principale distante (après git fetch), sans attendre l'état de la forge ; même méthode sur GitHub et GitLab ; le suivi de la CI de la branche principale (QUA-251) part de ce commit de fusion | `QUA-100` | `tests-qua-100` | — |
| Un commit de tête absent de la branche principale et une forge qui dit « fermée » restent « fermée sans fusion » (code 1) : jamais une fusion supposée | `QUA-100` | `tests-qua-100` | — |
| Les retouches de cadrage d'une même conversation vont d'office sur une seule branche et une seule PR ; sa fusion est programmée quand un lancement (/drwil-start) a besoin d'une fiche qu'elle porte, à la demande de l'humain, ou proposée en fin d'échange ; une retouche n'est jamais poussée sur une branche dont la fusion est déjà programmée | `QUA-314` | `tests-qua-314` | — |
| Tests : fusion programmée suivie jusqu'à la fusion ; forge en retard (état ouvert, commit déjà dans la branche principale) vue fusionnée ; GitLab ; PR fermée sans fusion ; délai dépassé | `QUA-100` | `tests-qua-100` | — |
