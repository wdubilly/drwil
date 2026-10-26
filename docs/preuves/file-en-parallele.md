# Preuve de clôture — file-en-parallele

**Clos le** : 2026-10-26
**Commit vérifié** : `7eaad1ee99` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Au sondage, l'humain choisit de mener la file en parallèle ; chaque fiche choisie est lancée dans son propre worktree par le hook, jamais par l'agent ; au plus N chantiers sont actifs à la fois | `QUA-147` | `tests-qua-147` | — |
| Chaque chantier se mène dans un sous-agent dont le dossier de travail est son worktree ; la session principale ne garde que les comptes rendus | `QUA-148` | `tests-qua-148` | — |
| Un chantier qui demande un humain arrête le lancement des suivants, sans interrompre ceux qui tournent ; le bilan de file dit l'état de chacun | `QUA-149` | `tests-qua-149` | — |
