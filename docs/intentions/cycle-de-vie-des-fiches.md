# Intention : un cycle de vie des fiches sans contournement

**Statut** : proposée le 2026-10-17 — retour d'expérience de `drwil_com`
(rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt,
écart 6), à examiner après les intentions sur les attestations et la
durabilité des critères.

## Besoin

Deux frictions constatées dans `drwil_com` :

1. Un critère doit citer un contrat déjà inscrit au registre, mais écrire
   le registre pendant le cadrage déclenche l'avertissement de périmètre.
2. La clôture supprime la fiche, alors que tout fichier de code doit
   rester couvert par le cadrage d'une fiche : `drwil_com` a dû créer une
   fiche de référence « docs/projects/delivered-code.md » (dans son dépôt).

Reproduit dans ce dépôt le 2026-10-17 (chantier « premier essai propre »,
journal du 2026-10-17) :

3. Créer un contrat en cours de chantier a demandé deux commits : la fiche
   élargie ne pouvait pas citer le nouvel ID (`check-docs` : « contrat
   absent de docs/contracts.md ») et le registre ne pouvait pas entrer
   dans le commit d'élargissement (qui ne touche que la fiche).
4. Un contrat mixte (`Contrôle` + `Manuel`, ici QUA-013, contrôle non
   exécuté n'est pas passé) compte comme humain : un critère prouvé par
   des tests ne peut pas s'y rattacher (« preuve non durable »), ce que
   rien ne signale au cadrage.

Contrainte du demandeur : réduire les contournements et les gestes
répétitifs **sans affaiblir les contrôles de périmètre**.

## Existant (vérifié le 2026-10-17)

- Fiches de référence : statut « référence », cadrage gardé sans être un
  chantier à lancer (`.githooks/briefs.mjs`) ; ce dépôt en a une pour la
  mécanique du kit (`docs/projects/kit-mechanics.md`).
- QUA-035 (un cadrage complet du premier coup, un élargissement sans
  friction) : `check-docs` avertit déjà une fiche dont un critère crée un
  contrat sans citer `.drwil/ia-first.json`.
- QUA-016 (rappel de cadrage), réglage `scopeReminder`.

## Questions à trancher

- [décision] Le registre des contrats (`docs/contracts.md`) est-il
  inscriptible en SCOPING sans avertissement, puisque cadrer un critère
  exige son contrat ?
- [décision] À la clôture, le cadrage de la fiche est-il versé
  automatiquement dans une fiche de référence (« code livré »), plutôt
  que de laisser l'utilisateur la créer à la main ?
- [décision] Ou bien un fichier de code déjà commité sur la branche
  principale est-il couvert par défaut, le cadrage ne gardant que le
  code nouveau ou modifié ? (plus simple, mais il faut vérifier qu'il
  n'affaiblit pas la barrière.)
