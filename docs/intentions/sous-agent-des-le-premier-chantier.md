# Intention : mener dès le premier chantier dans un sous-agent

**Statut** : proposée le 2026-10-19 — demande de l'humain, après « Gemini CLI tenu » (journal du 2026-10-19).

## Besoin

Aujourd'hui seule une file de plusieurs chantiers passe par des sous-agents
(contexte neuf par chantier). Un chantier seul, lancé par le sondage, se mène
dans la session principale : elle y accumule le sondage, la lecture du dépôt,
les essais et les sorties d'outil, et le contexte relu à chaque requête grossit
(coût en tokens, dérive). Le besoin : que le premier chantier, même seul, soit
mené dans un sous-agent ; la session principale ne garde que le compte rendu
et les décisions humaines (attestation, fusion).

## Existant (vérifié le 2026-10-19)

- Le skill de lancement ne prévoit le sous-agent que pour une file
  (« Queue ») ; un chantier seul est fait par la session qui a posé le sondage.
- Le sous-agent ne reçoit pas le rappel d'état au démarrage : sa consigne
  commence par `node .githooks/state.mjs`. Il ne peut pas interroger l'humain :
  il s'arrête et dit pourquoi.
- Sous Copilot CLI, ses sous-agents ne sont pas vérifiés avec les hooks et
  l'état : voir `docs/intentions/file-sous-agents-autres-outils.md`.

## Questions à trancher

- [décision] Toujours (même un chantier d'une ligne), ou selon la taille
  annoncée de la fiche ?
- [décision] Comment l'humain intervient-il en cours de route (attestation,
  question de cadrage) quand le sous-agent ne peut pas lui parler : arrêt avec
  compte rendu, puis reprise par la session principale ?
- [décision] Que devient la mesure de consommation : un sous-agent a son
  propre journal, à rattacher au chantier (lié à
  `docs/intentions/consommation-autres-outils.md`) ?
