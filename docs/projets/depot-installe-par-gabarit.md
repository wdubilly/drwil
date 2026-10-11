# Projet : le dépôt s'installe depuis son gabarit

**Statut** : en cours — lot 1 fait le 2026-10-12, lot 2 en cours.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - outils/verifier-miroirs.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/miroirs.json
  - outils/installer-depot.mjs
  - outils/installer-depot.test.mjs
  - package.json
  - .drwil/ia-first.json
  - AGENTS.md
  - docs/architecture.md
  - docs/recettes/travailler-en-branche.md
-->

(le code de la CLI n'y est pas tant qu'un lot ne l'exige pas : l'y ajouter
serait un élargissement, dans un commit séparé. Élargi le 2026-10-12 aux
trois documents que nomme le lot 3.)

## 1. Besoin

Ce dépôt tourne sur ses propres copies des fichiers du gabarit
(`.githooks/`, recettes, skills, réglages Claude) : chaque changement se
fait deux fois, et le contrôle `miroirs-gabarit` ne fait que vérifier que
les deux copies restent identiques. Décidé le 2026-10-12 (demandeur) :
**le gabarit devient la seule source, et le dépôt s'installe lui-même**
avec la CLI, comme un projet utilisateur. Gain attendu : chaque chantier
suivant (refactor, passage à l'anglais, fluidité) ne s'écrit qu'une fois,
et l'installation est éprouvée sur un cas réel à chaque changement.

## 2. Hors périmètre

- Le passage à l'anglais et le renommage des fichiers
  (`docs/intentions/livrable-full-english.md`) : chantier suivant, qui
  profitera de celui-ci.
- Le refactor de `packages/drwil/src/index.ts` et `.githooks/etat.mjs`.
- Les fichiers propres au dépôt (`propresAuDepot` de `outils/miroirs.json`) :
  ils restent écrits ici, à la main.

## 3. Contraintes

- `drwil apply` n'écrase jamais un fichier existant : il signale seulement
  la dérive (`auditerApply`, `resoudreDerive` avec confirmation). Rafraîchir
  le dépôt demande un geste non interactif qui remplace les fichiers
  dérivés, sans toucher aux écarts déclarés ni à `.drwil/ia-first.json`.
- Les tests des hooks (`.githooks/*.test.mjs`) restent dans le dépôt et
  testent les copies installées (contrôle `couverture-hooks` à 100 %).
- `miroirs-gabarit` reste le filet pendant la bascule et après : une
  modification faite directement dans une copie doit toujours être refusée.
- QUA-018 (périmètre explicite : dépôt drwil vs livrable gabarit) : rien de
  propre au dépôt ne doit remonter dans le gabarit.
- QUA-019 (pas de contournement d'un contrôle) : les écarts restent
  déclarés avec leur raison, aucun n'est ajouté pour faire passer le
  contrôle.

## 4. Décisions

- **2026-10-12 — Le dépôt s'installe lui-même** (demandeur), plutôt que
  des hooks générés au build : une seule source (le gabarit), installation
  éprouvée sur un vrai cas, `miroirs-gabarit` comme filet.
- **2026-10-12 — Premier chantier de la vague 4** (demandeur) : ordre
  duplication → refactor → anglais → fluidité et voie légère → vue de
  relecture (`docs/projets/en-attente.md`).
- **2026-10-12 — Copies versionnées** (demandeur) : les fichiers du
  gabarit restent versionnés dans le dépôt, rafraîchis par une commande
  (`npm run installer-depot`) et vérifiés par `miroirs-gabarit`, plutôt
  que générés à `npm install`. Raison : un clone frais a ses hooks sans
  étape de plus, la CI ne change pas, et le diff d'une PR montre l'effet
  réel sur un projet installé.

## Contrats concernés

- **QUA-018** — Périmètre explicite : dépôt drwil vs livrable gabarit.
- **QUA-019** — Pas de contournement d'un contrôle bloquant.
- **QUA-004** — Seuils de couverture : les tests des hooks restent à 100 %.

## 5. Points à trancher

Aucun. La langue des fichiers installés après le passage à l'anglais est
posée dans `docs/intentions/livrable-full-english.md` (question 7).

## 6. Lots

- **Lot 1 — Inventaire** [IA] : lancer `drwil apply` en simulation sur une
  copie du dépôt ; lister ce qu'il créerait, laisserait et signalerait en
  dérive, et le rapprocher de `outils/miroirs.json`. Critère de sortie :
  chaque écart entre l'installation et le dépôt est expliqué (écart déclaré,
  fichier propre au dépôt, ou défaut à corriger, chacun dans son commit).
- **Lot 2 — Commande d'installation du dépôt** [IA] : commande non interactive qui réinstalle les fichiers du gabarit sur le
  dépôt (écarts déclarés et `propresAuDepot` préservés), avec ses tests.
  Critère de sortie : modifier un hook dans le gabarit puis lancer la
  commande suffit à rendre `miroirs-gabarit` et `couverture-hooks` verts.
- **Lot 3 — Règle et doc** [IA] : `AGENTS.md`, `docs/architecture.md` et la
  recette de travail en branche disent que l'on n'édite que le gabarit ;
  `miroirs-gabarit` indique la commande à lancer quand une copie dérive.
  Critère de sortie : `node .githooks/run-checks.mjs` vert, un essai de
  modification directe d'une copie refusé avec le bon message.

## 7. Inventaire (lot 1, 2026-10-12)

Méthode : `drwil init --force --name drwil --ci github --tools
claude,codex,gemini --layers "" --no-git` sur une copie du dépôt
(`git archive HEAD`), puis diff exact avec le dépôt. `apply --dry-run` ne
suffit pas : sa dérive est grossière (nombre de lignes, sections `##`) et
ne voit pas 4 des 17 écarts déclarés.

- **Identiques** : tous les fichiers installés hors écarts, y compris
  `.claude/settings.json` (variable `stackAllowJson` rendue à l'identique),
  `CLAUDE.md`, `GEMINI.md`, `.github/pull_request_template.md`.
- **Différents** : exactement les 17 écarts déclarés de
  `outils/miroirs.json`, plus `.drwil/ia-first.json`.
- **Rien de supprimé** : le dépôt n'a pas de manifeste des fichiers
  installés, donc aucun fichier n'est retiré comme obsolète.
- **Hors installation** : les modules optionnels
  (`.githooks/creer-release.mjs`, `.githooks/tableau-de-bord.mjs`) se copient à la main ; la commande du lot 2 doit
  les rafraîchir aussi.
- **Défaut corrigé** (commit séparé) : `layers` listait cinq couches sans
  dossier, héritées du premier commit ; elles auraient créé cinq
  `AGENTS.md` sans objet.
- **À ne pas faire** : lancer `init` sur le dépôt. `writeConfig` réécrit
  toujours `.drwil/ia-first.json` (même sans `--force`) et remet
  `layerPrefixes`, `codePrefixes`, `extraCodeFiles`, `extraCodeGlobs`,
  `ciFiles` à leurs défauts : la commande du lot 2 ne touche pas la config.
  Défaut du livrable signalé, hors de ce chantier (le code de la CLI n'est
  pas dans le cadrage).

## 8. Reprise

- **Dernier état** (2026-10-12) : lot 1 fait (inventaire ci-dessus).
- **Travail non commité** : aucun.
- **Prochaine étape** : lot 2, commande d'installation du dépôt.
