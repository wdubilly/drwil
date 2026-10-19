# Intention : `verify` dit pourquoi un critère n'est « pas durable »

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Un critère d'acceptation relié à un contrat à attester (ligne **Manuel**) doit
porter le marqueur `[humain]`. Sans lui, `drwil verify` répond seulement
« not-durable » : l'agent (ou l'humain) doit lire `packages/drwil/src/criteria.ts`
pour comprendre qu'il manque un marqueur. Même message dans l'autre sens
(marqueur `[humain]` sur un contrat entièrement automatisé).

## Existant (vérifié le 2026-10-19)

- `packages/drwil/src/criteria.ts` compare `contract.manual !== null ||
  contract.checks.length === 0` au drapeau `human` du critère et rend
  `not-durable` dans les deux sens, sans dire lequel.
- Le gabarit de fiche et la recette décrivent le marqueur, mais l'erreur ne les cite pas.

## Questions à trancher

- [décision] Un message par sens (« ajouter `[humain]` » / « retirer `[humain]` »),
  ou un seul message qui nomme le contrat et son mode de preuve ?
- [décision] Le dire aussi à l'élargissement du cadrage (au commit de la fiche),
  avant que `verify` ne le découvre en fin de chantier ?
