# Intention : lancer un contrôle lent au commit seulement si le chantier touche un chemin critique

**Statut** : proposée le 2026-11-01 — limite du chantier « réserver un contrôle lent à verify et à la CI » (journal du 2026-11-01).

## Besoin

Le réglage `runAt` (QUA-208, un contrôle réservé à `verify` et à la CI) est binaire : un contrôle lent n'est jamais lancé au commit. Une variante plus fine lancerait le contrôle e2e au commit seulement si le chantier touche un chemin critique.

## Existant

Le chantier « réserver un contrôle lent à verify et à la CI » livre `runAt` (`.githooks/engine-runat.mjs`). Aucune notion de chemin critique n'existe dans le moteur ni dans la configuration.

## Questions à trancher

- Le réglage simple suffit-il, ou des défauts passent-ils entre le commit et `verify` après quelques chantiers vécus avec `runAt` ?
- Si non : qu'est-ce qu'un chemin critique, et qui le déclare (le projet, la fiche de chantier) ?
