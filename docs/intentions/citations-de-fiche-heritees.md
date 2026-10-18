# Intention : retirer les citations de fiche restées dans le code non modifié

**Statut** : proposée le 2026-10-18 — limite du chantier « une clôture
allégée, sans encombrants » (journal du 2026-10-18, 0.6.5, 3 sur 4).

## Besoin

Le code cite le contrat qu'il sert, jamais une fiche de chantier (QUA-049).
La règle ne bloque que les fichiers modifiés : les citations du code
inchangé sont résumées en un avertissement. Neuf restent dans ce dépôt,
hors du cadrage du chantier qui a créé la règle.

## Existant (vérifié le 2026-10-18)

- `.github/scripts/ci-multi-os.mjs`, `.github/workflows/ia-first.yml`,
  `outils/installer-depot.mjs`, `outils/tester-tarball.mjs`,
  `packages/drwil/test/migration.test.mjs` : neuf commentaires citent une
  fiche, souvent déjà supprimée.
- check-docs les liste à chaque passage, en un avertissement non bloquant.

## Questions à trancher

- [décision] Les corriger d'un coup (entretien courant, cadrage de ces cinq
  fichiers) ou au fil des chantiers qui touchent chaque fichier ?
