# Projet : un fichier de code neuf reste couvert après la clôture de la fiche qui le listait

**Statut** : cadré le 2026-11-12.
**Risque** : HIGH
**Maturité** : prêt
**Intention** : urgent — signalé par le projet adoptant `marinade-poulet` (drwil 0.11.1, GitLab), qui n'arrive plus à fusionner la MR de clôture d'un chantier.

<!-- scope
files:
  - .githooks/scope.mjs
  - .githooks/scope.test.mjs
  - .githooks/check-docs-workstreams.mjs
  - .githooks/prepare-commit-msg
  - packages/drwil/templates/common/base/.githooks/prepare-commit-msg
  - packages/drwil/templates/common/base/.githooks/scope.mjs
  - packages/drwil/templates/common/base/.githooks/check-docs-workstreams.mjs
  - docs/contracts.md
  - docs/architecture.md
  - docs/projects/kit-mechanics.md
  - docs/projects/pending.md
  - docs/projects/journal.md
  - .drwil/ia-first.json
-->

## 1. Besoin

Un chantier ajoute un fichier de code neuf (exemple de l'adoptant : scripts/generate-sitemap.mjs), cité par
`docs/contracts.md` et `docs/architecture.md` ; le `scope` de la fiche le liste. La clôture (`.githooks/close.mjs`) supprime la
fiche dans son commit. Le job CI `checks` échoue alors sur « chemins et contrats cités dans la doc »
(`checkScopeReminder`, `.githooks/check-docs-workstreams.mjs`, réglage `scopeReminder: "blocking"`) : « fichier de
code hors de toute fiche (bloc scope) ». La MR ne peut pas fusionner (« Pipelines must succeed »), donc le fichier
ne devient jamais « livré » : cercle vicieux, pour tout chantier qui ajoute un fichier de code.

Cause, lue dans le code : `outsideBriefs()` (`.githooks/scope.mjs`) ne tient pour couvert qu'un fichier listé par
une fiche encore présente, ou « livré » (QUA-173). `deliveredFiles()` ne compte comme livré qu'un fichier identique
à celui du merge-base avec la branche principale : un fichier neuf n'y est pas, tant que la MR n'est pas fusionnée.

Second problème, lié : le correctif ne peut pas se valider dans sa propre MR. Le job `checks` rejoue les contrôles
avec les hooks de la branche principale (QUA-113), donc un test de `.githooks/scope.test.mjs` qui importe une fonction neuve
de `.githooks/scope.mjs` plante à l'import, et ce test est lui-même vu comme du code hors fiche.

Troisième problème, de même nature : un commit qui supprime la fiche active (la clôture) perd le trailer
`Drwil-Brief:` que `prepare-commit-msg` ajoute à partir de la fiche active ; la barrière échoue alors (« 2 fichiers
hors fiche sans trailer Drwil-Brief ») et l'adoptant a dû amender le commit à la main.

Rapport complet de l'adoptant reçu le 2026-11-12. Son quatrième point (le kit suppose GitHub et `gh` :
`state.mjs reopen`, `detour.mjs resume`, merge-auto et pr-watch ; aucune commande d'abandon d'un détour ;
`glab mr merge --auto-merge` renvoie 405 pipeline en cours) est trop large pour ce chantier urgent : il est noté
dans `docs/intentions/support-gitlab-et-abandon-de-detour.md`.

## Critères d'acceptation

- Un fichier de code ajouté par une branche dont la fiche a été supprimée par la clôture reste couvert jusqu'à la
  fusion, sur GitHub comme sur GitLab, sans toucher au réglage `scopeReminder` — contrat `QUA-173`
- Un fichier de code neuf que jamais aucune fiche de la branche n'a listé reste refusé — contrat `QUA-016`
- Un commit qui supprime la fiche active porte son trailer `Drwil-Brief:` sans geste manuel — contrat `QUA-172`
- La MR qui livre le correctif se valide sous les hooks de la branche principale, par la déclaration prévue de
  QUA-113 et non par un contrôle désactivé ou sauté — contrat `QUA-113`

## Contrats modifiés

