# Preuve de clôture — couverture-un-seul-run-de-tests

**Clos le** : 2026-11-14
**Commit vérifié** : `e5b8326fec` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:40eaf9d52cb1a982`, acceptés par l'humain au lancement le 2026-11-14

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Pour une couche Node en dette, drwil guarantees déclare un seul contrôle coverage-diff-<couche> qui joue npm test une seule fois sous c8, juge le seuil mesuré (cliquet) et passe le rapport cobertura à diff-cover ; le rapport est effacé avant le run, jamais un rapport périmé | `QUA-301` | `tests-qua-301` | — |
| Quand coverage-<couche> et coverage-diff-<couche> existent et sont exactement ceux que le kit génère, drwil guarantees les remplace par le contrôle unique ; un contrôle modifié à la main (par exemple --compare-branch) n'est jamais réécrit | `QUA-302` | `tests-qua-302` | — |
| drwil doctor signale, sans rien écrire, un projet qui joue encore les deux contrôles (de série ou modifiés à la main) et donne la commande unique à poser en conservant les options du demandeur ; un projet déjà fusionné n'est pas signalé | `QUA-303` | `tests-qua-303` | — |
| Le seuil, le cliquet jamais abaissé et les 100 % sur le diff restent jugés comme avant : un seuil non tenu, un diff non couvert ou un rapport absent font échouer le contrôle unique | `QUA-093` | `tests-qua-093` | — |
| Un projet en dette Python (coverage.py) et un projet à 100 % (un seul coverage-<couche>) sont inchangés | `QUA-087` | `tests-qua-087` | — |
| Une vérification complète de drwil_walk ne joue plus qu'un run de tests pour la couverture : gain d'au moins 30 s, mesuré avant et après dans run-checks.log (si présent), relevé à la main au journal de clôture | `QUA-013` | `ci-coverage`, `tests-qua-013` | — |
