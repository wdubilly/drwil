# Preuve de clôture — controles-lents-verify-ci

**Clos le** : 2026-11-02
**Commit vérifié** : `c703a7baeb` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:50541c21f3f97066`, acceptés par l'humain au lancement le 2026-11-02

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un contrôle réservé par runAt n'est pas joué au commit et le dit — contrat | `QUA-208` | `tests-qua-208` | — |
| verify et la CI jouent le contrôle réservé ; un réglage mal formé est refusé — contrat | `QUA-209` | `tests-qua-209` | — |
| Un contrôle sans runAt se comporte comme avant — contrat | `QUA-210` | `tests-qua-210` | — |
| L'empreinte propre et l'attestation restent justes pour un contrôle réservé — contrat | `QUA-211` | `tests-qua-211` | — |
