# Projet : date gardée et feu vert de publication (0.6.5, 1 sur 4)

**Statut** : cadré le 2026-10-18 (découpé de la clôture allégée).
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/date-ia-first-installateur.md`

<!-- scope
files:
  - packages/drwil/src/render.ts
  - packages/drwil/src/index.ts
  - packages/drwil/src/migration.ts
  - packages/drwil/src/manifest.ts
  - packages/drwil/test/kit.test.mjs
  - packages/drwil/test/cycle.test.mjs
  - packages/drwil/test/migration.test.mjs
  - outils/installer-depot.mjs
  - outils/installer-depot.test.mjs
  - packages/drwil/templates/common/base/docs/recipes/create-a-release.md
  - docs/recipes/create-a-release.md
  - packages/drwil/templates/common/tools/claude/.claude/skills/create-a-release/SKILL.md
  - .claude/skills/create-a-release/SKILL.md
  - docs/ia-first.md
  - docs/architecture.md
  - docs/contracts.md
  - .drwil/ia-first.json
  - outils/miroirs.json
  - packages/drwil/CHANGELOG.md
-->

(cadrage : le rendu et la mise à jour du paquet pour la date ;
l'installateur du dépôt et son test ; `docs/ia-first.md`, rendu une
dernière fois ; la recette et la skill de release (gabarit et copies du
dépôt) ; la carte, le registre, les miroirs et le changelog.)

## 1. Besoin

Points 1 et 7 de la clôture allégée (`docs/projects/cloture-allegee.md`,
cadrée le 2026-10-18) :

1. **La date qui change** : `npm run installer-depot` réécrit la date de
   `docs/ia-first.md` à chaque lancement (vérifié le 2026-10-18 : seul
   fichier à écrire), un faux changement à annuler à la main ou qui pollue
   le commit. Le gabarit rend `{{date}}` à la date du jour
   (`packages/drwil/src/render.ts`) ; une mise à jour d'un projet
   utilisateur risque le même bruit (à vérifier en BUILD).
2. **Le feu vert de publication** : un sous-agent ne peut pas le demander ;
   la recette de release ne prévoit pas de le donner au lancement.

## Critères d'acceptation

- Installer ou mettre à jour ne réécrit pas un document dont seule la date
  changerait : la date d'origine est gardée, une nouvelle date n'est écrite
  que si le reste du document change — `QUA-047`
- La recette de release permet de donner le feu vert de publication au
  lancement, pour qu'une file menée par sous-agents publie sans s'arrêter ;
  sans ce feu vert, la publication reste un geste après accord — `QUA-040`

## 2. Hors périmètre

- La clôture outillée, l'ordre de la file et le détour : leurs fiches
  (`docs/projects/cloture-allegee.md`, `docs/projects/ordre-de-la-file.md`,
  `docs/projects/detour.md`).
- La fiche de recette jointe à la release :
  `docs/projects/fiche-de-recette.md`.

## 3. Contraintes

- Livré à tout projet (QUA-018, dépôt ou livrable : validé par le
  demandeur le 2026-10-18) : on édite le gabarit, puis
  `npm run installer-depot` ; jamais une copie installée.
- Hooks à 100 % de couverture (QUA-004) ; fichiers de code sous 400 lignes
  (QUA-001).

## 4. Décisions

- **2026-10-18 — La date d'origine est gardée** (demandeur, sur
  recommandation de l'agent) : réécrite seulement si le reste du document
  change ; la date n'est pas retirée. Tranche l'intention
  `docs/intentions/date-ia-first-installateur.md`.
- **2026-10-18 — Une PR par fiche** (demandeur) : la décision « une seule
  PR » portait sur le cadrage de la 0.6.5, pas sur sa réalisation.
- Contrats concernés : QUA-047 (créé : une date seule ne réécrit pas un
  document installé), QUA-040 (drwil entretient
  la carte, le README et le changelog), QUA-018 (dépôt ou livrable),
  QUA-004 (seuil de couverture) et QUA-001 (fichier de code plafonné).

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la date** [IA] : rendu qui garde la date d'origine, à
  l'installation du dépôt comme à la mise à jour d'un projet.
- **Lot 2 — le feu vert de publication** [IA] : recette et skill de
  release.
  Critère de sortie de chaque lot : `node .githooks/run-checks.mjs` vert ;
  du chantier : `drwil verify --agent` en `GOVERNANCE: PASS`.

## 7. Reprise

- **Dernier état** (2026-10-18) : cadré, rien de construit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
