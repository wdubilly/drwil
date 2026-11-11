# Projet : les contrôles longs sont repris tant que leurs fichiers n'ont pas changé

**Statut** : cadré le 2026-11-11 ; décisions D1 à D4 tranchées le 2026-11-11 (0.11.2, chantier 1 sur 8).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (notes du 2026-11-09 « [P0] … réduire le coût des contrôles rejoués », du 2026-11-08 « Accélérer run-checks » et `docs/intentions/reprise-par-controle-limites.md`)

<!-- scope
files:
  - .githooks/engine.mjs
  - .githooks/engine-selftest.mjs
  - .githooks/engine.test.mjs
  - .githooks/glossary.test.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/engine-selftest.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - outils/miroirs.json
  - outils/verifier-miroirs.mjs
  - outils/verifier-miroirs.test.mjs
  - outils/tests-par-fichier.mjs
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/CHANGELOG.md
  - .drwil/ia-first.json
-->

(Le bloc `scope` couvre le moteur, son module neuf, ses tests, le gabarit qui livre le moteur, les contrôles longs de
`.drwil/ia-first.json`, le registre et la carte d'architecture. `.githooks/engine.mjs` fait 198 lignes (plafond 200) :
le contrôle `checks-self-test` en sort dans un nouveau module engine-selftest, sans rien ajouter au fichier
existant au-delà du branchement. Si l'implémentation montre qu'un autre fichier doit changer, l'élargissement sera un
commit séparé.)

## 1. Besoin

La reprise d'un verdict contrôle par contrôle existe (QUA-141) et fonctionne : la plupart des contrôles sont « repris »
quand leurs fichiers n'ont pas changé. Mesure du 2026-11-11 (`.drwil/evidence/run-checks.log` (si présent), corrige la note du
2026-11-10 qui disait « 0 réutilisé ») : restent rejoués à chaque passe quatre contrôles, ~245 s de contrôles :

- `checks-self-test` (« tests des contrôles eux-mêmes », 65 s) : contrôle intégré au moteur, sans `paths`, donc jamais repris ;
- `tests-qua-039` (93 s) et `tests-qua-047` (73 s) : leurs `paths` contiennent `docs/**`, si bien qu'une fiche
  d'intention ou de projet les invalide ;
- `miroirs-gabarit` (14 s) : `paths ["**"]` ; il relance tous les `outils/*.test.mjs`, dont `outils/banc.test.mjs` (34 s) déjà
  couvert par `tests-qua-101` à `109`.

Le projet : que ces contrôles ne soient rejoués que quand un fichier qu'ils lisent change, sans jamais reprendre un
« ok » à tort.

## Critères d'acceptation

- Les tests du moteur (`checks-self-test`) sont repris quand `.githooks/**`, `outils/**`, `package.json`,
  `package-lock.json` et `.drwil/ia-first.json` sont inchangés, et rejoués dès qu'un seul de ces fichiers change — `QUA-295`
- Un contrôle dont les tests lisent des documents (`tests-qua-039`, `tests-qua-047`) n'est invalidé que par le changement
  d'un document qu'ils lisent (contrats, glossaire, kit), pas par une fiche d'intention ou de projet ; un test prouve
  qu'un « ok » repris n'est jamais servi après le changement d'un fichier lu — `QUA-292`
- `miroirs-gabarit` ne rejoue que `verifier-miroirs` et son test, et n'est invalidé que par le gabarit, `outils/miroirs.json`
  et les copies installées ; un écart de miroir est toujours détecté — `QUA-293`
- Chaque script cité par la commande d'un contrôle est sous les `paths` de ce contrôle ; un contrôle dont un script
  cité sort de ses `paths` est refusé par un test statique, sans traçage des lectures — `QUA-294`
- Une passe de `run-checks` sans fichier modifié depuis la précédente ne rejoue aucun de ces quatre contrôles : mesure
  avant et après dans `run-checks.log`, relevée à la main dans le journal de clôture — [humain] `QUA-013`

## Contrats modifiés

(aucun à ce stade ; si les décisions de réalisation modifient `QUA-141` ou `QUA-033`, la puce s'écrit ici sur le oui
du demandeur.)

## 2. Hors périmètre

