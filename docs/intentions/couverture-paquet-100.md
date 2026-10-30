# Intention : la couverture à 100 % — le paquet et tout code modifié

**Statut** : proposée le 2026-10-16 — sortie du chantier « couverture de
test, tout le code livré mesuré » à son recadrage
(`docs/projects/journal.md`).
Rangement du 2026-10-26 : seule intention de couverture ; reprend la partie « couverture du diff » de `docs/intentions/garanties-la-suite.md` ; la fiche `docs/projects/journal.md` reste le lot d'outillage de la mesure.

**Revu le 2026-10-30** : la cible est tranchée — ordre : mesure complète et cliquet (`docs/projects/journal.md`), puis 100 % du code modifié (`docs/projects/couverture-du-code-modifie.md`), puis le 100 % du paquet, resté ici. Le « 100 % des hooks Claude et du module front » reste à décider quand leur mesure existera. Décisions du demandeur sur le code modifié : lignes et branches qu'elles ouvrent ; exclusions déclarées avec justification ; sans rapport lcov, contrôle non exécuté signalé (QUA-013) ; ce dépôt l'adopte dès le chantier.

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

## Reprises du rangement du 2026-10-26

### tout code modifié arrive couvert à 100 %, une adoption en douceur (ex-« couverture-du-diff »)

**Besoin** :

Statut d'origine : proposée le 2026-10-16 (demandeur) — à cadrer.

Un projet existant qui adopte drwil a souvent une couverture basse. Lui
imposer un seuil global élevé le bloquerait dès le premier jour ; un
seuil bas (`catalogue:QUA-004`, seuil de couverture relevé au fil de
l'eau) laisse entrer du code neuf non testé tant que la moyenne tient.

Idée du demandeur : exiger 100 % de couverture sur ce qui change. Le code
ancien garde son niveau ; tout ce qui est écrit ou modifié arrive
couvert ; la couverture globale monte d'elle-même, chantier après
chantier (pratique connue sous le nom de couverture du diff, ou « clean
as you code »).

**Propositions de l'agent (acceptées en principe le 2026-10-16, à confirmer au cadrage)** :

- **Mesure sur les lignes modifiées, pas sur les fichiers touchés** :
  100 % d'un fichier touché obligerait à couvrir tout un vieux fichier
  pour une ligne corrigée, et pousserait à ne plus toucher au code ancien.
  Il faut croiser `git diff` (base de la branche) avec le rapport de
  couverture.
- **Au push et en CI, pas au commit** : relancer toute la suite avec
  mesure à chaque commit ralentit l'utilisateur ; la PR entière est
  jugée avant fusion, ce qui suffit à bloquer.
- **Indépendant de la pile** : le contrôle lit un rapport au format
  lcov, que produit l'outil de couverture de chaque pile (c8, coverage.py,
  `go test -cover` converti…) ; le projet déclare la commande qui le
  produit, comme ses autres contrôles.
- **Proposé à l'adoption** : un contrat du catalogue que `/drwil-adopt`
  propose comme les autres, refusable ; complémentaire du seuil global
  (le cliquet empêche la baisse, le diff garantit le neuf).

**Existant** :

**Existant (vérifié le 2026-10-16)** :

- `catalogue:QUA-004` : seuil global par périmètre, déclaré bas puis
  relevé ; adopté par ce dépôt (QUA-004, avec cliquet).
- Aucun contrôle ne regarde la couverture des seules lignes modifiées.
- Les contrôles d'un projet se déclarent dans `.drwil/ia-first.json`
  (`checks`), quelle que soit sa pile.

**Questions à trancher** :

- [décision] Que compte-t-on comme « modifié » : lignes ajoutées et
  modifiées seulement, ou aussi les branches qu'elles ouvrent ?
- [décision] Quelles exclusions déclarées (code généré, fichiers de
  configuration, lignes marquées non testables avec justification) ?
- [décision] Un projet sans rapport lcov (pile non outillée) : contrôle
  non exécuté signalé (QUA-013, contrôle non exécuté n'est pas passé),
  ou contrat non applicable ?
- [décision] Le lier aux profils par risque (fiche 2 du catalogue,
  `docs/intentions/catalogue-cycle-de-vie.md`) : proposé seulement à
  partir d'un profil, et sévérité « MAJEUR avec échéance » pour une
  montée encore plus douce ? Non bloquant : le contrat peut entrer dans
  le catalogue actuel et migrer avec les autres.
- [décision] Ce dépôt l'adopte-t-il aussi, en plus de son cliquet ?

- [décision] Une seule cible pour les trois sujets de couverture (cette intention, la partie ci-dessus et `docs/projects/journal.md`) : 100 % du paquet, 100 % du code modifié, ou les deux, et dans quel ordre ?
