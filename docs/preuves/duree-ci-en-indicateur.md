# Preuve de clôture — duree-ci-en-indicateur

**Clos le** : 2026-10-25
**Commit vérifié** : `aefd54e434` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| QUA-122 conserve son identifiant et devient une preuve historique : les mesures d'origine, leurs références de CI et leurs limites sont conservées dans un document dédié, seul fichier de son champ « Couvre » ; ajouter un contrôle dans .drwil/ia-first.json ou modifier le workflow ne demande plus de renouveler cette attestation historique [humain] | `QUA-122` | — | `sha256:42b72fdaf692f4d0` (1 fichier(s)) |
| Le journal consigne, pour le chantier et pour les chantiers futurs selon une procédure documentée, la référence du passage de CI, la durée du job checks et la catégorie « hooks modifiés » ou « hooks inchangés ». Une mesure absente ou inexploitable est dite non mesurée ; les durées et leurs variations ne bloquent ni verify ni la clôture [humain] | `QUA-122` | — | `sha256:42b72fdaf692f4d0` (1 fichier(s)) |
| Les preuves de clôture existantes qui citent QUA-122 restent lisibles et drwil verify --agent rend PASS après le renouvellement humain de l'attestation historique ; aucune ancienne preuve n'est supprimée ou réécrite pour masquer un échec [humain] | `QUA-122` | — | `sha256:42b72fdaf692f4d0` (1 fichier(s)) |
