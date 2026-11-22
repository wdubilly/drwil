# Projet : un priorisateur par urgence et valeur

**Statut** : cadré le 2026-11-22 — points à trancher.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/priorisateur-urgence-et-valeur.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/prioritize.mjs
  - packages/drwil/templates/common/base/.githooks/prioritize-texts.mjs
  - packages/drwil/templates/common/base/.githooks/briefs-order.mjs
  - packages/drwil/templates/common/base/.githooks/briefs-overlap.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prioritize-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/prioritize/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - .githooks/prioritize.mjs
  - .githooks/prioritize-texts.mjs
  - .githooks/prioritize.test.mjs
  - .githooks/briefs-order.mjs
  - .githooks/briefs-overlap.mjs
  - .claude/hooks/prioritize-poll.mjs
  - .claude/skills/prioritize/SKILL.md
  - .claude/skills/start-a-workstream/SKILL.md
  - docs/projects/model-brief.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - packages/drwil/CHANGELOG.md
-->

(Scope provisoire : `.githooks/prioritize.mjs` (à créer), ses textes, le hook de sondage et le skill sont des noms proposés, selon P3 ;
s'y ajoutent les hooks des autres outils si le sondage passe par eux, à relire au lancement.)

## 1. Besoin

Demande du 2026-11-22 : « faut prioriser aussi… un orchestrateur ou un prioriseur qui indiquerait ce qui devrait être
fait par ordre d'urgence », précisé « priorisateur par urgence ET valeur ». Il lit tout ce qui est en attente (fiches
et intentions de l'index, défauts ouverts et leur gravité — ce qui casse un adoptant d'abord —, dépendances « après
la fusion de… » et fichiers communs entre fiches, coût mesuré en temps et tokens dans `.drwil/usage.jsonl`, gain
attendu pour l'adoptant, y compris sur les dimensions de son produit : UX, applicatif, données… — précision
du même jour), propose un ordre de l'index avec la raison de chaque rang ; l'humain le valide par un
sondage ; l'index est alors mis à jour et `/drwil-start` le suit. Il conseille, il ne lance jamais. Livrable d'abord
(QUA-018).

Relevé dans le code le 2026-11-22 :

- Ordre de l'index tenu à la main (`docs/projects/pending.md`, « Fiches cadrées »), suivi par le sondage de
  lancement (QUA-160, `.githooks/briefs-order.mjs`, `cadredOrder`, `pollComparator`). Priorités `[P0]`–`[P3]`
  facultatives, non vérifiées.
- Lecture des fiches, maturité, décisions ouvertes, lots : `.githooks/briefs.mjs` (186 lignes, proche du plafond de
  200, QUA-001) et ses découpes (`.githooks/briefs-lots.mjs`, `.githooks/briefs-intents.mjs`, `.githooks/briefs-criteria.mjs`).
- Recouvrement de scopes entre fiches : `.githooks/briefs-overlap.mjs` (`scopesOverlap`).
- Coût : `.drwil/usage.jsonl` (une ligne par chantier ou lot : tokens, durée, modèle), écrit par
  `.githooks/consumption.mjs`.
- `docs/projects/analyse-d-urgence-des-fiches.md` (prête, cadrée le 2026-11-12) : section « Urgence » exigée d'une
  fiche P0, avertissement de `check-docs`. Ses critères citent QUA-088, qui désigne la garantie non tenue : écart à
  relever quand elle sera reprise.
- Skill `drwil-value` (`docs/recipes/discover-product-value.md`) : analyse de valeur produit, à la demande, dans
  `docs/value-discovery.md` (si présent), sans toucher à l'index.
- Aucun champ des fiches ne porte une gravité, un gain ou une dépendance lisibles par une machine : les « après la
  fusion de… » sont en prose (sections Contraintes et Reprise).

## Critères d'acceptation

(Provisoires, à reprendre une fois P1 à P9 tranchés ; contrats créés par le chantier.)

- À la demande, le priorisateur lit les fiches et intentions ouvertes de l'index et rend un ordre proposé, chaque
  rang avec sa raison (urgence, valeur, coût, dépendances, recouvrement) ; il n'écrit rien sans réponse de
  l'humain — `QUA-nouveau-1`
