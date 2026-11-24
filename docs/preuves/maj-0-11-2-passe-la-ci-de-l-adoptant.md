# Preuve de clôture — maj-0-11-2-passe-la-ci-de-l-adoptant

**Clos le** : 2026-11-24
**Commit vérifié** : `7733f570e9` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:39d1d76bc6502b67`, acceptés par l'humain au lancement le 2026-11-24

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| La mise à jour ne resserre pas les paths d'un contrôle dans le commit qui installe le garde capable de l'admettre : tant que le garde du projet, avant la mise à jour, ne sait pas admettre cette réécriture, init laisse les paths à ["**"] et le dit dans son compte rendu (« reste à décider » : drwil doctor --fix les resserre) | `QUA-238` | `tests-qua-238` | — |
| Une fois le garde de la 0.11.2 dans la branche principale, la mise à jour suivante et drwil doctor --fix resserrent les paths comme avant, et le commit passe le garde de la branche principale | `QUA-238` | `tests-qua-238` | — |
| Un projet installé en 0.11.1 puis mis à jour avec le tarball de la branche passe node base-checks.mjs --base origin/main sur le commit de mise à jour (copie jetable de marinade-poulet) | `QUA-238` | `tests-qua-238` | — |
