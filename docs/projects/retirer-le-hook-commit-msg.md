# Projet : retirer le hook commit-msg et son refus « Co-Authored-By »

**Statut** : cadré le 2026-11-06.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/commit-msg-non-executable.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/commit-msg
  - packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - packages/drwil/src/render.ts
  - packages/drwil/src/essentials-hooks.ts
  - packages/drwil/src/index.ts
  - .githooks/commit-msg
  - docs/ia-first/4-checks-in-git.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - docs/features.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/commit-msg-non-executable.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le kit livre `.githooks/commit-msg`, qui refuse tout message de commit portant une ligne
`Co-Authored-By`. Il est livré désactivé exprès (non exécutable, `packages/drwil/src/render.ts:143`),
et `init` règle `git config advice.ignoredHook false` pour taire l'avis de git
(`packages/drwil/src/index.ts:115`). Résultat : un clone où ce réglage manque affiche « hook ignored
because not executable » à chaque commit, ce qui fait croire à une panne (vu le 2026-11-03), et le
réglage tait aussi l'avis pour un vrai hook oublié.

Décision du demandeur le 2026-11-06 : **retirer ce refus**. Le hook n'est plus livré.

## Critères d'acceptation

- Une installation neuve ne livre plus `.githooks/commit-msg` et ne règle plus
  `advice.ignoredHook` ; une mise à jour retire le `commit-msg` d'une version antérieure s'il n'a jamais
  été modifié depuis l'installation, et le laisse en le disant s'il l'a été — contrat à créer
- Aucune doc livrée ne cite plus le refus « Co-Authored-By » ni le hook `commit-msg` — même contrat

## Contrats modifiés

- `QUA-013` — seulement son test « couverture CI verte par défaut, pre-push et commit-msg livrés »
  (`packages/drwil/test/kit.test.mjs:2866`) : l'assertion « commit-msg livré désactivé » devient
  « commit-msg non livré » ; la règle de QUA-013 est inchangée (validé par le demandeur le 2026-11-06)
- `.githooks/commit-msg` — supprimé du gabarit et du dépôt (validé par le demandeur le 2026-11-06)

## 2. Hors périmètre

- Les clones existants qui gardent `advice.ignoredHook false` : l'outil ne défait pas un réglage git
  local ; le CHANGELOG le dit, avec la commande pour le défaire.
- Les autres hooks git (`pre-commit`, `pre-push`, `prepare-commit-msg`) : inchangés.

## 3. Contraintes

- Le retrait d'un fichier modifié par l'adoptant passe par le mécanisme existant des fichiers obsolètes
  (`reportObsolete`, jamais une suppression d'un fichier modifié).
- Le journal garde l'historique du hook ; seules les docs livrées et la carte changent.

## 4. Décisions

- 2026-11-06 : retirer le refus et le hook, plutôt que le livrer sous un autre nom ou taire l'avis de git.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — retrait** [IA] : gabarit, copie du dépôt, `packages/drwil/src/render.ts`, `packages/drwil/src/essentials-hooks.ts`, `packages/drwil/src/index.ts`,
  docs, test et contrat. Critère de sortie : tests du contrat verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-06) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.
