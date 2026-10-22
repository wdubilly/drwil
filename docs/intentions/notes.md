# Intention : notes en vrac

**Statut** : ouverte en permanence — dernière note le 2026-10-22.

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
- 2026-10-21 — Adoption d'un projet existant : scopeReminder bloque dès l'init (tout le code déjà là est hors fiche, 438 fichiers chez run-box-v2). Pistes : init en warning si du code existe ; fiche d'amorçage « code existant » générée par init ; étape dans /drwil-adopt pour choisir le niveau de rappel.
- 2026-10-21 — Afficher l'état de gouvernance (SCOPING, BUILD, VERIFY, CLOSING) en continu dans le terminal pour suivre l'avancement. Pistes : réglage statusLine de Claude Code livré par le kit avec un script .githooks/state-line.mjs lisant .drwil/state.json ; même script réutilisable dans l'invite du shell ; vérifier si Copilot CLI offre l'équivalent.
- 2026-10-21 — Chantiers trop gros : « critères et preuves durables » a pris 2 h 45, 31 fichiers, 3 contrats créés et 2 étendus, car il touchait trois mécaniques liées (jugement des critères, clôture, CI) ; les deux précédents tenaient en 40 min. Piste : cadrer une fiche par lot (un lot = un chantier vérifiable seul) plutôt qu'une fiche à quatre lots, et le dire dans la recette de cadrage.
- 2026-10-22 — Le passage BUILD → EVIDENCE sur l'entretien courant (fiche permanente) annonce sa suppression et liste ~40 faux avertissements « cite docs/projects/routine-maintenance.md, qui sera supprimée » : le signal de clôture devrait exempter la fiche permanente.
- 2026-10-22 — Le hook pre-push applique QUA-017 (pas de travail direct sur la branche principale) à la branche courante, pas à la référence poussée : depuis master, le push de recette/vX.Y.Z par recette-note.mjs (lancé par create-release.mjs) est refusé, la note de recette n'est pas écrite (v0.7.0, 2026-10-22). Juger la référence distante lue sur l'entrée standard ; recette-note.mjs devrait aussi afficher la sortie de git en cas d'échec.
