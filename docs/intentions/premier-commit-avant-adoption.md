# Intention : un projet tout juste installé refuse même un commit de fiche

**Statut** : proposée le 2026-10-23 — découverte du passage d'essai réel du
mini-banc (run 39966784905) ; cadrée le 2026-10-23 :
`docs/projects/premier-commit-avant-adoption.md` (`init` rattache le code
existant ; les deux autres voies écartées, voir sa section Décisions).

**Projet** : DRWIL — **Niveau de risque** : HIGH (touche les hooks du
gabarit livré).

## Besoin

Juste après `drwil init` sur un projet qui a déjà du code, et avant
l'adoption (`/drwil-adopt`), le premier geste de gouvernance d'un agent est
refusé : le commit d'une **fiche seule** (ajouter un fichier au cadrage de
l'entretien courant pour lancer un chantier) échoue, parce que les contrôles
de tout le dépôt relèvent une dette antérieure — code hors de toute fiche,
dossier de code absent de la carte d'architecture (QUA-040). La règle de
périmètre dit pourtant qu'une fiche se commite toujours. L'agent, qui ne
contourne rien, s'arrête et demande un humain : un utilisateur qui saute
l'adoption bute dès sa première tâche, sans chemin évident.

## Existant (relevé le 2026-10-23)

- `.githooks/scope-gate.mjs` (gabarit) : « Briefs can always be committed ».
- `.githooks/check-docs.mjs` (gabarit) : `outsideBriefs` est une erreur
  bloquante, jugée sur tout le dépôt à chaque commit, fiche seule comprise.
- `docs/recipes/adopt-the-kit.md` : l'adoption construit la carte et les
  consignes ; elle ne dit pas explicitement comment rattacher le code
  existant à une fiche.
- Déroulé de l'essai : l'agent a proposé trois voies (lever la dette dans un
  commit séparé, terminer l'adoption, corriger sans commit) et a refusé de
  maquiller le cadrage.

## Intentions voisines

- `docs/intentions/init-impose-les-garanties.md` : même constat (un projet
  installé sans adoption reste incomplet), sous l'angle des garanties
  obligatoires.
- `docs/intentions/guide-de-demarrage.md` : la procédure restée ouverte pour
  un dépôt git existant avant `init` (ce qu'`init` attend, crée ou modifie).

Décision de fond partagée : ce que vaut un projet entre `init` et
`/drwil-adopt` — utilisable tel quel, ou orienté d'abord vers l'adoption.
Trancher la troisième question ci-dessous tranche aussi une partie de
`init-impose-les-garanties`.

## Questions à trancher

- [décision] Un commit qui ne touche que des fiches doit-il passer malgré une
  dette antérieure du dépôt (signalée, non bloquante) ?
- [décision] `init` sur un projet existant doit-il rattacher le code existant
  (fiche d'adoption, ou entretien courant) et écrire une carte qui le cite,
  pour que le premier commit passe ?
- [décision] Ou bien la session d'un projet non adopté doit-elle d'abord
  orienter vers `/drwil-adopt`, avant toute tâche ?
