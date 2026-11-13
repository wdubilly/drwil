# Projet : les fichiers dérivés du périmètre sont admis d'office, sans élargissement ni règle touchée

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/scope-des-fiches-suit-les-fichiers-decoupes.md` (OPT-6 de `docs/decouverte-valeur.md`, scan du 2026-11-12)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-derived.mjs
  - packages/drwil/templates/common/base/.githooks/scope.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/scope-gate-texts.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs-workstreams.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/close-journal.mjs
  - packages/drwil/templates/common/base/.githooks/close-texts.mjs
  - packages/drwil/templates/common/tools/claude/.claude/hooks/scope-reminder.mjs
  - packages/drwil/templates/common/base/docs/ia-first/7-scoping-reminder.md
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .githooks/scope-derived.mjs
  - .githooks/scope.mjs
  - .githooks/scope-gate.mjs
  - .githooks/scope-gate-texts.mjs
  - .githooks/check-docs-workstreams.mjs
  - .githooks/close.mjs
  - .githooks/close-journal.mjs
  - .githooks/close-texts.mjs
  - .claude/hooks/scope-reminder.mjs
  - .githooks/scope.test.mjs
  - .githooks/scope-gate.test.mjs
  - .githooks/close.test.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/test/claude-hooks.test.mjs
  - docs/ia-first/7-scoping-reminder.md
  - docs/projects/model-brief.md
  - docs/projects/kit-mechanics.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Un chantier s'arrête encore, souvent, sur un fichier absent du bloc `scope` de sa fiche alors qu'il découle d'un
fichier qui y est : le test qui importe un module cité, un fichier du `**Périmètre**` d'un contrat que la fiche
touche, le fichier né de la découpe d'un fichier du scope (plafond de 200 lignes), la copie ou la source de gabarit
d'un fichier cité. Le scan de valeur du 2026-11-12 compte 72 commits d'élargissement du périmètre depuis le
2026-10-22 ; chacun coûte un sondage, un commit séparé et une reprise. Décidé le 2026-11-13 : la barrière de
périmètre admet ces fichiers d'office, sans rouvrir l'auto-élargissement que QUA-019 (pas de contournement d'un
contrôle) et `docs/intentions/contournements-restants.md` ferment : jamais un fichier de règles, chaque admission
dite au commit et comptée à la clôture.

## Critères d'acceptation

- En BUILD, la barrière de périmètre (`.githooks/scope-gate.mjs`, à la validation et au rejeu de la branche), le
  rappel de cadrage de `check-docs` et la garde d'écriture de l'agent (`.claude/hooks/scope-reminder.mjs`)
  admettent d'office, comme s'il était au bloc `scope`, un fichier dérivé d'un fichier du scope de la fiche active,
  et seulement l'un de ces quatre cas : (1) un fichier de test dont le texte importe ou cite le chemin d'un module
  couvert par le scope ; (2) un fichier cité aux champs `**Périmètre**` ou `**Tests**` d'un contrat que la fiche
  cite (critères ou « Contrats modifiés ») ; (3) un fichier neuf sur la branche, dans le dossier d'un fichier du
  scope, dont le nom commence par le nom de ce fichier suivi d'un tiret, et que ce fichier importe (sa découpe) ;
  (4) la source de gabarit d'une copie citée (sens inverse de `scopeMirrors`) — contrat à créer
- Aucun fichier de règles n'est admis d'office : registre des contrats, fichiers de `rulesFiles`
  (`.githooks/detour-rules.mjs` : hooks hors tests, `.drwil/ia-first.json`, CI, et leurs sources de gabarit), consignes
  des assistants (`AGENTS.md` de toute couche, `CLAUDE.md`, `GEMINI.md`, `docs/ia-first.md`, `docs/ia-first/`),
  réglages et hooks des assistants (`.claude/`, `.gemini/`, .github/hooks/) ; un tel fichier hors du scope reste
  refusé comme aujourd'hui, et le refus dit qu'il est un fichier de règles — contrat à créer
- Chaque admission est dite au commit qui l'utilise (avertissement qui nomme le fichier, le cas et le fichier du
  scope dont il dérive, affiché quel que soit le réglage `scopeGate`, jamais un échec à lui seul) ; à la clôture,
  `node .githooks/close.mjs` compte les fichiers de la branche admis d'office et écrit leur nombre et leur liste dans
  l'entrée du journal du chantier ; `--check` les annonce sans rien écrire — contrat à créer
- Le rappel de cadrage reste vrai pour tout autre fichier : un fichier de code jamais cité ni dérivé est refusé — `QUA-016`
- Après la clôture, jusqu'à la fusion, un fichier admis d'office par la fiche supprimée reste couvert comme ceux
  qu'elle citait ; un fichier jamais cité ni dérivé reste refusé — `QUA-173`

## Contrats modifiés

- `QUA-016` — ancien critère : « Tout fichier de code indexé est couvert par le bloc `scope` d'une fiche de `docs/projects/` » — raison : un fichier dérivé d'un fichier du scope (quatre cas fermés, jamais un fichier de règles) est couvert d'office (validé le 2026-11-13)
- `QUA-173` — ancien critère : « un fichier que jamais aucune fiche n'a cité reste refusé (QUA-016) » — raison : un fichier admis d'office par la fiche supprimée à la clôture reste couvert jusqu'à la fusion, comme ceux qu'elle citait (validé le 2026-11-13)
- `.githooks/scope.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/scope-gate.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/scope-gate-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/check-docs-workstreams.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close-journal.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)
- `.githooks/close-texts.mjs` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-13)

