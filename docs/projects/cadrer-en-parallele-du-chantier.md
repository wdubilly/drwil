# Projet : cadrer en parallèle du chantier, dans un worktree, avec sa propre PR

**Statut** : cadré le 2026-11-22 — points à trancher.
**Risque** : HIGH
**Maturité** : à affiner
**Intention** : `docs/intentions/cadrer-en-parallele-du-chantier.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-context-texts.mjs
  - packages/drwil/templates/common/base/.githooks/note.mjs
  - packages/drwil/templates/common/base/.githooks/worktree.mjs
  - packages/drwil/templates/common/base/.githooks/worktree-texts.mjs
  - packages/drwil/templates/common/base/.githooks/scoping-worktree.mjs
  - packages/drwil/templates/common/base/.githooks/scoping-worktree-texts.mjs
  - .githooks/state-context-texts.mjs
  - .githooks/note.mjs
  - .githooks/worktree.mjs
  - .githooks/worktree-texts.mjs
  - .githooks/scoping-worktree.mjs
  - .githooks/scoping-worktree-texts.mjs
  - .githooks/scoping-worktree.test.mjs
  - .githooks/worktree.test.mjs
  - .githooks/note.test.mjs
  - packages/drwil/test/attest-guidance.test.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/scope-a-workstream/SKILL.md
  - .claude/skills/scope-a-workstream/SKILL.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/ia-first/8-conduct-rules.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/CHANGELOG.md
-->

(Scope provisoire : la piste 2 crée `.githooks/scoping-worktree.mjs` (à créer) et ses textes, noms à confirmer ; les chemins exacts du
gabarit des recettes et des règles de conduite sont à relire au lancement. Si seule la piste 1 est retenue, le scope
se réduit aux textes du rappel, à leurs tests et au registre.)

## 1. Besoin

Pendant un chantier (BUILD, VERIFY, CLOSING), le rappel d'état ne propose que `node .githooks/note.mjs`, qui écrit dans
le dossier du chantier (« elle part avec la branche du chantier »). Rien ne dit qu'on peut cadrer une intention ou une
fiche en parallèle, dans un worktree créé depuis la branche principale à jour, avec sa propre petite PR de cadrage.
La pratique a servi trois fois le 2026-11-22 sans gêner le chantier ; l'agent a deux fois dit à tort que c'était
impossible. Pour tout adoptant (livrable d'abord, QUA-018) et pour ce dépôt.

Relevé dans le code le 2026-11-22 :

- `.githooks/state-context-texts.mjs` (gabarit, 117 lignes) : le pied du rappel cite `.githooks/note.mjs` pour toute activité ; aucune
  règle d'activité ne parle d'un cadrage à côté.
- `.githooks/worktree.mjs` (gabarit, **200 lignes, au plafond** QUA-001) : `worktreeLines` (QUA-143) nomme les worktrees frères
  et interdit de les modifier ; `launchInWorktree` (QUA-142, QUA-144 : `worktreeInstall` lancé dans le nouveau
  dossier) ne sert qu'au lancement d'un chantier. Toute fonction nouvelle va dans un module à part.
- `.githooks/note.mjs` (QUA-071) : ligne dans `docs/intentions/notes.md` du dossier courant, sans commit.
- Le chantier « cadrage-en-build » (clos le 2026-11-19) permet de commiter une fiche ou une intention en BUILD sur la
  branche du chantier (QUA-016) : le cadrage part alors avec la PR du chantier.
- `.githooks/merge-auto.mjs` (QUA-187) et la compétence `scope-a-workstream` font la fusion automatique d'une PR de cadrage.

## Critères d'acceptation

(Provisoires : à confirmer selon P1 et P2 ; chaque contrat est créé par le chantier, numéro attribué au lancement.)

- En BUILD, VERIFY et CLOSING, le rappel d'état (`node .githooks/state.mjs` et l'injection de début de session) dit
  qu'une intention ou une fiche se cadre aussi dans un worktree créé depuis la branche principale à jour, avec sa
  propre PR, sans toucher au chantier, et donne la commande ; en SCOPING il ne le dit pas ; le texte est le même pour
  tous les outils (aucun code propre à un outil) — `QUA-nouveau-1`
- (si piste 2) Une commande crée le worktree de cadrage depuis la branche principale récupérée (`git fetch`), sur une
  branche `cadrage/<nom>`, y lance `worktreeInstall` s'il est déclaré (comme QUA-144), y laisse l'état neutre
  (SCOPING) et ne touche ni le dossier ni l'état ni la branche du chantier ; un nom déjà pris est refusé — tests sur
  dépôts jetables — `QUA-nouveau-2`
- (si piste 2) Après la fusion de la PR de cadrage, la même commande retire le worktree et sa branche locale ; une PR
  non fusionnée ou un arbre modifié est refusé, rien n'est supprimé — `QUA-nouveau-2`
- Le contrat `QUA-143` reste vrai : le worktree de cadrage est listé comme un worktree du même dépôt — `QUA-143`

## Contrats modifiés

(À valider par le demandeur au cadrage ; aucun n'est modifié sans son oui.)

- `QUA-071` — ancien critère : « Le rappel d'état la cite » (la note seule) — raison proposée : le rappel cite aussi le
  cadrage en parallèle, la note restant le geste d'une ligne (selon P3).

## 2. Hors périmètre

- Le cadrage dans le dossier du chantier (livré par « cadrage-en-build ») : inchangé.
- L'index par fiche (`docs/projects/index-par-fiche.md`) : les conflits sur `docs/projects/pending.md` restent son
  sujet.
- Le nettoyage des worktrees de chantier (`docs/intentions/nettoyage-des-worktrees.md`).
- Lancer un chantier depuis le worktree de cadrage.

## 3. Contraintes

- QUA-018 : on édite le gabarit puis `npm run installer-depot` ; copies du dépôt dans le même commit.
- `.githooks/worktree.mjs` est au plafond de 200 lignes (QUA-001) : un module ajouté, pas une fonction de plus.
- Couverture à 100 % des hooks (QUA-004) ; tests sur dépôts git jetables.
- Aucun appel à une fonction propre à un outil : la commande est un script Node, comme `.githooks/note.mjs`.
- Ne jamais écrire `.drwil/state.json` (si présent) d'un autre dossier.

## 4. Décisions

Aucune encore (cadrage du 2026-11-22, rien de tranché).

## 5. Points à trancher

- [décision] **P1 — Pistes retenues.** Alternatives : (a) piste 1 seule, le rappel nomme le chemin et les commandes
  git ; (b) piste 2 seule, un outil ; (c) les deux, le rappel citant l'outil. Recommandation : (c), en deux lots,
  le rappel d'abord (gain immédiat, coût faible), l'outil ensuite.
- [décision] **P2 — Dépendances dans le worktree** (le pre-push exige `npm ci` ici). Alternatives : (a) lancer
  `worktreeInstall` comme au lancement d'un chantier (QUA-144), coût d'un `npm ci` complet ; (b) lien symbolique
  vers le `node_modules` du dossier principal (rapide, mais versions possiblement différentes de la branche
  principale) ; (c) aucune installation, et un pre-push qui ne l'exige pas sur une branche de cadrage qui ne touche
  que `docs/`. Recommandation : (a), seul chemin qui ne relâche aucun contrôle (QUA-019) ; mesurer la durée au lot 2.
- [décision] **P3 — Rapport avec `.githooks/note.mjs`.** Alternatives : (a) le rappel garde la note pour une idée d'une ligne
  et propose le worktree pour une intention ou une fiche ; (b) le worktree remplace la note en chantier.
  Recommandation : (a), QUA-071 étendu, pas remplacé.
- [décision] **P4 — Chevauchement avec le chantier en cours.** Alternatives : (a) rien de plus qu'un avertissement
  quand l'intention cadrée cite un chemin du scope de la fiche active ; (b) refus ; (c) rien. Recommandation : (a),
  le cadrage ne change aucun code.
- [décision] **P5 — Retrait du worktree.** Alternatives : (a) par l'outil sur une sous-commande explicite après
  fusion ; (b) par `pr-watch` dès qu'il voit la fusion ; (c) laissé au nettoyage des worktrees. Recommandation : (a),
  geste explicite, rien de supprimé sans fusion constatée.
- [décision] **P6 — Fusion automatique de la PR de cadrage par l'outil.** Alternatives : (a) l'outil ne fait que le
  worktree, la PR et `merge-auto` restent à l'agent (compétence `scope-a-workstream`) ; (b) l'outil commite, pousse,
  ouvre la PR et la programme. Recommandation : (a), la compétence existe déjà et reste la seule source.
- [décision] **P7 — Outils autres que Claude Code.** Le rappel est commun à tous ; la commande est un script Node.
  Question : faut-il une compétence ou un prompt par outil (Copilot CLI, Gemini CLI, Codex, Cursor) ou le rappel
  suffit-il ? Recommandation : le rappel suffit au premier lot ; un relevé par outil au second.
- [décision] **P8 — Priorité et version cible.** Aucune donnée par la demande.

## 6. Increments

- **Lot 1 — le rappel dit le chemin** [IA] : tests en échec d'abord ; textes FR et EN du rappel en BUILD, VERIFY,
  CLOSING ; contrat `QUA-nouveau-1` ; `QUA-071` réécrit si P3 (a) ; recette `docs/recipes/working-with-branches.md` ;
  `npm run installer-depot`. Critère de sortie : `node .githooks/run-checks.mjs` sans échec, `drwil verify --agent`
  en `GOVERNANCE: PASS`.
- **Lot 2 — l'outil** [IA] (si P1 b ou c) : `.githooks/scoping-worktree.mjs` (à créer) (créer, retirer), tests sur dépôts jetables,
  `QUA-nouveau-2`, carte `docs/architecture.md`, `docs/projects/kit-mechanics.md`, ligne « Unreleased » du
  CHANGELOG. Critère de sortie : idem.

## 7. Reprise

- **Dernier état** (2026-11-22) : cadrage écrit, points P1 à P8 ouverts.
- **Prochaine étape** : [décision] trancher P1 à P8 avec le demandeur, puis passer la maturité à « prêt ».
