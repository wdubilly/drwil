# Intention : notes en vrac

**Statut** : ouverte en permanence — dernière note le 2026-10-25.

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
- 2026-10-25 — Chronométrer chaque contrôle de run-checks : le script ne le fait pas encore, donc on ne sait pas lesquels des 121 contrôles coûtent le plus (prochaine mesure utile du tableau « Durée de la CI drwil », https://claude.ai/artifact/LVTAv9omSJ4h8bL9s22vbT). À rattacher à docs/intentions/suivi-ci-et-contexte.md.
- 2026-10-25 — drwil verify --agent prend ≈ 22 s (mesuré le 2026-10-25 sur master) : il relance en série tous les contrôles cités par le registre (packages/drwil/src/verify.ts, c.run), dont 53 suites node --test filtrées par contrat (18 s), alors que run-checks vient de les jouer en parallèle (QUA-119). Pistes : paralléliser verify via runAsync (.githooks/engine.mjs) ; reprendre les résultats de run-checks sur un arbre inchangé (à trancher au regard de QUA-013) ; suite unique avec verdict par contrat (QUA-033). À rattacher à docs/intentions/suivi-ci-et-contexte.md.
