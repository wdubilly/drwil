# Projet : accélérer la CI sans perte de qualité

**Statut** : cadré le 2026-10-24.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : note du 2026-10-24 de `docs/intentions/notes.md` (« Accélérer la CI sans perte de qualité »)

<!-- scope
files:
  - .github/workflows/ia-first.yml
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.test.mjs
  - .drwil/ia-first.json
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
-->

(Dépôt ou livrable (QUA-018, périmètre explicite dépôt vs gabarit) : les deux.
Le workflow `.github/workflows/ia-first.yml` est celui de ce dépôt ; le moteur
et `.githooks/run-checks.mjs` sont du gabarit, donc livrés. On n'édite que le gabarit,
puis `npm run installer-depot`.)

## 1. Besoin

Le job `checks` dure environ 3,4 min sur 4,8 min de CI (mesure du
2026-10-24) : `run-checks` lance 108 contrôles en série, dont 56 refont
`tsc --build` avant un `node --test` filtré par contrat (un contrôle par
règle, QUA-033). Une PR attend 5 à 6 min à chaque passage, y compris pour
une correction d'une ligne ; la réouverture de la PR #220 l'a coûté deux
fois. Le demandeur veut un job `checks` au moins deux fois plus court, sans
retirer ni affaiblir aucun contrôle.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Les contrôles du projet s'exécutent à la même exigence qu'avant, plus vite :
  chaque contrat garde son contrôle propre, un échec nomme toujours le contrat
  fautif, et un contrôle qui ne s'est pas exécuté reste un échec (QUA-013,
  un contrôle non exécuté n'est jamais un succès) — contrat à créer
- La compilation du paquet n'est faite qu'une fois par passage de
  `run-checks`, pas une fois par contrôle ; une compilation en échec fait
  échouer tous les contrôles qui en dépendent, jamais passer — contrat à créer
- Le workflow ne lance pas deux fois les mêmes jobs pour un même commit de
  branche (push et pull_request) ; un push sur la branche principale garde
  l'alerte de CI cassée et les noms de checks exigés par le ruleset de master
  (`checks`, `kit-tests (<os>)`) ne changent pas — contrat à créer
- Le job `checks` dure au moins deux fois moins que les 3,4 min mesurées,
  relevé sur trois passages de CI consécutifs et consigné dans le journal
  [humain] — contrat manuel à créer

## Contrats modifiés

Aucun contrat existant n'est modifié : QUA-033 (un contrôle par règle) et
QUA-013 (un contrôle non exécuté n'est pas un succès) restent vrais tels
quels ; le chantier ne fait que les tenir plus vite.

## 2. Hors périmètre

- La suite unique avec verdict par contrat lu par un reporter : elle change
  la règle QUA-033 (décision du demandeur), à reprendre par une intention
  seulement si, après ce chantier, la CI reste trop lente.
- Découper le job `checks` en plusieurs jobs (`ciJob`) : cela renommerait les
  checks exigés par le ruleset de master (réglage de la forge).
- Retirer un contrôle, baisser un seuil, ou sauter un contrôle sur une PR.
- Le test de Node 22 (plus ancienne version prise en charge, `engines`) : il
  reste, seule sa duplication éventuelle avec les contrôles filtrés se mesure
  au lot 1.

## 3. Contraintes

- Nom des checks exigés par le ruleset de master : inchangés (`checks`,
  `kit-tests (ubuntu-latest | macos-latest | windows-latest)`) ; tout
  changement du ruleset est un geste humain hors de ce chantier.
- Le moteur reste Node seul, portable sur les trois OS (kit portable) :
  aucun parallélisme qui dépende d'une dépendance ajoutée.
- QUA-001 (plafond de 400 lignes) pour tout fichier touché.
- Modifie `.githooks/`, la CI et `.drwil/` : risque HIGH (DRWIL-012, le
  niveau de risque impose les décisions et les contrats cités), et le rejeu
  par la branche principale (QUA-113) garde la version de la PR des hooks
  modifiés : les déclarer dans « Contrats modifiés » dès le premier commit
  qui les touche.

## 4. Décisions

- 2026-10-24 — Objectif : job `checks` divisé par deux, aucun contrôle retiré
  ni affaibli (demandeur).
- 2026-10-24 — Pistes retenues : un seul `tsc --build`, contrôles de tests en
  parallèle, retrait du doublon push / pull_request, cache npm / build,
  doublon éventuel de `npm test` mesuré d'abord (demandeur).
- 2026-10-24 — La suite unique avec reporter n'est pas retenue : ce n'est
  pas nécessaire à la qualité (QUA-033 garde pour but qu'un échec nomme sa
  règle ; le reporter donnerait la même information mais change la règle du
  jeu) ; à reprendre seulement si le gain reste insuffisant.

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — mesure et un seul `tsc`** [IA] : chronométrer chaque contrôle
  (relevé joint au journal) et vérifier si le `npm test` de Node 22 refait
  ce que couvrent déjà les contrôles filtrés ; faire exécuter la compilation
  une fois par passage dans le moteur, les contrôles `tests-<id>` ne la
  relançant plus. Critère de sortie : `node .githooks/run-checks.mjs` OK,
  gain mesuré, tests du moteur verts (critères 1 et 2).
- **Lot 2 — parallélisme** [IA] : exécuter les contrôles `tests-<id>` en
  parallèle avec une sortie et un verdict identiques à l'ordre actuel, sur
  les trois OS. Critère de sortie : tests du moteur et `kit-tests` verts
  sur Ubuntu, macOS et Windows.
- **Lot 3 — workflow** [IA] : retirer le doublon push / pull_request sur les
  branches, ajouter le cache de compilation, garder noms de checks et alerte.
  Critère de sortie : critère 3 vert, CI d'une PR de contrôle verte.
- **Lot 4 — relevé des durées** [humain] : trois passages de CI consécutifs,
  durée du job `checks` consignée. Critère de sortie : critère 4 attesté.

## 7. Reprise

- **Dernier état** (2026-10-24) : cadré ; rien de commencé.
- **Travail non commité** : la fiche et sa ligne d'index.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
