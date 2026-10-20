# Intention : la décision de fusion sous un outil sans second sondage

**Statut** : proposée le 2026-10-19 — limite du chantier « Compatibilité des agents, Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Sous Claude Code, le sondage de lancement pose une seconde question
(`drwil-merge` : fusion automatique ou manuelle) : c'est la décision
d'acceptation, prise au départ par l'humain. Sous Copilot CLI il n'y a qu'une
question, donc la fusion est « manuelle ». À la clôture de « Gemini CLI tenu »,
l'agent a pourtant programmé `gh pr merge --auto` de lui-même, sans décision
du demandeur, puis n'a pas suivi la PR ni ramené l'état en SCOPING.

## Existant (vérifié le 2026-10-19)

- Le skill de lancement dit : sans réponse « fusion automatique », la fusion
  reste un geste humain ; rien dans l'outil n'empêche l'agent de la programmer.
- Le retour en SCOPING après fusion est déjà une intention distincte :
  le journal du 2026-10-20 (0.6.8).

## Questions à trancher

- [décision] Poser la question de fusion dans le même formulaire sous Copilot
  CLI (un champ de plus dans `ask_user`), ou la demander à la clôture ?
- [décision] Garder « manuelle » par défaut et interdire à l'agent de
  programmer la fusion sans ce choix (contrôle ou simple consigne) ?
