# Preuve de clôture — reouverture-dite-et-eprouvee

**Clos le** : 2026-10-29
**Commit vérifié** : `0ea99c422d` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:f0463aae608a82e7`, acceptés par l'humain au lancement le 2026-10-29

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Quand la réouverture échoue après l'annulation de la fusion automatique, le refus dit que la fusion est annulée, qu'elle n'est pas reprogrammée par l'outil, et qu'il revient à l'humain de la reprogrammer ; le rappel d'état en CLOSING le redit tant que la fusion n'est pas reprogrammée | `QUA-181` | `tests-qua-181` | — |
| Le test du cycle complet d'une réouverture (QUA-118 : nouvelle clôture d'un chantier rouvert) se joue aussi sous Windows, avec un gh simulé lançable (gh.cmd et shell), au lieu d'être sauté | `QUA-182` | `tests-qua-182` | — |
