# Projet : la réouverture dit ce qu'elle a annulé, et son cycle complet se joue aussi sous Windows

**Statut** : cadré le 2026-10-26.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/cloture-et-attestations.md` (parties « une réouverture refusée après l'annulation de la fusion automatique » et « la réouverture éprouvée sur une vraie PR et sous Windows »)

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/test/cycle.test.mjs
  - .githooks/state.test.mjs
  - docs/contracts.md
  - .drwil/ia-first.json
  - packages/drwil/CHANGELOG.md
  - docs/intentions/cloture-et-attestations.md
  - docs/projects/pending.md
  - docs/projects/journal.md
-->

## 1. Besoin

`node .githooks/state.mjs reopen` (QUA-116) rouvre un chantier clos dont la PR
révèle un défaut. Avant tout commit, il **annule la fusion automatique** (une
branche dont la fusion est programmée ne reçoit rien). Deux limites :

1. Si le commit de la fiche restaurée échoue ensuite (un hook pre-commit qui
   refuse, par exemple), la réouverture est refusée, l'état reste en CLOSING,
   mais la fusion automatique reste annulée. Le message dit « à reprogrammer »
   sans dire **qui** la reprogramme ni **quand**. Décision du demandeur : on ne
   reprogramme pas seul (au risque de fusionner le code fautif) ; il faut le
   dire clairement.
2. Le cycle complet de la réouverture est prouvé par des tests à `gh` simulé,
   mais celui de `packages/drwil/test/cycle.test.mjs` est **sauté sous
   Windows** : un script du PATH n'y est pas lancé sans shell. Un `gh` simulé
   lançable sous Windows (`gh.cmd`) permet de ne plus le sauter.

## Critères d'acceptation

(les contrats sont à créer au lancement, avec leur champ **Origine** ; IDs à
attribuer à ce moment-là dans le registre.)

- Quand la réouverture échoue après l'annulation de la fusion automatique, le
  refus dit que la fusion est annulée, qu'elle n'est pas reprogrammée par
  l'outil, et qu'il revient à l'humain de la reprogrammer ; le rappel d'état en
  CLOSING le redit tant que la fusion n'est pas reprogrammée — contrat à créer
- Le test du cycle complet d'une réouverture (QUA-118 : nouvelle clôture d'un
  chantier rouvert) se joue aussi sous Windows, avec un `gh` simulé lançable
  (`gh.cmd` et shell), au lieu d'être sauté — contrat à créer

## 2. Hors périmètre

- Attendre le verdict de CodeQL avant la clôture : décidé le 2026-10-26, `reopen`
  suffit.
- Reprogrammer la fusion automatique seul : décidé le 2026-10-26, on laisse
  l'humain décider.
- Un essai sur une vraie PR GitHub : consigné en note à la prochaine CI rouge
  après une clôture (`docs/intentions/notes.md`), pas un critère de ce chantier.

## 3. Contraintes

- QUA-116 (réouverture d'un chantier clos) et QUA-118 (nouvelle clôture d'un
  chantier rouvert) ne changent pas de comportement : seuls le message, le
  rappel d'état et le simulateur de `gh` changent.
- Le message existe en français et en anglais (`.githooks/state-texts.mjs`) : les deux.
- Le simulateur sous Windows ne doit pas affaiblir les tests sous Linux.

## 4. Décisions

(validées par le demandeur le 2026-10-26)

1. Ne rien ajouter pour CodeQL : `reopen` suffit.
2. Fusion annulée puis réouverture échouée : laisser à l'humain, le dire plus
   clairement (message et rappel d'état).
3. Prouver la réouverture par un `gh` simulé lançable sous Windows ; l'essai
   réel reste une note.

## 5. Points à trancher

- Aucun : tout est tranché.

## 6. Increments

- **Lot 1 — message et rappel** [IA] : texte `reopenCancelled` (fr, en) qui dit qui reprogramme la fusion ; rappel d'état en CLOSING tant que la fusion est annulée ; tests de `.githooks/state.test.mjs` ; contrat et son contrôle `tests-qua-<id>`.
- **Lot 2 — cycle sous Windows** [IA] : `gh` simulé lançable sous Windows (`gh.cmd` et `shell`) dans `packages/drwil/test/cycle.test.mjs` ; plus de test sauté sous Windows ; contrat et son contrôle ; ligne « Unreleased » du changelog. Critère de sortie : `node .githooks/run-checks.mjs` OK, `drwil verify --agent` PASS.

## 7. Reprise

- **Dernier état** (2026-10-26) : cadré, prêt à lancer.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer le chantier (`/drwil-start`).
