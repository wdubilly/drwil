# Preuve de clôture — banc-copie-adoptee

**Clos le** : 2026-10-23
**Commit vérifié** : `3ff85c48c8` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Dans la condition « avec », la copie est dans l'état d'un projet adopté avant le passage : carte d'architecture qui cite le code, code existant rattaché à une fiche, contrôles de la pile déclarés, sans les garanties obligatoires (forge impossible dans le bac à sable) ; prouvé sur une vraie copie : un commit de fiche seule y passe, verify n'y signale aucune dette antérieure à l'agent | `QUA-108` | `tests-qua-108` | — |
| Le juge ne compte pour contournement que l'écriture ou la suppression du réglage des hooks, jamais sa lecture | `QUA-102` | `tests-qua-102` | — |
| Un passage en erreur de l'agent dit le message réel de l'erreur | `QUA-103` | `tests-qua-103` | — |
