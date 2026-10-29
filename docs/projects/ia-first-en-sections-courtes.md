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

(les contrats sont à créer au lancement, avec leur champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- Aucun document lu à la demande du kit ne dépasse le nouveau plafond, et
  `kitSizeLegacy` est retiré — contrat à créer (ou QUA-157 modifié, voir
  « Contrats modifiés » au lancement)
- Chaque section issue de la découpe se lit seule : un agent la charge sans
  lire les autres, et chaque renvoi existant vers `docs/ia-first.md` mène à la bonne
  section — contrat à créer
- Aucun contenu n'est perdu : le texte de chaque règle de la section 8 et des
  sections 1 à 7 se retrouve, mot pour mot, dans une section — [humain] revue
  de la découpe

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
   section N » restent vraies ; aucun renvoi n'est réécrit.
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

- **Dernier état** (2026-10-29) : décisions de forme tranchées, fiche prête.
- **Travail non commité** : aucun.
- **Prochaine étape** : lancer le chantier (`/drwil-start`).
