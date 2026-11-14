# Projet : une attestation ne tombe plus pour un changement sans rapport avec son objet

**Statut** : cadré le 2026-11-13.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/attestations-qui-tombent-pour-leur-objet.md` (OPT-4 de `docs/decouverte-valeur.md`, scan du 2026-11-12)

<!-- scope
files:
  - outils/inventaire-attestations.mjs
  - outils/inventaire-attestations.test.mjs
  - packages/drwil/src/config.ts
  - packages/drwil/src/config-tools.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/essentials.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/cli-report.ts
  - packages/drwil/src/cli-report-texts.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/report.test.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/CHANGELOG.md
-->

## 1. Besoin

Une attestation humaine tombe dès qu'un fichier qu'elle couvre change (QUA-081, une attestation tombe quand un
fichier qu'elle couvre change). Quand elle couvre un fichier carrefour, touché par presque tous les chantiers, le
jugement humain est redemandé alors que son objet n'a pas changé : un geste humain par chantier, et une attestation
qui perd son sens à force d'être refaite. QUA-081 reste tel quel ; ce sont les `**Couvre**` trop larges qui se
resserrent, et les jugements mécaniques qui deviennent des tests.

Relevé du 2026-11-13 (archive `.drwil/evidence/attestations/`, 167 fichiers ; changements des fichiers couverts
depuis le 2026-10-22), pour les contrats visés :

| Contrat | Réattestations | Changements des fichiers couverts | Fichier carrefour couvert |
|---|---|---|---|
| QUA-013 | 20 | 15 | `.github/workflows/ia-first.yml` |
| QUA-048 | 12 | 25 | `.githooks/state.mjs` |
| QUA-064 | 11 | 16 | `packages/drwil/src/config.ts` |
| QUA-066 | 10 | 9 | `packages/drwil/src/config.ts` |
| QUA-067 | 10 | 19 | `.githooks/state.mjs` |
| QUA-175 | 7 | 14 | `.githooks/state.mjs` |
| QUA-234 | 7 | 10 | `packages/drwil/src/cli-texts.ts` |

## Critères d'acceptation

- `node outils/inventaire-attestations.mjs` donne, par contrat qui déclare `**Couvre**`, ses fichiers couverts, son
  nombre d'attestations archivées dans `.drwil/evidence/attestations/` et le nombre de commits qui ont changé chaque
  fichier couvert depuis une date donnée, sans rien écrire ; l'inventaire avant et après le chantier est recopié
  dans l'entrée du journal — `QUA-299`
- QUA-013 (contrôle non exécuté n'est pas passé) et QUA-175 (aucun agent ne peut écrire l'acceptation des critères)
  passent en test en dur : leur champ `**Manuel**` et leur `**Couvre**` sont retirés, et un test prouve ce que
  l'humain lisait (QUA-013 : la sortie d'un contrôle non exécuté ne vaut jamais un succès ; QUA-175 : seul
  `.githooks/state-acceptance.mjs` écrit le fichier d'acceptation, parmi les hooks et commandes du kit) — `QUA-013`,
  `QUA-175`
- QUA-048 et QUA-067 ne couvrent plus `.githooks/state.mjs` : ils gardent leurs modules dédiés (`.githooks/close.mjs`,
  `.githooks/close-branches.mjs` ; `.githooks/state-cli.mjs`, `.claude/hooks/scope-reminder.mjs`) — [humain] `QUA-048`, `QUA-067`
- QUA-064 et QUA-066 ne couvrent plus `packages/drwil/src/config.ts` : `usesClaudeTree` passe dans le module dédié
  packages/drwil/src/config-tools.ts (neuf), que QUA-064 couvre ; QUA-066 couvre `packages/drwil/src/render-gemini.ts` —
  [humain] `QUA-064`, `QUA-066`
- QUA-234 ne couvre plus `packages/drwil/src/cli-texts.ts` : les textes du rapport de défaut passent dans le module
  dédié packages/drwil/src/cli-report-texts.ts (neuf), qu'il couvre à sa place — [humain] `QUA-234`
- QUA-081 n'est pas affaibli : un fichier couvert modifié fait toujours tomber l'attestation, et ses tests sont
  inchangés — `QUA-081`

## Contrats modifiés

- `QUA-013` — ancien critère : « **Manuel** : lecture de la sortie du contrôle concerné ; **Couvre** : `.github/workflows/ia-first.yml`, `packages/drwil/src/verdict.ts` » — raison : jugement mécanique, prouvé par un test en dur ; l'attestation retombait à chaque changement du workflow (20 réattestations) (validé le 2026-11-13)
- `QUA-175` — ancien critère : « **Manuel** : vérifier qu'aucune commande, aucun hook ni aucun outil de l'agent n'écrit ce fichier d'acceptation ; **Couvre** : `.githooks/state-acceptance.mjs`, `.githooks/state.mjs` » — raison : le recensement des écrivains du fichier est mécanique, prouvé par un test en dur (validé le 2026-11-13)
- `QUA-048` — ancien critère : « **Couvre** : `.githooks/close.mjs`, `.githooks/close-branches.mjs`, `.githooks/state.mjs` » — raison : `.githooks/state.mjs` est un carrefour sans rapport avec l'essai de clôture jugé (validé le 2026-11-13)
- `QUA-067` — ancien critère : « **Couvre** : `.githooks/state-cli.mjs`, `.githooks/state.mjs`, `.claude/hooks/scope-reminder.mjs` » — raison : retombé pour un simple message de lancement ; le format de Gemini vit dans les modules dédiés (validé le 2026-11-13)
- `QUA-064` — ancien critère : « **Couvre** : `packages/drwil/src/config.ts`, […] » ; **Source de vérité** `packages/drwil/src/config.ts` (`usesClaudeTree`) — raison : `packages/drwil/src/config.ts` est un carrefour ; `usesClaudeTree` passe dans packages/drwil/src/config-tools.ts (neuf), couvert à sa place (validé le 2026-11-13)
- `QUA-066` — ancien critère : « **Couvre** : `packages/drwil/src/config.ts`, `packages/drwil/templates/common/tools/gemini/.gemini/settings.json` » — raison : le rendu propre à Gemini vit dans `packages/drwil/src/render-gemini.ts`, couvert à la place de `packages/drwil/src/config.ts` (validé le 2026-11-13)
- `QUA-234` — ancien critère : « **Couvre** : `packages/drwil/src/cli-report.ts`, `packages/drwil/src/cli-texts.ts`, […] » — raison : les textes du rapport passent dans packages/drwil/src/cli-report-texts.ts (neuf), couvert à la place du carrefour de textes de la CLI (validé le 2026-11-13)

## 2. Hors périmètre

- Une règle générale (« jamais de fichier carrefour dans `**Couvre**` ») vérifiée par un contrôle : écartée, le
  resserrage se décide contrat par contrat.
- Tout contrat absent de la liste ci-dessus (QUA-019, dont le workflow est l'objet même ; QUA-092, QUA-150, QUA-236…) :
  inchangé ici. Si l'inventaire du lot 1 en désigne un autre, il passe par le sondage des limites (`drwil-limite`).
- Modifier QUA-081, `coverageOf` ou `coverageChanges` (`packages/drwil/src/coverage.ts`).
- Livrer l'inventaire aux adoptants : outil du dépôt (`outils/`), pas du gabarit.

## 3. Contraintes

- L'inventaire du lot 1 confirme le tableau ci-dessus avant tout changement ; si un contrat de la liste s'avère
  couvrir son objet même (le fichier carrefour porte ce qu'il juge), il n'est pas changé et sa puce « Contrats
  modifiés » est retirée, en le disant au journal : l'agent peut faire moins que décidé, jamais plus.
- Chaque contrat dont le `**Couvre**` change garde un `**Manuel**` : son attestation tombe une dernière fois (le
  contrat change) et se redonne par le sondage `drwil-attest` dans le chat (QUA-267) — geste humain, une fois.
- Les découpes de `packages/drwil/src/config.ts` et `packages/drwil/src/cli-texts.ts` ne changent aucun comportement
  (`docs/recipes/refactor-without-breaking.md`) : tests du paquet inchangés et verts avant et après.
- Lots séparés : inventaire d'abord, puis changements.

## 4. Décisions

- D1 (2026-11-13) : un seul chantier pour l'inventaire et les changements, en lots — réponse du demandeur
  (question 3 de l'intention).
- D2 (2026-11-13) : contrat par contrat, chacun avec sa puce « Contrats modifiés », plutôt qu'une règle générale —
  réponse du demandeur (question 1).
- D3 (2026-11-13) : couvrir le module dédié au lieu du fichier carrefour, ou passer en test en dur si le jugement est
  mécanique : QUA-013 et QUA-175 en test en dur ; QUA-048, QUA-064, QUA-066, QUA-067, QUA-234 resserrés —
  réponse du demandeur (question 2), appliquée à l'inventaire du 2026-11-13.
- D4 (2026-11-13) : QUA-081 n'est pas affaibli — réponse du demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — inventaire** [IA] : outils/inventaire-attestations.mjs (neuf) et son test, contrôle déclaré, inventaire
  recopié au journal ; confirmation du tableau. Critère de sortie : test de l'outil vert, inventaire au journal.
- **Lot 2 — changements** [IA] : découpes sans changement de comportement, tests en dur, `**Couvre**` resserrés,
  inventaire après ; carte d'architecture (fichiers neufs). Critère de sortie : `node .githooks/run-checks.mjs` sans
  échec, `drwil verify --agent` en `GOVERNANCE: PASS` hors attestations à redonner, listées.
- **Lot 3 — attestations** [humain] : sondage `drwil-attest` pour chaque contrat resserré. Critère de sortie :
  `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-14) : lots 1 et 2 faits — `usesClaudeTree` dans packages/drwil/src/config-tools.ts, textes
  du rapport de défaut dans packages/drwil/src/cli-report-texts.ts (aucun comportement changé) ; QUA-013 et QUA-175
  en test en dur (`**Manuel**` et `**Couvre**` retirés) ; `**Couvre**` de QUA-048, QUA-064, QUA-066, QUA-067 et
  QUA-234 resserrés ; chemins des contrôles `tests-qua-231`, `tests-qua-232`, `tests-qua-234` et `tests-qua-235`
  suivis ; carte d'architecture à jour ; inventaire après recopié au journal.
- **Prochaine étape** : [humain] lot 3 — sondage `drwil-attest` pour QUA-048, QUA-064, QUA-066, QUA-067 et QUA-234,
  puis clôture.
