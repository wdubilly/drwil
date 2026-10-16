# Projet : vue des règles métier dans drwil verify

**Statut** : cadré le 2026-10-16.
**Risque** : MEDIUM
**Maturité** : prêt

<!-- scope
files:
  - packages/drwil/src/rules.ts
  - packages/drwil/src/verify.ts
  - packages/drwil/src/verdict.ts
  - packages/drwil/src/agent.ts
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/contracts.md
-->

(cadrage : le paquet, ses tests et la doc livrée de `drwil verify` ; la
copie du dépôt, `docs/ia-first.md`, se régénère par
`npm run installer-depot`, QUA-018 (dépôt vs livrable).)

## 1. Besoin

Intention : `docs/intentions/non-regression-metier.md`, point 3. Le
registre métier grandit chantier après chantier, mais rien ne dit d'un
coup d'œil où il en est : quelles règles sont prouvées par un test,
lesquelles restent à compléter (part humaine), lesquelles sont cassées et
de quel chantier elles viennent. Sans cette vue, la non-régression métier
existe mais ne se voit pas.

## Critères d'acceptation

(contrat à créer par ce chantier : l'ID est posé dans le même commit que
le contrat, `check-docs` refusant de citer un contrat absent du registre.)

- `drwil verify` (sortie humaine et sortie agent) se termine par un bilan
  d'une ligne des règles métier : prouvées par un test, prouvées sans test
  cité, à compléter, cassées (chacune avec son chantier d'origine) —
  contrat à créer
- Le détail règle par règle (statut, preuve, tests cités, origine) est
  dans le format JSON de verify et dans son évidence — contrat à créer (le
  même que le critère précédent)
- Une règle métier est un contrat au préfixe métier (`APP` par défaut,
  réglable : `businessPrefixes` de `.drwil/ia-first.json`) ou un contrat
  qui porte un champ Origine — contrat à créer (le même)

## 2. Hors périmètre

- Un tableau complet à chaque verify, ou une option `--rules` (non retenus
  le 2026-10-16 : la sortie s'allongerait à chaque chantier).
- La vue d'avancement HTML (`/drwil-progress`) : plus tard, décidé le
  2026-10-16.
- La recette « demander une bonne pratique hors adoption » (point 4 de
  l'intention).
- `drwil contracts` (liste statique du registre) : inchangé.

## 3. Contraintes

- `packages/drwil/src/verify.ts` est à 396 lignes (QUA-001, plafond 400) :
  le calcul du bilan vit dans un nouveau module, rules.ts,
  et verify ne fait que l'appeler.
- Le format JSON de verify est stable (`packages/drwil/src/verdict.ts`) :
  le bilan s'y ajoute sous une nouvelle clé, sans changer les autres.
- Le champ Origine se lit dans les deux langues (`Origine` / `Origin`),
  comme pour l'affichage d'un contrat en échec
  (`packages/drwil/src/criteria.ts`, `showOrigins`).
- Aucune règle métier dans le registre : pas de ligne de bilan (pas de
  bruit sur un projet qui n'en a pas).
- Contrats à citer : QUA-022 (preuve d'un critère laissée au registre),
  QUA-023 (régression ou évolution d'un contrat), QUA-029 (tests cités
  présents et porteurs de l'ID).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondages) :

- Lieu : dans `drwil verify` d'abord ; la vue d'avancement plus tard.
- Périmètre : préfixe métier (`APP` par défaut, réglable) plus tout
  contrat qui porte un champ Origine.
- Forme : un bilan d'une ligne en fin de sortie (humaine et agent) ; le
  détail règle par règle dans le JSON et l'évidence.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — bilan des règles métier** [IA] : un nouveau module, rules.ts,
  classe les règles (prouvée par test : PASS avec Tests ; prouvée sans
  test cité : PASS sans Tests ; à compléter : MANUAL ou ATTESTED ;
  cassée : FAIL ou ERROR, avec son origine) ; verify l'ajoute au verdict,
  à la sortie humaine, à la sortie agent et au JSON. Critère de sortie :
  test de cycle sur une installation neuve (APP-001 à compléter, une
  règle née d'un chantier prouvée, une cassée avec son origine) ; contrat
  créé ; `drwil verify` évalue chaque critère prouvé.
- **Lot 2 — doc livrée** [IA] : `docs/ia-first.md` du gabarit (section
  `drwil verify`) décrit le bilan et le réglage `businessPrefixes`.
  Critère de sortie : `check-docs` vert, copie du dépôt régénérée.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
