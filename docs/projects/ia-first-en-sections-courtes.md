# Projet : `docs/ia-first.md` en sections courtes autonomes, sous un plafond de lecture à la demande abaissé

**Statut** : cadré le 2026-10-28 ; décisions de forme tranchées le 2026-10-29.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/fichiers-charges-courts.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/docs/ia-first.md
  - docs/ia-first.md
  - packages/drwil/templates/common/base/docs/ia-first/*.md
  - docs/ia-first/*.md
  - packages/drwil/templates/common/base/.githooks/check-kit-size.mjs
  - .githooks/check-kit-size.mjs
  - .githooks/check-kit-size.test.mjs
  - .drwil/ia-first.json
  - outils/miroirs.json
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/CHANGELOG.md
  - docs/intentions/fichiers-charges-courts.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/guarantees.test.mjs
  - outils/banc-agents.test.mjs
  - packages/drwil/src/config.ts
  - packages/drwil/templates/common/base/AGENTS.md
  - AGENTS.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/drwil/SKILL.md
  - .claude/skills/drwil/SKILL.md
  - packages/drwil/templates/common/base/docs/projects/model-brief.md
  - docs/projects/model-brief.md
  - packages/drwil/templates/common/base/docs/projects/pending.md
  - packages/drwil/templates/common/base/docs/projects/routine-maintenance.md
  - docs/projects/routine-maintenance.md
-->

## 1. Besoin

`docs/ia-first.md` fait 916 lignes. Seul le plafond hérité `kitSizeLegacy`
(`.drwil/ia-first.json`) le tolère, au-dessus du plafond de 800 lignes des
documents lus à la demande (QUA-157). Or 800 lignes restent trop pour le coût en
tokens : un agent qui ne cherche qu'une règle en charge des centaines.

Décision du demandeur (2026-10-28) : abaisser le plafond des documents lus à la
demande (400 ou 500 lignes) et découper `docs/ia-first.md` en sections courtes,
autonomes, chargées seulement quand leur situation se présente. La fiche retire
alors `kitSizeLegacy` : plus aucun fichier du kit au-dessus de son plafond.

Fait à peser : 70 fichiers citent `docs/ia-first.md`, dont 20 par « section N »
(sections 4, 5, 7 et 8 ; relevé du 2026-10-29). Le nom du fichier et la
numérotation de ses sections sont donc un contrat de fait.

Tailles relevées le 2026-10-29 : section 7, 416 lignes (six sous-sections de
23 à 121 lignes) ; section 8, 183 ; section 5, 119 ; les autres, moins de 60.
Aucun autre document lu à la demande du kit ne dépasse 163 lignes.

## Critères d'acceptation

(contrats créés ou modifiés au lot 2, avec leur champ **Origine**.)

- Aucun document lu à la demande du kit ne dépasse le nouveau plafond, et
  `kitSizeLegacy` est retiré — `QUA-157` (modifié, voir « Contrats modifiés »)
- Chaque section issue de la découpe se lit seule : un agent la charge sans
  lire les autres, et chaque renvoi existant vers `docs/ia-first.md` mène à la bonne
  section — `QUA-190`
- Aucun contenu n'est perdu : le texte de chaque règle de la section 8 et des
  sections 1 à 7 se retrouve, mot pour mot, dans une section — [humain] revue
  de la découpe — `QUA-191`

## Contrats modifiés

- `.githooks/check-kit-size.mjs` — le plafond des documents lus à la demande
  passe de 800 à 400 lignes (gabarit et copie), QUA-157 modifié (validé par le
  demandeur le 2026-10-29)
- `QUA-157` — même décision, au registre : plafond des documents lus à la
  demande à 400 lignes, plus aucun `kitSizeLegacy` dans ce dépôt (validé par
  le demandeur le 2026-10-29)

## 2. Hors périmètre

- Les autres documents du kit (recettes, `AGENTS.md`) : leurs plafonds ne
  changent pas, sauf celui des documents lus à la demande.
- Un outil de découpe pour l'adoptant : intention séparée
  (`docs/intentions/alleger-les-fichiers-de-l-adoptant.md`).

## 3. Contraintes

- Code livré : on édite le gabarit, la copie du dépôt suit
  (`npm run installer-depot`).
- Les références existantes ne doivent pas casser : un contrôle de liens ou de
  sections citées, s'il existe, reste vert ; sinon la fiche en pose un.
- Un projet déjà adopté garde son `docs/ia-first.md` à la mise à jour : à
  vérifier avec `drwil update`, aucune perte (même exigence que pour
  `AGENTS.md`).

## 4. Décisions

(validées par le demandeur le 2026-10-28)

1. Abaisser le plafond des documents lus à la demande et découper
   `docs/ia-first.md` en sections courtes autonomes.
2. Retirer `kitSizeLegacy` à la fin du chantier.

(tranchées par le demandeur le 2026-10-29, sondage)

3. Plafond des documents lus à la demande : 400 lignes. La section 7 se
   découpe donc aussi, par sous-section.
4. Forme : un dossier docs/ia-first/ (à créer), un fichier par section (et par
   sous-section de la section 7) ; `docs/ia-first.md` devient un sommaire court
   (moins de 100 lignes) qui garde la numérotation et donne, pour chaque
   section, le chemin de son fichier. Les citations « `docs/ia-first.md`,
   section N » restent vraies. Révisé par le demandeur le 2026-10-29, au
   lot 2 : les renvois les plus lus (`AGENTS.md`, `.claude/skills/drwil/SKILL.md`,
   `model-brief.md`, `pending.md`, `routine-maintenance.md`, gabarit et copie)
   pointent vers le fichier de section exact, un renvoi « section 7 » nommant
   sa sous-section ; les autres passent par le sommaire. Les tests cherchent
   une règle dans le sommaire et ses sections, pas à une position fixe ;
   `KIT_PROSE` (`packages/drwil/src/config.ts`) livre le dossier docs/ia-first/, prouvé
   par un test.
5. Chargement : lecture directe du fichier de section, dont le sommaire donne
   le chemin. Pas d'option `--section` dans `.githooks/glossary.mjs`.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — plafond et forme** [IA] : le plafond abaissé à 400 lignes dans
  `.githooks/check-kit-size.mjs` (gabarit et copie), test au nouveau seuil.
- **Lot 2 — découpe** [IA] : sections courtes autonomes, sommaire, renvois
  vérifiés, `kitSizeLegacy` retiré ; carte d'architecture et `kit-mechanics.md`
  à jour ; ligne « Unreleased » du changelog. Critère de sortie :
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-29) : lot 1 fait — plafond des documents lus à la
  demande abaissé de 800 à 400 lignes dans `.githooks/check-kit-size.mjs`
  (gabarit et copie), test au nouveau seuil, texte de QUA-157 mis à jour.
  `docs/ia-first.md` (916 lignes) reste toléré par `kitSizeLegacy` (inchangé) ;
  aucun autre document lu à la demande du kit ne dépasse 400 lignes.
- **Lot 2, premier essai** (2026-10-29) : arrêté sans rien modifier, le
  périmètre ne couvrait pas les tests qui lisent `docs/ia-first.md` ni
  `KIT_PROSE` ; périmètre élargi sur le oui du demandeur (décision 4 révisée).
- **Lot 2 fait** (2026-10-29) : `docs/ia-first.md` devenu un sommaire de 36
  lignes (numérotation gardée, une ligne et un chemin par section) ; 14
  fichiers dans le dossier docs/ia-first/ (une section par fichier, une
  sous-section de la section 7 par fichier ; le plus long, la section 8, 187
  lignes), texte conservé mot pour mot, titres d'un niveau plus haut, une
  ligne d'en-tête qui renvoie au sommaire. Renvois les plus lus vers le
  fichier exact (`AGENTS.md`, skill `drwil`, `model-brief.md`, `pending.md`
  du gabarit, `routine-maintenance.md`, gabarit et copie) ; `KIT_PROSE` livre
  le dossier ; tests qui cherchent une règle dans le sommaire et ses
  sections ; `kitSizeLegacy` retiré ; QUA-157 modifié, QUA-190 (sommaire et
  renvois, tests) et QUA-191 (revue humaine de la découpe) créés.
- **Travail non commité** : aucun.
- **Prochaine étape** : clôture, après l'humain. `drwil verify --agent`
  (2026-10-29, lot 2 commité) : 163 PASS, 16 ATTESTED, 0 FAIL, 4 MANUAL —
  QUA-191 (revue de la découpe) à attester, et les attestations tombées
  parce que le lot touche un fichier qu'elles couvrent : QUA-064 et QUA-066
  (`packages/drwil/src/config.ts`), QUA-150 (`outils/banc-agents.test.mjs`).
