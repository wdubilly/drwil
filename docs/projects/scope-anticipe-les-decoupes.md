# Projet : le cadrage d'une fiche anticipe les découpes, pour qu'un fichier neuf n'arrête plus un chantier

**Statut** : cadré le 2026-10-28 — prêt à lancer.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/scope-des-fiches-suit-les-fichiers-decoupes.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/check-docs-workstreams.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs-texts.mjs
  - .githooks/check-docs-workstreams.mjs
  - .githooks/check-docs-texts.mjs
  - .githooks/check-docs.test.mjs
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - docs/projects/model-brief.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/scope-des-fiches-suit-les-fichiers-decoupes.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Deux chantiers de suite (`niveau-de-protection`, `surveillance-taille-du-kit`)
se sont arrêtés plusieurs fois sur un fichier absent du bloc scope de leur
fiche : un fichier extrait d'un plus gros par le plafond de 200 lignes
(QUA-001), la carte d'architecture (QUA-040), `docs/projects/kit-mechanics.md`
et sa copie gabarit. Chaque arrêt coûte une décision humaine et une relance de
sous-agent. La barrière de périmètre fait son travail ; c'est le cadrage qui
n'a pas prévu ces fichiers.

Plusieurs fichiers du scope des fiches cadrées restantes sont à la limite du
plafond (`packages/drwil/src/criteria.ts` 200 lignes, `.githooks/base-checks.mjs`
200, `packages/drwil/src/verify.ts` 199, `packages/drwil/src/evidence.ts` 190,
`packages/drwil/src/closure.ts` 184) : le même arrêt est à prévoir.

Décision du 2026-10-28 : la barrière ne change pas ; le rappel de cadrage
(QUA-016) avertit, dès la rédaction de la fiche, quand un fichier de son scope
est proche du plafond, et le modèle de fiche rappelle les fichiers qu'un
fichier de code neuf impose de lister.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- Le rappel de cadrage avertit, sans jamais bloquer, quand un fichier de code
  du scope d'une fiche atteint 180 lignes ou plus, et dit de lister d'avance les
  fichiers issus de sa découpe ; en dessous, aucun avertissement — `QUA-158`
- Le modèle de fiche (dépôt et gabarit) rappelle la carte d'architecture et
  `docs/projects/kit-mechanics.md` à lister quand un fichier de code ou un hook
  est ajouté — `QUA-158`

## Contrats modifiés

- `.githooks/check-docs-texts.mjs` — message de l'avis de taille, fr et en (validé par le demandeur le 2026-10-28, au cadrage : fichier du scope de la fiche)
- `.githooks/check-docs-workstreams.mjs` — le rappel de cadrage mesure les fichiers de code du scope (validé par le demandeur le 2026-10-28, au cadrage : fichier du scope de la fiche)
- `.githooks/check-docs.test.mjs` — tests de QUA-158 (validé par le demandeur le 2026-10-28, au cadrage : fichier du scope de la fiche)

## 2. Hors périmètre

- La barrière de périmètre (`scope-gate`) : inchangée, aucun fichier admis sans
  être listé.
- Les pistes écartées au cadrage : le joker de dossier implicite (il annule la
  barrière, QUA-019), et l'héritage du scope par un fichier découpé (heuristique
  fragile, à reprendre seulement si les arrêts persistent).
- L'admission automatique des fichiers dérivés (carte d'architecture,
  `kit-mechanics`, copie gabarit) : reste une intention, à reprendre si les
  arrêts persistent après ce chantier.

## 3. Contraintes

- Un avertissement, jamais un blocage : le seuil n'est pas une règle qui doit
  faire échouer un commit (réglage `scopeReminder` inchangé).
- Seuil de 180 lignes, lu d'une seule source avec le plafond de 200 lignes du
  contrôle de taille (QUA-001, QUA-157), pas une seconde valeur en dur.
- Code livré : on édite le gabarit, la copie du dépôt suit
  (`npm run installer-depot`).

## 4. Décisions

(validées par le demandeur le 2026-10-28)

1. Piste retenue : alerter au cadrage, rappeler dans le modèle de fiche.
2. La barrière ne change pas ; aucune admission automatique pour l'instant.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — avertissement de cadrage** [IA] : le rappel de cadrage lit la taille
  des fichiers de code du scope et avertit à 180 lignes ou plus ; messages fr et
  en ; tests de `.githooks/check-docs.test.mjs` (au seuil, en dessous,
  fichier inexistant ignoré) ; contrat et son contrôle `tests-qua-<id>`.
- **Lot 2 — modèle de fiche** [IA] : le rappel dans `model-brief.md` (dépôt et
  gabarit) ; ligne « Unreleased » du changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-28) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
