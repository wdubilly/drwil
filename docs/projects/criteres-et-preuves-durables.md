# Projet : des critères et des preuves qui survivent à la clôture

**Statut** : cadré le 2026-10-21 — décisions du demandeur consignées, prête à lancer.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/criteres-et-preuves-durables.md`

<!-- scope
files:
  - packages/drwil/src/criteria.ts
  - packages/drwil/src/closure.ts
  - packages/drwil/src/coverage.ts
  - packages/drwil/src/evidence.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/index.ts
  - packages/drwil/bin/drwil.js
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/kit.test.mjs
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - .githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/docs/recipes/close-a-workstream.md
  - packages/drwil/templates/common/base/gitignore
  - .github/workflows/ia-first.yml
  - docs/preuves/*.md
  - docs/ia-first.md
  - docs/contracts.md
  - docs/architecture.md
  - docs/recipes/close-a-workstream.md
  - .drwil/ia-first.json
  - .gitignore
  - outils/miroirs.json
  - README.md
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/criteres-et-preuves-durables.md
-->

(cadrage : le jugement des critères (`packages/drwil/src/criteria.ts`), la
clôture (`.githooks/close.mjs` et son gabarit), un nouveau module de preuve de
clôture, la CI, les tests, la doc, les contrats, le changelog.)

Cible : drwil-le-livrable (moteur, hooks et gabarit), jamais une copie
installée seule (QUA-018, dépôt contre livrable).

## 1. Besoin

Les critères d'acceptation ne sont jugés que pour la fiche active, nommée par
`.drwil/state.json` (si présent), un état local ignoré par git : ils ne sont pas rejoués en
CI et disparaissent de la vérification dès que la clôture supprime la fiche.
Les résultats d'exécution (`.drwil/evidence/verify-*.json`) sont eux aussi
ignorés par git : la trace d'une exécution n'existe que dans les journaux de
CI. Constaté sur `drwil_com` (écarts 1 et 3 du rapport « docs/experiments/acceptance-criteria-report.md » de ce dépôt-là).

Résultat attendu : une trace durable de ce qui a été demandé, accepté, vérifié
et prouvé, qui survit à la clôture, sans versionner chaque exécution.

## Critères d'acceptation

- La clôture d'un chantier écrit un fichier de preuve versionné, un par
  chantier, cité par son entrée de journal : il garde chaque critère, son
  contrat, son contrôle, le commit vérifié et l'empreinte des fichiers couverts ;
  la clôture est refusée si ce fichier ne peut pas être écrit — contrat à créer
- Un critère dont la preuve a disparu (contrôle retiré, test supprimé, contrat
  abandonné) fait échouer un contrôle qui le nomme, avec le même code en local
  et en CI ; jamais un avertissement — contrat à créer
- En CI, les critères de la fiche du chantier sont jugés sans
  `.drwil/state.json` (si présent) : la fiche est lue depuis le trailer `Drwil-Brief` des
  commits de la branche ; après la clôture, ce sont les critères du fichier de
  preuve qui sont rejoués — contrat à créer

## Contrats modifiés

- `QUA-013` — ancien critère : « un contrôle non exécuté n'est jamais compté
  comme passé » — raison : la règle s'étend aux critères d'acceptation, dont la
  preuve absente, périmée ou non exécutée ne vaut jamais un succès, en local
  comme en CI (validé le 2026-10-21)
- `QUA-034` — ancien critère : « un critère non prouvé fait tomber le verdict de
  `verify` » — raison : le jugement ne dépend plus de la seule fiche active lue
  dans l'état local (validé le 2026-10-21)

## 2. Hors périmètre

- Rejouer les preuves de clôture des chantiers déjà clos : elles n'existent
  pas ; aucun fichier rétroactif n'est écrit. Intention à la clôture si besoin.
- Donner un identifiant propre à chaque critère : écarté par décision.
- Versionner une évidence par exécution de `verify` : écarté, un seul fichier
  par chantier.
- La couverture `**Couvre**` des contrats déjà attestés
  (`docs/intentions/couverture-des-contrats-attestes.md`).

## 3. Contraintes

- `packages/drwil/src/verify.ts` est à 400 lignes, le plafond de QUA-001
  (fichier de code plafonné) : la preuve de clôture va dans un nouveau module.
- L'empreinte des fichiers couverts réutilise `packages/drwil/src/coverage.ts`,
  livré par le chantier précédent : une seule source pour cette logique.
- `drwil attest` reste un geste humain ; la preuve de clôture ne remplace
  aucune attestation (QUA-032, une attestation ne coûte que le jugement
  demandé).
- Le même code juge en local et en CI : aucun chemin de contrôle réservé à l'un
  des deux (QUA-019, pas de contournement).
- `.drwil/evidence/*` reste ignoré par git, hors `attestations/` : la preuve de
  clôture est un fichier de documentation versionné, pas une évidence
  d'exécution.
- On n'édite que le gabarit livré et son miroir déclaré (`miroirs-gabarit`).

## 4. Décisions

Prises par le demandeur le 2026-10-21 :

- Les trois pistes de l'intention sont retenues, unifiées par un seul fichier de
  preuve de clôture par chantier : il porte les critères et leurs liens, et la
  CI les rejoue depuis lui.
- Un critère dont la preuve a disparu fait échouer franchement le contrôle, avec
  le même code en local et en CI.
- Format durable : un fichier par chantier, lisible par un humain et par une
  machine, cité par l'entrée de journal.
- Un critère n'a pas d'identifiant propre : il reste identifié par son contrat
  et son chantier.
- La preuve de clôture porte l'empreinte des fichiers couverts, comme
  l'attestation.

## 5. Points à trancher

Aucun : tranchés le 2026-10-21 (voir ci-dessus).

## 6. Lots

- **Lot 1 — forme de la preuve et test rouge** [IA] : la forme du fichier de
  preuve de clôture écrite dans `docs/ia-first.md` et son gabarit ; test rouge
  montrant qu'après une clôture les critères ne sont plus jugés. Critère de
  sortie : test rouge et forme documentée.
- **Lot 2 — écriture à la clôture** [IA] : nouveau module du paquet, `.githooks/close.mjs`
  (dépôt et gabarit) écrit le fichier dans `docs/preuves/` (à créer), avec critères,
  contrats, contrôles, commit vérifié et empreinte des fichiers couverts ;
  l'entrée de journal le cite ; la clôture est refusée s'il ne peut pas être
  écrit. Critère de sortie : test rouge devenu vert, tests de refus.
- **Lot 3 — preuve disparue et CI sans état local** [IA] : un contrôle fait
  échouer un critère dont la preuve a disparu, en le nommant ; la fiche est lue
  depuis le trailer `Drwil-Brief` quand `.drwil/state.json` (si présent) est absent, et les
  critères du fichier de preuve sont rejoués après la clôture. Critère de
  sortie : tests de chaque cas, CI verte.
- **Lot 4 — gabarit, doc, contrats** [IA] : gabarit et miroirs, `.gitignore`,
  recette de clôture, README, changelog, carte d'architecture, les contrats
  créés avec leurs contrôles dans `.drwil/ia-first.json`, QUA-013 et QUA-034
  modifiés.

## 7. Reprise

- **Dernier état** (2026-10-21) : cadré, rien de commencé ; les cinq décisions
  de l'intention sont tranchées.
- **Travail non commité** : cette fiche, sa ligne d'index et la mise à jour de
  l'intention.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
