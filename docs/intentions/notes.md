# Intention : notes en vrac

**Statut** : ouverte en permanence — dernière note le 2026-10-26.

## Besoin

Consigner une idée ou une intention d'une ligne à n'importe quel moment, y compris en plein chantier, sans la
cadrer ni la coder : `node .githooks/note.mjs "<texte>"`. Une note est toujours une intention, jamais un ordre
de coder. Quand elle mûrit, elle est promue en fiche d'intention et sa ligne est retirée d'ici.

## Existant

Relevé le 2026-10-21 : les notes sont ci-dessous, une ligne datée chacune, hors de l'index des chantiers.

## Questions à trancher

- [décision] Promouvoir en intention les notes qui ont mûri, et retirer les autres.

## Notes

- 2026-10-21 — Release trop lourde (3 h pour la 0.6.9 : PR de préparation, candidate, verdict, promotion, PR de clôture, CI) : alléger — release directe sans candidate pour un patch, une seule PR au lieu de clôture + note de recette, script qui enchaîne les étapes en gardant les oui humains ; et un réglage équipe / développeur solo qui choisit le niveau de garde (candidate et verdict seulement en équipe)
- 2026-10-21 — Afficher l'état de gouvernance (SCOPING, BUILD, VERIFY, CLOSING) en continu dans le terminal pour suivre l'avancement. Pistes : réglage statusLine de Claude Code livré par le kit avec un script .githooks/state-line.mjs lisant .drwil/state.json ; même script réutilisable dans l'invite du shell ; vérifier si Copilot CLI offre l'équivalent.
- 2026-10-21 — Chantiers trop gros : « critères et preuves durables » a pris 2 h 45, 31 fichiers, 3 contrats créés et 2 étendus, car il touchait trois mécaniques liées (jugement des critères, clôture, CI) ; les deux précédents tenaient en 40 min. Piste : cadrer une fiche par lot (un lot = un chantier vérifiable seul) plutôt qu'une fiche à quatre lots, et le dire dans la recette de cadrage.
- 2026-10-23 — Réduire la consommation par chantier (barriere-commit-de-fusion : 1,6 M pondérés, 64 % de contexte relu, 85 min pour un petit correctif) : (1) sorties de state.mjs, run-checks et verify courtes en mode agent (seulement ce qui change ou échoue) ; (2) vérifier au cadrage que chaque critère sera lu par verify (ID entre backticks) ; (3) contrôle rapide formatage + couverture du seul fichier touché avant run-checks ; (4) consumption.mjs attribue par nom de branche : une branche de cadrage nommée d'après une fiche (cadrage/barriere-commit-de-fusion, qui en cadrait cinq) gonfle le chiffre de cette fiche — attribuer par session ou par chantier ; (5) mesurer le temps par étape (dev, contrôles, clôture, attente CI) pour savoir quelle piste rapporte le plus.
- 2026-10-26 — Récurrent : un chantier qui modifie un hook du gabarit bloque à la clôture tant que la puce « Contrats modifiés » n'est pas écrite sur le oui du demandeur (QUA-137) ; la demander dès le cadrage de la fiche, ou la déclarer au lancement, pour éviter l'arrêt en fin de chantier.
