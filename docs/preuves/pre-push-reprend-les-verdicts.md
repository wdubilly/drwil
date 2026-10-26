# Preuve de clôture — pre-push-reprend-les-verdicts

**Clos le** : 2026-10-26
**Commit vérifié** : `04089cdd60` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le pre-push reprend le verdict « ok » d'un contrôle dont l'empreinte (fichiers de son paths et sa déclaration) est identique à celle d'un passage précédent, le dit dans sa sortie (« repris », « rejoué »), et rejoue tout contrôle dont l'empreinte diffère, sans paths, sans verdict « ok », en reuse: false, ou dont l'arbre de travail diffère du commit poussé | `QUA-152` | `tests-qua-152` | — |
| La CI ne reprend jamais un verdict : elle rejoue tout | `QUA-152` | `tests-qua-152` | — |
| Un contrôle repris a bien tourné : QUA-013 le dit [humain] | `QUA-013` | `ci-coverage`, `tests-qua-013` | — |
