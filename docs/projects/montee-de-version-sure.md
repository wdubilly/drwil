# Projet : un `init` intelligent refuse la mauvaise version et garde le CI du projet (1 sur 2)

**Statut** : cadré le 2026-11-08 ; décisions tranchées le 2026-11-08 par le demandeur.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/montee-de-version-sure.md` (absorbe `donnees-du-projet-hors-prose-du-kit`, `ci-extensible-sans-perte`, `alertes-avant-et-apres-ecrasement`)

<!-- scope
files:
  - packages/drwil/src/kit-update.ts
  - packages/drwil/src/install.ts
  - packages/drwil/src/render.ts
  - packages/drwil/src/cli-install.ts
  - packages/drwil/src/cli-texts.ts
  - packages/drwil/src/ci-zone.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/config.ts
  - packages/drwil/templates/common/ci/github/.github/workflows/ia-first.yml
  - packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml
  - .github/workflows/ia-first.yml
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/montee-de-version.test.mjs
  - packages/drwil/CHANGELOG.md
  - docs/contracts.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
  - outils/miroirs.json
-->

(Première des deux fiches de la montée sûre, 15 chemins : la suite est `docs/projects/montee-de-version-sure-suite.md`.
Le bloc `scope` couvre le refus de version, le rendu du CI avec sa zone du projet et ses deux gabarits, la copie
installée du workflow de ce dépôt, les tests, le registre et la configuration où chaque contrat créé déclare son
contrôle. Si l'implémentation montre qu'un autre fichier doit changer, l'élargissement sera un commit séparé.)

## 1. Besoin

Monter `drwil_walk` de 0.10.0 à 0.11.0 a échoué : `resolve-drift`, lancé avec la version locale, a rétrogradé la
mécanique ; lancé avec la bonne version, il a écrasé des fichiers du projet et les étapes de CI ajoutées par le projet ;
le commit du résultat était refusé par la barrière de périmètre, sans issue. Le demandeur veut **un seul geste** :
`init`, qui fait le nécessaire quand une version précédente existe et ne perd aucune donnée du projet.

## 2. Décisions (2026-11-08)

- **D1 — Un seul geste** : `init` sur un projet équipé monte tout (mécanique, prose du kit non modifiée, ajouts exigés,
  clés du kit de `.drwil/ia-first.json`) sur `workstream/kit-update`, qu'il commite lui-même (trailer
  `Drwil-Kit-Update`, déjà reconnu par la barrière). Aucune désinstallation.
- **D2 — Version** : `init` refuse, avec un message clair, de s'exécuter avec une version plus ancienne que celle de
  `.drwil/install.json` (si présent), ou différente de la version visée ; une option explicite passe outre.
- **D3 — CI du projet** : le fichier de CI (GitHub et GitLab) a une **zone du projet** délimitée par des marqueurs.
  `init` met à jour tout ce qui est hors zone et conserve la zone telle quelle. Un fichier de CI sans marqueurs (projet
  existant) : `init` propose le diff, nomme les étapes et jobs qui disparaîtraient, et demande confirmation ; il pose
  les marqueurs autour de ce que le projet confirme garder.
- **D4 — Fichiers du projet** : `AGENTS.md`, recettes, index des intentions et catalogue de contrats modifiés ne sont
  jamais réécrits ; `init` y ajoute seulement ce que la version exige (ligne ou bloc délimité). Interprétation à
  confirmer à la relecture.
- **D5 — Clés de `.drwil/ia-first.json` (si présent)** : partage actuel (clés du projet gardées, clés dérivées
  recalculées) ; une clé nouvelle est ajoutée avec une valeur par défaut sûre (comme `newRequirements`).
- **D6 — Alertes** : avant confirmation, `init` nomme ce qu'il supprime (jobs, étapes, lignes) ; `doctor` le signale
  après.
- **D7 — `resolve-drift` est retiré** : `init` traite lui-même les fichiers modifiés à la main (diff et confirmation).
  Plus de `.bak` : le commit de la branche garde l'ancienne version.
- **D8 — État de gouvernance** : `.drwil/state.json` (si présent) n'est pas touché (déjà le cas).
- **D9 — Barrière** : sans objet. Le geste commite lui-même ; `init` refuse déjà une branche `workstream/kit-update`
  existante, donc le cas « arbre déjà sur la branche kit » ne se présente pas.
- **D10 — Rejeu QUA-113** : il rejoue les hooks et la liste de contrôles de la branche principale, pas les étapes du
  workflow ; la zone du projet n'y change rien. Limite déjà assumée par QUA-113 (retrait d'une étape du workflow
  retenu par la seule relecture) : elle est rappelée dans la recette, pas résolue ici.

## 3. Hors périmètre

- Premier commit du kit d'une installation neuve (`premier-commit-du-kit-sous-barriere-bloquante`, ordre 2).
- Fichiers modifiés traités par `init`, retrait de `resolve-drift`, clés de configuration, `doctor` : seconde fiche
  `docs/projects/montee-de-version-sure-suite.md`.
- Refonte des gabarits de CI au-delà des marqueurs de la zone du projet.
- Montée de plusieurs versions d'un coup au-delà de ce que `init` sait déjà migrer (`packages/drwil/src/migration.ts`) : refus clair.

## Critères d'acceptation

- Sur un projet de test en version N équipé, `init` de la version N+1 crée `workstream/kit-update`, commite, et laisse
  l'arbre propre ; aucun `.bak` — contrat à créer
- Un fichier de CI avec étapes du projet (jeu d'essai tiré de `drwil_walk`) garde ces étapes dans la zone, GitHub et
  GitLab ; le reste est conforme au gabarit N+1 — contrat à créer
- Un fichier de CI sans marqueurs : `init` nomme ce qui disparaîtrait, ne change rien sans confirmation — contrat à créer
- `init` d'une version plus ancienne que `.drwil/install.json` (si présent) refuse avec un message clair ; l'option passe outre — contrat à créer
- Rejouer `init` sur un projet déjà à jour ne change rien — contrat à créer
- `node .githooks/run-checks.mjs` et `node packages/drwil/bin/drwil.js verify --agent` : `GOVERNANCE: PASS` — `QUA-013`

## 5. Contrats

- **Modifiés** : les contrats qui décrivent le CI livré ou le comportement de `init` sur une version déjà installée
  (à relever avec `node .githooks/glossary.mjs "init"` au début du chantier) ; section « Contrats modifiés »
  de cette fiche à remplir alors, avec validation du demandeur.
- **Créés** : un contrat de version refusée et un contrat de la zone du projet du CI, chacun avec son contrôle
  déclaré dans `.drwil/ia-first.json`.

## 6. Risque

HIGH : écrit dans les fichiers de tous les projets adoptants, dont le CI. Preuve par scénario dans un vrai dépôt
(0.10.0 vers la candidate), non par tests unitaires seuls. Essai final sur `drwil_walk`, à lancer par le demandeur.

## 6. Increments

- **Lot 1 — refus de version et fin des `.bak`** [IA] : `init` compare la version du paquet à celle de
  `.drwil/install.json` (si présent), refuse avec un message clair, option explicite pour passer outre ; plus de
  `.bak` sur la branche kit. Critère de sortie : tests (refus, option, projet sans enregistrement) verts.
- **Lot 2 — zone du projet du CI** [IA] : marqueurs dans les gabarits GitHub et GitLab et dans la copie installée du
  workflow de ce dépôt ; `init` met à jour hors zone, conserve la zone, nomme ce qui disparaîtrait d'un CI sans
  marqueurs et demande confirmation. Critère de sortie : jeu d'essai tiré de `drwil_walk`, étapes du projet
  conservées sur les deux forges ; `GOVERNANCE: PASS` à la clôture.

## 7. Reprise

- **Dernier état** (2026-11-08) : cadré sur la branche `intention/montee-de-version-du-kit`, rien de réalisé ; décisions
  D1 à D10 tranchées par le demandeur ; fiche coupée en deux pour un suivi par chantier.
- **Travail non commité** : cette fiche, sa suite, l'intention et l'ordre de la 0.12.0 dans `docs/projects/pending.md`.
- **Prochaine étape** : relever les contrats à modifier, fusionner le cadrage, puis lancer ce chantier par `/drwil-start`.
  La suite ne démarre qu'après la fusion de celui-ci.
