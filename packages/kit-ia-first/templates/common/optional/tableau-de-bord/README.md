# Tableau de bord (optionnel)

Module **non installé par défaut** : `scaffold()` ne copie pas ce dossier.
Génère un **unique fichier HTML statique** (pas de serveur, pas de
conteneur, pas de dépendance) : avancement des chantiers et couverture des
contrats, lus directement dans les `.md` existants. N'invente ni ne
recalcule aucun état — affiche la ligne « Statut » et les lots tels
qu'écrits dans chaque fiche (« une information, une seule source »,
`docs/ia-first.md` section 7).

## Contenu

- `tableau-de-bord.mjs` : le générateur, bilingue (FR/EN selon `.drwil/ia-first.json -> lang`).

## Activation

1. Copier `tableau-de-bord.mjs` dans `.githooks/` du projet.
2. Lancer à la main, quand besoin : `node .githooks/tableau-de-bord.mjs
   [chemin-de-sortie]` (défaut : `docs/tableau-de-bord.html`). **Jamais**
   en CI ni au commit — c'est un outil de consultation, pas un contrôle.
3. Ajouter le fichier de sortie au `.gitignore` (c'est un artefact dérivé,
   pas une source).

## Ce qu'il affiche

- **Chantiers** : les cases de l'index (`docs/projets/en-attente.md` ou
  équivalent) telles quelles, puis pour chaque fiche de `docs/projets/`
  (hors modèles) son titre, sa ligne « Statut » brute et les lots de sa
  section « Lots » (titre, marqueur, premier extrait de texte).
- **Contrats** : les ID du registre (`docs/contrats.md`) avec leur règle,
  puis ceux du catalogue (`docs/catalogue-contrats.md`, non installés) —
  les deux formats de définition sont reconnus (titre `## ID — ...` ou
  tableau `| ID | ... |`, même détection que `.githooks/check-docs.mjs`).

Limite assumée : le format générique d'une fiche ne code pas structurellement
un statut « fait/pas fait » par lot — ce tableau de bord ne cherche pas à
le déduire, il recopie le texte existant.
