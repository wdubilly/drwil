# Intention : notes en vrac

**Statut** : ouverte en permanence — dernière note le 2026-10-21.

## Besoin

Consigner une idée ou une intention d'une ligne à n'importe quel moment, y compris en plein chantier, sans la
cadrer ni la coder : `node .githooks/note.mjs "<texte>"`. Une note est toujours une intention, jamais un ordre
de coder. Quand elle mûrit, elle est promue en fiche d'intention et sa ligne est retirée d'ici.

## Existant

Relevé le 2026-10-21 : les notes sont ci-dessous, une ligne datée chacune, hors de l'index des chantiers.

## Questions à trancher

- [décision] Promouvoir en intention les notes qui ont mûri, et retirer les autres.

## Notes

- 2026-10-21 — Documenter dans le README la commande de note (node .githooks/note.mjs, QUA-071), absente du README alors que le changelog 0.6.9 l'annonce
- 2026-10-21 — Clôture : envisager que close.mjs applique directement les corrections sans jugement (--fix par défaut) au lieu de les proposer d'abord ; décision actuelle QUA-076 : proposer sans écrire, appliquer avec --fix
- 2026-10-21 — Voir l'opportunité (ou non) de refactorer certaines parties de drwil en skills — gain attendu faible (AGENTS.md ≈ 9 Ko, ~2 300 tokens ; 18 skills déjà en raccourcis vers docs/recipes/) ; à mesurer avant de décider ; ne jamais déplacer la gouvernance (hooks, état, contrats) ni la source unique docs/recipes/; condition ferme du demandeur : aucune perte de compatibilité entre outils, sinon sans intérêt
- 2026-10-21 — Release trop lourde (3 h pour la 0.6.9 : PR de préparation, candidate, verdict, promotion, PR de clôture, CI) : alléger — release directe sans candidate pour un patch, une seule PR au lieu de clôture + note de recette, script qui enchaîne les étapes en gardant les oui humains ; et un réglage équipe / développeur solo qui choisit le niveau de garde (candidate et verdict seulement en équipe)
- 2026-10-21 — Objectifs stabilisés 2026-10-21 (base de la refonte de la roadmap, à cadrer en SCOPING) : prouver la valeur par des chiffres avant de décider de publier ou vendre ; cible : solo et équipe, avec un réglage équipe / solo ; horizon : quelques jours ; contraintes à tenir ensemble : rigueur, fluidité, coût, en visant la fabrique autonome
