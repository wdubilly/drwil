# Projet : `next` n'enchaîne pas tant que la PR du chantier précédent n'est pas fusionnée

**Statut** : cadré le 2026-10-26.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (partie « l'arrêt d'une file et ses comptes rendus vérifiés par un contrôle »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cloture-et-attestations.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

Une file de chantiers (QUA-037) doit s'arrêter au premier chantier qui demande
un humain et attendre la fusion de la PR de chaque chantier avant de lancer le
suivant. Aujourd'hui :

- `start` depuis CLOSING exige déjà que la PR du chantier soit **fusionnée**
  (`closingMerged`) ;
- mais `node .githooks/state.mjs next` (qui lance la tête de file depuis
  SCOPING) ne le vérifie pas : si l'état est revenu en SCOPING avant la fusion
  (retour manuel, ou fusion automatique annulée), l'agent peut lancer le
  chantier suivant sur une branche pas à jour.

La consigne « la suivante seulement après la fusion de la précédente » existe
dans `AGENTS.md`, mais rien ne la fait respecter par la mécanique.

## Critères d'acceptation

(le contrat est à créer au lancement, avec son champ **Origine** ; ID à
attribuer à ce moment-là dans le registre.)

- `state.mjs next` refuse de lancer la tête de file tant que la PR du chantier
  précédent n'est pas fusionnée, et le dit ; PR introuvable ou `gh` absent :
  refus qui le dit, jamais un lancement — contrat à créer
- Une file dont la PR précédente est fusionnée s'enchaîne comme avant, sans
  nouveau geste — contrat à créer

## 2. Hors périmètre

- Le compte rendu de clôture d'une file : décidé le 2026-10-26, il reste une
  consigne (la clôture exige déjà une évidence PASS, un fichier de plus
  n'ajoute pas de garantie).
- `start` depuis CLOSING : déjà couvert, inchangé.

## 3. Contraintes

- Réutiliser `closingMerged` et `noGhText` (`.githooks/close-branches.mjs`), un seul code
  pour « la PR est-elle fusionnée » : pas de seconde vérification.
- QUA-013 (un contrôle non exécuté n'est pas passé) : un état inconnu (`gh`
  absent, PR introuvable) est un refus, comme pour `start` depuis CLOSING.
- La file reprise dans une nouvelle session attend toujours le oui explicite de
  l'humain.

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. `next` refuse tant que la PR du chantier précédent n'est pas fusionnée,
   vérifié par `gh`, comme `start` depuis CLOSING le fait déjà.
2. Le compte rendu de clôture reste une consigne.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — `next` attend la fusion** [IA] : vérification dans `next` (via `closingMerged`), messages fr et en, refus sans `gh` ; tests de `.githooks/state.test.mjs` (PR fusionnée, ouverte, `gh` absent, file qui s'enchaîne) ; contrat et son contrôle `tests-qua-<id>` ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
