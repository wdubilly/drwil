# Projet : une commande `/drwil` pour découvrir les capacités du kit

**Statut** (2026-10-04) : décisions prises, lots proposés — prêt à
implémenter.

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

Constat vérifié le 2026-10-04 (doc officielle Claude Code,
`code.claude.com/docs/en/slash-commands`) :
- **Claude Code a fusionné les commandes personnalisées dans les
  skills.** Un skill `.claude/skills/<nom>/SKILL.md` est déjà invocable
  par `/<nom>` (nom du dossier) **et**, si le frontmatter porte un champ
  `name:`, par `/<valeur de name>` — les deux invocations cohabitent,
  ce n'est pas un remplacement. Pas besoin d'un dossier commands séparé
  (ancien format, toujours supporté mais remplacé par les skills) : il
  suffit d'ajouter/ajuster le champ `name:` des skills existants pour
  leur donner un alias `/drwil-xxx`.
- Un skill peut accepter un argument (`arguments:` + substitution `$nom`
  dans le corps) et être invocable uniquement à la main avec
  `disable-model-invocation: true` (pas de déclenchement automatique par
  description).
- **Copilot CLI** (cet outil) : expose `/skills` (gestion de skills) et
  charge les skills/agents d'un dossier `.github` via `/add-dir`, mais ne
  documente aucun mécanisme de commande slash personnalisée au niveau
  projet dans son aide (`/help`).
- **Codex, Cursor, Gemini** : pas de mécanisme de commande slash
  propre au projet connu à ce jour (à vérifier plus précisément avant
  tout lot).

Donc une commande `/drwil` ne pourrait être livrée **nativement** que pour
Claude Code aujourd'hui, via le mécanisme skill existant ; les autres
outils restent couverts par l'indexation `AGENTS.md`/`README.md`
(chantier séparé) et par les skills existants (déclenchés par
description, pas par un nom tapé).

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

- **Portée** : livrer uniquement pour Claude Code maintenant (pas
  d'attente des autres outils).
- **Contenu** : les deux mécanismes à la fois — un `/drwil` générique
  qui affiche un menu des capacités sans argument, et des commandes
  dédiées par capacité qui lancent directement leur recette.
- **Nom** : une commande par capacité (`/drwil-audit`,
  `/drwil-avancement`...) en plus du générique `/drwil`. Techniquement,
  chaque skill pilotage existant garde son nom de dossier actuel
  (invocable tel quel) et reçoit en plus un alias via le champ
  frontmatter `name: drwil-xxx` (les deux invocations cohabitent, voir
  section 1).

## 5. Points à trancher

(aucun — tous tranchés, voir section 4)

## 6. Lots

- **Lot 1 — alias par capacité** : sur les 5 skills « pilotage »
  (`adopter-le-kit`, `auditer-risques-et-dette`,
  `decouvrir-valeur-produit`, `suivre-consommation-par-lot`,
  `visualiser-avancement`, et leurs équivalents EN), ajouter/ajuster le
  champ `name:` du frontmatter en `drwil-adopter`, `drwil-audit`,
  `drwil-valeur`, `drwil-conso`, `drwil-avancement` (FR) et
  `drwil-adopt`, `drwil-audit`, `drwil-value`, `drwil-usage`,
  `drwil-progress` (EN). À faire dans le dépôt (dogfooding) et dans les
  templates `packages/drwil/templates/{fr,en}/tools/claude/.claude/skills/`.
- **Lot 2 — commande générique `/drwil`** : nouveau skill
  `.claude/skills/drwil/SKILL.md` (à créer) avec `disable-model-invocation: true`
  et un argument de capacité ; sans argument affiche la liste des 5
  capacités et leur commande dédiée, avec argument reconnu renvoie
  directement à la recette correspondante. Même traitement dogfood +
  templates FR/EN.
- **Lot 3 — tests et vérifications** : étendre
  `packages/drwil/test/kit.test.mjs` pour vérifier la présence du
  skill `drwil` et des alias après `init --tools claude`, absence sans
  Claude Code. Relancer `.githooks/run-checks.sh`.

## 7. Reprise

- **Dernier état** (2026-10-04) : décisions tranchées, lots proposés,
  implémentation en cours sur branche dédiée (contrat QUA-017).
- **Travail non commité** : cette fiche seule au moment du cadrage ;
  voir commits de la branche `chantier/commande-slash-drwil` pour la
  suite.
- **Prochaine étape** : lot 1 (alias) puis lot 2 (générique) puis lot 3
  (tests).
