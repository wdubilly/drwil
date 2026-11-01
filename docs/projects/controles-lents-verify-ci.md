# Projet : réserver un contrôle lent à verify et à la CI

**Statut** : cadré le 2026-11-01.
**Risque** : HIGH
**Maturité** : à affiner

<!-- scope
files:
  - .githooks/engine.mjs
  - .githooks/engine.test.mjs
  - .githooks/run-checks.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/run-checks-texts.mjs
  - packages/drwil/templates/common/base/.githooks/engine.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks-texts.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/ia-first/4-checks-in-git.md
  - packages/drwil/templates/common/base/docs/ia-first/4-checks-in-git.md
  - docs/contracts.md
  - docs/contracts-catalog.md
  - docs/projects/kit-mechanics.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Un contrôle lent (les e2e) déclaré avec `paths: ["app/**"]` tourne à chaque commit qui touche `app/**`, puis une
fois de plus au pre-push, dans `drwil verify` et en CI : un chantier de code coûte plusieurs exécutions. Aujourd'hui
`paths` décide seulement quels fichiers déclenchent le contrôle. Le besoin : pouvoir réserver un contrôle à
`drwil verify` et à la CI, sans affaiblir la preuve de clôture ni la fusion.

Relevé dans le code le 2026-11-01 : le pre-commit diffère déjà un contrôle hors de ses `paths` (le moteur, état
« non exécuté », jamais « passé ») ; le pre-push et `verify` reprennent un verdict « ok » dont les fichiers du
contrôle n'ont pas changé (QUA-141, QUA-152) ; la CI rejoue tout. Reste à traiter : deux commits de code successifs
rejouent le contrôle à chaque fois au commit.

## Critères d'acceptation

- Un contrôle déclaré réservé (par exemple `runAt: ["verify", "ci"]`) n'est pas joué au commit et le dit : « non
  exécuté », jamais « passé » — contrat à créer
- `drwil verify` et la CI jouent ce contrôle, et son absence ou son échec bloque la clôture et la fusion, comme
  pour tout contrôle (QUA-013, un contrôle non exécuté n'est pas passé) — contrat à créer
- Un contrôle sans ce réglage se comporte exactement comme avant — contrat à créer
- La doc de `paths` (`docs/ia-first/4-checks-in-git.md`) décrit le réglage, et l'attestation (QUA-183, QUA-184)
  et la reprise par contrôle (QUA-141) restent justes pour un contrôle réservé — contrat à créer

## Contrats modifiés

Aucun attendu. À confirmer au lot 1 : QUA-013, QUA-141 et QUA-152 doivent rester vrais tels quels ; si l'un
demande une nuance, elle est validée par le demandeur avant d'être écrite.

## 2. Hors périmètre

- La variante « e2e au commit seulement si le chantier touche un chemin critique » : plus fine, mais demande de
  définir un chemin critique avant d'avoir prouvé que le réglage simple ne suffit pas. Intention à noter après
  la clôture si le besoin demeure.
- Imposer un plafond de commits par chantier (écarté par le demandeur le 2026-11-01) : le coût vient du contrôle
  rejoué, pas du nombre de commits ; un plafond contredit les petites étapes commitées de la recette de refactor et
  les commits de détour (QUA-050), rend la recherche du commit fautif plus difficile, et pousse à regrouper ou à
  contourner (QUA-019). Si une dérive est mesurée, un avertissement à la clôture suffit, jamais un blocage.
- Adopter le réglage sur les contrôles de ce dépôt ou d'un projet existant : le chantier livre le mécanisme, pas
  la configuration d'un projet.
- Toute modification de la preuve de clôture (`verify --evidence`, empreinte de l'arbre de QUA-140).

## 3. Contraintes

- Le gabarit est la seule source ; sa copie du dépôt suit (`npm run installer-depot`).
- `.githooks/engine.mjs` (186 lignes) et `.githooks/run-checks.mjs` (185 lignes) sont proches du plafond de 200 : lister les fichiers
  que leur découpe créera avant d'y ajouter du code.
- Un réglage inconnu ou mal formé (`runAt: "verify"`, valeur hors liste) est refusé avec un message clair, jamais
  ignoré : ignorer un réglage ferait tourner le contrôle là où l'on croit qu'il ne tourne pas, ou l'inverse.
- Compatibilité : les projets déjà installés ne déclarent pas le réglage ; une mise à jour ne change rien pour
  eux.
- Le compromis est assumé : une régression est découverte plus tard (au verify ou en CI), pas au commit fautif.

## 4. Décisions

Tranchées par le demandeur le 2026-11-01 : cadrer l'idée `runAt` comme mécanisme du kit (fiche de chantier, risque
HIGH puisqu'elle touche `.githooks/`).

## 5. Points à trancher

- [décision] Le pre-push joue-t-il un contrôle réservé ? `["verify", "ci"]` l'exclut ; un push sans e2e puis une CI
  rouge allonge la boucle, un push avec e2e en rejoue un de plus. Recommandation : l'exclure, puisque la reprise
  de verdict (QUA-152) évite déjà le rejeu quand rien n'a changé.
- [décision] Nom et forme du réglage : `runAt` avec les valeurs `commit`, `push`, `verify`, `ci` (défaut : tous),
  ou un booléen plus simple (`slow: true` = verify et CI). Recommandation : la liste, plus explicite.
- [décision] Après la mesure du lot 1 seulement : un cran `lot`, où le contrôle lent tourne à la fin de chaque lot
  de la fiche plutôt qu'à chaque commit. Compromis entre « à chaque commit » et « seulement au verify », mais plus
  complexe à définir ; à écarter si la mesure montre que `verify` et la CI suffisent.
- [IA] Vérifier au lot 1 que le contrôle réservé garde une empreinte propre (QUA-141) et qu'une attestation citant
  ce contrôle tombe bien quand son effet change (QUA-183, QUA-184).
- [IA] Mesurer le gain avant de coder : durées dans `.drwil/evidence/run-checks.log` (si présent) (QUA-136) et
  `.drwil/usage.jsonl` ; si un chantier typique ne rejoue pas plus de deux fois le contrôle lent, abandonner.

## 6. Increments

- **Lot 1 — mesure et décisions** [IA] : mesurer le coût réel, trancher les deux points ci-dessus avec le demandeur.
  Critère de sortie : les décisions sont écrites en section 4.
- **Lot 2 — moteur, tests et contrats** [IA] : réglage lu par le moteur, report au commit, jeu complet en
  `verify` et en CI, découpe des fichiers proches du plafond, quatre contrats avec leur contrôle.
  Critère de sortie : un contrôle réservé est « non exécuté » au commit et bloquant en `verify` et en CI.
- **Lot 3 — documentation** [IA] : la page des contrôles (gabarit et copie), `kit-mechanics.md`, journal à la
  clôture.

## 7. Reprise

- **Dernier état** (2026-11-01) : cadré, aucun code. Les ID de contrat se prennent au lot 2, hors catalogue
  (dernier pris au 2026-11-01 : QUA-207).