- Une fiche qui dépend de la fusion d'une autre n'est jamais proposée avant elle ; deux fiches au scope commun sont
  signalées — `QUA-nouveau-1`
- L'ordre proposé n'est écrit dans l'index qu'après le oui de l'humain au sondage, lu par le hook (comme QUA-235) ;
  ensuite `/drwil-start` liste les fiches dans ce nouvel ordre (QUA-160 inchangé) — `QUA-nouveau-2`
- Le priorisateur ne lance jamais un chantier ni ne change l'état — `QUA-nouveau-1`
- Une donnée absente (pas de consommation mesurée, pas de gravité) est dite « non mesurée », jamais devinée
  (QUA-013) — `QUA-nouveau-1`

## Contrats modifiés

(À valider par le demandeur.)

- Aucun prévu ; QUA-160 reste tel quel (l'ordre de l'index reste la seule source de `/drwil-start`). À revoir si P6
  fusionne `docs/projects/analyse-d-urgence-des-fiches.md`.

## 2. Hors périmètre

- Lancer un chantier de lui-même (orchestrateur), sauf décision contraire en P8.
- Changer la maturité, le risque ou le contenu d'une fiche.
- La découverte de valeur produit elle-même (`drwil-value`).

## 3. Contraintes

- **Principes directeurs** (demandeur, 2026-11-22, en ses mots) : « sécure, optimisé et performance, rapidité, tester
  et prouver, évolutivité et fiabilité ». Six axes : sécurité, performance, rapidité, preuve, évolutivité,
  fiabilité. Chaque lot dit l'axe qu'il sert et ce qui pourrait en dégrader un autre (section 6). La rapidité ne
  s'achète jamais par un contrôle sauté ou désactivé (QUA-019) : « vite, mais prouvé ».
- QUA-018 : gabarit d'abord, puis `npm run installer-depot`.
- Le lancement reste un geste humain (`AGENTS.md`, QUA-142).
- Le sondage de validation doit marcher sous Claude Code et Copilot CLI (puis les autres), comme les sondages
  existants (QUA-266).
- `.githooks/briefs.mjs` proche du plafond : modules ajoutés.
- Couverture à 100 % des hooks (QUA-004).

## 4. Décisions

Aucune encore (cadrage du 2026-11-22, rien de tranché).

## 5. Points à trancher

- [décision] **P1 — Critères et pondération.** Alternatives : (a) règles fixes et lisibles (défaut qui casse un
  adoptant > dépendance bloquante > P0 > gain/coût) ; (b) score pondéré réglable dans `.drwil/ia-first.json` ;
  (c) jugement de l'agent, raisons écrites. Recommandation : (a) pour l'ordre de base, raisons écrites par rang ; (b)
  si l'usage le demande.
- [décision] **P2 — Sources et forme des données.** Les dépendances, la gravité et le gain sont en prose aujourd'hui.
  Alternatives : (a) champs nouveaux dans le modèle de fiche (`**Dépend de**`, `**Gravité**`, `**Gain**`) ; (b)
  lecture de la prose par l'agent ; (c) mixte : champ « Dépend de » seul, le reste en jugement. Recommandation : (c),
  la dépendance est le seul critère qui doit être sûr.
- [décision] **P3 — Forme.** Alternatives : (a) commande Node (`node .githooks/prioritize.mjs`) qui calcule et un
  skill qui rédige les raisons et pose le sondage ; (b) skill seul (agent) ; (c) commande seule. Recommandation : (a),
  le calcul vérifiable par test, le jugement par l'agent.
- [décision] **P4 — Validation par sondage.** Alternatives : (a) oui/non sur l'ordre entier ; (b) oui, non, ou
  réordonner à la main ; (c) un oui par rang. Recommandation : (a) ou (b), un seul geste.
- [décision] **P5 — Fréquence.** Alternatives : (a) à la demande ; (b) proposé à chaque clôture (rappel CLOSING) ;
  (c) les deux. Recommandation : (c), la clôture change l'état du reste.
