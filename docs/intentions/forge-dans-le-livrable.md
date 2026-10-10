# Intention : la protection de la forge dans le livrable

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur ;
questions à trancher en fin de fiche.

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche la CI livrée et la
gouvernance des projets qui adoptent drwil).

## Besoin

Le 2026-10-10, ce dépôt a été protégé côté forge (chantier
`docs/projets/proteger-master.md`) : ruleset sur `master` sans
contournement, CODEOWNERS, ruleset versionné et vérifié en CI, et, à
venir, un compte machine pour l'agent. Le demandeur a relevé que ce n'est
**pas reproductible** par le paquet : tout a été fait à la main, pour ce
dépôt (QUA-018, périmètre explicite : dépôt drwil vs livrable gabarit).

Intention : que drwil-le-livrable apporte à chaque projet ce qui se
reproduit, et guide l'humain pour ce qui ne se reproduit pas.

## Existant (vérifié le 2026-10-10)

- Dans ce dépôt seulement : `.github/ruleset-master.json`,
  `.github/scripts/verifier-ruleset.mjs` et son étape de CI,
  `.github/CODEOWNERS`.
- `drwil init` installe déjà la CI (GitHub ou GitLab) et connaît les noms
  de ses jobs (`checks`, `kit-tests`…) ; `drwil doctor` diagnostique sans
  exécuter de contrôle.
- Sur GitHub, seul un compte machine ou une GitHub App donne à l'agent une
  identité distincte ; un jeton personnel agit toujours au nom de son
  propriétaire. Sur GitLab, un jeton d'accès de projet crée de lui-même un
  utilisateur bot.

## Ce qui se reproduit (livrable)

1. **Protéger la branche par défaut** : modèle de ruleset livré, appliqué
   par une commande (par ex. `drwil forge proteger`, via `gh api`), avec
   les checks de la CI installée.
2. **Vérifier en CI** que la protection reste celle versionnée (script de
   comparaison et étape livrés avec la CI du gabarit).
3. **CODEOWNERS généré** sur les zones sensibles du kit (`.githooks/`,
   `.claude/`, configuration, contrats).
4. **Diagnostic** dans `drwil doctor` : branche par défaut non protégée,
   ruleset différent du versionné, agent qui partage l'identité du
   mainteneur.

## Ce qui ne se reproduit pas (guidé)

- **L'identité de l'agent** : recette pas à pas (compte machine, invitation,
  jeton gardé hors du dépôt), commandes prêtes à coller.
- **À plus long terme : une GitHub App drwil**, publiée une fois, installée
  en un clic, qui donnerait à l'agent des jetons courts sous une identité
  `drwil[bot]` — seule voie vraiment reproductible sur GitHub, mais un
  produit à part (hébergement, sécurité).

## Liens

- `docs/intentions/fabrique-autonome.md` : brique 1, autorité de vérité
  hors de l'agent.
- `docs/projets/proteger-master.md` : la même chose, faite à la main pour
  ce dépôt.

## Contraintes

- Ne jamais rendre un projet non fusionnable : exiger une approbation sans
  identité distincte pour l'agent bloquerait le mainteneur seul (il ne peut
  pas approuver sa propre PR).
- Aucun secret dans le dépôt ni dans les sorties de l'agent.
- GitHub et GitLab, comme le reste de la CI livrée.

## Questions à trancher

1. **Commande ou recette** : appliquer la protection par une commande
   `drwil` (droits d'administration requis) ou seulement la documenter ?
2. **Par défaut à `init`** ou à la demande ?
3. **GitLab** : protection de branche équivalente dès le premier lot, ou
   GitHub d'abord ?
4. **GitHub App** : à explorer (intention à part) ou écartée ?
5. **Revue obligatoire** : jamais activée par le paquet sans identité
   distincte détectée pour l'agent ?
