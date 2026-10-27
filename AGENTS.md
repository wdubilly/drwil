# Consignes pour les assistants de code (Claude Code, Codex, Cursor, Gemini…)

Point d'entrée unique pour toute IA (et tout humain) qui travaille sur ce dépôt. `CLAUDE.md` et `GEMINI.md`
ne font qu'importer ce fichier. Il est court exprès : relu à chaque requête. Le texte complet de chaque
règle est dans `docs/ia-first.md`, section 8 (en anglais, lu par section, jamais en entier).

## Le projet en 5 lignes

drwil — point d'entrée unique pour toute IA travaillant sur ce dépôt.
Carte complète : `docs/architecture.md`.

## Conduite (toujours) — détail : `docs/ia-first.md`, section 8

- **Périmètre** : faire ce qui est demandé, pas plus ; aucun changement hors périmètre sans demande explicite.
- **Dépôt vs livrable (QUA-018)** : drwil-le-dépôt ou drwil-le-livrable (gabarit `packages/drwil/templates/`) ? Si la demande ne précise pas, demander avant d'agir.
- **Commits** : en français ; ne commiter ni pousser que sur demande.
- **Données personnelles** : jamais de donnée nominative de production dans les sorties ou réponses.
- **Secrets** : jamais dans le code, les logs, les commits ni les sorties d'outil.
- **Doc** : à jour dans le même commit que le code qu'elle décrit ; une information, une seule source.
- **Preuve avant annonce** : relancer le contrôle et lire sa sortie avant d'écrire « corrigé », « passe » ou « terminé ».
- **État de gouvernance** : première action, `node .githooks/state.mjs` ; ne jamais écrire `.drwil/state.json` (si présent) ; lancer un chantier est une décision humaine ; un commit hors du cadrage de la fiche est refusé.
- **Intention ou demande** : en SCOPING un besoin se cadre, il ne se code pas ; si doute, demander « intention ou demande de réalisation ? ».
- **Cause avant correctif** : reproduire et trouver la cause racine d'abord.
- **Pas de contournement (QUA-019)** : jamais de contrôle désactivé, sauté (`--no-verify`, skip…) ni contourné ; s'il semble mal calibré, le dire et proposer de le corriger.
- **Références lisibles** : un ID cité à un humain est suivi de ce qu'il désigne (`node .githooks/glossary.mjs "<texte>"`).
- **Laisser propre en passant** : documenter et signaler tout écart trouvé.
- **La clôture boucle les intentions** : chaque limite non traitée devient une fiche d'intention (`docs/intentions/`), jamais une fiche de chantier.
- **Clôture en un geste (QUA-048)** : entrée du journal, puis `node .githooks/close.mjs` (`--check` : le signal seul) ; le code cite le contrat (QUA-049), jamais une fiche.
- **Détour (QUA-050)** : défaut hors cadrage → `node .githooks/detour.mjs open <nom> --title <défaut>` ; un détour qui change les règles attend le oui de l'humain (`docs/recipes/corriger-un-defaut.md`).
- **Défaut après la clôture (QUA-116)** : en CLOSING, défaut de la PR ouverte → `node .githooks/state.mjs reopen` ; jamais d'historique réécrit (détail en section 8).
- **File de chantiers** : l'une après l'autre, la suivante après la fusion de la précédente ; arrêt au premier qui demande un humain.
- **Une session par chantier** : une clôture faite et l'état revenu en SCOPING, le suivant se lance dans une nouvelle session.
- **Compte rendu de fin de tâche** : fichiers, contrôles lancés avec résultats exacts, limites et ambiguïtés restantes.

## Contrats

`docs/contracts.md` est la **source unique** des invariants : citer l'ID, ne jamais le copier. Avant une modification
importante : `node .githooks/glossary.mjs --contracts` (ID et titre de chacun), puis `--contract <ID>` (texte complet).
Jamais le registre ni le journal entiers (la lecture entière est refusée avec Claude Code) ; un chantier passé :
`--journal <fiche>`. Un contrôle en échec signale un contrat : le lire avant de contourner quoi que ce soit.

## Charger le contexte progressivement

Ce fichier (toujours), puis le `AGENTS.md` de la couche touchée, puis la recette ou le document ci-dessous, puis le
détail d'un contrat si besoin. Rien d'autre sans raison.

| Si tu touches à / on te demande… | Lis d'abord | Recette |
|---|---|---|
| une route API | `backend/AGENTS.md` (si présent) | `docs/recipes/add-an-api-route.md` |
| un écran | `frontend/AGENTS.md` (si présent) | `docs/recipes/add-a-frontend-screen.md` |
| refactor important | — | `docs/recipes/refactor-without-breaking.md` |
| un défaut à corriger | `node .githooks/glossary.mjs --contract <ID>` | `docs/recipes/corriger-un-defaut.md` |
| déploiement | `docs/deployment.md` (si présent) | `docs/recipes/deploy-to-production.md` |
| où en est le projet | `docs/projects/pending.md` | `docs/recipes/view-progress.md` |
| un audit de risques/dette technique | `.drwil/ia-first.json` | `docs/recipes/audit-risks-and-debt.md` |
| le coût (tokens) d'un chantier | `.drwil/usage.jsonl` (si présent) | `docs/recipes/track-consumption-per-increment.md` |
| une opportunité produit à explorer | `docs/decouverte-valeur.md` (si présent) | `docs/recipes/discover-product-value.md` |
| travailler avec une branche/MR | — | `docs/recipes/working-with-branches.md` |
| créer une release (tag + note GitHub) | `.githooks/create-release.mjs` (si activé) | `docs/recipes/create-a-release.md` |

## Commandes

- Tout vérifier : `node .githooks/run-checks.mjs` (échecs et résumé ; détail dans `.drwil/evidence/run-checks.log` (si présent)).
- Savoir si le travail est vérifié : `node packages/drwil/bin/drwil.js verify --agent` (seul `GOVERNANCE: PASS` vaut validation).
- Contrôles longs : sous-agent `drwil-checks` (Claude Code) ; n'annoncer « vérifié » que sur la ligne `GOVERNANCE: …` recopiée.
- `drwil attest` et le verdict de recette d'une candidate (`node .githooks/release-verdict.mjs`) sont des gestes **humains** : un agent ne les exécute jamais.
- Activer les hooks git une fois par clone : voir `INSTALL.md`.
- Installer le dépôt depuis son gabarit : `npm run installer-depot` (`-- --dry-run` pour lister). On n'édite que le gabarit
  (`packages/drwil/templates/`), jamais une copie installée (`.githooks/`, `.claude/`, recettes…) : le contrôle
  `miroirs-gabarit` refuse tout écart non déclaré dans `outils/miroirs.json`.

## Conventions

- Code, commentaires, messages de commit et interface en français ; exception, ce que lit d'abord un visiteur
  (`README.md`, `INSTALL.md`, `docs/architecture.md`, `packages/drwil/README.md`, `packages/drwil/CHANGELOG.md`) : en anglais (`docLang`).
- Commentaires : le **pourquoi** non évident uniquement (contrainte, piège connu). Pas le quoi.
