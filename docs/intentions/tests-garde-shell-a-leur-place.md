# Intention : les tests de la garde shell à côté de leur hook

**Statut** : proposée le 2026-10-24 — limite du chantier « les
contournements restants fermés ou assumés » (journal du 2026-10-24).

## Besoin

Les tests de QUA-114 (la garde shell de Claude Code refuse le saut des hooks
et l'écriture de `core.hooksPath`) sont dans
`packages/drwil/test/kit.test.mjs`, et non dans un fichier de test à côté
de la garde, dans .claude/hooks/, comme prévu au cadrage : un test placé
dans `.claude/hooks/` y serait pris pour une copie du gabarit, et sa
déclaration dans `outils/miroirs.json` (écarts admis des copies installées)
sortait du cadrage. Ils restent plus loin de leur code qu'ailleurs dans le
dépôt.

## Existant (relevé le 2026-10-24)

- Le contrôle `tests-qua-114` filtre les tests par l'ID dans
  `packages/drwil/test/kit.test.mjs`.
- Les autres hooks du dépôt ont leurs tests à côté
  (`.githooks/*.test.mjs`).

## Questions à trancher

- [décision] Déplacer les tests dans un fichier à créer à côté de la
  garde, dans .claude/hooks/, et déclarer le fichier dans
  `outils/miroirs.json`, ou les laisser dans
  les tests du kit ?
