# Projet : un workflow CI au YAML invalide est refusé avant le push

**Statut** : en cours (lot 1 fait le 2026-10-18, branche
`workstream/workflow-ci-yaml-valide`).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/workflow-ci-yaml-valide.md`

<!-- scope
files:
  - .github/scripts/workflows-yaml.test.mjs
  - package.json
  - package-lock.json
  - .drwil/ia-first.json
  - outils/miroirs.json
  - docs/contracts.md
-->

(cadrage : le test, propre au dépôt ; la dépendance de dev et son verrou ;
le contrôle du nouveau contrat déclaré dans `.drwil/ia-first.json` ; le test
déclaré propre au dépôt dans `outils/miroirs.json` ; le registre, pour le
nouveau contrat. Risque HIGH : le chantier touche la CI et `.drwil/`.)

## 1. Besoin

Pendant le chantier « Windows et macOS testés seulement quand une PR touche
du code » (0.6.4), un `run:` non cité contenant « : » a rendu
`.github/workflows/ia-first.yml` invalide : GitHub a rejeté tout le
workflow (« workflow file issue », aucun job lancé), alors que les
contrôles locaux et le test du workflow étaient verts. L'erreur ne s'est
vue qu'après le push, et une CI qui ne démarre pas ne protège plus master.

Le but : qu'un fichier de CI qui n'est pas du YAML valide soit refusé au
commit, dans le dépôt comme dans le gabarit livré, sans rien ajouter au
livrable.

## Critères d'acceptation

- Un fichier de CI du dépôt ou du gabarit qui n'est pas du YAML valide est
  refusé au commit, avec le fichier et la ligne de l'erreur — `QUA-046`

## 2. Hors périmètre

- actionlint (erreurs propres à GitHub Actions : expressions, clés
  inconnues) : écarté le 2026-10-18, binaire à télécharger et à épingler
  pour une classe d'erreur que l'incident ne demandait pas. À reprendre en
  intention si une erreur de ce genre passe.
- Un contrôle placé dans un workflow : il ne s'exécute pas quand ce
  workflow est invalide.
- Les fichiers YAML qui ne sont pas de la CI (`pnpm-lock.yaml`,
  `pnpm-workspace.yaml`).
- Livrer le test ou la dépendance aux utilisateurs : le gabarit est vérifié
  ici, rien ne change dans ce que reçoit un projet (QUA-018, dépôt ou
  livrable).

## 3. Contraintes

- Fichiers couverts : `.github/workflows/*.yml` et les fichiers de CI du
  gabarit sous `packages/drwil/templates/common/ci/` (workflow GitHub et
  `packages/drwil/templates/common/ci/gitlab/.gitlab-ci.yml`), lus par motif pour qu'un nouveau workflow soit couvert
  sans retoucher le test.
- Le contrôle se déclenche au commit sur ces chemins (`paths` de sa
  déclaration) et tourne aussi dans le job `checks` (couverture CI,
  QUA-013 : contrôle non exécuté n'est pas passé).
- Un parseur YAML valide la syntaxe, pas la sémantique GitHub : c'est
  voulu (voir Hors périmètre).
- Vérifié au cadrage (2026-10-18) avec `yaml` 2.9.1 : le workflow d'avant
  le correctif `9b742a3` est refusé (« Nested mappings are not allowed in
  compact mappings at line 86 ») ; les quatre fichiers de CI actuels
  passent.
- Le verrou du dépôt est `package-lock.json` (la CI lance `npm ci`) ;
  `pnpm-lock.yaml` n'a pas bougé depuis le 2026-10-04 et n'est pas touché
  ici.

## 4. Décisions

- **2026-10-18 — Un test qui parse les fichiers de CI** (demandeur, sur
  recommandation de l'agent) : dépendance de dev `yaml` (sans dépendance
  transitive) dans le `package.json` racine, pas actionlint au commit.
- **2026-10-18 — Le dépôt et le gabarit** (demandeur) : le même test
  couvre les workflows du dépôt et les fichiers de CI du gabarit ; il vit
  dans le dépôt, les utilisateurs n'en paient rien.
- **QUA-046** (créé) — fichiers de CI en YAML valide avant le push.
- Contrats concernés : QUA-046,
  QUA-013 (contrôle non exécuté n'est pas passé : le
  contrôle a son job CI), QUA-018 (dépôt ou livrable), QUA-033 (un
  contrôle par règle dans ce dépôt).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — test et contrat** [IA] : test qui parse chaque fichier de CI
  couvert et échoue en nommant fichier et ligne ; un cas négatif rejoue le
  `run:` de l'incident ; contrat créé au registre, contrôle déclaré,
  test déclaré propre au dépôt. Critère de sortie : `node
  .githooks/run-checks.mjs` vert, le cas négatif échoue bien sans le
  correctif, `drwil verify --agent` en `GOVERNANCE: PASS` sur la branche.

## 7. Reprise

- **Dernier état** (2026-10-18) : lot 1 commité (test, contrat QUA-046,
  contrôle `tests-qua-046`), `run-checks` vert.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] clôture (journal, intention, PR).
