# Projet : mesurer et garantir la couverture des hooks de gouvernance

**Statut** : en cours depuis le 2026-10-11 — lots 1 et 2 réalisés sur la branche `chantier/couverture-hooks`, à vérifier puis clore.
**Risque** : HIGH

<!-- cadrage
fichiers:
  - package.json
  - package-lock.json
  - .drwil/ia-first.json
  - packages/drwil/package.json
  - .githooks/cadrage.test.mjs
  - .githooks/contrats.test.mjs
  - .githooks/etat.test.mjs
  - .githooks/perimetre.test.mjs
  - .githooks/risque.test.mjs
  - .githooks/check-code-rules.test.mjs
  - .githooks/check-control-coverage.test.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/check-file-size.test.mjs
  - .githooks/creer-release.test.mjs
  - .githooks/glob.test.mjs
  - .githooks/moteur.test.mjs
  - .githooks/run-checks.test.mjs
  - .githooks/tableau-de-bord.test.mjs
  - docs/contrats.md
  - .githooks/run-checks.mjs
  - .githooks/check-code-rules.mjs
  - .githooks/check-file-size.mjs
  - .githooks/creer-release.mjs
  - .githooks/perimetre.mjs
  - .githooks/tableau-de-bord.mjs
  - packages/drwil/templates/common/base/.githooks/run-checks.mjs
  - packages/drwil/templates/common/base/.githooks/check-code-rules.mjs
  - packages/drwil/templates/common/base/.githooks/check-file-size.mjs
  - packages/drwil/templates/common/base/.githooks/perimetre.mjs
  - packages/drwil/templates/common/optional/tableau-de-bord/tableau-de-bord.mjs
  - packages/drwil/templates/common/optional/creer-une-release/creer-release.mjs
-->

(cadrage : la mesure de couverture et sa déclaration comme contrôle du
projet ; ce dépôt d'abord — QUA-018 (périmètre explicite : dépôt drwil vs
livrable gabarit) : livrer la mesure aux projets équipés est une question
à trancher. Élargi le 2026-10-11 au lancement : les tests des hooks
(lot 1) et `docs/contrats.md` (lot 2, QUA-004 étendu). Le code des hooks
n'y était pas ; élargi le même jour aux six hooks à rendre testables et à
leurs copies du gabarit (décisions « racine réglable » et « supprimer ou
rendre testable » ci-dessous) : copies identiques, modifiées ensemble.)

## 1. Besoin

Priorité 0 pour le demandeur (2026-10-10), qui demandait si la couverture
était à 100 %. Constat du même jour :

- la couverture n'est mesurée que pour `packages/drwil` (c8, seuil
  QUA-004 : 85 % lignes, 60 % branches, 50 % fonctions) : 89,1 % lignes,
  81,6 % branches, 91,4 % fonctions ; points faibles `packages/drwil/bin/drwil.js`
  (64 %) et le module optionnel de création de release (54 %) ;
- **les hooks de gouvernance (`.githooks/*.mjs`) ne sont pas mesurés du
  tout**, alors que ce sont eux qui gouvernent (état, périmètre, cadrage,
  contrats, check-docs) et qu'ils ont leurs propres tests
  (`.githooks/*.test.mjs`, 69 le 2026-10-10).

Intention : mesurer la couverture des hooks, la rendre visible et la
garantir par un seuil bloquant, puis relever les seuils.

## 2. Hors périmètre

- Écrire tous les tests manquants d'un coup : le relèvement se fait par
  lots, sur décision.
- Le mutation testing (`docs/intentions/fabrique-autonome.md`, brique 2) :
  il mesure la qualité des tests, ce chantier leur étendue.

## 3. Contraintes

- La mesure tourne au commit, au push et en CI, comme celle du paquet
  (contrôle déclaré dans `.drwil/ia-first.json`).
- Un seuil ne descend jamais (cliquet) : il part de la mesure réelle.
- Lien avec `docs/projets/adopter-seuil-couverture.md`, dont le lot 3
  (100 % pour le paquet) reste « à la demande ».
- Les tests ajoutés ne ralentissent pas l'utilisateur du kit : ils
  tournent dans ce dépôt ; depuis le 2026-10-11, les projets équipés ne
  les reçoivent plus (principe « livrable léger, dépôt éprouvé », voir
  `docs/projets/journal.md`).

## 4. Décisions

- **2026-10-10 — Priorité 0** : mesurer et garantir la couverture des
  hooks de gouvernance. [décision utilisateur]
- **2026-10-10 — 100 % d'emblée** (point 5) : la cible est 100 % pour les
  hooks ; le seuil bloquant n'est activé qu'une fois atteint (lot 2).
  Toute exclusion de couverture (code inatteignable) est justifiée en
  commentaire et relue. [décision utilisateur]
- **2026-10-10 — QUA-004 étendu** (point 5) : le contrat de couverture
  porte le paquet et les hooks, avec un seuil par périmètre. [décision
  utilisateur]
- **2026-10-10 — Ce dépôt d'abord** (point 5) : la mesure des hooks n'est
  pas livrée aux projets équipés pour l'instant. [décision utilisateur]
- **2026-10-11 — Racine réglable** : `.githooks/run-checks.mjs` prend sa racine du
  dossier courant, comme les autres hooks (git lance ses hooks depuis la
  racine du dépôt), au lieu de l'emplacement du script ; il devient
  testable sans relancer la suite du dépôt. Gabarit compris. [décision
  utilisateur]
- **2026-10-11 — Supprimer ou rendre testable** : plutôt que des
  exclusions `c8 ignore`, le code inatteignable est retiré et le code
  intestable en l'état est rendu testable, gabarit compris (QUA-018 :
  le livrable change). [décision utilisateur]

## Contrats concernés

- **QUA-004** — Seuil de couverture de test : aujourd'hui limité à
  `packages/drwil`.
- **QUA-013** — Contrôle non exécuté n'est pas passé : une mesure absente
  ne vaut pas couverture.

## 5. Points à trancher

- ~~Les trois points~~ — tranchés le 2026-10-10 (voir « Décisions »).

## 6. Lots

- **Lot 1 — mesurer et compléter** [IA] : c8 sur `.githooks/*.mjs` avec
  leurs tests, rapport affiché au commit et en CI ; tests ajoutés jusqu'à
  100 % (lignes, branches, fonctions). Critère de sortie : rapport à
  100 %, contrôles verts.
- **Lot 2 — garantir** [IA] : seuil bloquant à 100 % pour les hooks, QUA-004
  étendu (`docs/contrats.md`). Critère de sortie : une baisse de couverture
  des hooks fait échouer le contrôle.

Les deux lots sont réalisés (2026-10-11) : 100 % lignes, branches,
fonctions et instructions sur les 14 hooks, seuil bloquant ; une
fonction non testée ajoutée à un hook fait sortir le contrôle en échec
(vérifié puis retiré).

## 7. Reprise

- **Dernier état** (2026-10-11) : lots 1 et 2 réalisés et commités sur
  `chantier/couverture-hooks`.
- **Travail non commité** : aucun.
- **Prochaine étape** : [IA] `drwil verify`, puis clôture et fusion
  automatique (autorisée au lancement).
