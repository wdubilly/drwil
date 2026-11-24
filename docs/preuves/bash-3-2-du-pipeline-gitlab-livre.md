# Preuve de clôture — bash-3-2-du-pipeline-gitlab-livre

**Clos le** : 2026-11-24
**Commit vérifié** : `5d9a922f16` — verdict `drwil verify` : PASS
**Critères acceptés** : empreinte `sha256:17050080756f4d43`, acceptés par l'humain au lancement le 2026-11-24

critères de ce chantier, et ce qui les prouve aujourd'hui encore (rejoués par `drwil verify` après la clôture) :

| Critère | Contrat | Contrôle | Empreinte des fichiers couverts |
|---|---|---|---|
| Le script plan du pipeline GitLab livré s'exécute sous bash 3.2 : aucune construction case dont les motifs sont non parenthésés dans une substitution $( ) | `QUA-296` | `tests-qua-296` | — |
| Les trois tests de packages/drwil/test/ci-parite.test.mjs (QUA-296, QUA-288, QUA-321) passent sous macOS | `QUA-296` | `tests-qua-296` | — |
| Le comportement du pipeline ne change pas : mêmes branches retenues, même arbre prouvé, même sortie sous bash 5 (les tests de parité existants passent sous Linux sans modification de leurs attentes) | `QUA-296` | `tests-qua-296` | — |
| Le workflow .github/workflows/ia-first.yml lancé sur master est vert sous les trois systèmes exigés avant la release | `QUA-296` | `tests-qua-296` | — |
