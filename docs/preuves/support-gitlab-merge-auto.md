# Preuve de clôture — support-gitlab-merge-auto

**Clos le** : 2026-11-12
**Commit vérifié** : `14f712a861` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:af45a4ec14e3b1bf`, acceptés par l'humain au lancement le 2026-11-12

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Sur un remote GitLab, avec drwil-merge = « Automatic merge » et une MR ouverte à CI verte, la fusion est programmée, merge_when_pipeline_succeeds relu à vrai, code 0 ; le comportement GitHub est inchangé (tests existants sans modification) | `QUA-161` | `tests-qua-161` | — |
| Les garanties tiennent sur les deux forges : jamais de fusion programmée sur un état inconnu, en retard ou en conflit, MR fermée ou d'une autre branche refusée (code 1), forge ou outil injoignable en code 2, délai de 30 minutes, jamais « programmée » sans relecture sur la forge | `QUA-162` | `tests-qua-162` | — |
| Sans autorisation « Automatic merge » (ou hors PR de SCOPING autorisée), rien n'est programmé, sur les deux forges | `QUA-163` | `tests-qua-163` | — |
| Sur GitLab, le nettoyage des branches reconnaît la branche d'une MR fusionnée en squash | `QUA-058` | `tests-qua-058` | — |
| Sans l'outil de la forge joignable, seule la fusion classique est reconnue, et le message nomme l'outil de la forge (gh ou glab) | `QUA-059` | `tests-qua-059` | — |
