# Projet : la barrière de périmètre juge une fusion sur sa seule résolution

**Statut** : cadré le 2026-10-23.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/notes.md` (note du 2026-10-23 sur la barrière et les commits de fusion)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/scope-gate.mjs
  - .githooks/scope-gate.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
-->

(La copie installée `.githooks/scope-gate.mjs` est couverte par
`scopeMirrors` : on n'édite que le gabarit, puis `npm run installer-depot`.)

## 1. Besoin

Au commit d'une fusion de la branche principale dans une branche de
chantier, la barrière de périmètre (`checkIndex`, au pre-commit) juge tous
les fichiers indexés, y compris ceux que la branche principale apporte tels
quels. Elle les compte comme écrits par l'auteur : en SCOPING ou en CLOSING,
« N fichier(s) hors fiches » ; en BUILD, « hors du cadrage ». Cas vécu le
2026-10-23 sur la PR #213 : la fusion de `master` apportait
`outils/banc.test.mjs`, déjà fusionné par la PR #214, et le commit a été
refusé. Il a fallu une mise à jour faite par GitHub, après avoir retiré puis
rajouté le fichier en conflit. Ce défaut revient à chaque conflit entre
une branche de chantier et la branche principale.

Au push et en CI, `checkBranch` ignore déjà les commits de fusion
(`rev-list --no-merges`) : seul le commit local est touché.

## Critères d'acceptation

- Pendant une fusion, la barrière ne juge que la résolution : un fichier
  indexé identique à sa version dans l'un des deux parents passe, quels que
  soient l'activité et le cadrage ; un fichier différent des deux parents
  (conflit résolu, combinaison) reste jugé comme tout fichier indexé ; hors
  fusion, rien ne change — `QUA-111`

## 2. Hors périmètre

- Le push et la CI (`checkBranch`), qui ignorent déjà les fusions.
- Le rebase, déjà traité (trailer gardé, `replaying`).
- Le chemin gouverné d'une CI rouge après la clôture (autre note du
  2026-10-23).
- Une fusion qui n'est pas celle de la branche principale : la règle vaut
  pour toute fusion, sans distinguer la branche apportée.

## 3. Contraintes

- Livré dans le gabarit, comme toute la barrière ; ce dépôt la reçoit par
  `npm run installer-depot`.
- Fusion détectée par `MERGE_HEAD` (`git rev-parse --verify MERGE_HEAD`),
  comparaison par blob (`HEAD:<f>`, `MERGE_HEAD:<f>`, `:<f>` indexé) ; un
  fichier supprimé dans l'index et absent d'un parent compte comme identique
  à ce parent. Un appel git qui échoue juge le fichier, jamais ne le laisse
  passer (QUA-013, un contrôle non exécuté n'est pas passé).
- Pas de nouveau réglage : le comportement vaut pour tous.

## 4. Décisions

- 2026-10-23 — Le commit de fusion est jugé sur sa seule résolution, ni
  exempté en entier ni refusé avec un message guidé (demandeur).
- 2026-10-23 — La règle est un nouveau contrat plutôt qu'un
  élargissement de QUA-035 (cadrage complet, élargissement sans friction) :
  ajout pur au registre, aucun contrat existant modifié (demandeur).

## 5. Points à trancher

(aucun)

## 6. Increments

- **Lot 1 — résolution seule** [IA] : `checkScope` filtre, pendant une
  fusion, les fichiers indexés identiques à l'un des parents avant
  `checkIndex` ; tests du nouveau contrat dans `.githooks/scope-gate.test.mjs` (dépôt
  temporaire : fusion propre apportant un fichier hors cadrage acceptée en
  SCOPING ; conflit résolu sur un fichier de code hors cadrage refusé ;
  fichier supprimé par la branche principale ; commit ordinaire inchangé) ;
  contrat au registre, son contrôle `tests-qua-<id>` déclaré ; ligne
  « Unreleased » du changelog. Critère de sortie : tests du contrat verts,
  `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-23) : cadré.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
