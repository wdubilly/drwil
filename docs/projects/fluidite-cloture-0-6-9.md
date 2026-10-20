# Projet : 0.6.9, la fluidité de la clôture

**Statut** : cadré le 2026-10-20, décisions confirmées par le demandeur le 2026-10-20.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - .githooks/state.mjs
  - .githooks/state-texts.mjs
  - .githooks/note.mjs
  - .githooks/note.test.mjs
  - packages/drwil/src/criteria.ts
  - packages/drwil/test/criteria.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/note.mjs
  - .claude/hooks/prompt-hook.mjs
  - .claude/skills/drwil-note/SKILL.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil-note/SKILL.md
  - outils/miroirs.json
  - docs/contracts.md
  - docs/ia-first.md
  - docs/intentions/README.md
  - docs/intentions/notes.md
  - .drwil/ia-first.json
  - .githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/agent.ts
  - docs/architecture.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/docs/intentions/README.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
-->

(cadrage : la clôture et l'état, le message du critère humain, la commande
de note, leurs gabarits livrés et miroirs, les tests, la doc et les
contrats ; la cohérence de la documentation à la clôture et la consommation
des autres outils restent dans leurs intentions.)

Cible : drwil-le-livrable (gabarit `packages/drwil/templates/` et
`packages/drwil/src/`), jamais une copie installée (QUA-018, dépôt contre
livrable).

## 1. Besoin

Trois frictions relevées le 2026-10-19 (chantier « Gemini CLI tenu »), à
régler ensemble :

1. `.githooks/close.mjs` refuse sèchement depuis BUILD sans dire le chemin
   (`docs/intentions/cloture-chemin-guide.md`).
2. `verify` répond « not-durable » sans dire s'il faut ajouter ou retirer
   `[humain]` (`docs/intentions/critere-humain-message-clair.md`).
3. Aucun geste court pour noter une idée en plein chantier
   (`docs/intentions/note-a-tout-moment.md`).

## Critères d'acceptation

- Depuis une activité autre que CLOSING, `.githooks/close.mjs` et `.githooks/close.mjs --check`
  nomment le chemin restant jusqu'à CLOSING (commandes `state.mjs move`
  dans l'ordre) et, si l'évidence date d'un autre commit que HEAD, la
  commande qui la renouvelle — `QUA-073`
- L'avertissement « fiche supprimée sans que son intention soit touchée »
  compare l'intention à toute la branche depuis la base de fusion, pas au
  seul commit de clôture — `QUA-073`
- `verify` dit, pour un critère « not-durable », s'il faut ajouter `[humain]`
  (contrat à attester) ou le retirer (contrat entièrement automatisé), et
  nomme le contrat — `QUA-070`
- une commande de terminal de note ajoute une ligne datée à
  le fichier de notes des intentions, sans changer d'activité ni toucher à la fiche
  active, depuis n'importe quel outil — `QUA-071`
- Le skill `/drwil-note` appelle cette commande et ne code rien (une note
  est toujours une intention) — `QUA-061`
- Compatibilité Claude Code prouvée sans session réelle : le skill
  `/drwil-note` a la même forme que les autres skills `/drwil-*` (test du
  gabarit) et les hooks Claude Code existants, rejoués avec leurs entrées
  simulées, donnent la même sortie qu'avant — `QUA-072`
- Un essai réel d'une clôture depuis BUILD, en suivant seulement les
  messages, aboutit sans lire le code, sous Copilot CLI ou en terminal ;
  l'essai sous Claude Code est reporté faute de crédit — [humain] `QUA-048`

## 2. Hors périmètre

- Avance automatique jusqu'à CLOSING (décision par défaut : message seul).
- Message du critère humain à l'élargissement du cadrage.
- Commandes `/drwil-*` sous Gemini CLI
  (`docs/intentions/skills-et-sondage-sous-gemini.md`).
- La cohérence de la documentation à la clôture
  (`docs/intentions/cloture-coherence-doc.md`).

## 3. Contraintes

- `.githooks/close.mjs` ne commite, ne pousse, ne fusionne rien et n'écrit pas
  l'état (QUA-048) ; les transitions restent voisines (QUA-019, aucun
  contrôle contourné).
- Claude Code reste l'outil de référence : aucune régression de ses hooks
  (`.claude/hooks/prompt-hook.mjs`) ni de ses skills ; Copilot CLI et Gemini
  CLI profitent des mêmes messages sans code propre à un outil.
- Pas de session Claude Code réelle disponible (plus de crédit) : toute
  preuve Claude Code passe par des tests déterministes, sans appel au modèle.
- Une note est une intention, jamais un ordre de coder (QUA-061).
- On n'édite que le gabarit livré et son miroir déclaré (`miroirs-gabarit`).
- Ne jamais écrire `.drwil/state.json` (si présent) à la main.

## 4. Décisions

Confirmées par le demandeur le 2026-10-20 :

- [décision] Clôture : un message qui donne les commandes, pas d'avance
  automatique.
- [décision] Critère humain : un message par sens, contrat nommé ; pas de
  message à l'élargissement du cadrage.
- [décision] Note : commande de terminal (tous outils) plus skill ; fichier
  unique le fichier de notes des intentions, une ligne datée par note, commitée
  sur la branche du chantier, hors de l'index.

## 5. Lots

- **Lot 1 — clôture guidée** : chemin et évidence périmée, comparaison à
  la branche entière, tests sur dépôts git temporaires, gabarit.
- **Lot 2 — critère humain** : messages de `packages/drwil/src/criteria.ts`, tests, doc.
- **Lot 3 — note à tout moment** : le script de note, skill, fichier de notes,
  miroir, tests, doc, contrats.

## 6. Contrats modifiés

- `QUA-048` : ajout de sa ligne **Manuel** (l'essai réel d'une clôture depuis
  BUILD, critère [humain]) ; les critères automatisés du chemin guidé et de
  la comparaison à la branche entière sont portés par le contrat créé
  `QUA-073`, un contrat ne pouvant être à la fois à attester et automatisé.

## 7. Reprise

- **Dernier état** (2026-10-20) : cadré, rien de commencé ; prête.
- **Travail non commité** : cette fiche et la ligne d'index.
- **Prochaine étape** : [humain] lancer le
  chantier (`/drwil-start`).
