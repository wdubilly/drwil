# Intention : la protection de la forge dans le livrable

**Statut** (2026-10-10) : à cadrer — intention posée par le demandeur ;
questions à trancher en fin de fiche.

**Revu le 2026-10-17** : retour d'expérience de `drwil_com` (section
« Retour de drwil_com » ci-dessous) ; le besoin reste entier, et le
demandeur en fait la priorité 3 avec un accent sur **vérifier** la barrière
plutôt que la configurer partout.

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche la CI livrée et la
gouvernance des projets qui adoptent drwil).

## Besoin

Le 2026-10-10, ce dépôt a été protégé côté forge (chantier
journal du 2026-10-13, « Protéger master ») : ruleset sur `master` sans
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
- journal du 2026-10-13, « Protéger master » : la même chose, faite à la main pour
  ce dépôt.

## Retour de drwil_com (2026-10-17)

Rapport « docs/experiments/acceptance-criteria-report.md » de `drwil_com`
(écart 5, scénario S7) :

- Sans protection, `gh pr merge --auto` a fusionné la PR #1 aussitôt :
  aucun contrôle n'était exigé (sa CI était verte par chance).
- Protection de `main` posée à la main (contrôle `checks` exigé, strict,
  appliqué aux administrateurs) : une PR est bien passée de `BLOCKED` à
  `CLEAN` quand `checks` est devenu vert. Le blocage d'une PR rouge
  **n'a pas été observé** : ne pas le présenter comme prouvé.

Ce que le demandeur attend en priorité : que le kit **vérifie** la
barrière et distingue trois cas — protection absente, mal configurée
(contrôle exigé absent, mal nommé, non strict), conforme — en
documentant les limites de la plateforme et des permissions (lire la
protection demande des droits que l'agent n'a pas toujours).

**Premier lot validé (demandeur, 2026-10-17)** : vérifier la configuration
seulement, en trois états — absente, mal configurée, conforme — plus
« non vérifié » quand les permissions ne permettent pas de conclure.
Vérifier la configuration et observer une PR rouge bloquée sont deux
choses distinctes : l'absence d'un essai de PR rouge reste une **limite
documentée**, jamais une réussite supposée.

Critères d'acceptation candidats : `doctor` (ou un contrôle) rend l'un des
trois cas, avec le nom des contrôles exigés comparé aux jobs de la CI
installée ; sans droit de lecture, il le dit (« non vérifié »), jamais
« conforme ». Tests : réponses de l'API simulées pour les trois cas et
pour l'accès refusé.

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
6. **Vérifier d'abord** (2026-10-17) : un premier lot qui ne fait que
   vérifier la protection (trois cas, `doctor`), la configuration
   restant une recette, avant toute commande qui l'applique ?
