# Projet : informer de ce que drwil peut faire au-delà de la gouvernance

**Statut** (2026-10-04) : fait — lots 1 et 2 livrés.

<!-- cadrage
fichiers:
  - packages/drwil/templates/fr/base/AGENTS.md
  - packages/drwil/templates/fr/base/README.md
  - packages/drwil/templates/en/base/AGENTS.md
  - packages/drwil/templates/en/base/README.md
-->

## 1. Besoin

Une fois un projet scaffoldé, rien n'indique que drwil livre déjà des
recettes allant au-delà de la gouvernance pure : audit de risques/dette
(`docs/recettes/auditer-risques-et-dette.md`), tableau de bord
d'avancement (`docs/recettes/visualiser-avancement.md`, module optionnel
`.githooks/tableau-de-bord.mjs`), suivi de coût par chantier
(`docs/recettes/suivre-consommation-par-lot.md`), découverte de valeur
produit (`docs/recettes/decouvrir-valeur-produit.md`). Ces recettes
existent, livrées dans `docs/recettes/`, mais ni `AGENTS.md` (point
d'entrée agent) ni `README.md` (point d'entrée humain) ne les
mentionnent — seule façon de les découvrir : fouiller `docs/recettes/`
par hasard.

Deux publics, deux points d'entrée distincts, chacun avec son trou :

- **Agent IA** : le tableau « Charger le contexte progressivement »
  d'`AGENTS.md` n'indexe que des déclencheurs liés à un fichier touché
  (route API, écran...), pas une demande explicite (« fais un audit »,
  « où en est le projet »).
- **Humain** : la table « Documentation » de `README.md` renvoie à
  `docs/recettes/` en bloc, sans citer les recettes au-delà des tâches de
  dev (lancer en local, déployer...).

## 2. Hors périmètre

- Automatiser le déclenchement de ces recettes : elles restent des
  demandes explicites (audit = jugement IA, tableau de bord = lancé à la
  main) — décision déjà actée ailleurs, pas remise en cause ici.
- Créer de nouvelles recettes : ce chantier ne fait qu'indexer
  l'existant.
- Mettre à jour l'`AGENTS.md`/`README.md` déjà générés d'autres projets
  utilisant une version antérieure du kit : seuls les templates (donc les
  futurs `init`/`apply`) sont concernés par ce chantier ; une mise à jour
  de drwil lui-même (dogfooding) est un lot séparé, volontairement
  distinct (voir lot 2).

## 3. Contraintes

- Rester cohérent avec le principe déjà en place : ajouter des lignes
  dans les tableaux existants (ou une sous-section immédiatement en
  dessous), pas une nouvelle mécanique de doc.
- Les deux langues (`fr`/`en`) doivent rester symétriques (contrôlé par
  le test « même nombre de fichiers livrés en français et en anglais »,
  lot 7).
- `.githooks/check-docs.mjs` doit rester vert : toute recette citée doit
  exister réellement dans les deux langues.

## 4. Décisions

- (2026-10-04) Emplacement dans `AGENTS.md` : nouvelles lignes ajoutées
  au tableau « Charger le contexte progressivement » existant (pas de
  section à part), avec un déclencheur « Si on te demande... » distinct
  du « Si tu touches à... » déjà présent — une ligne d'intitulé
  intermédiaire suffit, pas un second tableau.
- (2026-10-04) Emplacement dans `README.md` : nouvelles lignes dans la
  table « Documentation » existante, formulées pour un humain (« Voir où
  en est le projet », « Auditer risques et dette technique », « Suivre
  le coût d'un chantier », « Explorer la valeur produit »).
- (2026-10-04) Portée : 4 recettes concernées
  (`docs/recettes/visualiser-avancement.md`,
  `docs/recettes/auditer-risques-et-dette.md`,
  `docs/recettes/suivre-consommation-par-lot.md`,
  `docs/recettes/decouvrir-valeur-produit.md`).
- (2026-10-04) Mise à jour de drwil lui-même (dogfooding) : faite en lot
  2, séparément, pour garder le lot 1 (templates) petit et testable seul.

## 5. Points à trancher

(aucun — les décisions ci-dessus couvrent le périmètre)

## 6. Lots

- **Lot 1 — indexer les recettes dans les templates** [IA] : ajouter les
  lignes dans `packages/drwil/templates/fr/base/AGENTS.md`,
  `packages/drwil/templates/en/base/AGENTS.md` (tableau existant)
  et `packages/drwil/templates/fr/base/README.md`,
  `packages/drwil/templates/en/base/README.md` (table
  « Documentation »). Critère de sortie : `npm test` (36 tests) toujours
  vert, y compris le test « même nombre de fichiers livrés en français
  et en anglais » ; `.githooks/check-docs.mjs` ne signale aucune
  citation cassée.
- **Lot 2 — appliquer à drwil lui-même** [IA] : reporter les mêmes
  lignes dans l'`AGENTS.md`/`README.md` déjà générés à la racine du
  dépôt (dogfooding). Critère de sortie : `node .githooks/run-checks.mjs`
  toujours vert.

## 7. Reprise

- **Dernier état** (2026-10-04) : lots 1 et 2 livrés. Nouvelle ligne
  d'intitulé « Si on te demande… » dans le tableau « Charger le contexte
  progressivement » des 2 `AGENTS.md` (FR/EN) et nouvelles lignes dans la
  table « Documentation » des 2 `README.md` (FR/EN) des templates
  (`packages/drwil/templates/`), + report identique sur `AGENTS.md` et
  `README.md` à la racine de drwil (dogfooding, lot 2). 4 recettes
  indexées côté FR, équivalents EN dans les templates sous
  docs/recipes/ : docs/recettes/visualiser-avancement.md,
  docs/recettes/auditer-risques-et-dette.md,
  docs/recettes/suivre-consommation-par-lot.md,
  docs/recettes/decouvrir-valeur-produit.md. 38/38 tests
  verts, check-docs.mjs 0 erreur.
- **Travail non commité** : aucun après ce commit.
- **Prochaine étape** : aucune (les 2 lots du projet sont livrés).
