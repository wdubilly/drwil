# Preuve de clôture — verify-rejoue-les-echecs

**Clos le** : 2026-10-28
**Commit vérifié** : `67eaef5200` — verdict `drwil verify` : PASS

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| drwil verify --failed rejoue les seuls contrats qui n'étaient pas PASS ou ATTESTED à la dernière preuve ; ce verdict partiel le dit, n'est jamais GOVERNANCE: PASS et ne vaut jamais preuve de clôture | `QUA-159` | `tests-qua-159` | — |
| Sans preuve précédente lisible, l'option le dit et ne rejoue rien | `QUA-159` | `tests-qua-159` | — |
| Un contrat seulement en attente d'attestation (MANUAL) n'est pas un contrôle en échec : le verdict partiel le dit et renvoie à drwil attest | `QUA-159` | `tests-qua-159` | — |
| Après un FAIL, le rappel de l'état en VERIFY propose --failed, puis la passe complète verify --evidence | `QUA-159` | `tests-qua-159` | — |
