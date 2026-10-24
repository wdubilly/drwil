# Intention : découper le registre des contrats et le journal

**Statut** : proposée le 2026-10-24 — limite du chantier « réduire le contexte
relu par chantier » (hors périmètre décidé par le demandeur, à reprendre si la
lecture ciblée ne suffit pas).

## Besoin

`docs/contracts.md` (≈ 181 ko) et `docs/projects/journal.md` (≈ 191 ko)
grossissent à chaque chantier. La lecture ciblée (QUA-124) et la lecture
forcée (QUA-132) évitent de les lire en entier, mais une lecture par plage
ou une recherche reste possible et les contrôles qui les lisent restent
liés à un seul fichier.

## Existant (relevé le 2026-10-24)

- Un fichier par registre ; le catalogue, `check-docs`, `.githooks/glossary.mjs`,
  `.githooks/close.mjs` et `.githooks/doc-coherence.mjs` les lisent.

## Questions à trancher

- Découper seulement si le relevé de l'indicateur
  (`docs/intentions/releve-cache-lu-par-requete.md`) montre que la lecture
  ciblée ne suffit pas ?
- Forme : un fichier par contrat, par année de journal, ou archive des
  entrées anciennes ? Change le format lu par les contrôles et le catalogue :
  migration pour les projets adoptés.
