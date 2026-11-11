# Projet : les tests des hooks ne sont plus joués deux fois en CI

**Statut** : cadré le 2026-11-11 ; décisions D1 à D4 tranchées le 2026-11-11 (0.11.2, chantier 8 sur 8).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/suivi-ci-et-contexte.md` (parties « `checks-self-test` double-t-il `couverture-hooks` ? », « un échec non expliqué de QUA-004 au pre-push », « un budget de temps des contrôles calibré pour les machines Windows » et « documenter l'avertissement émis par un contrôle »)

<!-- scope
files:
  - .drwil/ia-first.json
  - .githooks/engine.test.mjs
  - outils/miroirs.json
  - docs/contracts.md
  - docs/architecture.md
  - docs/intentions/suivi-ci-et-contexte.md
  - packages/drwil/CHANGELOG.md
-->

(Le bloc `scope` couvre le contrôle intégré `checks-self-test` (module créé au chantier 1), la déclaration de
`couverture-hooks`, leurs tests, le registre et l'intention nettoyée. Un autre fichier ne s'ajoute que par un commit séparé.)

## 1. Besoin

Relevé le 2026-11-11 :

- `checks-self-test` (contrôle intégré au moteur, 65 s) joue tous les `.githooks/*.test.mjs` ; `couverture-hooks`
  (`npm run test:hooks:coverage`, `runAt ["ci"]`, contrat `QUA-004`) joue les mêmes fichiers sous c8. En CI, les tests des
  hooks tournent donc deux fois sur le même arbre.
- L'échec « non expliqué de QUA-004 au pre-push » (2026-10-24, isolé, non reproduit) ne peut plus se produire en local :
  `couverture-hooks` est confié à la CI et n'est joué qu'avec `--with-ci-checks`.
- Le budget de temps au commit (test de `packages/drwil/test/kit.test.mjs`, 1500 ms) est déjà un indicateur : un dépassement
  avertit sans bloquer. La partie « budget Windows » de l'intention est donc traitée.
- Le texte de `QUA-127` ne mentionne pas les lignes `[ia-first-warning]`, repris par `run-checks` ; décision : ne pas le compléter (D3).

Le projet : en CI, que les tests des hooks ne soient joués qu'une fois, sans perdre ni le verdict par contrat ni le seuil de couverture.

## Critères d'acceptation

- En CI, quand `couverture-hooks` joue les mêmes fichiers que `checks-self-test`, ce dernier n'est pas rejoué et le dit
  (« couvert par `couverture-hooks` ») ; en local, il joue toujours — contrat à créer
- Un test prouve que les deux contrôles lisent exactement les mêmes fichiers de test : tout fichier de test ajouté à l'un
  sans l'autre fait échouer le test, jamais un « non rejoué » silencieux — contrat à créer
- Aucun fichier de `.githooks/*.test.mjs` n'est joué sans verdict : le verdict par contrat de chacun reste lu (QUA-033) et
  le seuil de couverture de `QUA-004` reste atteint — `QUA-004`
- Mesure avant et après de la durée de la CI sur une PR ordinaire, relevée à la main au journal de clôture — [humain] `QUA-013`

## Contrats modifiés

(aucun à ce stade ; si le contrôle `checks-self-test` est décrit par un contrat existant, la puce s'écrit ici sur le oui du
demandeur à la réalisation.)

## 2. Hors périmètre

- Le budget Windows : déjà un indicateur ; aucune valeur relevée ici (D2, aucun changement).
- Compléter le texte de `QUA-127` pour `[ia-first-warning]` : écarté (D3). La partie de l'intention reste ouverte, sans version.
- L'échec de QUA-004 au pre-push : sujet fermé (D1) ; un échec en CI qui se reproduit sera relevé, sans chantier.
- Jouer les tests de `.githooks/` sur Node 24 et la livraison du gain de CI aux projets adoptés : restent dans l'intention, sans version.
- Les `paths` de `checks-self-test` et son extraction : chantier 1, qui précède celui-ci.

## 3. Contraintes

- Dépend du chantier 1 (`docs/projects/journal.md`) : `checks-self-test` y sort de `.githooks/engine.mjs`
  (198 lignes, plafond 200) dans un module engine-selftest ; ce chantier s'y branche après sa fusion.
- QUA-013 : un contrôle non exécuté n'est pas passé ; « couvert par `couverture-hooks` » ne vaut que si ce dernier a joué et
  réussi dans la même passe. S'il échoue ou ne joue pas, `checks-self-test` rejoue.
- QUA-019 : aucun contrôle n'est désactivé ni sauté pour gagner du temps ; ici la prévention du doublon se prouve par un test.
- QUA-004 : le seuil de couverture ne baisse pas et le contrôle reste confié à la CI.
- QUA-018 (dépôt ou livrable) : `checks-self-test` est livré, `couverture-hooks` est propre à ce dépôt ; on édite le gabarit
  pour le module livré, puis `npm run installer-depot`.

## 4. Décisions

Tranchées par le demandeur le 2026-11-11 (l'agent n'en a tranché aucune) :

- **D1 — L'échec de QUA-004 au pre-push** : fermer le sujet (plus de jeu en local) ; relever un échec en CI s'il se
  reproduit, sans chantier. *Alternative écartée* : reproduire sous charge en CI et rendre le test robuste.
- **D2 — Doublon** : prouver puis retirer `checks-self-test` en CI quand `couverture-hooks` joue les mêmes fichiers, le
  garder en local. *Alternatives écartées* : garder les deux ; retirer `couverture-hooks` et mesurer la couverture dans `checks-self-test`.
- **D3 — `[ia-first-warning]` dans `QUA-127`** : non, le laisser tel quel.
- **D4 — Budget Windows** : aucun changement (déjà indicateur), constat consigné dans la fiche.

## 5. Points à trancher

- [IA] Le mécanisme du « non rejoué en CI » : un réglage de la déclaration de `couverture-hooks` (par exemple « couvre
  `checks-self-test` ») lu par le moteur, ou une règle du moteur. À proposer au lot 1.
- [humain] Le contrat décrivant `checks-self-test` s'il en existe un : modifié ou nouveau contrat ?

## 6. Increments

- **Lot 1** : tests d'abord, rouges : les deux contrôles lisent les mêmes fichiers ; en CI avec `couverture-hooks` réussi,
  `checks-self-test` ne rejoue pas ; en échec ou absent, il rejoue.
- **Lot 2** : le mécanisme, dans le module engine-selftest du chantier 1 et la déclaration de `couverture-hooks`.
- **Lot 3** : nettoyer l'intention `suivi-ci-et-contexte` (parties traitées : doublon, QUA-004, budget Windows, journal),
  mettre à jour le registre, la carte et le `CHANGELOG`.
- **Lot 4** : mesurer la durée de la CI avant et après, au journal.

## 7. Reprise

Prêt à démarrer après la fusion du chantier 1, par le lot 1 ; rien de commencé.
