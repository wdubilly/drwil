# Projet : skills Copilot CLI (parité fonctionnelle, pas mécanique)

**Statut** (2026-10-05) : en cours — lot 1 codé et vérifié, reste à committer
et à fusionner.

<!-- cadrage
fichiers:
  - packages/drwil/templates/fr/tools/copilot
  - packages/drwil/templates/en/tools/copilot
  - packages/drwil/test/kit.test.mjs
-->

## 1. Besoin

Claude Code lit les skills par description (déclenchement sémantique) ;
Copilot CLI ne sait déclencher un fichier que par motif de chemin
(`applyTo`). Sur les 13 recettes du kit, 2 se prêtent nativement à ce
mécanisme car elles ciblent un dossier précis : route API
(`applyTo: "backend/**"`) et écran front (`applyTo: "frontend/**"`). Les 11
autres restent couvertes par `AGENTS.md`, déjà lu nativement par Copilot
CLI — pas besoin d'un fichier dédié pour elles.

## 2. Hors périmètre

- Reproduire les 13 recettes en fichiers d'instructions Copilot CLI
  (dossier .github/instructions généré chez l'utilisateur du kit, pas
  présent dans ce dépôt) : seules les 2 qui correspondent à un motif de
  chemin précis sont concernées.
- Changer le mécanisme des skills Claude Code (`.claude/skills/`) :
  inchangé, ce chantier ne touche que la livraison Copilot CLI.

## 3. Contraintes

- Fichiers livrés uniquement si Copilot est sélectionné dans `--tools`
  (comportement déjà vérifié par les autres livrables par outil : pas de
  fuite vers Codex/Cursor seuls).
- Même contenu fonctionnel en FR et en EN (parité des gabarits déjà
  imposée au kit, test dédié « même nombre de fichiers livrés »).

## 4. Décisions

- (2026-10-05) Limiter la parité Copilot CLI aux 2 recettes route API et
  écran front, via `applyTo`. Les 11 autres recettes restent couvertes par
  `AGENTS.md`. Sans risque pour ce que drwil enforce (hooks git, contrats)
  si jamais rien n'était fait : confort de découverte, pas un contrôle.

## 5. Points à trancher

(aucun — décision prise, reste l'exécution)

## 6. Lots

- **Lot 1 — gabarits + test** [IA] :
  `packages/drwil/templates/fr/tools/copilot/.github/instructions/ajouter-une-route-api.instructions.md`
  et `packages/drwil/templates/fr/tools/copilot/.github/instructions/ajouter-un-ecran-front.instructions.md`
  (FR), `packages/drwil/templates/en/tools/copilot/.github/instructions/add-an-api-route.instructions.md`
  et `packages/drwil/templates/en/tools/copilot/.github/instructions/add-a-frontend-screen.instructions.md`
  (EN), chacun avec front-matter `description` + `applyTo` et renvoi vers la
  recette, `docs/contrats.md` et `.githooks/run-checks.mjs`. Test ajouté :
  parité FR/EN sur les 2 recettes, et non-livraison si Copilot absent de
  `--tools`. Critère de sortie : test vert, pas de régression sur le reste
  de la suite.

## 7. Reprise

- **Dernier état** (2026-10-05) : lot 1 codé par le mécanisme générique de
  copie `templates/<lang>/tools/<outil>` (aucun code de générateur à
  ajouter, déjà géré par `scaffold()` dans
  `packages/drwil/src/index.ts`). Test ajouté et vert, 52/52 tests de
  `packages/drwil/test/kit.test.mjs`, `bash .githooks/run-checks.sh` vert
  sur drwil.
- **Travail non commité** : `packages/drwil/test/kit.test.mjs`,
  `packages/drwil/templates/fr/tools/copilot/.github/instructions/`,
  `packages/drwil/templates/en/tools/copilot/.github/instructions/`,
  cette fiche, et la ligne correspondante de `docs/projets/en-attente.md`.
- **Prochaine étape** : [IA] committer sur une branche `chantier/skills-copilot-cli`,
  ouvrir la pull request ; [humain] fusionner.
