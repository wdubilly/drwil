# Projet : une relecture critique légère avant la clôture, sans frein au full auto

**Statut** : cadré le 2026-11-12.
**Risque** : MEDIUM
**Maturité** : prêt
**Intention** : `docs/intentions/retours-du-demandeur-0-11-2.md` (point 5)

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/skills/review-before-closing/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - docs/contracts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Le demandeur veut un regard critique sur le code avant la clôture, sans alourdir le « full auto » : un skill de
relecture, éventuellement un test de qualité et fonctionnel.

Complété le 2026-11-13 (proposition « module REVIEW » triée par le demandeur, seul ce qui a de la valeur est
gardé) : `verify` dit si le travail est conforme aux contrats, pas s'il est juste. La journée du 2026-11-12 l'a
montré : trois chantiers en `GOVERNANCE: PASS`, puis un audit qui trouve un test validant un défaut de `pr-watch`.
La relecture pose donc aussi les questions que `verify` ne pose pas : un test peut-il réussir alors que le
comportement est faux ? l'agent a-t-il réduit le périmètre ou interprété un critère trop largement ?

## Critères d'acceptation

- Un skill `review-before-closing` relit le diff du chantier contre les critères de la fiche et rend une liste
  courte d'écarts (bug probable, critère non couvert, risque), sans rien modifier — `QUA-062`
- La relecture est consultative : elle ne bloque jamais la clôture ni la fusion ; ses constats se corrigent ou se
  notent en intention — `QUA-062`
- La relecture pose aussi deux questions de preuve et de biais : un test du chantier peut-il réussir alors que le
  comportement attendu est faux ? un critère a-t-il été interprété trop largement, ou le périmètre réduit sans le
  dire ? — `QUA-062`
- Chaque constat a une sévérité (`BLOCKER`, `MAJOR`, `MINOR`, `OBSERVATION`) et cite un fichier ou une preuve réels ;
  sans élément concret, il est rendu comme une question, jamais comme un défaut établi ; les constats et leur suite
  (corrigé, noté en intention, écarté avec sa raison) sont résumés dans l'entrée du journal du chantier — `QUA-062`
- Un constat qui révèle une classe d'erreurs détectable de façon répétable devient une intention de contrat
  (`docs/intentions/`), jamais un contrat écrit d'office ; un défaut isolé ou une préférence ne le devient pas — `QUA-062`

## 2. Hors périmètre

- Un test fonctionnel automatique généré : les critères de la fiche, liés à des contrats rejoués, en tiennent lieu (QUA-049).
- Un blocage de la clôture sur la relecture.
- Un relecteur indépendant (autre modèle ou autre outil), une relecture obligatoire selon le risque, des statuts de
  relecture et des rapports immuables : notés dans `docs/intentions/fabrique-autonome.md` (rôles séparés), repris
  seulement si les constats notés au journal montrent des défauts que `verify` ne détecte pas.

## 3. Contraintes

- Décidé le 2026-11-12, le demandeur déléguant la décision : relecteur **consultatif**, un skill, lancé par l'agent
  avant la clôture, borné (diff du chantier seulement, 10 constats au plus). Le test fonctionnel vient des critères.
- En-tête du skill en YAML strict (QUA-062).
- Le skill ne lance pas de sous-agent (voir `docs/projects/fin-des-sous-agents-de-chantier.md`).

## 4. Décisions

- 2026-11-12 : consultatif, un skill, pas de test généré.
- 2026-11-13 : de la proposition « module REVIEW », gardés les questions de preuve et de biais, la sévérité des
  constats, leur trace au journal et la règle « classe d'erreurs → intention de contrat » ; le reste est en attente
  dans `docs/intentions/fabrique-autonome.md`. La relecture reste consultative.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — skill et branchement** [IA] : le skill, sa mention dans le skill de lancement et la section 7 de la doc,
  contrat. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.
