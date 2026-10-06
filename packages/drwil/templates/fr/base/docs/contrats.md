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

Preuve vérifiable (`drwil verify`, voir `docs/ia-first.md`, section 5) :
`**Contrôle**` cite, entre backticks, l'identifiant d'un contrôle connu du
moteur (`.githooks/moteur.mjs`, ou `id` d'un contrôle de
`.drwil/ia-first.json` → `checks`) ; la commande n'est jamais recopiée ici.
`**Manuel**` décrit la partie de la preuve qui reste humaine. Au moins l'un
des deux, et une **Règle** ; un contrôle inconnu est une erreur. Un contrat
encore au format tableau (ancienne forme) reste lu, mais sans Contrôle il
n'est jamais prouvé (`MANUAL`).
`**Sévérité**` (facultatif) : `bloquant` (défaut), `avertissement` ou
`indicatif`. Seuls les contrats bloquants décident du verdict de
`drwil verify` ; les autres sont exécutés et affichés sans changer son code
de sortie.

## Sécurité (SEC)

## SEC-006 — Pas de dépendance vulnérable connue
**Règle** : Aucune dépendance avec une faille connue.
**Périmètre** : dépendances du projet
**Source de vérité** : manifeste de dépendances (ex. package.json, requirements.txt)
**Preuve** : audit déclaré par le projet (`.drwil/ia-first.json` → `checks`), hook + CI
**Raison** : une bibliothèque vulnérable annule le reste
**Manuel** : aucun audit de dépendances déclaré : en ajouter un dans `.drwil/ia-first.json` → `checks` (avec un `id`), puis le citer ici en **Contrôle**.

## SEC-007 — Pas de secret dans le dépôt
**Règle** : Pas de secret dans le dépôt (`.env`, clés, mots de passe, configs clients).
**Périmètre** : tout le dépôt et son historique
**Source de vérité** : —
**Preuve** : gitleaks : fichiers indexés (hook, si installé) + historique complet (job CI, si configuré)
**Raison** : fuite irréversible une fois poussée
**Contrôle** : `secrets-fichiers`


## Qualité (QUA)

## QUA-011 — Doc jamais fausse
**Règle** : Tout chemin du dépôt et tout ID de contrat cités dans la doc et les skills existent (ID définis une seule fois au registre).
**Périmètre** : `AGENTS.md`, les `AGENTS.md` de couche, `docs/`, `.claude/skills/` (si présent)
**Source de vérité** : —
**Preuve** : `.githooks/check-docs.mjs` (hook + CI)
**Raison** : une doc fausse égare les IA
**Contrôle** : `docs-references`

