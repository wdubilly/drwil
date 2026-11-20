# Preuve de clôture — controles-contrats-groupes

**Clos le** : 2026-11-20
**Commit vérifié** : `01a6167270` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:9b01865b4f7272e9`, acceptés par l'humain au lancement le 2026-11-20

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Un contrôle de contrat déclaré par le mécanisme livré (node .githooks/contract-tests.mjs <ID> [fichiers…]) lance son lanceur de tests (Vitest, Jest ou node --test, détecté ou déclaré) **une seule fois par passe** pour tous les contrats qui le partagent ; son verdict ne vient que des tests dont le nom commence par son ID : un test cassé fait échouer ce seul contrat | `QUA-316` | `tests-qua-316` | — |
| Un contrat dont aucun test ne porte l'ID, ou un lancement qui n'a rien joué (erreur de chargement, processus mort), échoue, jamais un succès (QUA-013) ; hors passe (lancement à la main), le lanceur est rejoué | `QUA-317` | `tests-qua-317` | — |
| La recette d'adoption déclare désormais un contrôle de contrat par ce mécanisme ; un projet déjà adopté est guidé : drwil doctor signale, sans rien écrire, les contrôles vitest\|jest … -t "<ID>" qui relancent chacun le lanceur, et donne la forme groupée | `QUA-318` | `tests-qua-318` | — |
| Mesure : sur une copie de marinade-poulet (ou un projet de test de même forme, 27 contrats Vitest), le temps de run-checks avant et après est relevé dans le journal de clôture | `QUA-013` | `ci-coverage`, `tests-qua-013` | — |
| Lot 2 : sur un commit dont les contrôles viennent de passer, la seconde passe ne rejoue pas l'e2e ; la cause du rejeu est d'abord reproduite et dite (contrôle sans paths, ou passe qui ne reprend pas ses verdicts) ; cause : contrôle sans paths, corrigée par la recette et signalée par doctor | `QUA-141` | `tests-qua-141` | — |
| Lot 4 : sur une couche Node **à 100 %** (seuil déjà au maximum), la paire coverage-<couche> et coverage-diff-<couche> exactement telle que le kit la génère est aussi fusionnée en un seul run ; une paire modifiée à la main n'est jamais réécrite et drwil doctor la signale | `QUA-302` | `tests-qua-302` | — |
| Lot 5 : la CI GitLab livrée sauvegarde le cache des verdicts à chaque fusion sur la branche principale et le restaure sur une MR, comme la CI GitHub ; une MR dont le code des contrôles n'a pas changé reprend leurs verdicts. Éprouvé sur un vrai projet GitLab (marinade-poulet ou bac à sable) | `QUA-250` | `tests-qua-250` | — |
| Lot 5 : un pipeline GitLab de la branche principale dont l'arbre est celui qu'une MR verte a prouvé saute ses contrôles et sauvegarde quand même ses verdicts, comme le push GitHub | `QUA-296` | `tests-qua-296` | — |
| Lot 5 : la CI GitHub et la CI GitLab livrées sont iso : chaque optimisation de l'une a son équivalent dans l'autre, ou un écart déclaré avec sa raison ; un test compare les deux fichiers livrés étape par étape | `QUA-319` | `tests-qua-319` | — |
