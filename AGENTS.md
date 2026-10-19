# Consignes pour les assistants de code (Claude Code, Codex, Cursor, Gemini…)

Point d'entrée unique pour toute IA (et tout humain) qui travaille sur ce
dépôt. `CLAUDE.md` et `GEMINI.md` ne font qu'importer ce fichier. Les détails vivent dans
`docs/` ; les skills de `.claude/skills/` ne sont que des raccourcis vers
`docs/recipes/` (le fond doit rester lisible par n'importe quel outil).

## Le projet en 5 lignes

drwil — point d'entrée unique pour toute IA travaillant sur ce dépôt.
Carte complète : `docs/architecture.md`.

## Conduite (toujours)

- **Périmètre** : faire ce qui est demandé, pas plus. Aucun changement hors
  périmètre sans justification et sans demande explicite.
- **Dépôt vs livrable (QUA-018)** : ce dépôt a deux casquettes — drwil-le-
  dépôt (ce projet lui-même) et drwil-le-livrable (le gabarit de
  `packages/drwil/templates/`, distribué via `npx`/`npm`). Si une demande
  ne précise pas laquelle est visée, le demander avant d'agir.
- **Commits** : en français ; ne commiter ni pousser que sur demande.
- **Données personnelles** : une IA n'affiche jamais de donnée nominative de
  production dans ses sorties ou ses réponses.
- **Secrets** : jamais dans le code, les logs, les commits ni les sorties d'outil.
- **Doc** : une doc fausse est pire que pas de doc — la mettre à jour dans le
  même commit que le code qu'elle décrit. Une information a une seule source.
- **Preuve avant annonce** : avant d'écrire « corrigé », « passe » ou
  « terminé », relancer le contrôle concerné et lire sa sortie.
- **État de gouvernance (tout agent)** : première action de toute tâche,
  lancer `node .githooks/state.mjs` et suivre son activité, son attente et son
  périmètre ; le relancer en cas de doute et avant toute modification de
  fichier si l'activité a pu changer, jamais le déduire de la conversation
  (un outil qui le permet injecte un rappel court quand l'état change). Ne jamais écrire `.drwil/state.json` (si présent) à la main :
  changer d'activité passe par `node .githooks/state.mjs move <ACTIVITE>` ;
  lancer un chantier reste une décision humaine (`/drwil-start` : sondage
  dont l'humain choisit la réponse ; ou `node .githooks/state.mjs start`
  dans un terminal ; réglage `transitions` de `.drwil/ia-first.json`) ;
  clore est libre une fois l'évidence de `drwil verify` valide.
  Un commit hors du cadrage de la fiche active est refusé : élargir le
  cadrage dans un commit séparé qui ne touche que la fiche.
- **Cause avant correctif** : reproduire puis établir la cause racine avant de modifier le code.
- **Pas de contournement (QUA-019)** : un contrôle bloquant (test, hook, CI)
  n'est jamais désactivé, sauté (`--no-verify`, skip...) ni contourné pour
  avancer. S'il semble mal calibré, le dire et proposer de le corriger,
  jamais le désactiver en silence.
- **Références lisibles** : toute référence citée à un humain (ID de contrat,
  numéro de point, de lot ou de décision d'une fiche) est suivie de ce
  qu'elle désigne en clair — « QUA-016 (rappel de cadrage) », « point 12
  (élargissement du cadrage) ». Un ID seul n'est pas lisible. Libellé :
  `node .githooks/glossary.mjs "<texte>"` (lu dans le registre, le
  catalogue et la fiche active).
- **Laisser propre en passant** : documenter et signaler tout écart trouvé.
- **La clôture boucle les intentions** : à la clôture d'un chantier, chaque
  limite non traitée devient une fiche d'intention (`docs/intentions/`) —
  l'agent peut l'écrire seul, jamais une fiche de chantier (la recadrer est
  une décision du demandeur) — listée dans l'index en `[décision]` et citée
  par le journal ; l'intention d'origine (champ `**Intention**` de la
  fiche) est mise à jour, ou résumée au journal et retirée si elle est
  entièrement couverte.
- **Clôture en un geste (QUA-048)** : l'entrée du journal écrite,
  `node .githooks/close.mjs` supprime la fiche, retire sa ligne de l'index,
  consigne la consommation et signale, avant le commit, ce qui ferait
  échouer la clôture (`--check` : le signal seul, à tout moment). Le code
  cite le contrat qu'il sert, jamais une fiche de chantier (QUA-049).
- **Détour pour un défaut préalable (QUA-050)** : en plein chantier, un
  défaut hors du cadrage se corrige par un détour que l'agent ouvre seul —
  `node .githooks/detour.mjs open <nom> --title <défaut>` met le travail de
  côté, part de la branche principale et écrit une fiche courte ; sa PR est
  intitulée « Détour de <fiche> » ; fusionnée, `node .githooks/detour.mjs
  resume` restaure le travail sur la branche du chantier rebasée. Jamais
  d'élargissement sans rapport ni de stash à la main ; un détour qui change
  les règles du jeu (contrats, hooks, seuils, barrière) attend le oui de
  l'humain (`docs/recipes/corriger-un-defaut.md`).
- **File de chantiers** : quand l'humain a coché plusieurs fiches au
  lancement, l'agent les réalise l'une après l'autre sans nouveau sondage —
  avec Claude Code, chacune dans un sous-agent (contexte neuf), la session
  principale ne gardant que les comptes rendus ; la suivante seulement
  après la fusion de la précédente (suivie par `gh`, 30 minutes au plus),
  arrêt au premier chantier qui demande un humain (attestation, FAIL non
  corrigé, CI rouge, décision). Une file reprise dans une nouvelle session
  attend le oui explicite de l'humain.
- **Compte rendu de fin de tâche** : fichiers créés/modifiés, contrôles lancés et résultats exacts, limites et ambiguïtés restantes.

## Contrats

`docs/contracts.md` est la **source unique** des invariants. Citer l'ID. Avant une modification importante, identifier les contrats et la recette applicables.

## Charger le contexte progressivement

1. Ce fichier (toujours).
2. Le fichier de la couche touchée (si existant) : lire le `AGENTS.md` du dossier concerné.
3. La recette ou le document indiqué ci-dessous.
4. `docs/contracts.md` pour le détail d'un ID, ou quand un contrôle échoue.
5. Rien d'autre sans raison.

| Si tu touches à… | Lis d'abord | Recette |
|---|---|---|
| une route API | `backend/AGENTS.md` (si présent) | `docs/recipes/add-an-api-route.md` |
| un écran | `frontend/AGENTS.md` (si présent) | `docs/recipes/add-a-frontend-screen.md` |
| refactor important | — | `docs/recipes/refactor-without-breaking.md` |
| un défaut à corriger | `docs/contracts.md` | `docs/recipes/corriger-un-defaut.md` |
| déploiement | `docs/deployment.md` (si présent) | `docs/recipes/deploy-to-production.md` |

| Si on te demande… | Lis d'abord | Recette |
|---|---|---|
| où en est le projet | `docs/projects/pending.md` | `docs/recipes/view-progress.md` |
| un audit de risques/dette technique | `.drwil/ia-first.json` | `docs/recipes/audit-risks-and-debt.md` |
| le coût (tokens) d'un chantier | `.drwil/usage.jsonl` (si présent) | `docs/recipes/track-consumption-per-increment.md` |
| une opportunité produit à explorer | `docs/decouverte-valeur.md` (si présent) | `docs/recipes/discover-product-value.md` |
| travailler avec une branche/MR | — | `docs/recipes/working-with-branches.md` |
| créer une release (tag + note GitHub) | `.githooks/create-release.mjs` (si activé — module optionnel) | `docs/recipes/create-a-release.md` |

## Commandes

- Tout vérifier : `node .githooks/run-checks.mjs`
- Savoir si le travail est vérifié : `node packages/drwil/bin/drwil.js verify --agent`
  (seul `GOVERNANCE: PASS` vaut validation). `drwil attest` est une action
  **humaine** : un agent ne l'exécute jamais et n'écrit jamais d'attestation.
  De même, le verdict de recette d'une candidate
  (`node .githooks/release-verdict.mjs`, module de release) est un geste
  **humain** : un agent ne l'exécute jamais.
- Activer les hooks (une fois par clone) : `git config core.hooksPath .githooks`
- Installer le dépôt depuis son gabarit : `npm run installer-depot`
  (`-- --dry-run` pour lister sans écrire). On n'édite que le gabarit
  (`packages/drwil/templates/`), jamais une copie installée dans le dépôt
  (`.githooks/`, `.claude/`, recettes…) : le contrôle `miroirs-gabarit`
  refuse toute copie qui en diffère, hors écarts déclarés dans
  `outils/miroirs.json`.

## Conventions

- Code, commentaires, messages de commit et interface en français.
- Exception : ce que lit d'abord un visiteur ou un prospect (`README.md`,
  `INSTALL.md`, `docs/architecture.md`, `packages/drwil/README.md`,
  `packages/drwil/CHANGELOG.md`) est en anglais (réglage `docLang` de
  `.drwil/ia-first.json`).
- Commentaires : le **pourquoi** non évident uniquement (contrainte, piège connu). Pas le quoi.