## QUA-013 — Contrôle non exécuté n'est pas passé
**Règle** : Aucun contrôle ne peut disparaître sans que cela se voie. Un contrôle qui ne peut pas s'exécuter sur un poste (outil absent) n'est jamais qu'un avertissement, jamais un succès silencieux. Un contrôle dégradable doit en plus avoir un job de CI qui se déclenche sur les mêmes chemins (vérifié, pas seulement supposé).
**Périmètre** : les contrôles de `.githooks/run-checks.mjs`
**Source de vérité** : `.githooks/run-checks.mjs`, `.githooks/check-control-coverage.mjs` et son historique d'exécution
**Preuve** : **machine** : chaque contrôle finit « échec », « OK » ou « non exécuté », jamais masqué ; la couverture CI est rejouée (hook + CI, s'il y a une CI)
**Raison** : un contrôle qui peut ne pas tourner sans le dire est un contrôle qui, à terme, ne prouve plus rien
**Contrôle** : `couverture-ci`

## QUA-015 — Chantiers exploitables à froid
**Règle** : Chantiers exploitables à froid : chaque case ouverte de l'index des chantiers porte un marqueur `[IA]`, `[humain]` ou `[décision]` ; chaque fiche de `docs/projets/` et de `docs/intentions/` (hors index et README) a une ligne « Statut » en tête, datée (AAAA-MM-JJ) ; chaque fiche d'intention a les sections « Besoin », « Existant » et « Questions à trancher » ; chaque fiche de projet a une section « Reprise » (passation). Extension : la case d'une ligne d'index qui cite une fiche dont le « Statut » contient `fait`/`terminé`/`clos` doit être cochée, et réciproquement (avertissement non bloquant).
**Périmètre** : `docs/projets/`, `docs/intentions/`
**Source de vérité** : `docs/ia-first.md` (section 7)
**Preuve** : `.githooks/check-docs.mjs` (hook + CI) ; justesse du statut et du contenu : **humain**
**Raison** : un agent reprend un chantier à froid : sans statut ni marqueur, il refait le travail, tente un geste humain ou tranche à la place du demandeur
**Contrôle** : `docs-references`
**Manuel** : justesse du statut et du contenu des fiches.

## QUA-016 — Rappel de cadrage
**Règle** : Rappel de cadrage : tout fichier de code indexé est couvert par le bloc `cadrage` d'une fiche de `docs/projets/` ; un bloc mal formé (sans ligne `fichiers:`, motif trop large) est refusé. `docs/` et tout fichier markdown ne sont jamais du code. Sévérité réglable par projet (`.drwil/ia-first.json` -> `cadrage` : `avertissement` par défaut, jamais bloquant ; `bloquant` pour revenir au comportement strict ; `off` pour désactiver).
**Périmètre** : tout le dépôt (fichiers indexés), hors `docs/` et le markdown
**Source de vérité** : `.githooks/cadrage.mjs`, `docs/ia-first.md` (section 7)
**Preuve** : `.githooks/check-docs.mjs` (hook + CI, sévérité selon le réglage) ; rappel informatif à l'agent : `.claude/hooks/rappel-cadrage.mjs` (si présent, silencieux si `cadrage: off`)
**Raison** : du code détaché de tout chantier ne se retrouve plus, ni par un agent ni par une personne
**Contrôle** : `docs-references`
**Manuel** : en sévérité « avertissement », le contrôle passe malgré des fichiers hors cadrage : lire ses avertissements.

## QUA-017 — Pas de travail direct sur la branche principale
**Règle** : Pas de travail direct sur la branche principale : commiter ou pousser directement sur `master`/`main` est refusé, y compris le tout premier commit. `init()` bascule systématiquement sur une branche de travail avant tout commit, sans porte de sortie configurable. Le travail doit passer par une branche (`docs/recettes/travailler-en-branche.md`) fusionnée via une pull/merge request.
**Périmètre** : tout dépôt git, y compris avant le tout premier commit, en local uniquement (`pre-commit`/`pre-push`)
**Source de vérité** : `docs/recettes/travailler-en-branche.md`
**Preuve** : `.githooks/run-checks.mjs` (hook uniquement, jamais en CI : un merge légitime sur la branche principale ne doit pas être bloqué rétroactivement)
**Raison** : un commit ou un push direct sur la branche principale contourne la revue et casse le lien fiche ↔ branche
**Contrôle** : `branche-principale`

## QUA-019 — Pas de contournement d'un contrôle
**Règle** : Un contrôle bloquant (test, hook, CI) n'est jamais désactivé, sauté (`--no-verify`, skip, flag d'exception) ni contourné pour faire avancer une tâche. S'il semble mal calibré, le signaler et corriger le contrôle lui-même (ou ouvrir une fiche de décision), jamais le désactiver en silence.
**Périmètre** : tout contrôle de `.githooks/`, toute CI, tout test
**Source de vérité** : ce contrat (rappelé dans `AGENTS.md`)
**Preuve** : **humaine** — un contournement laisse rarement une trace automatisable (voir `catalogue:QUA-009` pour le cas outillable d'un test désactivé)
**Raison** : contourner un contrôle masque silencieusement une régression, à l'opposé de QUA-013
**Manuel** : un contournement laisse rarement une trace automatisable.


## Hors registre (ce ne sont pas des contrats)

| Règle | Nature | Où elle vit |
|---|---|---|
| Commits, données personnelles dans les sorties d'une IA, secrets dans les sorties d'outil, tests d'attaque sur cible réelle, doc à jour dans le même commit | conduite (humaine) | `AGENTS.md`, section Conduite |
| Refactor sans changement de comportement | procédure (humaine) | `docs/recettes/refactorer-sans-casser.md` |
| Taille des fichiers, règles d'hygiène du code propres au projet | outillage opt-in (pas de seuil universel) | `.githooks/check-file-size.mjs`, `.githooks/check-code-rules.mjs`, `docs/recettes/refactorer-sans-casser.md` |
| Tests livrés avec tout nouveau composant | convention (humaine) | `AGENTS.md` de la couche concernée |

