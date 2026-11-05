# Projet : les commandes de `node .githooks/state.mjs` rendent toujours la main

**Statut** : cadré le 2026-11-05.
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/detour.mjs
  - packages/drwil/templates/common/optional/create-release/release-verdict.mjs
  - .githooks/state.mjs
  - .githooks/detour.mjs
  - .githooks/release-verdict.mjs
  - .githooks/state.test.mjs
  - .githooks/state-cli-process.test.mjs
  - outils/verifier-await-premier-niveau.mjs
  - outils/verifier-await-premier-niveau.test.mjs
  - outils/tester-tarball.mjs
  - outils/tester-tarball.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - docs/architecture.md
  - packages/drwil/CHANGELOG.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Depuis la PR #361 (fusionnée le 2026-11-05), `node .githooks/state.mjs briefs` et
`node .githooks/state.mjs resume` sortent avec le code 13 et l'avertissement « unsettled top-level
await », sans rien écrire : `/drwil-start` ne liste plus les fiches, `resume` ne marche pas en vrai.
Constaté en mettant à jour `drwil_walk` depuis l'archive du jour, reproduit sur ce dépôt.

**Cause** : `.githooks/state.mjs` lance sa commande par un await de premier niveau
(`process.exitCode = await main(…)`). `briefs` et `resume` vivent dans
`.githooks/state-cli-commands.mjs`, chargé à la demande ; il charge `.githooks/state-resume.mjs`, qui
importe `.githooks/state.mjs`, encore en évaluation : chacun attend l'autre. Même motif possible pour
`node .githooks/state.mjs start` vers un nouveau worktree (`.githooks/worktree.mjs` charge
`.githooks/state.mjs` à la demande), et dans `.githooks/detour.mjs` et `.githooks/release-verdict.mjs`.

**Pourquoi rien ne l'a vu** : les tests appellent `main()` dans leur propre processus, où
`.githooks/state.mjs` est déjà chargé ; la couverture à 100 % compte les lignes, pas le chemin
d'entrée ; aucun contrôle ne lance la vraie commande, ni ne cherche ce motif.

**Contrats concernés** : `QUA-245` (`resume` remet BUILD ou CLOSING sur un clone neuf), dont la
preuve n'a pas lancé la vraie commande ; `QUA-001` (fichier de code plafonné à 200 lignes), qui a
fait sortir `briefs` et `resume` dans un module chargé à la demande.

## Critères d'acceptation

- Chaque sous-commande de `node .githooks/state.mjs` (dont `briefs`, `briefs --json`, `resume`, `lot`,
  `start` vers un worktree), lancée dans un vrai processus sur un dépôt de test, rend la main avec
  sa sortie, jamais le code 13 ; la CLI installée depuis l'archive (`outils/tester-tarball.mjs`)
  lance aussi `node .githooks/state.mjs briefs --json` dans le projet créé — contrat à créer
- Aucun hook du kit importé par un autre module ne fait d'await de premier niveau : un contrôle du
  dépôt le refuse en nommant le fichier et la ligne — contrat à créer

## Contrats modifiés

- `.githooks/state.mjs` — la commande se lance sans await de premier niveau
  (`main(…).then(…)`), même code de sortie ; aucune commande ne change de comportement
  (validé par le demandeur le 2026-11-05)
- `.githooks/detour.mjs` — même changement du lancement, même code de sortie ; aucun comportement
  changé (validé par le demandeur le 2026-11-05)
- `.githooks/release-verdict.mjs` — même changement du lancement, même code de sortie ; aucun
  comportement changé (validé par le demandeur le 2026-11-05)

## 2. Hors périmètre

- La règle Biome `noImportCycles` : elle signalerait aussi les boucles d'import voulues
  (`.githooks/state.mjs` ↔ `.githooks/state-cli.mjs`) ; écartée le 2026-11-05.
- Défaire les boucles d'import existantes : sans await de premier niveau, elles sont sans danger.
- Mettre à jour `drwil_walk` : refait après publication du correctif, hors de ce dépôt.

## 3. Contraintes

- Le contrôle des await vit dans `outils/` (propre au dépôt, il garde le code du kit), déclaré dans
  `.drwil/ia-first.json` ; il lit les hooks du dépôt, du gabarit et des modules optionnels.
- Le test en vrai processus fixe une identité git explicite (`-c user.email=… -c user.name=…`) :
  la CI n'en a pas.
- `.githooks/release-verdict.mjs` est à 185 lignes, `.githooks/detour.mjs` à 177 : le changement
  ne doit pas les faire dépasser 200.

## 4. Décisions

Tranchées par le demandeur le 2026-11-05 :

- Corriger la cause (plus d'await de premier niveau au lancement), pas le seul import de
  `.githooks/state-resume.mjs`.
- Un test en vrai processus pour chaque sous-commande, et l'archive qui lance `briefs`.
- Une règle maison ciblée sur l'await de premier niveau, pas `noImportCycles` de Biome.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — correctif et preuves** [IA] : lancement sans await dans les trois hooks, test en vrai
  processus, `outils/verifier-await-premier-niveau.mjs` (à créer), `outils/tester-tarball.mjs`
  étendu. Critère de sortie : les deux contrats verts, `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-11-05) : cadré, rien de réalisé.
- **Prochaine étape** : [IA] lot 1.