- `QUA-173` — ancien critère : « Un fichier nouveau, modifié ou retiré par la branche n'est pas livré et reste soumis à une fiche » — raison : la clôture supprime la fiche dans le commit de la MR, le fichier neuf n'est alors ni couvert ni livré jusqu'à la fusion ; il reste couvert s'il était listé par une fiche supprimée par la branche (validé le 2026-11-12)
- `QUA-172` — précision : le commit qui supprime la fiche active garde son trailer `Drwil-Brief` (ajouté par `.githooks/prepare-commit-msg` quand l'index supprime la fiche active) ; aucune règle existante ne change (validé le 2026-11-12)
- `.githooks/scope.mjs` — gardé à sa version de la branche (QUA-113) : le rejeu avec les hooks de `main` ne peut pas juger sa propre correction (validé le 2026-11-12)
- `.githooks/scope.test.mjs` — gardé à sa version de la branche avec son fichier (QUA-113) (validé le 2026-11-12)
- `.githooks/prepare-commit-msg` — gardé à sa version de la branche (QUA-113) (validé le 2026-11-12)

## 2. Hors périmètre

- Les autres causes d'échec de `checks` sur la MR de clôture.
- L'assouplissement de QUA-113 (le rejeu avec les hooks de la base reste tel quel).
- La correction directe dans `marinade-poulet` : il attend la version corrigée (ou un contournement déclaré par
  lui, jamais par l'agent).

## 3. Contraintes

- Hooks livrés : on édite le gabarit `packages/drwil/templates/`, puis `npm run installer-depot` (QUA-018).
- Un contrôle ne s'affaiblit pas : « hors fiche » doit rester vrai pour un fichier jamais cadré (QUA-013 : jamais
  un succès par défaut si l'historique est illisible).
- Fonctionne sur clone superficiel de la CI : lire l'historique par Git doit échouer vers « non exécuté », pas vers
  « couvert ».

## 4. Décisions

- 2026-11-12 : fiche créée en urgence à la demande du demandeur ; risque HIGH (touche `.githooks/`).
- 2026-11-12 : piste (a) retenue — lire par Git les fiches supprimées par la branche depuis la base (déjà validée chez l'adoptant).
- 2026-11-12 : le correctif de hook passe par la déclaration « Contrats modifiés » de QUA-113, sans nouveau chemin d'amorçage.
- 2026-11-12 : précision de QUA-173 validée par le demandeur.

## 5. Points à trancher

Aucun.

## 6. Increments

- **Lot 1 — reproduction** [IA] : test sur dépôt temporaire (branche, fichier neuf, fiche supprimée, base sans le
  fichier) qui échoue aujourd'hui. Prouver aussi que la déclaration de QUA-113 laisse passer scope.mjs et son test. Critère de sortie : le test échoue pour la cause décrite.
- **Lot 2 — correctif et contrat** [IA] : piste retenue dans le gabarit, copie installée rafraîchie, contrat
contrat neuf si nécessaire (origine : ce chantier), architecture et `kit-mechanics.md` à jour. Critère de sortie : test du lot 1
  vert, `node .githooks/run-checks.mjs` sans échec.
- **Lot 2 bis — trailer à la clôture** [IA] : `prepare-commit-msg` garde le trailer d'une fiche supprimée par le
  commit ; contrat QUA-172. Critère de sortie : test d'un commit de clôture sans amendement.
- **Lot 3 — MR du correctif** [IA] : déclarations de « Contrats modifiés » ci-dessus.
  Critère de sortie : CI de la MR verte.

## 7. Reprise

- **Dernier état** (2026-11-12) : lots 1, 2 et 2 bis faits en un seul commit (le hook refuse un commit rouge : le test de reproduction du lot 1 et le correctif du lot 2 ne se commitent pas séparément). `closedBriefPatterns` dans `.githooks/scope.mjs` (gabarit puis `npm run installer-depot`), trailer de clôture dans `.githooks/prepare-commit-msg` ; tests dans `.githooks/scope.test.mjs` ; QUA-173 et QUA-172 à jour dans `docs/contracts.md`, `docs/architecture.md` à jour (`docs/projects/kit-mechanics.md` ne liste que des fichiers, rien à changer).
- **Travail non commité** : aucun une fois ce commit fait.
- **Prochaine étape** : lot 3 (MR du correctif) ; l'entrée du journal et `docs/projects/pending.md` à la clôture.
