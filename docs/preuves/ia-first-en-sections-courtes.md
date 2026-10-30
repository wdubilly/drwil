# Preuve de clôture — ia-first-en-sections-courtes

**Clos le** : 2026-10-30
**Commit vérifié** : `dd97870fe7` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:cd134e6a90fb6152`, acceptés par l'humain au lancement le 2026-10-30

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Aucun document lu à la demande du kit ne dépasse le nouveau plafond, et kitSizeLegacy est retiré — (modifié, voir « Contrats modifiés ») | `QUA-157` | `taille-kit`, `tests-qua-157` | — |
| Chaque section issue de la découpe se lit seule : un agent la charge sans lire les autres, et chaque renvoi existant vers docs/ia-first.md mène à la bonne section | `QUA-190` | `tests-qua-190` | — |
| docs/ia-first.md ne garde que son introduction et le sommaire ; le texte de chaque règle vit dans un seul fichier de section, jamais en double | `QUA-190` | `tests-qua-190` | — |
