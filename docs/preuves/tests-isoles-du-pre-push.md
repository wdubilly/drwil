# Preuve de clôture — tests-isoles-du-pre-push

**Clos le** : 2026-11-02
**Commit vérifié** : `ca28518d90` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:ae112c7f6aa4bdc1`, acceptés par l'humain au lancement le 2026-11-02

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Aucun test du dépôt ne dépend des variables DRWIL_PUSH_* du processus qui le lance : le jeu complet passe aussi lancé avec elles posées — contrat | `QUA-212` | `tests-qua-212` | — |
| Un test qui lit ces variables les pose lui-même, par l'env de son lancement, jamais par l'héritage — contrat | `QUA-212` | `tests-qua-212` | — |
