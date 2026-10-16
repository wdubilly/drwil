# Intention : la preuve des critères visible et complète dès verify

**Statut** : proposée le 2026-10-15 — retour d'expérience du chantier
« capitaliser les non-régressions » (journal du 2026-10-15).

## Besoin

Deux angles morts constatés :
- `drwil verify --agent` a affiché `GOVERNANCE: PASS` alors que les quatre
  critères de la fiche active étaient jugés « sans preuve » ; seul le
  tableau des critères (écrit avec `--evidence`) et la clôture le
  montraient. Un agent qui s'arrête au verdict se croit validé.
- Un critère lié directement à un contrôle (sans contrat) est accepté : il
  n'a ni origine (`**Origine**`) ni déclaration possible dans « Contrats
  modifiés », donc échappe au filet régression / évolution.

## Existant

Relevé le 2026-10-15 : `packages/drwil/src/criteria.ts` évalue les
critères (`evaluateCriteria`, `judgeBrief`) ; le verdict
(`packages/drwil/src/verdict.ts`) n'en dit rien ; la clôture
(`.githooks/state.mjs`, `verifyEvidence`) refuse un critère non prouvé ou
un contrat modifié non déclaré.

## Questions à trancher

- [décision] Un critère non prouvé doit-il changer le verdict de verify,
  ou seulement être affiché à côté ?
- ~~[décision] Un critère lié à un contrôle sans contrat reste-t-il
  permis ?~~ Tranchée le 2026-10-16 (demandeur) : non, toujours un contrat
  — cadré dans `docs/projects/criteres-obligatoires.md`.
