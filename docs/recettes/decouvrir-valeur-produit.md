# Recette : découvrir la valeur produit (product discovery)

Objectif : identifier les fonctionnalités à forte valeur métier les plus
pertinentes à développer ensuite, en s'appuyant sur ce qui existe déjà
(code, cadrage) plutôt qu'en partant d'une page blanche.

Comme l'audit de risques (`docs/recettes/auditer-risques-et-dette.md`),
cette recette demande du jugement produit : pas de script, un prompt qui
cadre la méthode pour l'IA.

## Entrées à lire (génériques, pas de chemin en dur)

Localiser les entrées via `.drwil/ia-first.json` plutôt que des noms fixes
(un éventuel docs/01-intentions.md ou docs/02-cadrage.md, dossier src/,
peuvent ne pas exister dans ce projet) :

1. **Vision et cadrage** : les fiches de `dirs.intentions`
   (`docs/intentions/` par défaut, la promesse/le besoin de chaque sujet)
   et de `dirs.projects` (`docs/projets/` par défaut, les décisions et
   contraintes déjà tranchées par chantier).
2. **Code source** : les dossiers déclarés dans `layers` et
   `layerPrefixes`/`codePrefixes` de la config. Repérer les modèles de
   données, routes API et composants déjà prêts ou semi-prêts (ex. une
   donnée déjà stockée mais pas encore affichée = effort faible, valeur
   immédiate).
3. **Tests et infra** : les chemins marqués comme tests dans
   `layerPrefixes`, plus les fichiers d'infra (`ciFiles`,
   `extraCodeGlobs` type `docker-compose*.yml`) pour repérer les briques
   déjà stabilisées.

## Méthode

Pour chaque opportunité identifiée, évaluer :
- **Valeur métier** : bénéfice concret pour l'utilisateur final ou le
  projet (gain de temps, fonctionnalité clé manquante, rétention).
- **Proximité technique / effort** : s'appuie-t-elle sur du code déjà
  existant ? (donnée déjà en base mais pas affichée = effort faible).
- **Alignement produit** : cohérente avec la vision des fiches
  `docs/intentions/` déjà cadrées ?

## Sortie

Générer ou mettre à jour `docs/decouverte-valeur.md` (à créer) à la racine
du projet, selon ce gabarit :

```markdown
# Découverte de valeur et opportunités produit

> Dernier scan : AAAA-MM-JJ
> État du projet : (résumé court de l'état actuel du code)

## Opportunités prioritaires (matrice valeur / effort)

| ID | Fonctionnalité proposée | Pourquoi (valeur métier) | État du code existant | Effort | Action recommandée |
|---|---|---|---|---|---|
| OPT-1 | ... | ... | ... | 🟢 Faible / 🟡 Moyen / 🔴 Élevé | ... |

## Analyse détaillée des meilleures pistes

### OPT-1 — titre
- **Problème résolu** : ...
- **Briques existantes réutilisables** : fichiers réels cités
- **Ce qu'il reste à faire** : ...
- **Impact si implémenté** : ...

## Prochaine étape

Choisir un ID et répondre : « Valide OPT-X pour la convertir en
intention ».
```

## Garde-fous

- Chaque ligne OPT-N doit citer du code réel et/ou une fiche réelle —
  jamais une affirmation sans preuve.
- « Valide OPT-X » débouche sur une fiche d'intention (sous
  `dirs.intentions`) à cadrer, jamais sur du code écrit directement sans
  fiche — cohérent avec QUA-016.
- Déclenché à la main, jamais en CI ni au commit.