- [décision] **P6 — Sort de `docs/projects/analyse-d-urgence-des-fiches.md`.** Alternatives : (a) fusionnée ici (la
  section « Urgence » devient une source du priorisateur) ; (b) élargie (gravité et gain dans la même section) ; (c)
  gardée telle quelle, lancée avant. Recommandation : (a) ou (b), pour ne pas avoir deux mécanismes d'urgence ; son
  critère cite QUA-088 à tort (à corriger dans tous les cas).
- [décision] **P7 — Rapport avec `drwil-value`.** Alternatives : (a) le priorisateur lit `docs/value-discovery.md` (si présent) s'il
  existe ; (b) les deux restent séparés. Recommandation : (a).
- [décision] **P8 — Orchestrateur** (lancer automatiquement) : hors périmètre ou non. Recommandation : hors
  périmètre ; il conseille, l'humain lance (AGENTS.md : lancer un chantier est une décision humaine).
- [décision] **P9 — Intentions dans l'ordre.** Les intentions (`[décision]`) sont-elles classées avec les fiches ou à
  part (une intention ne se lance pas) ? Recommandation : classées à part, comme « à cadrer ensuite ».
- [décision] **P11 — Les six axes comme critères de valeur.** Les principes directeurs (sécurité, performance,
  rapidité, preuve, évolutivité, fiabilité) servent-ils de grille de valeur au priorisateur (chaque fiche dit l'axe
  servi et l'axe exposé) ? Alternatives : (a) oui, champ lu dans chaque fiche ; (b) oui, jugé par l'agent ; (c) non.
  Recommandation : (b) d'abord, (a) si P2 retient des champs.
- [décision] **P12 — Dimensions du produit de l'adoptant** (précision du demandeur, 2026-11-22 : « pour l'adoptant et
  [le] chat les dimensions type UX au top de ce qu'il est en train de produire, et les thèmes applicatif, data, … »).
  La valeur s'évalue aussi sur ce que l'adoptant produit (UX, applicatif et métier, données, sécurité,
  performance…), pour proposer ce qui améliore le plus son application, pas seulement le kit. Comment ces dimensions
  sont-elles déclarées ? Alternatives : (a) à l'adoption (skill `drwil-adopt`), liste écrite dans
  `.drwil/ia-first.json` ; (b) déduites des préfixes de contrats par thème (le catalogue livre `APP-` et `SEC-` ;
  un projet adoptant utilise aussi `UI-`, `DAT-`, `SRC-`), des couches (`layers`) et des fiches ; (c) les deux,
  déduites puis confirmées par l'humain. Lien avec le skill `drwil-value` : (a) il fournit la valeur par dimension
  (`docs/value-discovery.md` (si présent)) ; (b) le priorisateur le remplace pour l'ordre. Recommandation : (c) et
  `drwil-value` comme source, une seule analyse de valeur.
- [décision] **P10 — Priorité et version cible.**

## 6. Increments

- **Lot 1 — ordre proposé** [IA] : lecture des sources, calcul, raisons, dépendances et recouvrements ; aucune
  écriture. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent` en
  `GOVERNANCE: PASS`.
- **Lot 2 — validation et écriture de l'index** [IA] : sondage lu par le hook, réécriture de la section « Fiches
  cadrées », `/drwil-start` vérifié dans le nouvel ordre. Critère de sortie : idem.
- **Lot 3 — essai réel** [humain] : une passe sur ce dépôt, ordre jugé par le demandeur.

Grille des six axes par lot :

- **Lot 1** sert la rapidité (ce qui compte d'abord) et la preuve (ordre calculé, testé) ; peut dégrader la
  fiabilité si une dépendance en prose est mal lue (P2).
- **Lot 2** sert la preuve (oui de l'humain lu par le hook) ; peut dégrader la fiabilité si la réécriture de l'index
  perd une ligne, et l'évolutivité si l'index par fiche (`docs/projects/index-par-fiche.md`) change sa forme.
- **Lot 3** sert la preuve (essai réel) ; aucun axe dégradé.

## 7. Reprise

- **Dernier état** (2026-11-22) : cadrage écrit, points P1 à P12 ouverts.
- **Prochaine étape** : [décision] trancher P1 à P12 avec le demandeur.
