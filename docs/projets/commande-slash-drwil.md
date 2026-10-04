# Projet : une commande `/drwil` pour découvrir les capacités du kit

**Statut** (2026-10-04) : à cadrer — points ouverts ci-dessous.

<!-- cadrage
fichiers:
  - packages/drwil/templates/fr/tools/claude
-->

## 1. Besoin

Même une fois `AGENTS.md`/`README.md` indexés (chantier séparé
`docs/projets/informer-capacites-drwil.md`), un humain doit encore lire
de la prose pour découvrir qu'un audit, un tableau de bord ou un suivi de
coût existent. Certains outils IA supportent une commande explicite
tapée (`/nom`) qui déclenche un prompt préécrit sans que personne n'ait à
se souvenir qu'elle existe — plus fiable qu'un renvoi texte.

Constat vérifié le 2026-10-04 (vérification `fetch_copilot_cli_documentation`
et structure actuelle des templates) :
- **Claude Code** : supporte des commandes personnalisées projet via
  un dossier commands sous `.claude/` → `/<nom>` dans l'outil. Absent des
  templates actuels (`packages/drwil/templates/fr/tools/claude/` ne
  contient que `.claude/skills/` et `.claude/hooks/`).
- **Copilot CLI** (cet outil) : expose `/skills` (gestion de skills) et
  charge les skills/agents d'un dossier `.github` via `/add-dir`, mais ne
  documente aucun mécanisme de commande slash personnalisée au niveau
  projet dans son aide (`/help`).
- **Codex, Cursor, Gemini** : pas de mécanisme de commande slash
  propre au projet connu à ce jour (à vérifier plus précisément avant
  tout lot).

Donc une commande `/drwil` ne pourrait être livrée **nativement** que pour
Claude Code aujourd'hui ; les autres outils resteraient couverts par
l'indexation `AGENTS.md`/`README.md` (chantier séparé) et par les skills
existants (déclenchés par description, pas par un nom tapé).

## 2. Hors périmètre

- L'indexation dans `AGENTS.md`/`README.md` : traitée par
  `docs/projets/informer-capacites-drwil.md`, pas rouverte ici.
- Créer un mécanisme de commande slash générique multi-outils : n'existe
  pas aujourd'hui dans l'écosystème des outils IA supportés par drwil ;
  hors de portée de ce projet.

## 3. Contraintes

- Ne livrer la commande que pour les outils qui la supportent
  réellement (pas de dossier de commandes personnalisées généré si
  `--tools` ne contient pas `claude`).
- Le contenu de la commande ne doit pas dupliquer les recettes
  (`docs/recettes/*.md`) : elle doit y renvoyer, pas réécrire la
  méthode (principe « une information, une seule source »).

## 4. Décisions

(aucune — à trancher ci-dessous)

## 5. Points à trancher

- [décision] Portée : livrer `/drwil` uniquement pour Claude Code
  maintenant, ou attendre une confirmation que Copilot CLI/Codex/Cursor/
  Gemini n'ont vraiment aucun équivalent avant de se limiter à un seul
  outil ?
- [décision] Contenu exact de la commande : doit-elle afficher un menu
  (liste des recettes avec un renvoi) ou accepter un argument
  (`/drwil audit`, `/drwil avancement`) pour lancer directement la
  recette demandée ?
- [décision] Nom de la commande : `/drwil` (générique, retrouve toutes
  les capacités) ou une commande par capacité (`/drwil-audit`,
  `/drwil-avancement`...) ?

## 6. Lots

(pas encore proposés — dépend des décisions ci-dessus)

## 7. Reprise

- **Dernier état** (2026-10-04) : besoin posé, constat technique fait
  (Claude Code seul supporte des commandes slash projet aujourd'hui
  parmi les outils de drwil). 3 décisions à trancher avant de proposer
  des lots.
- **Travail non commité** : cette fiche seule.
- **Prochaine étape** : [décision] le demandeur tranche les 3 points de
  la section 5.
