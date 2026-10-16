# Intention : la couverture du paquet relevée à 100 %

**Statut** : proposée le 2026-10-16 — sortie du chantier « couverture de
test, tout le code livré mesuré » à son recadrage
(`docs/projects/adopter-seuil-couverture.md`).

## Besoin

QUA-004 (seuil de couverture de test) vise 100 % pour le paquet
`packages/drwil` ; la mesure du 2026-10-16 donne 95,2 % lignes, 88,0 %
branches, 95,9 % fonctions. Tant que le seuil n'y est pas, une branche
non testée peut entrer sans rien faire échouer.

## Existant (mesuré le 2026-10-16)

- `packages/drwil/bin/drwil.js` : 76 % lignes, 74 % branches, 71 % fonctions.
- `packages/drwil/src/` : 99,1 % lignes mais 88,4 % branches, réparties dans presque
  tous les fichiers ; `packages/drwil/src/stack.ts` à 66,7 % branches (détection de stack
  Go, Rust, PHP, Ruby, .NET, Flutter jamais exercée).
- Script de release : 65 % lignes ; le chemin réel (`git tag`,
  `git push`, `gh release create`) n'est jamais exécuté par les tests.

## Décisions déjà prises

- 2026-10-16 (demandeur) : le chemin réel du script de release sera
  testé en mockant `execFileSync` (vraie couverture), pas exclu par
  `c8 ignore`.

## Questions à trancher

- [décision] Un chantier ou plusieurs (ligne de commande, branches de
  `packages/drwil/src/`, release) ?
- [décision] Le 100 % s'applique-t-il aussi aux hooks Claude et au module
  front une fois mesurés ?
