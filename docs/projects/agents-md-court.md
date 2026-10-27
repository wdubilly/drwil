# Projet : un `AGENTS.md` court qui aiguille vers le détail

**Statut** : cadré le 2026-10-27 (sondage du demandeur), pour la 0.10.0, après les hooks sous le plafond.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/fichiers-charges-courts.md` (point 2)

<!-- scope
files:
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - AGENTS.md
  - outils/miroirs.json
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/fichiers-charges-courts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/guarantees.test.mjs
  - .drwil/ia-first.json
-->

Contrats concernés : QUA-001 (fichier de code plafonné), QUA-018 (dépôt et livrable).

## 1. Besoin

`AGENTS.md` est relu à chaque requête. Livré à 247 lignes (dont environ 135
de « Conduct »), il coûte du contexte à chaque message. Il doit devenir un
aiguillage d'environ 100 lignes au plus, qui renvoie au détail
(`docs/`, recettes, `node .githooks/glossary.mjs`) quand la situation le
demande.

## Critères d'acceptation

- `AGENTS.md` du gabarit et celui du dépôt font 100 lignes au plus.
- Chaque règle sans contrôle machine reste dans `AGENTS.md` en une ligne ;
  son détail est dans un document de `docs/` cité par cette ligne.
- Aucune règle n'est perdue : chaque règle de l'ancien texte se retrouve dans
  l'aiguillage ou dans le document cité.
- Le plafond est tenu par le contrôle de taille du kit (fiche suivante) ;
  d'ici là, un test du gabarit échoue au-dessus de 100 lignes.

- Une mise à jour du kit ne perd pas ce que le projet a écrit dans son
  `AGENTS.md` : le gabarit court se met à jour sans écraser les consignes
  propres au projet, et dit ce qu'il a changé (même exigence que
  `docs/intentions/donnees-du-projet-hors-prose-du-kit.md` et
  `docs/intentions/alertes-avant-et-apres-ecrasement.md`). Un projet qui a
  déjà un `AGENTS.md` long reçoit l'aiguillage court sans perdre ses règles.

## 2. Hors périmètre

- Le découpage de `docs/ia-first.md` (729 lignes) : il reste un seul
  document, lu par section avec `node .githooks/glossary.mjs`.
- Le contrôle livré lui-même : fiche suivante.
- Un outil de découpe et des fiches d'allègement à l'adoption :
  `docs/intentions/alleger-les-fichiers-de-l-adoptant.md`.

## 3. Contraintes

- On n'édite que le gabarit ; la copie du dépôt reste un écart déclaré dans
  `outils/miroirs.json`, mais tient le même plafond.
- Mesurer avant et après (`node .githooks/consumption.mjs --recorded`) pour
  consigner ce que l'aiguillage fait gagner.

## 4. Décisions

(validées par le demandeur le 2026-10-27)

1. Plafond : 100 lignes, pour le gabarit et la copie du dépôt.
2. Les règles qu'aucun contrôle ne rattrape restent en une ligne chacune,
   détail renvoyé à `docs/`.
3. La mise à jour d'`AGENTS.md` chez un projet adopté est dans le périmètre.
4. `docs/ia-first.md` est lu par section, pas découpé.

## 6. Increments

- **Lot 1 — `AGENTS.md` aiguillage** [IA] : réécriture du gabarit (100 lignes), détail déplacé dans `docs/`, copie du dépôt alignée, test de taille ; mesure avant et après de la consommation. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-27) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`) (après la fiche des hooks).
