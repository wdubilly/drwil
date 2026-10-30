# Projet : des renvois justes après la découpe de `docs/ia-first.md`, et une recette livrée à jour

**Statut** : cadré le 2026-10-30.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/renvois-apres-decoupe.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.mjs
  - packages/drwil/templates/common/base/docs/ia-first/*.md
  - docs/ia-first/*.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - docs/recipes/working-with-branches.md
  - packages/drwil/test/kit.test.mjs
  - docs/contracts.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/renvois-apres-decoupe.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

La découpe de `docs/ia-first.md` en sections courtes (QUA-190) a laissé des renvois qui ne mènent plus à leur
cible quand une section est lue seule : un commentaire de hook qui cite un titre disparu (« Scope gate »), des
renvois relatifs (« section 8 of this document », « below », « above ») qui sortent de leur fichier, et le
contrat de la matrice de compatibilité (QUA-063) qui vise encore le sommaire. Le test des renvois ne lit pas les
hooks, d'où le renvoi mort resté inaperçu. À côté, la recette livrée `docs/recipes/working-with-branches.md` n'a pas la puce
« This folder » (branche créée au lancement, QUA-179) que porte la copie du dépôt : un projet installé ne
l'apprend pas.

## Critères d'acceptation

- Chaque titre de section cité dans un commentaire d'un hook livré (`.githooks/` du gabarit) mène à un titre
  existant de `docs/ia-first/` — `QUA-190`
- Aucun renvoi relatif d'un fichier de `docs/ia-first/` ne sort de ce fichier : ni « this document », ni titre
  cité avec « below » ou « above » absent du même fichier — `QUA-190`
- La recette livrée `docs/recipes/working-with-branches.md` dit qu'un lancement en « This folder » crée `workstream/<fiche>`
  depuis la branche principale à jour, et quand il refuse — `QUA-179`
- QUA-063 vise le fichier qui porte la matrice de compatibilité — `QUA-063`

## Contrats modifiés

- `QUA-190` — ancien critère : « Chaque renvoi du gabarit à `docs/ia-first.md` mène à une section existante :
  … un titre cité dans un document à un titre de section » — raison : les commentaires des hooks livrés et les
  renvois relatifs internes aux sections échappaient à la preuve (validé le 2026-10-30)
- `QUA-179` — ancien critère : périmètre `.githooks/worktree.mjs`, `.githooks/state-transitions.mjs` — raison :
  la recette livrée doit dire ce que fait le lancement, prouvé par un test (validé le 2026-10-30)
- `QUA-063` — ancien critère : « `docs/ia-first.md` porte une matrice… » (Règle, Périmètre, Source de vérité,
  Couvre) — raison : la matrice est dans `docs/ia-first/6-limits-and-tool-compatibility.md` depuis la découpe ;
  la règle ne change pas (validé le 2026-10-30)

## 2. Hors périmètre

- Resserrer le contrôle `miroirs-gabarit` (un écart déclaré accepte toute différence) :
  `docs/intentions/miroirs-ecart-declare-trop-large.md`.
- Les renvois des autres documents du kit vers `docs/ia-first.md`, déjà prouvés par QUA-190.
- Réécrire le texte des règles : seuls les renvois changent.

## 3. Contraintes

- Livrable et dépôt : tout se corrige dans le gabarit (`packages/drwil/templates/`), puis `npm run
  installer-depot` ; QUA-063 n'existe que dans le registre du dépôt.
- `.githooks/scope-gate.mjs` fait 186 lignes (plafond 200) : une ligne de commentaire remplacée, sans ajout, pas de
  découpe.
- QUA-063 est attesté par l'humain (`drwil attest`, geste humain) : si le changement de **Couvre** invalide
  l'attestation, la clôture le dit et l'humain la refait ; l'agent ne l'exécute jamais.
- Les tests échouent d'abord contre l'état actuel (renvoi « Scope gate », renvois relatifs, recette sans la
  puce), puis passent après correction.

## 4. Décisions

- 2026-10-30 (demandeur) : correction dans le gabarit puis installation ; QUA-063 côté dépôt.
- 2026-10-30 (demandeur) : QUA-190 étendu aux commentaires des hooks livrés et aux renvois relatifs, prouvé par
  test, plutôt qu'une réécriture unique ou un contrat neuf.
- 2026-10-30 (demandeur) : `miroirs-gabarit` resserré dans une intention séparée.
- 2026-10-30 (demandeur) : QUA-179 étendu à la recette livrée, prouvé par un test du paquet.

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — les tests d'abord** [IA] : QUA-190 étendu (titres cités dans les hooks livrés, renvois relatifs)
  et test de la recette livrée pour QUA-179, rouges contre l'état actuel ; contrats QUA-190, QUA-179 et
  QUA-063 mis à jour au registre. Critère de sortie : les nouveaux tests échouent pour la bonne raison.
- **Lot 2 — les corrections** [IA] : commentaire de `.githooks/scope-gate.mjs`, renvois des sections réécrits vers le
  fichier exact, puce « This folder » dans la recette du gabarit, installation ; changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` vert, `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-30) : cadré, PR de cadrage #312 ouverte.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`) une fois la PR fusionnée.
