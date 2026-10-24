# Intention : notes en vrac

**Statut** : ouverte en permanence — dernière note le 2026-10-24.

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
- 2026-10-22 — Le test QUA-060 « refuse tout dossier situé dans le dépôt » (outils/banc-agents.test.mjs, preparer avec base: RACINE) laisse un dossier vide drwil-banc-* à la racine du dépôt à chaque lancement : preparer crée le dossier (mkdtempSync) avant de refuser, sans le supprimer ; ~470 dossiers vides constatés le 2026-10-23. Correctif : supprimer le dossier avant de lever l'erreur (comme outils/banc.mjs), puis nettoyer la racine.
- 2026-10-23 — Une CI rouge révélée après le commit de clôture n'a aucun chemin gouverné : depuis CLOSING seul SCOPING est permis, la fiche est supprimée (cadrage non élargissable) et un détour ne s'ouvre qu'en BUILD ; cas vécu sur la PR #213 (motif QUA-108), contourné par l'entretien courant.
- 2026-10-23 — Désinstallation : après drwil guarantees --protect (contrôle checks requis, enforce_admins), uninstall retire le workflow de CI sans toucher la forge, donc toute PR vers la branche principale reste bloquée sur un contrôle qui ne vient plus. uninstall devrait au moins le signaler (et la doc Uninstalling du README le dire) ; piste : proposer la commande gh qui lève la protection, avec l'accord de l'humain.
- 2026-10-23 — Réduire la consommation par chantier (barriere-commit-de-fusion : 1,6 M pondérés, 64 % de contexte relu, 85 min pour un petit correctif) : (1) sorties de state.mjs, run-checks et verify courtes en mode agent (seulement ce qui change ou échoue) ; (2) vérifier au cadrage que chaque critère sera lu par verify (ID entre backticks) ; (3) contrôle rapide formatage + couverture du seul fichier touché avant run-checks ; (4) consumption.mjs attribue par nom de branche : une branche de cadrage nommée d'après une fiche (cadrage/barriere-commit-de-fusion, qui en cadrait cinq) gonfle le chiffre de cette fiche — attribuer par session ou par chantier ; (5) mesurer le temps par étape (dev, contrôles, clôture, attente CI) pour savoir quelle piste rapporte le plus.
- 2026-10-23 — Un lancement intercalé efface la file en silence : le 2026-10-24, lancer l'entretien courant par /drwil-start (pour corriger la PR #218 bloquée en CLOSING) a remplacé la file décidée au lancement (reouvrir-apres-cloture, contournements-completes) ; state.mjs next a ensuite refusé, sans dire que la file avait disparu. Attendu : un lancement intercalé suspend la file (ou demande), et next/state disent clairement qu'il n'y a plus de file et pourquoi.
- 2026-10-24 — Accélérer la CI sans perte de qualité (reste après le chantier du 2026-10-24, voir `docs/projects/journal.md`) : suite unique + verdict par contrat via reporter (décision humaine, QUA-033) et jobs CI découpés via ciJob (renomment les checks exigés par le ruleset), seulement si la CI reste trop lente ; cache de compilation. Mesures : tableau de bord https://claude.ai/artifact/LVTAv9omSJ4h8bL9s22vbT
- 2026-10-24 — Réduire le contexte relu par chantier sans affaiblir la gouvernance : lecture de contracts.md et journal.md par ID ou plage (glossary.mjs), rappel d'état raccourci (n'afficher que ce qui change), contrôles lancés en sous-agent (seule la conclusion revient), une session par chantier pour tous les outils, sorties de run-checks limitées aux échecs ; mesurer le gain avec consumption.mjs sur deux chantiers comparables (cache lu moyen par requête ~170 k en 2026-10-24).
