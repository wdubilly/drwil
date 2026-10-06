# Consignes pour les assistants de code (Claude Code, Codex, Cursor, Gemini…)

Point d'entrée unique pour toute IA (et tout humain) qui travaille sur ce
dépôt. `CLAUDE.md` et `GEMINI.md` ne font qu'importer ce fichier. Les détails vivent dans
`docs/` ; les skills de `.claude/skills/` ne sont que des raccourcis vers
`docs/recettes/` (le fond doit rester lisible par n'importe quel outil).

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
- **Cause avant correctif** : reproduire puis établir la cause racine avant de modifier le code.
- **Pas de contournement (QUA-019)** : un contrôle bloquant (test, hook, CI)
  n'est jamais désactivé, sauté (`--no-verify`, skip...) ni contourné pour
  avancer. S'il semble mal calibré, le dire et proposer de le corriger,
  jamais le désactiver en silence.
- **Laisser propre en passant** : documenter et signaler tout écart trouvé.
- **Compte rendu de fin de tâche** : fichiers créés/modifiés, contrôles lancés et résultats exacts, limites et ambiguïtés restantes.

## Contrats

`docs/contrats.md` est la **source unique** des invariants. Citer l'ID. Avant une modification importante, identifier les contrats et la recette applicables.

## Charger le contexte progressivement

1. Ce fichier (toujours).
2. Le fichier de la couche touchée (si existant) : lire le `AGENTS.md` du dossier concerné.
3. La recette ou le document indiqué ci-dessous.
4. `docs/contrats.md` pour le détail d'un ID, ou quand un contrôle échoue.
5. Rien d'autre sans raison.

| Si tu touches à… | Lis d'abord | Recette |
|---|---|---|
| une route API | `backend/AGENTS.md` (si présent) | `docs/recettes/ajouter-une-route-api.md` |
| un écran | `frontend/AGENTS.md` (si présent) | `docs/recettes/ajouter-un-ecran-front.md` |
| refactor important | — | `docs/recettes/refactorer-sans-casser.md` |
| déploiement | `docs/deploiement.md` (si présent) | `docs/recettes/deployer-en-prod.md` |

| Si on te demande… | Lis d'abord | Recette |
|---|---|---|
| où en est le projet | `docs/projets/en-attente.md` | `docs/recettes/visualiser-avancement.md` |
| un audit de risques/dette technique | `.drwil/ia-first.json` | `docs/recettes/auditer-risques-et-dette.md` |
| le coût (tokens) d'un chantier | `.drwil/usage.jsonl` (si présent) | `docs/recettes/suivre-consommation-par-lot.md` |
| une opportunité produit à explorer | `docs/decouverte-valeur.md` (si présent) | `docs/recettes/decouvrir-valeur-produit.md` |
| travailler avec une branche/MR | — | `docs/recettes/travailler-en-branche.md` |
| créer une release (tag + note GitHub) | `.githooks/creer-release.mjs` (si activé — module optionnel) | `docs/recettes/creer-une-release.md` |

## Commandes

- Tout vérifier : `node .githooks/run-checks.mjs`
- Savoir si le travail est vérifié : `node packages/drwil/bin/drwil.js verify --agent`
  (seul `GOVERNANCE: PASS` vaut validation). `drwil attest` est une action
  **humaine** : un agent ne l'exécute jamais et n'écrit jamais d'attestation.
- Activer les hooks (une fois par clone) : `git config core.hooksPath .githooks`

## Conventions

- Code, commentaires, messages de commit et interface en français.
- Commentaires : le **pourquoi** non évident uniquement (contrainte, piège connu). Pas le quoi.
