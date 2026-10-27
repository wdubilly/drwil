# Preuve de clôture — hooks-agent-sous-le-plafond

**Clos le** : 2026-10-27
**Commit vérifié** : `958492e869` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le périmètre de QUA-001 couvre .claude/hooks/ (fichiers mjs, dépôt et gabarit) : un hook de plus de 200 lignes fait échouer taille-fichiers. | `QUA-001` | `taille-fichiers`, `tests-qua-001` | — |
| Les deux hooks cités plus haut (bash-guard et prompt-hook) sont découpés sous 200 lignes, sans plafond hérité, et se comportent à l'identique (leurs tests actuels passent sans changement). | `QUA-001` | `taille-fichiers`, `tests-qua-001` | — |
