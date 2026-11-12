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
-->

## 1. Besoin

Le demandeur veut un regard critique sur le code avant la clôture, sans alourdir le « full auto » : un skill de
relecture, éventuellement un test de qualité et fonctionnel.

## Critères d'acceptation

- Un skill `review-before-closing` relit le diff du chantier contre les critères de la fiche et rend une liste
  courte d'écarts (bug probable, critère non couvert, risque), sans rien modifier — `QUA-062`
- La relecture est consultative : elle ne bloque jamais la clôture ni la fusion ; ses constats se corrigent ou se
  notent en intention — `QUA-062`

## 2. Hors périmètre

- Un test fonctionnel automatique généré : les critères de la fiche, liés à des contrats rejoués, en tiennent lieu (QUA-049).
- Un blocage de la clôture sur la relecture.

## 3. Contraintes

- Décidé le 2026-11-12, le demandeur déléguant la décision : relecteur **consultatif**, un skill, lancé par l'agent
  avant la clôture, borné (diff du chantier seulement, 10 constats au plus). Le test fonctionnel vient des critères.
- En-tête du skill en YAML strict (QUA-062).
- Le skill ne lance pas de sous-agent (voir `docs/projects/fin-des-sous-agents-de-chantier.md`).

## 4. Décisions

- 2026-11-12 : consultatif, un skill, pas de test généré.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — skill et branchement** [IA] : le skill, sa mention dans le skill de lancement et la section 7 de la doc,
  contrat. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-12) : cadrage terminé, non commité.
- **Prochaine étape** : [humain] `/drwil-start`.
