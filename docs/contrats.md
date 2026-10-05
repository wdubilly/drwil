# Contrats (source unique des invariants)

Chaque invariant est identifié par un ID unique. Ne pas les recopier ailleurs : citer l'ID.

## SEC-001 — Portée des droits
**Règle** : Les droits d'accès sont décidés par le backend.
**Périmètre** : Toutes les routes exposées.
**Source de vérité** : Code backend (couche autorisations).
**Preuve** : Tests d'autorisation.
**Raison** : Principe de défense en profondeur.

## QUA-013 — Contrôle non exécuté n'est pas passé
**Règle** : Un contrôle qui n'a pas tourné n'est pas un contrôle passé.
**Périmètre** : Tout contrôle listé dans les vérifs.
**Source de vérité** : `.githooks/run-checks.sh` et son historique d'exécution.
**Preuve** : Sortie lue du contrôle concerné.
**Raison** : Empêcher l'affirmation sans exécution.

## SEC-006 — Pas de dépendance vulnérable connue
**Règle** : Aucune dépendance avec une faille connue.
**Périmètre** : Dépendances du dépôt.
**Source de vérité** : Manifeste de dépendances (`package.json`…), audit déclaré (`.drwil/ia-first.json` → `checks`).
**Preuve** : Hook + CI.
**Raison** : Une bibliothèque vulnérable annule le reste.

## SEC-007 — Pas de secret dans le dépôt
**Règle** : Pas de secret dans le dépôt (`.env`, clés, mots de passe, configs clients).
**Périmètre** : Tout le dépôt et son historique.
**Source de vérité** : gitleaks (fichiers indexés + historique, si configuré).
**Preuve** : Hook + CI.
**Raison** : Fuite irréversible une fois poussée.

## QUA-011 — Doc jamais fausse
**Règle** : Tout chemin du dépôt et tout ID de contrat cités dans la doc et les skills existent (ID définis une seule fois au registre).
**Périmètre** : `AGENTS.md`, les `AGENTS.md` de couche, `docs/`, `.claude/skills/` (si présent).
**Source de vérité** : `.githooks/check-docs.mjs`.
**Preuve** : Hook + CI.
**Raison** : Une doc fausse égare les IA.

