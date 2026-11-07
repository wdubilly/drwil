# Intention : sortir de CLOSING est refusé tant que la CI de la PR ou MR n'est pas verte sur les contrôles confiés à la CI

**Statut** : proposée le 2026-11-07 — limite du chantier « un contrôle lent se joue une seule fois, en CI » (journal du 2026-11-07).

## Besoin

QUA-262 (la clôture n'est acquise qu'une fois la CI de la PR ou MR verte sur les contrôles confiés à la CI) est aujourd'hui un signal : `.githooks/close.mjs` dit « clôture non acquise, le chantier reste en CLOSING », mais rien ne refuse en dur. Le retour en SCOPING exige déjà la PR fusionnée, ce qui tient la CI en pratique quand la branche principale protège la fusion ; sans cette protection (autre forge, fusion à la main), rien ne l'empêche.

## Existant (relevé le 2026-11-07)

- Transitions : `.githooks/state-transitions.mjs`, hors du périmètre du chantier.
- `.githooks/close-checks.mjs` sait déjà lire la CI de la PR (GitHub) ou MR (GitLab).

## Questions à trancher

- [décision] Refuser en dur la sortie de CLOSING sans CI verte, ou garder le signal tant que la fusion exigée suffit ?