## 2. Hors périmètre

- Admettre d'office la carte d'architecture ou `docs/projects/kit-mechanics.md` : le modèle de fiche les rappelle
  déjà au cadrage ; ils restent à citer.
- Lire un chemin de dossier comme un dossier (joker implicite), ou faire hériter un fichier découpé du scope de son
  ancêtre sans les conditions du cas (3) : pistes (a) et (c) de l'intention, écartées.
- Écrire d'office les fichiers dérivés dans le bloc `scope` de la fiche : la fiche reste écrite par un humain ou
  l'agent au cadrage, jamais par la barrière.
- Un seuil d'alerte sur le nombre d'admissions (pas de seuil, comme pour les élargissements,
  `docs/projects/limites-classees-par-lien.md`).
- Changer la règle d'élargissement en BUILD (QUA-213, QUA-214) : un fichier non dérivé s'ajoute toujours par un
  commit de cadrage séparé, rendu visible.
- Les exceptions du détour et de la réouverture (QUA-050, QUA-117) : inchangées ; un fichier de règles y attend
  toujours le oui de l'humain.

## 3. Contraintes

- Reproduire d'abord : un test de la barrière où un test qui importe un module cité, hors du scope, est refusé
  contre le code actuel.
- Une seule définition du fichier dérivé et du fichier de règles, dans .githooks/scope-derived.mjs (neuf), lue par la
  barrière, `check-docs`, la garde d'écriture de l'agent et la clôture ; elle réutilise `rulesFiles`
  (`.githooks/detour-rules.mjs`) sans le modifier (le détour garde sa propre liste, QUA-050).
- Au rejeu de la branche (CI, pre-push), la dérivation se juge sur les fichiers lus au commit jugé (`git show
  <commit>:<fichier>`), jamais sur la copie de travail ; au moindre doute (fichier illisible, fiche absente), le
  fichier n'est pas admis : refus comme aujourd'hui, jamais un succès par défaut (QUA-013).
- `.githooks/scope.mjs` (199 lignes) et `.githooks/scope-gate.mjs` (195 lignes) sont au plafond : la logique neuve va
  dans .githooks/scope-derived.mjs (neuf), ils n'en gardent que l'appel.
- Le compte de la clôture est le socle que `docs/projects/limites-classees-par-lien.md` étend (élargissements et
  catégories des limites, même ligne du journal) : cette fiche passe avant elle.
- On édite le gabarit puis `npm run installer-depot` (QUA-018).

## 4. Décisions

- D1 (2026-11-13) : la barrière admet d'office les fichiers dérivés (plutôt qu'un avertissement de `check-docs` ou un
  ajout au scope sur un oui) — réponse du demandeur : « admission d'office par la barrière de périmètre ».
- D2 (2026-11-13) : quatre cas fermés de dérivation : tests qui importent un module cité ou figent ses messages
  (lu : le test cite le chemin du module, ou il est au champ `**Tests**` d'un contrat touché), fichiers du
  `**Périmètre**` des contrats touchés, découpe d'un fichier du scope, copie gabarit/miroir — réponse du demandeur.
- D3 (2026-11-13) : jamais pour un fichier de règles (registre des contrats, hooks de gouvernance, `AGENTS.md`…) ;
  « hooks de gouvernance » se lit comme la liste `rulesFiles` déjà en vigueur pour le détour (tout `.githooks/` hors
  tests), complétée des consignes et réglages des assistants — réponse du demandeur.
- D4 (2026-11-13) : chaque admission est dite au commit et comptée à la clôture, au journal — réponse du demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la dérivation et sa barrière** [IA] : test en échec d'abord ; .githooks/scope-derived.mjs (neuf) (quatre
  cas, fichiers de règles exclus) ; appel par la barrière (validation et rejeu), `check-docs`, la garde d'écriture et
  `closedBriefPatterns` ; avertissement au commit ; contrats créés, QUA-016 et QUA-173 réécrits ;
  `npm run installer-depot`. Critère de sortie : tests des hooks verts.
- **Lot 2 — le compte à la clôture** [IA] : `.githooks/close.mjs` et `--check` comptent et listent les admissions, ligne écrite
  dans l'entrée du journal ; rappel de cadrage et modèle de fiche disent les quatre cas ; carte et
  `docs/projects/kit-mechanics.md` (hook neuf). Critère de sortie : `node .githooks/run-checks.mjs` sans échec,
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-13) : cadrage terminé.
- **Prochaine étape** : [humain] `/drwil-start`.
