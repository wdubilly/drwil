# Preuve de clôture — controles-lents-verify-ci

**Clos le** : 2026-11-01
**Commit vérifié** : `145edc1bf2` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:19c18afd802fbadb`, acceptés par l'humain au lancement le 2026-11-01

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un contrôle déclaré réservé (par exemple runAt: ["verify", "ci"]) n'est pas joué au commit et le dit : « non exécuté », jamais « passé » — contrat | `QUA-208` | `tests-qua-208` | — |
| drwil verify et la CI jouent ce contrôle, et son absence ou son échec bloque la clôture et la fusion, comme pour tout contrôle (QUA-013, un contrôle non exécuté n'est pas passé) — contrat | `QUA-209` | `tests-qua-209` | — |
| Un contrôle sans ce réglage se comporte exactement comme avant — contrat | `QUA-210` | `tests-qua-210` | — |
| La doc de paths (docs/ia-first/4-checks-in-git.md) décrit le réglage, et l'attestation (QUA-183, QUA-184) et la reprise par contrôle (QUA-141) restent justes pour un contrôle réservé — contrat | `QUA-211` | `tests-qua-211` | — |
