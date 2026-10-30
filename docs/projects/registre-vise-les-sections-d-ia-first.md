# Projet : le registre vise le fichier de section qui porte la règle

**Statut** : cadré le 2026-10-30 — rien de commencé.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/registre-vise-les-sections-d-ia-first.md`

<!-- scope
files:
  - docs/contracts.md
  - docs/intentions/compatibilite-des-outils.md
  - packages/drwil/test/kit.test.mjs
  - docs/intentions/registre-vise-les-sections-d-ia-first.md
  - docs/intentions/renvois-apres-decoupe.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - docs/preuves/registre-vise-les-sections-d-ia-first.md
  - .drwil/usage.jsonl
-->

(cadrage : le registre du dépôt, l'intention qui parle encore de la
matrice de `docs/ia-first.md`, et le test de QUA-190. Aucun fichier du
gabarit ne change : le registre est propre au dépôt.)

## 1. Besoin

Depuis la découpe de `docs/ia-first.md` en sommaire et sections
(QUA-190, sommaire court dont chaque renvoi mène à une section), 27
lignes de `docs/contracts.md` visent encore le sommaire : « `docs/ia-first.md`
(section 7) », « (section 8) » ou la matrice. Un agent qui suit la
**Source de vérité** d'un contrat passe par une étape de plus et ne tombe
pas sur la règle. Le test de QUA-190 ne voit pas le registre, donc rien
n'empêche le défaut de revenir.

## Critères d'acceptation

- Aucun contrat du registre ne vise « `docs/ia-first.md` (section N) » :
  chaque renvoi nomme le fichier de `docs/ia-first/` qui porte la règle, et
  ce fichier existe — `QUA-190`

## Contrats modifiés

- `QUA-190` — ancien critère : « chaque renvoi du gabarit à
  `docs/ia-first.md` mène à une section existante ; les renvois les plus lus
  visent le fichier de section exact » — raison : la règle s'étend au
  registre du dépôt (`docs/contracts.md`) ; rien n'est retiré (validé le 2026-10-30 par
  le demandeur au cadrage)

## 2. Hors périmètre

- Les renvois du gabarit : déjà couverts par QUA-190.
- Le contenu des contrats : seuls les chemins de renvoi changent, ni
  règle, ni preuve, ni **Couvre** (une attestation ne tombe donc pas ; QUA-069,
  Copilot CLI enchaîne deux chantiers d'un seul sondage, change seulement de
  **Source de vérité**).
- Les renvois à `docs/ia-first.md` qui visent l'introduction ou le sommaire
  lui-même (ligne 13 du registre : règle de validité d'une attestation) : à
  garder si le sommaire est bien la cible.

## 3. Contraintes

- Chaque renvoi change de chemin sans changer de sens : section 8 →
  `docs/ia-first/8-conduct-rules.md`, section 7 → le fichier `7-*.md`
  qui porte la règle du contrat, matrice de compatibilité →
  `docs/ia-first/6-limits-and-tool-compatibility.md`.
- Le registre reste lisible par `drwil verify` (QUA-132 : jamais lu en
  entier avec Claude Code ; vérifier par `glossary.mjs --contract`).
- Doc à jour dans le même commit (une information, une seule source).

## 4. Décisions

- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : réécrire tous les
  contrats qui citent `docs/ia-first.md (section N)`, pas seulement QUA-069
  — le défaut est le même partout et le test ne peut pas tolérer des
  exceptions.
- 2026-10-30 (demandeur, recommandation de l'agent acceptée) : étendre le test de
  QUA-190 au registre (un test refuse « `docs/ia-first.md` (section N) » dans
  `docs/contracts.md` et exige que chaque fichier de section cité existe),
  plutôt qu'une réécriture unique sans garde.

## 5. Lots

- **Lot 1 — le registre vise les fichiers de section** : écrire d'abord le
  test étendu (il échoue sur les 27 lignes), puis réécrire les renvois du
  registre et de `docs/intentions/compatibilite-des-outils.md`, relancer
  `node .githooks/run-checks.mjs`, mettre à jour QUA-190.

## 6. Reprise

- **Dernier état** (2026-10-30) : cadré ; rien de commencé.
- **Prochaine étape** : lancer le lot 1 après la fusion de cette PR de cadrage.
