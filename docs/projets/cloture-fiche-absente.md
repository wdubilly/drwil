# Projet : en CLOTURE, une fiche déjà supprimée ne rend pas l'état invalide

**Statut** : cadré le 2026-10-10 — lot 1 à lancer.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - .githooks/etat.mjs
  - .githooks/etat.test.mjs
  - packages/drwil/templates/common/base/.githooks/etat.mjs
  - packages/drwil/templates/common/base/.githooks/etat.test.mjs
  - docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/fr/base/docs/recettes/travailler-en-branche.md
  - packages/drwil/templates/en/base/docs/recipes/working-with-branches.md
-->

(cadrage : la validation de l'état et la transition `CLOTURE → CADRAGE` de
`.githooks/etat.mjs`, côté dépôt et côté gabarit — QUA-018 (périmètre
explicite : dépôt drwil vs livrable gabarit) : le défaut touche les deux.)

## 1. Besoin

Constaté le 2026-10-10 en clôturant le rappel court (journal, 2026-10-10)
(PR #11). La recette `docs/recettes/travailler-en-branche.md`, section
« Clôturer », fait condenser la fiche dans `docs/projets/journal.md` puis
**supprimer** le fichier. La règle de l'activité CLOTURE dit : « clore la
fiche, puis revenir en CADRAGE ». Mais une fois la fiche supprimée,
`validerEtat` déclare l'état invalide (`attente_active : fiche … introuvable`) :

- `node .githooks/etat.mjs` affiche « État invalide, traité comme CADRAGE
  neutre » ;
- `node .githooks/etat.mjs passer CADRAGE` est refusé (« transition
  CADRAGE → CADRAGE interdite »), puisque l'état est repris depuis le neutre.

Le repli est sûr (on retombe en CADRAGE), mais le chemin nominal de la
recette produit un avertissement et une transition refusée. Contournement
utilisé ce jour-là : restaurer la fiche, passer en CADRAGE, puis la
resupprimer.

Intention : en activité CLOTURE seulement, une fiche active absente est
tolérée (c'est l'issue normale d'une clôture) et `passer CADRAGE` réussit.

## 2. Hors périmètre

- Changer la recette « Clôturer » (l'ordre condenser → supprimer reste).
- Tolérer une fiche absente dans une autre activité : en ATTENTE,
  REALISATION, PREUVES ou VERIFY, une fiche introuvable reste un état
  invalide (le périmètre se lit dans la fiche).

## 3. Contraintes

- La tolérance n'ouvre aucun droit : en CLOTURE sans fiche, aucun
  périmètre de code (le commit de clôture ne touche que les fiches et la
  doc de `docs/projets/`).
- Le contexte et le rappel court restent lisibles : signaler « fiche
  clôturée (supprimée) » plutôt qu'un état invalide, sans planter sur la
  lecture du bloc cadrage (`rappel` lit la fiche pour compter le périmètre).
- Les autres validations de l'attente (chemin sous `docs/projets/`, extension markdown,
  pas un modèle) restent appliquées en CLOTURE.

## 4. Décisions

- **2026-10-10 — Tolérer une fiche absente en CLOTURE** : retenu par le
  demandeur, de préférence à « supprimer la fiche seulement après le retour
  en CADRAGE » (qui aurait changé la recette). [décision utilisateur]

- **2026-10-10 — Consigne de recette en plus du code** : la section
  « Clôturer » de la recette de branche (dépôt et gabarit, fr et en) dit de
  revenir en CADRAGE avant de supprimer la fiche ; cadrage élargi à ces
  trois fichiers. En passant, la recette du dépôt disait la protection de
  branche indisponible, faux depuis le ruleset sur `master`.
  [décision utilisateur]

## Contrats concernés

- **QUA-015** — Chantiers exploitables à froid : l'état relu sur disque doit
  rester cohérent après une clôture faite selon la recette.
- **QUA-018** — Périmètre explicite : correction dans le dépôt et dans le
  gabarit.

## 5. Points à trancher

- [décision] Faut-il signaler (avertissement) une fiche **encore présente**
  au retour en CADRAGE, qui aurait peut-être dû être condensée ?
  Proposition : non, une fiche peut garder des lots ouverts.

## 6. Lots

- **Lot 1 — tolérance en CLOTURE** [IA] : la validation de l'attente ne
  signale plus l'absence de la fiche quand l'activité est CLOTURE ;
  contexte et rappel le disent en clair ; dépôt et gabarit identiques.
  Critère de sortie : tests (CLOTURE sans fiche valide et `passer CADRAGE`
  réussit ; REALISATION sans fiche toujours invalide ; rappel sans fiche ne
  plante pas) ; `node .githooks/run-checks.mjs` et CI verts.

## 7. Reprise

- **Dernier état** (2026-10-10) : fiche cadrée, rien de réalisé.
- **Travail non commité** : la fiche elle-même et sa ligne d'index.
- **Prochaine étape** : [IA] commit de cadrage ; [humain] `/drwil-lancer`.
