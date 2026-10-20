# Intention : convoquer des personas d'agents choisis par le cadrage d'un chantier

**Statut** : proposée le 2026-10-19 — issue d'une discussion sur la complémentarité de drwil et du dépôt externe `msitarzewski/agency-agents` (personas d'agents spécialisés, licence MIT).

## Besoin

`agency-agents` offre une bibliothèque de personas (sécurité, QA, revue,
frontend…) qui apportent de la profondeur de métier ; drwil apporte le cadre
(état, périmètre, contrats, preuve). Les deux se complètent à condition que
le cadre prime. Idée : récupérer les seuls fichiers de personas (sans les
scripts d'installation) et en convoquer quelques-uns, choisis par le cadrage
d'une fiche, pendant BUILD, comme relecteurs ou sous-agents.

## Existant (vérifié le 2026-10-19)

- Aucun persona ni mention de ce dépôt dans le projet.
- Les personas sont longs et affirmés (« production-ready », autonomie) : coût
  en contexte, et risque de conflit avec `AGENTS.md` (langue française,
  « faire ce qui est demandé, pas plus », pas de contournement).
- Leur installation écrit hors gabarit (dossier d'agents de l'outil) : non
  couverte par le contrôle `miroirs-gabarit`.

## Idée proposée

- Les fichiers de personas retenus sont versionnés dans le dépôt, avec version,
  licence et attribution ; jamais le catalogue entier.
- La fiche déclare ceux à convoquer dans un champ dédié ; le cadrage choisit,
  pas l'agent.
- `AGENTS.md` et les contrats priment : un persona n'élargit pas le périmètre
  et ne contourne aucun contrôle.
- Un contrôle vérifie que chaque persona cité par une fiche existe.

## Questions à trancher

- [décision] Pour drwil-le-dépôt seulement, ou aussi pour le livrable (gabarit
  distribué : module optionnel, mise à jour, licence) ?
- [décision] Nom et forme du champ de la fiche ; un contrôle (nouveau contrat)
  sur l'existence des personas cités ?
- [décision] Quels personas retenir (revue, sécurité, QA…) et en version
  complète ou condensée (mission et critères de réussite seulement) ?
- [décision] Mécanisme de convocation selon l'outil (sous-agents sous Claude
  Code, agents personnalisés sous Copilot CLI) : à cadrer avec
  le journal du 2026-10-20 (0.6.8), sans le mêler au
  chantier de compatibilité des agents.
