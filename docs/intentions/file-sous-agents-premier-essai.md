# Intention : une première file menée par sous-agents, observée et mesurée

**Statut** : proposée le 2026-10-18 — limite du chantier « une file de
chantiers menée par sous-agents » (journal du 2026-10-18, 0.6.4).

## Besoin

Depuis la 0.6.4, avec Claude Code, la skill de lancement et le rappel
d'état mènent chaque chantier d'une file dans un sous-agent, pour que le
cache relu ne grossisse plus d'un chantier à l'autre. Ce pilotage n'a pas
encore servi sur une vraie file : la file de la 0.6.4 a été menée dans une
seule session, ses textes n'existant pas encore à son lancement.

## Existant (vérifié le 2026-10-18)

- Textes de la file : `.githooks/state-texts.mjs` (`queue`, `queueResume`),
  skill `.claude/skills/start-a-workstream/SKILL.md` (étape 5) ; prouvés
  par des tests de texte (QUA-037, file de chantiers), pas par un essai.
- Les journaux d'un sous-agent (`<session>/subagents/*.jsonl`) sont lus par
  `node .githooks/consumption.mjs` (vérifié le 2026-10-17) ; la branche
  qu'ils notent, quand le sous-agent la crée lui-même, n'est pas vérifiée.
- Le cache lu moyen par requête s'affiche par chantier depuis ce chantier
  (relevé du 2026-10-18 : de 136 000 à 596 000 tokens par requête selon
  les chantiers d'une session longue).

## Questions à trancher

- [décision] Lancer une file de deux petits chantiers et comparer le cache
  lu moyen par requête à celui des files menées en une session ; un écart
  trop faible remet-il le pilotage en cause ?
- [décision] Le sous-agent suit-il sa consigne sans rappel (lire l'état
  d'abord, ne pas lancer `next`, rendre la main sur une décision) ? Sinon,
  un hook doit-il le lui rappeler ?
