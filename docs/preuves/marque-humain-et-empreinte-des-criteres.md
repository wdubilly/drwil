# Preuve de clôture — marque-humain-et-empreinte-des-criteres

**Clos le** : 2026-11-17
**Commit vérifié** : `e5c6ae7fa0` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:e66ebcaef22b614e`, acceptés par l'humain au lancement le 2026-11-17

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| L'empreinte des critères ne dépend ni de la présence ni de la place d'une marque `[humain]` ou `[human]` : en tête du critère, entre le tiret et la preuve, après la preuve ou absente, l'empreinte est la même | `QUA-174` | `tests-qua-174` | — |
| Une marque citée entre accents graves reste du texte, et tout autre changement du texte d'un critère change toujours l'empreinte | `QUA-174` | `tests-qua-174` | — |
| Une empreinte enregistrée avant la livraison (ancien calcul) reste reconnue à la clôture : un chantier accepté avant la mise à jour se clôt sans nouvelle acceptation ; un critère réellement modifié est toujours refusé | `QUA-174` | `tests-qua-174` | — |
| Tests : les quatre places de la marque, en échec contre le code actuel pour la place entre le tiret et la preuve ; repli sur l'ancienne empreinte ; critère modifié refusé avec les deux calculs | `QUA-174` | `tests-qua-174` | — |
