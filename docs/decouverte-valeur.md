# Découverte de valeur et opportunités produit

> Dernier scan : 2026-11-12 (remplace celui du 2026-10-21 ; voir « Ce qui a
> changé depuis le scan précédent »).
> État du projet : paquet `drwil` 0.11.1 publié ; la 0.11.2 s'accumule dans
> « Unreleased » de `packages/drwil/CHANGELOG.md`. Gouvernance en CLOSING
> (`node .githooks/state.mjs`) : le chantier « init marque [IA] ce qu'un agent
> peut faire » est clos, sa PR #415 attend la fusion. Trois chantiers enchaînés
> en file aujourd'hui (PR #413 GitLab, #414 refus de lancement lisible, #415
> marques [IA]). Restent cadrés pour la 0.11.2 : sept fiches P0 nées le
> 2026-11-12 des retours du demandeur, puis sept fiches d'optimisation des
> tests (la première, `controles-rejoues-reduits`, est faite). Objet de ce
> scan : la fluidité du « full auto », à la lumière des frictions de la file
> du jour. La roadmap suivie vit dans `docs/projects/pending.md`.

## Aperçu de consommation

`.drwil/usage.jsonl` : 82 lignes, 200,96 M de tokens et 4 898 minutes en
tout. Depuis le scan précédent (après le 2026-10-21) : 51 chantiers mesurés
automatiquement (`claude-code-logs`), 165,66 M de tokens et 3 848 minutes,
médiane 2,30 M par chantier. Les plus coûteux : `limites-pendant-le-chantier`
(19,90 M), `drwil-serve` (14,72 M), `ci-rapide-pour-la-doc` (11,30 M).
Les trois chantiers du jour : 5,00 M / 119 min (GitLab), 3,17 M / 100 min
(refus de lancement), 1,30 M / 43 min (marques [IA]), soit 9,47 M et 262 min.
Trou de mesure : aucune ligne entre le 2026-11-09 et le 2026-11-11, période
de chantiers menés sous Copilot CLI (commit `8b6bab0`, co-auteur Copilot) ;
la mesure de Copilot CLI est désormais cadrée (`docs/projects/consommation-copilot-cli.md`).

## Les frictions de la file du jour, vérifiées dans le dépôt

| Friction annoncée | Preuve trouvée | Cause probable |
|---|---|---|
| Arrêts pour des limites hors cadre | 8 limites « Traiter maintenant » en deux chantiers (journal : 1 + 3 pour GitLab, 4 pour le refus de lancement), 1 limite non traitée (CHANGELOG, chantier [IA]) ; 72 commits d'élargissement de scope depuis le 2026-10-22 | Le scope ne prévoit ni les tests à sortie figée (QUA-072), ni les modules voisins (`.githooks/state-cli.mjs`, `.claude/hooks/prompt-hook.mjs`), ni le CHANGELOG que la règle de clôture demande d'écrire |
| Puces « Contrats modifiés » découvertes tard | Commits séparés `7cc6690` (7 contrats déclarés), `b2f4aac` ; 26 commits de déclaration depuis le 2026-10-22. **5 des 7 fiches P0 cadrées aujourd'hui citent des hooks sans puce** (calcul de `undeclaredCited`, `.githooks/state-hooks.mjs`), 7 sur 14 fiches cadrées en tout | La puce n'est signalée qu'au lancement (`.githooks/state-hooks.mjs`, information seule) et refusée à la clôture (`.githooks/close.mjs`, QUA-137) ; les contrats modifiés ne le sont qu'à `verify` (`packages/drwil/src/criteria.ts`) |
| Attestations obsolètes dès qu'un fichier couvert change | 88 attestations en novembre (29 le 2026-11-08) ; QUA-013 attesté 20 fois, QUA-150 15, QUA-048 12, QUA-067 10. QUA-067 (hooks de Gemini) et QUA-048 couvrent tout `.githooks/state.mjs`, modifié 12 fois depuis le 2026-10-22 | `**Couvre**` au grain du fichier (QUA-081) : un fichier « carrefour » fait tomber des jugements sans rapport avec le changement |
| Sondage d'attestation du chat refusé | Journal du chantier « refus de lancement » : refusé deux fois « sans raison lisible », repli au terminal | `.claude/hooks/attest-poll.mjs` rend le même texte pour cinq causes distinctes (sondage invalide, écart avec la préparation, préparation absente, délai d'une heure, réponse autre que la première option) |
| CI de PR démarrée en retard | Commit `8b6bab0` « Relance de la CI bloquée en file d'attente » | `.githooks/pr-watch.mjs` traite l'état « aucun contrôle » comme final (sortie 2 immédiate, test `.githooks/pr-watch.test.mjs:103`) : une CI pas encore inscrite sur la PR arrête le suivi au lieu d'être attendue |

