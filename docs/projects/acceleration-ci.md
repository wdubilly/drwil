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
  - packages/drwil/templates/common/base/.githooks/base-checks.mjs
  - .githooks/base-checks.test.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.test.mjs
  - .drwil/ia-first.json
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/duree-du-rejeu-en-ci.md
  - docs/intentions/notes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
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

**Élargi le 2026-10-24 (demandeur)** : objectif « chaque contrôle joué une
seule fois par PR en CI, sans perte de garantie ». Le retour de correction
de l'agent est le hook pre-push local (`run-checks`) ; la CI reste la porte de
confiance (un hook local peut être sauté, QUA-019, QUA-114). Les doublons de
la CI (rejeu par la branche principale quand rien n'a changé, `npm test` de
Node 22 qui refait ce que fait déjà `couverture-tests`) entrent donc dans le
périmètre ; un hook ne doit jamais pouvoir être affaibli par une PR.

## Critères d'acceptation

(contrats créés au registre au lancement, avec leur champ **Origine** :
QUA-119 à QUA-123.)

- Les contrôles du projet s'exécutent à la même exigence qu'avant, plus vite :
  chaque contrat garde son contrôle propre, un échec nomme toujours le contrat
  fautif, et un contrôle qui ne s'est pas exécuté reste un échec (QUA-013,
  un contrôle non exécuté n'est jamais un succès) — QUA-119
- La compilation du paquet n'est faite qu'une fois par passage de
  run-checks, pas une fois par contrôle ; une compilation en échec fait
  échouer tous les contrôles qui en dépendent, jamais passer — QUA-120
- Le workflow ne lance pas deux fois les mêmes jobs pour un même commit de
  branche (push et pull_request) ; un push sur la branche principale garde
  l'alerte de CI cassée et les noms de checks exigés par le ruleset de master
  (checks, kit-tests (<os>)) ne changent pas — QUA-121
- Chaque contrôle n'est joué qu'une fois par PR en CI : le rejeu par la branche
  principale est sauté, et dit, seulement quand hooks et liste de contrôles sont
  identiques à la base ; un doute ou un écart rejoue ; la suite ne tourne
  qu'une fois sur Node 22 dans le job checks, sans perte de garantie —
  QUA-123
- Hooks modifiés : le job checks dure au moins 30 % de moins que la référence
  (environ 5m35, soit 3m55 au plus), relevé sur trois passages de CI et consigné
  dans le journal ; hooks inchangés : durée relevée sur la première PR ordinaire
  après fusion, suivie par une intention jusqu'au relevé [humain] — QUA-122

## Contrats modifiés

- QUA-113 (sur une PR, la CI rejoue les contrôles avec les hooks de la branche
  principale) — ancien critère : « la CI lance toujours le rejeu ». Nouveau :
  le rejeu n'est sauté que si `.githooks/` et la liste de contrôles de
  `.drwil/ia-first.json` sont identiques octet pour octet à la base (le rejeu
  serait alors strictement le même passage) ; au moindre écart, doute ou lecture
  Git en échec, rejeu complet (QUA-013) ; chaque saut est dit dans la sortie.
  Raison : le rejeu doublait la durée du job `checks` sans rien vérifier de plus
  quand rien n'a changé. Validé le 2026-10-24 par le demandeur.

Aucun autre contrat existant n'est modifié : QUA-033 (un contrôle par règle) et
QUA-013 (un contrôle non exécuté n'est pas un succès) restent vrais tels
quels. Les hooks ci-dessous changent, et le rejeu par la branche principale
(QUA-113) doit garder leur version de la PR : le moteur de la base ne connaît
ni `build` ni `parallel`, et ferait tourner les contrôles sans compilation.

- `.githooks/engine.mjs` : réglages `build` / `needsBuild` (une compilation par
  passage) et `parallel` (contrôles lancés ensemble, verdict d'un passage en série).
- `.githooks/run-checks.mjs` : lit les résultats parallèles dans l'ordre de la liste.
- `.githooks/base-checks.mjs` : saut du rejeu quand hooks et liste de contrôles
  sont identiques à la base ; son test `.githooks/base-checks.test.mjs` avec lui.

## 2. Hors périmètre

- La suite unique avec verdict par contrat lu par un reporter : elle change
  la règle QUA-033 (décision du demandeur), à reprendre par une intention
  seulement si, après ce chantier, la CI reste trop lente.
- Découper le job `checks` en plusieurs jobs (`ciJob`) : cela renommerait les
  checks exigés par le ruleset de master (réglage de la forge).
- Tout affaiblissement d'un hook, retirer un contrôle, baisser un seuil.
- `checks-self-test` contre `couverture-hooks` : retiré seulement si le lot 1
  prouve qu'aucune garantie n'est perdue, sinon fiche d'intention.

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

- 2026-10-24 — Cadrage élargi (demandeur) : chaque contrôle joué une seule
  fois par PR en CI, à l'endroit qui permet à l'agent de corriger (le hook
  pre-push) ; la CI reste la porte de confiance ; un hook ne peut jamais être
  affaibli par une PR. Rejeu QUA-113 sauté seulement si hooks et liste de
  contrôles sont identiques à la base ; Node 22 testé une seule fois, sans
  refaire ce que `couverture-tests` exécute déjà ; chaque saut est dit.

- 2026-10-24 — Critère de durée reformulé (demandeur, option 1) : hooks
  modifiés, `checks` au moins 30 % plus court que la référence (≈ 5m35, soit
  ≤ 3m55 ; relevé sur trois passages) ; hooks inchangés, durée relevée sur la
  première PR ordinaire après fusion, suivie par une intention. Raison : la CI
  lit sur master l'ancienne copie de base-checks, le saut du rejeu n'agit
  qu'après fusion. QUA-122 (contrat créé par ce chantier) est reformulé.

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

- **Dernier état** (2026-10-24) : lots 1 à 3 faits (QUA-119 à QUA-123), PR #221.
  Mesures CI du job `checks` : référence PR #220 ≈ 5m35 ; PR #221 avant
  l'élargissement 5m33 ; après (hooks MODIFIÉS, donc rejeu complet, `npm test`
  Node 22 retiré) 3m02. Hooks inchangés (rejeu sauté) : à relever sur la
  première PR après fusion, la copie de base-checks lue sur master ne
  connaissant pas encore le saut. Reste à l'humain : trois passages consécutifs
  et l'attestation de QUA-122 (lot 4). Limite : les tests de `.githooks/` ne
  tournent plus que sur Node 22 (plus sur 24) dans `checks`.
