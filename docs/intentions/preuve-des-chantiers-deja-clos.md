# Intention : une preuve de clôture pour les chantiers déjà clos

**Statut** : proposée le 2026-10-21 — limite du chantier « des critères et des
preuves qui survivent à la clôture ».

## Besoin

Seuls les chantiers clos à partir du 2026-10-21 laissent une preuve dans
`docs/preuves/` : les chantiers clos avant n'ont que leur entrée de journal,
sans critère, sans contrat, sans commit vérifié ni empreinte des fichiers
couverts. L'histoire du dépôt reste donc partiellement muette sur ce qui a été
accepté et prouvé. Résultat attendu : décider si ce passé se rattrape, et avec
quelle honnêteté (une preuve écrite après coup n'a pas été vérifiée au moment
de la clôture).

## Existant (relevé le 2026-10-21)

- `docs/projects/journal.md` garde une entrée par chantier clos (décisions,
  limites, branche de clôture), mais pas les critères ni le commit vérifié.
- Les évidences d'exécution (`.drwil/evidence/verify-*.json`) sont ignorées par
  git : rien ne permet de reconstituer le verdict d'une clôture passée.
- `packages/drwil/src/closure.ts` rejoue les critères de toute preuve présente :
  une preuve rétroactive serait rejouée comme les autres, et pourrait échouer
  sur des contrôles qui n'existaient pas à l'époque.

## Questions à trancher

- Rattraper le passé, ou l'assumer (la preuve ne vaut que depuis la règle) ?
- Si on rattrape : d'où viennent les critères (fiche supprimée, journal,
  historique git) et comment une preuve reconstituée se distingue-t-elle d'une
  preuve vérifiée à la clôture ?
