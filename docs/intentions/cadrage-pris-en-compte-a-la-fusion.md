# Intention : un cadrage poussé est pris en compte à sa fusion, et la fin d'un cadrage demande quoi en faire

**Statut** : proposée le 2026-10-29 — demande de l'humain, promue de la note du même jour.

## Besoin

Quand on cadre un chantier puis qu'on pousse la branche de cadrage, on s'attend
à ce que la fiche soit prise en compte. Or elle n'existe pour `/drwil-start`
qu'une fois sa PR fusionnée : l'outil lit les fiches du dossier courant, donc de
la branche principale. Un cadrage poussé mais non fusionné est invisible, sans
que rien ne le dise (constaté le 2026-10-29 : la fiche cadrée n'apparaissait dans
la liste que parce que la branche de cadrage était la branche courante).

Deux attentes de l'humain :

- **À la fin d'un cadrage, un sondage** demande quoi faire : fusion automatique
  (programmée par `node .githooks/merge-auto.mjs`, la seule voie autorisée),
  fusion manuelle, ou continuer à cadrer (PR ouverte, fusion repoussée). Comme
  `drwil-merge` au lancement d'un chantier, la décision reste humaine : on cadre
  souvent plusieurs fiches à la suite et on veut parfois les relire ensemble.
- **Un signalement « non pris en compte »** des cadrages poussés dont la PR n'est
  pas fusionnée, pour que `node .githooks/state.mjs briefs` ne les laisse pas
  invisibles.

## Existant (relevé le 2026-10-29)

- `node .githooks/state.mjs briefs --json` liste les fiches du dossier courant
  (celles de la branche principale une fois fusionnées), sans rien dire de
  celles qui n'existent que sur une branche de cadrage.
- La fusion automatique n'est décidée qu'au lancement d'un chantier
  (`drwil-merge`), jamais à la fin d'un cadrage ; `AGENTS.md` interdit de la
  programmer sans cette réponse.
- Les PR de cadrage et de notes sont aujourd'hui fusionnées à la main, sans
  rappel.

## Questions à trancher

- [décision] Où pose-t-on le sondage de fin de cadrage : dans le skill
  `/drwil-start`, dans un skill propre au cadrage, ou dans la consigne du
  SCOPING ?
- [décision] Comment détecter un cadrage « poussé mais non fusionné » : branches
  `cadrage/*` distantes avec une PR ouverte (via `gh`), ou une fiche présente sur
  une branche et absente de la branche principale ?
- [décision] La réponse « continuer à cadrer » garde-t-elle la PR ouverte et
  enchaîne-t-elle les cadrages sur une même branche, ou une branche par fiche ?
- [décision] Pour une pile de PR (cadrage sur cadrage), la fusion automatique
  ordonnée (`merge-auto`) suffit-elle, ou faut-il l'ordre des PR dans le sondage ?
