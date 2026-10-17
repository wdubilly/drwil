# Projet : Windows et macOS testés seulement quand une PR touche du code

**Statut** : cadré le 2026-10-18 (ouvert le 2026-10-10, recadré).
**Risque** : HIGH
**Maturité** : prêt

<!-- scope
files:
  - .github/workflows/ia-first.yml
  - .github/scripts/ci-multi-os.mjs
  - .github/scripts/ci-multi-os.test.mjs
  - .drwil/ia-first.json
  - outils/miroirs.json
  - docs/contracts.md
-->

(cadrage : le workflow du dépôt ; le script qui calcule la matrice et son
test, qui lit aussi ce workflow, propres au
dépôt ; le contrôle du nouveau contrat déclaré dans `.drwil/ia-first.json` ;
la raison du job `kit-tests` dans `outils/miroirs.json` si elle change ; le
registre, pour le nouveau contrat.)

## 1. Besoin

La CI de ce dépôt (`.github/workflows/ia-first.yml`) se déclenche sur
`push` et sur `pull_request` : sur une branche avec PR, chaque push lance
deux fois la matrice `kit-tests` sur Ubuntu, Windows et macOS, y compris
pour une PR qui ne touche que de la documentation (cadrage, clôture,
journal, intentions), où Windows et macOS ne peuvent rien apprendre. Les
jobs Windows (5 à 8 minutes) et macOS rallongent l'attente avant de
fusionner.

Le but du demandeur (2026-10-18) : s'assurer que ce qui part en release
marche sous Windows et macOS, sans payer ces tests là où ils ne servent à
rien. Tester à chaque PR de code reste utile : un échec propre à un OS
désigne tout de suite le changement en cause, au lieu de le chercher parmi
tous les chantiers fusionnés depuis la release précédente.

## Critères d'acceptation

- Toute PR de code, et chaque push sur master, fait tourner la suite du
  kit sur Ubuntu, Windows et macOS ; Windows et macOS une seule fois par
  push — contrat à créer
- Une PR qui ne touche que la documentation ne fait tourner la suite que
  sur Ubuntu et reste fusionnable — contrat à créer
- Chaque contrôle garde une couverture CI prouvée — `QUA-013`

## 2. Hors périmètre

- Ne tester Windows et macOS qu'à la release : écarté de nouveau le
  2026-10-18 (un bug propre à un OS serait découvert trop tard, mêlé à
  plusieurs chantiers, et retirer leurs checks exigés affaiblirait la
  protection de master).
- Supprimer l'un des deux déclenchements `push` / `pull_request` : écarté
  le 2026-10-05 (le premier teste la tête de branche, le second le
  résultat de la fusion) ; le job `checks` garde les deux.
- Un sous-ensemble des tests propre à l'OS sur Windows et macOS : à
  envisager plus tard si l'attente reste trop longue.
- Le workflow livré dans le gabarit : il n'a pas de matrice multi-OS, ce
  changement ne concerne que le dépôt drwil (QUA-018, dépôt ou livrable).
- Le ruleset de master (`.github/ruleset-master.json`) : inchangé, il
  exige toujours `kit-tests (<os>)` sur les trois OS.

## 3. Contraintes

- Les checks exigés par le ruleset portent les noms `kit-tests
  (ubuntu-latest)`, `kit-tests (windows-latest)`, `kit-tests
  (macos-latest)` : sur toute PR, les trois doivent être rapportés et
  verts, sinon la PR reste bloquée en attente.
- Un `if` de job ne peut pas lire `matrix`, et un job de matrice sauté par
  son `if` n'est pas rapporté sous le nom `kit-tests (<os>)` : la PR
  attendrait un check qui ne vient jamais. Sur une PR de documentation, les
  jobs Windows et macOS démarrent donc quand même et sautent leurs étapes
  (vert en quelques secondes).
- Sur un push d'une branche autre que master, aucun job Windows ou macOS
  ne doit être rapporté : un check vert sans test, sur le même commit que
  celui de la PR, pourrait masquer un échec de la PR.
- « Code touché » se lit sur tout le diff de la PR (base de la PR jusqu'à
  sa tête), pas sur le dernier push seulement.
- Le contrôle de couverture CI (QUA-013, `ci-coverage`) vérifie les
  déclencheurs du job `checks`, que ce chantier ne change pas ; s'il venait
  à couvrir `kit-tests`, l'adapter (élargir alors le cadrage).
- `alert-if-ci-broken` dépend de `kit-tests` : il doit toujours alerter
  quand master casse sur un OS.

## 4. Décisions

- **2026-10-10 — Matrice complète sur `pull_request`, Ubuntu seul sur
  `push`** (demandeur) : Windows et macOS une fois par push, pas deux.
- **2026-10-18 — Windows et macOS seulement quand la PR touche du code**
  (demandeur, sondage) ; matrice complète à chaque push sur master, filet
  avant release ; cache des dépendances npm (`cache: npm` de
  `actions/setup-node`) sur tous les jobs. Tranche les deux points ouverts
  depuis le 2026-10-10.
- **2026-10-18 — Ce qui n'est pas du code** (proposé par l'agent,
  validé par le demandeur le 2026-10-18) : une PR « de documentation »
  ne touche que `docs/**` et `.drwil/usage.jsonl` (ligne écrite à la
  clôture). Tout le reste compte comme du code, y compris le Markdown du
  gabarit (`packages/drwil/templates/`), que lisent les tests du kit, et
  les fichiers Markdown de la racine (`AGENTS.md`, `README.md`…).
- **2026-10-18 — Forme technique** (agent) : un petit job Ubuntu calcule
  la liste des OS à tester et, pour chacun, s'il faut lancer la suite ;
  `kit-tests` lit cette liste (matrice dynamique). Ubuntu seul sur un push
  de branche ; les trois OS sur une PR (Windows et macOS sans étapes si la
  PR ne touche que la documentation) et sur un push sur master.

## Contrats concernés

- **Contrat à créer** — la suite du kit tourne sur les trois OS avant la
  fusion de toute PR de code et à chaque push sur master ; preuve : un test
  qui lit le workflow (sous `.github/scripts/`, contrôle
  propre déclaré dans `.drwil/ia-first.json`).
- **QUA-013** — Contrôle non exécuté n'est pas passé : un job Windows ou
  macOS sans étapes ne doit jamais être lu comme « tests passés » ailleurs
  que sur une PR de documentation.
- **QUA-004** — Seuil de couverture de test : la suite du kit, couverture
  comprise, tourne toujours sur Ubuntu.
- **QUA-018** — Dépôt ou livrable : changement propre au dépôt.

## 5. Points à trancher

- Aucun : tous tranchés le 2026-10-18 (section 4).

## 6. Increments

- **Lot 1 — matrice selon le code touché** [IA] : test du workflow
  d'abord (contrat à créer), puis le job de calcul, la matrice dynamique de
  `kit-tests`, le cache npm, le contrat et son contrôle. Critère de
  sortie : sur la PR du chantier (du code) un push lance Ubuntu, Windows et
  macOS une seule fois chacun ; sur une PR de test qui ne touche que
  `docs/`, Windows et macOS sont verts sans tests et la PR est fusionnable ;
  un push de branche ne rapporte qu'Ubuntu ; contrôles locaux et CI verts,
  `drwil verify` PASS.

## 7. Reprise

- **Dernier état** (2026-10-18) : recadré, prêt ; rien de réalisé.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`), en
  tête de la 0.6.4.