## Opportunités prioritaires (matrice valeur / effort)

Lecture : 🟢 effort faible, 🟡 moyen, 🔴 élevé.

| ID | Fonctionnalité proposée | Pourquoi (valeur) | État du code existant | Effort | Action recommandée |
|---|---|---|---|---|---|
| OPT-1 | Un cadrage complet avant le lancement : puces « Contrats modifiés » des hooks cités et fichiers de clôture (CHANGELOG) décidés au cadrage | Supprime un arrêt humain par chantier de la file P0 : 5 des 7 fiches P0 seront refusées à la clôture (QUA-137) faute de puce, aucune n'a le CHANGELOG dans son scope | `undeclaredCited` (`.githooks/state-hooks.mjs`) calcule déjà la liste ; il n'est appelé qu'au lancement (`.githooks/state.mjs:69`) ; `check-docs` (`.githooks/check-docs-workstreams.mjs`) ne le lit pas | 🟢 Faible | **Tout de suite, avant de lancer la file P0** : compléter les sept fiches (cadrage, sur le oui du demandeur) ; puis faire avertir `check-docs` au cadrage. Nouveau |
| OPT-2 | `pr-watch` attend que la CI apparaisse avant de la dire « absente », et signale un run resté en file d'attente | La fusion automatique par défaut (fiche P0) repose sur `pr-watch` : un « suivi non exécuté » juste après le push casse le full auto pour rien | `watch` (`.githooks/pr-watch.mjs`, état `none` final) ; délai global de 30 min déjà géré | 🟢 Faible | **À cadrer avant ou avec `fusion-automatique-par-defaut`**. Nouveau (distinct de `docs/intentions/pr-watch-en-temps-reel.md`) |
| OPT-3 | Le refus du sondage d'attestation nomme sa cause et ce qu'il faut refaire | L'attestation depuis le chat (QUA-267) retombe au terminal sans explication ; chaque repli coûte un geste humain | Cinq sorties de refus dans `.claude/hooks/attest-poll.mjs` partagent un message ; QUA-235, QUA-236 | 🟢 Faible | **Fiche de correction** (reproduire d'abord), comme le prévoit `docs/intentions/essais-reels-en-attente.md` (partie « ex-attestation-chat-essais-reels ») pour un défaut vu à l'usage. Nouveau |
| OPT-4 | Une attestation ne tombe plus pour un changement sans rapport : `**Couvre**` resserré et attestations récurrentes remplacées par des tests | 88 réattestations en novembre ; chaque chantier qui touche `.githooks/state.mjs` réveille QUA-048 et QUA-067 (Gemini) | `packages/drwil/src/coverage.ts`, `packages/drwil/src/fingerprint.ts`, `**Couvre**` de 28 contrats dans `docs/contracts.md` | 🟡 Moyen | **0.12.0, tôt** : d'abord l'inventaire (contrat, fichiers couverts, nombre de réattestations), puis par contrat : couvrir le module dédié ou passer en test en dur. Nouveau |
| OPT-5 | Les fichiers que la clôture demande d'écrire sont admis d'office en CLOSING (ligne « Unreleased » du CHANGELOG, README, carte) | La règle de clôture exige le CHANGELOG pour tout changement visible, la barrière de périmètre le refuse hors scope : contradiction vue aujourd'hui | `.githooks/scope-gate.mjs` (seules les fiches et intentions sont toujours admises) ; règle de clôture (`.githooks/state-messages-fr.mjs`) | 🟢 Faible | **0.11.2 ou 0.12.0**, si OPT-1 ne suffit pas (OPT-1 traite les fiches, OPT-5 la règle). Nouveau |
| OPT-6 | Prévoir le périmètre au cadrage : tests qui importent un module cité ou figent ses messages, fichiers du `**Périmètre**` des contrats touchés | 72 élargissements de scope depuis le 2026-10-22 ; chaque limite coûte un sondage, un commit et une reprise | `.githooks/scope.mjs` (`readBlock`, `withMirrors`), `scopeMirrors` ; `docs/intentions/scope-des-fiches-suit-les-fichiers-decoupes.md` (« à reprendre si les arrêts persistent ») | 🟡 Moyen | **À prioriser** : l'intention existe ; les arrêts persistent, la condition de reprise est remplie |
| OPT-7 | La file P0 du 2026-11-12, dans un ordre qui évite les conflits | Fusion par défaut, fin des sous-agents, mesure Copilot, relecture critique, cadrage en BUILD, index par fiche, analyse d'urgence : sept réponses directes au full auto | Sept fiches « prêt » dans `docs/projects/` ; `fin-des-sous-agents-de-chantier`, `fusion-automatique-par-defaut` et `relecture-critique-avant-cloture` partagent le skill `start-a-workstream` et `docs/ia-first/7-starting-and-closing.md` | — | **Déjà cadré** : enchaîner, jamais en parallèle ; après OPT-1 |
| OPT-8 | Vérifier la barrière de fusion chez l'adoptant (protection absente, mal configurée, conforme) | Avec la fusion automatique par défaut et sans sondage, une branche non protégée fusionne avant la CI : le risque monte | `drwil doctor` (`packages/drwil/src/doctor.ts`), `.github/scripts/verifier-ruleset.mjs` (propre au dépôt) ; `docs/intentions/forge-dans-le-livrable.md` (section drwil_com) | 🟡 Moyen | **À prioriser** juste après `fusion-automatique-par-defaut` (ex-OPT-4 du 2026-10-21) |
| OPT-9 | Vue de relecture et « qui décide chaque transition » affichés | Le temps d'arbitrage humain reste le goulot | `docs/intentions/vue-de-relecture.md`, `docs/intentions/fluidite-sans-perte-de-rigueur.md` ; en partie absorbés par la fusion par défaut et la relecture critique | 🔴 Élevé | **Déjà en intention (0.13.0)** ; recadrer après la file P0 (ex-OPT-7 et OPT-8) |

