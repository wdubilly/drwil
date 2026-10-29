# Preuve de clôture — fin-de-cadrage-sondage

**Clos le** : 2026-10-29
**Commit vérifié** : `793ad2a5cc` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:6d98005ea2f9b870`, acceptés par l'humain au lancement le 2026-10-29

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un skill de cadrage pose, à la fin d'un cadrage poussé, un sondage à trois réponses : « Automatic merge », « Manual merge », « Continue scoping » ; jamais de réponse par défaut ni recommandée | `QUA-187` | `tests-qua-187` | — |
| La réponse « Automatic merge », lue par le hook, autorise .githooks/merge-auto.mjs pour la PR de cadrage en SCOPING (aujourd'hui refusé : auto_merge n'existe qu'après un lancement) ; sans cette réponse, .githooks/merge-auto.mjs refuse comme avant | `QUA-188` | `tests-qua-188` | — |
| La réponse « Continue scoping » laisse la PR ouverte et garde la même branche pour les cadrages suivants (une branche, une PR) ; « Manual merge » ne programme rien | `QUA-189` | `tests-qua-189` | — |
