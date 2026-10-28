# Intention : aider l'adoptant à alléger ses fichiers de documentation et de code

**Statut** : proposée le 2026-10-27 — demande de l'humain, pour plus tard (après la 0.10.0).

## Besoin

Le contrôle de taille du kit (`docs/projects/journal.md`)
avertit un projet adopté dont un fichier du kit dépasse son plafond, et
QUA-001 (fichier de code plafonné) plafonne son code. L'avertissement dit
quoi, pas comment : le kit gagnerait à proposer de quoi alléger.

## Existant

Rien de livré : ni outil de découpe, ni fiche d'allègement ; seuls QUA-001 et
la recette `refactor-without-breaking` encadrent un découpage.

## Pistes

- Un outil de découpe, proposé par la CLI : il propose où couper un fichier
  trop long (document ou code) ; l'humain valide, jamais d'écriture seule.
- À l'adoption, des fiches de chantier déjà faites pour alléger les fichiers
  de documentation et le code de l'adoptant (une par fichier dépassant son plafond),
  lancées comme n'importe quel chantier (`/drwil-start`).

## Questions à trancher

- [décision] Outil de découpe, fiches toutes faites à l'adoption, ou les deux ?
- [décision] Les fiches sont-elles écrites par l'adoption (drwil-adopt) ou par
  une commande de la CLI, à la demande ?
- [décision] Le découpage de code est-il assisté par l'IA seulement (recette
  `refactor-without-breaking`) ou outillé mécaniquement ?