Écartés de la roadmap proche : publication npm (0.14.0, décision du
demandeur, ex-OPT-10), Codex et Cursor, catalogue et profils, banc et
fabrique (après le catalogue), validation commerciale.

## Analyse détaillée des meilleures pistes

### OPT-1 — Un cadrage complet avant le lancement
- **Problème résolu** : la puce « Contrats modifiés » d'un hook et le
  CHANGELOG arrivent en cours de BUILD ou à la clôture, donc par un sondage
  de plus et un commit séparé. Avant même le lancement, la file P0 en porte
  la trace : `fusion-automatique-par-defaut` (4 hooks sans puce),
  `consommation-copilot-cli` (4), `index-par-fiche` (4), `cadrage-en-build`
  (3), `analyse-d-urgence-des-fiches` (3) ; aucune des sept n'a
  `packages/drwil/CHANGELOG.md` dans son scope, alors que plusieurs changent
  ce que voit l'utilisateur.
- **Briques existantes réutilisables** : `undeclaredCited` et son texte
  (`.githooks/state-hooks.mjs`), `declaredIn` et `hookDeclared`
  (`.githooks/base-checks.mjs`), les avertissements de fiche de
  `.githooks/check-docs-workstreams.mjs`.
- **Ce qu'il reste à faire** : (1) un cadrage de documentation (sans
  code) qui complète les sept fiches, chaque puce sur le oui du demandeur
  (QUA-137, QUA-113) ; (2) une fiche qui fait avertir `check-docs` en
  SCOPING sur une fiche « prêt » qui cite un hook sans puce.
- **Impact si implémenté** : le lancement « full auto » de la file ne
  s'arrête plus sur une déclaration connue d'avance.

### OPT-2 — `pr-watch` attend que la CI apparaisse
- **Problème résolu** : `watch` rend « suivi non exécuté : aucun contrôle de
  CI » dès la première lecture si la forge n'a pas encore inscrit les
  contrôles ; l'agent s'arrête ou relance la CI à la main (`8b6bab0`).
- **Briques existantes réutilisables** : la boucle et le délai de
  `.githooks/pr-watch.mjs`, ses tests avec faux `gh` et `glab`
  (`.githooks/pr-watch.test.mjs`).
- **Ce qu'il reste à faire** : reproduire (PR ouverte, `pr-watch` lancé
  aussitôt) ; un délai de grâce pour l'état `none` ; le cas « en file
  d'attente depuis N minutes » dit avec la commande de relance.
- **Impact si implémenté** : la fusion automatique par défaut tient sans
  intervention humaine sur une forge lente.

