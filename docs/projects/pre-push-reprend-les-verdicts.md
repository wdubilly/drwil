# Projet : le pre-push reprend un verdict « ok » dont les fichiers n'ont pas changé

**Statut** : cadré le 2026-10-25 — dépend de `docs/projects/journal.md`.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/suivi-ci-et-contexte.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Le pre-push rejoue **tous** les contrôles, quel que soit ce qui est poussé.
Le 2026-10-25, pousser un seul commit de documentation (une fiche et une
ligne d'index) a rejoué le paquet entier — build, tests, couverture
(152 s) — pour un total de 2 min 32 s, alors que ces contrôles ne jugent
aucun des fichiers poussés. Au pre-commit, un contrôle est déjà différé
quand aucun fichier indexé n'est dans son `paths` ; au pre-push, rien de
tel. Il faut que le pre-push ne rejoue pas un contrôle dont les fichiers
n'ont pas changé depuis un passage « ok », sans affaiblir la barrière : la
CI, porte de confiance, rejoue toujours tout.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID
à attribuer à ce moment-là dans le registre.)

- Le pre-push reprend le verdict « ok » d'un contrôle dont l'empreinte
  (fichiers de son `paths` et sa déclaration) est identique à celle d'un
  passage précédent, le dit dans sa sortie (« repris », « rejoué »), et
  rejoue tout contrôle dont l'empreinte diffère, sans `paths`, sans verdict
  « ok », en `reuse: false`, ou dont l'arbre de travail diffère du commit
  poussé — contrat à créer
- La CI ne reprend jamais un verdict : elle rejoue tout — contrat à créer
- Un contrôle repris a bien tourné : QUA-013 le dit — `QUA-013`

## 2. Hors périmètre

- Le calcul de l'empreinte par contrôle et sa consignation par `run-checks` :
  `docs/projects/journal.md` (lots 2 et 3), dont ce
  chantier dépend ; il ne peut être lancé qu'après.
- La reprise par `verify` et par `run-checks` hors hook : même fiche.
- Le pre-commit : il diffère déjà par `paths` des fichiers indexés.

## 3. Contraintes

- Réutilise l'empreinte par contrôle de la fiche précédente : pas une
  seconde empreinte.
- QUA-013 (un contrôle non exécuté n'est pas passé) reste vrai : le pre-push
  ne laisse jamais un contrôle « non joué » ; un verdict repris est celui
  d'un contrôle qui a tourné sur les mêmes fichiers.
- QUA-140 reste intact : une passe de hook ne laisse rien à reprendre **à
  `verify`**. Le pre-push lit les verdicts de `run-checks` mais consigne les
  siens dans un fichier distinct de `.drwil/evidence/run-checks-verdicts.json`
  (si présent),
  que `verify` ignore.
- Le pre-push juge l'arbre de travail : si celui-ci diffère du commit poussé
  (modifications non commitées, autre référence poussée), tout est rejoué.
- Les verdicts sont locaux (hors de git) : ils ne remplacent jamais la CI.
  Sans verdict lisible ou au moindre doute (empreinte `null`), le contrôle
  est rejoué.
- Livré à tout projet (gabarit des hooks) ; propre à ce dépôt pour les
  `paths` de son `.drwil/ia-first.json` (QUA-018), déjà audités par la
  fiche précédente (lot 1).

## 4. Décisions

(validées par le demandeur le 2026-10-25)

1. **Approche** : le pre-push reprend un verdict « ok » de même empreinte,
   plutôt que de différer les contrôles dont les fichiers n'ont pas changé
   (cela aurait exigé de modifier QUA-013).
2. **Forme** : une fiche séparée, qui dépend de `verify-reprise-par-controle`.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — lecture et consignation des verdicts au pre-push** [IA] : le
  pre-push lit les verdicts « ok » de `run-checks` et les siens, compare
  l'empreinte par contrôle, reprend ou rejoue, le dit ; consigne les verdicts
  qu'il a joués dans son propre fichier ; arbre de travail différent du
  commit poussé, ou CI : tout rejoué ; tests des hooks sur dépôts
  temporaires (commit de doc seul ⇒ contrôles de code repris ; fichier de
  code modifié ⇒ rejoué ; échec précédent, `reuse: false`, sans `paths`,
  arbre sale ⇒ rejoué).
- **Lot 2 — contrat, doc et mesure** [IA] : contrat au registre et contrôle
  `tests-qua-<id>` ; README, ligne « Unreleased » du changelog ; mesure au
  journal (pre-push d'un commit de doc seul, avant/après). Critère de
  sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-25) : cadré, prêt à lancer après
  `verify-reprise-par-controle`.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer d'abord `verify-reprise-par-controle`,
  puis ce chantier (`/drwil-start`).
