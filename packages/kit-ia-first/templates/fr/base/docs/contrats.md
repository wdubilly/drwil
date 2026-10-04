# Contrats (source unique des invariants)

**Source unique des invariants du projet.** Les autres documents (`AGENTS.md`,
les `AGENTS.md` de couche, recettes, skills) citent un contrat par son ID et
ne recopient pas sa règle.

Un **contrat** est un invariant du produit ou du code dont la violation se
constate objectivement (dans le dépôt ou à l'exécution). Il a un ID stable
(jamais réattribué, même retiré), une règle normative, un périmètre, une
source de vérité (le code qui l'implémente), une preuve et une raison.
Principe : **un contrat qui compte est vérifié par une machine** ; une preuve
**humaine** est signalée comme telle : c'est le prochain contrôle à outiller.

Où tournent les contrôles : hook pré-commit (`.githooks/run-checks.mjs`, à
activer une fois par clone avec `git config core.hooksPath .githooks`) et la
CI si configurée.

Ce registre ne contient que le **socle** installé par défaut et les contrats
propres à ce projet. `docs/catalogue-contrats.md` propose d'autres contrats
génériques, pas encore adoptés (voir `docs/recettes/adopter-le-kit.md`).

## Sécurité (SEC)

| ID | Règle | Périmètre | Source de vérité | Preuve | Raison |
|---|---|---|---|---|---|
| SEC-006 | Aucune dépendance avec une faille connue. | dépendances du projet | manifeste de dépendances (ex. package.json, requirements.txt) | audit déclaré par le projet (`.drwil/ia-first.json` → `checks`), hook + CI | une bibliothèque vulnérable annule le reste |
| SEC-007 | Pas de secret dans le dépôt (`.env`, clés, mots de passe, configs clients). | tout le dépôt et son historique | — | gitleaks : fichiers indexés (hook, si installé) + historique complet (job CI, si configuré) | fuite irréversible une fois poussée |

## Qualité (QUA)

| ID | Règle | Périmètre | Source de vérité | Preuve | Raison |
|---|---|---|---|---|---|
| QUA-011 | Tout chemin du dépôt et tout ID de contrat cités dans la doc et les skills existent (ID définis une seule fois au registre). | `AGENTS.md`, les `AGENTS.md` de couche, `docs/`, `.claude/skills/` (si présent) | — | `.githooks/check-docs.mjs` (hook + CI) | une doc fausse égare les IA |
| QUA-013 | Aucun contrôle ne peut disparaître sans que cela se voie. Un contrôle qui ne peut pas s'exécuter sur un poste (outil absent) n'est jamais qu'un avertissement, jamais un succès silencieux. Un contrôle dégradable doit en plus avoir un job de CI qui se déclenche sur les mêmes chemins (vérifié, pas seulement supposé). | les contrôles de `.githooks/run-checks.mjs` | `.githooks/run-checks.mjs`, `.githooks/check-control-coverage.mjs` et son historique d'exécution | **machine** : chaque contrôle finit « échec », « OK » ou « non exécuté », jamais masqué ; la couverture CI est rejouée (hook + CI, s'il y a une CI) | un contrôle qui peut ne pas tourner sans le dire est un contrôle qui, à terme, ne prouve plus rien |
| QUA-015 | Chantiers exploitables à froid : chaque case ouverte de l'index des chantiers porte un marqueur `[IA]`, `[humain]` ou `[décision]` ; chaque fiche de `docs/projets/` et de `docs/intentions/` (hors index et README) a une ligne « Statut » en tête, datée (AAAA-MM-JJ) ; chaque fiche d'intention a les sections « Besoin », « Existant » et « Questions à trancher » ; chaque fiche de projet a une section « Reprise » (passation). | `docs/projets/`, `docs/intentions/` | `docs/ia-first.md` (section 7) | `.githooks/check-docs.mjs` (hook + CI) ; justesse du statut et du contenu : **humain** | un agent reprend un chantier à froid : sans statut ni marqueur, il refait le travail, tente un geste humain ou tranche à la place du demandeur |
| QUA-016 | Rappel de cadrage : tout fichier de code indexé est couvert par le bloc `cadrage` d'une fiche de `docs/projets/` ; un bloc mal formé (sans ligne `fichiers:`, motif trop large) est refusé. `docs/` et tout fichier markdown ne sont jamais du code. Sévérité réglable par projet (`.drwil/ia-first.json` -> `cadrage` : `avertissement` par défaut, jamais bloquant ; `bloquant` pour revenir au comportement strict ; `off` pour désactiver). | tout le dépôt (fichiers indexés), hors `docs/` et le markdown | `.githooks/cadrage.mjs`, `docs/ia-first.md` (section 7) | `.githooks/check-docs.mjs` (hook + CI, sévérité selon le réglage) ; rappel informatif à l'agent : `.claude/hooks/rappel-cadrage.mjs` (si présent, silencieux si `cadrage: off`) | du code détaché de tout chantier ne se retrouve plus, ni par un agent ni par une personne |

## Hors registre (ce ne sont pas des contrats)

| Règle | Nature | Où elle vit |
|---|---|---|
| Commits, données personnelles dans les sorties d'une IA, secrets dans les sorties d'outil, tests d'attaque sur cible réelle, doc à jour dans le même commit | conduite (humaine) | `AGENTS.md`, section Conduite |
| Refactor sans changement de comportement | procédure (humaine) | `docs/recettes/refactorer-sans-casser.md` |
| Taille des fichiers, règles d'hygiène du code propres au projet | outillage opt-in (pas de seuil universel) | `.githooks/check-file-size.mjs`, `.githooks/check-code-rules.mjs`, `docs/recettes/refactorer-sans-casser.md` |
| Tests livrés avec tout nouveau composant | convention (humaine) | `AGENTS.md` de la couche concernée |

