# Intention : une vue de relecture — ce qui demande le jugement humain

**Statut** (2026-10-09) : à cadrer — intention posée par le demandeur,
questions à trancher en fin de fiche.

**Projet** : DRWIL — **Cible** : après la gouvernance (machine d'état et
double barrière) — **Niveau de risque** : MEDIUM.

## Besoin

Le 2026-10-09, la PR de la gouvernance (45 fichiers, environ 3 500 lignes)
a été fusionnée par le demandeur « sur la confiance » : la relire en entier
n'avait pas de sens, et rien ne montrait **ce qui demandait son jugement**.
Tout ce que produit le travail d'un agent est pourtant versionné et
vérifiable (fiches, décisions, cadrage, attestations, évidence de verify,
trailers `Drwil-Attente`), mais dispersé.

Le principe directeur de drwil — « l'agent peut réaliser le travail ; il
ne peut pas définir seul les conditions dans lesquelles ce travail est
considéré comme acceptable » — suppose que l'humain puisse **voir et
valider ces conditions** en quelques minutes. Sans cette vue, la relecture
humaine, dernier mot de la chaîne de confiance, se réduit à un acte de foi.

Intention : une vue qui réponde à « qu'est-ce que je dois valider dans
cette PR (ou ce chantier) ? », en 5 à 10 points précis plutôt qu'un diff.

## Ce que la vue pourrait rassembler

- **Décisions** ajoutées ou modifiées dans les fiches (les choix du
  demandeur, tels que rédigés par l'agent) : sont-elles fidèles ?
- **Élargissements de cadrage** : quels fichiers l'agent s'est autorisé à
  toucher, dans quels commits.
- **Ce qui change les règles du jeu** : hooks, règles `deny`, réglages
  `barriere` et `transitions`, contrats, seuils.
- **Preuves** : verdict de `drwil verify`, contrats attestés plutôt que
  prouvés, ce que l'agent a déclaré non testé.
- **Exceptions** : contrôles non exécutés, pushes hors hooks, écarts
  signalés et mis en attente.

## Existant

- Tableau de bord statique, module optionnel (`visualiser-avancement`) :
  avancement des chantiers et couverture des contrats, en HTML, sans
  serveur ni déploiement.
- `drwil verify --agent` : verdict et actions humaines attendues.
- Barrière de périmètre : rejoue chaque commit d'une branche contre le
  cadrage de sa fiche (base pour lister les élargissements).
- Hors périmètre de la gouvernance : « Dashboard UI » — c'est donc un
  sujet distinct.

## Contraintes

- Aucun contrôle mécanique ne doit consommer de tokens ni dépendre de
  l'affirmation d'un agent : la vue se calcule depuis Git et les fichiers
  versionnés.
- Pas de serveur ni de SaaS imposés par défaut (cohérence avec le reste du
  kit).
- Agnostique de l'outil d'agent.

## Questions à trancher

1. **Forme** : page statique générée (comme le tableau de bord), commentaire
   automatique sur la PR, sortie de `drwil` dans le terminal, ou
   application interactive (« backoffice ») ?
2. **Granularité** : par PR (diff de branche), par chantier (fiche), ou les
   deux ?
3. **Articulation** avec le tableau de bord existant : extension du module
   ou outil séparé ?
4. **Validation** : la vue sert-elle seulement à lire, ou enregistre-t-elle
   aussi une validation humaine point par point (comme `drwil attest`) ?
5. **Livrable** : outil du dépôt drwil seulement, ou livré dans le gabarit
   (QUA-018, périmètre dépôt / gabarit) ?
