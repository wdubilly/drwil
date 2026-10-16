# Intention : tout code modifié arrive couvert à 100 %, une adoption en douceur

**Statut** : proposée le 2026-10-16 (demandeur) — à cadrer.

## Besoin

Un projet existant qui adopte drwil a souvent une couverture basse. Lui
imposer un seuil global élevé le bloquerait dès le premier jour ; un
seuil bas (`catalogue:QUA-004`, seuil de couverture relevé au fil de
l'eau) laisse entrer du code neuf non testé tant que la moyenne tient.

Idée du demandeur : exiger 100 % de couverture sur ce qui change. Le code
ancien garde son niveau ; tout ce qui est écrit ou modifié arrive
couvert ; la couverture globale monte d'elle-même, chantier après
chantier (pratique connue sous le nom de couverture du diff, ou « clean
as you code »).

## Existant (vérifié le 2026-10-16)

- `catalogue:QUA-004` : seuil global par périmètre, déclaré bas puis
  relevé ; adopté par ce dépôt (QUA-004, avec cliquet).
- Aucun contrôle ne regarde la couverture des seules lignes modifiées.
- Les contrôles d'un projet se déclarent dans `.drwil/ia-first.json`
  (`checks`), quelle que soit sa pile.

## Propositions de l'agent (acceptées en principe le 2026-10-16, à confirmer au cadrage)

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

## Questions à trancher

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
