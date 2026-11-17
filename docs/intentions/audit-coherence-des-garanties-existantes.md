# Intention : audit de cohérence des garanties existantes

**Statut** : noté le 2026-11-17, à la place de la fiche « protocole-commun-de-preuve-et-de-cloture », abandonnée
sous cette forme.

## Besoin

Vérifier que les garanties déjà définies pour la preuve et la clôture sont couvertes par des tests. Identifier leurs
défauts, seules ou ensemble. Ne proposer une correction que pour un écart concret et démontré. L'objectif est de
rendre le système plus fiable sans ajouter de règle, de procédure ni d'étape.

L'audit n'est pas un chantier déguisé : il peut conclure qu'il n'y a rien à corriger.

## Grille

Sept thèmes : cohérence des preuves, idempotence des clôtures, traçabilité des décisions, intégrité du périmètre,
validation humaine, maîtrise des réouvertures, régressions transversales.

## Règles de l'audit

- **Résultat de forme fixe** : pour chaque thème, les contrats concernés (ID suivi du titre), le test qui prouve
  chacun, et un seul verdict parmi trois :
  - « couvert » : le test échoue quand on casse la règle, dans une copie jetable, et la casse essayée est notée ;
  - « écart démontré » : avec la commande ou le scénario qui le reproduit sur la branche principale ;
  - « non couvert » : la règle n'a aucun test.

  Il n'y a pas d'autre verdict, et un rapport entièrement « couvert » est un résultat accepté.
- **Aucun code dans l'audit** : son seul livrable est le rapport. Chaque écart démontré devient sa propre fiche,
  cadrée puis lancée par le demandeur.
- **Pas de contrat chapeau** : l'audit ne recopie pas les contrats existants dans un « protocole commun ».

## Existant (2026-11-17)

- Premier écart démontré, traité à part sans attendre l'audit : les entrées du journal coupées en deux par la
  clôture (`docs/projects/journal-sans-entree-vide.md`).
- Piste déjà notée, que l'audit confirmera ou écartera : séparer QUA-048 en un contrat purement testé, sans volet
  humain (`docs/intentions/notes.md`, note du 2026-11-17).

## Questions à trancher

- **Forme** : le kit exige un contrat par critère d'une fiche, et un audit sans code n'en crée aucun. La piste
  recommandée le 2026-11-17 est de ne pas en faire une fiche : lancer `/drwil-audit` en SCOPING, limité à cette
  grille, et commiter le rapport comme un document de cadrage. Les autres voies sont un contrat MANUAL attesté, qui
  ajoute une attestation, ou un contrôle de la structure du rapport, qui ajoute une règle.
- **Moment** : après la file en cours (attente de fusion, avertissement de lancement, tests découpés), pour ne pas
  ajouter d'attente à la journée.
