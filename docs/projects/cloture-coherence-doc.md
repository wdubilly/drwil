# Projet : la clôture vérifie la cohérence de la documentation

**Statut** : cadré le 2026-10-21 — décisions du demandeur consignées, prête à lancer.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-coherence-doc.md`

<!-- scope
files:
  - .githooks/close.mjs
  - .githooks/close.test.mjs
  - .githooks/check-docs.mjs
  - .githooks/check-docs.test.mjs
  - .githooks/doc-coherence.mjs
  - .githooks/doc-coherence.test.mjs
  - .githooks/briefs.mjs
  - .githooks/check-code-rules.mjs
  - .githooks/check-code-rules.test.mjs
  - .githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/close.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs.mjs
  - packages/drwil/templates/common/base/.githooks/doc-coherence.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/check-code-rules.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/test/kit.test.mjs
  - outils/miroirs.json
  - .drwil/ia-first.json
  - docs/contracts.md
  - docs/ia-first.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/suites-kit-portable.md
  - docs/intentions/README.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/docs/intentions/README.md
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - .github/scripts/ci-multi-os.mjs
  - .github/workflows/ia-first.yml
  - outils/installer-depot.mjs
  - outils/tester-tarball.mjs
  - packages/drwil/test/migration.test.mjs
-->

(cadrage : la vérification de cohérence à la clôture, son module partagé
avec `.githooks/check-docs.mjs`, leurs gabarits livrés et miroirs, les tests, la doc et
les contrats ; les fichiers qui citent encore une fiche de chantier et la
fiche aux cases cochées à tort sont nettoyés avant que ces écarts ne
deviennent bloquants. La note de recette par version reste dans son
intention, chantier suivant.)

Cible : drwil-le-livrable (gabarit `packages/drwil/templates/`), jamais une
copie installée (QUA-018, dépôt contre livrable).

## 1. Besoin

À la clôture, la cohérence entre l'index, les fiches, les intentions, le
journal et les versions repose sur des avertissements que personne n'est
obligé de lire. Le 2026-10-21, le commit de clôture de la 0.6.9 a été refusé
deux fois par `check-docs` (renvois vers des intentions retirées, fichier de
code cité hors de toute fiche), chaque fois découvert au dernier moment.
La clôture doit dire, d'un seul message et avant le commit, ce qui est
incohérent, et refuser tant que ça l'est.

## Critères d'acceptation

- La clôture (`.githooks/close.mjs` et `--check`) refuse, en un seul message avec les
  autres signaux de clôture, toute incohérence de l'index et des fiches :
  case cochée ou ouverte contredisant le statut de la fiche citée,
  citation de fiche de chantier dans du code non modifié, fiche supprimée
  sans que son intention soit touchée — sur tout l'index, à chaque clôture —
  contrat à créer
- Ces règles ne sont écrites qu'une fois : `.githooks/check-docs.mjs` (au commit) et
  `.githooks/close.mjs` (à la clôture) les lisent du même module, et une même
  incohérence est vue par les deux — contrat à créer
- Pour chaque incohérence corrigeable sans jugement (case cochée ou ouverte
  alignée sur le statut de la fiche ; référence morte vers une fiche ou une
  intention retirée, supprimée ou réorientée vers le journal), la clôture
  propose la correction (liste ou diff) sans rien écrire, et ne l'applique
  qu'avec `--fix` ; le reste refuse en disant la correction à faire —
  contrat à créer
- Une intention nouvelle qui cite un chemin déjà cité par une autre
  intention est signalée en avertissement, sans mots clés — contrat à créer

## Contrats modifiés

- `QUA-015` — ancien critère : « la case d'une ligne d'index doit refléter le statut de la fiche citée —
  avertissement non bloquant » — raison : devient bloquant à la clôture
  (reste un avertissement au commit) (validé le 2026-10-21)
- `QUA-049` — ancien critère : « les citations de fiche dans les fichiers non modifiés sont résumées en
  un avertissement, jamais bloquant » — raison : bloquantes à la clôture, tout
  l'index (validé le 2026-10-21)
- `QUA-036` — ancien critère : « le commit qui supprime une fiche sans toucher son intention reçoit
  un avertissement » — raison : bloquant à la clôture (validé le 2026-10-21)

## 2. Hors périmètre

- La note de recette par version (`docs/intentions/note-de-recette-par-version.md`),
  chantier suivant.
- Détecter un intitulé d'index devenu faux (intention à écrire à la clôture).
- La détection d'un doublon d'intention par titre ou mots clés (décision :
  chemin cité seulement).
- Rendre bloquants ces écarts au commit : ils restent des avertissements à
  chaque commit, seule la clôture refuse.
- L'avance automatique jusqu'à CLOSING (QUA-073, message seul).
- Réécrire un fichier de code pour retirer une citation de fiche : la
  clôture dit la correction, elle ne touche pas au code.

## 3. Contraintes

- `.githooks/close.mjs` ne commite, ne pousse, ne fusionne rien et n'écrit
  pas l'état (QUA-048) ; aucun contrôle contourné (QUA-019).
- Fichiers de code plafonnés à 400 lignes (QUA-001) : `.githooks/check-docs.mjs` en a
  399, la logique partagée va donc dans un nouveau module
  `.githooks/doc-coherence.mjs` (à créer), pas dans `.githooks/close.mjs` (304 lignes).
- Un message de clôture unique : ne pas empiler ce signal avec le chemin
  restant jusqu'à CLOSING (QUA-073).
- On n'édite que le gabarit livré et son miroir déclaré (`miroirs-gabarit`) ;
  le module partagé est livré aussi dans le gabarit.
- Le dépôt doit passer sa propre clôture : les écarts existants (cinq cases
  cochées de `docs/projects/suites-kit-portable.md`, neuf citations de fiche
  dans cinq fichiers de code non modifiés) sont corrigés **avant** de rendre
  la règle bloquante.

## 4. Décisions

Prises par le demandeur le 2026-10-21 :

- [décision] Tout devient bloquant à la clôture.
- [décision] Où : dans `.githooks/close.mjs` (clôture et `--check`), en
  réutilisant les règles de `.githooks/check-docs.mjs`.
- [décision] Corriger, pas seulement bloquer : la clôture propose chaque
  correction sans rien écrire et l'applique avec `--fix` (jamais seule) ;
  corrigés ainsi : cases de l'index alignées sur le statut de la fiche,
  références mortes supprimées ou réorientées vers le journal ; le reste
  bloque avec la correction à faire.
- [décision] Référence morte : règle unique. Vers la fiche du chantier qui
  se clôt, elle est réorientée vers le journal du jour ; toute autre
  référence morte (intention retirée, fiche déjà supprimée) est supprimée,
  la correction proposée en diff.
- [décision] Intitulés d'index devenus faux : hors de ce chantier, non
  détectables de façon sûre ; ils deviennent une intention à la clôture.
- [décision] Aucune exception pour une citation de fiche voulue : on la
  réécrit sans citer la fiche.
- [décision] Doublon d'intention : avertissement quand une nouvelle intention
  cite un chemin déjà cité par une autre.
- [décision] Coût : tout l'index à chaque clôture.
- [décision] Ordre : ce chantier, puis la note de recette, puis la 0.7.0.

## 5. Points à trancher

Aucun : tranchés le 2026-10-21 (voir ci-dessus).

## 6. Lots

- **Lot 1 — nettoyage** [IA] : les cinq cases de `suites-kit-portable`, les
  neuf citations de fiche, les intentions touchées. Critère de sortie :
  `node .githooks/check-docs.mjs` sans avertissement de ces deux familles.
- **Lot 2 — module partagé** [IA] : extraire de `.githooks/check-docs.mjs` les règles
  (case et statut, citations) dans `.githooks/doc-coherence.mjs` (à créer), sans
  changer son comportement au commit. Critère de sortie : tests de
  `.githooks/check-docs.test.mjs` inchangés et verts.
- **Lot 3 — clôture bloquante et corrective** [IA] : `.githooks/close.mjs` et
  `--check` lisent le module, refusent en un message et proposent les
  corrections ; `--fix` les applique ; la détection de doublon d'intention.
  Critère de sortie : tests sur dépôts git temporaires verts.
- **Lot 4 — gabarit, doc, contrats** [IA] : gabarit et miroirs, carte
  d'architecture, `docs/ia-first.md`, les trois contrats créés avec
  leurs contrôles dans `.drwil/ia-first.json`, contrats modifiés.

## 7. Reprise

- **Dernier état** (2026-10-21) : cadré, rien de commencé ; décisions
  consignées dans l'intention ; tout est tranché, prête.
- **Travail non commité** : cette fiche, sa ligne d'index, la mise à jour de
  l'intention et le scan de valeur.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
