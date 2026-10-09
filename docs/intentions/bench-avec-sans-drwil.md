# Intention : mesurer l'apport de drwil — même consigne, avec et sans drwil

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur,
questions à trancher en fin de fiche.

**Projet** : DRWIL — **Niveau de risque** : MEDIUM.

## Besoin

drwil promet qu'un agent livre un travail plus sûr quand il est gouverné :
contrats vérifiés, périmètre tenu, preuves au lieu d'affirmations. Rien ne
le mesure aujourd'hui. Intention : un banc d'essai qui donne la **même
consigne** à un agent sur **le même projet**, une fois sans drwil et une
fois avec, puis compare les résultats, pour estimer :

- **la qualité du livrable** : tests verts, régressions, contrats
  respectés, périmètre tenu (fichiers touchés hors sujet), doc à jour,
  affirmations fausses (« c'est corrigé » sans preuve) ;
- **la consommation** : tokens, coût, durée, nombre d'interventions
  humaines.

Le résultat sert à décider (ce que drwil apporte vraiment, et où il coûte
trop) et à convaincre (chiffres pour la publication, Community Ready).

## Existant

- `.drwil/usage.jsonl` (si présent) et la recette
  `docs/recettes/suivre-consommation-par-lot.md` : tokens, modèle et durée
  par lot, déjà agrégés par le tableau de bord.
- `drwil verify` : verdict mécanique (PASS / FAIL / MANUAL / ERROR) sur les
  contrats, réutilisable comme mesure de qualité côté « avec drwil ».
- Observé le 2026-10-09 sur ce dépôt : la barrière a refusé de vrais
  écarts (fichiers hors cadrage, commit hors activité), mais a aussi coûté
  des allers-retours humains pour des corrections mineures — à mesurer
  plutôt qu'à supposer.

## Contraintes

- **Même consigne, même projet, même modèle** : seule la présence de drwil
  varie.
- **Non-déterminisme** : un agent ne donne pas deux fois le même résultat ;
  il faut plusieurs passages par cas et des écarts, pas une seule mesure.
- **Juger sans biais** : la qualité du livrable « sans drwil » ne peut pas
  être jugée par les contrôles de drwil seuls (ce serait juger le produit
  par lui-même) ; il faut des critères indépendants (tests cachés,
  relecture humaine à l'aveugle…).
- Coût du banc lui-même (tokens des passages) : à borner.

## Questions à trancher

1. **Corpus** : quelles tâches (ajouter une fonctionnalité, corriger un
   bug, refactorer, tâche piège qui pousse à sortir du périmètre) et sur
   quel(s) projet(s) de référence ?
2. **Critères de qualité** : lesquels, mesurés comment, et par qui
   (automatique, humain à l'aveugle, les deux) ?
3. **Agent et modèle** : un seul outil (Claude Code) ou plusieurs, pour
   tenir la promesse « agnostique de l'agent » ?
4. **Répétitions** : combien de passages par cas et par variante ?
5. **Interventions humaines** : comment simuler ou compter les décisions
   humaines exigées par drwil (transitions, attestations) ?
6. **Forme** : script reproductible dans ce dépôt, rapport ponctuel, ou
   les deux ? Publié avec le kit ?
7. **Budget** : plafond de tokens et de coût pour une campagne de mesure.
