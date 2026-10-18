# Intention : l'installation du dépôt ne réécrit plus la date de ia-first.md

**Statut** : proposée le 2026-10-15 — retour d'expérience du chantier
« capitaliser les non-régressions » (journal du 2026-10-15). Cadrée le 2026-10-18 dans `docs/projects/cloture-allegee.md` (question
tranchée : la date d'origine est gardée).

## Besoin

À chaque `npm run installer-depot`, `docs/ia-first.md` change : sa date
d'état passe à la date du jour, sans autre modification. Il faut annuler ce
changement à la main à chaque lot, sinon il pollue le commit.

## Existant

Relevé le 2026-10-15 : le gabarit
`packages/drwil/templates/common/base/docs/ia-first.md` porte
`State as of {{date}}`, et `packages/drwil/src/render.ts` rend `date` à la
date du jour. Le contrôle `miroirs-gabarit` compare les gabarits à
variables dans leur forme, donc l'ancienne date ne le fait pas échouer.

## Questions à trancher

- [décision] Garder la date d'origine à l'installation du dépôt (ne
  réécrire que si le contenu change), ou retirer la date du document ?