## QUA-015 — Chantiers exploitables à froid
**Règle** : Chaque case ouverte de l'index des chantiers porte un marqueur `[IA]`, `[humain]` ou `[décision]` ; chaque fiche de `docs/projets/` et de `docs/intentions/` (hors index et README) a une ligne « Statut » en tête, datée (AAAA-MM-JJ) ; chaque fiche d'intention a les sections « Besoin », « Existant » et « Questions à trancher » ; chaque fiche de projet a une section « Reprise ». Extension (2026-10-04) : la case d'une ligne d'index qui cite une fiche dont le « Statut » contient `fait`/`terminé`/`clos` doit être cochée, et réciproquement une case cochée doit citer une fiche qui se dit terminée — avertissement non bloquant (la prose de « Statut » n'est pas un champ structuré, angles morts assumés).
**Périmètre** : `docs/projets/`, `docs/intentions/`.
**Source de vérité** : `docs/ia-first.md` (section 7).
**Preuve** : `.githooks/check-docs.mjs` (hook + CI) ; justesse du contenu : humaine.
**Raison** : Un agent reprend un chantier à froid sans refaire le travail ni trancher à la place du demandeur.

## QUA-016 — Rappel de cadrage
**Règle** : Tout fichier de code indexé est couvert par le bloc `cadrage` d'une fiche de `docs/projets/` ; un bloc mal formé (sans `fichiers:`, motif trop large) est refusé. Sévérité réglable par projet (`.drwil/ia-first.json` -> `cadrage` : `avertissement` par défaut, `bloquant`, ou `off`).
**Périmètre** : Tout le dépôt (fichiers indexés), hors `docs/` et le markdown.
**Source de vérité** : `.githooks/cadrage.mjs`, `docs/ia-first.md` (section 7).
**Preuve** : `.githooks/check-docs.mjs` (hook + CI, sévérité selon le réglage).
**Raison** : Du code détaché de tout chantier ne se retrouve plus.

## QUA-017 — Pas de travail direct sur la branche principale
**Règle** : Commiter ou pousser directement sur la branche principale (`master`/`main`) est refusé, y compris le tout premier commit d'un dépôt. Le travail doit passer par une branche (`docs/recettes/travailler-en-branche.md`) fusionnée ensuite via une pull/merge request. `init()` crée et bascule systématiquement sur une branche de travail (`chantier/installation-kit`) juste après `git init`, avant tout commit : personne n'a donc jamais besoin de commiter sur la branche principale, même au bootstrap. Pas de porte de sortie configurable (contrairement à QUA-016). Ce contrôle ne tourne jamais en CI (`process.env.CI`) : la CI s'exécute aussi sur la branche principale après un merge légitime, qu'il ne faut pas bloquer rétroactivement.
**Périmètre** : Tout dépôt git, y compris avant le tout premier commit, en local uniquement (hooks `pre-commit`/`pre-push`).
**Source de vérité** : `docs/recettes/travailler-en-branche.md`.
**Preuve** : `.githooks/run-checks.mjs` (hook uniquement, jamais en CI).
**Raison** : Un commit ou un push direct sur la branche principale contourne la revue (pull/merge request) et casse le lien fiche ↔ branche décrit par la recette.

## QUA-018 — Périmètre explicite : dépôt drwil vs livrable gabarit
**Règle** : Ce dépôt a deux casquettes : drwil-le-dépôt (ce projet en tant que tel — son `AGENTS.md` racine, sa CI dogfood, ses `docs/`, ses chantiers) et drwil-le-livrable (le gabarit distribué via `npx`/`npm`, `packages/drwil/templates/`, copié dans tout projet généré). Si une demande ne précise pas clairement laquelle des deux casquettes est visée, l'IA doit le demander explicitement avant d'agir plutôt que de deviner.
**Périmètre** : Toute modification susceptible de concerner `packages/drwil/templates/` et/ou son équivalent dogfood à la racine (`AGENTS.md`, `docs/`, `.github/workflows/`, `.githooks/`, `.claude/skills/`).
**Source de vérité** : Ce contrat (rappelé dans `AGENTS.md`).
**Preuve** : Humaine — la distinction demande une appréciation contextuelle, pas de hook automatisable.
**Raison** : Un changement fait sans clarifier le périmètre risque de fuiter du dogfood vers le gabarit exporté (ou l'inverse), comme déjà vu pour le job CI de release (dogfood-only, pas destiné au gabarit).

## QUA-019 — Pas de contournement d'un contrôle
**Règle** : Un contrôle bloquant (test, hook, CI) n'est jamais désactivé, sauté (`--no-verify`, skip, flag d'exception) ni contourné pour faire avancer une tâche. S'il semble mal calibré pour un cas légitime, le signaler et proposer une correction du contrôle lui-même (ou ouvrir une fiche de décision), jamais le désactiver en silence.
**Périmètre** : Tout contrôle de `.githooks/`, toute CI, tout test.
**Source de vérité** : Ce contrat (rappelé dans `AGENTS.md`).
**Preuve** : Humaine — un contournement laisse rarement une trace automatisable (voir `catalogue:QUA-009` pour le cas outillable d'un test désactivé).
**Raison** : Contourner un contrôle masque silencieusement une régression ou un vrai problème ; c'est l'opposé de QUA-013 (un contrôle qui ne tourne pas ne prouve rien).

## QUA-004 — Seuil de couverture de test
**Règle** : La couverture de test de `packages/drwil` ne descend pas sous le seuil déclaré : 85 % lignes, 60 % branches, 50 % fonctions (seuil de départ, relevé au fil de l'eau vers 100 % — voir `docs/projets/adopter-seuil-couverture.md`).
**Périmètre** : `packages/drwil` (code du générateur ; `.githooks/*.mjs` pas encore inclus, voir la fiche).
**Source de vérité** : `packages/drwil/package.json` (script `test:coverage`, options `c8`).
**Preuve** : Hook + CI (`.drwil/ia-first.json` → `checks`, job `checks`).
**Raison** : Sans seuil vérifié, la couverture peut régresser silencieusement à chaque ajout de code.