### OPT-4 — Des attestations qui ne tombent que pour leur objet
- **Problème résolu** : QUA-081 fait tomber une attestation au moindre
  changement d'un fichier couvert ; avec des fichiers carrefours
  (`.githooks/state.mjs`, `.github/workflows/ia-first.yml`, 11 changements
  chacun depuis le 2026-10-22), le jugement humain est redemandé sans que son
  objet ait changé (QUA-067 juge Gemini, il est retombé pour un message de
  lancement).
- **Briques existantes réutilisables** : `coverageOf` et `coverageChanges`
  (`packages/drwil/src/coverage.ts`), `obsoleteReasons`
  (`packages/drwil/src/fingerprint.ts`), l'archive
  `.drwil/evidence/attestations/` (167 fichiers, nombre de réattestations par
  contrat).
- **Ce qu'il reste à faire** : l'inventaire chiffré ; par contrat, couvrir
  le module dédié au lieu du fichier carrefour, ou remplacer le « Manuel »
  par un test en dur quand le jugement est mécanique (préférence déjà
  exprimée par le demandeur) ; sans affaiblir QUA-081.
- **Impact si implémenté** : moins de gestes humains par chantier, une
  attestation qui garde son sens.

## Ce qui a changé depuis le scan du 2026-10-21

- **Réalisé** : OPT-2 (attestation qui tombe quand ce qu'elle couvre change,
  QUA-081), OPT-3 (critères et preuves durables), OPT-5 (cohérence de la
  documentation à la clôture), OPT-6 (note de recette conservée) — tous au
  journal.
- **Cadré, pas encore fait** : OPT-1 (consommation de Copilot CLI) devient
  la fiche P0 `docs/projects/consommation-copilot-cli.md`.
- **Toujours valable** : la barrière de fusion (ex-OPT-4, ici OPT-8), plus
  pressante avec la fusion par défaut ; la vue de relecture et l'affichage
  des transitions (ex-OPT-7 et OPT-8, ici OPT-9) ; la publication npm
  (ex-OPT-10, écartée). Les citations de fiche dans le code (ex-OPT-9) restent
  dans `docs/intentions/coherence-de-la-doc.md`, non revérifiées ici.
- **Nouveau** : OPT-1 à OPT-5 naissent des frictions de la file du jour ;
  OPT-6 relance une intention existante dont la condition de reprise est
  remplie. Effet secondaire de QUA-081 (livré par ce scan-là) : il crée la
  friction qu'OPT-4 corrige.

## Roadmap qui en découle (proposée, à valider)

- **Avant de lancer la file P0** : OPT-1, volet cadrage (sept fiches
  complétées, sans code).
- **0.11.2** : la file P0 (OPT-7) dans cet ordre : `fin-des-sous-agents-de-chantier`
  (coût, MEDIUM), OPT-2 puis `fusion-automatique-par-defaut`,
  `consommation-copilot-cli`, `relecture-critique-avant-cloture`,
  `cadrage-en-build` puis `index-par-fiche`, `analyse-d-urgence-des-fiches` ;
  OPT-3 en fiche de correction ; puis les fiches d'optimisation des tests.
- **0.12.0, tôt** : OPT-4, OPT-8 ; OPT-1 volet `check-docs`, OPT-5, OPT-6.
- **0.13.0** : OPT-9.

Limite : valeur et effort sont des estimations de l'agent, tirées du code,
des journaux et de l'historique git ; la cause d'OPT-2 et d'OPT-3 reste à
reproduire (aucune lecture de la forge faite pour ce scan).

## Suite donnée (2026-11-13)

- OPT-1, volet cadrage : fait (puces de hooks et CHANGELOG ajoutés aux sept fiches P0).
- OPT-2 : fait, élargi aux risques RSK-1, RSK-5 et RSK-6 de `docs/audit-risques.md` (journal
  `docs/projects/journal.md`, 2026-11-13, « Le suivi de PR ne dit « verte » que sur la CI de la PR »).
- OPT-3 : fiche `docs/projects/refus-d-attestation-lisible.md`, avec RSK-2, RSK-8 et RSK-9.
- OPT-5 : tranché autrement, fait — la ligne « Unreleased » s'écrit en fin de BUILD
  (journal `docs/projects/journal.md`, 2026-11-13, avec RSK-3).
- OPT-4 : intention `docs/intentions/attestations-qui-tombent-pour-leur-objet.md`, cadrée le 2026-11-13 en
  `docs/projects/journal.md` (0.11.2).
- OPT-6 : relance de `docs/intentions/scope-des-fiches-suit-les-fichiers-decoupes.md`, cadrée le 2026-11-13 en
  `docs/projects/perimetre-prevu-au-cadrage.md` (0.11.2).
