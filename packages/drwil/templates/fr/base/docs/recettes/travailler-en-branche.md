# Recette : travailler avec des branches et des merge/pull requests

Objectif : garder le lien entre une fiche de `docs/projets/` et le travail
git qui la réalise quand ce travail passe par une branche et une
pull/merge request, plutôt que par des commits directs sur la branche
principale.

## Ouvrir une branche
- Nommer la branche `chantier/<slug-de-la-fiche>`, où `<slug-de-la-fiche>`
  est le nom de fichier (sans extension) de la fiche `docs/projets/`
  concernée. Exemple : une fiche nommée mon-chantier.md se
  travaille sur une branche nommée chantier/mon-chantier.
- La fiche existe déjà (cadrage fait) avant d'ouvrir la branche — on ne
  code jamais sans fiche, branche ou pas.
- `init()` crée déjà une première branche de travail
  (`chantier/installation-kit`) juste après `git init`, avant tout commit :
  sur un tout nouveau dépôt, personne n'a besoin de créer de branche à la
  main pour le tout premier commit. Renommer cette branche (ou en créer
  une autre nommée selon la fiche en cours) reste au choix du projet.

## Pendant le travail

- La fiche se met à jour **sur la branche**, comme pour un travail direct
  sur la branche principale (Statut, Lots, Reprise).
- Le Statut de la fiche reste "en cours" tant que la branche n'est pas
  mergée, même si le travail y est terminé : "fait" ne se dit qu'une fois
  la fusion réelle faite. Un index (`docs/projets/en-attente.md`) qui
  coche une case avant la fusion serait incohérent avec l'état réel de la
  branche principale.

## Ouvrir la pull/merge request

- La description de la pull/merge request pointe vers la fiche
  `docs/projets/` concernée (le gabarit livré par le kit, s'il est
  installé, a déjà cette section).
- Les contrôles (`.githooks/run-checks.mjs`)
  doivent être verts avant d'ouvrir la pull/merge request, pas seulement
  avant de la fusionner.

## Clôturer

- Une fois la pull/merge request fusionnée (merge ou squash, au choix du
  projet, le kit n'impose rien ici) : passer le Statut de la fiche à
  "fait", supprimer la branche.
- Si la fusion se fait par une autre personne que l'autrice/auteur du
  travail (relecture humaine), c'est elle qui clôture la fiche au moment
  du merge — pas avant.
- Si la fiche entière est désormais terminée (pas un simple lot parmi
  d'autres d'une fiche qui reste ouverte par ailleurs) : résumer la fiche
  en une entrée courte dans `docs/projets/journal.md` (date, titre,
  décisions clés, commit/PR de clôture), supprimer le fichier de la
  fiche, puis retirer la ligne correspondante de `docs/projets/en-attente.md`
  (pas la cocher : le journal devient la source de clôture, l'index ne
  liste que le travail restant). Rien n'est perdu — l'historique complet
  reste dans git (`git log --follow -- docs/projets/<fiche>.md`).
- Si la fiche garde des points ouverts par ailleurs (chantier en
  plusieurs lots), ne rien condenser : cocher la case correspondante dans
  l'index comme avant, la fiche reste active tant qu'elle n'est pas
  entièrement terminée.

## Ce que le kit vérifie (QUA-017)

- `.githooks/run-checks.mjs` (donc `pre-commit` et `pre-push`) refuse de
  commiter ou pousser directement sur la branche principale (`master`/
  `main`), y compris le tout premier commit d'un dépôt : plus d'exception
  de bootstrap. Pas de réglage pour désactiver ce contrôle.
- Ce contrôle ne tourne jamais en CI : il s'applique seulement en local,
  au moment de committer/pousser, pas quand la CI rejoue un push déjà
  fait (un merge qui atterrit sur la branche principale est légitime).

## Ce que le kit ne fait pas

- Aucun contrôle automatique ne vérifie le **nom** de la branche
  (`chantier/<slug-de-la-fiche>` reste une convention documentée, pas
  vérifiée) ni n'impose l'existence d'une pull/merge request avant un
  commit sur une branche non principale.
- Le kit n'ouvre ni ne fusionne de pull/merge request à la place de
  l'humain (pas d'appel à l'API GitHub/GitLab) : seuls les gabarits de
  description sont fournis.
