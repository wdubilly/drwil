# Recette : corriger un défaut

Objectif : qu'un défaut corrigé ne revienne jamais sans être vu. La preuve
de la correction devient un test de non-régression, rattaché au contrat
qu'il protège et rejoué à chaque commit, au push et en CI. Propre à ce
dépôt pour l'instant (décision du 2026-10-11, `docs/projets/journal.md`) ;
livrée aux projets équipés une fois éprouvée ici.

1. **Reproduire, puis établir la cause racine** (`AGENTS.md`, « Cause avant
   correctif »). Un défaut qu'on ne sait pas reproduire n'a pas encore de
   test : le dire, ne pas inventer.
2. **Écrire le test d'abord**, sur le code actuel :
   - le nom commence par l'ID du contrat protégé, s'il y en a un au
     registre (`docs/contrats.md`) : `test("QUA-016 : …")` ; sinon, un nom
     qui dit le comportement attendu, sans ID ;
   - il décrit le comportement attendu, pas la correction.
3. **Le voir échouer** pour la bonne raison (le défaut), et le noter :
   c'est la preuve que le test attrape le défaut. Un test qui passe avant
   la correction ne prouve rien.
4. **Corriger**, au plus près de la cause ; aucun autre changement dans le
   même commit.
5. **Le voir passer**, puis lancer tous les contrôles :
   `node .githooks/run-checks.mjs`.
6. **Rattacher** : si le test porte l'ID d'un contrat, son fichier figure
   dans le champ « Tests » de ce contrat (`docs/contrats.md`) ; le
   contrôle de cohérence le vérifie dans les deux sens.
7. **Le dire** dans le message de commit et la fiche : le défaut, la cause,
   le test qui le garde (« vu échouer avant la correction »).

Ce qui ne se fait pas : désactiver ou affaiblir un test pour faire passer
une correction (QUA-019, pas de contournement) ; stocker la preuve ailleurs
que dans le test exécutable (une seule source).
