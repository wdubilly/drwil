# Projet : enchaîner plusieurs chantiers sans intervention, sur une file décidée d'un geste

**Statut** : cadré le 2026-10-16.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : `docs/intentions/fabrique-autonome.md`

<!-- scope
files:
  - packages/drwil/templates/common/base/.githooks/state.mjs
  - packages/drwil/templates/common/base/.githooks/state-texts.mjs
  - packages/drwil/templates/common/base/.githooks/briefs.mjs
  - packages/drwil/templates/common/base/.githooks/state-cli.mjs
  - packages/drwil/templates/common/base/docs/projects/kit-mechanics.md
  - docs/projects/kit-mechanics.md
  - packages/drwil/templates/common/tools/claude/.claude/hooks/prompt-hook.mjs
  - packages/drwil/templates/common/tools/claude/.claude/skills/start-a-workstream/SKILL.md
  - packages/drwil/templates/common/base/docs/recipes/working-with-branches.md
  - packages/drwil/templates/common/base/docs/ia-first.md
  - packages/drwil/templates/common/base/AGENTS.md
  - .githooks/state.test.mjs
  - packages/drwil/test/kit.test.mjs
  - docs/recipes/working-with-branches.md
  - AGENTS.md
  - docs/contracts.md
  - .drwil/ia-first.json
-->

(cadrage : les fichiers du gabarit couvrent leurs copies du dépôt par le
réglage `scopeMirrors` (QUA-035) ; les copies avec écart (recette des
branches, `AGENTS.md`) sont citées à part.)

## 1. Besoin

Demandé le 2026-10-16 : traiter plusieurs fiches à la suite sans
intervention humaine. Aujourd'hui, chaque chantier exige un sondage de
lancement et une autorisation de fusion : l'humain doit revenir entre
deux chantiers même quand rien n'est à trancher. Premier pas vers
l'intention `fabrique-autonome` : l'humain décide une fois, pour une
file ; il n'est rappelé que quand un humain doit vraiment trancher.

## Critères d'acceptation

(contrat à créer par ce chantier, avec son champ Origine.)

- Un seul sondage `/drwil-start` à choix multiple enregistre une file
  ordonnée de fiches et la fusion automatique ; la réponse est lue par le
  hook, jamais par l'agent ; seule une fiche prête (maturité « prêt »,
  aucune `[décision]` ouverte, critères présents) peut entrer dans la file
  — contrat à créer
- Après la clôture d'un chantier de la file et la fusion de sa PR, l'agent
  lance seul la fiche suivante de la file, depuis la branche principale à
  jour, et jamais une fiche hors de la file — contrat à créer (le même)
- La file s'arrête au premier chantier qui bute (attestation humaine
  attendue, FAIL non corrigé, CI rouge, décision à prendre) : l'agent dit
  pourquoi et ce qu'il attend ; la file se relance d'un geste — contrat à
  créer (le même)
- Chaque clôture de la file produit un compte rendu court (critères,
  contrôles, limites, intentions créées), et la fin de la file un bilan —
  contrat à créer (le même)

## 2. Hors périmètre

- Passer un chantier bloqué pour continuer avec le suivant (non retenu le
  2026-10-16 : les suivants partent souvent de celui-ci).
- Le réglage permanent `transitions: agent` (existant, inchangé) : la file
  garde une décision humaine sur ce qui est lancé.
- Un plafond du nombre de fiches par file (non retenu le 2026-10-16).
- La file pour Copilot CLI : son sondage n'a qu'une réponse libre ; il
  garde le lancement fiche par fiche (à consigner en intention à la
  clôture si besoin, QUA-036).
- Les attestations : elles restent un geste humain, la file s'arrête
  dessus.

## 3. Contraintes

- La file vit dans l'état de gouvernance (`.drwil/state.json` (si présent), jamais
  écrit à la main), écrite par le hook comme le lancement aujourd'hui ;
  elle est effacée au retour en SCOPING sans chantier suivant, ou à
  l'arrêt.
- Lancer la fiche suivante reste une transition contrôlée par
  `.githooks/state.mjs` : permise à l'agent seulement pour la tête de la
  file autorisée par l'humain.
- Fusion attendue entre deux chantiers : la fiche suivante part de la
  branche principale à jour, jamais d'une branche empilée.
- Contrats à citer : QUA-019 (pas de contournement : la file ne lève
  aucun contrôle), QUA-034 (le verdict tombe sur un critère non prouvé :
  c'est lui qui arrête la file), QUA-036 (la clôture boucle les
  intentions).

## 4. Décisions

Tranchées par le demandeur le 2026-10-16 (sondage) :

- Autorisation : une file décidée d'un geste (sondage à choix multiple),
  avec la fusion automatique.
- Arrêt : la file s'arrête au premier chantier qui bute.
- Garde-fous : seulement des fiches prêtes ; fusion attendue entre deux
  chantiers ; un compte rendu par chantier et un bilan de file.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — la file dans l'état** [IA] : champ de file dans l'état,
  validé ; lancement de la tête de file permis à l'agent ; file effacée à
  l'arrêt ; éligibilité d'une fiche. Critère de sortie : tests (file
  enregistrée, tête lancée par l'agent, fiche hors file refusée, fiche non
  prête refusée, arrêt, français et anglais).
- **Lot 2 — le geste et l'enchaînement** [IA] : sondage à choix multiple
  lu par le hook ; skill `/drwil-start`, recette de clôture (fusion
  attendue, fiche suivante, compte rendu, bilan) ; doc livrée et
  `AGENTS.md` ; contrat créé. Critère de sortie : test d'installation
  (sondage à choix multiple : file enregistrée ; pré-rempli : refusé) ;
  `drwil verify` évalue chaque critère prouvé.

## 7. Reprise

- **Dernier état** (2026-10-16) : fiche cadrée ; aucun code écrit.
- **Travail non commité** : aucun.
- **Prochaine étape** : [humain] lancer (`/drwil-start`) ; une fois livrée,
  les fiches `docs/projects/projet-neuf.md`,
  `docs/projects/glossaire-des-id.md` et `docs/projects/doc-a-jour.md`
  pourront s'enchaîner en file.
