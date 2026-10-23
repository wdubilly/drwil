# Preuve de clôture — banc-pret-essai

**Clos le** : 2026-10-23
**Commit vérifié** : `a087619d9c` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le test de la copie réaliste pousse avec l'environnement de l'agent, jamais celui du runner, et passe en CI comme en local | `QUA-108` | `tests-qua-108` | — |
| Le job de passage du banc installe gitleaks en version épinglée, archive vérifiée par sa somme, comme la CI principale ; prouvé par la lecture du workflow | `QUA-109` | `tests-qua-109` | — |
| La carte d'architecture cite les contrats du banc à jour | `QUA-040` | `architecture-map`, `tests-qua-040` | — |