- Le cache des verdicts en CI et son repli sur le bon commit : chantier 2 de la 0.11.2 (`docs/intentions/cache-verdicts-ci-repli.md`).
- Le traçage des lectures de chaque contrôle (écarté, D4) ; les `paths` calculés automatiquement.
- Les tests de contrat plus rapides, les fichiers laissés dans le dossier temporaire, la parallélisation des tests lents
  du banc et des hooks : chantier 5.
- La reprise des verdicts par `verify --evidence` et le pre-push : chantier 6.
- Un seul run de couverture : chantier 3.

## 3. Contraintes

- QUA-018 (dépôt ou livrable) : le moteur est livré ; on édite le gabarit (`packages/drwil/templates/`), puis `npm run installer-depot` rafraîchit la copie, dans le même commit.
- QUA-013 : un contrôle non exécuté n'est pas passé ; un verdict n'est repris que sur un arbre et une configuration identiques, jamais sur un fichier lu hors de ses `paths`.
- QUA-141 : l'empreinte d'un contrôle porte ses `paths` et sa déclaration ; changer les `paths` change l'empreinte et rejoue.
- QUA-019 : aucun contrôle n'est désactivé ni sauté pour gagner du temps ; resserrer des `paths` se prouve par un test.
- Un fichier de code à 180 lignes ou plus est découpé (plafond 200) : `.githooks/engine.mjs`.

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — `checks-self-test`** : il reçoit des `paths` : `.githooks/**`, `outils/**`, `package.json`, `package-lock.json`,
  `.drwil/ia-first.json`. *Alternative écartée* : le laisser rejoué à chaque fois.
- **D2 — `tests-qua-039` et `047`** : resserrer à la liste des fichiers réellement lus (contrats, glossaire, kit), sans
  `docs/intentions` ni `docs/projects`, avec un test contre le faux « ok » repris. *Alternative écartée* : garder `docs/**` par prudence.
- **D3 — `miroirs-gabarit`** : restreint à `verifier-miroirs` et son test (`outils/banc.test.mjs` est déjà couvert par
  `tests-qua-101` à `109`) ; `paths` = gabarit, `outils/miroirs.json`, copies installées. *Alternative écartée* : le laisser tel quel.
- **D4 — garde-fou des `paths`** : un test statique léger (chaque script cité par la commande d'un contrôle est sous ses
  `paths`), pas de traçage des lectures. *Alternatives écartées* : traçage rejoué en CI ; aucun garde-fou.

## 5. Points à trancher

(aucun : D1 à D4 sont tranchées. Le fichier exact de chaque lecture de `tests-qua-039` et `047` se relève au lot 2 ;
tout fichier lu trouvé hors de la liste s'ajoute aux `paths`, jamais l'inverse.)

## 6. Increments

- **Lot 1 — `checks-self-test` avec `paths`** [IA] : le module engine-selftest (sortie du moteur), les `paths` de D1
  dans l'empreinte, test de reprise et de rejeu sur un fichier modifié. Critère de sortie : `.githooks/engine.test.mjs` vert.
- **Lot 2 — les contrôles lisant des documents** [IA] : relever les fichiers lus par `tests-qua-039` et `047`,
  resserrer leurs `paths`, test du faux « ok » repris. Critère de sortie : tests verts, contrat créé.
- **Lot 3 — `miroirs-gabarit`** [IA] : réduire sa commande et ses `paths`, test d'un écart de miroir toujours détecté.
- **Lot 4 — garde-fou statique** [IA] : le test qui lit les scripts cités par les commandes et les compare aux `paths`.
- **Lot 5 — documentation et mesure** [IA] : CHANGELOG « Unreleased » (anglais), carte d'architecture, `kit-mechanics.md`,
  contrats et contrôles de `.drwil/ia-first.json` ; mesure avant et après dans `run-checks.log`, notée au journal.

## 7. Reprise

- **Dernier état** (2026-11-11) : lot 5 fait. Contrat QUA-295 créé pour `checks-self-test` (contrôle `tests-qua-295`, test renommé en QUA-295), CHANGELOG « Unreleased » rédigé, carte d'architecture et `kit-mechanics.md` déjà à jour depuis le lot 1. Tous les lots [IA] sont faits ; reste la clôture (mesure avant et après au journal).
- **Travail non commité** : aucun une fois le lot commité.
- **Prochaine étape** : vérifier, entrée du journal, clôture.
