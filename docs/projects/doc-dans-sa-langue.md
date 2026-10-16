# Projet : la carte, le README et le changelog d'un projet dans la langue choisie

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/carte-dans-la-langue-du-projet.md`

<!-- scope
files:
  - packages/drwil/README.md
  - packages/drwil/CHANGELOG.md
  - packages/drwil/templates/common/base/AGENTS.md
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/docs/contracts.md
  - packages/drwil/templates/common/base/docs/recipes/adopt-the-kit.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - .githooks/state.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - AGENTS.md
-->

(cadrage : le gabarit, ses copies dans ce dépôt couvertes par
`scopeMirrors` (QUA-035), le test du rappel de clôture, le registre et le
réglage de ce dépôt.)

## 1. Besoin

Demandé le 2026-10-16. drwil entretient la carte `docs/architecture.md`
du client et lui fait tenir README et changelog à la clôture (QUA-040),
sans dire dans quelle langue : le squelette d'`init` est en anglais, et
l'`AGENTS.md` livré ne cite que fiches, intentions, journal et commits
dans la langue du projet. Ce dépôt, lui, veut en anglais ce que lit un
prospect alors qu'il travaille en français : un client peut vouloir l'un
ou l'autre.

Dans le même chantier : retirer la section « drwil (Français) » du README
du paquet, que lit un prospect (demande du 2026-10-16).

## Décisions

- 2026-10-16 (demandeur) : un réglage `docLang` dans
  `.drwil/ia-first.json`, par défaut égal à `lang` ; la carte, le README et
  le changelog s'écrivent dans cette langue. Ce dépôt règle `"en"`.
- 2026-10-16 (demandeur) : la justesse du rôle écrit pour chaque dossier
  reste une part humaine, assumée et écrite dans le contrat livré ; pas de
  contrôle de carte « figée ».

## Critères d'acceptation

- Livré à tout projet : le réglage `docLang` (absent : la langue du
  projet) fixe la langue de la carte, du README et du changelog ;
  l'`AGENTS.md` livré et le rappel CLOSING la donnent à l'agent, en
  français et en anglais — `QUA-040`
- Livré à tout projet : le contrat QUA-040 du registre livré dit que le
  contrôle de la carte juge la présence d'un dossier, pas la justesse de
  son rôle, qui reste humaine — `QUA-040`

## Contrats modifiés

- `QUA-040` — ancien critère : « la release renomme la section « Unreleased » en version » (fin de la règle, sans langue ni limite) — raison : la règle dit désormais la langue de la carte, du README et du changelog (réglage `docLang`, à défaut la langue du projet) et que la justesse du rôle écrit pour chaque dossier reste humaine ; rien n'est retiré (validé le 2026-10-16, décisions du demandeur sur l'intention)

## 2. Hors périmètre

- Traduire un squelette de carte selon `docLang` : le gabarit reste en
  anglais, l'agent écrit la carte réelle à l'adoption.
- Un contrôle de la langue des documents.

## 3. Contraintes

- Livrable léger : aucune option de CLI ; un réglage absent vaut `lang`,
  rien ne change pour un projet installé.
- Contrats à citer : QUA-040 (carte, README et changelog entretenus),
  QUA-018 (dépôt vs livrable), QUA-011 (doc jamais fausse).

## 4. Lots

- **Lot 1** — le réglage : texte de l'`AGENTS.md` livré, rappel CLOSING
  (langue lue dans la config), `docs/ia-first.md`, recettes d'adoption et
  de clôture, contrat QUA-040 (gabarit et registre), test du rappel ; ce
  dépôt règle `docLang` à `"en"` et son `AGENTS.md` renvoie au réglage.
- **Lot 2** — le README du paquet sans section française ; ligne
  « Unreleased » du changelog.

## Reprise

Rien de commencé.
