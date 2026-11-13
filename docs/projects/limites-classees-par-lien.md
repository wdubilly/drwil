# Projet : une limite hors cadre dit son lien avec le problème, et l'élargissement se compte

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/limites-classees-par-lien.md`

<!-- scope
files:
  - packages/drwil/templates/common/tools/claude/.claude/hooks/limit-poll.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/portable-polls.mjs
  - packages/drwil/templates/common/base/.githooks/state-limits.mjs
  - packages/drwil/templates/common/base/.githooks/state-limits-texts.mjs
  - packages/drwil/templates/common/base/.githooks/state-validate.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-journal.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close-widening.mjs
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/ia-first/8-conduct-rules.md
  - packages/drwil/templates/common/base/docs/ia-first/7-starting-and-closing.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .claude/hooks/limit-poll.mjs
  - .claude/hooks/portable-polls.mjs
  - .githooks/state-limits.mjs
  - .githooks/state-limits-texts.mjs
  - .githooks/state-validate.mjs
  - .githooks/state-texts.mjs
  - .githooks/close.mjs
  - .githooks/close-journal.mjs
  - .githooks/close-texts.mjs
  - .githooks/close-widening.mjs
  - .githooks/state.test.mjs
  - .githooks/close.test.mjs
  - .githooks/close-limits.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - packages/drwil/test/portable-polls.test.mjs
  - AGENTS.md
  - docs/ia-first/8-conduct-rules.md
  - docs/ia-first/7-starting-and-closing.md
  - docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Un chantier part d'un problème précis puis découvre des défauts voisins. Les traiter est utile quand ils tiennent
au problème ; sinon chaque chantier corrige tout autour de lui : plus de contexte, de fichiers, de cycles de
vérification et de risque de régression. Le sondage des limites (`drwil-limite`, QUA-253) présente aujourd'hui
toutes les limites pareilles : le 2026-11-12, une limite signalée « non bloquante » (`.githooks/wait-command.mjs`) a
été traitée quand même, au prix d'un fichier, d'une puce « Contrats modifiés » et d'un cycle de vérification ; le
scan de valeur compte 72 commits d'élargissement depuis le 2026-10-22, sans aucun chiffre tenu à la clôture.
Chaque limite dit désormais son lien avec le problème (bloquant, lié, périphérique), appuyé sur un fait, et la
clôture compte les élargissements. La décision reste celle de l'humain, sans recommandation ; aucun plafond.

## Critères d'acceptation

- Le hook du sondage `drwil-limite` (`.claude/hooks/limit-poll.mjs`, et sous Copilot CLI, Gemini CLI, Codex et
  Cursor par `.claude/hooks/portable-polls.mjs`) refuse avant affichage une question sans catégorie lisible —
  « bloquant », « lié » ou « périphérique » (« blocking », « related », « peripheral »), suivie du fait qui la
  fonde — et lit la catégorie dans le texte de la question (sous Copilot CLI, dans la description du champ) ; les
  deux réponses restent « Traiter maintenant » et « Noter en intention », sans recommandation ni réponse par défaut,
  quelle que soit la catégorie — contrat à créer
- La catégorie lue est enregistrée dans l'état avec la réponse de l'humain (`limits: [{ intent, choice, category }]`),
  listée par le contexte de BUILD, et un état antérieur sans catégorie reste valide — contrat à créer
- À la clôture, `node .githooks/close.mjs` mesure le bloc `scope` de la fiche à son lancement (sa version à la base
  de fusion de la branche) et au moment de la clôture, et écrit dans l'entrée du journal du chantier le nombre et
  la liste des chemins ajoutés, avec, pour chaque limite enregistrée, sa catégorie et la réponse de l'humain ;
  `--check` l'annonce sans rien écrire ; aucun seuil, jamais un refus — contrat à créer
- Le sondage reste la seule décision de l'humain, une question par limite, à exactement deux réponses — `QUA-253`
- Les consignes de conduite (`AGENTS.md`, `docs/ia-first/8-conduct-rules.md`) et le rappel de BUILD disent les trois
  catégories, leur critère et que la décision reste humaine — `QUA-253`

## Contrats modifiés

- `QUA-253` — ancien critère : « une question par limite (4 au plus par sondage), qui nomme un chemin distinct `docs/intentions/<nom>.md` […] à exactement deux réponses » — raison : chaque question porte aussi la catégorie de la limite (bloquant, lié, périphérique) et le fait qui la fonde, lue et enregistrée par le hook ; un sondage sans catégorie est refusé (validé le 2026-11-13)
- `.githooks/state-limits.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-validate.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/state-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close-journal.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Un seuil d'alerte ou un plafond d'élargissements : pas pour l'instant ; le chiffre au journal dira plus tard s'il
  en faut un (nouvelle intention).
- Une recommandation tirée de la catégorie, un ordre des réponses imposé par elle, ou une catégorie qui choisit à la
  place de l'humain.
- Les limites dans le cadre (traitées sur le champ) et le détour (QUA-050) : inchangés.
- Les fichiers admis d'office par la barrière (`docs/projects/perimetre-prevu-au-cadrage.md`) : déjà comptés par
  elle ; cette fiche ajoute à la même ligne du journal les élargissements et les catégories.

## 3. Contraintes

- Placée après `docs/projects/perimetre-prevu-au-cadrage.md`, dont elle étend le compte de la clôture.
- Reproduire d'abord : un test du hook où un sondage sans catégorie est accepté contre le code actuel.
- Le compte se lit par Git (`git show <base>:<fiche>` puis la fiche courante, `readBlock` de `.githooks/scope.mjs`) ;
  base introuvable ou fiche absente de la base : le compte dit « non mesuré » et pourquoi, jamais zéro par défaut
  (QUA-013).
- `.githooks/state-messages-fr.mjs` (200 lignes) est plein : les textes neufs vont dans
  .githooks/state-limits-texts.mjs (neuf) ; le compte de la clôture dans .githooks/close-widening.mjs (neuf).
- La parité des outils (QUA-266) : mêmes refus sous Copilot CLI, Gemini CLI, Codex et Cursor ; un test chacun.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- D1 (2026-11-13) : la catégorie est un champ lu par le hook du sondage `drwil-limite` ; un sondage sans catégorie
  est refusé — réponse du demandeur (question 1 de l'intention).
- D2 (2026-11-13) : le compte des élargissements est mesuré par `node .githooks/close.mjs` sur le bloc `scope` de la
  fiche entre lancement et clôture, et écrit au journal — réponse du demandeur (question 2).
- D3 (2026-11-13) : pas de seuil d'alerte pour l'instant — réponse du demandeur (question 3).
- D4 (2026-11-13) : la décision reste humaine, sans recommandation — réponse du demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la catégorie au sondage** [IA] : test en échec d'abord ; lecture et refus dans le hook (Claude Code et
  outils portables), enregistrement dans l'état, contexte de BUILD, consignes ; QUA-253 réécrit, contrats créés ;
  `npm run installer-depot`. Critère de sortie : tests de l'état et des hooks verts.
- **Lot 2 — le compte à la clôture** [IA] : .githooks/close-widening.mjs (neuf), ligne du journal et `--check` ; carte et
  `docs/projects/kit-mechanics.md` (hook neuf). Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.
